// src/components/Search.jsx
import "./Search.css";
import React, { useState } from "react";
import PropTypes from "prop-types";
import { collection, getDocs, query, where, orderBy, startAt, endAt } from "firebase/firestore";
import { db, auth } from "../firebase";
import { signInAnonymously } from "firebase/auth";
import { geohashQueryBounds, distanceBetween } from "geofire-common";

export default function Search({ setResults, setRecipientLocation, setUserHasSearched }) {
  const [bloodType, setBloodType] = useState("");
  const [rangeKm, setRangeKm] = useState(5);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);



  const getGeohashBounds = (lat, long, radiusKm) => {
    const center = [lat, long];
    const radiusInMeters = radiusKm * 1000;
    return geohashQueryBounds(center, radiusInMeters);
  };

  // Ensures the client is authenticated (anonymous if needed).
  const ensureSignedIn = async () => {
    if (!auth) throw new Error("Auth instance not available (check firebase import).");
    if (auth.currentUser) return auth.currentUser;
    try {
      const cred = await signInAnonymously(auth);
      return cred.user;
    } catch (err) {
      console.error("Anonymous sign-in failed:", err);
      throw err;
    }
  };

  const handleSearch = async () => {
    setError(null);

    if (!bloodType) {
      setError("Select blood type");
      return;
    }

    if (!db) {
      setError("Internal: Firestore not initialized (check firebase import).");
      return;
    }

    setLoading(true);

    if (!navigator.geolocation) {
      setError("Geolocation not supported by your browser");
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const latNum = Number(pos.coords.latitude);
        const lngNum = Number(pos.coords.longitude);

        if (!Number.isFinite(latNum) || !Number.isFinite(lngNum)) {
          setError("Invalid GPS coordinates");
          setLoading(false);
          return;
        }

        setRecipientLocation({ lat: latNum, lng: lngNum });

        try {
          // Ensure authenticated (matches your Firestore rules which require request.auth != null)
          await ensureSignedIn();

          const range = Number(rangeKm);
          if (!Number.isFinite(range) || range < 0) throw new Error("Invalid search radius");

          const queryBounds = getGeohashBounds(latNum, lngNum, range);

          const promises = queryBounds.map((b) => {
            const q = query(
              collection(db, "Donors"),
              where("bloodType", "==", bloodType),
              orderBy("geohash"),
              startAt(b[0]),
              endAt(b[1])
            );
            return getDocs(q);
          });

          const snapshots = await Promise.all(promises);

          const matchingDonors = [];
          const seenIds = new Set();

          snapshots.forEach((snap) => {
            snap.forEach((doc) => {
              if (seenIds.has(doc.id)) return;
              seenIds.add(doc.id);

              const data = doc.data() || {};
              const dLat =
                data.location?.latitude !== undefined
                  ? Number(data.location.latitude)
                  : data.location?.lat !== undefined
                    ? Number(data.location.lat)
                    : null;
              const dLng =
                data.location?.longitude !== undefined
                  ? Number(data.location.longitude)
                  : data.location?.lng !== undefined
                    ? Number(data.location.lng)
                    : null;

              if (dLat === null || dLng === null) return;

              // Calculate exact distance using geofire's distanceBetween
              const dist = distanceBetween([dLat, dLng], [latNum, lngNum]);
              if (dist <= range) {
                matchingDonors.push({
                  id: doc.id,
                  fullname: data.fullname ?? data.name ?? "",
                  email: data.email ?? "",
                  phoneNo: data.phoneNo ?? data.contact ?? data.phone ?? "",
                  bloodType: data.bloodType ?? data.bloodGroup ?? "",
                  address: data.address ?? data.city ?? "",
                  location: {
                    latitude: dLat,
                    longitude: dLng,
                  },
                  status: data.status ?? data.availability ?? "",
                  registeredAt: data.registeredAt ?? null,
                  distance: dist,
                });
              }
            });
          });

          // Sort by distance (closest first)
          matchingDonors.sort((a, b) => a.distance - b.distance);

          setResults(matchingDonors);
          setUserHasSearched(true);
        } catch (err) {
          console.error("Firestore read error:", err);
          const msg = err?.message || err?.code || String(err);
          setError("Failed to fetch donors from Firestore: " + msg);
        } finally {
          setLoading(false);
        }
      },
      (err) => {
        console.error("Geolocation error:", err);
        setError("Location permission denied or unavailable");
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  return (
    <section className="search-section" id="search">
      <div className="container">
        <h2 className="title">Find Blood Donors</h2>

        <form
          className="search-form"
          onSubmit={(e) => {
            e.preventDefault();
            handleSearch();
          }}
        >
          <div className="controls">
            <div className="form-group">
              <label>Blood Type Needed</label>
              <select value={bloodType} onChange={(e) => setBloodType(e.target.value)}>
                <option value="">Select Blood Group</option>
                <option value="A+">A+</option>
                <option value="A-">A-</option>
                <option value="B+">B+</option>
                <option value="B-">B-</option>
                <option value="AB+">AB+</option>
                <option value="AB-">AB-</option>
                <option value="O+">O+</option>
                <option value="O-">O-</option>
              </select>
            </div>

            <div className="form-group">
              <label>Search Radius (km)</label>
              <select value={rangeKm} onChange={(e) => setRangeKm(Number(e.target.value))}>
                <option value={5}>5 km</option>
                <option value={10}>10 km</option>
                <option value={20}>20 km</option>
                <option value={30}>30 km</option>
              </select>
            </div>
          </div>

          <div className="form-group-full">
            <button className="search-section-button" type="submit" disabled={loading}>
              {loading ? "Searching..." : "Search Donors"}
            </button>
          </div>

          {error && <p className="error-text">{error}</p>}
        </form>
      </div>
    </section>
  );
}

Search.propTypes = {
  setResults: PropTypes.func.isRequired,
  setRecipientLocation: PropTypes.func.isRequired,
  setUserHasSearched: PropTypes.func.isRequired,
};
