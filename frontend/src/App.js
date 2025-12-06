// src/App.js
import React, { useState, useCallback, useRef, useEffect } from "react";
import { setupAutoRegistration, initMessaging } from "./firebaseMessaging";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./firebase";

import Header from "./components/Header";
import Hero from "./components/Hero";
import Search from "./components/Search";
import SearchResult from "./components/SearchResult";
import Register from "./components/Register";
import About from "./components/About";
import Footer from "./components/Footer";
import ContactModal from "./components/ContactModal";
import DonorMap from "./components/DonorMap";
import Signup from "./components/SignUp"; // added

import "./styles/global.css";

function App() {
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  // signup modal state + helpers
  const [isSignupOpen, setIsSignupOpen] = useState(false);
  const openSignup = () => setIsSignupOpen(true);
  const closeSignup = () => setIsSignupOpen(false);

  const [searchResults, setSearchResults] = useState([]);
  const [recipientLocation, setRecipientLocation] = useState(null);

  const [userHasSearched, setUserHasSearched] = useState(false);

  const [mapController, setMapControllerState] = useState(null);
  const pendingFocusRef = useRef([]);

  useEffect(() => {
      // initialize messaging service worker + messaging instance once
      // (we call initMessaging with default app which you export from ./firebase)
      initMessaging().catch((e) => {
        console.warn("initMessaging failed:", e);
      });

      // register for auth changes; when user signs in, register FCM token
      const unsubscribe = onAuthStateChanged(auth, async (user) => {
        console.log('onAuthStateChanged fired. auth:', auth);
        console.log('onAuthStateChanged fired. user (raw):', user);
        // defensive: if user exists but uid is missing, log that explicitly
        if (user && typeof user.uid === 'undefined') {
          console.warn('onAuthStateChanged: user object has no uid property:', user);
        }

        if (user) {
          try {
            // pass the uid explicitly so setupAutoRegistration doesn't throw
            await setupAutoRegistration({ uid: user.uid });
          } catch (e) {
            console.warn("setupAutoRegistration failed:", e);
          }
        } else {
          // user signed out - token cleanup already handled elsewhere (Register.jsx), but you can do extra cleanup here if desired
        }
      });



      return () => {
        try { unsubscribe(); } catch(_) {}
      };
    }, []);

  const handleSetMapController = useCallback((controller) => {
    setMapControllerState(controller);

    if (controller && pendingFocusRef.current.length > 0) {
      pendingFocusRef.current.forEach(({ lat, lng, zoom }) => {
        try {
          controller.focusOn(lat, lng, zoom);
        } catch (_) {}
      });
      pendingFocusRef.current = [];
    }
  }, []);

  const focusOn = useCallback(
    (lat, lng, zoom = 15) => {
      if (mapController && typeof mapController.focusOn === "function") {
        mapController.focusOn(lat, lng, zoom);
      } else {
        pendingFocusRef.current.push({ lat, lng, zoom });
      }
    },
    [mapController]
  );

  return (
    <>
      <div>
        <Header
          isLoginModalOpen={isLoginModalOpen}
          setIsLoginModalOpen={setIsLoginModalOpen}
          // optionally expose signup opener to Header if you want:
          openSignup={openSignup}
        />

        <Hero />

        <Search
          setResults={setSearchResults}
          setRecipientLocation={setRecipientLocation}
          setUserHasSearched={setUserHasSearched}
        />

        {recipientLocation && (
          <DonorMap
            recipientLocation={recipientLocation}
            donors={searchResults}
            setMapController={handleSetMapController}
          />
        )}

        {userHasSearched && <SearchResult results={searchResults} focusOn={focusOn} />}

        <Register setIsLoginModalOpen={setIsLoginModalOpen} />
        <About />
        <Footer />
        <ContactModal />
      </div>

      {/* Signup modal wrapper — parent provides onClose so Signup can close itself */}
      {isSignupOpen && (
        <div className="modal">
          <div className="modal-content">
            <button className="modal-close" onClick={closeSignup}>
              &times;
            </button>

            <Signup
              onOpenLogin={() => {
                // user clicked "Login" inside Signup: close signup modal and open login modal
                closeSignup();
                setIsLoginModalOpen(true);
              }}
              onClose={closeSignup}
            />
          </div>
        </div>
      )}

      <ToastContainer />
    </>
  );
}

export default App;
