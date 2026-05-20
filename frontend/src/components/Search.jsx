// src/components/Search.jsx
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
    if (!bloodType) { setError("Select blood type"); return; }
    if (!db) { setError("Internal: Firestore not initialized (check firebase import)."); return; }
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
          setError("Invalid GPS coordinates"); setLoading(false); return;
        }
        setRecipientLocation({ lat: latNum, lng: lngNum });
        try {
          await ensureSignedIn();
          const range = Number(rangeKm);
          if (!Number.isFinite(range) || range < 0) throw new Error("Invalid search radius");
          const queryBounds = getGeohashBounds(latNum, lngNum, range);
          const promises = queryBounds.map((b) => {
            const q = query(collection(db, "Donors"), where("bloodType", "==", bloodType), orderBy("geohash"), startAt(b[0]), endAt(b[1]));
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
              const dLat = data.location?.latitude !== undefined ? Number(data.location.latitude) : data.location?.lat !== undefined ? Number(data.location.lat) : null;
              const dLng = data.location?.longitude !== undefined ? Number(data.location.longitude) : data.location?.lng !== undefined ? Number(data.location.lng) : null;
              if (dLat === null || dLng === null) return;
              const dist = distanceBetween([dLat, dLng], [latNum, lngNum]);
              if (dist <= range) {
                matchingDonors.push({ id: doc.id, fullname: data.fullname ?? data.name ?? "", email: data.email ?? "", phoneNo: data.phoneNo ?? data.contact ?? data.phone ?? "", bloodType: data.bloodType ?? data.bloodGroup ?? "", address: data.address ?? data.city ?? "", location: { latitude: dLat, longitude: dLng }, status: data.status ?? data.availability ?? "", registeredAt: data.registeredAt ?? null, distance: dist });
              }
            });
          });
          matchingDonors.sort((a, b) => a.distance - b.distance);
          setResults(matchingDonors);
          setUserHasSearched(true);
        } catch (err) {
          console.error("Firestore read error:", err);
          setError("Failed to fetch donors from Firestore: " + (err?.message || err?.code || String(err)));
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

  const selectClass = "w-full py-3 px-3 text-[0.95rem] border-2 border-gray-800 rounded-lg bg-white text-gray-900 cursor-pointer transition-all duration-200 focus:outline-none focus:border-brand-red focus:shadow-[0_0_0_3px_rgba(231,76,60,0.25)] appearance-none";

  return (
    <section className="bg-gray-500/50 py-20" id="search">
      <div className="max-w-3xl mx-auto px-6">
        <h2 className="text-center mb-8 text-2xl font-bold">Find Blood Donors</h2>

        <form
          className="bg-white p-4 rounded-xl grid grid-cols-1 gap-5 max-w-xl mx-auto"
          onSubmit={(e) => { e.preventDefault(); handleSearch(); }}
        >
          <div className="flex justify-center gap-12 flex-wrap">
            <div className="flex flex-col items-center text-center w-full max-w-[220px]">
              <label className="text-sm font-semibold mb-1.5 text-gray-700">Blood Type Needed</label>
              <select value={bloodType} onChange={(e) => setBloodType(e.target.value)} className={selectClass}>
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

            <div className="flex flex-col items-center text-center w-full max-w-[220px]">
              <label className="text-sm font-semibold mb-1.5 text-gray-700">Search Radius (km)</label>
              <select value={rangeKm} onChange={(e) => setRangeKm(Number(e.target.value))} className={selectClass}>
                <option value={5}>5 km</option>
                <option value={10}>10 km</option>
                <option value={20}>20 km</option>
                <option value={30}>30 km</option>
              </select>
            </div>
          </div>

          <div className="flex justify-center">
            <button
              type="submit"
              disabled={loading}
              className="bg-gradient-to-br from-[#e74c3c] to-[#c0392b] text-white py-3.5 px-8 border-none rounded-lg text-[0.9rem] font-semibold cursor-pointer transition-all duration-300 shadow-[0_4px_6px_rgba(231,76,60,0.3)] uppercase tracking-wide hover:bg-gradient-to-br hover:from-[#c0392b] hover:to-[#a93226] hover:shadow-[0_6px_12px_rgba(231,76,60,0.4)] hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? "Searching..." : "Search Donors"}
            </button>
          </div>

          {error && <p className="text-red-500 text-center text-sm">{error}</p>}
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
