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
export async function setupAutoRegistration({ app: maybeApp = null, uid, swPath } = {}) {
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
      await registerTokenForUser(currentToken, uid, app);
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
 * Store token into users/{uid}.fcmTokens array in Firestore.
 */
export async function registerTokenForUser(token, uid, app = null) {
  if (!token) throw new Error('registerTokenForUser: token required');
  if (!uid) throw new Error('registerTokenForUser: uid required');

  const appToUse = resolveApp(app);
  const db = getFirestore(appToUse);
  const userRef = doc(db, 'users', uid);

  try {
    const snapshot = await getDoc(userRef);
    if (!snapshot.exists()) {
      await setDoc(userRef, { fcmTokens: [token] }, { merge: true });
    } else {
      await updateDoc(userRef, { fcmTokens: arrayUnion(token) });
    }
  } catch (err) {
    console.error('registerTokenForUser failed:', err);
    throw err;
  }
}

/**
 * Remove current device token from users/{uid}.fcmTokens array.
 */
export async function removeTokenForUser(uid, app = null) {
  if (!uid) throw new Error('removeTokenForUser: uid required');

  const appToUse = resolveApp(app);
  const db = getFirestore(appToUse);
  const userRef = doc(db, 'users', uid);

  try {
    const messaging = getMessaging(appToUse);
    const vapidKey = process.env.REACT_APP_FIREBASE_VAPID_KEY || process.env.REACT_APP_VAPID_KEY || null;

    let token = null;
    try {
      if (vapidKey) token = await getToken(messaging, { vapidKey });
      else token = await getToken(messaging);
    } catch (tErr) {
      console.warn('Could not fetch current token (getToken):', tErr);
      return false;
    }

    if (!token) return true;

    await updateDoc(userRef, { fcmTokens: arrayRemove(token) });
    return true;
  } catch (err) {
    console.error('removeTokenForUser failed:', err);
    return false;
  }
}

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

export default {
  initMessaging,
  setupAutoRegistration,
  registerTokenForUser,
  removeTokenForUser,
  listenForegroundMessages,
};
