import './About.css';


function About() {
    return (
        <section id="about" className="about-section">
            <div className="container">
                <h2 className="section-title">About Blood Donation</h2>
                <div className="about-content">
                    <div className="about-text">
                        <h3>Our Mission</h3>
                        <p>Connecting blood donors with those in need to save lives in out community. Every donation makes a difference</p>

                        <h3>Why Donate Blood?</h3>
                        <ul>
                            <li>One donation can save up to 3 lives</li>
                            <li>Blood cannot be manufactured - it can only come from donors</li>
                            <li>Someone needs blood every 2 seconds</li>
                            <li>Only 3% of age-eligible people donate blood yearly</li>
                        </ul>

                        <h3>Donation Requirements</h3>
                        <ul>
                            <li>Age: 17+ years old (16 with parental consent)</li>
                            <li>Weight: At least 49.90 Kilograms</li>
                            <li>Good general health</li>
                            <li>Wait 56 days between whole blood donations</li>
                        </ul>
                    </div>
                    <div className="blood-types-chart">
                        <h3>Blood Compatibility Chart</h3>
                        <div className="compatibility-grid">
                            <div className="blood-type-card">
                                <div className="blood-type">O-</div>
                                <div className="compatibility">Universal Donor</div>
                            </div>
                            <div className="blood-type-card">
                                <div className="blood-type">AB+</div>
                                <div className="compatibility">Universal Recipient</div>
                            </div>
                            <div className="blood-type-card">
                                <div className="blood-type">O+</div>
                                <div className="compatibility">Most Common</div>
                            </div>
                            <div className="blood-type-card">
                                <div className="blood-type">AB-</div>
                                <div className="compatibility">Rarest Type</div>
                            </div>

                        </div>
                    </div>
                </div>
            </div>
         </section>
    )
}

export default About;