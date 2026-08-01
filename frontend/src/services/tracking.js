// src/services/tracking.js
import { ref, set, remove, onValue, off } from "firebase/database";
import { rtdb, auth } from "../firebase";

// Transport-agnostic live-tracking interface.
//
// All live-tracking data flow goes through the functions below so the UI
// components never talk to a transport directly.
//
// Two implementations, selected once at build time via REACT_APP_TRACKING_MODE:
//   - "rtdb" (default): Firebase Realtime Database (original implementation).
//   - "ws":            the Redis + WebSocket tracking service (tracking-service/).
//
// Rollback is a one-line env change (back to "rtdb"). The WebSocket service
// URL comes from REACT_APP_TRACKING_WS_URL (e.g. wss://<app>.onrender.com) —
// same convention as REACT_APP_FIREBASE_DATABASE_URL.

const TRACKING_MODE = process.env.REACT_APP_TRACKING_MODE || "rtdb";
const TRACKING_WS_URL = (process.env.REACT_APP_TRACKING_WS_URL || "").replace(/\/+$/, "");

function wsBase() {
  return TRACKING_WS_URL.replace(/^https:/, "wss:").replace(/^http:/, "ws:");
}

function httpBase() {
  return TRACKING_WS_URL.replace(/^wss:/, "https:").replace(/^ws:/, "http:");
}

export async function initiateTrackingSession(requestId, requestData) {
  if (TRACKING_MODE === "ws") {
    // The service builds the room on demand from the accepted Firestore doc;
    // nothing to bootstrap on the client.
    return;
  }

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
  if (TRACKING_MODE === "ws") {
    const user = auth.currentUser;
    if (!user || !requestId) return;
    if (!TRACKING_WS_URL) throw new Error("REACT_APP_TRACKING_WS_URL is not set.");
    const idToken = await user.getIdToken();
    const res = await fetch(`${httpBase()}/publish/${encodeURIComponent(requestId)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
      body: JSON.stringify({ lat: Number(lat), lng: Number(lng), accuracy: accuracy ?? null }),
    });
    if (!res.ok) {
      if (res.status === 429) {
        console.warn("Tracking publish rate limit exceeded.");
        return;
      }
      throw new Error(`Tracking publish failed (${res.status}).`);
    }
    return;
  }

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
  if (TRACKING_MODE === "ws") {
    // The service tears the room down on socket close, request status change,
    // or idle timeout. Client-side cleanup is handled by the unsubscribe that
    // subscribeToLocation returns.
    return;
  }
  if (!requestId) return;
  await remove(ref(rtdb, `tracking/${requestId}`));
}

/**
 * Open a WebSocket to the tracking service with reconnection + exponential
 * backoff (max `maxAttempts`). Returns an unsubscribe function.
 */
function openTrackingSocket({ requestId, onUpdate, onError, maxAttempts = 5, baseDelayMs = 1000 }) {
  let attempts = 0;
  let stopped = false;
  let ws = null;
  let session = null;

  const closeSocket = () => {
    if (ws) {
      ws.onopen = ws.onmessage = ws.onclose = ws.onerror = null;
      try { ws.close(); } catch (_) {}
      ws = null;
    }
  };

  const scheduleReconnect = () => {
    if (stopped) return;
    attempts += 1;
    if (attempts > maxAttempts) {
      if (typeof onError === "function") {
        onError(new Error("Tracking service unreachable — live tracking unavailable."));
      }
      return;
    }
    const delay = Math.min(baseDelayMs * 2 ** (attempts - 1), 10000);
    setTimeout(connect, delay);
  };

  const connect = () => {
    if (stopped) return;
    if (!TRACKING_WS_URL) {
      if (typeof onError === "function") onError(new Error("REACT_APP_TRACKING_WS_URL is not set."));
      return;
    }

    auth.currentUser
      ?.getIdToken(true)
      .then((idToken) => {
        if (stopped) return;
        const url = new URL("/tracking", wsBase());
        url.searchParams.set("room", requestId);
        url.searchParams.set("token", idToken);

        ws = new WebSocket(url.toString());

        ws.onopen = () => {
          attempts = 0;
        };

        ws.onmessage = (event) => {
          let msg;
          try { msg = JSON.parse(event.data); } catch (_) { return; }

          if (msg.type === "ready") {
            session = {
              id: requestId,
              donorId: msg.donorId,
              requesterId: msg.requesterId,
              status: "active",
              hospital: msg.hospital,
              hospitalName: msg.hospitalName,
              patientName: msg.patientName,
              bloodType: msg.bloodType,
              createdAt: msg.createdAt,
              location: msg.location || null,
            };
            onUpdate(session);
          } else if (msg.type === "location") {
            if (!session) session = { id: requestId, status: "active" };
            session.location = {
              lat: msg.lat,
              lng: msg.lng,
              accuracy: msg.accuracy,
              updatedAt: msg.updatedAt,
              donorId: msg.donorId,
            };
            onUpdate(session);
          } else if (msg.type === "error") {
            if (typeof onError === "function") onError(new Error(msg.message || msg.code));
          } else if (msg.type === "closed") {
            if (typeof onError === "function") onError(new Error("Tracking session closed."));
            stopped = true; // server-initiated close — do not reconnect
            closeSocket();
          }
        };

        ws.onclose = () => {
          if (!stopped) scheduleReconnect();
        };

        ws.onerror = () => { /* onclose follows */ };
      })
      .catch((err) => {
        if (typeof onError === "function") onError(err);
        scheduleReconnect();
      });
  };

  connect();

  return () => {
    stopped = true;
    closeSocket();
  };
}

export function subscribeToLocation(requestId, onUpdate, onError) {
  if (!requestId) return () => {};

  if (TRACKING_MODE === "ws") {
    return openTrackingSocket({ requestId, onUpdate, onError });
  }

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
