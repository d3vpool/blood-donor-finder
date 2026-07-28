/**
 * Simulates concurrent accept attempts against a pending request.
 * Uses an in-memory transaction model mirroring Firestore semantics.
 *
 * Run: node scripts/testAcceptRace.js
 */

function createStore(initial) {
  let doc = { ...initial };
  let lock = Promise.resolve();

  async function runTransaction(fn) {
    const run = lock.then(async () => {
      const snapshot = { exists: true, data: () => ({ ...doc }) };
      let pendingUpdate = null;
      const tx = {
        get: async () => snapshot,
        update: (_ref, patch) => {
          pendingUpdate = patch;
        },
      };
      await fn(tx);
      if (pendingUpdate) {
        // Re-read "fresh" state before commit (another tx may have won)
        // In this mock, we serialize — so we re-validate against current doc
        if (doc.status !== "pending") {
          throw Object.assign(new Error("Already accepted"), { code: "failed-precondition" });
        }
        doc = { ...doc, ...pendingUpdate };
      }
      return doc;
    });
    // Chain next waiter; don't let rejection break the chain
    lock = run.then(
      () => undefined,
      () => undefined
    );
    return run;
  }

  return {
    getDoc: () => ({ ...doc }),
    runTransaction,
  };
}

async function accept(store, donorId) {
  return store.runTransaction(async (tx) => {
    const snap = await tx.get();
    const data = snap.data();
    if (data.status !== "pending") {
      throw Object.assign(new Error("Another donor already accepted this request."), {
        code: "failed-precondition",
      });
    }
    tx.update(null, {
      status: "accepted",
      acceptedBy: donorId,
      acceptedAt: new Date().toISOString(),
      trackingActive: true,
    });
  });
}

async function main() {
  const store = createStore({
    status: "pending",
    userId: "requester-1",
    bloodType: "O+",
    acceptedBy: null,
  });

  const donors = ["donor-A", "donor-B", "donor-C", "donor-D", "donor-E"];
  const results = await Promise.allSettled(donors.map((id) => accept(store, id)));

  const fulfilled = results.filter((r) => r.status === "fulfilled");
  const rejected = results.filter((r) => r.status === "rejected");
  const winner = store.getDoc().acceptedBy;

  console.log("--- Accept race simulation ---");
  console.log(`Winners: ${fulfilled.length} (expected 1)`);
  console.log(`Rejected: ${rejected.length} (expected ${donors.length - 1})`);
  console.log(`Accepted by: ${winner}`);
  console.log(`Final status: ${store.getDoc().status}`);

  if (fulfilled.length !== 1) {
    console.error("FAIL: expected exactly one successful accept");
    process.exit(1);
  }
  if (!donors.includes(winner)) {
    console.error("FAIL: winner not in donor set");
    process.exit(1);
  }
  if (store.getDoc().status !== "accepted" || !store.getDoc().trackingActive) {
    console.error("FAIL: final document state incorrect");
    process.exit(1);
  }

  console.log("PASS: race-safe accept retained a single winner");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
