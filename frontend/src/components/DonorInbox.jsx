import React, { useState, useEffect } from "react";
import { collection, query, where, onSnapshot, doc, getDoc, updateDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../firebase";
import { toast } from "react-toastify";

const DonorInbox = () => {
    const [incomingRequests, setIncomingRequests] = useState([]);
    const [donorProfile, setDonorProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [respondingId, setRespondingId] = useState(null);

    useEffect(() => {
        let firestoreUnsub = null;

        const authUnsub = onAuthStateChanged(auth, async (user) => {
            if (firestoreUnsub) {
                firestoreUnsub();
                firestoreUnsub = null;
            }

            if (!user) {
                setIncomingRequests([]);
                setDonorProfile(null);
                setLoading(false);
                return;
            }

            // Fetch donor profile to know their registered blood group
            try {
                const donorSnap = await getDoc(doc(db, "Donors", user.uid));
                let profile = null;
                if (donorSnap.exists()) {
                    profile = { id: donorSnap.id, ...donorSnap.data() };
                    setDonorProfile(profile);
                }
            } catch (err) {
                console.error("Error fetching donor profile:", err);
            }

            // Listen to all pending blood requests
            const requestsRef = collection(db, "BloodRequests");
            const q = query(requestsRef, where("status", "==", "pending"));

            firestoreUnsub = onSnapshot(q, (snapshot) => {
                const matched = [];
                snapshot.forEach((docSnap) => {
                    const data = docSnap.data();
                    const req = { id: docSnap.id, ...data };

                    // Don't show the donor's own requests
                    if (req.userId === user.uid) return;

                    // Match if donor is in nearByDonors array OR matches donor profile blood type
                    const isDirectlyMatched = req.nearByDonors && Array.isArray(req.nearByDonors) &&
                        req.nearByDonors.some((d) => d.id === user.uid || d.uid === user.uid || d.email === user.email);

                    const isBloodTypeMatched = donorProfile && req.bloodType === donorProfile.bloodType;

                    if (isDirectlyMatched || isBloodTypeMatched) {
                        matched.push(req);
                    }
                });

                matched.sort((a, b) => new Date(b.requestedAt || Date.now()) - new Date(a.requestedAt || Date.now()));
                setIncomingRequests(matched);
                setLoading(false);
            }, (error) => {
                console.error("Error listening to donor inbox requests:", error);
                setLoading(false);
            });
        });

        return () => {
            authUnsub();
            if (firestoreUnsub) firestoreUnsub();
        };
    }, [donorProfile?.bloodType]);

    const handleAcceptRequest = async (reqId) => {
        if (!auth.currentUser) return;
        setRespondingId(reqId);
        try {
            await updateDoc(doc(db, "BloodRequests", reqId), {
                acceptedBy: auth.currentUser.uid,
                acceptedByName: donorProfile?.fullname || auth.currentUser.email || "A Hero Donor",
                status: "fulfilled"
            });
            toast.success("Thank you! You have accepted this emergency blood request. Please contact the requestor immediately.", { position: "top-center" });
        } catch (error) {
            console.error("Error accepting request:", error);
            toast.error("Could not update request status.", { position: "top-center" });
        } finally {
            setRespondingId(null);
        }
    };

    if (loading) {
        return (
            <section id="donor-inbox" className="py-24 bg-slate-50 border-t border-slate-100">
                <div className="max-w-4xl mx-auto px-6 text-center">
                    <div className="flex flex-col items-center justify-center gap-3">
                        <svg className="animate-spin h-8 w-8 text-red-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <p className="text-slate-500 font-bold text-sm">Checking emergency requests near you...</p>
                    </div>
                </div>
            </section>
        );
    }

    if (!auth.currentUser || incomingRequests.length === 0) {
        return null;
    }

    const urgencyColors = {
        Critical: "text-red-700 bg-red-50 border-red-200",
        Urgent: "text-amber-700 bg-amber-50 border-amber-200",
        Standard: "text-blue-700 bg-blue-50 border-blue-200"
    };

    return (
        <section id="donor-inbox" className="py-24 bg-gradient-to-b from-red-50/50 to-white border-t border-slate-100">
            <div className="max-w-4xl mx-auto px-6">
                <div className="text-center max-w-lg mx-auto mb-12">
                    <div className="inline-flex items-center gap-1.5 bg-red-50 text-red-700 border border-red-100 text-[10px] font-extrabold px-4 py-1.5 rounded-full mb-3 uppercase tracking-wider select-none shadow-[0_2px_10px_rgba(239,68,68,0.05)]">
                        🚨 Emergency Match
                    </div>
                    <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-2">Emergency Requests For You</h2>
                    <p className="text-sm text-slate-500 leading-relaxed font-medium">Patients nearby need blood matching your group. Contact them directly to help save a life.</p>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                    {incomingRequests.map((req) => {
                        const lat = req.location?.latitude ?? req.location?.lat;
                        const lng = req.location?.longitude ?? req.location?.lng;
                        const mapsUrl = (lat != null && lng != null)
                            ? `https://www.google.com/maps?q=${lat},${lng}`
                            : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(req.hospitalName || "Hospital")}`;

                        const isCritical = req.urgency === "Critical";

                        return (
                            <div
                                key={req.id}
                                className={`bg-white rounded-3xl p-7 flex flex-col hover:shadow-[0_20px_45px_rgba(15,23,42,0.08)] transition-all duration-300 relative overflow-hidden border ${
                                    isCritical 
                                        ? 'border-red-500 shadow-[0_4px_20px_rgba(239,68,68,0.12)] animate-critical-pulse' 
                                        : 'border-slate-100 shadow-[0_2px_8px_rgba(15,23,42,0.02)] hover:border-slate-300'
                                }`}
                            >
                                <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/5 rounded-bl-full pointer-events-none -mr-6 -mt-6"></div>

                                <div className="flex justify-between items-start mb-5 gap-2">
                                    <div>
                                        <span className="inline-block bg-red-50 text-red-700 border border-red-100 text-[10px] font-extrabold px-3 py-1 rounded-full mb-2 shadow-sm select-none">
                                            {req.bloodType} NEEDED
                                        </span>
                                        <h3 className="text-lg font-extrabold text-slate-900 tracking-tight">{req.patientName}</h3>
                                    </div>
                                    <span className={`text-[9px] font-black tracking-widest uppercase px-2.5 py-1 rounded-full border select-none ${
                                        urgencyColors[req.urgency] || 'bg-slate-50 border-slate-200 text-slate-600'
                                    }`}>
                                        {req.urgency || "Standard"}
                                    </span>
                                </div>

                                <div className="space-y-3 text-xs text-slate-600 flex-grow mb-6 bg-slate-50 p-4 rounded-2xl border border-slate-100 font-medium">
                                    <p className="flex items-center gap-2.5">
                                        <svg className="w-4 h-4 text-slate-400 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>
                                        <span><strong className="text-slate-900">Hospital:</strong> {req.hospitalName || "Not specified"}</span>
                                    </p>
                                    {req.hospitalAddress && (
                                        <p className="flex items-start gap-2.5">
                                            <svg className="w-4 h-4 text-red-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                                            <span className="break-words"><strong className="text-slate-900">Address:</strong> {req.hospitalAddress}</span>
                                        </p>
                                    )}
                                    {req.contactPhone && (
                                        <p className="flex items-center gap-2.5">
                                            <svg className="w-4 h-4 text-slate-400 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.94.725l.548 2.2a1 1 0 01-.321.988l-1.305.98a10.582 10.582 0 004.872 4.872l.98-1.305a1 1 0 01.988-.321l2.2.548a1 1 0 01.725.94V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>
                                            <span><strong className="text-slate-900">Emergency Phone:</strong> {req.contactPhone}</span>
                                        </p>
                                    )}
                                    <p className="flex items-center gap-2.5 text-[10px] text-slate-400 pt-2 border-t border-slate-200/60 mt-2.5">
                                        <svg className="w-3.5 h-3.5 text-slate-400 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                                        <span>Requested: {new Date(req.requestedAt || Date.now()).toLocaleString()}</span>
                                    </p>
                                </div>

                                <div className="flex flex-col gap-2 mt-auto">
                                    {req.contactPhone && (
                                        <a
                                            href={`tel:${req.contactPhone}`}
                                            className="w-full text-center py-3 bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white font-bold rounded-xl shadow-md hover:shadow-lg flex items-center justify-center gap-2 text-decoration-none text-xs hover:scale-[1.01] active:scale-[0.99]"
                                        >
                                            Call Emergency Contact
                                        </a>
                                    )}

                                    <div className="grid grid-cols-2 gap-2.5">
                                        <a
                                            href={mapsUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="w-full text-center py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 text-xs text-decoration-none border-none hover:scale-[1.01] active:scale-[0.99]"
                                        >
                                            View Hospital
                                        </a>

                                        <button
                                            onClick={() => handleAcceptRequest(req.id)}
                                            disabled={respondingId === req.id}
                                            className="w-full py-2.5 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 transition-colors shadow-sm disabled:opacity-50 text-xs flex items-center justify-center gap-1.5 cursor-pointer border-none hover:scale-[1.01] active:scale-[0.99]"
                                        >
                                            {respondingId === req.id ? "Updating..." : "I Can Donate"}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
};

export default DonorInbox;
