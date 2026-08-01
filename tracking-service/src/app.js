// src/app.js
"use strict";

const http = require("http");
const { WebSocketServer } = require("ws");
const { createRoomManager } = require("./rooms");

/**
 * createApp wires the HTTP + WebSocket surface to the room manager.
 * Dependencies (redis, auth, db) are injected so tests can run without real
 * Redis / Firebase.
 */
function createApp({ redis, auth, db, logger = console, config = {} }) {
  const rooms = createRoomManager({ redis, auth, db, logger, config });

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);

    if (req.method === "GET" && url.pathname === "/health") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          ok: true,
          mode: redis.mode || "unknown",
          uptime: Math.round(process.uptime()),
          connections: rooms.getConnectionCount(),
        })
      );
      return;
    }

    const publishMatch = url.pathname.match(/^\/publish\/([^/]+)$/);
    if (req.method === "POST" && publishMatch) {
      return handlePublish(req, res, decodeURIComponent(publishMatch[1]));
    }

    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Not found" }));
  });

  function readBody(req) {
    return new Promise((resolve) => {
      let body = "";
      req.on("data", (chunk) => {
        body += chunk;
        if (body.length > 1e6) req.destroy();
      });
      req.on("end", () => resolve(body));
      req.on("error", () => resolve(""));
    });
  }

  function bearerToken(req) {
    const header = req.headers.authorization || "";
    const match = header.match(/^Bearer\s+(.+)$/i);
    return match ? match[1] : null;
  }

  async function handlePublish(req, res, requestId) {
    const respond = (status, payload) => {
      res.writeHead(status, { "Content-Type": "application/json" });
      res.end(JSON.stringify(payload));
    };

    try {
      const token = bearerToken(req);
      if (!token) return respond(401, { error: "Missing bearer token." });

      let uid;
      try {
        ({ uid } = await auth.verifyIdToken(token));
      } catch (_) {
        return respond(401, { error: "Invalid token.", code: "UNAUTHORIZED" });
      }
      const authz = await rooms.authorizePublish(requestId, uid);
      if (!authz.ok) {
        const status = authz.code === "FORBIDDEN" ? 403 : 409;
        return respond(status, { error: authz.message, code: authz.code });
      }

      const allowed =
        typeof config.rateLimit === "function"
          ? await config.rateLimit(`publish:${uid}:${requestId}`)
          : true;
      if (!allowed) return respond(429, { error: "Rate limit exceeded.", code: "RATE_LIMITED" });

      const body = JSON.parse((await readBody(req)) || "{}");
      const lat = Number(body.lat);
      const lng = Number(body.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        return respond(400, { error: "lat and lng are required numbers." });
      }

      await rooms.publish(requestId, uid, { lat, lng, accuracy: body.accuracy });
      return respond(202, { ok: true });
    } catch (err) {
      logger.error("[publish] error:", err);
      return respond(500, { error: "Internal error." });
    }
  }

  const wss = new WebSocketServer({ server });

  wss.on("connection", async (ws, req) => {
    const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
    const requestId = url.searchParams.get("room");
    const token = url.searchParams.get("token");

    const reject = (code, message) => {
      try {
        ws.send(JSON.stringify({ type: "error", code, message }));
        ws.close(4001, message);
      } catch (_) {}
    };

    if (!requestId || !token) {
      return reject("BAD_REQUEST", "room and token query params are required");
    }

    let uid;
    try {
      ({ uid } = await auth.verifyIdToken(token));
    } catch (_) {
      return reject("UNAUTHORIZED", "Invalid token.");
    }

    let request;
    try {
      request = await rooms.loadRequest(requestId);
    } catch (err) {
      logger.error("[ws] loadRequest failed:", err);
      return reject("INTERNAL", "Could not load request.");
    }

    const authz = rooms.authorizeRequest(request, uid);
    if (!authz.ok) return reject(authz.code, authz.message);

    try {
      await rooms.join(requestId, ws, { uid, role: authz.role, request });
    } catch (err) {
      logger.error("[ws] join failed:", err);
      return reject("INTERNAL", "Could not join room.");
    }
  });

  return {
    server,
    rooms,
    close() {
      return new Promise((resolve) => {
        for (const client of wss.clients) {
          try { client.terminate(); } catch (_) {}
        }
        rooms.close();
        wss.close(() => server.close(resolve));
      });
    },
  };
}

module.exports = { createApp };
