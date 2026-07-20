import React from 'react';

function About() {
    return (
        <section id="about" className="py-24 bg-slate-50 border-t border-slate-100">
            <div className="max-w-5xl mx-auto px-6">
                <div className="text-center max-w-lg mx-auto mb-16">
                    <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight mb-3">About Blood Donation</h2>
                    <p className="text-sm text-slate-500 leading-relaxed">Understanding blood donation types, eligibility criteria, and how every registration helps save lives.</p>
                </div>

                <div className="grid md:grid-cols-2 gap-12 items-start">
                    <div className="space-y-8">
                        <div>
                            <h3 className="text-xs uppercase tracking-wider font-extrabold text-slate-400 mb-2">Our Mission</h3>
                            <p className="text-slate-600 leading-relaxed font-medium">Connecting blood donors with those in need to save lives in our community. Every donation makes a difference.</p>
                        </div>

                        <div>
                            <h3 className="text-xs uppercase tracking-wider font-extrabold text-slate-400 mb-3">Why Donate Blood?</h3>
                            <ul className="space-y-3 list-none pl-0 font-medium text-slate-600 text-sm">
                                <li className="flex items-start gap-3">
                                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-red-50 text-red-600 font-extrabold text-[10px] shrink-0 mt-0.5 border border-red-100">✓</span>
                                    <span>One donation can save up to 3 lives</span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-red-50 text-red-600 font-extrabold text-[10px] shrink-0 mt-0.5 border border-red-100">✓</span>
                                    <span>Blood cannot be manufactured — it can only come from donors</span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-red-50 text-red-600 font-extrabold text-[10px] shrink-0 mt-0.5 border border-red-100">✓</span>
                                    <span>Someone needs blood every 2 seconds</span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-red-50 text-red-600 font-extrabold text-[10px] shrink-0 mt-0.5 border border-red-100">✓</span>
                                    <span>Only 3% of age-eligible people donate blood yearly</span>
                                </li>
                            </ul>
                        </div>

                        <div>
                            <h3 className="text-xs uppercase tracking-wider font-extrabold text-slate-400 mb-3">Donation Requirements</h3>
                            <ul className="space-y-3 list-none pl-0 font-medium text-slate-600 text-sm">
                                <li className="flex items-start gap-3">
                                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-red-50 text-red-600 font-extrabold text-[10px] shrink-0 mt-0.5 border border-red-100">✓</span>
                                    <span>Age: 17+ years old (16 with parental consent)</span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-red-50 text-red-600 font-extrabold text-[10px] shrink-0 mt-0.5 border border-red-100">✓</span>
                                    <span>Weight: At least 49.90 Kilograms</span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-red-50 text-red-600 font-extrabold text-[10px] shrink-0 mt-0.5 border border-red-100">✓</span>
                                    <span>Good general health</span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-red-50 text-red-600 font-extrabold text-[10px] shrink-0 mt-0.5 border border-red-100">✓</span>
                                    <span>Wait 56 days between whole blood donations</span>
                                </li>
                            </ul>
                        </div>
                    </div>

                    <div>
                        <h3 className="text-xs uppercase tracking-wider font-extrabold text-slate-400 mb-5">Blood Compatibility Chart</h3>
                        <div className="grid grid-cols-2 gap-4">
                            {[
                                { type: 'O-', label: 'Universal Donor' },
                                { type: 'AB+', label: 'Universal Recipient' },
                                { type: 'O+', label: 'Most Common' },
                                { type: 'AB-', label: 'Rarest Type' },
                            ].map(({ type, label }) => (
                                <div key={type} className="bg-white rounded-2xl p-6 text-center shadow-[0_2px_8px_rgba(15,23,42,0.02)] border border-slate-100 hover:shadow-xl hover:shadow-slate-100/80 hover:-translate-y-1 transition-all duration-300">
                                    <div className="text-4xl font-extrabold text-red-600 mb-1">{type}</div>
                                    <div className="text-xs uppercase tracking-wider text-slate-500 font-extrabold">{label}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}

export default About;