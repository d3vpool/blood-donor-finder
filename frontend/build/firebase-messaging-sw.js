// firebase-messaging-sw.js
// Keep this file in your public/ folder so it gets served at /firebase-messaging-sw.js

importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-messaging-compat.js');

// Initialize the Firebase app in the service worker by passing in the config.
// Use the same config as your app. Either paste the config here or (preferred) keep a minimal config.
const firebaseConfig = {
  apiKey: "AIzaSyBrJKoipeLFords9NM-AZDNG4TH-767pkU",
  authDomain: "blood-donor-finder-744dd.firebaseapp.com",
  projectId: "blood-donor-finder-744dd",
  storageBucket: "blood-donor-finder-744dd.firebasestorage.app",
  messagingSenderId: "586315694761",
  appId: "1:586315694761:web:3b826556c8e0f04b5a5fb8",
  measurementId: "G-4KKYY4DCE7"
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

messaging.onBackgroundMessage(function(payload) {
  // Customize notification here
  const notificationTitle = payload.notification?.title || 'Background Message Title';
  const notificationOptions = {
    body: payload.notification?.body || 'Background Message body.',
    icon: '/favicon.ico',
    data: payload.data || {}
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Optional: notification click handler
self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  const clickAction = event.notification.data?.click_action || '/';
  event.waitUntil(clients.openWindow(clickAction));
});



