// createTestDocs.js
const admin = require("firebase-admin");

// Point Firestore SDK to the emulator
process.env.FIRESTORE_EMULATOR_HOST = "localhost:8080";

admin.initializeApp({
  projectId: "blood-donor-finder" // any string works in emulator
});

const db = admin.firestore();

async function main() {
  // Create UserTokens/testDonor1
  await db.collection("UserTokens").doc("testDonor1").set({
    token: "dummy_fcm_token_for_local_test"
  });

  // Create requests/testReq1
  await db.collection("requests").doc("testReq1").set({
    toUid: "testDonor1",
    quantity: 2,
    bloodType: "A+",
    fromUid: "requester1",
    fromEmail: "requester@example.com",
    fromName: "Requester One",
    status: "pending"
  });

  console.log("Docs created");
  process.exit(0);
}

main().catch(err => {
  console.error("Error:", err);
  process.exit(1);
});
