/**
 * Verifies RTDB tracking session create + purge contract used by Phase 4.
 * Run: node scripts/testTrackingLifecycle.js
 */

function createMemoryRtdb() {
  const tree = {};
  return {
    async set(path, value) {
      tree[path] = structuredClone(value);
    },
    async remove(path) {
      delete tree[path];
    },
    get(path) {
      return tree[path] ?? null;
    },
  };
}

async function bootstrapTrackingSession(rtdb, requestId, requestData) {
  await rtdb.set(`tracking/${requestId}`, {
    donorId: requestData.acceptedBy,
    requesterId: requestData.userId,
    status: "active",
    hospital: requestData.location || null,
    createdAt: Date.now(),
    location: null,
  });
}

async function purgeTrackingSession(rtdb, requestId) {
  await rtdb.remove(`tracking/${requestId}`);
}

async function main() {
  const rtdb = createMemoryRtdb();
  const requestId = "req-123";

  await bootstrapTrackingSession(rtdb, requestId, {
    acceptedBy: "donor-1",
    userId: "requester-1",
    location: { latitude: 12.97, longitude: 77.59 },
  });

  const created = rtdb.get(`tracking/${requestId}`);
  if (!created || created.status !== "active" || created.donorId !== "donor-1") {
    console.error("FAIL: tracking session not created correctly", created);
    process.exit(1);
  }

  // Simulate donor ping
  created.location = { lat: 12.98, lng: 77.6, updatedAt: Date.now() };
  await rtdb.set(`tracking/${requestId}`, created);

  if (!rtdb.get(`tracking/${requestId}`).location) {
    console.error("FAIL: location ping missing");
    process.exit(1);
  }

  await purgeTrackingSession(rtdb, requestId);
  if (rtdb.get(`tracking/${requestId}`) !== null) {
    console.error("FAIL: tracking node not purged after fulfillment");
    process.exit(1);
  }

  console.log("PASS: tracking session create → ping → purge lifecycle");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
