/**
 * src/firebaseMessaging.js
 *
 * Uses the default firebase app exported from ./firebase if caller doesn't pass an app.
 * Exports:
 *  - initMessaging(appOrNull, swPath)
 *  - setupAutoRegistration({ app, uid, swPath })
 *  - registerTokenForUser(token, uid, app)
 *  - removeTokenForUser(uid, app)
 *  - listenForegroundMessages(callback, app)
 */

import firebaseAppDefault from './firebase'; // your local firebase initializer (default export)
import { messaging, db } from './firebase';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import {
  getFirestore,
  doc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  getDoc,
  setDoc,
} from 'firebase/firestore';

/* Helper: resolve a firebase app instance. Use provided app, otherwise fall back to default export. */
function resolveApp(maybeApp) {
  if (maybeApp) return maybeApp;
  if (firebaseAppDefault) return firebaseAppDefault;
  throw new Error('Firebase app instance required. Initialize firebase app and pass it or ensure default export exists in ./firebase.');
}

/**
 * Initialize messaging and register service worker.
 * @param {FirebaseApp|null} appOrNull
 * @param {string} swPath
 * @returns {Promise<{messaging: Messaging, serviceWorkerRegistration: ServiceWorkerRegistration|null}>}
 */
export async function initMessaging(appOrNull = null, swPath = '/firebase-messaging-sw.js') {
  const app = resolveApp(appOrNull);

  let registration = null;
  if ('serviceWorker' in navigator) {
    try {
      registration = await navigator.serviceWorker.register(swPath);
    } catch (err) {
      console.warn('Service worker registration failed:', err);
    }
  } else {
    console.warn('Service workers are not supported in this browser.');
  }

  const messaging = getMessaging(app);
  return { messaging, serviceWorkerRegistration: registration };
}

/**
 * Request permission, get token and register it for the uid in Firestore.
 * @param {{app?: FirebaseApp, uid: string, swPath?: string}} param0
 */
export async function setupAutoRegistrationLegacy({ app: maybeApp = null, uid, swPath } = {}) {
  const app = resolveApp(maybeApp);
  if (!uid) throw new Error('setupAutoRegistration: uid is required');

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    console.warn('Notification permission not granted:', permission);
    return null;
  }

  const { messaging, serviceWorkerRegistration } = await initMessaging(app, swPath);
  const vapidKey = process.env.REACT_APP_FIREBASE_VAPID_KEY || process.env.REACT_APP_VAPID_KEY || null;

  try {
    let currentToken;
    if (serviceWorkerRegistration) {
      if (vapidKey) {
        currentToken = await getToken(messaging, { vapidKey, serviceWorkerRegistration });
      } else {
        currentToken = await getToken(messaging, { serviceWorkerRegistration });
      }
    } else {
      if (vapidKey) {
        currentToken = await getToken(messaging, { vapidKey });
      } else {
        currentToken = await getToken(messaging);
      }
    }

    if (currentToken) {
      await registerTokenForUser(uid, currentToken);
      return currentToken;
    } else {
      console.warn('No registration token available.');
      return null;
    }
  } catch (err) {
    console.error('An error occurred while retrieving token. ', err);
    throw err;
  }
}

/**
 * Setup auto registration for a user - requests permission, gets token, and registers it.
 * @param {Object} user - User object with uid property
 */
export const setupAutoRegistration = async (user) => {
  if (!user || !user.uid) return;

  try {
    const token = await requestNotificationPermissionAndGetToken();

    if (token) {
      await registerTokenForUser(user.uid, token);
      console.log("Registered FCM token for user:", user.uid, token);
    }
  } catch (err) {
    console.warn("setupAutoRegistration failed:", err);
  }
};

/**
 * Store token into users/{uid}.fcmTokens array in Firestore.
 * @param {string} uid - User ID
 * @param {string} token - FCM token
 */
export const registerTokenForUser = async (uid, token) => {
  if (!uid || !token) return;

  const userRef = doc(db, "users", uid);

  // Ensure user doc exists and add token to an array field
  await setDoc(
    userRef,
    { fcmTokens: arrayUnion(token) },
    { merge: true }
  );
};

/**
 * Remove token from users/{uid}.fcmTokens array in Firestore.
 * @param {string} uid - User ID
 * @param {string} token - FCM token to remove
 */
export const removeTokenForUser = async (uid, token) => {
  if (!uid || !token) return;

  const userRef = doc(db, "users", uid);

  await updateDoc(userRef, {
    fcmTokens: arrayRemove(token),
  });
};

/**
 * Listen to foreground messages. Optionally pass an app to ensure correct messaging instance.
 * @param {(payload:Object)=>void} callback
 * @param {FirebaseApp|null} app
 */
export function listenForegroundMessages(callback, app = null) {
  if (typeof callback !== 'function') throw new Error('listenForegroundMessages: callback function required');
  const appToUse = resolveApp(app);
  const messaging = getMessaging(appToUse);
  const unsub = onMessage(messaging, (payload) => {
    try {
      callback(payload);
    } catch (err) {
      console.error('Error in foreground message callback:', err);
    }
  });
  return typeof unsub === 'function' ? unsub : () => {};
}

/**
 * Request notification permission and get FCM token.
 * @returns {Promise<string|null>} The FCM token or null if permission denied
 */
export async function requestNotificationPermissionAndGetToken() {
  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.warn('Notification permission not granted:', permission);
      return null;
    }

    const vapidKey = process.env.REACT_APP_FIREBASE_VAPID_KEY;
    if (!vapidKey) {
      console.warn('REACT_APP_FIREBASE_VAPID_KEY is not set');
    }

    // Wait for service worker to be ready and get registration
    let serviceWorkerRegistration = null;
    if ('serviceWorker' in navigator) {
      try {
        serviceWorkerRegistration = await navigator.serviceWorker.ready;
      } catch (error) {
        console.warn('Service worker not ready:', error);
      }
    }

    // Pass serviceWorkerRegistration to getToken to avoid pushManager error
    const tokenOptions = { vapidKey };
    if (serviceWorkerRegistration) {
      tokenOptions.serviceWorkerRegistration = serviceWorkerRegistration;
    }

    const token = await getToken(messaging, tokenOptions);
    console.log('FCM Token:', token);
    return token;
  } catch (error) {
    console.error('Error getting FCM token:', error);
    throw error;
  }
}

/**
 * Listen to foreground messages using onMessage.
 * @param {(payload: Object) => void} callback - Callback function to handle the message payload
 */
export function onForegroundMessage(callback) {
  if (typeof callback !== 'function') {
    throw new Error('onForegroundMessage: callback must be a function');
  }
  return onMessage(messaging, callback);
}

export default {
  initMessaging,
  setupAutoRegistration,
  registerTokenForUser,
  removeTokenForUser,
  listenForegroundMessages,
  requestNotificationPermissionAndGetToken,
  onForegroundMessage,
};
