// src/components/Register.jsx
import React, { useState, useEffect, useCallback, useRef } from "react";
import { setDoc, doc, getDoc, updateDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../firebase";
import { registerTokenForUser, removeTokenForUser } from "../firebaseMessaging";
import { toast } from "react-toastify";
import { encodeGeoHash } from "../utils/geoHash";

const inputClass = "w-full py-3.5 px-4 border border-slate-200 rounded-xl text-sm font-semibold bg-slate-50 text-slate-900 focus:outline-none focus:border-red-500 focus:ring-4 focus:ring-red-500/10 focus:bg-white transition-all duration-200 shadow-sm hover:border-slate-300";
const labelClass = "block text-[10px] uppercase tracking-wider font-extrabold text-slate-400 mb-2";

function Register({ setIsLoginModalOpen }) {
  const initialState = { donorFullname: "", donorEmail: "", donorPhoneNo: "", donorBloodtype: "", donorAddress: "", location: null, locationError: "" };

  const [donorFullname, setDonorFullname] = useState(initialState.donorFullname);
  const [donorEmail, setDonorEmail] = useState(initialState.donorEmail);
  const [donorPhoneNo, setDonorPhoneNo] = useState(initialState.donorPhoneNo);
  const [donorBloodtype, setDonorBloodtype] = useState(initialState.donorBloodtype);
  const [donorAddress, setDonorAddress] = useState(initialState.donorAddress);
  const [location, setLocation] = useState(initialState.location);
  const [locationError, setLocationError] = useState(initialState.locationError);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isDonor, setIsDonor] = useState(false);
  const [snoozedUntil, setSnoozedUntil] = useState(null);
  const [fetchingLocation, setFetchingLocation] = useState(false);
  const lastUidRef = useRef(null);

  const resetDonorForm = useCallback(() => {
    setDonorFullname(initialState.donorFullname); setDonorEmail(initialState.donorEmail); setDonorPhoneNo(initialState.donorPhoneNo);
    setDonorBloodtype(initialState.donorBloodtype); setDonorAddress(initialState.donorAddress); setLocation(initialState.location);
    setLocationError(initialState.locationError); setIsDonor(false);
    try { localStorage.removeItem("geoAllowed"); localStorage.removeItem("recipientLocation"); } catch (_) { }
  }, []);

  async function snooze() {
    try {
      const snoozeTime = Date.now() + 30 * 24 * 60 * 60 * 1000; //30days in ms
      await updateDoc(doc(db, "Donors", auth.currentUser.uid), {
        snoozedUntil: snoozeTime
      });
      setSnoozedUntil(snoozeTime);
      toast.success("Snoozed for 30 days", { position: "top-center" });
    } catch (e) {
      toast.error("Failed to update status.");
    }
  }

  async function markAsAvailable() {
    try {
      await updateDoc(doc(db, "Donors", auth.currentUser.uid), {
        snoozedUntil: null
      });
      setSnoozedUntil(null);
      toast.success("Marked as available", { position: "top-center" });
    } catch (e) {
      toast.error("Failed to update status.");
    }
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser && lastUidRef.current) {
        try { await removeTokenForUser(lastUidRef.current); } catch (e) { console.warn("Failed removing token", e); }
        resetDonorForm(); lastUidRef.current = null;
      }
      setUser(currentUser); setLoading(false);
      if (currentUser) {
        lastUidRef.current = currentUser.uid; setDonorEmail(currentUser.email || "");
        try { const d = await getDoc(doc(db, "Users", currentUser.uid)); if (d.exists()) setDonorFullname(d.data().fullname || ""); } catch (e) { console.warn("Failed to read Users doc:", e); }
        try { 
          const d = await getDoc(doc(db, "Donors", currentUser.uid)); 
          if (d.exists()) {
            setIsDonor(true);
            setSnoozedUntil(d.data().snoozedUntil || null);
          } else {
            setIsDonor(false);
          }
        } catch (e) { console.warn("Failed to read Donors doc:", e); setIsDonor(false); }
      }
    });
    return () => unsubscribe();
  }, [resetDonorForm]);

  const requestLocation = () => {
    if (!navigator.geolocation) { 
      setLocationError("Geolocation is not supported."); 
      toast.error("Geolocation not supported", { position: "top-center" }); 
      return; 
    }
    setFetchingLocation(true);
    setLocationError("");
    toast.info("Requesting location permission...", { position: "top-center", autoClose: 2000 });
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const latNum = Number(position.coords.latitude); const lngNum = Number(position.coords.longitude);
        setFetchingLocation(false);
        if (!Number.isFinite(latNum) || !Number.isFinite(lngNum)) { 
          setLocationError("Invalid coordinates received."); 
          toast.error("Invalid location coordinates", { position: "top-center" }); 
          return; 
        }
        setLocation({ latitude: latNum, longitude: lngNum });
        try { localStorage.setItem("geoAllowed", "true"); localStorage.setItem("recipientLocation", JSON.stringify({ lat: latNum, lng: lngNum })); } catch (_) { }
        toast.success("Location access granted!", { position: "top-center" });
      },
      (error) => {
        setFetchingLocation(false);
        setLocationError(error.message || "Location error");
        const msgs = { [error.PERMISSION_DENIED]: "Location permission denied.", [error.POSITION_UNAVAILABLE]: "Location information unavailable.", [error.TIMEOUT]: "Location request timed out." };
        toast.error(msgs[error.code] || "An error occurred while getting location.", { position: "top-center" });
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleDonorRegistration = async (e) => {
    e.preventDefault();
    if (!location) { toast.warning("Please allow location access first.", { position: "top-center" }); requestLocation(); return; }
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) { toast.error("Login required.", { position: "top-center" }); return; }
      const donorDocRef = doc(db, "Donors", currentUser.uid);
      if ((await getDoc(donorDocRef)).exists()) { toast.warning("Already registered as a donor.", { position: "top-center" }); setIsDonor(true); return; }
      await setDoc(donorDocRef, { fullname: donorFullname || "", email: currentUser.email || "", phoneNo: donorPhoneNo || "", bloodType: donorBloodtype || "", address: donorAddress || "", location: { latitude: Number(location.latitude), longitude: Number(location.longitude) }, geoHash: encodeGeoHash(Number(location.latitude), Number(location.longitude)), registeredAt: new Date().toISOString() });
      toast.success("Donor Registered Successfully!", { position: "top-center" }); setIsDonor(true);
      try { await registerTokenForUser(currentUser.uid); toast.info("Notification token saved.", { position: "top-center" }); } catch (tokenErr) { console.warn("Failed to register FCM token:", tokenErr); }
      try { if (typeof setIsLoginModalOpen === "function") setIsLoginModalOpen(false); } catch (_) { }
    } catch (error) { console.error("Registration error:", error); toast.error("Failed to register as donor. Try again.", { position: "top-center" }); }
  };

  const sectionClass = "py-24 bg-slate-50 border-b border-slate-100";
  const containerClass = "max-w-2xl mx-auto px-6 text-center";

  if (loading) return (
    <section id="register" className={sectionClass}>
      <div className={containerClass}>
        <div className="flex flex-col items-center justify-center gap-3">
          <svg className="animate-spin h-8 w-8 text-red-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-slate-500 font-bold text-sm">Loading status...</p>
        </div>
      </div>
    </section>
  );

  if (!user) return (
    <section id="register" className={sectionClass}>
      <div className="max-w-md mx-auto px-6 text-center">
        <div className="bg-white border border-slate-100 rounded-3xl p-8 shadow-[0_15px_40px_rgba(15,23,42,0.06)] hover:shadow-[0_20px_50px_rgba(15,23,42,0.08)] transition-all duration-300">
          <div className="text-4xl mb-4 select-none">🩸</div>
          <h2 className="text-2xl font-extrabold text-slate-900 mb-3 tracking-tight">Become a Blood Donor</h2>
          <p className="text-xs md:text-sm text-slate-500 mb-8 leading-relaxed font-medium">Join our local community of heroes. Help save lives by receiving notifications when someone nearby requires your blood group.</p>
          <button className="w-full bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white border-none py-4 px-8 rounded-xl font-extrabold cursor-pointer transition-all shadow-md shadow-red-500/10 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]" onClick={() => { if (typeof setIsLoginModalOpen === "function") setIsLoginModalOpen(true); }}>
            LOGIN TO GET STARTED
          </button>
        </div>
      </div>
    </section>
  );

  if (isDonor) {
    const isSnoozedActive = snoozedUntil && snoozedUntil > Date.now();
    return (
      <section id="register" className={sectionClass}>
        <div className="max-w-md mx-auto px-6">
          <div className="bg-white border border-slate-100 shadow-[0_15px_40px_rgba(15,23,42,0.06)] rounded-3xl p-8 md:p-10 text-center relative overflow-hidden hover:shadow-[0_20px_50px_rgba(15,23,42,0.08)] transition-all duration-300">
            
            {/* Status Badge */}
            <div className="absolute top-5 right-5">
              {isSnoozedActive ? (
                <span className="flex items-center gap-1.5 bg-slate-100 text-slate-700 px-3 py-1 rounded-full text-xs font-bold border border-slate-200 shadow-sm" title="You will not receive emergency alerts">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span> Snoozed
                </span>
              ) : (
                <span className="flex items-center gap-1.5 bg-green-50 text-green-700 px-3 py-1 rounded-full text-xs font-extrabold border border-green-200 shadow-sm" title="You are visible to nearby emergencies">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span> Active
                </span>
              )}
            </div>

            <div className="text-5xl mb-4 mt-4 select-none">❤️</div>
            <h2 className="text-2xl font-extrabold text-slate-900 mb-2 tracking-tight">Donor Dashboard</h2>
            <p className="text-red-500 font-extrabold text-sm mb-4">You are registered as a life-saving donor!</p>
            <p className="text-xs text-slate-500 mb-8 leading-relaxed font-medium">Thank you for being part of our matching network. Keep your status active to receive notifications of local emergencies.</p>
            
            <div className="border-t border-slate-100 pt-6">
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-4">Manage Availability</p>
              <div className="flex flex-col gap-2.5">
                <button 
                  onClick={markAsAvailable}
                  className={`py-3.5 px-5 font-bold rounded-xl transition-all border text-sm w-full cursor-pointer flex items-center justify-center gap-2 ${!isSnoozedActive ? 'bg-green-600 border-green-600 text-white shadow-md shadow-green-500/10 hover:bg-green-700' : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'}`}
                >
                  ✓ Active (Available)
                </button>
                <button 
                  onClick={snooze}
                  className={`py-3.5 px-5 font-bold rounded-xl transition-all border text-sm w-full cursor-pointer flex items-center justify-center gap-2 ${isSnoozedActive ? 'bg-slate-800 border-slate-800 text-white shadow-md shadow-slate-800/10 hover:bg-slate-900' : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'}`}
                >
                  💤 Snooze 30 Days
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="register" className={sectionClass}>
      <div className="max-w-2xl mx-auto px-6">
        <div className="text-center max-w-lg mx-auto mb-12">
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-2">Become a Blood Donor</h2>
          <p className="text-sm text-slate-500 leading-relaxed font-medium">Join our network of community responders. Fill out the details below to register.</p>
        </div>
        
        <form id="donorRegistrationForm" onSubmit={handleDonorRegistration} className="bg-white rounded-3xl border border-slate-100 p-8 md:p-10 space-y-6 shadow-[0_15px_40px_rgba(15,23,42,0.04)] hover:shadow-[0_20px_50px_rgba(15,23,42,0.06)] transition-all duration-300">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="flex flex-col">
              <label htmlFor="fullName" className={labelClass}>Full Name*</label>
              <input type="text" id="fullName" name="fullname" className={inputClass} required value={donorFullname} onChange={(e) => setDonorFullname(e.target.value)} />
            </div>
            <div className="flex flex-col">
              <label htmlFor="email" className={labelClass}>Email Address*</label>
              <input type="email" id="email" name="email" className={`${inputClass} bg-slate-100/80 cursor-not-allowed`} required value={donorEmail} onChange={(e) => setDonorEmail(e.target.value)} readOnly />
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="flex flex-col">
              <label htmlFor="phone" className={labelClass}>Phone Number*</label>
              <input type="tel" id="phone" name="phone" className={inputClass} required value={donorPhoneNo} onChange={(e) => setDonorPhoneNo(e.target.value)} />
            </div>
            <div className="flex flex-col">
              <label htmlFor="donorBloodType" className={labelClass}>Blood Type*</label>
              <div className="relative">
                <select id="donorBloodType" className={inputClass} required value={donorBloodtype} onChange={(e) => setDonorBloodtype(e.target.value)}>
                  <option value="">Select Blood Group</option>
                  {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-xs">
                  ▼
                </div>
              </div>
            </div>
          </div>
          <div className="flex flex-col">
            <label htmlFor="address" className={labelClass}>Address*</label>
            <textarea id="address" className={`${inputClass} resize-none min-h-[90px]`} rows="3" required value={donorAddress} onChange={(e) => setDonorAddress(e.target.value)} />
          </div>
          
          <div className="flex flex-col border-t border-slate-100 pt-6">
            <label className={labelClass}>Location Access*</label>
            <button 
              type="button" 
              onClick={requestLocation} 
              disabled={fetchingLocation}
              className={`w-full py-3.5 px-4 rounded-xl font-bold border transition-all cursor-pointer flex items-center justify-center gap-2 ${location ? 'border-green-200 bg-green-50/70 text-green-700 shadow-sm' : 'border-red-200 bg-white text-red-600 hover:bg-red-50/50 hover:border-red-300 active:scale-[0.99]'}`}
            >
              {fetchingLocation ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-5 w-5 text-red-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Requesting location...
                </span>
              ) : location ? (
                "✓ Location Captured Successfully"
              ) : (
                "Allow Location Access"
              )}
            </button>
            {location && <p className="text-green-600 font-extrabold text-[10px] mt-2.5 text-center">✓ LATITUDE: {location.latitude.toFixed(6)} | LONGITUDE: {location.longitude.toFixed(6)}</p>}
            {locationError && <p className="text-red-500 font-bold text-xs mt-2.5 text-center">⚠️ {locationError}</p>}
            <p className="text-slate-400 text-xs mt-2.5 text-center leading-relaxed font-medium">We require your coordinate location to compute geohash matching during emergencies.</p>
          </div>
          
          <div className="space-y-3 bg-slate-50 p-4 border border-slate-100 rounded-2xl">
            {[
              { id: "medicalEligible", label: "I confirm that I am medically eligible to donate blood." },
              { id: "agreeTerms", label: "I agree to the terms and conditions." },
              { id: "agreePolicy", label: "I agree to the privacy policy." },
            ].map(({ id, label }) => (
              <label key={id} htmlFor={id} className="flex items-start gap-3 text-xs md:text-sm text-slate-600 font-bold cursor-pointer select-none">
                <input type="checkbox" id={id} required className="mt-0.5 h-4 w-4 rounded border-slate-200 text-red-500 focus:ring-red-500 accent-red-500" />
                <span>{label}</span>
              </label>
            ))}
          </div>
          
          <button type="submit" className="w-full py-4 bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white font-extrabold rounded-xl border-none cursor-pointer transition-all duration-200 shadow-md shadow-red-500/10 hover:shadow-lg hover:shadow-red-500/20 hover:scale-[1.01] active:scale-[0.99]">
            Register as Donor
          </button>
        </form>
      </div>
    </section>
  );
}

export default Register;
