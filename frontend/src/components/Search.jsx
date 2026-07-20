// src/components/Search.jsx
import React, { useState } from "react";
import PropTypes from "prop-types";
import { collection, getDocs, query, where, orderBy, startAt, endAt } from "firebase/firestore";
import { db, auth } from "../firebase";
import { signInAnonymously } from "firebase/auth";
import { geohashQueryBounds, distanceBetween } from "geofire-common";

export default function Search({ setResults, setRecipientLocation, setUserHasSearched, setIsSearching }) {
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
    if (!bloodType) { setError("Please select a blood type to search."); return; }
    if (!db) { setError("Firestore is not initialized."); return; }
    
    setLoading(true);
    if (setIsSearching) setIsSearching(true);
    
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser");
      setLoading(false);
      if (setIsSearching) setIsSearching(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const latNum = Number(pos.coords.latitude);
        const lngNum = Number(pos.coords.longitude);
        if (!Number.isFinite(latNum) || !Number.isFinite(lngNum)) {
          setError("Invalid GPS coordinates received."); 
          setLoading(false); 
          if (setIsSearching) setIsSearching(false);
          return;
        }
        setRecipientLocation({ lat: latNum, lng: lngNum });
        try {
          await ensureSignedIn();
          const range = Number(rangeKm);
          if (!Number.isFinite(range) || range < 0) throw new Error("Invalid search radius");
          const queryBounds = getGeohashBounds(latNum, lngNum, range);
          const promises = queryBounds.map((b) => {
            const q = query(collection(db, "Donors"), where("bloodType", "==", bloodType), orderBy("geoHash"), startAt(b[0]), endAt(b[1]));
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
          setError("Failed to fetch donors: " + (err?.message || err?.code || String(err)));
        } finally {
          setLoading(false);
          if (setIsSearching) setIsSearching(false);
        }
      },
      (err) => {
        console.error("Geolocation error:", err);
        setError("Location permission denied. Please enable GPS and try again.");
        setLoading(false);
        if (setIsSearching) setIsSearching(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const selectClass = "w-full py-3.5 px-4 text-sm border border-slate-200 rounded-xl bg-slate-50 text-slate-900 cursor-pointer transition-all duration-200 focus:outline-none focus:border-red-500 focus:ring-4 focus:ring-red-500/10 focus:bg-white font-semibold appearance-none shadow-sm hover:border-slate-300";

  return (
    <section className="bg-slate-50 py-24 border-b border-slate-100" id="search">
      <div className="max-w-3xl mx-auto px-6">
        <div className="text-center max-w-lg mx-auto mb-12">
          <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight mb-3">Find Blood Donors</h2>
          <p className="text-sm text-slate-500 leading-relaxed font-medium">Enter your required blood type and search radius. We will search nearby active donors in real-time.</p>
        </div>

        <form
          className="bg-white p-8 md:p-10 rounded-3xl border border-slate-100 shadow-[0_15px_40px_rgba(15,23,42,0.06)] grid grid-cols-1 gap-6 max-w-xl mx-auto hover:shadow-[0_20px_50px_rgba(15,23,42,0.08)] transition-all duration-300"
          onSubmit={(e) => { e.preventDefault(); handleSearch(); }}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col">
              <label className="text-[10px] uppercase tracking-wider font-extrabold mb-2 text-slate-400">Blood Type Needed</label>
              <div className="relative">
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
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-xs">
                  ▼
                </div>
              </div>
            </div>

            <div className="flex flex-col">
              <label className="text-[10px] uppercase tracking-wider font-extrabold mb-2 text-slate-400">Search Radius (km)</label>
              <div className="relative">
                <select value={rangeKm} onChange={(e) => setRangeKm(Number(e.target.value))} className={selectClass}>
                  <option value={5}>5 km</option>
                  <option value={10}>10 km</option>
                  <option value={15}>15 km</option>
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-xs">
                  ▼
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-center pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white py-4 px-8 border-none rounded-xl text-sm font-extrabold cursor-pointer transition-all duration-200 shadow-lg shadow-red-500/10 hover:shadow-xl hover:shadow-red-500/25 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Searching Donors...
                </span>
              ) : "Search Donors"}
            </button>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-xs py-3 px-4 rounded-xl text-center font-bold animate-fade-in">
              ⚠️ {error}
            </div>
          )}
        </form>
      </div>
    </section>
  );
}

Search.propTypes = {
  setResults: PropTypes.func.isRequired,
  setRecipientLocation: PropTypes.func.isRequired,
  setUserHasSearched: PropTypes.func.isRequired,
  setIsSearching: PropTypes.func,
};
