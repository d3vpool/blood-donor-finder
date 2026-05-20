// src/components/Signup.jsx
import React, { useState } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { setDoc, doc } from "firebase/firestore";
import { auth, db } from "../firebase";
import { toast } from "react-toastify";

const inputClass = "w-full py-2.5 px-3.5 bg-gray-100 border border-gray-200 rounded-lg text-[15px] mb-1 focus:outline-none focus:border-blue-500 transition-colors";
const labelClass = "text-sm font-medium text-[#3a5371] mb-1 block";

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
    <>
      <div className="mb-4 bg-gray-50 p-3.5 rounded-full shadow-sm">
        <span className="text-3xl">📝</span>
      </div>
      <h2 className="mb-2 text-2xl font-medium text-gray-900 text-center">Sign Up</h2>

      <form onSubmit={handleSignup} className="w-full flex flex-col gap-3 mb-5">
        <div>
          <label htmlFor="fullname" className={labelClass}>Full Name</label>
          <input
            type="text"
            name="fullname"
            id="fullname"
            placeholder="Full Name"
            required
            value={signupFullname}
            onChange={(e) => setSignupFullname(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="signup-email" className={labelClass}>Email</label>
          <input
            type="email"
            name="email"
            id="signup-email"
            placeholder="Email"
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
            placeholder="Password"
            required
            value={signupPassword}
            onChange={(e) => setSignupPassword(e.target.value)}
            className={inputClass}
          />
        </div>
        <button
          className="mt-3 w-full bg-gray-900 text-white border-none py-2.5 text-base rounded-lg font-semibold cursor-pointer transition-colors hover:bg-blue-500 disabled:opacity-60"
          type="submit"
          disabled={loading}
        >
          {loading ? "Creating..." : "Create Account"}
        </button>
      </form>

      <div className="text-gray-500 font-semibold mt-3 flex items-center gap-1.5 justify-center text-[15px]">
        <span>Already have an account?</span>
        <button
          className="bg-transparent border-none text-blue-500 font-semibold cursor-pointer px-1 hover:underline"
          onClick={(e) => {
            e.preventDefault();
            if (typeof onClose === "function") onClose();
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
