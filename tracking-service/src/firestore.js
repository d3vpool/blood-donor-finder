// src/firestore.js
"use strict";

/**
 * Firestore access for the tracking service (reads BloodRequests for room
 * access control + status listeners).
 *
 * - Production: real Firebase Admin Firestore.
 * - Dev/test only: an in-memory shim so tests run without credentials. Like the
 *   Redis shim, it is strictly gated behind NODE_ENV !== "production".
 */

function createMemoryFirestore() {
  const docs = new Map(); // path -> data
  const watchers = new Map(); // path -> Set<callback>

  return {
    mode: "memory",

    seed(path, data) {
      docs.set(path, data);
      const set = watchers.get(path);
      if (set) {
        for (const cb of [...set]) cb({ exists: true, data: () => ({ ...data }) });
      }
    },

    set(path, data) {
      if (data == null) {
        docs.delete(path);
      } else {
        docs.set(path, data);
      }
      const set = watchers.get(path);
      if (set) {
        const snapshot = {
          exists: docs.has(path),
          data: () => ({ ...(docs.get(path) || {}) }),
        };
        for (const cb of [...set]) cb(snapshot);
      }
    },

    doc(path) {
      return {
        get: async () => {
          const data = docs.get(path);
          return data
            ? { exists: true, data: () => ({ ...data }) }
            : { exists: false, data: () => ({}) };
        },
        onSnapshot(cb) {
          if (!watchers.has(path)) watchers.set(path, new Set());
          watchers.get(path).add(cb);
          const data = docs.get(path);
          cb({
            exists: !!data,
            data: () => ({ ...(data || {}) }),
          });
          return () => {
            const set = watchers.get(path);
            if (set) set.delete(cb);
          };
        },
      };
    },
  };
}

async function createDb(env) {
  const nodeEnv = env.NODE_ENV || "development";

  if (nodeEnv === "production") {
    const admin = require("firebase-admin");
    if (admin.apps.length === 0) {
      admin.initializeApp({ projectId: env.FIREBASE_PROJECT_ID });
    }
    return admin.firestore();
  }

  console.warn("[firestore] NODE_ENV is not production — using in-memory shim (dev/test only).");
  return createMemoryFirestore();
}

module.exports = { createDb, createMemoryFirestore };
