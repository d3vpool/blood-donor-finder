import { ref, set, onValue, off, remove } from "firebase/database";
import * as Location from "expo-location";
import { rtdb, auth } from "./firebase";

export async function publishDonorLocation(requestId, coords) {
  const user = auth.currentUser;
  if (!user || !requestId) return;

  await set(ref(rtdb, `tracking/${requestId}/location`), {
    lat: Number(coords.latitude),
    lng: Number(coords.longitude),
    accuracy: coords.accuracy ?? null,
    updatedAt: Date.now(),
    donorId: user.uid,
  });
}

export function subscribeToTracking(requestId, onData, onError) {
  if (!requestId) return () => {};
  const node = ref(rtdb, `tracking/${requestId}`);
  const handler = (snap) => onData(snap.exists() ? { id: requestId, ...snap.val() } : null);
  onValue(node, handler, onError);
  return () => off(node, "value", handler);
}

export async function purgeTrackingSession(requestId) {
  if (!requestId) return;
  await remove(ref(rtdb, `tracking/${requestId}`));
}

/**
 * Start background-capable foreground GPS streaming for an accepted delivery.
 * Returns stop().
 */
export async function startMobileLocationPublisher(requestId, { minIntervalMs = 4000 } = {}) {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== "granted") {
    throw new Error("Location permission denied");
  }

  let lastSent = 0;
  const sub = await Location.watchPositionAsync(
    {
      accuracy: Location.Accuracy.High,
      timeInterval: minIntervalMs,
      distanceInterval: 15,
    },
    async (pos) => {
      const now = Date.now();
      if (now - lastSent < minIntervalMs) return;
      lastSent = now;
      try {
        await publishDonorLocation(requestId, pos.coords);
      } catch (err) {
        console.warn("Mobile location publish failed:", err);
      }
    }
  );

  return () => {
    try {
      sub.remove();
    } catch (_) {}
  };
}
