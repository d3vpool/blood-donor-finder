// src/rooms.js
"use strict";

/**
 * Room lifecycle + access control for live tracking.
 *
 * A "room" maps one accepted BloodRequests doc to a Redis channel. Every room
 * carries its own Firestore status listener and idle timer; both are torn down
 * in closeRoom() so no dangling listeners accumulate as requests come and go.
 */
function createRoomManager({ redis, auth, db, logger = console, config = {} }) {
  const rooms = new Map(); // requestId -> room
  const IDLE_TIMEOUT_MS = config.idleTimeoutMs || 15 * 60 * 1000;
  const sweepIntervalMs = config.sweepIntervalMs || 30 * 1000;

  async function loadRequest(requestId) {
    const snap = await db.doc(`BloodRequests/${requestId}`).get();
    if (!snap.exists) return null;
    return snap.data();
  }

  function authorizeRequest(request, uid) {
    if (!request || request.status !== "accepted") {
      return { ok: false, code: "NOT_ACCEPTED", message: "Request is not in accepted status." };
    }
    if (request.acceptedBy !== uid && request.userId !== uid) {
      return { ok: false, code: "FORBIDDEN", message: "You are not part of this tracking room." };
    }
    return { ok: true, role: request.acceptedBy === uid ? "donor" : "requester" };
  }

  function closeRoom(requestId, reason) {
    const room = rooms.get(requestId);
    if (!room) return;
    rooms.delete(requestId);

    if (room.redisUnsub) {
      try { room.redisUnsub(); } catch (_) {}
    }
    // Per-room Firestore status listener — must always be unsubscribed here.
    if (room.statusUnsub) {
      try { room.statusUnsub(); } catch (_) {}
    }
    if (room.sweepHandle) clearInterval(room.sweepHandle);

    for (const ws of room.sockets) {
      try {
        ws.send(JSON.stringify({ type: "closed", reason }));
        ws.close(1000, reason);
      } catch (_) {}
    }
    room.sockets.clear();
    logger.log(`[room] closed ${requestId} (${reason})`);
  }

  // Per-room status listener: close the room the moment the request stops
  // being accepted (fulfilled / cancelled / donor-cancelled / deleted).
  function attachStatusListener(room, requestId) {
    const unsub = db.doc(`BloodRequests/${requestId}`).onSnapshot((snap) => {
      const data = snap && typeof snap.data === "function" ? snap.data() : null;
      if (!data) {
        closeRoom(requestId, "request-deleted");
        return;
      }
      if (data.status !== "accepted") {
        closeRoom(requestId, `status-${data.status || "unknown"}`);
      }
    });
    room.statusUnsub = unsub;
  }

  function ensureRoom(requestId) {
    let room = rooms.get(requestId);
    if (!room) {
      room = {
        requestId,
        sockets: new Set(),
        redisUnsub: null,
        statusUnsub: null,
        lastActivity: Date.now(),
      };
      rooms.set(requestId, room);
    }
    return room;
  }

  async function join(requestId, ws, { uid, role, request }) {
    let room = ensureRoom(requestId);
    room.sockets.add(ws);
    room.lastActivity = Date.now();

    if (!room.redisUnsub) {
      room.redisUnsub = await redis.subscribe(`room:${requestId}`, (channel, message) => {
        for (const socket of room.sockets) {
          if (socket.readyState === 1) {
            try { socket.send(message); } catch (_) {}
          }
        }
      });
      attachStatusListener(room, requestId);
    }

    // Replay last published location so a late-joining requester still sees it.
    let lastLocation = null;
    try {
      const raw = await redis.get(`loc:${requestId}`);
      if (raw) lastLocation = JSON.parse(raw);
    } catch (_) {}

    ws.send(
      JSON.stringify({
        type: "ready",
        requestId,
        role,
        donorId: request.acceptedBy,
        requesterId: request.userId,
        hospital: request.location || null,
        hospitalName: request.hospitalName || "",
        patientName: request.patientName || "",
        bloodType: request.bloodType || "",
        createdAt: request.acceptedAt || Date.now(),
        status: "active",
        location: lastLocation,
      })
    );

    ws.on("close", () => {
      room.sockets.delete(ws);
      if (room.sockets.size === 0) closeRoom(requestId, "all-clients-left");
    });

    return room;
  }

  async function authorizePublish(requestId, uid) {
    const request = await loadRequest(requestId);
    const authz = authorizeRequest(request, uid);
    if (!authz.ok) return authz;
    if (authz.role !== "donor") {
      return {
        ok: false,
        code: "FORBIDDEN",
        message: "Only the accepted donor can publish locations.",
      };
    }
    return { ok: true, request };
  }

  async function publish(requestId, uid, { lat, lng, accuracy }) {
    const room = rooms.get(requestId);
    if (room) room.lastActivity = Date.now();

    const payload = JSON.stringify({
      type: "location",
      lat: Number(lat),
      lng: Number(lng),
      accuracy: accuracy ?? null,
      updatedAt: Date.now(),
      donorId: uid,
    });

    await redis.set(`loc:${requestId}`, payload);
    await redis.publish(`room:${requestId}`, payload);
  }

  // Independent idle-timeout sweep: force-closes rooms with no location updates,
  // even if the Firestore status never changed.
  const sweeper = setInterval(() => {
    const now = Date.now();
    for (const [id, room] of rooms) {
      if (now - room.lastActivity > IDLE_TIMEOUT_MS) {
        closeRoom(id, "idle-timeout");
      }
    }
  }, sweepIntervalMs);
  if (sweeper.unref) sweeper.unref();

  return {
    rooms,
    loadRequest,
    authorizeRequest,
    authorizePublish,
    join,
    publish,
    closeRoom,
    getConnectionCount() {
      let count = 0;
      for (const room of rooms.values()) count += room.sockets.size;
      return count;
    },
    close() {
      clearInterval(sweeper);
      for (const id of [...rooms.keys()]) closeRoom(id, "shutdown");
    },
  };
}

module.exports = { createRoomManager };
