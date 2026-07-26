// src/components/SignUp.jsx
import React, { useState } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { setDoc, doc } from "firebase/firestore";
import { auth, db } from "../firebase";
import { toast } from "react-toastify";

const inputClass = "w-full py-3 px-4 border border-slate-200 rounded-xl text-sm font-semibold bg-slate-50 text-slate-900 focus:outline-none focus:border-red-500 focus:ring-4 focus:ring-red-500/10 focus:bg-white transition-all duration-200 shadow-sm hover:border-slate-300";
const labelClass = "block text-[10px] uppercase tracking-wider font-extrabold text-slate-400 mb-1.5";

function Signup({ onOpenLogin, onClose }) {
  const [signupFullname, setSignupFullname] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const resetForm = () => { setSignupFullname(""); setSignupEmail(""); setSignupPassword(""); };

  const handleSignup = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, signupEmail, signupPassword);
      const user = userCredential.user;
      if (user) {
        await setDoc(doc(db, "Users", user.uid), {
          email: user.email,
          fullname: signupFullname,
          createdAt: new Date().toISOString(),
        });
      }
      toast.success("User Registered Successfully", { position: "top-center" });
      if (typeof onClose === "function") onClose();
      resetForm();
    } catch (error) {
      console.error("Signup error:", error);
      toast.error(error?.message || "Signup failed", { position: "bottom-center" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center max-w-sm mx-auto p-2">
      <div className="mb-5 bg-red-50 p-4 rounded-2xl border border-red-100/60 shadow-sm flex items-center justify-center select-none">
        <span className="text-3xl">📝</span>
      </div>
      <h2 className="mb-1 text-2xl font-extrabold text-slate-900 text-center tracking-tight">Create Account</h2>
      <p className="text-xs text-slate-400 font-medium mb-6 text-center leading-relaxed">Join LifeLink to request emergency blood or volunteer as a donor.</p>

      <form onSubmit={handleSignup} className="w-full flex flex-col gap-4 mb-4">
        <div>
          <label htmlFor="fullname" className={labelClass}>Full Name</label>
          <input
            type="text"
            name="fullname"
            id="fullname"
            placeholder="John Doe"
            required
            value={signupFullname}
            onChange={(e) => setSignupFullname(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="signup-email" className={labelClass}>Email Address</label>
          <input
            type="email"
            name="email"
            id="signup-email"
            placeholder="yourname@example.com"
            required
            value={signupEmail}
            onChange={(e) => setSignupEmail(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="signup-password" className={labelClass}>Password</label>
          <input
            type="password"
            name="password"
            id="signup-password"
            placeholder="••••••••"
            required
            value={signupPassword}
            onChange={(e) => setSignupPassword(e.target.value)}
            className={inputClass}
          />
        </div>
        <button
          className="mt-2 w-full bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white border-none py-3.5 px-8 rounded-xl font-extrabold text-sm cursor-pointer transition-all shadow-md shadow-red-500/10 hover:shadow-lg hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60"
          type="submit"
          disabled={loading}
        >
          {loading ? "Creating Account..." : "Create Account"}
        </button>
      </form>

      <div className="text-slate-500 font-bold mt-4 flex items-center gap-1.5 justify-center text-xs uppercase tracking-wider">
        <span>Already have an account?</span>
        <button
          className="bg-transparent border-none text-red-500 font-extrabold cursor-pointer px-1 hover:text-red-600 transition-colors"
          onClick={(e) => {
            e.preventDefault();
            if (typeof onClose === "function") onClose();
            if (typeof onOpenLogin === "function") onOpenLogin();
          }}
        >
          Login
        </button>
      </div>
    </div>
  );
}

export default Signup;
