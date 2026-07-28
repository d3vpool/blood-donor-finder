import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../firebase';
import { isRealUser } from '../utils/authUser';
import { completeBloodRequest } from '../utils/requestActions';
import LiveTrackingMap from './LiveTrackingMap';
import { toast } from 'react-toastify';

const ActiveRequests = () => {
    const [bloodRequests, setBloodRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [updatingId, setUpdatingId] = useState(null);

    useEffect(() => {
        let firestoreUnsub = null;

        const authUnsub = onAuthStateChanged(auth, (user) => {
            if (firestoreUnsub) {
                firestoreUnsub();
                firestoreUnsub = null;
            }

            if (!isRealUser(user)) {
                setBloodRequests([]);
                setLoading(false);
                return;
            }

            const bloodRequestsRef = collection(db, "BloodRequests");
            const q = query(bloodRequestsRef, where("userId", "==", user.uid));

            firestoreUnsub = onSnapshot(q, (querySnapshot) => {
                if (querySnapshot.empty) {
                    setBloodRequests([]);
                } else {
                    const formattedData = querySnapshot.docs.map((d) => ({
                        id: d.id,
                        ...d.data()
                    }));
                    formattedData.sort((a, b) => new Date(b.requestedAt) - new Date(a.requestedAt));
                    setBloodRequests(formattedData);
                }
                setLoading(false);
            }, (error) => {
                console.error("Error fetching realtime documents: ", error);
                setLoading(false);
            });
        });

        return () => {
            authUnsub();
            if (firestoreUnsub) firestoreUnsub();
        };
    }, []);

    async function handleStatus(bloodRequestId, status) {
        setUpdatingId(bloodRequestId);
        try {
            await completeBloodRequest(bloodRequestId, status);
            toast.success(
                status === "fulfilled" ? "Marked fulfilled — live tracking ended." : "Request cancelled — tracking cleared.",
                { position: "top-center" }
            );
        } catch (e) {
            console.error("Failed to update request:", e);
            toast.error("Failed to update request status.", { position: "top-center" });
        } finally {
            setUpdatingId(null);
        }
    }

    if (loading) {
        return (
            <section className="py-24 bg-slate-50 border-t border-slate-100">
                <div className="max-w-4xl mx-auto px-6 text-center">
                    <div className="flex flex-col items-center justify-center gap-3">
                        <svg className="animate-spin h-8 w-8 text-red-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <p className="text-slate-500 font-medium">Loading your requests...</p>
                    </div>
                </div>
            </section>
        );
    }

    if (bloodRequests.length === 0) {
        return null;
    }

    const urgencyColors = { Critical: "text-red-700 bg-red-50 border-red-200", Urgent: "text-amber-700 bg-amber-50 border-amber-200", Standard: "text-blue-700 bg-blue-50 border-blue-200" };

    return (
        <section className="py-24 bg-slate-50 border-t border-slate-100">
            <div className="max-w-4xl mx-auto px-6">
                <div className="text-center max-w-lg mx-auto mb-12">
                    <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-2">Your Active Requests</h2>
                    <p className="text-sm text-slate-500 leading-relaxed">Track donors live after acceptance, then mark fulfilled or cancel when done.</p>
                </div>

                <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
                    {bloodRequests.map((bloodRequest) => (
                        <div key={bloodRequest.id} className="bg-white rounded-2xl shadow-xl shadow-slate-100/50 border border-slate-100 p-6 flex flex-col hover:shadow-2xl hover:shadow-slate-100/80 transition-all duration-300">
                            
                            <div className="flex justify-between items-start mb-5 gap-2">
                                <div>
                                    <span className="inline-block bg-red-50 text-red-700 border border-red-100 text-xs font-black px-3 py-1.5 rounded-full mb-2.5 select-none">
                                        {bloodRequest.bloodType} Needed
                                    </span>
                                    <h3 className="text-lg font-extrabold text-slate-900 tracking-tight">{bloodRequest.patientName}</h3>
                                </div>
                                <span className={`text-[10px] font-black tracking-widest uppercase px-2.5 py-1 rounded-full border select-none ${
                                    bloodRequest.status === 'pending' ? 'bg-amber-50 border-amber-200 text-amber-700' :
                                    bloodRequest.status === 'accepted' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' :
                                    bloodRequest.status === 'fulfilled' ? 'bg-green-50 border-green-200 text-green-700' :
                                    'bg-slate-50 border-slate-200 text-slate-600'
                                }`}>
                                    {bloodRequest.status}
                                </span>
                            </div>

                            <div className="space-y-2 text-sm text-slate-600 flex-grow mb-4 font-medium">
                                <p><strong className="text-slate-900">Hospital:</strong> {bloodRequest.hospitalName}</p>
                                <p className="flex items-center gap-1.5">
                                    <strong className="text-slate-900">Urgency:</strong> 
                                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${urgencyColors[bloodRequest.urgency] || 'bg-slate-50 text-slate-700 border-slate-200 border'}`}>
                                        {bloodRequest.urgency}
                                    </span>
                                </p>
                                <p><strong className="text-slate-900">Requested On:</strong> {new Date(bloodRequest.requestedAt || Date.now()).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</p>
                                {bloodRequest.status === 'accepted' && bloodRequest.acceptedByName && (
                                    <p className="text-emerald-700 font-bold text-xs bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2">
                                        Accepted by {bloodRequest.acceptedByName}
                                        {bloodRequest.acceptedAt ? ` · ${new Date(bloodRequest.acceptedAt).toLocaleString()}` : ''}
                                    </p>
                                )}
                            </div>

                            {bloodRequest.status === 'accepted' && (
                                <LiveTrackingMap
                                    requestId={bloodRequest.id}
                                    hospitalFallback={bloodRequest.location}
                                    donorName={bloodRequest.acceptedByName || 'Donor'}
                                />
                            )}
                            
                            {(bloodRequest.status === "pending" || bloodRequest.status === "accepted") && (
                                <div className="grid grid-cols-2 gap-3 mt-auto pt-4 border-t border-slate-100">
                                    <button 
                                        onClick={() => handleStatus(bloodRequest.id, "fulfilled")}
                                        disabled={updatingId === bloodRequest.id}
                                        className="py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 transition-colors shadow-sm shadow-green-500/10 hover:scale-[1.01] active:scale-[0.99] text-xs cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-60"
                                    >
                                        {updatingId === bloodRequest.id ? "Updating..." : "✓ Mark Fulfilled"}
                                    </button>
                                    <button 
                                        onClick={() => handleStatus(bloodRequest.id, "cancelled")}
                                        disabled={updatingId === bloodRequest.id}
                                        className="py-3 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-colors hover:scale-[1.01] active:scale-[0.99] text-xs cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-60"
                                    >
                                        ✕ Cancel
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default ActiveRequests;
