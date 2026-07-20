// src/components/Header.jsx
import React, { useState, useEffect } from 'react';
import Modal from './modal';
import { signOut, onAuthStateChanged } from 'firebase/auth';
import { auth } from "../firebase";
import { setupAutoRegistration, removeTokenForUser } from "../firebaseMessaging";
import Login from "./Login";
import SignUp from "./SignUp";

function Header({ isLoginModalOpen, setIsLoginModalOpen }) {
  const [isSignupModalOpen, setIsSignupModalOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [isNavOpen, setIsNavOpen] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u || null);

      if (u) {
        try {
          await setupAutoRegistration({ uid: u.uid });
        } catch (err) {
          console.warn('FCM token registration failed:', err);
        }
      }
    });

    return () => {
      try { unsub(); } catch (_) {}
    };
  }, []);

  const handleLogout = () => {
    const uid = auth.currentUser?.uid;

    signOut(auth)
      .then(async () => {
        if (uid) await removeTokenForUser(uid);
        console.log("User logged out, token removed");
      })
      .catch(error => {
        console.error("Logout error", error);
      });
  };

  const handleNavLinkClick = () => {
    setIsNavOpen(false);
  };

  return (
    <>
      <header className="bg-black/90 backdrop-blur-md text-white py-4 shadow-lg sticky top-0 z-[1000] w-full border-b border-white/10 transition-all duration-300">
        <div className="w-full max-w-[1200px] mx-auto px-6">
          <div className="grid grid-cols-[auto_minmax(0,_1fr)_auto] items-center gap-4 w-full relative whitespace-nowrap">
            <div className="col-start-1 justify-self-start self-center flex items-center gap-2">
              <span className="text-2xl font-black tracking-tight text-white m-0 whitespace-nowrap">
                Life<span className="text-red-500">Link</span>
              </span>
            </div>

            <nav className={`justify-self-center self-center w-full z-[1100] md:relative md:block md:top-auto md:left-auto md:right-auto md:bg-transparent ${isNavOpen ? 'block absolute top-full left-0 right-0 bg-black/95 backdrop-blur-lg border-b border-white/10 animate-fade-in' : 'hidden'}`}>
              <ul onClick={handleNavLinkClick} className="flex gap-[15px] items-center list-none m-0 p-0 md:flex-row flex-col max-md:gap-2.5 max-md:py-5 max-md:px-6 max-md:items-stretch">
                <li><a href="#home" className="font-semibold text-sm py-2 px-3 transition-all duration-200 text-gray-300 hover:text-white hover:bg-white/5 rounded-lg inline-block w-full text-center md:text-left">Home</a></li>
                <li><a href="#search" className="font-semibold text-sm py-2 px-3 transition-all duration-200 text-gray-300 hover:text-white hover:bg-white/5 rounded-lg inline-block w-full text-center md:text-left">Find Donors</a></li>
                <li><a href="#register" className="font-semibold text-sm py-2 px-3 transition-all duration-200 text-gray-300 hover:text-white hover:bg-white/5 rounded-lg inline-block w-full text-center md:text-left">Register</a></li>
                <li><a href="#request-blood" className="font-semibold text-sm py-2 px-3 transition-all duration-200 text-gray-300 hover:text-white hover:bg-white/5 rounded-lg inline-block w-full text-center md:text-left">Request Blood</a></li>
                {user && <li><a href="#donor-inbox" className="font-semibold text-sm py-2 px-3 transition-all duration-200 text-gray-300 hover:text-white hover:bg-white/5 rounded-lg inline-block w-full text-center md:text-left">Requests For You</a></li>}
                <li><a href="#about" className="font-semibold text-sm py-2 px-3 transition-all duration-200 text-gray-300 hover:text-white hover:bg-white/5 rounded-lg inline-block w-full text-center md:text-left">About</a></li>
                <li className="max-md:mt-2">
                  <a href="tel:011-23359379" className="border-2 border-red-500 text-red-500 font-bold py-2 px-4 rounded-lg text-decoration-none bg-red-500/10 hover:bg-red-500 hover:text-white transition-all duration-300 text-sm inline-block w-full text-center shadow-md hover:shadow-red-500/20">
                    🚨 Emergency Call
                  </a>
                </li>
              </ul>
            </nav>

            <div className="col-start-3 justify-self-end flex items-center gap-2 min-w-max">
              <div className="flex-none inline-flex items-center justify-center rounded-lg whitespace-nowrap min-w-max max-w-[140px] md:max-w-[220px] overflow-hidden text-ellipsis p-0">
                {user ? (
                  <button onClick={handleLogout} className="font-bold py-2 px-4 text-xs md:text-sm text-white bg-white/10 hover:bg-red-600 border border-white/10 rounded-lg cursor-pointer transition-all duration-200 shadow-md">
                    Logout
                  </button>
                ) : (
                  <button
                    className="font-bold py-2 px-4 text-xs md:text-sm text-black bg-white hover:bg-gray-100 border-none rounded-lg cursor-pointer transition-all duration-200 shadow-md hover:scale-[1.02] active:scale-[0.98]"
                    onClick={e => {
                      e.preventDefault();
                      setIsLoginModalOpen(true);
                    }}
                  >
                    Login
                  </button>
                )}
              </div>

              <button
                className="md:hidden flex flex-col gap-1 w-9 h-7 bg-transparent border-none p-1 cursor-pointer items-center justify-center z-[1200] relative"
                aria-label={isNavOpen ? "Close menu" : "Open menu"}
                aria-expanded={isNavOpen}
                onClick={() => setIsNavOpen(v => !v)}
              >
                <span className={`block w-5.5 h-[2px] rounded bg-white transition-all duration-200 relative ${isNavOpen ? 'translate-y-[6px] rotate-45' : ''}`}></span>
                <span className={`block w-5.5 h-[2px] rounded bg-white transition-all duration-150 relative ${isNavOpen ? 'opacity-0 scale-x-0' : ''}`}></span>
                <span className={`block w-5.5 h-[2px] rounded bg-white transition-all duration-200 relative ${isNavOpen ? '-translate-y-[6px] -rotate-45' : ''}`}></span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <Modal isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)}>
        <Login
          onOpenRegister={() => { setIsLoginModalOpen(false); setIsSignupModalOpen(true); }}
          closeLoginModal={() => setIsLoginModalOpen(false)}
        />
      </Modal>

      <Modal isOpen={isSignupModalOpen} onClose={() => setIsSignupModalOpen(false)}>
        <SignUp
          onOpenLogin={() => { setIsSignupModalOpen(false); setIsLoginModalOpen(true); }}
          onClose={() => setIsSignupModalOpen(false)}
        />
      </Modal>
    </>
  );
}

export default Header;
