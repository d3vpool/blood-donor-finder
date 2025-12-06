// src/components/Header.jsx
import React, { useState, useEffect } from 'react';
import './Header.css';
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
    <header className="header">
      <div className="container">
        <div className="header-contents">
          <div className="logo">
            <h1>LifeLink</h1>
          </div>

          <nav className={`nav ${isNavOpen ? 'nav-open' : ''}`}>
            <ul onClick={handleNavLinkClick}>
              <li><a href="#home">Home</a></li>
              <li><a href="#search">Find Donors</a></li>
              <li><a href="#register">Register</a></li>
              <li><a href="#about">About</a></li>
              <li><a href="tel:011-23359379" className="emergency-button">Emergency</a></li>
            </ul>
          </nav>

          {/* NEW: wrap login + hamburger */}
          <div className="right-controls">
            <div className="user-login">
              <ul>
                <li>
                  {user ? (
                    <button onClick={handleLogout} className="logout-btn">
                      Logout
                    </button>
                  ) : (
                    <a
                      href="#"
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
              className={`mobile-menu-toggle ${isNavOpen ? 'open' : ''}`}
              aria-label={isNavOpen ? "Close menu" : "Open menu"}
              aria-expanded={isNavOpen}
              onClick={() => setIsNavOpen(v => !v)}
            >
              <span></span>
              <span></span>
              <span></span>
            </button>
          </div>
        </div>
      </div>

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
    </header>
  );
}

export default Header;
