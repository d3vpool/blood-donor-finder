import { signInWithEmailAndPassword } from 'firebase/auth';
import React, { useState } from 'react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { setDoc, doc } from 'firebase/firestore';
import { auth, db } from "../firebase";
import { toast } from "react-toastify";


function Login({ onOpenRegister, closeLoginModal }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const handleSignIn = async (e) => {
        e.preventDefault();
        // Add your login API/auth logic here
        try{
          await signInWithEmailAndPassword(auth, email, password);
          console.log("User logged in successfully");
          toast.success("User logged in successfully",{position:"top-center"});
          closeLoginModal();
        } catch(error){
          console.log(error.message);
          toast.error(error.message,{position:"bottom-center"});
        }
        console.log("Email:", email);
        console.log("Password:", password);
    };

    return (
        <>
            <div className="icon-wrapper">
                <span className="icon">🔑</span>
            </div>
            <h2>Login</h2>
            <form onSubmit={handleSignIn} className="sign-in-form">
                <label htmlFor="email">Email</label>
                <input
                    type="email"
                    name="email"
                    id="email"
                    placeholder="Email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                />
                <label htmlFor="password">Password</label>
                <input
                    type="password"
                    name="password"
                    id="password"
                    placeholder="Password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                />
                <button className="submit-btn" type="submit">Get Started</button>
            </form>
            <div className="signin-footer">
                <span>New User?</span>
                <button
                    className="register-btn"
                    onClick={(e) => {
                        e.preventDefault();
                        onOpenRegister();
                    }}
                >
                    Sign Up
                </button>
            </div>
        </>
    );
}

export default Login;
