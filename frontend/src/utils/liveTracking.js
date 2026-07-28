import {
  ref,
  set,
  update,
  remove,
  onValue,
  off,
} from "firebase/database";
import { rtdb, auth } from "../firebase";

/**
 * Create the ephemeral tracking node after a donor accepts.
 * Structure: tracking/{requestId}
 */
export async function bootstrapTrackingSession(requestId, requestData) {
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

export async function publishDonorLocation(requestId, { latitude, longitude, accuracy }) {
  const user = auth.currentUser;
  if (!user || !requestId) return;

  const locationRef = ref(rtdb, `tracking/${requestId}/location`);
  await set(locationRef, {
    lat: Number(latitude),
    lng: Number(longitude),
    accuracy: accuracy ?? null,
    updatedAt: Date.now(),
    donorId: user.uid,
  });
}

export async function markTrackingEnded(requestId) {
  if (!requestId) return;
  try {
    await update(ref(rtdb, `tracking/${requestId}`), {
      status: "ended",
      endedAt: Date.now(),
    });
  } catch (_) { /* ignore */ }
}

export async function purgeTrackingSession(requestId) {
  if (!requestId) return;
  await remove(ref(rtdb, `tracking/${requestId}`));
}

/**
 * Subscribe to a tracking session. Returns an unsubscribe function.
 */
export function subscribeToTracking(requestId, onData, onError) {
  if (!requestId) return () => {};
  const node = ref(rtdb, `tracking/${requestId}`);
  const handler = (snap) => {
    onData(snap.exists() ? { id: requestId, ...snap.val() } : null);
  };
  const errHandler = (err) => {
    if (typeof onError === "function") onError(err);
  };
  onValue(node, handler, errHandler);
  return () => off(node, "value", handler);
}

/**
 * Watch device GPS and publish to RTDB while callback returns true / until stopped.
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
        await publishDonorLocation(requestId, {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
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
