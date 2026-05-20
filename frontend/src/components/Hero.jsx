import { useState, useEffect } from 'react';
import { auth, db } from "../firebase";
import { doc, getDoc } from 'firebase/firestore';

function Hero() {
    const [user, setUser] = useState(null);
    const [userName, setUserName] = useState('');

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
            setUser(currentUser);
            if (currentUser) {
                const userDoc = await getDoc(doc(db, "Users", currentUser.uid));
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
        <section id="home" className="bg-gradient-to-br from-black to-gray-800 text-white py-28 text-center">
            <div className="max-w-3xl mx-auto px-6">

                {user && userName && (
                    <div className="text-xl font-medium text-red-400 mb-5 animate-[fadeInDown_0.6s_ease-out]">
                        Welcome back, <span className="font-bold text-red-500">{userName}</span>! 👋
                    </div>
                )}

                <h1 className="text-4xl md:text-5xl font-bold mb-5 leading-tight">
                    Every Drop Counts.<br />
                    Every Life Matters.
                </h1>
                <p className="text-lg text-white/90 mb-8 leading-relaxed">
                    Connect with blood donors in your area and help save lives. Join our community of heroes making a difference.
                </p>

                <div className="flex gap-4 justify-center flex-wrap mb-5">
                    <a href="#search" className="py-3 px-6 rounded-md font-medium transition-all duration-300 no-underline bg-[#ff6b35] text-white hover:opacity-90">
                        Find Donors Now
                    </a>
                    <a href="#register" className="py-3 px-6 rounded-md font-medium transition-all duration-300 no-underline bg-transparent border-2 border-white text-white hover:bg-white hover:text-[#ff6b35]">
                        Become a Donor
                    </a>
                    <a href="#request-blood" className="py-3 px-6 rounded-md font-medium transition-all duration-300 no-underline bg-[#e74c3c] text-white border-2 border-[#e74c3c] hover:bg-transparent hover:text-white">
                        🆘 Request Blood
                    </a>
                </div>

                <div className="grid grid-cols-3 gap-10 max-w-lg mx-auto mt-10">
                    <div>
                        <div className="text-3xl font-bold text-[#ff6b35] mb-2">12,000+</div>
                        <div className="text-sm text-white/80">Donations Needed Daily</div>
                    </div>
                    <div>
                        <div className="text-3xl font-bold text-[#ff6b35] mb-2">3</div>
                        <div className="text-sm text-white/80">Lives Saved Per Donation</div>
                    </div>
                    <div>
                        <div className="text-3xl font-bold text-[#ff6b35] mb-2">56</div>
                        <div className="text-sm text-white/80">Days Between Donations</div>
                    </div>
                </div>
            </div>
        </section>
    );
}

export default Hero;