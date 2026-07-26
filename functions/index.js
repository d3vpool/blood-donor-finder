/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

const {initializeApp} = require("firebase-admin/app");
const {getFirestore} = require("firebase-admin/firestore");
const {setGlobalOptions} = require("firebase-functions");
const {onRequest} = require("firebase-functions/https");
const logger = require("firebase-functions/logger");
const {onDocumentCreated} = require("firebase-functions/v2/firestore");
const {getMessaging} = require("firebase-admin/messaging");
const {geohashQueryBounds} = require("geofire-common");

initializeApp();
// For cost control, you can set the maximum number of containers that can be
// running at the same time. This helps mitigate the impact of unexpected
// traffic spikes by instead downgrading performance. This limit is a
// per-function limit. You can override the limit for each function using the
// `maxInstances` option in the function's options, e.g.
// `onRequest({ maxInstances: 5 }, (req, res) => { ... })`.
// NOTE: setGlobalOptions does not apply to functions using the v1 API. V1
// functions should each use functions.runWith({ maxInstances: 10 }) instead.
// In the v1 API, each function can only serve one request per container, so
// this will be the maximum concurrent request count.
setGlobalOptions({maxInstances: 10});

// Create and deploy your first functions
// https://firebase.google.com/docs/functions/get-started

// exports.helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });

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


exports.bloodRequestReceived = onDocumentCreated("BloodRequests/{requestId}", async (event) => {
  const patientName = event.data.data().patientName;
  const bloodType = event.data.data().bloodType;
  const geoHash = event.data.data().geoHash;
  const urgency = event.data.data().urgency;
  const {latitude, longitude} = event.data.data().location;

  logger.log(`Blood request from ${patientName} (${bloodType}) at ${geoHash}`);
  logger.log(`Urgency: ${urgency}`);
  logger.log(`Location: ${latitude}, ${longitude}`);

  const center = [latitude, longitude];
  const db = getFirestore();

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
    snap.docs.forEach((doc) => {
      const data = doc.data();
      let snoozedUntilMs = 0;
      if (data.snoozedUntil) {
        if (typeof data.snoozedUntil.toMillis === "function") {
          snoozedUntilMs = data.snoozedUntil.toMillis();
        } else if (typeof data.snoozedUntil === "number") {
          snoozedUntilMs = data.snoozedUntil;
        } else if (typeof data.snoozedUntil === "string") {
          snoozedUntilMs = new Date(data.snoozedUntil).getTime();
        }
      }
      // Filter out snoozed donors automatically
      if (!snoozedUntilMs || snoozedUntilMs < now) {
        candidates.push({id: doc.id, ...data});
      } else {
        logger.log(`Skipping snoozed donor ${doc.id} (snoozed until ${new Date(snoozedUntilMs).toISOString()})`);
      }
    });
  });

  const nearByDonors = candidates
      .map((donor) => ({
        ...donor,
        distance: haversineDistance(latitude, longitude, donor.location.latitude, donor.location.longitude),
      }))
      .filter((donor) => donor.distance < RADIUS_KM)
      .sort((a, b) => a.distance - b.distance);

  await event.data.ref.update({nearByDonors});

  const tokens = [];

  const tokenPromises = nearByDonors.map(async (donor) => {
    const tokenDoc = await db.collection("UserTokens").doc(donor.id).get();

    if (tokenDoc.exists) {
      const data = tokenDoc.data();
      if (data.fcmTokens && Array.isArray(data.fcmTokens)) {
        tokens.push(...data.fcmTokens);
      }
    }
  });

  await Promise.all(tokenPromises);

  console.log(`Found ${tokens.length} FCM tokens to notify`);


  if (tokens.length > 0) {
    const message = {
      notification: {
        title: "Urgent Blood Request",
        body: `${patientName} needs ${bloodType} blood urgently! (${urgency} priority)`,
      },
      tokens: tokens,
    };

    try {
      const response = await getMessaging().sendEachForMulticast(message);
      console.log(`${response.successCount} messages were sent successfully`);

      if (response.failureCount > 0) {
        const failedTokens = [];
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            failedTokens.push(tokens[idx]);
          }
        });
        console.log("List of tokens that caused failures: " + failedTokens);
        // Optional: Remove these failed tokens from the UserTokens collection here
      }
    } catch (error) {
      console.log("Error Sending Multicast Message:", error);
    }
  }


  console.log(`Founded ${nearByDonors.length} donors within ${RADIUS_KM}km`, nearByDonors);
});
