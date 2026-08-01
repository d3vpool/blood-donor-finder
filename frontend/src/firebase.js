// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth, setPersistence, browserLocalPersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getDatabase } from "firebase/database";
import { getMessaging } from "firebase/messaging";
import { getFunctions } from "firebase/functions";

const firebaseConfig = {
  apiKey: "AIzaSyBrJKoipeLFords9NM-AZDNG4TH-767pkU",
  authDomain: "blood-donor-finder-744dd.firebaseapp.com",
  projectId: "blood-donor-finder-744dd",
  storageBucket: "blood-donor-finder-744dd.firebasestorage.app",
  messagingSenderId: "586315694761",
  appId: "1:586315694761:web:3b826556c8e0f04b5a5fb8",
  measurementId: "G-4KKYY4DCE7",
  // Override via REACT_APP_FIREBASE_DATABASE_URL if your RTDB is regional
  databaseURL:
    process.env.REACT_APP_FIREBASE_DATABASE_URL ||
    "https://blood-donor-finder-744dd-default-rtdb.firebaseio.com",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);

// Keep users signed in across page refreshes and PWA relaunches.
// browserLocalPersistence stores the session in localStorage (survives refresh,
// giving the required multi-day / "at least 1 day" login session).
setPersistence(auth, browserLocalPersistence).catch((err) => {
  console.warn("Failed to set auth persistence:", err);
});
export const db = getFirestore(app);
export const rtdb = getDatabase(app);
export const functions = getFunctions(app);
export const messaging = getMessaging(app);
export default app;
