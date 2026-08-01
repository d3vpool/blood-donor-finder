// src/App.js
import React, { useState, useCallback, useRef, useEffect } from "react";
import { setupAutoRegistration, initMessaging, requestNotificationPermissionAndGetToken, onForegroundMessage } from "./firebaseMessaging";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "./firebase";
import { isRealUser } from "./utils/authUser";
import { checkPwaAuthPersistence, isRunningAsPwa } from "./utils/checkPwaAuth";

import Header from "./components/Header";
import Hero from "./components/Hero";
import Search from "./components/Search";
import SearchResult from "./components/SearchResult";
import Register from "./components/Register";
import RequestBlood from "./components/RequestBlood";
import About from "./components/About";
import Footer from "./components/Footer";
import ContactModal from "./components/ContactModal";
import DonorMap from "./components/DonorMap";
import Signup from "./components/SignUp";
import ActiveRequests from "./components/ActiveRequests";
import DonorInbox from "./components/DonorInbox";
import DonorLiveTracker from "./components/DonorLiveTracker";
import LiveTrackingSection from "./components/LiveTrackingSection";
import Modal from "./components/modal";

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

  const [notificationToken, setNotificationToken] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [activeNotification, setActiveNotification] = useState(null);
  const [showPermissionPrompt, setShowPermissionPrompt] = useState(false);

  // Check notification permission state on mount
  useEffect(() => {
    if ('Notification' in window) {
      if (Notification.permission === 'default') {
        setShowPermissionPrompt(true);
      }
    }
  }, []);

  // Auto-dismiss foreground notification banner after 7 seconds
  useEffect(() => {
    if (activeNotification) {
      const timer = setTimeout(() => {
        setActiveNotification(null);
      }, 7000);
      return () => clearTimeout(timer);
    }
  }, [activeNotification]);

  useEffect(() => {
    // initialize messaging service worker + messaging instance once
    initMessaging().catch((e) => {
      console.warn("initMessaging failed:", e);
    });

    // Clear leftover anonymous sessions from older search flow
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user?.isAnonymous) {
        try {
          await signOut(auth);
        } catch (e) {
          console.warn("Failed to clear anonymous session:", e);
        }
        return;
      }

      if (isRealUser(user)) {
        try {
          await setupAutoRegistration({ uid: user.uid });
        } catch (e) {
          console.warn("setupAutoRegistration failed:", e);
        }
      }
    });

    return () => {
      try { unsubscribe(); } catch (_) { }
    };
  }, []);

  // Task 1.2 — Check PWA Auth persistence once on mount
  useEffect(() => {
    if (isRunningAsPwa()) {
      checkPwaAuthPersistence().then(({ isAuthenticated, warning }) => {
        if (warning) {
          console.warn("[PWA Auth Check]", warning);
        } else if (isAuthenticated) {
          console.log("[PWA Auth Check] Auth session persisted correctly in installed PWA context.");
        }
      });
    }
  }, []);

  // Firebase Cloud Messaging integration
  useEffect(() => {
    requestNotificationPermissionAndGetToken()
      .then((token) => {
        if (token) {
          setNotificationToken(token);
          console.log('Notification token stored:', token);
        }
      })
      .catch((error) => {
        console.error('Error getting notification token:', error);
      });

    // Register foreground message listener
    const unsubscribe = onForegroundMessage((payload) => {
      console.log('Foreground message received:', payload);

      if (payload.notification) {
        const title = payload.notification.title || 'New Notification';
        const body = payload.notification.body || '';
        setActiveNotification({ title, body });
      }
    });

    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, []);

  const handleSetMapController = useCallback((controller) => {
    setMapControllerState(controller);

    if (controller && pendingFocusRef.current.length > 0) {
      pendingFocusRef.current.forEach(({ lat, lng, zoom }) => {
        try {
          controller.focusOn(lat, lng, zoom);
        } catch (_) { }
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
      <div className="min-h-screen bg-slate-50 font-sans flex flex-col">
        {/* Styled FCM Notification Permission Prompt Banner */}
        {showPermissionPrompt && (
          <div className="bg-slate-900 border-b border-white/10 text-white py-3 px-6 text-center text-xs md:text-sm font-medium flex items-center justify-center gap-3 animate-fade-in relative z-[1001] shadow-lg">
            <span>🔔 Enable push notifications to receive real-time emergency match alerts.</span>
            <button 
              onClick={async () => {
                const token = await requestNotificationPermissionAndGetToken();
                if (token) setNotificationToken(token);
                setShowPermissionPrompt(false);
              }}
              className="bg-red-500 hover:bg-red-600 text-white font-bold px-3 py-1.5 rounded-lg text-xs transition-all cursor-pointer border-none shadow-sm shadow-red-500/15"
            >
              Enable Now
            </button>
            <button 
              onClick={() => setShowPermissionPrompt(false)} 
              className="text-slate-400 hover:text-white bg-transparent border-none cursor-pointer text-xl leading-none pl-2 select-none"
              aria-label="Dismiss banner"
            >
              &times;
            </button>
          </div>
        )}

        {/* Foreground FCM Notification Banner */}
        {activeNotification && (
          <div className="fixed top-24 right-6 z-[99999] max-w-sm w-full bg-slate-900 border border-white/10 text-white rounded-2xl p-5 shadow-2xl flex items-start gap-3.5 animate-slide-up">
            <div className="bg-red-500/15 text-red-400 p-2.5 rounded-xl border border-red-500/20 text-lg shrink-0 leading-none select-none">
              🚨
            </div>
            <div className="flex-grow min-w-0">
              <h4 className="font-extrabold text-sm tracking-tight text-white mb-1 truncate">{activeNotification.title}</h4>
              <p className="text-xs text-slate-300 font-medium leading-relaxed break-words">{activeNotification.body}</p>
            </div>
            <button 
              onClick={() => setActiveNotification(null)}
              className="text-slate-400 hover:text-white transition-colors bg-transparent border-none cursor-pointer text-lg leading-none p-0.5 select-none"
              aria-label="Close notification"
            >
              &times;
            </button>
          </div>
        )}




        <Header
          isLoginModalOpen={isLoginModalOpen}
          setIsLoginModalOpen={setIsLoginModalOpen}
          openSignup={openSignup}
        />

        <LiveTrackingSection />

        <Hero />

        <Search
          setResults={setSearchResults}
          setRecipientLocation={setRecipientLocation}
          setUserHasSearched={setUserHasSearched}
          setIsSearching={setIsSearching}
        />

        {recipientLocation && (
          <DonorMap
            recipientLocation={recipientLocation}
            donors={searchResults}
            setMapController={handleSetMapController}
            isSearching={isSearching}
          />
        )}

        {userHasSearched && (
          <SearchResult 
            results={searchResults} 
            focusOn={focusOn} 
            isSearching={isSearching}
            recipientLocation={recipientLocation}
          />
        )}

        <Register setIsLoginModalOpen={setIsLoginModalOpen} />
        <RequestBlood setIsLoginModalOpen={setIsLoginModalOpen} />
        <ActiveRequests />
        <DonorInbox />
        <DonorLiveTracker />
        <About />
        <Footer />
        <ContactModal />
      </div>

      {/* Redesigned unified Signup modal */}
      {isSignupOpen && (
        <Modal isOpen={isSignupOpen} onClose={closeSignup}>
          <Signup
            onOpenLogin={() => {
              closeSignup();
              setIsLoginModalOpen(true);
            }}
            onClose={closeSignup}
          />
        </Modal>
      )}

      <ToastContainer />
    </>
  );
}

export default App;
