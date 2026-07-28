const ERROR_MESSAGES = {
  1: "Location permission denied. Click the lock/tune icon in the address bar → Site settings → Location → Allow, then try again.",
  2: "Location unavailable. Turn on system Location/GPS (and allow this browser to use it), then try again.",
  3: "Location request timed out. Please try again.",
};

export class GeolocationError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "GeolocationError";
    this.code = code;
  }
}

function getPosition(options) {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, options);
  });
}

async function queryPermissionState() {
  if (!navigator.permissions?.query) return null;
  try {
    const status = await navigator.permissions.query({ name: "geolocation" });
    return status.state; // 'granted' | 'denied' | 'prompt'
  } catch (_) {
    return null;
  }
}

function readCachedLocation() {
  try {
    const raw = localStorage.getItem("recipientLocation");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const latitude = Number(parsed.lat ?? parsed.latitude);
    const longitude = Number(parsed.lng ?? parsed.longitude);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
    return { latitude, longitude, accuracy: null, fromCache: true };
  } catch (_) {
    return null;
  }
}

function persistCachedLocation(latitude, longitude) {
  try {
    localStorage.setItem(
      "recipientLocation",
      JSON.stringify({ lat: latitude, lng: longitude, savedAt: Date.now() })
    );
    localStorage.setItem("geoAllowed", "true");
  } catch (_) {
    /* ignore quota / private mode */
  }
}

function normalizeCoords(position) {
  const latitude = Number(position.coords.latitude);
  const longitude = Number(position.coords.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw new GeolocationError(2, "Invalid GPS coordinates received.");
  }
  return {
    latitude,
    longitude,
    accuracy: position.coords.accuracy,
    fromCache: false,
  };
}

/**
 * Resolve current coordinates.
 *
 * Important: do NOT trust Permissions API alone — on Chromium/Linux it often
 * reports "denied" even when the site is allowed, and awaiting it before
 * getCurrentPosition can drop the user-gesture token needed for the prompt.
 */
export async function getCurrentCoordinates({ allowCacheFallback = true } = {}) {
  if (!navigator.geolocation) {
    throw new GeolocationError(0, "Geolocation is not supported by your browser.");
  }

  if (!window.isSecureContext) {
    throw new GeolocationError(
      1,
      "Location requires a secure context. Open the app via http://localhost:3000 (or HTTPS), not a raw LAN IP over HTTP."
    );
  }

  // Call getCurrentPosition first (keeps user-gesture). Permissions API is
  // consulted only after failures, for better error text.
  const attempts = [
    { enableHighAccuracy: false, timeout: 20000, maximumAge: 300000 },
    { enableHighAccuracy: false, timeout: 20000, maximumAge: 60000 },
    { enableHighAccuracy: true, timeout: 30000, maximumAge: 0 },
  ];

  let lastError = null;

  for (let i = 0; i < attempts.length; i += 1) {
    try {
      const position = await getPosition(attempts[i]);
      const coords = normalizeCoords(position);
      persistCachedLocation(coords.latitude, coords.longitude);
      return coords;
    } catch (err) {
      lastError = err;

      // Chromium sometimes returns PERMISSION_DENIED (1) when location is
      // actually unavailable (OS GPS off). If the site is already allowed,
      // keep retrying instead of hard-stopping.
      if (err?.code === 1) {
        const permissionState = await queryPermissionState();
        if (permissionState === "granted") {
          continue;
        }
        // 'prompt' / 'denied' / unknown — don't burn more attempts after a real deny
        if (permissionState === "denied" || i === attempts.length - 1) {
          break;
        }
      }
    }
  }

  if (allowCacheFallback) {
    const cached = readCachedLocation();
    if (cached) return cached;
  }

  const permissionState = await queryPermissionState();
  const code = typeof lastError?.code === "number" ? lastError.code : 2;

  let message = ERROR_MESSAGES[code] || lastError?.message || "Failed to get your location. Please try again.";

  if (code === 1 && permissionState === "granted") {
    message = "Location unavailable. Turn on system Location/GPS (and allow this browser to use it), then try again.";
  } else if (code === 1 && permissionState === "prompt") {
    message = "Location permission was not completed. When the browser prompt appears, choose Allow (or set Location to Allow in the address-bar site settings), then try again.";
  } else if (code === 2 && permissionState === "granted") {
    message = "Location unavailable. Turn on system Location/GPS (and allow this browser to use it), then try again.";
  } else if (code === 1 && permissionState === "denied" && lastError?.message?.includes("denied")) {
    message = ERROR_MESSAGES[1];
  }

  throw new GeolocationError(code, message);
}

export function geolocationErrorMessage(err) {
  if (err instanceof GeolocationError) return err.message;
  if (typeof err?.code === "number" && ERROR_MESSAGES[err.code]) {
    return ERROR_MESSAGES[err.code];
  }
  return err?.message || "Failed to get your location. Please try again.";
}
