// Compute the GeoHash for a lat/lng point using standard Base32 encoding
const BASE32 = "0123456789bcdefghjkmnpqrstuvwxyz";

export function encodeGeoHash(latitude, longitude, precision = 9) {
  const lat = Number(latitude);
  const lng = Number(longitude);
  
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    console.error("Invalid coordinates passed to encodeGeoHash:", latitude, longitude);
    return "";
  }

  let minLat = -90, maxLat = 90;
  let minLng = -180, maxLng = 180;
  let geohash = "";
  let isEven = true;
  let bit = 0;
  let ch = 0;

  while (geohash.length < precision) {
    if (isEven) {
      const mid = (minLng + maxLng) / 2;
      if (lng > mid) {
        ch |= (1 << (4 - bit));
        minLng = mid;
      } else {
        maxLng = mid;
      }
    } else {
      const mid = (minLat + maxLat) / 2;
      if (lat > mid) {
        ch |= (1 << (4 - bit));
        minLat = mid;
      } else {
        maxLat = mid;
      }
    }

    isEven = !isEven;
    if (bit < 4) {
      bit++;
    } else {
      geohash += BASE32[ch];
      bit = 0;
      ch = 0;
    }
  }

  return geohash;
}
