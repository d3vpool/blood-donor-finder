import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyBrJKoipeLFords9NM-AZDNG4TH-767pkU",
  authDomain: "blood-donor-finder-744dd.firebaseapp.com",
  projectId: "blood-donor-finder-744dd",
  storageBucket: "blood-donor-finder-744dd.firebasestorage.app",
  messagingSenderId: "586315694761",
  appId: "1:586315694761:web:3b826556c8e0f04b5a5fb8",
  databaseURL: "https://blood-donor-finder-744dd-default-rtdb.firebaseio.com",
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const rtdb = getDatabase(app);
export default app;
