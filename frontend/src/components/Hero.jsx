import { useState, useEffect } from 'react';
import { auth, db } from "../firebase";
import { doc, getDoc } from 'firebase/firestore';
import './Hero.css';

function Hero() {

    const [user, setUser] = useState(null);
    const [userName, setUserName] = useState('');

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
            setUser(currentUser);

            if(currentUser) {
                const userDoc = await getDoc(doc(db, "Users", currentUser.uid));
                if(userDoc.exists()){
                    const fullname = userDoc.data().fullname || '';
                    //Extract first name
                    const firstName = fullname.split(' ')[0];
                    setUserName(firstName);
                }
            } else {
                setUserName('');
            }
        });
        return () => unsubscribe();
    }, []);
    
    return (
        <section id="home" className="hero">
            <div className="container">
                <div className="hero-content">

                    {/* Welcome message - only shows when logged in */}
                    {user && userName && (
                        <div className="hero-welcome">
                            Welcome back, <span className="hero-welcome-name">{userName}</span>! 👋
                        </div>
                    )}

                    <h1 className="hero-title">
                        Every Drop Counts.<br />
                        Every Life Matters.
                    </h1>
                    <p className="hero-subtitle">
                        Connect with blood donors in your area and help save lives. Join out communty of heroes making a difference.
                    </p>
                    <div className="hero-action">
                        <a href="#search" className="hero-search-button">Find Donors Now</a>
                        <a href="#register" className="hero-register-button">Become a Donor</a>
                    </div>
                    <div className="hero-stats">
                        <div className="stat">
                            <div className="stat-number">12,000+</div>
                            <div className="stat-label">Donations Needed Daily</div>
                        </div>
                        <div className="stat">
                            <div className="stat-number">3</div>
                            <div className="stat-label">Lives Saved Per Donation</div>
                        </div>
                        <div className="stat">
                            <div className="stat-number">56</div>
                            <div className="stat-label">Days Between Donations</div>
                        </div>
                    </div>
                </div>
            </div>

        </section>
    )
}

export default Hero;