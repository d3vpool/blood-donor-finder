// functions/backfillGeohashes.js
const admin = require("firebase-admin");

// Point Firestore SDK to the emulator
// process.env.FIRESTORE_EMULATOR_HOST = "localhost:8080";

const serviceAccount = require("./service-account.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});


const db = admin.firestore();

// Pure JS Geohash Encoder
const BASE32 = "0123456789bcdefghjkmnpqrstuvwxyz";

function encodeGeoHash(latitude, longitude, precision = 9) {
  const lat = Number(latitude);
  const lng = Number(longitude);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return "";
  }

  let minLat = -90, maxLat = 90;
  let minLng = -180, maxLng = 180;
  let geohash = "";
  let isEven = true;
  let bit = 0;
  let ch = 0;

  while (geohash.length < precision) {
    if (isEven) {
      const mid = (minLng + maxLng) / 2;
      if (lng > mid) {
        ch |= (1 << (4 - bit));
        minLng = mid;
      } else {
        maxLng = mid;
      }
    } else {
      const mid = (minLat + maxLat) / 2;
      if (lat > mid) {
        ch |= (1 << (4 - bit));
        minLat = mid;
      } else {
        maxLat = mid;
      }
    }

    isEven = !isEven;
    if (bit < 4) {
      bit++;
    } else {
      geohash += BASE32[ch];
      bit = 0;
      ch = 0;
    }
  }

  return geohash;
}

async function main() {
  console.log("Fetching Donors...");
  const snapshot = await db.collection("Donors").get();

  if (snapshot.empty) {
    console.log("No donors found in the collection.");
    process.exit(0);
  }

  console.log(`Found ${snapshot.size} donors. Backfilling geohashes...`);

  const batch = db.batch();
  let updateCount = 0;

  snapshot.forEach(doc => {
    const data = doc.data();
    let lat = null;
    let lng = null;

    if (data.location) {
      lat = data.location.latitude ?? data.location.lat;
      lng = data.location.longitude ?? data.location.lng;
    }

    if (lat !== null && lng !== null) {
      const geohash = encodeGeoHash(lat, lng);
      console.log(`Donor ${doc.id}: Lat=${lat}, Lng=${lng} => Geohash=${geohash}`);

      const docRef = db.collection("Donors").doc(doc.id);
      batch.update(docRef, { geoHash: geohash });
      updateCount++;
    } else {
      console.log(`Donor ${doc.id}: No valid location coordinates found.`);
    }
  });

  if (updateCount > 0) {
    await batch.commit();
    console.log(`Successfully updated ${updateCount} donors with geohashes.`);
  } else {
    console.log("No donors needed updates.");
  }

  process.exit(0);
}

main().catch(err => {
  console.error("Error backfilling geohashes:", err);
  process.exit(1);
});
