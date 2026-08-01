// test/manual.js
//
// Step 2 local verification: runs the tracking service against the in-memory
// Redis/Firestore shims and proves:
//   1. A donor publish is relayed to a subscribed requester in the same room.
//   2. A room's subscribers never see another room's publishes (isolation).
//   3. A user who is neither acceptedDonor nor requester is rejected.
//
// Usage: npm test   (or: node test/manual.js)

"use strict";

const assert = require("assert");
const { WebSocket } = require("ws");
const { createApp } = require("../src/app");
const { createMemoryRedis } = require("../src/redis");

function makeFakeAuth() {
  const users = { "token-donor1": "donor1", "token-req1": "req1", "token-stranger": "stranger1" };
  return {
    verifyIdToken: async (token) => {
      if (!users[token]) throw new Error("invalid token");
      return { uid: users[token] };
    },
  };
}

function makeFakeDb() {
  const docs = new Map();
  docs.set("BloodRequests/req1", {
    status: "accepted",
    acceptedBy: "donor1",
    userId: "req1",
    location: { latitude: 12.9716, longitude: 77.5946 },
    hospitalName: "City General Hospital",
    patientName: "Patient A",
    bloodType: "O+",
  });
  docs.set("BloodRequests/req2", {
    status: "accepted",
    acceptedBy: "donor2",
    userId: "req2user",
    location: { latitude: 13.0, longitude: 77.6 },
    hospitalName: "District Hospital",
    patientName: "Patient B",
    bloodType: "B+",
  });
  return {
    doc(path) {
      return {
        get: async () => {
          const data = docs.get(path);
          return data ? { exists: true, data: () => ({ ...data }) } : { exists: false, data: () => ({}) };
        },
        onSnapshot(cb) {
          const data = docs.get(path);
          cb({ exists: !!data, data: () => ({ ...(data || {}) }) });
          return () => {};
        },
      };
    },
  };
}

const waitForMessage = (ws, predicate, timeoutMs = 3000) =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("timeout waiting for message")), timeoutMs);
    const onMsg = (buf) => {
      const msg = JSON.parse(buf.toString());
      if (predicate(msg)) {
        clearTimeout(timer);
        ws.off("message", onMsg);
        resolve(msg);
      }
    };
    ws.on("message", onMsg);
  });

const publish = async (base, requestId, token, body) => {
  return fetch(`${base}/publish/${requestId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
};

async function main() {
  const redis = createMemoryRedis();
  const app = createApp({ redis, auth: makeFakeAuth(), db: makeFakeDb(), config: {} });
  await new Promise((resolve) => app.server.listen(0, resolve));
  const port = app.server.address().port;
  const httpBase = `http://localhost:${port}`;
  const wsBase = `ws://localhost:${port}`;

  // --- 1. Donor publish is relayed to the requester in the same room ---
  const requester = new WebSocket(`${wsBase}/tracking?room=req1&token=token-req1`);
  const readyP = waitForMessage(requester, (m) => m.type === "ready");
  await new Promise((resolve, reject) => {
    requester.on("open", resolve);
    requester.on("error", reject);
  });
  const ready = await readyP;
  assert.strictEqual(ready.role, "requester");
  assert.strictEqual(ready.hospitalName, "City General Hospital");

  const locP = waitForMessage(requester, (m) => m.type === "location");
  const res = await publish(httpBase, "req1", "token-donor1", { lat: 12.901, lng: 77.507 });
  assert.strictEqual(res.status, 202, "donor publish should be accepted");
  const loc = await locP;
  assert.strictEqual(loc.lat, 12.901);
  assert.strictEqual(loc.lng, 77.507);
  assert.strictEqual(loc.donorId, "donor1");
  console.log("PASS  relay: donor -> requester (same room)");

  // --- 2. Isolation: req2 publishes must NOT reach req1's subscriber ---
  let leaked = false;
  const leakWatcher = (buf) => {
    const msg = JSON.parse(buf.toString());
    if (msg.type === "location" && msg.donorId === "donor2") leaked = true;
  };
  requester.on("message", leakWatcher);

  const res2 = await publish(httpBase, "req2", "token-donor1", { lat: 10, lng: 10 });
  // donor1 is not donor2, so req2's publish must be rejected (403)
  assert.strictEqual(res2.status, 403, "donor1 must not publish to req2");

  const res3 = await publish(httpBase, "req2", "token-stranger", { lat: 11, lng: 11 });
  assert.strictEqual(res3.status, 403, "stranger must not publish to req2");

  await new Promise((r) => setTimeout(r, 200));
  assert.strictEqual(leaked, false, "req2 publishes must not leak into req1");
  requester.off("message", leakWatcher);
  console.log("PASS  isolation: cross-room publishes rejected + no leakage");

  // --- 3. Unauthorized WS join is rejected ---
  const stranger = new WebSocket(`${wsBase}/tracking?room=req1&token=token-stranger`);
  const errMsg = await waitForMessage(stranger, (m) => m.type === "error" || m.type === "closed");
  assert.strictEqual(errMsg.type, "error", "stranger should receive an error frame");
  assert.strictEqual(errMsg.code, "FORBIDDEN");
  console.log("PASS  auth: unauthorized room join rejected");

  requester.close();
  await app.close();
  console.log("ALL STEP 2 MANUAL TESTS PASSED");
  process.exit(0);
}

main().catch((err) => {
  console.error("MANUAL TEST FAILED:", err);
  process.exit(1);
});
