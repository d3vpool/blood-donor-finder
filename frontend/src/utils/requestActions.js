import {
  doc,
  runTransaction,
  updateDoc,
  arrayUnion,
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { auth, db, functions } from "../firebase";
import { bootstrapTrackingSession, purgeTrackingSession } from "./liveTracking";

/**
 * Race-safe accept: prefers Cloud Function callable; falls back to a
 * client Firestore transaction + RTDB bootstrap when Functions are unavailable.
 */
export async function acceptBloodRequest({ requestId, donorName }) {
  const user = auth.currentUser;
  if (!user || user.isAnonymous) {
    throw new Error("Login required to accept a request.");
  }

  try {
    const callable = httpsCallable(functions, "acceptBloodRequest");
    const result = await callable({
      requestId,
      donorName: donorName || user.displayName || user.email || "A Hero Donor",
    });
    return result.data;
  } catch (err) {
    const code = String(err?.code || "");
    // Surfaced business-rule failures must not fall through to a second attempt
    if (
      code.includes("failed-precondition") ||
      code.includes("unauthenticated") ||
      code.includes("permission-denied") ||
      code.includes("invalid-argument")
    ) {
      throw err;
    }

    console.warn("Callable accept unavailable, using client transaction:", err?.message || err);
    return acceptBloodRequestClient({ requestId, donorName });
  }
}

export async function acceptBloodRequestClient({ requestId, donorName }) {
  const user = auth.currentUser;
  if (!user || user.isAnonymous) {
    throw new Error("Login required to accept a request.");
  }

  const ref = doc(db, "BloodRequests", requestId);
  let requestData = null;

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error("Blood request not found.");
    const data = snap.data();
    if (data.status !== "pending") {
      throw new Error(
        data.status === "accepted"
          ? "Another donor already accepted this request."
          : `Request is ${data.status} and cannot be accepted.`
      );
    }
    if (Array.isArray(data.declinedBy) && data.declinedBy.includes(user.uid)) {
      throw new Error("You previously declined this request.");
    }
    if (data.userId === user.uid) {
      throw new Error("You cannot accept your own request.");
    }

    const patch = {
      status: "accepted",
      acceptedBy: user.uid,
      acceptedByName: donorName || user.displayName || user.email || "A Hero Donor",
      acceptedAt: new Date().toISOString(),
      trackingActive: true,
    };
    tx.update(ref, patch);
    requestData = { ...data, ...patch, id: requestId };
  });

  try {
    await bootstrapTrackingSession(requestId, requestData);
  } catch (e) {
    console.warn("RTDB bootstrap failed (enable Realtime Database in Firebase Console):", e);
  }

  return { ok: true, requestId, status: "accepted", via: "client-transaction" };
}

export async function declineBloodRequest({ requestId }) {
  const user = auth.currentUser;
  if (!user || user.isAnonymous) {
    throw new Error("Login required.");
  }

  try {
    const callable = httpsCallable(functions, "declineBloodRequest");
    return (await callable({ requestId })).data;
  } catch (err) {
    console.warn("Callable decline unavailable, using client update:", err?.message || err);
    const ref = doc(db, "BloodRequests", requestId);
    await updateDoc(ref, { declinedBy: arrayUnion(user.uid) });
    return { ok: true, requestId, status: "declined_by_you", via: "client" };
  }
}

export async function completeBloodRequest(requestId, status = "fulfilled") {
  const user = auth.currentUser;
  if (!user || user.isAnonymous) {
    throw new Error("Login required.");
  }
  const ref = doc(db, "BloodRequests", requestId);
  await updateDoc(ref, {
    status,
    trackingActive: false,
    completedAt: new Date().toISOString(),
  });
  try {
    await purgeTrackingSession(requestId);
  } catch (e) {
    console.warn("RTDB purge failed:", e);
  }
}
