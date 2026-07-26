const ERROR_MESSAGES = {
  1: "Location permission denied. Allow location for this site in your browser settings, then try again.",
  2: "Location unavailable. Enable location/GPS on your device and try again.",
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

/**
 * Resolve current coordinates with a low-accuracy cached attempt first,
 * then a high-accuracy fallback. Avoids false "denied" UX from timeouts.
 */
export async function getCurrentCoordinates() {
  if (!navigator.geolocation) {
    throw new GeolocationError(0, "Geolocation is not supported by your browser.");
  }

  if (navigator.permissions?.query) {
    try {
      const status = await navigator.permissions.query({ name: "geolocation" });
      if (status.state === "denied") {
        throw new GeolocationError(1, ERROR_MESSAGES[1]);
      }
    } catch (err) {
      if (err instanceof GeolocationError) throw err;
      // permissions.query is unsupported or blocked on some browsers — continue
    }
  }

  const attempts = [
    { enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 },
    { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 },
  ];

  let lastError = null;

  for (const options of attempts) {
    try {
      const position = await getPosition(options);
      const latitude = Number(position.coords.latitude);
      const longitude = Number(position.coords.longitude);

      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        throw new GeolocationError(2, "Invalid GPS coordinates received.");
      }

      return {
        latitude,
        longitude,
        accuracy: position.coords.accuracy,
      };
    } catch (err) {
      lastError = err;
      // Hard deny — do not retry
      if (err?.code === 1) break;
    }
  }

  const code = typeof lastError?.code === "number" ? lastError.code : 2;
  const message =
    ERROR_MESSAGES[code] ||
    lastError?.message ||
    "Failed to get your location. Please try again.";

  throw new GeolocationError(code, message);
}

export function geolocationErrorMessage(err) {
  if (err instanceof GeolocationError) return err.message;
  if (typeof err?.code === "number" && ERROR_MESSAGES[err.code]) {
    return ERROR_MESSAGES[err.code];
  }
  return err?.message || "Failed to get your location. Please try again.";
}
