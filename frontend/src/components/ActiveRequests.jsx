import React, { useState, useEffect } from 'react'
import { collection, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore'
import { onAuthStateChanged } from 'firebase/auth'
import { auth, db } from '../firebase'

const ActiveRequests = () => {
    const [bloodRequests, setBloodRequests] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let firestoreUnsub = null;

        // Wait for Firebase Auth to confirm the user's identity before querying
        const authUnsub = onAuthStateChanged(auth, (user) => {
            // Clean up any previous Firestore listener when auth state changes
            if (firestoreUnsub) {
                firestoreUnsub();
                firestoreUnsub = null;
            }

            if (!user) {
                // Not logged in — nothing to show
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

        // Cleanup both listeners on unmount
        return () => {
            authUnsub();
            if (firestoreUnsub) firestoreUnsub();
        };
    }, []);

    async function cancelRequest(bloodRequestId) {
        await updateDoc(doc(db, "BloodRequests", bloodRequestId), {
            status: "cancelled"
        });
        // We no longer need to manually fetch again! onSnapshot handles it automatically.
    }

    async function updateStatus(bloodRequestId) {
        await updateDoc(doc(db, "BloodRequests", bloodRequestId), {
            status: "fulfilled"
        });
        // onSnapshot handles the UI update automatically.
    }

    if (loading) {
        return (
            <section className="py-16 bg-gray-50">
                <div className="max-w-4xl mx-auto px-6 text-center">
                    <p className="text-gray-500 animate-pulse text-lg">Loading your requests...</p>
                </div>
            </section>
        );
    }

    if (bloodRequests.length === 0) {
        return null; // Don't show the dashboard if they have no requests
    }

    return (
        <section className="py-16 bg-gray-50 border-t border-gray-200">
            <div className="max-w-4xl mx-auto px-6">
                <div className="text-center mb-10">
                    <h2 className="text-3xl font-bold text-gray-900 mb-2">Your Active Requests</h2>
                    <p className="text-gray-600">Manage and track the emergency blood requests you've submitted.</p>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                    {bloodRequests.map((bloodRequest) => (
                        <div key={bloodRequest.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col hover:shadow-md transition-shadow">
                            
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <span className="inline-block bg-red-100 text-red-700 text-xs font-bold px-3 py-1 rounded-full mb-2">
                                        {bloodRequest.bloodType} Needed
                                    </span>
                                    <h3 className="text-xl font-bold text-gray-800">{bloodRequest.patientName}</h3>
                                </div>
                                <span className={`text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider ${
                                    bloodRequest.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                                    bloodRequest.status === 'fulfilled' ? 'bg-green-100 text-green-700' :
                                    'bg-gray-100 text-gray-600'
                                }`}>
                                    {bloodRequest.status}
                                </span>
                            </div>

                            <div className="space-y-2 text-sm text-gray-600 flex-grow mb-6">
                                <p><strong className="text-gray-700">Hospital:</strong> {bloodRequest.hospitalName}</p>
                                <p><strong className="text-gray-700">Urgency:</strong> {bloodRequest.urgency}</p>
                                <p><strong className="text-gray-700">Requested On:</strong> {new Date(bloodRequest.requestedAt || Date.now()).toLocaleDateString()}</p>
                            </div>
                            
                            {/* Only show action buttons if it's pending */}
                            {bloodRequest.status === "pending" && (
                                <div className="grid grid-cols-2 gap-3 mt-auto">
                                    <button 
                                        onClick={() => updateStatus(bloodRequest.id)}
                                        className="py-2.5 bg-green-500 text-white font-semibold rounded-lg hover:bg-green-600 transition-colors shadow-sm"
                                    >
                                        ✓ Mark Fulfilled
                                    </button>
                                    <button 
                                        onClick={() => cancelRequest(bloodRequest.id)}
                                        className="py-2.5 bg-white border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
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
    )
}

export default ActiveRequests