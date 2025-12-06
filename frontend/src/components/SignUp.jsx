// src/components/Signup.jsx
import React, { useState } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { setDoc, doc } from "firebase/firestore";
import { auth, db } from "../firebase";
import { toast } from "react-toastify";

function Signup({ onOpenLogin, onClose }) {
  const [signupFullname, setSignupFullname] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const resetForm = () => {
    setSignupFullname("");
    setSignupEmail("");
    setSignupPassword("");
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        signupEmail,
        signupPassword
      );
      const user = userCredential.user;
      if (user) {
        await setDoc(doc(db, "Users", user.uid), {
          email: user.email,
          fullname: signupFullname,
          createdAt: new Date().toISOString(),
        });
      }

      toast.success("User Registered Successfully", { position: "top-center" });

      // close signup modal (if parent provided onClose)
      if (typeof onClose === "function") onClose();

      // reset local form state
      resetForm();
    } catch (error) {
      console.error("Signup error:", error);
      const msg = error?.message || "Signup failed";
      toast.error(msg, { position: "bottom-center" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="icon-wrapper">
        <span className="icon">📝</span>
      </div>
      <h2>Sign Up</h2>

      <form onSubmit={handleSignup} className="sign-in-form">
        <label htmlFor="fullname">Full Name</label>
        <input
          type="text"
          name="fullname"
          id="fullname"
          placeholder="Full Name"
          required
          value={signupFullname}
          onChange={(e) => setSignupFullname(e.target.value)}
        />

        <label htmlFor="signup-email">Email</label>
        <input
          type="email"
          name="email"
          id="signup-email"
          placeholder="Email"
          required
          value={signupEmail}
          onChange={(e) => setSignupEmail(e.target.value)}
        />

        <label htmlFor="signup-password">Password</label>
        <input
          type="password"
          name="password"
          id="signup-password"
          placeholder="Password"
          required
          value={signupPassword}
          onChange={(e) => setSignupPassword(e.target.value)}
        />

        <button className="submit-btn" type="submit" disabled={loading}>
          {loading ? "Creating..." : "Create Account"}
        </button>
      </form>

      <div className="signin-footer">
        <span>Already have an account?</span>
        <button
          className="register-btn"
          onClick={(e) => {
            e.preventDefault();
            if (typeof onClose === "function") onClose(); // close signup modal first
            if (typeof onOpenLogin === "function") onOpenLogin();
          }}
        >
          Login
        </button>
      </div>
    </>
  );
}

export default Signup;
