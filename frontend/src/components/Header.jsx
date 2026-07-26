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

            <nav className={`justify-self-center self-center w-full z-[1100] lg:relative lg:block lg:top-auto lg:left-auto lg:right-auto lg:bg-transparent ${isNavOpen ? 'block absolute top-full left-0 right-0 bg-black/95 backdrop-blur-lg border-b border-white/10 animate-fade-in' : 'hidden'}`}>
              <ul onClick={handleNavLinkClick} className="flex gap-[15px] items-center list-none m-0 p-0 lg:flex-row flex-col max-lg:gap-2.5 max-lg:py-5 max-lg:px-6 max-lg:items-stretch">
                <li><a href="#home" className="font-semibold text-sm py-2 px-3 transition-all duration-200 text-gray-300 hover:text-white hover:bg-white/5 rounded-lg inline-block w-full text-center lg:text-left">Home</a></li>
                <li><a href="#search" className="font-semibold text-sm py-2 px-3 transition-all duration-200 text-gray-300 hover:text-white hover:bg-white/5 rounded-lg inline-block w-full text-center lg:text-left">Find Donors</a></li>
                <li><a href="#register" className="font-semibold text-sm py-2 px-3 transition-all duration-200 text-gray-300 hover:text-white hover:bg-white/5 rounded-lg inline-block w-full text-center lg:text-left">Register</a></li>
                <li><a href="#request-blood" className="font-semibold text-sm py-2 px-3 transition-all duration-200 text-gray-300 hover:text-white hover:bg-white/5 rounded-lg inline-block w-full text-center lg:text-left">Request Blood</a></li>
                {user && <li><a href="#donor-inbox" className="font-semibold text-sm py-2 px-3 transition-all duration-200 text-gray-300 hover:text-white hover:bg-white/5 rounded-lg inline-block w-full text-center lg:text-left">Requests For You</a></li>}
                <li><a href="#about" className="font-semibold text-sm py-2 px-3 transition-all duration-200 text-gray-300 hover:text-white hover:bg-white/5 rounded-lg inline-block w-full text-center lg:text-left">About</a></li>
                <li className="max-lg:mt-2">
                  <a href="tel:011-23359379" className="group border border-red-500 text-red-500 font-bold py-2 px-4 rounded-xl text-decoration-none bg-red-500/10 hover:bg-red-500 hover:text-white hover:scale-[1.03] active:scale-[0.97] transition-all duration-300 text-sm flex items-center justify-center gap-1.5 shadow-md hover:shadow-red-500/20">
                    <svg className="w-4 h-4 shrink-0 transition-transform duration-300 group-hover:rotate-[15deg] group-hover:scale-110" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-2.824-1.806-5.122-4.11-6.928-6.928l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z" />
                    </svg>
                    <span>Emergency Call</span>
                  </a>
                </li>
              </ul>
            </nav>

            <div className="col-start-3 justify-self-end flex items-center gap-2 min-w-max">
              <div className="flex-none inline-flex items-center justify-center rounded-lg whitespace-nowrap min-w-max max-w-[140px] lg:max-w-[220px] overflow-hidden text-ellipsis p-0">
                {user ? (
                  <button onClick={handleLogout} className="font-bold py-2 px-4 text-xs lg:text-sm text-white bg-white/10 hover:bg-red-600 border border-white/10 rounded-lg cursor-pointer transition-all duration-200 shadow-md">
                    Logout
                  </button>
                ) : (
                  <button
                    className="font-bold py-2 px-4 text-xs lg:text-sm text-black bg-white hover:bg-gray-100 border-none rounded-lg cursor-pointer transition-all duration-200 shadow-md hover:scale-[1.02] active:scale-[0.98]"
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
                className="lg:hidden flex flex-col gap-1 w-9 h-7 bg-transparent border-none p-1 cursor-pointer items-center justify-center z-[1200] relative"
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
