/**
 * Race-safe blood-request acceptance + RTDB tracking lifecycle.
 *
 * Exports:
 *  - bloodRequestReceived (existing matching + FCM)
 *  - acceptBloodRequest (callable transaction)
 *  - declineBloodRequest (callable)
 *  - onBloodRequestUpdated (RTDB session create/cleanup + requester FCM)
 */

const {initializeApp} = require("firebase-admin/app");
const {getFirestore, FieldValue} = require("firebase-admin/firestore");
const {getDatabase} = require("firebase-admin/database");
const {getMessaging} = require("firebase-admin/messaging");
const {setGlobalOptions} = require("firebase-functions");
const {logger} = require("firebase-functions");
const {onDocumentCreated, onDocumentUpdated} = require("firebase-functions/v2/firestore");
const {onCall, HttpsError} = require("firebase-functions/v2/https");
const {geohashQueryBounds} = require("geofire-common");

initializeApp();
setGlobalOptions({maxInstances: 10});

const RADIUS_KM = 10;

function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

async function notifyUser(uid, title, body, data = {}) {
  if (!uid) return;
  const db = getFirestore();
  const tokenDoc = await db.collection("UserTokens").doc(uid).get();
  if (!tokenDoc.exists) return;
  const tokens = tokenDoc.data()?.fcmTokens;
  if (!Array.isArray(tokens) || tokens.length === 0) return;

  try {
    await getMessaging().sendEachForMulticast({
      notification: {title, body},
      data: Object.fromEntries(
          Object.entries(data).map(([k, v]) => [k, String(v ?? "")]),
      ),
      tokens,
    });
  } catch (err) {
    logger.warn("FCM notify failed", err);
  }
}

async function createTrackingSession(requestId, requestData) {
  const rtdb = getDatabase();
  await rtdb.ref(`tracking/${requestId}`).set({
    donorId: requestData.acceptedBy,
    requesterId: requestData.userId,
    status: "active",
    hospital: requestData.location || null,
    hospitalName: requestData.hospitalName || "",
    patientName: requestData.patientName || "",
    bloodType: requestData.bloodType || "",
    createdAt: Date.now(),
    location: null,
  });
}

async function purgeTrackingSession(requestId) {
  const rtdb = getDatabase();
  await rtdb.ref(`tracking/${requestId}`).remove();
}

exports.bloodRequestReceived = onDocumentCreated("BloodRequests/{requestId}", async (event) => {
  const data = event.data.data();
  const patientName = data.patientName;
  const bloodType = data.bloodType;
  const geoHash = data.geoHash;
  const urgency = data.urgency;
  const {latitude, longitude} = data.location;

  logger.log(`Blood request from ${patientName} (${bloodType}) at ${geoHash}`);
  logger.log(`Urgency: ${urgency}`);
  logger.log(`Location: ${latitude}, ${longitude}`);

  const db = getFirestore();

  // Direct/individual request to one specific donor — skip the radius scan and
  // notify only the targeted donor.
  if (data.targetDonorId) {
    const donorDoc = await db.collection("Donors").doc(data.targetDonorId).get();
    if (donorDoc.exists) {
      const donor = donorDoc.data();
      const distance = haversineDistance(
          latitude,
          longitude,
          donor.location?.latitude,
          donor.location?.longitude,
      );
      await event.data.ref.update({
        nearByDonors: [{
          id: donorDoc.id,
          ...donor,
          distance: Number.isFinite(distance) ? distance : null,
        }],
      });

      const tokenDoc = await db.collection("UserTokens").doc(data.targetDonorId).get();
      if (tokenDoc.exists) {
        const tokens = tokenDoc.data()?.fcmTokens;
        if (Array.isArray(tokens) && tokens.length > 0) {
          try {
            await getMessaging().sendEachForMulticast({
              notification: {
                title: "Direct Blood Request",
                body: `${patientName} personally requested ${bloodType} blood from you (${urgency} priority).`,
              },
              data: {requestId: event.params.requestId, type: "blood_request"},
              tokens,
            });
            logger.log(`Targeted FCM sent to donor ${data.targetDonorId}`);
          } catch (error) {
            logger.error("Error sending targeted multicast:", error);
          }
        }
      }
    } else {
      logger.warn(`targetDonorId ${data.targetDonorId} has no Donors profile`);
    }
    return;
  }

  const center = [latitude, longitude];
  const bounds = geohashQueryBounds(center, RADIUS_KM * 1000);

  const promises = bounds.map(([start, end]) =>
    db.collection("Donors")
        .where("bloodType", "==", bloodType)
        .orderBy("geoHash")
        .startAt(start)
        .endAt(end)
        .get(),
  );

  const snapshots = await Promise.all(promises);
  const candidates = [];
  const now = Date.now();

  snapshots.forEach((snap) => {
    snap.docs.forEach((docSnap) => {
      const donor = docSnap.data();

      // Task 1.3 — skip donors who explicitly set available=false
      if (donor.available === false) {
        logger.log(`Skipping unavailable donor ${docSnap.id}`);
        return;
      }

      let snoozedUntilMs = 0;
      if (donor.snoozedUntil) {
        if (typeof donor.snoozedUntil.toMillis === "function") {
          snoozedUntilMs = donor.snoozedUntil.toMillis();
        } else if (typeof donor.snoozedUntil === "number") {
          snoozedUntilMs = donor.snoozedUntil;
        } else if (typeof donor.snoozedUntil === "string") {
          snoozedUntilMs = new Date(donor.snoozedUntil).getTime();
        }
      }
      if (!snoozedUntilMs || snoozedUntilMs < now) {
        candidates.push({id: docSnap.id, ...donor});
      } else {
        logger.log(`Skipping snoozed donor ${docSnap.id}`);
      }
    });
  });

  const nearByDonors = candidates
      .map((donor) => ({
        ...donor,
        distance: haversineDistance(
            latitude,
            longitude,
            donor.location?.latitude,
            donor.location?.longitude,
        ),
      }))
      .filter((donor) => Number.isFinite(donor.distance) && donor.distance < RADIUS_KM)
      .sort((a, b) => a.distance - b.distance);

  await event.data.ref.update({nearByDonors});

  const tokens = [];
  await Promise.all(nearByDonors.map(async (donor) => {
    const tokenDoc = await db.collection("UserTokens").doc(donor.id).get();
    if (tokenDoc.exists) {
      const tokenData = tokenDoc.data();
      if (Array.isArray(tokenData.fcmTokens)) tokens.push(...tokenData.fcmTokens);
    }
  }));

  logger.log(`Found ${tokens.length} FCM tokens to notify`);

  if (tokens.length > 0) {
    try {
      const response = await getMessaging().sendEachForMulticast({
        notification: {
          title: "Urgent Blood Request",
          body: `${patientName} needs ${bloodType} blood urgently! (${urgency} priority)`,
        },
        data: {requestId: event.params.requestId, type: "blood_request"},
        tokens,
      });
      logger.log(`${response.successCount} messages were sent successfully`);
    } catch (error) {
      logger.error("Error Sending Multicast Message:", error);
    }
  }

  logger.log(`Found ${nearByDonors.length} donors within ${RADIUS_KM}km`);
});

/**
 * Callable: race-safe accept via Firestore transaction + RTDB session bootstrap.
 */
exports.acceptBloodRequest = onCall(async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError("unauthenticated", "Login required to accept a request.");
  }

  const requestId = request.data?.requestId;
  const donorName = request.data?.donorName || "A Hero Donor";
  if (!requestId || typeof requestId !== "string") {
    throw new HttpsError("invalid-argument", "requestId is required.");
  }

  const uid = request.auth.uid;
  const db = getFirestore();
  const ref = db.collection("BloodRequests").doc(requestId);

  let acceptedPayload = null;

  try {
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) {
        throw new HttpsError("not-found", "Blood request not found.");
      }
      const data = snap.data();
      if (data.status !== "pending") {
        throw new HttpsError(
            "failed-precondition",
            data.status === "accepted" ?
              "Another donor already accepted this request." :
              `Request is ${data.status} and cannot be accepted.`,
        );
      }
      if (Array.isArray(data.declinedBy) && data.declinedBy.includes(uid)) {
        throw new HttpsError("failed-precondition", "You previously declined this request.");
      }
      if (data.userId === uid) {
        throw new HttpsError("failed-precondition", "You cannot accept your own request.");
      }

      acceptedPayload = {
        status: "accepted",
        acceptedBy: uid,
        acceptedByName: donorName,
        acceptedAt: new Date().toISOString(),
        trackingActive: true,
      };
      tx.update(ref, acceptedPayload);
    });
  } catch (err) {
    if (err instanceof HttpsError) throw err;
    logger.error("acceptBloodRequest transaction failed", err);
    throw new HttpsError("internal", err.message || "Accept failed.");
  }

  const fresh = (await ref.get()).data();

  // Attach donor contact info so the recipient can reach the donor directly.
  let donorPhone = "";
  let donorEmail = "";
  try {
    const donorSnap = await db.collection("Donors").doc(uid).get();
    if (donorSnap.exists) {
      donorPhone = donorSnap.data().phoneNo || "";
      donorEmail = donorSnap.data().email || "";
    }
  } catch (err) {
    logger.warn("Failed to load donor contact info", err);
  }
  if (donorPhone || donorEmail) {
    await ref.update({acceptedByPhone: donorPhone, acceptedByEmail: donorEmail});
    fresh.acceptedByPhone = donorPhone;
    fresh.acceptedByEmail = donorEmail;
  }

  try {
    await createTrackingSession(requestId, fresh);
  } catch (err) {
    logger.warn("RTDB tracking session create failed (is Realtime Database enabled?)", err);
  }

  await notifyUser(
      fresh.userId,
      "Donor Accepted!",
      `${donorName} accepted your ${fresh.bloodType} request. Live tracking is starting.`,
      {requestId, type: "request_accepted"},
  );
  await notifyUser(
      uid,
      "You're on the way!",
      `You accepted ${fresh.patientName || "the patient"}'s emergency request. Live tracking is live.`,
      {requestId, type: "request_accepted"},
  );

  return {ok: true, requestId, status: "accepted"};
});

/**
 * Callable: donor declines a pending request (does not close it for others).
 */
exports.declineBloodRequest = onCall(async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError("unauthenticated", "Login required.");
  }
  const requestId = request.data?.requestId;
  if (!requestId || typeof requestId !== "string") {
    throw new HttpsError("invalid-argument", "requestId is required.");
  }

  const uid = request.auth.uid;
  const ref = getFirestore().collection("BloodRequests").doc(requestId);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError("not-found", "Blood request not found.");
  const data = snap.data();
  if (data.status !== "pending") {
    throw new HttpsError("failed-precondition", "Only pending requests can be declined.");
  }

  await ref.update({declinedBy: FieldValue.arrayUnion(uid)});
  return {ok: true, requestId, status: "declined_by_you"};
});

/**
 * Callable: the accepted donor cancels after accepting. The request reopens
 * (status back to "pending") so other donors can accept it again.
 */
exports.cancelAcceptedBloodRequest = onCall(async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError("unauthenticated", "Login required.");
  }
  const requestId = request.data?.requestId;
  if (!requestId || typeof requestId !== "string") {
    throw new HttpsError("invalid-argument", "requestId is required.");
  }

  const uid = request.auth.uid;
  const db = getFirestore();
  const ref = db.collection("BloodRequests").doc(requestId);
  let requesterId = null;
  let donorName = null;

  try {
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) {
        throw new HttpsError("not-found", "Blood request not found.");
      }
      const data = snap.data();
      if (data.status !== "accepted") {
        throw new HttpsError(
            "failed-precondition",
            "Only accepted requests can be cancelled.",
        );
      }
      if (data.acceptedBy !== uid) {
        throw new HttpsError(
            "permission-denied",
            "Only the accepted donor can cancel this request.",
        );
      }
      requesterId = data.userId;
      donorName = data.acceptedByName || "The donor";
      tx.update(ref, {
        status: "pending",
        acceptedBy: null,
        acceptedByName: null,
        acceptedAt: null,
        acceptedByPhone: null,
        acceptedByEmail: null,
        trackingActive: false,
      });
    });
  } catch (err) {
    if (err instanceof HttpsError) throw err;
    logger.error("cancelAcceptedBloodRequest transaction failed", err);
    throw new HttpsError("internal", err.message || "Cancel failed.");
  }

  try {
    await purgeTrackingSession(requestId);
  } catch (err) {
    logger.warn("RTDB purge on cancel failed", err);
  }

  await notifyUser(
      requesterId,
      "Donor Cancelled",
      `${donorName} cancelled the accepted request. It is open for other donors again.`,
      {requestId, type: "request_cancelled"},
  );

  return {ok: true, requestId, status: "pending"};
});

/**
 * Keep RTDB tracking in sync with request lifecycle (fulfill/cancel cleanup,
 * and session create if accept happened via client transaction).
 */
exports.onBloodRequestUpdated = onDocumentUpdated("BloodRequests/{requestId}", async (event) => {
  const before = event.data.before.data() || {};
  const after = event.data.after.data() || {};
  const requestId = event.params.requestId;

  if (before.status === "pending" && after.status === "accepted" && after.acceptedBy) {
    try {
      await createTrackingSession(requestId, after);
    } catch (err) {
      logger.warn("RTDB create on update failed", err);
    }
    if (before.acceptedBy !== after.acceptedBy) {
      await notifyUser(
          after.userId,
          "Donor Accepted!",
          `${after.acceptedByName || "A donor"} accepted your request. Tracking is live.`,
          {requestId, type: "request_accepted"},
      );
      await notifyUser(
          after.acceptedBy,
          "You're on the way!",
          `You accepted ${after.patientName || "the patient"}'s emergency request. Tracking is live.`,
          {requestId, type: "request_accepted"},
      );
    }
  }

  // Donor cancelled an accepted request → back to pending; other donors may accept.
  if (before.status === "accepted" && after.status === "pending") {
    try {
      await purgeTrackingSession(requestId);
    } catch (err) {
      logger.warn("RTDB purge on donor cancel failed", err);
    }
    await notifyUser(
        after.userId,
        "Donor Cancelled",
        `${before.acceptedByName || "The accepted donor"} cancelled the request. It is open for other donors again.`,
        {requestId, type: "request_cancelled"},
    );
  }

  const closed = ["fulfilled", "cancelled"].includes(after.status);
  const wasOpen = !["fulfilled", "cancelled"].includes(before.status);
  if (closed && wasOpen) {
    try {
      await purgeTrackingSession(requestId);
      if (after.trackingActive) {
        await event.data.after.ref.update({trackingActive: false});
      }
    } catch (err) {
      logger.warn("RTDB purge failed", err);
    }
  }
});
