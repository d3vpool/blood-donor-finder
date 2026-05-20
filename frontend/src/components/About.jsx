

function About() {
    return (
        <section id="about" className="py-20 bg-gray-50">
            <div className="max-w-5xl mx-auto px-6">
                <h2 className="text-3xl font-bold text-center mb-12">About Blood Donation</h2>
                <div className="grid md:grid-cols-2 gap-10 items-start">
                    <div>
                        <h3 className="text-xl font-semibold mb-3 text-gray-800">Our Mission</h3>
                        <p className="text-gray-600 mb-6 leading-relaxed">Connecting blood donors with those in need to save lives in our community. Every donation makes a difference.</p>

                        <h3 className="text-xl font-semibold mb-3 text-gray-800">Why Donate Blood?</h3>
                        <ul className="text-gray-600 space-y-2 mb-6 list-none pl-0">
                            <li className="flex items-start gap-2"><span className="text-[#ff6b35] mt-0.5">✓</span> One donation can save up to 3 lives</li>
                            <li className="flex items-start gap-2"><span className="text-[#ff6b35] mt-0.5">✓</span> Blood cannot be manufactured — it can only come from donors</li>
                            <li className="flex items-start gap-2"><span className="text-[#ff6b35] mt-0.5">✓</span> Someone needs blood every 2 seconds</li>
                            <li className="flex items-start gap-2"><span className="text-[#ff6b35] mt-0.5">✓</span> Only 3% of age-eligible people donate blood yearly</li>
                        </ul>

                        <h3 className="text-xl font-semibold mb-3 text-gray-800">Donation Requirements</h3>
                        <ul className="text-gray-600 space-y-2 list-none pl-0">
                            <li className="flex items-start gap-2"><span className="text-[#ff6b35] mt-0.5">✓</span> Age: 17+ years old (16 with parental consent)</li>
                            <li className="flex items-start gap-2"><span className="text-[#ff6b35] mt-0.5">✓</span> Weight: At least 49.90 Kilograms</li>
                            <li className="flex items-start gap-2"><span className="text-[#ff6b35] mt-0.5">✓</span> Good general health</li>
                            <li className="flex items-start gap-2"><span className="text-[#ff6b35] mt-0.5">✓</span> Wait 56 days between whole blood donations</li>
                        </ul>
                    </div>

                    <div>
                        <h3 className="text-xl font-semibold mb-5 text-gray-800">Blood Compatibility Chart</h3>
                        <div className="grid grid-cols-2 gap-4">
                            {[
                                { type: 'O-', label: 'Universal Donor' },
                                { type: 'AB+', label: 'Universal Recipient' },
                                { type: 'O+', label: 'Most Common' },
                                { type: 'AB-', label: 'Rarest Type' },
                            ].map(({ type, label }) => (
                                <div key={type} className="bg-white rounded-xl p-5 text-center shadow-sm border border-gray-100 hover:shadow-md hover:-translate-y-0.5 transition-all">
                                    <div className="text-3xl font-bold text-[#e74c3c] mb-1">{type}</div>
                                    <div className="text-sm text-gray-500 font-medium">{label}</div>
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