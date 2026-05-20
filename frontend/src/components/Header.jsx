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
      <header className="bg-black text-white py-3 shadow-md sticky top-0 z-[1000] w-full">
        <div className="w-full max-w-[1200px] mx-auto px-6">
          <div className="grid grid-cols-[auto_minmax(0,_1fr)_auto] items-center gap-4 w-full relative whitespace-nowrap">
            <div className="col-start-1 justify-self-start self-center">
              <h1 className="text-2xl md:text-3xl font-bold text-white m-0 whitespace-nowrap">LifeLink</h1>
            </div>

            <nav className={`justify-self-center self-center w-full z-[1100] md:relative md:block md:top-auto md:left-auto md:right-auto md:bg-transparent ${isNavOpen ? 'block absolute top-full left-0 right-0 bg-black' : 'hidden'}`}>
              <ul onClick={handleNavLinkClick} className="flex gap-[15px] items-center list-none m-0 p-0 md:flex-row flex-col max-md:gap-2.5 max-md:py-3 max-md:px-5 max-md:items-start">
                <li><a href="#home" className="font-medium py-2 px-3 transition-all duration-300 text-white inline-block hover:bg-brand-red hover:text-white hover:rounded-md animate-duration-300">Home</a></li>
                <li><a href="#search" className="font-medium py-2 px-3 transition-all duration-300 text-white inline-block hover:bg-brand-red hover:text-white hover:rounded-md animate-duration-300">Find Donors</a></li>
                <li><a href="#register" className="font-medium py-2 px-3 transition-all duration-300 text-white inline-block hover:bg-brand-red hover:text-white hover:rounded-md animate-duration-300">Register</a></li>
                <li><a href="#request-blood" className="font-medium py-2 px-3 transition-all duration-300 text-white inline-block hover:bg-brand-red hover:text-white hover:rounded-md animate-duration-300">Request Blood</a></li>
                <li><a href="#about" className="font-medium py-2 px-3 transition-all duration-300 text-white inline-block hover:bg-brand-red hover:text-white hover:rounded-md animate-duration-300">About</a></li>
                <li><a href="tel:011-23359379" className="border-2 border-brand-red text-brand-red py-2 px-4 rounded-lg text-decoration-none bg-transparent hover:bg-brand-red hover:text-white transition-all duration-300">Emergency</a></li>
              </ul>
            </nav>

            <div className="col-start-3 justify-self-end flex items-center gap-1.5 md:gap-2 min-w-max">
              <div className="flex-none inline-flex items-center justify-center bg-white rounded text-black whitespace-nowrap min-w-max max-w-[140px] md:max-w-[220px] overflow-hidden text-ellipsis p-0">
                <ul className="flex items-center list-none m-0 p-0">
                  <li>
                    {user ? (
                      <button onClick={handleLogout} className="font-medium py-1.5 px-2.5 md:py-2 md:px-3 text-sm md:text-base text-black bg-transparent border-none cursor-pointer inline-block leading-none hover:bg-gray-100 hover:text-black hover:rounded">
                        Logout
                      </button>
                    ) : (
                      <a
                        href="#"
                        className="font-medium py-1.5 px-2.5 md:py-2 md:px-3 text-sm md:text-base text-black bg-transparent border-none cursor-pointer inline-block leading-none hover:bg-gray-100 hover:text-black hover:rounded text-decoration-none"
                        onClick={e => {
                          e.preventDefault();
                          setIsLoginModalOpen(true);
                        }}
                      >
                        Login
                      </a>
                    )}
                  </li>
                </ul>
              </div>

              <button
                className="md:hidden flex flex-col gap-1 w-9 h-7 bg-transparent border-none p-1 cursor-pointer items-center justify-center z-[1200]"
                aria-label={isNavOpen ? "Close menu" : "Open menu"}
                aria-expanded={isNavOpen}
                onClick={() => setIsNavOpen(v => !v)}
              >
                <span className={`block w-5.5 h-[2.2px] rounded-sm bg-white transition-all duration-180 relative ${isNavOpen ? 'translate-y-[6px] rotate-45' : ''}`}></span>
                <span className={`block w-5.5 h-[2.2px] rounded-sm bg-white transition-all duration-120 relative ${isNavOpen ? 'opacity-0 scale-x-0' : ''}`}></span>
                <span className={`block w-5.5 h-[2.2px] rounded-sm bg-white transition-all duration-180 relative ${isNavOpen ? '-translate-y-[6px] rotate-[-45deg]' : ''}`}></span>
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
