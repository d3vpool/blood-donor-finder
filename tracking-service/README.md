# LifeLink Tracking Service

Standalone Node.js service for **live donor-location tracking** — the transport
layer behind LifeLink's live map, replacing Firebase RTDB for this data path.
It is deliberately single-purpose: hold WebSocket connections and relay location
updates through Redis pub/sub. Firestore + Cloud Functions + FCM remain the
system of record for the request lifecycle and are not touched.

- WebSocket endpoint for subscribers (requester sees the donor move live)
- `POST /publish/:requestId` for the accepted donor's GPS pings
- Server-side auth: every connection/publish is checked against the request's
  `acceptedBy` (donor) or `userId` (requester)
- Guardrails: Redis-backed rate limiting (1 publish/s/donor) and session expiry
  (Firestore status change **or** 15-min idle timeout)

## Architecture

```
Donor client  --POST /publish/:id {lat,lng}-->  tracking-service  --Redis channel room:{id}-->  Requester client (WebSocket)
```

- **Room access control**: on WS connect the client sends its Firebase ID token
  (`?room=<requestId>&token=<idToken>`). The service verifies it with Firebase
  Admin, loads `BloodRequests/<requestId>`, and only lets the request's
  `acceptedBy` or `userId` join. Everyone else gets an error frame and the
  connection is closed.
- **Per-room Firestore listener**: a status listener is attached when a room is
  first created and is unsubscribed when the room closes, so no dangling
  listeners accumulate. Any status leaving `accepted` (fulfilled / cancelled /
  donor-cancelled / deleted) closes the room.
- **Idle timeout**: independent sweeper force-closes a room after 15 minutes
  without a location update, even if the Firestore status never changed.
- **Last-location replay**: the most recent location is kept in Redis per room
  and included in the `ready` frame, so a late-joining requester still sees it.

## Endpoints

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/health` | GET | none | `{ ok, mode, uptime, connections }` |
| `/tracking?room={id}&token={idToken}` | WebSocket | Firebase ID token | Subscribe to a room |
| `/publish/:requestId` | POST | Bearer ID token (donor only) | Publish `{ lat, lng, accuracy? }` |

## Environment variables

| Var | Required | Notes |
|-----|----------|-------|
| `PORT` | dev default `8080` | HTTP + WS port |
| `NODE_ENV` | yes (prod) | `production` on Render. Dev/test never use the in-memory shims in production. |
| `REDIS_URL` | **prod: yes** | Real Redis in production (Render Redis add-on or a free tier like Upstash). No persistence needed. |
| `FIREBASE_PROJECT_ID` | prod: yes | Used for ID-token verification + Firestore reads. |
| `GOOGLE_APPLICATION_CREDENTIALS` | prod: recommended | Path to a Firebase service-account JSON (Firestore read access). |

## Local development

```bash
npm install
# Without REDIS_URL + NODE_ENV != production, the service uses in-memory
# shims for Redis/Firestore/auth so tests and demos run with zero infra.
npm start          # -> http://localhost:8080, ws://localhost:8080
npm test           # manual (relay/isolation/auth) + guardrails (429/expiry) tests
```

Dev-mode auth stub: an ID token of the form `dev-<uid>` maps to that uid. It is
strictly gated behind `NODE_ENV !== "production"` and can never activate on
Render.

## Deploy to Render (free tier)

1. Push `tracking-service/` to your repo.
2. Create a **Redis** instance and copy its connection string (Render Redis
   add-on, or a free tier such as Upstash — `rediss://`).
3. In the Render dashboard create a Web Service from the repo directory
   `tracking-service` (or use `render.yaml` as the Blueprint), plan **free**.
4. Set env vars: `NODE_ENV=production`, `REDIS_URL=<from step 2>`,
   `FIREBASE_PROJECT_ID=blood-donor-finder-744dd`, and
   `GOOGLE_APPLICATION_CREDENTIALS` pointing at a mounted service-account file.
5. Render gives you `wss://<app>.onrender.com` automatically.

## Wiring the frontend

The web app selects the transport with `REACT_APP_TRACKING_MODE`:

```
REACT_APP_TRACKING_MODE=ws
REACT_APP_TRACKING_WS_URL=https://<app>.onrender.com
```

- `REACT_APP_TRACKING_MODE` defaults to `rtdb` (Firebase Realtime Database) —
  flip it to `ws` only after the deployed service passes the E2E checklist.
- All transport logic lives in `frontend/src/services/tracking.js`; the UI
  components are transport-agnostic and did not change.
