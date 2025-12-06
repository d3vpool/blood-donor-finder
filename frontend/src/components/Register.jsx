// src/components/Register.jsx
import React, { useState, useEffect, useCallback, useRef } from "react";
import "./Register.css";
import { setDoc, doc, getDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../firebase";
import { registerTokenForUser, removeTokenForUser } from "../firebaseMessaging";
import { toast } from "react-toastify";

function Register({ setIsLoginModalOpen }) {
  const initialState = {
    donorFullname: "",
    donorEmail: "",
    donorPhoneNo: "",
    donorBloodtype: "",
    donorAddress: "",
    location: null,
    locationError: "",
  };

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

  // Keep track of last signed-in uid so we can clean up on sign-out
  const lastUidRef = useRef(null);

  const resetDonorForm = useCallback(() => {
    setDonorFullname(initialState.donorFullname);
    setDonorEmail(initialState.donorEmail);
    setDonorPhoneNo(initialState.donorPhoneNo);
    setDonorBloodtype(initialState.donorBloodtype);
    setDonorAddress(initialState.donorAddress);
    setLocation(initialState.location);
    setLocationError(initialState.locationError);
    setIsDonor(false);

    try {
      localStorage.removeItem("geoAllowed");
      localStorage.removeItem("recipientLocation");
    } catch (_) {}
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      // If someone was previously logged in and now signed out, clear tokens and local flags
      if (!currentUser && lastUidRef.current) {
        try {
          await removeTokenForUser(lastUidRef.current);
        } catch (e) {
          console.warn("Failed removing token for previous user", e);
        }
        resetDonorForm();
        lastUidRef.current = null;
      }

      setUser(currentUser);
      setLoading(false);

      if (currentUser) {
        lastUidRef.current = currentUser.uid;
        setDonorEmail(currentUser.email || "");
        // prefill fullname from Users collection
        try {
          const userDocRef = doc(db, "Users", currentUser.uid);
          const userDoc = await getDoc(userDocRef);
          if (userDoc.exists()) {
            setDonorFullname(userDoc.data().fullname || "");
          }
        } catch (e) {
          console.warn("Failed to read Users doc:", e);
        }

        // check if already a donor
        try {
          const donorDocRef = doc(db, "Donors", currentUser.uid);
          const donorDoc = await getDoc(donorDocRef);
          setIsDonor(Boolean(donorDoc.exists()));
        } catch (e) {
          console.warn("Failed to read Donors doc:", e);
          setIsDonor(false);
        }
      }
    });

    return () => unsubscribe();
  }, [resetDonorForm]);

  const requestLocation = () => {
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser.");
      toast.error("Geolocation not supported", { position: "top-center" });
      return;
    }

    toast.info("Requesting location permission", { position: "top-center" });

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const latNum = Number(latitude);
        const lngNum = Number(longitude);

        if (!Number.isFinite(latNum) || !Number.isFinite(lngNum)) {
          setLocationError("Invalid coordinates received.");
          toast.error("Invalid location coordinates", { position: "top-center" });
          return;
        }

        setLocation({ latitude: latNum, longitude: lngNum });
        setLocationError("");
        try {
          localStorage.setItem("geoAllowed", "true");
          localStorage.setItem("recipientLocation", JSON.stringify({ lat: latNum, lng: lngNum }));
        } catch (_) {}
        toast.success("Location access granted!", { position: "top-center" });
      },
      (error) => {
        setLocationError(error.message || "Location error");
        switch (error.code) {
          case error.PERMISSION_DENIED:
            toast.error("Location permission denied. Please enable location access.", { position: "top-center" });
            break;
          case error.POSITION_UNAVAILABLE:
            toast.error("Location information unavailable.", { position: "top-center" });
            break;
          case error.TIMEOUT:
            toast.error("Location request timed out.", { position: "top-center" });
            break;
          default:
            toast.error("An error occurred while getting location.", { position: "top-center" });
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  const handleDonorRegistration = async (e) => {
    e.preventDefault();

    if (!location) {
      toast.warning("Please allow location access to register as a donor.", { position: "top-center" });
      requestLocation();
      return;
    }

    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        toast.error("Login required to register as a donor.", { position: "top-center" });
        return;
      }

      const donorDocRef = doc(db, "Donors", currentUser.uid);
      const donorDocSnap = await getDoc(donorDocRef);

      if (donorDocSnap.exists()) {
        toast.warning("You are already registered as a donor.", { position: "top-center" });
        setIsDonor(true);
        return;
      }

      await setDoc(donorDocRef, {
        fullname: donorFullname || "",
        email: currentUser.email || "",
        phoneNo: donorPhoneNo || "",
        bloodType: donorBloodtype || "",
        address: donorAddress || "",
        location: {
          latitude: Number(location.latitude),
          longitude: Number(location.longitude),
        },
        registeredAt: new Date().toISOString(),
      });

      toast.success("Donor Registered Successfully with Location!", { position: "top-center" });
      setIsDonor(true);

      // Register FCM token for this user so they can get notifications (best-effort)
      try {
        await registerTokenForUser(currentUser.uid);
        toast.info("Notification token saved for donor.", { position: "top-center" });
      } catch (tokenErr) {
        console.warn("Failed to register FCM token:", tokenErr);
        toast.warning("Could not save notification token. Donor will not receive push messages.", { position: "top-center" });
      }

      // If parent passed a modal controller for login, close it (optional)
      try {
        if (typeof setIsLoginModalOpen === "function") {
          setIsLoginModalOpen(false);
        }
      } catch (_) {}
    } catch (error) {
      console.error("Registration error:", error);
      toast.error("Failed to register as donor. Try again.", { position: "top-center" });
    }
  };

  if (loading) {
    return (
      <section id="register" className="register-section">
        <div className="container">
          <p>Loading...</p>
        </div>
      </section>
    );
  }

  if (!user) {
    return (
      <section id="register" className="register-section">
        <div className="container">
          <h2>Become a Blood Donor</h2>
          <p>Want to save lives? Please log in first!</p>
          <button
            className="login-prompt-btn"
            onClick={() => {
              if (typeof setIsLoginModalOpen === "function") setIsLoginModalOpen(true);
            }}
          >
            LOGIN
          </button>
        </div>
      </section>
    );
  }

  if (isDonor) {
    return (
      <section id="register" className="register-section">
        <div className="container">
          <h2>Donor Status</h2>
          <p className="already-donor-message">✅ You are already registered as a donor!</p>
          <p>Thank you for being a hero and helping save lives.</p>
        </div>
      </section>
    );
  }

  return (
    <section id="register" className="register-section">
      <div className="container">
        <h2>Become a Blood Donor</h2>
        <p>Join our community of heroes and help save lives</p>
        <div className="register-form">
          <form id="donorRegistrationForm" onSubmit={handleDonorRegistration} className="donor-register-form">
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="fullName" className="form-label">Full Name*</label>
                <input
                  type="text"
                  id="fullName"
                  name="fullname"
                  className="form-control"
                  required
                  value={donorFullname}
                  onChange={(e) => setDonorFullname(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label htmlFor="email" className="form-label">Email Address*</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  className="form-control"
                  required
                  value={donorEmail}
                  onChange={(e) => setDonorEmail(e.target.value)}
                  readOnly
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="phone" className="form-label">Phone Number*</label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  className="form-control"
                  required
                  value={donorPhoneNo}
                  onChange={(e) => setDonorPhoneNo(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label htmlFor="donorBloodType" className="form-label">Blood Type*</label>
                <select
                  id="donorBloodType"
                  className="form-control"
                  required
                  value={donorBloodtype}
                  onChange={(e) => setDonorBloodtype(e.target.value)}
                >
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
            </div>

            <div className="form-row">
              <div className="form-group address-group">
                <label htmlFor="address" className="form-label">Address*</label>
                <textarea
                  id="address"
                  className="form-control"
                  rows="3"
                  required
                  value={donorAddress}
                  onChange={(e) => setDonorAddress(e.target.value)}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group address-group location-section">
                <label className="form-label">Location Access*</label>
                <button type="button" className="location-btn" onClick={requestLocation}>
                  {location ? "Location Granted Successfully" : "Allow Location Access"}
                </button>
                {location && (
                  <p className="location-status success">✓ Location captured successfully</p>
                )}
                {locationError && (
                  <p className="location-status error">⚠ {locationError}</p>
                )}
                <p className="location-info">
                  We need your location to help connect you with nearby recipients.
                </p>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="medicalEligible" className="checkbox-label">
                <input type="checkbox" id="medicalEligible" required /> I confirm that I am medically eligible to donate blood and meet all health requirements.
              </label>
            </div>
            <div className="form-group">
              <label htmlFor="agreeTerms" className="checkbox-label">
                <input type="checkbox" id="agreeTerms" required /> I agree to the terms and conditions.
              </label>
            </div>
            <div className="form-group">
              <label htmlFor="agreePolicy" className="checkbox-label">
                <input type="checkbox" id="agreePolicy" required /> I agree to the privacy policy.
              </label>
            </div>

            <button type="submit" className="register-form-button">Register as Donor</button>
          </form>
        </div>
      </div>
    </section>
  );
}

export default Register;
