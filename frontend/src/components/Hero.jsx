import { useState, useEffect } from 'react';
import { auth, db } from "../firebase";
import { doc, getDoc } from 'firebase/firestore';
import { isRealUser } from "../utils/authUser";

function Hero() {
    const [user, setUser] = useState(null);
    const [userName, setUserName] = useState('');

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
            const realUser = isRealUser(currentUser) ? currentUser : null;
            setUser(realUser);
            if (realUser) {
                const userDoc = await getDoc(doc(db, "Users", realUser.uid));
                if (userDoc.exists()) {
                    const firstName = (userDoc.data().fullname || '').split(' ')[0];
                    setUserName(firstName);
                }
            } else {
                setUserName('');
            }
        });
        return () => unsubscribe();
    }, []);

    return (
        <section 
            id="home" 
            className="relative overflow-hidden text-white py-32 text-center border-b border-white/5"
            style={{ background: 'radial-gradient(ellipse at top, #0f172a 0%, #090d16 65%, #02040a 100%)' }}
        >
            {/* Ambient glowing blobs */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-red-600/10 rounded-full blur-[140px] pointer-events-none"></div>
            <div className="absolute bottom-0 right-10 w-[300px] h-[150px] bg-rose-600/5 rounded-full blur-[100px] pointer-events-none"></div>

            <div className="relative max-w-4xl mx-auto px-6 z-10">
                {user && userName && (
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 font-bold text-xs md:text-sm mb-8 animate-fade-in shadow-[0_2px_15px_rgba(239,68,68,0.08)]">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
                        Welcome back, <span className="text-white">{userName}</span>! 👋
                    </div>
                )}

                <h1 className="text-4xl md:text-6xl font-extrabold mb-6 leading-tight tracking-tight animate-slide-up">
                    Every Drop Counts.<br />
                    Every <span className="text-red-600">Life Matters.</span>
                </h1>
                <p className="text-sm md:text-lg text-slate-300 max-w-xl mx-auto mb-10 leading-relaxed font-medium animate-slide-up [animation-delay:150ms]">
                    Connect with blood donors in your area and help save lives. Join our community of everyday heroes making a difference.
                </p>

                <div className="flex gap-4 justify-center flex-wrap mb-16 animate-slide-up [animation-delay:300ms]">
                    <a href="#search" className="py-3.5 px-8 rounded-xl font-bold transition-all duration-200 no-underline bg-gradient-to-r from-red-500 to-rose-600 text-white hover:from-red-600 hover:to-rose-700 hover:scale-[1.03] active:scale-[0.98] shadow-lg shadow-red-500/20">
                        Find Donors Now
                    </a>
                    <a href="#register" className="py-3.5 px-8 rounded-xl font-bold transition-all duration-200 no-underline bg-white/10 border border-white/20 text-white hover:bg-white hover:text-slate-950 hover:scale-[1.03] active:scale-[0.98]">
                        Become a Donor
                    </a>
                    <a href="#request-blood" className="py-3.5 px-8 rounded-xl font-bold transition-all duration-200 no-underline bg-slate-900 border border-red-500/30 text-red-400 hover:bg-slate-800 hover:scale-[1.03] active:scale-[0.98] shadow-md">
                        🆘 Request Blood
                    </a>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto mt-6 animate-slide-up [animation-delay:450ms]">
                    <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-xl hover:border-white/20 hover:-translate-y-1 hover:shadow-red-500/5 transition-all duration-300">
                        <div className="text-3xl md:text-4xl font-extrabold text-red-500 mb-2">12,000+</div>
                        <div className="text-xs uppercase tracking-wider text-slate-400 font-bold">Donations Needed Daily</div>
                    </div>
                    <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-xl hover:border-white/20 hover:-translate-y-1 hover:shadow-red-500/5 transition-all duration-300">
                        <div className="text-3xl md:text-4xl font-extrabold text-red-500 mb-2">3</div>
                        <div className="text-xs uppercase tracking-wider text-slate-400 font-bold">Lives Saved Per Donation</div>
                    </div>
                    <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-xl hover:border-white/20 hover:-translate-y-1 hover:shadow-red-500/5 transition-all duration-300">
                        <div className="text-3xl md:text-4xl font-extrabold text-red-500 mb-2">56</div>
                        <div className="text-xs uppercase tracking-wider text-slate-400 font-bold">Days Between Donations</div>
                    </div>
                </div>
            </div>
        </section>
    );
}

export default Hero;