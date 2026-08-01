// test/guardrails.js
//
// Step 3 verification: rate limiting, session expiry (idle + status change),
// and access-control gates. Runs entirely against the in-memory shims.
//
// Usage: node test/guardrails.js   (or: npm test once wired in package.json)

"use strict";

const assert = require("assert");
const { WebSocket } = require("ws");
const { createApp } = require("../src/app");
const { createMemoryRedis } = require("../src/redis");
const { createMemoryFirestore } = require("../src/firestore");
const { createRateLimiter } = require("../src/rateLimit");

function makeFakeAuth() {
  const users = {
    "token-donor1": "donor1",
    "token-req1": "req1",
  };
  return {
    verifyIdToken: async (token) => {
      if (!users[token]) throw new Error("invalid token");
      return { uid: users[token] };
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
  const db = createMemoryFirestore();
  db.seed("BloodRequests/req1", {
    status: "accepted",
    acceptedBy: "donor1",
    userId: "req1",
    hospitalName: "City Hospital",
    patientName: "Patient A",
    bloodType: "O+",
  });
  db.seed("BloodRequests/req3", {
    status: "accepted",
    acceptedBy: "donor1",
    userId: "req1",
    hospitalName: "District Hospital",
    patientName: "Patient C",
    bloodType: "A+",
  });
  db.seed("BloodRequests/req4", {
    status: "pending",
    acceptedBy: null,
    userId: "req1",
  });

  const rateLimit = createRateLimiter(redis, { maxPerSecond: 1 });
  const app = createApp({
    redis,
    auth: makeFakeAuth(),
    db,
    config: { rateLimit, idleTimeoutMs: 300, sweepIntervalMs: 100 },
  });
  await new Promise((resolve) => app.server.listen(0, resolve));
  const port = app.server.address().port;
  const httpBase = `http://localhost:${port}`;
  const wsBase = `ws://localhost:${port}`;

  // --- A. Rate limiting: 2nd publish within the same second -> 429 ---
  const r1 = await publish(httpBase, "req1", "token-donor1", { lat: 1, lng: 1 });
  assert.strictEqual(r1.status, 202, "first publish should be allowed");
  const r2 = await publish(httpBase, "req1", "token-donor1", { lat: 1, lng: 1 });
  assert.strictEqual(r2.status, 429, "rapid second publish must be rate limited");
  console.log("PASS  rate limit: 429 on rapid publish");

  // --- B. Publishing to a non-accepted request is rejected ---
  const r4 = await publish(httpBase, "req4", "token-donor1", { lat: 1, lng: 1 });
  assert.strictEqual(r4.status, 409, "publish to pending request must be rejected");
  console.log("PASS  status gate: publish to pending request rejected");

  // --- C. Idle timeout force-closes the room (independent of status) ---
  const ws = new WebSocket(`${wsBase}/tracking?room=req3&token=token-req1`);
  await new Promise((resolve, reject) => {
    ws.on("open", resolve);
    ws.on("error", reject);
  });
  const idleClosed = await waitForMessage(ws, (m) => m.type === "closed", 2000);
  assert.strictEqual(idleClosed.reason, "idle-timeout");
  console.log("PASS  session expiry: idle timeout closes connection");

  // --- D. Status change (fulfilled) closes the room via the per-room listener ---
  const ws2 = new WebSocket(`${wsBase}/tracking?room=req1&token=token-req1`);
  await new Promise((resolve, reject) => {
    ws2.on("open", resolve);
    ws2.on("error", reject);
  });
  await new Promise((resolve) => setTimeout(resolve, 50)); // let listener attach
  db.set("BloodRequests/req1", {
    status: "fulfilled",
    acceptedBy: "donor1",
    userId: "req1",
  });
  const statusClosed = await waitForMessage(ws2, (m) => m.type === "closed", 2000);
  assert.ok(
    String(statusClosed.reason).includes("status-fulfilled"),
    "fulfilled status must close the room"
  );
  console.log("PASS  session expiry: fulfilled status closes room (listener torn down)");

  // --- E. Joining a pending request is rejected ---
  const ws3 = new WebSocket(`${wsBase}/tracking?room=req4&token=token-donor1`);
  const errMsg = await waitForMessage(ws3, (m) => m.type === "error" || m.type === "closed");
  assert.strictEqual(errMsg.type, "error");
  assert.strictEqual(errMsg.code, "NOT_ACCEPTED");
  console.log("PASS  auth: joining non-accepted request rejected");

  await app.close();
  console.log("ALL STEP 3 GUARDRAIL TESTS PASSED");
  process.exit(0);
}

main().catch((err) => {
  console.error("GUARDRAIL TEST FAILED:", err);
  process.exit(1);
});
