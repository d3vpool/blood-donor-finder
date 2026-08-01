// src/auth.js
"use strict";

/**
 * Firebase ID-token verification.
 *
 * - Production: real Firebase Admin verifyIdToken.
 * - Dev/test only: a clearly-gated stub that maps "dev-<uid>" tokens to uid.
 *   NODE_ENV=production always uses Firebase Admin — the stub can never
 *   activate on Render.
 */
async function createAuth(env) {
  const nodeEnv = env.NODE_ENV || "development";

  if (nodeEnv === "production") {
    const admin = require("firebase-admin");
    if (admin.apps.length === 0) {
      admin.initializeApp({ projectId: env.FIREBASE_PROJECT_ID });
    }
    return {
      mode: "firebase",
      verifyIdToken: async (token) => {
        const decoded = await admin.auth().verifyIdToken(token);
        return { uid: decoded.uid };
      },
    };
  }

  console.warn("[auth] NODE_ENV is not production — using dev token stub.");
  return {
    mode: "dev",
    verifyIdToken: async (token) => {
      if (typeof token !== "string" || token.length === 0) {
        throw new Error("Missing token.");
      }
      if (!token.startsWith("dev-")) {
        throw new Error("Invalid dev token.");
      }
      return { uid: token.slice(4) };
    },
  };
}

module.exports = { createAuth };
