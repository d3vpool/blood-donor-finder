import React, { useState, useEffect } from "react";
import { collection, query, where, onSnapshot, doc, getDoc, updateDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../firebase";

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
            alert("Thank you! You have accepted this emergency blood request. Please contact the requestor immediately.");
        } catch (error) {
            console.error("Error accepting request:", error);
            alert("Could not update request status.");
        } finally {
            setRespondingId(null);
        }
    };

    if (loading) {
        return (
            <section id="donor-inbox" className="py-16 bg-red-50/40 border-t border-red-100">
                <div className="max-w-4xl mx-auto px-6 text-center">
                    <p className="text-gray-500 animate-pulse text-lg">Checking emergency requests near you...</p>
                </div>
            </section>
        );
    }

    if (!auth.currentUser || incomingRequests.length === 0) {
        return null;
    }

    return (
        <section id="donor-inbox" className="py-16 bg-gradient-to-b from-red-50/60 to-white border-t border-red-100">
            <div className="max-w-4xl mx-auto px-6">
                <div className="text-center mb-10">
                    <span className="inline-block bg-red-600 text-white text-xs font-black uppercase tracking-widest px-3.5 py-1.5 rounded-full mb-3 shadow-sm animate-pulse">
                        🚨 Emergency Match
                    </span>
                    <h2 className="text-3xl font-extrabold text-gray-900 mb-2">Emergency Requests For You</h2>
                    <p className="text-gray-600">Patients nearby need blood matching your group. Contact them directly to help save a life.</p>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                    {incomingRequests.map((req) => {
                        const lat = req.location?.latitude ?? req.location?.lat;
                        const lng = req.location?.longitude ?? req.location?.lng;
                        const mapsUrl = (lat != null && lng != null)
                            ? `https://www.google.com/maps?q=${lat},${lng}`
                            : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(req.hospitalName || "Hospital")}`;

                        return (
                            <div
                                key={req.id}
                                className="bg-white rounded-2xl shadow-md border-2 border-red-500/30 p-6 flex flex-col hover:shadow-lg transition-all duration-300 relative overflow-hidden"
                            >
                                <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/10 rounded-bl-full pointer-events-none -mr-6 -mt-6"></div>

                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <span className="inline-block bg-red-600 text-white text-sm font-black px-3.5 py-1 rounded-full mb-2 shadow-sm">
                                            {req.bloodType} NEEDED
                                        </span>
                                        <h3 className="text-xl font-bold text-gray-900">{req.patientName}</h3>
                                    </div>
                                    <span className="bg-red-100 text-red-700 text-xs font-extrabold px-3 py-1 rounded-full uppercase tracking-wider border border-red-200">
                                        {req.urgency || "High"} Urgency
                                    </span>
                                </div>

                                <div className="space-y-2.5 text-sm text-gray-700 flex-grow mb-6 bg-gray-50 p-4 rounded-xl border border-gray-100">
                                    <p className="flex items-center gap-2">
                                        <span>🏥</span>
                                        <span><strong className="text-gray-900">Hospital:</strong> {req.hospitalName || "Not specified"}</span>
                                    </p>
                                    {req.hospitalAddress && (
                                        <p className="flex items-center gap-2">
                                            <span>📍</span>
                                            <span><strong className="text-gray-900">Address:</strong> {req.hospitalAddress}</span>
                                        </p>
                                    )}
                                    {req.contactPhone && (
                                        <p className="flex items-center gap-2">
                                            <span>📞</span>
                                            <span><strong className="text-gray-900">Emergency Phone:</strong> {req.contactPhone}</span>
                                        </p>
                                    )}
                                    <p className="flex items-center gap-2 text-xs text-gray-500 pt-1">
                                        <span>⏰</span>
                                        <span>Requested: {new Date(req.requestedAt || Date.now()).toLocaleString()}</span>
                                    </p>
                                </div>

                                <div className="flex flex-col gap-3 mt-auto">
                                    {req.contactPhone && (
                                        <a
                                            href={`tel:${req.contactPhone}`}
                                            className="w-full text-center py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-colors shadow-md hover:shadow-lg flex items-center justify-center gap-2 text-decoration-none"
                                        >
                                            <span>📞</span> Call Emergency Contact
                                        </a>
                                    )}

                                    <div className="grid grid-cols-2 gap-2.5">
                                        <a
                                            href={mapsUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="w-full text-center py-2.5 bg-gray-100 text-gray-800 font-semibold rounded-xl hover:bg-gray-200 transition-colors flex items-center justify-center gap-1.5 text-xs text-decoration-none border border-gray-200"
                                        >
                                            <span>🗺️</span> View Hospital
                                        </a>

                                        <button
                                            onClick={() => handleAcceptRequest(req.id)}
                                            disabled={respondingId === req.id}
                                            className="w-full py-2.5 bg-green-600 text-white font-semibold rounded-xl hover:bg-green-700 transition-colors shadow-sm disabled:opacity-50 text-xs flex items-center justify-center gap-1.5"
                                        >
                                            <span>🙋‍♂️</span> {respondingId === req.id ? "Updating..." : "I Can Donate"}
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
