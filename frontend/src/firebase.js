// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
//import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore} from "firebase/firestore"
import { getMessaging } from "firebase/messaging";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBrJKoipeLFords9NM-AZDNG4TH-767pkU",
  authDomain: "blood-donor-finder-744dd.firebaseapp.com",
  projectId: "blood-donor-finder-744dd",
  storageBucket: "blood-donor-finder-744dd.firebasestorage.app",
  messagingSenderId: "586315694761",
  appId: "1:586315694761:web:3b826556c8e0f04b5a5fb8",
  measurementId: "G-4KKYY4DCE7"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
//const analytics = getAnalytics(app);

export const auth = getAuth();
export const db = getFirestore(app);
export const messaging = getMessaging(app);
export default app;