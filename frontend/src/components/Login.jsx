import { signInWithEmailAndPassword } from 'firebase/auth';
import React, { useState } from 'react';
import { auth } from "../firebase";
import { toast } from "react-toastify";

const inputClass = "w-full py-2.5 px-3.5 bg-gray-100 border border-gray-200 rounded-lg text-[15px] mb-1 focus:outline-none focus:border-blue-500 transition-colors";
const labelClass = "text-sm font-medium text-[#3a5371] mb-1 block";

function Login({ onOpenRegister, closeLoginModal }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSignIn = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await signInWithEmailAndPassword(auth, email, password);
            toast.success("Logged in successfully", { position: "top-center" });
            closeLoginModal();
        } catch (error) {
            toast.error(error.message, { position: "bottom-center" });
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <div className="mb-4 bg-gray-50 p-3.5 rounded-full shadow-sm">
                <span className="text-3xl">🔑</span>
            </div>
            <h2 className="mb-2 text-2xl font-medium text-gray-900 text-center">Login</h2>

            <form onSubmit={handleSignIn} className="w-full flex flex-col gap-3 mb-5">
                <div>
                    <label htmlFor="login-email" className={labelClass}>Email</label>
                    <input
                        type="email"
                        name="email"
                        id="login-email"
                        placeholder="Email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className={inputClass}
                    />
                </div>
                <div>
                    <label htmlFor="login-password" className={labelClass}>Password</label>
                    <input
                        type="password"
                        name="password"
                        id="login-password"
                        placeholder="Password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className={inputClass}
                    />
                </div>
                <button
                    className="mt-3 w-full bg-gray-900 text-white border-none py-2.5 text-base rounded-lg font-semibold cursor-pointer transition-colors hover:bg-blue-500 disabled:opacity-60"
                    type="submit"
                    disabled={loading}
                >
                    {loading ? "Signing in..." : "Get Started"}
                </button>
            </form>

            <div className="text-gray-500 font-semibold mt-3 flex items-center gap-1.5 justify-center text-[15px]">
                <span>New User?</span>
                <button
                    className="bg-transparent border-none text-blue-500 font-semibold cursor-pointer px-1 hover:underline"
                    onClick={(e) => { e.preventDefault(); onOpenRegister(); }}
                >
                    Sign Up
                </button>
            </div>
        </>
    );
}

export default Login;
