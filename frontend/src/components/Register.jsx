// src/components/Register.jsx
import React, { useState, useEffect, useCallback, useRef } from "react";
import { setDoc, doc, getDoc, updateDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../firebase";
import { registerTokenForUser, removeTokenForUser } from "../firebaseMessaging";
import { toast } from "react-toastify";
import { encodeGeoHash } from "../utils/geoHash";

const inputClass = "w-full py-2.5 px-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-[#e74c3c] focus:ring-2 focus:ring-red-200 transition-all";
const labelClass = "block text-sm font-semibold text-gray-700 mb-1.5";

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
  const lastUidRef = useRef(null);

  const resetDonorForm = useCallback(() => {
    setDonorFullname(initialState.donorFullname); setDonorEmail(initialState.donorEmail); setDonorPhoneNo(initialState.donorPhoneNo);
    setDonorBloodtype(initialState.donorBloodtype); setDonorAddress(initialState.donorAddress); setLocation(initialState.location);
    setLocationError(initialState.locationError); setIsDonor(false);
    try { localStorage.removeItem("geoAllowed"); localStorage.removeItem("recipientLocation"); } catch (_) { }
  }, []);

  async function snooze() {
    const snoozeTime = Date.now() + 30 * 24 * 60 * 60 * 1000; //30days in ms
    await updateDoc(doc(db, "Donors", auth.currentUser.uid), {
      snoozedUntil: snoozeTime
    })
    setSnoozedUntil(snoozeTime);
    toast.success("Snoozed for 30 days", { position: "top-center" })
  }

  async function markAsAvailable() {
    await updateDoc(doc(db, "Donors", auth.currentUser.uid), {
      snoozedUntil: null
    })
    setSnoozedUntil(null);
    toast.success("Marked as available", { position: "top-center" })
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
    if (!navigator.geolocation) { setLocationError("Geolocation is not supported."); toast.error("Geolocation not supported", { position: "top-center" }); return; }
    toast.info("Requesting location permission", { position: "top-center" });
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const latNum = Number(position.coords.latitude); const lngNum = Number(position.coords.longitude);
        if (!Number.isFinite(latNum) || !Number.isFinite(lngNum)) { setLocationError("Invalid coordinates received."); toast.error("Invalid location coordinates", { position: "top-center" }); return; }
        setLocation({ latitude: latNum, longitude: lngNum }); setLocationError("");
        try { localStorage.setItem("geoAllowed", "true"); localStorage.setItem("recipientLocation", JSON.stringify({ lat: latNum, lng: lngNum })); } catch (_) { }
        toast.success("Location access granted!", { position: "top-center" });
      },
      (error) => {
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

  const sectionClass = "py-16 bg-white";
  const containerClass = "max-w-2xl mx-auto px-6 text-center";

  if (loading) return (
    <section id="register" className={sectionClass}><div className={containerClass}><p className="text-gray-500">Loading...</p></div></section>
  );

  if (!user) return (
    <section id="register" className={sectionClass}>
      <div className={containerClass}>
        <h2 className="text-3xl font-bold mb-3">Become a Blood Donor</h2>
        <p className="text-gray-600 mb-6">Want to save lives? Please log in first!</p>
        <button className="bg-[#e74c3c] text-white border-none py-3 px-8 rounded-lg font-semibold cursor-pointer hover:bg-[#c0392b] transition-colors" onClick={() => { if (typeof setIsLoginModalOpen === "function") setIsLoginModalOpen(true); }}>
          LOGIN
        </button>
      </div>
    </section>
  );

  if (isDonor) return (
    <section id="register" className={sectionClass}>
      <div className={containerClass}>
        <div className="bg-white border border-green-100 shadow-sm rounded-2xl p-8 max-w-lg mx-auto relative overflow-hidden">
          
          {/* Status Badge */}
          <div className="absolute top-5 right-5">
            {snoozedUntil && snoozedUntil > Date.now() ? (
              <span className="flex items-center gap-1.5 bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-sm font-semibold border border-gray-200 shadow-sm transition-all" title="You will not receive emergency alerts">
                <span className="text-base">💤</span> Snoozed
              </span>
            ) : (
              <span className="flex items-center gap-1.5 bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-semibold border border-green-200 shadow-sm transition-all" title="You are visible to nearby emergencies">
                <span className="text-base">👁️</span> Available
              </span>
            )}
          </div>

          <div className="text-5xl mb-4 mt-2">💚</div>
          <h2 className="text-3xl font-bold mb-3 text-gray-800">Donor Status</h2>
          <p className="text-green-600 font-semibold text-lg mb-2">You are registered as an active donor!</p>
          <p className="text-gray-600 mb-8">Thank you for being a hero and helping save lives in your community.</p>
          
          <div className="border-t border-gray-100 pt-6">
            <p className="text-sm font-semibold text-gray-700 mb-4">Manage Availability</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button 
                onClick={() => markAsAvailable()}
                className="py-2.5 px-5 bg-green-50 text-green-700 font-semibold rounded-lg hover:bg-green-100 transition-colors border border-green-200"
              >
                ✓ Active (Available)
              </button>
              <button 
                onClick={() => snooze()}
                className="py-2.5 px-5 bg-gray-50 text-gray-600 font-semibold rounded-lg hover:bg-gray-100 transition-colors border border-gray-200"
              >
                💤 Snooze 30 Days
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );

  return (
    <section id="register" className={sectionClass}>
      <div className="max-w-2xl mx-auto px-6">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold mb-2">Become a Blood Donor</h2>
          <p className="text-gray-600">Join our community of heroes and help save lives</p>
        </div>
        <form id="donorRegistrationForm" onSubmit={handleDonorRegistration} className="bg-gray-50 rounded-2xl p-8 space-y-5 shadow-sm">
          <div className="grid md:grid-cols-2 gap-5">
            <div>
              <label htmlFor="fullName" className={labelClass}>Full Name*</label>
              <input type="text" id="fullName" name="fullname" className={inputClass} required value={donorFullname} onChange={(e) => setDonorFullname(e.target.value)} />
            </div>
            <div>
              <label htmlFor="email" className={labelClass}>Email Address*</label>
              <input type="email" id="email" name="email" className={`${inputClass} bg-gray-100 cursor-not-allowed`} required value={donorEmail} onChange={(e) => setDonorEmail(e.target.value)} readOnly />
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-5">
            <div>
              <label htmlFor="phone" className={labelClass}>Phone Number*</label>
              <input type="tel" id="phone" name="phone" className={inputClass} required value={donorPhoneNo} onChange={(e) => setDonorPhoneNo(e.target.value)} />
            </div>
            <div>
              <label htmlFor="donorBloodType" className={labelClass}>Blood Type*</label>
              <select id="donorBloodType" className={inputClass} required value={donorBloodtype} onChange={(e) => setDonorBloodtype(e.target.value)}>
                <option value="">Select Blood Group</option>
                {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label htmlFor="address" className={labelClass}>Address*</label>
            <textarea id="address" className={inputClass} rows="3" required value={donorAddress} onChange={(e) => setDonorAddress(e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>Location Access*</label>
            <button type="button" onClick={requestLocation} className={`w-full py-2.5 px-4 rounded-lg font-semibold border-2 transition-all cursor-pointer ${location ? 'border-green-500 bg-green-50 text-green-700' : 'border-[#e74c3c] bg-white text-[#e74c3c] hover:bg-[#e74c3c] hover:text-white'}`}>
              {location ? "✓ Location Granted Successfully" : "Allow Location Access"}
            </button>
            {location && <p className="text-green-600 text-sm mt-1.5">✓ Location captured successfully</p>}
            {locationError && <p className="text-red-500 text-sm mt-1.5">⚠ {locationError}</p>}
            <p className="text-gray-500 text-xs mt-2">We need your location to connect you with nearby recipients.</p>
          </div>
          <div className="space-y-2">
            {[
              { id: "medicalEligible", label: "I confirm that I am medically eligible to donate blood." },
              { id: "agreeTerms", label: "I agree to the terms and conditions." },
              { id: "agreePolicy", label: "I agree to the privacy policy." },
            ].map(({ id, label }) => (
              <label key={id} htmlFor={id} className="flex items-start gap-2.5 text-sm text-gray-700 cursor-pointer">
                <input type="checkbox" id={id} required className="mt-0.5 accent-[#e74c3c]" />
                {label}
              </label>
            ))}
          </div>
          <button type="submit" className="w-full py-3.5 bg-gradient-to-r from-[#e74c3c] to-[#c0392b] text-white font-bold rounded-lg border-none cursor-pointer hover:from-[#c0392b] hover:to-[#a93226] transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5">
            Register as Donor
          </button>
        </form>
      </div>
    </section>
  );
}

export default Register;
