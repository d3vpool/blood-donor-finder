// src/services/tracking.js
import {
  ref,
  set,
  update,
  remove,
  onValue,
  off,
} from "firebase/database";
import { rtdb, auth } from "../firebase";

// Transport-agnostic live-tracking interface.
//
// All live-tracking data flow goes through the functions below so the
// transport layer can be swapped (RTDB -> WebSocket/Redis service) without
// touching the UI components. Currently backed by Firebase RTDB; the
// WebSocket implementation lands behind the REACT_APP_TRACKING_MODE flag.

export async function initiateTrackingSession(requestId, requestData) {
  if (!requestId || !requestData?.acceptedBy || !requestData?.userId) {
    throw new Error("Missing fields for tracking session.");
  }

  const node = ref(rtdb, `tracking/${requestId}`);
  await set(node, {
    donorId: requestData.acceptedBy,
    requesterId: requestData.userId,
    status: "active",
    hospital: requestData.location || null,
    hospitalName: requestData.hospitalName || "",
    patientName: requestData.patientName || "",
    bloodType: requestData.bloodType || "",
    createdAt: Date.now(),
    location: null,
  });
}

export async function publishLocation(requestId, { lat, lng, accuracy }) {
  const user = auth.currentUser;
  if (!user || !requestId) return;

  await set(ref(rtdb, `tracking/${requestId}/location`), {
    lat: Number(lat),
    lng: Number(lng),
    accuracy: accuracy ?? null,
    updatedAt: Date.now(),
    donorId: user.uid,
  });
}

export async function closeTrackingSession(requestId) {
  if (!requestId) return;
  await remove(ref(rtdb, `tracking/${requestId}`));
}

export function subscribeToLocation(requestId, onUpdate, onError) {
  if (!requestId) return () => {};
  const node = ref(rtdb, `tracking/${requestId}`);
  const handler = (snap) => {
    onUpdate(snap.exists() ? { id: requestId, ...snap.val() } : null);
  };
  const errHandler = (err) => {
    if (typeof onError === "function") onError(err);
  };
  onValue(node, handler, errHandler);
  return () => off(node, "value", handler);
}

/**
 * Watch device GPS and publish while the request stays accepted.
 * Returns a stop() function.
 */
export function startDonorLocationPublisher(requestId, options = {}) {
  if (!navigator.geolocation) {
    throw new Error("Geolocation is not supported.");
  }
  if (!requestId) {
    throw new Error("requestId required for location publisher.");
  }

  const {
    enableHighAccuracy = true,
    maximumAge = 5000,
    timeout = 15000,
    minIntervalMs = 3000,
  } = options;

  let lastSent = 0;
  let stopped = false;

  const watchId = navigator.geolocation.watchPosition(
    async (pos) => {
      if (stopped) return;
      const now = Date.now();
      if (now - lastSent < minIntervalMs) return;
      lastSent = now;
      try {
        await publishLocation(requestId, {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
      } catch (err) {
        console.warn("Failed to publish donor location:", err);
      }
    },
    (err) => {
      console.warn("Donor GPS watch error:", err);
    },
    { enableHighAccuracy, maximumAge, timeout }
  );

  return () => {
    stopped = true;
    navigator.geolocation.clearWatch(watchId);
  };
}
