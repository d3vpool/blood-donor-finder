function Footer() {
    return (
        <footer className="bg-black text-white py-12">
            <div className="max-w-5xl mx-auto px-6">
                <div className="grid md:grid-cols-3 gap-8 mb-8">
                    <div>
                        <h4 className="text-lg font-bold mb-3 text-[#ff6b35]">LifeLink</h4>
                        <p className="text-gray-400 text-sm leading-relaxed">Connecting donors with those in need.</p>
                    </div>
                    <div>
                        <h4 className="text-lg font-bold mb-3">Quick Links</h4>
                        <ul className="list-none p-0 space-y-2">
                            {[['#home','Home'],['#search','Find Donors'],['#register','Register'],['#about','About']].map(([href, label]) => (
                                <li key={href}><a href={href} className="text-gray-400 no-underline text-sm hover:text-white transition-colors">{label}</a></li>
                            ))}
                        </ul>
                    </div>
                    <div>
                        <h4 className="text-lg font-bold mb-3">Emergency Contact</h4>
                        <p className="text-[#e74c3c] font-bold text-lg mb-1">📞 011-23359379</p>
                        <p className="text-gray-400 text-sm">Available 24/7 for urgent blood needs</p>
                    </div>
                </div>
                <div className="border-t border-white/10 pt-6 text-center text-gray-500 text-sm">
                    <p>© 2025 LifeLink. All rights reserved. | <a href="#" className="text-gray-400 hover:text-white transition-colors">Privacy Policy</a> | <a href="#" className="text-gray-400 hover:text-white transition-colors">Terms of Service</a></p>
                </div>
            </div>
        </footer>
    );
}

export default Footer;