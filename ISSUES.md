LIFELINK


Problems (all resolved):

- ✅ [FIXED] Login/logout button on search - search signed in anonymously; header treated that as logged-in.
  Fixed: Anonymous search auth handling corrected.
- ✅ [FIXED] Browser location permission display - false "User denied Geolocation" messages.
  Fixed: Geolocation helper error mapping corrected.
- ✅ [FIXED] Search/request blood location issues - false "Location permission denied" messages.
  Fixed: Geolocation helper no longer trusts Permissions API alone; GPS-first approach with retries.

- a login session of 1 day is needed. the user should not be logged out after the page is refreshed
  Fixed: Explicit `browserLocalPersistence` set on Firebase Auth so the session survives page refreshes and PWA relaunches.

- when I am searching for a donor in a given radius then I should be able to send individual request to the available donors.
  Fixed: Added "Send Blood Request" on each donor card (`DirectRequestModal`), creating a targeted `BloodRequests` doc (`targetDonorId`); only that donor is matched/notified (backend + DonorInbox updated).

- when a donor has accepted a blood request of some recipient then both the donor and the recipient should be notified about the acceptance and the donor should be able to see the location of the recipient in the map and the recipient should be able to see the location of the donor in the map. and the donor should be able to see the contact information of the recipient and the recipient should be able to see the contact information of the donor. and the donor should be able to see the estimated time of arrival of the donor to the recipient and the recipient should be able to see the estimated time of arrival of the donor to the recipient. and when a request is accepted no other donors should be able to accept the request again, unless its cancelled, and donors should be able to cancel a request even after accepting it.
  Fixed: Both parties get FCM on accept; recipient and donor each see the other on the live map; donor phone/email now stored on accept (`acceptedByPhone/Email`) and shown to the recipient; ETA + distance shown in the live map; accept stays race-safe (one winner); accepted donors can cancel (`cancelAcceptedBloodRequest`) which reopens the request to pending so others can accept again.

- the available donors cards should also have a distant icon telling how far this specific donor is from the recipient.
  Fixed: Distance badge (navigation icon + "X.X km from you") added to every donor card and to the donor map popup.

- when a blood request is accepted the recipient should should the live location of the donor in map. And the map view window should be larger and prominent.May be move it to the top of the webpage.
  Fixed: New `LiveTrackingSection` renders a large, prominent live-tracking map at the top of the page (right under the header) for any accepted request, including donor contact and ETA.

- when a blood request arrive at the donor side the donor webpage should show a popup that a new blood request has arrived.
  Fixed: `DonorRequestAlert` popup appears when a new matched/targeted request arrives (new-arrival detection on the pending-request snapshot; first load stays silent, stale alerts are pruned). "View Request" scrolls to the donor inbox.