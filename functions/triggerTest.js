// triggerTest.js — creates a test BloodRequest in the Firestore emulator
// Usage: FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 node triggerTest.js

process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";

const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

initializeApp({ projectId: "blood-donor-finder-744dd" });
const db = getFirestore();

async function main() {
  const ref = await db.collection("BloodRequests").add({
    patientName: "Test Patient",
    bloodType: "O+",
    urgency: "Critical",
    geoHash: "tdrlw",
    location: { latitude: 12.9716, longitude: 77.5946 },
    contactPhone: "1234567889",
    hospitalName: "Test H",
    hospitalAddress: "Test A",
    userId: "test-user-123",
    status: "pending",
    requestedAt: new Date().toISOString(),
    acceptedBy: null,
  });
  console.log("✅ BloodRequest created:", ref.id);
}

main().catch(console.error);
