// src/components/Footer.jsx
function Footer() {
    return (
        <footer className="bg-slate-950 text-white py-16 border-t border-white/5">
            <div className="max-w-5xl mx-auto px-6">
                <div className="grid md:grid-cols-3 gap-10 mb-12">
                    <div>
                        <h4 className="text-xl font-extrabold mb-3 bg-gradient-to-r from-red-500 to-rose-500 bg-clip-text text-transparent">LifeLink</h4>
                        <p className="text-slate-400 text-sm leading-relaxed font-medium">Connecting blood donors with those in need to save lives in real-time.</p>
                    </div>
                    <div>
                        <h4 className="text-sm font-extrabold uppercase tracking-wider text-slate-200 mb-4">Quick Links</h4>
                        <ul className="list-none p-0 space-y-2.5">
                            {[['#home','Home'],['#search','Find Donors'],['#register','Register'],['#about','About']].map(([href, label]) => (
                                <li key={href}><a href={href} className="text-slate-400 no-underline text-sm hover:text-white transition-colors font-medium">{label}</a></li>
                            ))}
                        </ul>
                    </div>
                    <div>
                        <h4 className="text-sm font-extrabold uppercase tracking-wider text-slate-200 mb-4">Emergency Contact</h4>
                        <p className="text-red-500 font-extrabold text-lg mb-2 flex items-center gap-2"><span>📞</span> <span>011-23359379</span></p>
                        <p className="text-slate-400 text-sm font-medium">National Helpline available 24/7 for urgent blood requirements.</p>
                    </div>
                </div>
                <div className="border-t border-white/5 pt-8 text-center text-slate-500 text-xs font-medium">
                    <p>© {new Date().getFullYear()} LifeLink. All rights reserved. | <a href="#" className="text-slate-400 hover:text-white transition-colors mr-3">Privacy Policy</a> | <a href="#" className="text-slate-400 hover:text-white transition-colors">Terms of Service</a></p>
                </div>
            </div>
        </footer>
    );
}

export default Footer;