# LifeLink: 45-Day Engineering & Architecture Roadmap

This document outlines a realistic, incremental engineering roadmap to evolve the existing LifeLink MVP into a production-grade, real-time emergency blood assistance platform. It is designed for a solo developer (college student schedule), focusing on gradual architectural migration rather than massive overnight rewrites.

## 🎯 Architecture Transition Strategy
**Current State**: React Web + Expo Mobile (incomplete) + Inefficient direct Firestore access + Unused Express/MongoDB backend.
**Final State**: React Web + Expo Mobile + Firebase Auth + Firestore (GeoQueries) + RTDB (Live tracking) + Firebase Cloud Functions + FCM.

**Migration Philosophy**:
1. **Deprecate, then Delete**: We won't delete the `backend/` folder on Day 1. We will officially deprecate it, migrate its theoretical responsibilities to Cloud Functions, and *then* delete it cleanly.
2. **Co-evolution**: The web frontend and mobile app will evolve together, but Web leads first to solidify the backend contracts.
3. **Branching**: Use `feature/*` branches for major additions and merge them via Pull Requests to simulate a professional workflow.

---

## Phase 1: Housekeeping & Architectural Alignment (Days 1-5)
*Goal: Clean up the repository, align on the final architecture, and fix critical MVP flaws without adding new features.*

**Day 1: Repository Restructuring & Environment Setup**
*   **Tasks**: Move the unused Express backend to an `archive` or `deprecated` folder (don't delete yet). Initialize the Firebase Functions environment (`firebase init functions`). Setup environment variables.
*   **Commit Examples**: 
    *   `chore: move unused express backend to deprecated folder`
    *   `build: initialize firebase cloud functions environment`
*   **Workload**: Light. Mostly terminal work and folder wrangling.

**Day 2: Securing the Current Firestore Usage**
*   **Tasks**: The frontend currently accesses Firestore directly. That's fine for serverless, but needs security. Update `firestore.rules` so users can only write to their own documents, and anyone can read donors.
*   **Commit Examples**: 
    *   `security: implement basic firestore rules for users and donors`

**Day 3-4: The Great Search Refactor (GeoFirestore Preparation)**
*   **Tasks**: Currently, `Search.jsx` fetches *all* donors and filters client-side. We need to fix this. Install `geofirestore` or use a GeoHash library. Update the `Register.jsx` to save a GeoHash string alongside the latitude/longitude.
*   **Commit Examples**:
    *   `refactor(web): add geohash generation to donor registration`
    *   `chore: run script to backfill geohashes for existing test donors`
*   **Workload**: Moderate. Requires reading about GeoHashes. *Note: Don't rewrite the search yet, just get the data shape right.*

**Day 5: Updating Search to use GeoQueries**
*   **Tasks**: Refactor `Search.jsx` to query Firestore using the GeoHashes instead of downloading the whole database.
*   **Commit Examples**:
    *   `refactor(web): migrate donor search to use geohash radius queries`
    *   `perf: remove client-side haversine distance filtering`

---

## Phase 2: Core Request System & Cloud Functions (Days 6-14)
*Goal: Build the system to actually request blood and notify donors, shifting logic to Cloud Functions.*

**Day 6-7: Designing the Request Schema & UI**
*   **Tasks**: Design a `BloodRequests` Firestore collection. Build a basic "Request Blood" form on the web app (needed blood type, urgency, hospital location).
*   **Commit Examples**:
    *   `feat(web): add emergency blood request form UI`
    *   `feat(db): implement BloodRequests firestore schema`

**Day 8-9: Writing the First Cloud Function**
*   **Tasks**: When a request is created directly from the frontend, a Cloud Function (`onDocumentCreated('BloodRequests/{id}')`) should trigger. Have it simply log the event and find nearby donors using Admin SDK geo-queries.
*   **Commit Examples**:
    *   `feat(functions): add trigger for new blood requests`
    *   `feat(functions): implement nearby donor matching logic in backend`

**Day 10-12: FCM Push Notifications Backend**
*   **Tasks**: The frontend already saves FCM tokens. Now, update the Cloud Function from Day 9 to actually send an FCM payload to the tokens of the matched nearby donors.
*   **Commit Examples**:
    *   `feat(functions): integrate FCM to send push notifications to matched donors`
    *   `fix(functions): handle stale/invalid FCM tokens gracefully`
*   **Workload**: Heavy. Testing push notifications is notoriously tricky.

**Day 13-14: Recipient Dashboard & Request Lifecycle**
*   **Tasks**: Build a UI for the requester to see the status of their request (Pending, Donor Found, Completed).
*   **Commit Examples**:
    *   `feat(web): add dashboard to view active blood requests`
    *   `feat(web): add ability to cancel or mark a request as fulfilled`

---

## Phase 3: Donor Availability & Mobile App Catch-up (Days 15-25)
*Goal: Bring the React Native app to parity and implement a donor availability toggle.*

**Day 15-16: Donor Availability System**
*   **Tasks**: Add a toggle in the web UI for donors ("Available to Donate" / "Snooze for 30 days"). Update the Cloud Function to only notify *available* donors.
*   **Commit Examples**:
    *   `feat(web): add availability toggle to donor profile`
    *   `refactor(functions): exclude snoozed donors from notification matching`

**Day 17-20: Mobile App Foundation & Auth**
*   **Tasks**: Open the `mobile-frontend` folder. Set up Firebase Auth in Expo. Ensure a user can log in on mobile using the exact same credentials as the web.
*   **Commit Examples**:
    *   `feat(mobile): integrate firebase authentication`
    *   `feat(mobile): build login and registration screens`

**Day 21-25: Mobile App Feature Parity**
*   **Tasks**: Replicate the donor registration and search functionality on mobile. Use the exact same Firestore collections.
*   **Commit Examples**:
    *   `feat(mobile): implement donor search with map view`
    *   `feat(mobile): add FCM token registration for mobile clients`
*   **Workload**: Moderate to Heavy depending on React Native experience.

---

## Phase 4: Live Tracking & Real-Time Database (Days 26-35)
*Goal: Implement the "Uber-style" live tracking for accepted emergency requests.*

**Day 26-28: Request Acceptance Flow**
*   **Tasks**: When a donor gets a notification, they can click "Accept". Update the `BloodRequest` document to assign it to that donor.
*   **Commit Examples**:
    *   `feat(web/mobile): add accept/decline actions to emergency alerts`
    *   `feat(functions): handle race conditions for multiple donors accepting`

**Day 29-30: Introducing Firebase Realtime Database (RTDB)**
*   **Tasks**: Firestore is too slow/expensive for live GPS tracking (updating every 3 seconds). Set up Firebase RTDB specifically for ephemeral location tracking during an active request.
*   **Commit Examples**:
    *   `build: initialize Firebase Realtime Database rules`
    *   `feat(mobile): implement background location tracking service (stub)`

**Day 31-35: Uber-Style Live Tracking**
*   **Tasks**: When a donor is en route, the mobile app writes their coordinates to RTDB. The web/mobile app of the recipient listens to this RTDB node and moves a marker on the map.
*   **Commit Examples**:
    *   `feat(mobile): push live coordinates to RTDB during active delivery`
    *   `feat(web): subscribe to RTDB for live donor tracking on map`
    *   `feat(shared): clean up RTDB node when request is completed`
*   **Workload**: Very Heavy. Dealing with mobile background location permissions is difficult.

---

## Phase 5: Admin, Polish, and Deletion (Days 36-45)
*Goal: Finalize the project, remove technical debt, and prepare for deployment.*

**Day 36-38: Admin Dashboard**
*   **Tasks**: Build a protected route on the web app for Admins (controlled via Firebase Custom Claims). Admins can see total donors, active requests, and ban malicious users.
*   **Commit Examples**:
    *   `feat(functions): add script to assign admin role via custom claims`
    *   `feat(web): build basic admin metrics dashboard`

**Day 39-40: Deleting the Old Backend**
*   **Tasks**: The deprecated Express backend is no longer needed. Delete it. Clean up the root directory.
*   **Commit Examples**:
    *   `chore: remove deprecated express backend entirely`
    *   `docs: update README to reflect pure firebase architecture`

**Day 41-43: Testing, Bug Fixing & Error Boundaries**
*   **Tasks**: Add React Error Boundaries. Test edge cases (what if user denies location? what if FCM token expires?).
*   **Commit Examples**:
    *   `fix(web): add global error boundaries to prevent white screens`
    *   `fix: handle denied location permissions gracefully`

**Day 44-45: Final Deployment & Buffer**
*   **Tasks**: Deploy the Web app to Firebase Hosting or Vercel. Deploy Cloud Functions. Prep the Expo app for an EAS Build (APK/TestFlight).
*   **Commit Examples**:
    *   `build: configure firebase hosting deployment pipeline`
    *   `release: v1.0.0 production ready`

---

## 💡 Developer Guidelines & Best Practices

1. **Structuring Branches**:
   * Use `main` for stable, working code.
   * Create branches like `feature/geo-search`, `feature/push-notifications`, `fix/mobile-auth`.
   * Merge locally and use `--no-ff` (no fast-forward) to keep the merge commits visible on GitHub. This looks highly professional.
2. **Intentional Incompleteness**:
   * On Day 7, the "Request Blood" form will save to Firestore, but *no one will be notified*. This is intentional. You commit this. Then on Day 9, you add the notification logic. This shows a real engineer iterating.
3. **Folder Structure Evolution**:
   * **Start**: `frontend/`, `backend/`, `mobile-frontend/`
   * **Middle**: `frontend/`, `deprecated-backend/`, `mobile-frontend/`, `functions/`
   * **Final**: `web/` (renamed from frontend), `mobile/` (renamed from mobile-frontend), `functions/`, `firebase.json`
4. **Avoid Premature Optimization**:
   * Do not worry about advanced routing algorithms for the live tracking initially. Just get point A to point B drawing on the map. Optimize the map renders only when it starts lagging.
