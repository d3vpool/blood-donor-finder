import './Footer.css';

function Footer() {
    return (
        <footer className="footer">
            <div className="container">
                <div className="footer-content">
                    <div className="footer-section">
                        <h4>LifeLink</h4>
                        <p>Connecting donors with those in need.</p>
                    </div>
                    <div className="footer-section">
                        <h4>Quick Links</h4>
                        <ul>
                            <li><a href="#home">Home</a></li>
                            <li><a href="#search">Find Donors</a></li>
                            <li><a href="#register">Register</a></li>
                            <li><a href="#about">About</a></li>
                        </ul>
                    </div>
                    <div className="footer-section">
                        <h4>Emergency Contact</h4>
                        <p className="emergency-number">[Call Icon Image] 011-23359379</p>
                        <p>Available 24/7 for urgent blood needs</p>
                    </div>
                </div>
                <div className="footer-bottom">
                    <p>&copy; 2025 LifeLink. All rights reserved. | <a href="#">Privacy Policy</a> | <a href="#">Terms of Service</a></p>
                </div>
            </div>
        </footer>
    )
}

export default Footer;