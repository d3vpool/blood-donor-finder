/**
 * notificationWorker.js
 *
 * Runs locally to act as the backend Cloud Function without needing a paid Blaze plan.
 * Listens to new documents in production Firestore 'BloodRequests' collection and sends FCM notifications.
 */

const admin = require("firebase-admin");
const serviceAccount = require("./service-account.json");
const { geohashQueryBounds } = require("geofire-common");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.FIREBASE_DATABASE_URL ||
    "https://blood-donor-finder-744dd-default-rtdb.firebaseio.com",
});

const db = admin.firestore();
const messaging = admin.messaging();
const rtdb = admin.database();
const RADIUS_KM = 15;

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

console.log("🚀 Starting Local Notification Worker for LifeLink...");
console.log(`Connected to live Firebase project: ${serviceAccount.project_id}`);
console.log("Listening for new BloodRequests in real-time...\n");

// Track processed requests in memory so we don't re-notify on startup
const processedIds = new Set();

// First load existing IDs so we only notify on NEW requests created after worker starts
db.collection("BloodRequests").get().then((snapshot) => {
  snapshot.forEach((doc) => processedIds.add(doc.id));
  console.log(`Initialized with ${processedIds.size} existing requests ignored.`);
  startListening();
}).catch((err) => {
  console.error("Error initializing existing requests:", err);
  startListening();
});

const previousStatus = new Map();

function startListening() {
  db.collection("BloodRequests").onSnapshot(async (snapshot) => {
    for (const change of snapshot.docChanges()) {
      const doc = change.doc;
      const data = doc.data();
      if (!data) continue;

      // Phase 4: bootstrap / purge RTDB tracking on status transitions
      if (change.type === "modified") {
        const prev = previousStatus.get(doc.id);
        const next = data.status;
        if (prev === "pending" && next === "accepted" && data.acceptedBy) {
          try {
            await rtdb.ref(`tracking/${doc.id}`).set({
              donorId: data.acceptedBy,
              requesterId: data.userId,
              status: "active",
              hospital: data.location || null,
              hospitalName: data.hospitalName || "",
              patientName: data.patientName || "",
              bloodType: data.bloodType || "",
              createdAt: Date.now(),
              location: null,
            });
            console.log(`📍 RTDB tracking session created for ${doc.id}`);
          } catch (err) {
            console.warn("RTDB session create failed:", err.message);
          }
        }
        if (["fulfilled", "cancelled"].includes(next) && prev && !["fulfilled", "cancelled"].includes(prev)) {
          try {
            await rtdb.ref(`tracking/${doc.id}`).remove();
            console.log(`🧹 RTDB tracking purged for ${doc.id}`);
          } catch (err) {
            console.warn("RTDB purge failed:", err.message);
          }
        }
        previousStatus.set(doc.id, next);
      } else if (change.type === "added") {
        previousStatus.set(doc.id, data.status || "pending");
      }

      if (change.type === "added") {
        if (processedIds.has(doc.id)) continue;
        processedIds.add(doc.id);

        if (!data.location) continue;

        const patientName = data.patientName || "A patient";
        const bloodType = data.bloodType || "Blood";
        const urgency = data.urgency || "High";
        const { latitude, longitude } = data.location;

        console.log(`\n🔔 [NEW REQUEST] ${patientName} needs ${bloodType} (${urgency}) at [${latitude}, ${longitude}]`);

        try {
          const center = [latitude, longitude];
          const bounds = geohashQueryBounds(center, RADIUS_KM * 1000);

          const promises = bounds.map(([start, end]) =>
            db.collection("Donors")
                .where("bloodType", "==", bloodType)
                .orderBy("geoHash")
                .startAt(start)
                .endAt(end)
                .get()
          );

          const snapshots = await Promise.all(promises);
          const candidates = [];
          const seenDonorIds = new Set();

          snapshots.forEach((snap) => {
            snap.docs.forEach((d) => {
              if (seenDonorIds.has(d.id)) return;
              seenDonorIds.add(d.id);
              const donorData = d.data();
              if (!donorData.snoozedUntil || donorData.snoozedUntil < Date.now()) {
                candidates.push({ id: d.id, ...donorData });
              }
            });
          });

          const nearByDonors = candidates
              .map((donor) => {
                const dLat = Number(donor.location?.latitude ?? donor.location?.lat);
                const dLng = Number(donor.location?.longitude ?? donor.location?.lng);
                return {
                  ...donor,
                  distance: haversineDistance(latitude, longitude, dLat, dLng)
                };
              })
              .filter((donor) => donor.distance <= RADIUS_KM)
              .sort((a, b) => a.distance - b.distance);

          console.log(`📍 Found ${nearByDonors.length} nearby donors within ${RADIUS_KM} km.`);

          await doc.ref.update({ nearByDonors });

          const tokens = [];
          const tokenPromises = nearByDonors.map(async (donor) => {
            const tokenDoc = await db.collection("UserTokens").doc(donor.id).get();
            if (tokenDoc.exists) {
              const tokenData = tokenDoc.data();
              if (tokenData.fcmTokens && Array.isArray(tokenData.fcmTokens)) {
                tokens.push(...tokenData.fcmTokens);
              }
            }
          });

          await Promise.all(tokenPromises);
          console.log(`📱 Found ${tokens.length} FCM device tokens to notify.`);

          if (tokens.length > 0) {
            const message = {
              notification: {
                title: "Urgent Blood Request",
                body: `${patientName} needs ${bloodType} blood urgently! (${urgency} priority)`
              },
              tokens: tokens
            };

            const response = await messaging.sendEachForMulticast(message);
            console.log(`✅ Push Notification Dispatch: ${response.successCount} sent successfully, ${response.failureCount} failed.`);
          } else {
            console.log("⚠️ No FCM tokens found for nearby donors. Ensure donors have granted notification permissions on the site.");
          }
        } catch (error) {
          console.error("❌ Error processing request notification:", error);
        }
      }
    }
  });
}

