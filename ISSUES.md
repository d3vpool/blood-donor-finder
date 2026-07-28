LIFELINK


Problems (all resolved):

- ✅ [FIXED] Login/logout button on search - search signed in anonymously; header treated that as logged-in.
  Fixed: Anonymous search auth handling corrected.
- ✅ [FIXED] Browser location permission display - false "User denied Geolocation" messages.
  Fixed: Geolocation helper error mapping corrected.
- ✅ [FIXED] Search/request blood location issues - false "Location permission denied" messages.
  Fixed: Geolocation helper no longer trusts Permissions API alone; GPS-first approach with retries.
