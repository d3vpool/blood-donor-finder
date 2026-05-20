// src/components/RequestBlood.jsx
import React, { useState, useEffect } from "react";
import { collection, addDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../firebase";
import { toast } from "react-toastify";
import { encodeGeoHash } from "../utils/geoHash";

const inputClass =
  "w-full py-2.5 px-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-200 transition-all bg-white";
const labelClass = "block text-sm font-semibold text-gray-700 mb-1.5";

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
      setUser(currentUser);
      setLoadingAuth(false);
    });
    return () => unsubscribe();
  }, []);

  const requestLocation = () => {
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser.");
      toast.error("Geolocation not supported", { position: "top-center" });
      return;
    }
    setDetectingLocation(true);
    setLocationError("");
    toast.info("Requesting hospital coordinates...", { position: "top-center" });
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude: lat, longitude: lng } = position.coords;
        setLatitude(Number(lat).toFixed(6));
        setLongitude(Number(lng).toFixed(6));
        setDetectingLocation(false);
        toast.success("Hospital coordinates captured!", { position: "top-center" });
      },
      (error) => {
        setDetectingLocation(false);
        setLocationError(error.message || "Location error");
        toast.error("Failed to detect location. Enter manually.", { position: "top-center" });
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
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
      if (!currentUser) {
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

  const urgencyColors = { Critical: "text-red-600", Urgent: "text-orange-500", Standard: "text-blue-500" };

  if (loadingAuth) {
    return (
      <section id="request-blood" className="py-16 bg-red-50/60">
        <div className="max-w-2xl mx-auto px-6 text-center">
          <p className="text-gray-500 animate-pulse">Loading...</p>
        </div>
      </section>
    );
  }

  if (!user) {
    return (
      <section id="request-blood" className="py-20 bg-gradient-to-br from-red-50 to-orange-50 border-t border-red-100">
        <div className="max-w-xl mx-auto px-6 text-center">
          <div className="text-5xl mb-5">🆘</div>
          <h2 className="text-3xl font-bold mb-3 text-gray-900">Request Emergency Blood Support</h2>
          <p className="text-gray-600 mb-8 leading-relaxed">
            Need urgent blood donations? Log in to create an active emergency request that alerts donors nearby.
          </p>
          <button
            className="bg-gradient-to-r from-[#e74c3c] to-[#c0392b] text-white border-none py-3 px-8 rounded-lg font-bold text-base cursor-pointer hover:from-[#c0392b] hover:to-[#a93226] transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5"
            onClick={() => { if (typeof setIsLoginModalOpen === "function") setIsLoginModalOpen(true); }}
          >
            LOGIN TO REQUEST
          </button>
        </div>
      </section>
    );
  }

  return (
    <section id="request-blood" className="py-20 bg-gradient-to-br from-red-50 to-orange-50 border-t border-red-100">
      <div className="max-w-2xl mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-red-100 text-red-700 text-sm font-semibold px-4 py-1.5 rounded-full mb-4">
            🚨 Emergency Request
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Request Emergency Blood Support</h2>
          <p className="text-gray-600">Submit a request to alert eligible blood donors in your vicinity</p>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-2xl shadow-lg p-8 border border-red-100">
          <form onSubmit={handleRequestSubmit} className="space-y-6">

            {/* Row 1: Patient Name + Phone */}
            <div className="grid md:grid-cols-2 gap-5">
              <div>
                <label htmlFor="patientName" className={labelClass}>Patient Full Name *</label>
                <input type="text" id="patientName" className={inputClass} required placeholder="Enter patient name" value={patientName} onChange={(e) => setPatientName(e.target.value)} />
              </div>
              <div>
                <label htmlFor="contactPhone" className={labelClass}>Contact Phone *</label>
                <input type="tel" id="contactPhone" className={inputClass} required placeholder="Enter phone number" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} />
              </div>
            </div>

            {/* Row 2: Blood Type + Urgency */}
            <div className="grid md:grid-cols-2 gap-5">
              <div>
                <label htmlFor="reqBloodType" className={labelClass}>Blood Type Needed *</label>
                <select id="reqBloodType" className={inputClass} required value={bloodType} onChange={(e) => setBloodType(e.target.value)}>
                  <option value="">Select Blood Group</option>
                  {["A+","A-","B+","B-","AB+","AB-","O+","O-"].map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="urgencyLevel" className={labelClass}>Urgency Level *</label>
                <select id="urgencyLevel" className={`${inputClass} ${urgency ? urgencyColors[urgency] + ' font-semibold' : ''}`} required value={urgency} onChange={(e) => setUrgency(e.target.value)}>
                  <option value="">Select Urgency</option>
                  <option value="Critical">🚨 Critical — Immediate Action</option>
                  <option value="Urgent">⚠️ Urgent — Within 24 Hours</option>
                  <option value="Standard">📅 Standard — Scheduled</option>
                </select>
              </div>
            </div>

            {/* Hospital Name */}
            <div>
              <label htmlFor="hospitalName" className={labelClass}>Hospital / Facility Name *</label>
              <input type="text" id="hospitalName" className={inputClass} required placeholder="E.g., City General Hospital" value={hospitalName} onChange={(e) => setHospitalName(e.target.value)} />
            </div>

            {/* Hospital Address */}
            <div>
              <label htmlFor="hospitalAddress" className={labelClass}>Hospital Address *</label>
              <textarea id="hospitalAddress" className={inputClass} rows="2" required placeholder="Enter full hospital address" value={hospitalAddress} onChange={(e) => setHospitalAddress(e.target.value)} />
            </div>

            {/* Coordinates + GPS */}
            <div>
              <label className={labelClass}>Hospital GPS Coordinates *</label>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <input type="number" step="any" id="lat" className={inputClass} required placeholder="Latitude (e.g. 12.9716)" value={latitude} onChange={(e) => setLatitude(e.target.value)} />
                <input type="number" step="any" id="lng" className={inputClass} required placeholder="Longitude (e.g. 77.5946)" value={longitude} onChange={(e) => setLongitude(e.target.value)} />
              </div>
              <button
                type="button"
                onClick={requestLocation}
                disabled={detectingLocation}
                className={`w-full py-2.5 px-4 rounded-lg border-2 font-semibold text-sm transition-all cursor-pointer ${detectingLocation ? 'border-gray-300 text-gray-400 bg-gray-50 cursor-not-allowed' : 'border-[#e74c3c] text-[#e74c3c] bg-white hover:bg-[#e74c3c] hover:text-white'}`}
              >
                {detectingLocation ? "⏳ Detecting Coordinates..." : "📍 Auto-Detect Hospital Location (GPS)"}
              </button>
              {latitude && longitude && (
                <p className="text-green-600 text-sm mt-2 font-medium">✓ Coordinates: ({latitude}, {longitude})</p>
              )}
              {locationError && (
                <p className="text-red-500 text-sm mt-2">⚠ {locationError}</p>
              )}
              <p className="text-gray-400 text-xs mt-2">
                Accurate coordinates ensure the system alerts donors closest to the hospital.
              </p>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-4 bg-gradient-to-r from-[#e74c3c] to-[#c0392b] text-white font-bold text-base rounded-xl border-none cursor-pointer hover:from-[#c0392b] hover:to-[#a93226] transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none"
            >
              {submitting ? "Submitting Request..." : "🆘 Submit Emergency Request"}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}

export default RequestBlood;
