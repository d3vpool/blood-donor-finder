// src/components/DirectRequestModal.jsx
import React, { useState } from "react";
import { collection, addDoc } from "firebase/firestore";
import { auth, db } from "../firebase";
import { toast } from "react-toastify";
import { encodeGeoHash } from "../utils/geoHash";
import { isRealUser } from "../utils/authUser";
import { getCurrentCoordinates, geolocationErrorMessage } from "../utils/geolocation";

const inputClass =
  "w-full py-3 px-4 border border-slate-200 rounded-xl text-sm font-semibold bg-slate-50 text-slate-900 focus:outline-none focus:border-red-500 focus:ring-4 focus:ring-red-500/10 focus:bg-white transition-all duration-200 shadow-sm hover:border-slate-300";
const labelClass = "block text-[10px] uppercase tracking-wider font-extrabold text-slate-400 mb-1.5";

export default function DirectRequestModal({ donor, recipientLocation, onClose }) {
  const [patientName, setPatientName] = useState("");
  const [urgency, setUrgency] = useState("");
  const [hospitalName, setHospitalName] = useState("");
  const [hospitalAddress, setHospitalAddress] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [latitude, setLatitude] = useState(
    recipientLocation?.lat != null ? Number(recipientLocation.lat).toFixed(6) : ""
  );
  const [longitude, setLongitude] = useState(
    recipientLocation?.lng != null ? Number(recipientLocation.lng).toFixed(6) : ""
  );
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const donorId = donor?.uid || donor?.id || null;
  const donorName = donor?.fullname || donor?.name || "Donor";
  const bloodType = donor?.bloodType || donor?.bloodGroup || "";

  const requestLocation = async () => {
    setDetectingLocation(true);
    setLocationError("");
    try {
      const { latitude: lat, longitude: lng } = await getCurrentCoordinates();
      setLatitude(Number(lat).toFixed(6));
      setLongitude(Number(lng).toFixed(6));
      toast.success("Coordinates captured!", { position: "top-center" });
    } catch (error) {
      const message = geolocationErrorMessage(error);
      setLocationError(message);
      toast.error(message, { position: "top-center" });
    } finally {
      setDetectingLocation(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const latNum = Number(latitude);
    const lngNum = Number(longitude);

    if (!patientName || !urgency || !hospitalName || !hospitalAddress || !contactPhone) {
      toast.warning("Please fill out all required fields.", { position: "top-center" });
      return;
    }
    if (isNaN(latNum) || isNaN(lngNum) || latNum < -90 || latNum > 90 || lngNum < -180 || lngNum > 180) {
      toast.error("Please provide valid coordinates.", { position: "top-center" });
      return;
    }
    if (!donorId) {
      toast.error("This donor has no account linked, so they cannot be requested directly.", { position: "top-center" });
      return;
    }

    setSubmitting(true);
    try {
      const currentUser = auth.currentUser;
      if (!isRealUser(currentUser)) {
        toast.error("Login required to send a request.", { position: "top-center" });
        return;
      }
      if (currentUser.uid === donorId) {
        toast.error("You cannot request blood from yourself.", { position: "top-center" });
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
        targetDonorId: donorId,
        status: "pending",
        requestedAt: new Date().toISOString(),
        acceptedBy: null,
      });
      toast.success(`Blood request sent to ${donorName}!`, { position: "top-center" });
      if (typeof onClose === "function") onClose();
    } catch (error) {
      console.error("Error sending direct blood request:", error);
      toast.error("Failed to send request. Please try again.", { position: "top-center" });
    } finally {
      setSubmitting(false);
    }
  };

  const urgencyColors = {
    Critical: "text-red-700 bg-red-50 border-red-200",
    Urgent: "text-amber-700 bg-amber-50 border-amber-200",
    Standard: "text-blue-700 bg-blue-50 border-blue-200",
  };

  return (
    <div
      className="fixed inset-0 w-full h-full bg-slate-950/40 flex items-center justify-center z-[999] backdrop-blur-[4px] animate-fade-in"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative bg-white p-8 rounded-3xl w-[95%] max-w-[460px] max-h-[92vh] overflow-y-auto shadow-[0_20px_50px_rgba(15,23,42,0.15)] border border-slate-100 animate-slide-up">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">Request {donorName}</h3>
          <button
            className="text-slate-400 hover:text-slate-600 transition-colors bg-slate-50 hover:bg-slate-100 rounded-full flex items-center justify-center w-8 h-8 border border-slate-100 cursor-pointer text-xl leading-none"
            onClick={onClose}
            aria-label="Close"
          >
            &times;
          </button>
        </div>

        <div className="mb-5 flex items-center gap-2 bg-red-50 border border-red-100 rounded-2xl px-4 py-3">
          <span className="text-2xl select-none">🩸</span>
          <p className="text-xs text-red-800 font-bold leading-snug">
            This sends a personal emergency request directly to {donorName} ({bloodType || "matching blood"}).
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="directPatientName" className={labelClass}>Patient Full Name *</label>
            <input type="text" id="directPatientName" className={inputClass} required placeholder="Enter patient name" value={patientName} onChange={(e) => setPatientName(e.target.value)} />
          </div>

          <div>
            <label htmlFor="directPhone" className={labelClass}>Contact Phone *</label>
            <input type="tel" id="directPhone" className={inputClass} required placeholder="Enter phone number" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} />
          </div>

          <div>
            <label htmlFor="directUrgency" className={labelClass}>Urgency Level *</label>
            <div className="relative">
              <select id="directUrgency" className={`${inputClass} ${urgency ? urgencyColors[urgency] + " font-bold border" : ""}`} required value={urgency} onChange={(e) => setUrgency(e.target.value)}>
                <option value="">Select Urgency</option>
                <option value="Critical">🚨 Critical — Immediate Action</option>
                <option value="Urgent">⚠️ Urgent — Within 24 Hours</option>
                <option value="Standard">📅 Standard — Scheduled</option>
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-xs">▼</div>
            </div>
          </div>

          <div>
            <label htmlFor="directHospital" className={labelClass}>Hospital / Facility Name *</label>
            <input type="text" id="directHospital" className={inputClass} required placeholder="E.g., City General Hospital" value={hospitalName} onChange={(e) => setHospitalName(e.target.value)} />
          </div>

          <div>
            <label htmlFor="directHospitalAddress" className={labelClass}>Hospital Address *</label>
            <textarea id="directHospitalAddress" className={`${inputClass} resize-none min-h-[70px]`} rows="2" required placeholder="Enter full hospital address" value={hospitalAddress} onChange={(e) => setHospitalAddress(e.target.value)} />
          </div>

          <div className="border-t border-slate-100 pt-4">
            <label className={labelClass}>Hospital GPS Coordinates *</label>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <input type="number" step="any" className={inputClass} required placeholder="Latitude" value={latitude} onChange={(e) => setLatitude(e.target.value)} />
              <input type="number" step="any" className={inputClass} required placeholder="Longitude" value={longitude} onChange={(e) => setLongitude(e.target.value)} />
            </div>
            <button
              type="button"
              onClick={requestLocation}
              disabled={detectingLocation}
              className={`w-full py-3 px-4 rounded-xl border font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-2 ${detectingLocation ? "border-slate-200 text-slate-400 bg-slate-50 cursor-not-allowed" : "border-red-200 bg-white text-red-600 hover:bg-red-50/50 hover:border-red-300 active:scale-[0.99]"}`}
            >
              {detectingLocation ? "Detecting Coordinates..." : "📍 Auto-Detect Hospital Location (GPS)"}
            </button>
            {locationError && <p className="text-red-500 text-xs font-bold mt-2 text-center">⚠️ {locationError}</p>}
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-4 bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white font-bold text-sm rounded-xl border-none cursor-pointer transition-all duration-200 shadow-md shadow-red-500/10 hover:shadow-lg hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
          >
            {submitting ? "Sending Request..." : "Send Blood Request"}
          </button>
          <button
            type="button"
            className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 border-none rounded-xl py-3.5 px-4 font-bold cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.99] text-sm"
            onClick={onClose}
          >
            Close
          </button>
        </form>
      </div>
    </div>
  );
}
