/**
 * checkPwaAuth.js
 *
 * Task 1.2 — Verify Firebase Auth persistence survives being launched as an
 * installed PWA in standalone display mode on Android Chrome.
 *
 * Usage: import and call once from App.js inside a useEffect to log a clear
 * warning when the app is running as an installed PWA without a valid Auth
 * session.  This helps catch cases where IndexedDB persistence was not set up
 * correctly (e.g. the service worker intercepted the auth page in a way that
 * broke session restoration).
 *
 * No action is taken automatically — the function just returns a structured
 * report so the caller can decide what to do (e.g. show a re‑login prompt).
 */

import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase";

/**
 * Returns true when the app is currently running as an installed PWA in
 * standalone (or fullscreen) display mode, as opposed to a regular browser tab.
 */
export function isRunningAsPwa() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches ||
    // iOS Safari "Add to Home Screen" sets this navigator property
    (navigator.standalone === true)
  );
}

/**
 * Waits for the Firebase Auth state to resolve (one‑shot) and returns a
 * report object:
 *
 *   {
 *     isPwa: boolean,           // true when running as installed PWA
 *     isAuthenticated: boolean, // true when a real (non‑anonymous) user exists
 *     uid: string | null,
 *     warning: string | null,   // human‑readable warning if auth is missing in PWA context
 *   }
 *
 * Resolves within `timeoutMs` ms regardless of Auth state (defaults to 5 s).
 */
export function checkPwaAuthPersistence(timeoutMs = 5000) {
  return new Promise((resolve) => {
    const isPwa = isRunningAsPwa();
    let settled = false;

    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      unsubscribe();
      resolve({
        isPwa,
        isAuthenticated: false,
        uid: null,
        warning: isPwa
          ? "Auth state did not resolve within the timeout while running as an installed PWA. " +
            "The session may not have persisted across launches. Prompt the user to log in again."
          : null,
      });
    }, timeoutMs);

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      unsubscribe();

      const isAuthenticated = !!user && !user.isAnonymous;
      resolve({
        isPwa,
        isAuthenticated,
        uid: user?.uid ?? null,
        warning:
          isPwa && !isAuthenticated
            ? "Running as installed PWA but no authenticated session found. " +
              "Firebase Auth IndexedDB persistence may not have survived the app launch. " +
              "Consider prompting the user to log in again."
            : null,
      });
    });
  });
}
