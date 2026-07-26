import { signInWithEmailAndPassword } from 'firebase/auth';
import React, { useState } from 'react';
import { auth } from "../firebase";
import { toast } from "react-toastify";

const inputClass = "w-full py-3 px-4 border border-slate-200 rounded-xl text-sm font-semibold bg-slate-50 text-slate-900 focus:outline-none focus:border-red-500 focus:ring-4 focus:ring-red-500/10 focus:bg-white transition-all duration-200 shadow-sm hover:border-slate-300";
const labelClass = "block text-[10px] uppercase tracking-wider font-extrabold text-slate-400 mb-1.5";

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
        <div className="flex flex-col items-center max-w-sm mx-auto p-2">
            <div className="mb-5 bg-red-50 p-4 rounded-2xl border border-red-100/60 shadow-sm flex items-center justify-center select-none">
                <span className="text-3xl">🔑</span>
            </div>
            <h2 className="mb-1 text-2xl font-extrabold text-slate-900 text-center tracking-tight">Welcome Back</h2>
            <p className="text-xs text-slate-400 font-medium mb-6 text-center leading-relaxed">Sign in to search for local blood donors or manage your volunteer status.</p>

            <form onSubmit={handleSignIn} className="w-full flex flex-col gap-4 mb-4">
                <div>
                    <label htmlFor="login-email" className={labelClass}>Email Address</label>
                    <input
                        type="email"
                        name="email"
                        id="login-email"
                        placeholder="yourname@example.com"
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
                        placeholder="••••••••"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className={inputClass}
                    />
                </div>
                <button
                    className="mt-2 w-full bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white border-none py-3.5 px-8 rounded-xl font-extrabold text-sm cursor-pointer transition-all shadow-md shadow-red-500/10 hover:shadow-lg hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60"
                    type="submit"
                    disabled={loading}
                >
                    {loading ? "Signing in..." : "Get Started"}
                </button>
            </form>

            <div className="text-slate-500 font-bold mt-4 flex items-center gap-1.5 justify-center text-xs uppercase tracking-wider">
                <span>New User?</span>
                <button
                    className="bg-transparent border-none text-red-500 font-extrabold cursor-pointer px-1 hover:text-red-600 transition-colors"
                    onClick={(e) => { e.preventDefault(); onOpenRegister(); }}
                >
                    Sign Up
                </button>
            </div>
        </div>
    );
}

export default Login;
