// functions/createTestDonors.js
const admin = require("firebase-admin");
process.env.FIRESTORE_EMULATOR_HOST = "localhost:8080";

admin.initializeApp({
  projectId: "blood-donor-finder-744dd"
});

const db = admin.firestore();

async function main() {
  console.log("Seeding test donors...");
  
  const donors = [
    {
      fullname: "John Doe",
      email: "john@example.com",
      phoneNo: "1234567890",
      bloodType: "A+",
      address: "New York, NY",
      location: {
        latitude: 40.7128,
        longitude: -74.0060
      },
      registeredAt: new Date().toISOString()
    },
    {
      fullname: "Jane Smith",
      email: "jane@example.com",
      phoneNo: "0987654321",
      bloodType: "O-",
      address: "Los Angeles, CA",
      location: {
        latitude: 34.0522,
        longitude: -118.2437
      },
      registeredAt: new Date().toISOString()
    }
  ];

  for (let i = 0; i < donors.length; i++) {
    const docId = `mock_donor_${i + 1}`;
    await db.collection("Donors").doc(docId).set(donors[i]);
    console.log(`Created mock donor: ${docId}`);
  }

  console.log("Seeding complete!");
  process.exit(0);
}

main().catch(err => {
  console.error("Seeding error:", err);
  process.exit(1);
});
