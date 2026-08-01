# 🏗️ Design & Architecture Decisions

## 2026-07-28 Decision: Serverless Backend Architecture with Firebase
- **Context**: Real-time blood requests and donor matching require immediate response to save lives. GeoFire was essential for location-based search to find nearby donors within critical timeframes. While Firestore/GeoFire have query limitations (as documented in Known Gotchas), we needed this capability to support the core emergency blood donation workflow where speed is critical.
- **Decision**: Use Firebase Cloud Functions with Firestore and GeoFire. We accept geospatial limitations and implement graceful degradation to city-level search for complex radius calculations, while using GeoFire for efficient donor searches within predefined zones.
- **Alternatives considered**:
  - AWS Lambda + RDS: Too slow for real-time emergency matching, requires complex infrastructure setup
  - Custom Node.js/Express with PostGIS: Higher maintenance burden, slower deployment time
  - No backend at all: Cannot support real-time notifications and user registration

## 2026-07-28 Decision: React + Tailwind for Frontend
- **Context**: LifeLink needs rapid UI iteration to support emergency blood request scenarios and real-time push notifications. When a blood emergency occurs, donors must act immediately - we need to ship UI updates quickly and ensure responsive notification flows. Also need to continuously improve the donation experience based on user feedback.
- **Decision**: Use React with Tailwind CSS for rapid development and real-time notification UI. Tailwind's utility-first approach allows quick styling of emergency request forms, notification banners, and real-time status updates. React's component model enables rapid iteration on critical donor interfaces without slowing down development.
- **Alternatives considered**:
  - Material-UI: Would require custom components for emergency urgency design and is slower to adapt to new blood request workflows
  - CSS Modules + SCSS: Too slow for rapid iteration during emergency workflow updates
  - No CSS framework: Wouldn't meet the emergency response visual design requirements for high-contrast, accessible notification interfaces

## 2026-08-02 Decision: Targeted donor requests via `targetDonorId`
- **Context**: Recipients searching donors by radius needed to send a request to a *specific* donor instead of only broadcasting to every matching donor.
- **Decision**: Reuse the existing `BloodRequests` lifecycle for direct requests by adding a `targetDonorId` field. The `bloodRequestReceived` trigger skips the geo scan and notifies only that donor; `DonorInbox` surfaces targeted requests. The targeted request still flows through the standard accept/tracking/cancel pipeline.
- **Alternatives considered**:
  - Separate "direct request" collection/flow: would duplicate accept + tracking logic for no benefit
  - EmailJS modal only (existing ContactModal): no acceptance or live-tracking integration

## 2026-08-02 Decision: Donor cancel reopens an accepted request
- **Context**: A donor may need to back out after accepting; the recipient's request must remain usable by other donors afterwards.
- **Decision**: `cancelAcceptedBloodRequest` resets an accepted request to `pending` (clearing `acceptedBy*`, `trackingActive` and purging the RTDB node), so any other donor can accept again. Recipient-initiated cancel still closes the request permanently (`cancelled`). A Firestore rule (`isDonorCancelling`) guards the donor-only transition.
- **Alternatives considered**:
  - Permanent `cancelled` on donor cancel: would strand a needy recipient and force a re-submit
  - Ignore donor cancellation: contradicts the requirement and leaves stale tracking nodes

## 2026-08-02 Decision: Straight-line ETA estimate
- **Context**: Both donor and recipient should see the donor's estimated time of arrival while the delivery is live.
- **Decision**: Compute ETA client-side from straight-line distance (geofire-common) between live donor GPS and the hospital at an assumed 30 km/h urban speed. No external routing API dependency.
- **Alternatives considered**:
  - Google Directions API: accurate but needs billing, API key, and external network calls — overkill for an estimate
  - Distance Matrix / OSRM: same external-dependency drawbacks

