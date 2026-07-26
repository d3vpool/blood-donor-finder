// src/components/RequestBlood.jsx
import React, { useState, useEffect } from "react";
import { collection, addDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../firebase";
import { toast } from "react-toastify";
import { encodeGeoHash } from "../utils/geoHash";
import { isRealUser } from "../utils/authUser";
import { getCurrentCoordinates, geolocationErrorMessage } from "../utils/geolocation";

const inputClass = "w-full py-3.5 px-4 border border-slate-200 rounded-xl text-sm font-semibold bg-slate-50 text-slate-900 focus:outline-none focus:border-red-500 focus:ring-4 focus:ring-red-500/10 focus:bg-white transition-all duration-200 shadow-sm hover:border-slate-300";
const labelClass = "block text-[10px] uppercase tracking-wider font-extrabold text-slate-400 mb-2";

function RequestBlood({ setIsLoginModalOpen }) {
  const [patientName, setPatientName] = useState("");
  const [bloodType, setBloodType] = useState("");
  const [urgency, setUrgency] = useState("");
  const [hospitalName, setHospitalName] = useState("");
  const [hospitalAddress, setHospitalAddress] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [locationError, setLocationError] = useState("");
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [user, setUser] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(isRealUser(currentUser) ? currentUser : null);
      setLoadingAuth(false);
    });
    return () => unsubscribe();
  }, []);

  const requestLocation = async () => {
    setDetectingLocation(true);
    setLocationError("");
    toast.info("Requesting hospital coordinates...", { position: "top-center" });
    try {
      const { latitude: lat, longitude: lng } = await getCurrentCoordinates();
      setLatitude(Number(lat).toFixed(6));
      setLongitude(Number(lng).toFixed(6));
      toast.success("Hospital coordinates captured!", { position: "top-center" });
    } catch (error) {
      const message = geolocationErrorMessage(error);
      setLocationError(message);
      toast.error(message, { position: "top-center" });
    } finally {
      setDetectingLocation(false);
    }
  };

  const handleRequestSubmit = async (e) => {
    e.preventDefault();
    const latNum = Number(latitude);
    const lngNum = Number(longitude);

    if (!patientName || !bloodType || !urgency || !hospitalName || !hospitalAddress || !contactPhone) {
      toast.warning("Please fill out all required fields.", { position: "top-center" });
      return;
    }
    if (isNaN(latNum) || isNaN(lngNum) || latNum < -90 || latNum > 90 || lngNum < -180 || lngNum > 180) {
      toast.error("Please provide valid coordinates.", { position: "top-center" });
      return;
    }

    setSubmitting(true);
    try {
      const currentUser = auth.currentUser;
      if (!isRealUser(currentUser)) {
        toast.error("Login required to submit request.", { position: "top-center" });
        return;
      }
      await addDoc(collection(db, "BloodRequests"), {
        patientName,
        bloodType,
        urgency,
        hospitalName,
        hospitalAddress,
        location: { latitude: latNum, longitude: lngNum },
        geoHash: encodeGeoHash(latNum, lngNum),
        contactPhone,
        userId: currentUser.uid,
        status: "pending",
        requestedAt: new Date().toISOString(),
        acceptedBy: null,
      });
      toast.success("Emergency Blood Request Submitted!", { position: "top-center" });
      setPatientName(""); setBloodType(""); setUrgency(""); setHospitalName("");
      setHospitalAddress(""); setLatitude(""); setLongitude(""); setContactPhone("");
    } catch (error) {
      console.error("Error creating blood request:", error);
      toast.error("Failed to submit request. Please try again.", { position: "top-center" });
    } finally {
      setSubmitting(false);
    }
  };

  const urgencyColors = { Critical: "text-red-700 bg-red-50 border-red-200", Urgent: "text-amber-700 bg-amber-50 border-amber-200", Standard: "text-blue-700 bg-blue-50 border-blue-200" };

  if (loadingAuth) {
    return (
      <section id="request-blood" className="py-24 bg-slate-50">
        <div className="max-w-2xl mx-auto px-6 text-center">
          <div className="flex flex-col items-center justify-center gap-3">
            <svg className="animate-spin h-8 w-8 text-red-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="text-slate-500 font-bold text-sm">Loading details...</p>
          </div>
        </div>
      </section>
    );
  }

  if (!user) {
    return (
      <section id="request-blood" className="py-24 bg-gradient-to-br from-red-50/70 via-rose-50/20 to-white border-t border-slate-100">
        <div className="max-w-md mx-auto px-6 text-center">
          <div className="bg-white border border-slate-100 rounded-3xl p-8 shadow-[0_15px_40px_rgba(15,23,42,0.06)] hover:shadow-[0_20px_50px_rgba(15,23,42,0.08)] transition-all duration-300">
            <div className="text-5xl mb-4 select-none">🆘</div>
            <h2 className="text-2xl font-extrabold mb-3 text-slate-900 tracking-tight">Request Emergency Blood Support</h2>
            <p className="text-xs md:text-sm text-slate-500 mb-8 leading-relaxed font-medium">
              Need urgent blood donations? Log in to create an active emergency request that alerts donors nearby.
            </p>
            <button
              className="w-full bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white border-none py-4 px-8 rounded-xl font-extrabold text-sm cursor-pointer transition-all duration-200 shadow-md shadow-red-500/10 hover:shadow-lg hover:shadow-red-500/20 hover:scale-[1.02] active:scale-[0.98]"
              onClick={() => { if (typeof setIsLoginModalOpen === "function") setIsLoginModalOpen(true); }}
            >
              LOGIN TO REQUEST
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="request-blood" className="py-24 bg-gradient-to-br from-red-50/50 via-rose-50/10 to-white border-t border-slate-100">
      <div className="max-w-2xl mx-auto px-6">
        {/* Header */}
        <div className="text-center max-w-lg mx-auto mb-12 animate-fade-in">
          <div className="inline-flex items-center gap-1.5 bg-red-50 text-red-700 border border-red-100 text-[10px] font-extrabold px-4 py-1.5 rounded-full mb-4 uppercase tracking-wider select-none shadow-[0_2px_10px_rgba(239,68,68,0.05)]">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span> Urgent Action
          </div>
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-2">Request Emergency Blood Support</h2>
          <p className="text-sm text-slate-500 leading-relaxed font-medium">Submit a request to alert eligible blood donors in your vicinity immediately.</p>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-3xl shadow-[0_15px_40px_rgba(15,23,42,0.04)] p-8 md:p-10 border border-slate-100 hover:shadow-[0_20px_50px_rgba(15,23,42,0.06)] transition-all duration-300">
          <form onSubmit={handleRequestSubmit} className="space-y-6">

            {/* Row 1: Patient Name + Phone */}
            <div className="grid md:grid-cols-2 gap-6">
              <div className="flex flex-col">
                <label htmlFor="patientName" className={labelClass}>Patient Full Name *</label>
                <input type="text" id="patientName" className={inputClass} required placeholder="Enter patient name" value={patientName} onChange={(e) => setPatientName(e.target.value)} />
              </div>
              <div className="flex flex-col">
                <label htmlFor="contactPhone" className={labelClass}>Contact Phone *</label>
                <input type="tel" id="contactPhone" className={inputClass} required placeholder="Enter phone number" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} />
              </div>
            </div>

            {/* Row 2: Blood Type + Urgency */}
            <div className="grid md:grid-cols-2 gap-6">
              <div className="flex flex-col">
                <label htmlFor="reqBloodType" className={labelClass}>Blood Type Needed *</label>
                <div className="relative">
                  <select id="reqBloodType" className={inputClass} required value={bloodType} onChange={(e) => setBloodType(e.target.value)}>
                    <option value="">Select Blood Group</option>
                    {["A+","A-","B+","B-","AB+","AB-","O+","O-"].map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-xs">
                    ▼
                  </div>
                </div>
              </div>
              <div className="flex flex-col">
                <label htmlFor="urgencyLevel" className={labelClass}>Urgency Level *</label>
                <div className="relative">
                  <select id="urgencyLevel" className={`${inputClass} ${urgency ? urgencyColors[urgency] + ' font-bold border' : ''}`} required value={urgency} onChange={(e) => setUrgency(e.target.value)}>
                    <option value="">Select Urgency</option>
                    <option value="Critical">🚨 Critical — Immediate Action</option>
                    <option value="Urgent">⚠️ Urgent — Within 24 Hours</option>
                    <option value="Standard">📅 Standard — Scheduled</option>
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-xs">
                    ▼
                  </div>
                </div>
              </div>
            </div>

            {/* Hospital Name */}
            <div className="flex flex-col">
              <label htmlFor="hospitalName" className={labelClass}>Hospital / Facility Name *</label>
              <input type="text" id="hospitalName" className={inputClass} required placeholder="E.g., City General Hospital" value={hospitalName} onChange={(e) => setHospitalName(e.target.value)} />
            </div>

            {/* Hospital Address */}
            <div className="flex flex-col">
              <label htmlFor="hospitalAddress" className={labelClass}>Hospital Address *</label>
              <textarea id="hospitalAddress" className={`${inputClass} resize-none min-h-[90px]`} rows="2" required placeholder="Enter full hospital address" value={hospitalAddress} onChange={(e) => setHospitalAddress(e.target.value)} />
            </div>

            {/* Coordinates + GPS */}
            <div className="flex flex-col border-t border-slate-100 pt-6">
              <label className={labelClass}>Hospital GPS Coordinates *</label>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <input type="number" step="any" id="lat" className={inputClass} required placeholder="Latitude (e.g. 12.9716)" value={latitude} onChange={(e) => setLatitude(e.target.value)} />
                <input type="number" step="any" id="lng" className={inputClass} required placeholder="Longitude (e.g. 77.5946)" value={longitude} onChange={(e) => setLongitude(e.target.value)} />
              </div>
              <button
                type="button"
                onClick={requestLocation}
                disabled={detectingLocation}
                className={`w-full py-3.5 px-4 rounded-xl border font-bold text-sm transition-all cursor-pointer flex items-center justify-center gap-2 ${detectingLocation ? 'border-slate-200 text-slate-400 bg-slate-50 cursor-not-allowed' : 'border-red-200 bg-white text-red-600 hover:bg-red-50/50 hover:border-red-300 active:scale-[0.99]'}`}
              >
                {detectingLocation ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-5 w-5 text-red-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Detecting Coordinates...
                  </span>
                ) : (
                  "📍 Auto-Detect Hospital Location (GPS)"
                )}
              </button>
              {latitude && longitude && (
                <p className="text-green-600 text-xs font-bold mt-2.5 text-center">✓ Coordinates detected: ({latitude}, {longitude})</p>
              )}
              {locationError && (
                <p className="text-red-500 text-xs font-bold mt-2.5 text-center">⚠️ {locationError}</p>
              )}
              <p className="text-slate-400 text-xs mt-2.5 text-center leading-relaxed font-medium">
                Accurate coordinates ensure the system alerts donors closest to the hospital.
              </p>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-4 bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white font-bold text-sm rounded-xl border-none cursor-pointer transition-all duration-200 shadow-md shadow-red-500/10 hover:shadow-lg hover:shadow-red-500/20 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center"
            >
              {submitting ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Submitting Request...
                </span>
              ) : "🆘 Submit Emergency Request"}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}

export default RequestBlood;
