// src/components/LiveTrackingSection.jsx
import React, { useState, useEffect } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../firebase";
import { isRealUser } from "../utils/authUser";
import { completeBloodRequest } from "../utils/requestActions";
import LiveTrackingMap from "./LiveTrackingMap";
import { toast } from "react-toastify";

/**
 * Prominent, top-of-page live tracking panel for the recipient (requester).
 * Shows the accepted donor's live location on a large map, the donor's contact
 * info, ETA, and lifecycle controls. Renders only when an accepted request exists.
 */
const LiveTrackingSection = () => {
  const [acceptedRequests, setAcceptedRequests] = useState([]);
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
        setAcceptedRequests([]);
        setLoading(false);
        return;
      }

      const q = query(
        collection(db, "BloodRequests"),
        where("userId", "==", user.uid),
        where("status", "==", "accepted")
      );

      firestoreUnsub = onSnapshot(
        q,
        (snapshot) => {
          const rows = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
          rows.sort(
            (a, b) => new Date(b.acceptedAt || 0) - new Date(a.acceptedAt || 0)
          );
          setAcceptedRequests(rows);
          setLoading(false);
        },
        (error) => {
          console.error("LiveTrackingSection listen error:", error);
          setLoading(false);
        }
      );
    });

    return () => {
      authUnsub();
      if (firestoreUnsub) firestoreUnsub();
    };
  }, []);

  const handleStatus = async (id, status) => {
    setUpdatingId(id);
    try {
      await completeBloodRequest(id, status);
      toast.success(
        status === "fulfilled"
          ? "Marked fulfilled — live tracking ended."
          : "Request cancelled — tracking cleared.",
        { position: "top-center" }
      );
    } catch (e) {
      console.error("Failed to update request status:", e);
      toast.error("Failed to update request status.", { position: "top-center" });
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading || acceptedRequests.length === 0) return null;

  return (
    <section
      id="live-tracking"
      className="bg-gradient-to-b from-emerald-50/70 to-slate-50 border-b border-slate-100 py-14"
    >
      <div className="max-w-4xl mx-auto px-6">
        <div className="text-center max-w-lg mx-auto mb-10">
          <div className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-100 text-[10px] font-extrabold px-4 py-1.5 rounded-full mb-3 uppercase tracking-wider select-none shadow-[0_2px_10px_rgba(16,185,129,0.05)]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            Live Blood Delivery
          </div>
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-2">
            Donor On The Way
          </h2>
          <p className="text-sm text-slate-500 leading-relaxed font-medium">
            Track your donor's live location, see their estimated arrival time, and reach them directly.
          </p>
        </div>

        <div className="grid gap-6">
          {acceptedRequests.map((req) => (
            <div
              key={req.id}
              className="bg-white rounded-3xl border border-emerald-100 shadow-[0_20px_50px_rgba(16,185,129,0.12)] p-6 md:p-8"
            >
              <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                <div>
                  <span className="inline-block bg-emerald-50 text-emerald-700 border border-emerald-100 text-xs font-black px-3 py-1.5 rounded-full mb-2.5 select-none">
                    {req.bloodType} · Accepted
                  </span>
                  <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">
                    {req.patientName}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    {req.hospitalName}
                    {req.hospitalAddress ? ` · ${req.hospitalAddress}` : ""}
                  </p>
                </div>
                <span className="text-xs font-extrabold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100 select-none">
                  {req.acceptedByName || "Donor"} is coming
                </span>
              </div>

              {(req.acceptedByPhone || req.acceptedByEmail) && (
                <div className="flex flex-wrap gap-2.5 mb-4">
                  {req.acceptedByPhone && (
                    <a
                      href={`tel:${req.acceptedByPhone}`}
                      className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-900 text-white text-xs font-bold rounded-xl hover:bg-black transition-colors text-decoration-none"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-2.824-1.806-5.122-4.11-6.928-6.928l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z"/></svg>
                      Call Donor ({req.acceptedByPhone})
                    </a>
                  )}
                  {req.acceptedByEmail && (
                    <a
                      href={`mailto:${req.acceptedByEmail}`}
                      className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-50 transition-colors text-decoration-none"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
                      Email Donor
                    </a>
                  )}
                </div>
              )}

              <LiveTrackingMap
                requestId={req.id}
                hospitalFallback={req.location}
                donorName={req.acceptedByName || "Donor"}
                tall
              />

              <div className="grid grid-cols-2 gap-3 mt-5">
                <button
                  onClick={() => handleStatus(req.id, "fulfilled")}
                  disabled={updatingId === req.id}
                  className="py-3.5 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 transition-colors shadow-sm shadow-green-500/10 hover:scale-[1.01] active:scale-[0.99] text-xs cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-60"
                >
                  {updatingId === req.id ? "Updating..." : "✓ Mark Fulfilled"}
                </button>
                <button
                  onClick={() => handleStatus(req.id, "cancelled")}
                  disabled={updatingId === req.id}
                  className="py-3.5 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-colors hover:scale-[1.01] active:scale-[0.99] text-xs cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-60"
                >
                  ✕ Cancel
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default LiveTrackingSection;
