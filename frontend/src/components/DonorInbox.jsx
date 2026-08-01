import React, { useState, useEffect, useRef } from "react";
import { collection, query, where, onSnapshot, doc, getDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../firebase";
import { toast } from "react-toastify";
import { isRealUser } from "../utils/authUser";
import { acceptBloodRequest, declineBloodRequest, cancelAcceptedBloodRequest } from "../utils/requestActions";
import LiveTrackingMap from "./LiveTrackingMap";
import DonorRequestAlert from "./DonorRequestAlert";

const DonorInbox = () => {
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [acceptedByMe, setAcceptedByMe] = useState([]);
  const [donorProfile, setDonorProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [respondingId, setRespondingId] = useState(null);
  const [decliningId, setDecliningId] = useState(null);
  const [cancellingId, setCancellingId] = useState(null);
  const [alerts, setAlerts] = useState([]);
  // null = not yet primed; the first snapshot after (re)subscribing is treated
  // as the baseline so pre-existing requests don't trigger a false popup.
  const knownPendingIdsRef = useRef(null);

  useEffect(() => {
    let pendingUnsub = null;
    let acceptedUnsub = null;

    const authUnsub = onAuthStateChanged(auth, async (user) => {
      if (pendingUnsub) {
        pendingUnsub();
        pendingUnsub = null;
      }
      if (acceptedUnsub) {
        acceptedUnsub();
        acceptedUnsub = null;
      }

      if (!isRealUser(user)) {
        setIncomingRequests([]);
        setAcceptedByMe([]);
        setDonorProfile(null);
        setLoading(false);
        return;
      }

      let profile = null;
      try {
        const donorSnap = await getDoc(doc(db, "Donors", user.uid));
        if (donorSnap.exists()) {
          profile = { id: donorSnap.id, ...donorSnap.data() };
          setDonorProfile(profile);
        }
      } catch (err) {
        console.error("Error fetching donor profile:", err);
      }

      const requestsRef = collection(db, "BloodRequests");
      const pendingQ = query(requestsRef, where("status", "==", "pending"));

      // Re-prime arrival detection: the first snapshot of this listener is the
      // baseline, so only genuinely NEW requests pop up an alert.
      knownPendingIdsRef.current = null;

      pendingUnsub = onSnapshot(
        pendingQ,
        (snapshot) => {
          const matched = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const req = { id: docSnap.id, ...data };

            if (req.userId === user.uid) return;
            if (Array.isArray(req.declinedBy) && req.declinedBy.includes(user.uid)) return;

            const isTargetedAtMe = req.targetDonorId && req.targetDonorId === user.uid;

            const isDirectlyMatched =
              req.nearByDonors &&
              Array.isArray(req.nearByDonors) &&
              req.nearByDonors.some(
                (d) => d.id === user.uid || d.uid === user.uid || d.email === user.email
              );

            const isBloodTypeMatched = profile && req.bloodType === profile.bloodType;

            if (isTargetedAtMe || isDirectlyMatched || isBloodTypeMatched) {
              matched.push(req);
            }
          });

          matched.sort(
            (a, b) =>
              new Date(b.requestedAt || Date.now()) - new Date(a.requestedAt || Date.now())
          );
          setIncomingRequests(matched);

          // Popup alert only for requests that were NOT present in the previous
          // snapshot (baseline = first snapshot, so page load stays quiet).
          const currentIds = new Set(matched.map((r) => r.id));
          if (knownPendingIdsRef.current !== null) {
            const arrived = matched.filter((r) => !knownPendingIdsRef.current.has(r.id));
            if (arrived.length > 0) {
              setAlerts((prev) => {
                const keep = prev.filter((a) => currentIds.has(a.id));
                const existing = new Set(keep.map((a) => a.id));
                return [...keep, ...arrived.filter((r) => !existing.has(r.id))];
              });
            }
          }
          knownPendingIdsRef.current = currentIds;

          setLoading(false);
        },
        (error) => {
          console.error("Error listening to donor inbox requests:", error);
          setLoading(false);
        }
      );

      const acceptedQ = query(
        requestsRef,
        where("acceptedBy", "==", user.uid),
        where("status", "==", "accepted")
      );
      acceptedUnsub = onSnapshot(acceptedQ, (snapshot) => {
        const rows = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        setAcceptedByMe(rows);
      });
    });

    return () => {
      authUnsub();
      if (pendingUnsub) pendingUnsub();
      if (acceptedUnsub) acceptedUnsub();
    };
  }, [donorProfile?.bloodType]);

  const handleAcceptRequest = async (reqId) => {
    if (!isRealUser(auth.currentUser)) return;
    setRespondingId(reqId);
    try {
      await acceptBloodRequest({
        requestId: reqId,
        donorName: donorProfile?.fullname || auth.currentUser.email || "A Hero Donor",
      });
      toast.success(
        "You accepted this emergency request. Live location sharing has started — head to the hospital.",
        { position: "top-center" }
      );
    } catch (error) {
      console.error("Error accepting request:", error);
      const message =
        error?.message ||
        error?.code ||
        "Could not accept request. It may already be taken.";
      toast.error(String(message).replace(/^Firebase:\s*/i, ""), { position: "top-center" });
    } finally {
      setRespondingId(null);
    }
  };

  const handleDeclineRequest = async (reqId) => {
    if (!isRealUser(auth.currentUser)) return;
    setDecliningId(reqId);
    try {
      await declineBloodRequest({ requestId: reqId });
      toast.info("Request declined. It will stay available for other donors.", {
        position: "top-center",
      });
    } catch (error) {
      console.error("Error declining request:", error);
      toast.error(error?.message || "Could not decline request.", { position: "top-center" });
    } finally {
      setDecliningId(null);
    }
  };

  const handleCancelAccepted = async (reqId) => {
    if (!isRealUser(auth.currentUser)) return;
    setCancellingId(reqId);
    try {
      await cancelAcceptedBloodRequest({ requestId: reqId });
      toast.info("You cancelled this accepted request. It is now open for other donors again.", {
        position: "top-center",
      });
    } catch (error) {
      console.error("Error cancelling accepted request:", error);
      toast.error(error?.message || "Could not cancel request.", { position: "top-center" });
    } finally {
      setCancellingId(null);
    }
  };

  const dismissAlert = (alertId) => {
    setAlerts((prev) => prev.filter((a) => a.id !== alertId));
  };

  const viewAlert = (alertId) => {
    dismissAlert(alertId);
    const container = document.getElementById("donor-inbox");
    if (container) {
      try {
        container.scrollIntoView({ behavior: "smooth", block: "start" });
      } catch (_) {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    }
  };

  if (loading) {
    return (
      <section id="donor-inbox" className="py-24 bg-slate-50 border-t border-slate-100">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <div className="flex flex-col items-center justify-center gap-3">
            <svg
              className="animate-spin h-8 w-8 text-red-500"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            <p className="text-slate-500 font-bold text-sm">Checking emergency requests near you...</p>
          </div>
        </div>
      </section>
    );
  }

  if (!isRealUser(auth.currentUser)) {
    return null;
  }

  const urgencyColors = {
    Critical: "text-red-700 bg-red-50 border-red-200",
    Urgent: "text-amber-700 bg-amber-50 border-amber-200",
    Standard: "text-blue-700 bg-blue-50 border-blue-200",
  };

  const renderRequestCard = (req, { showActions }) => {
    const lat = req.location?.latitude ?? req.location?.lat;
    const lng = req.location?.longitude ?? req.location?.lng;
    const mapsUrl =
      lat != null && lng != null
        ? `https://www.google.com/maps?q=${lat},${lng}`
        : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(req.hospitalName || "Hospital")}`;
    const isCritical = req.urgency === "Critical";

    return (
      <div
        key={req.id}
        className={`bg-white rounded-3xl p-7 flex flex-col hover:shadow-[0_20px_45px_rgba(15,23,42,0.08)] transition-all duration-300 relative overflow-hidden border ${
          isCritical
            ? "border-red-500 shadow-[0_4px_20px_rgba(239,68,68,0.12)] animate-critical-pulse"
            : "border-slate-100 shadow-[0_2px_8px_rgba(15,23,42,0.02)] hover:border-slate-300"
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
          <span
            className={`text-[9px] font-black tracking-widest uppercase px-2.5 py-1 rounded-full border select-none ${
              urgencyColors[req.urgency] || "bg-slate-50 border-slate-200 text-slate-600"
            }`}
          >
            {req.urgency || "Standard"}
          </span>
        </div>

        <div className="space-y-3 text-xs text-slate-600 flex-grow mb-6 bg-slate-50 p-4 rounded-2xl border border-slate-100 font-medium">
          <p className="flex items-center gap-2.5">
            <strong className="text-slate-900">Hospital:</strong> {req.hospitalName || "Not specified"}
          </p>
          {req.hospitalAddress && (
            <p className="flex items-start gap-2.5">
              <strong className="text-slate-900">Address:</strong> {req.hospitalAddress}
            </p>
          )}
          {req.contactPhone && (
            <p className="flex items-center gap-2.5">
              <strong className="text-slate-900">Emergency Phone:</strong> {req.contactPhone}
            </p>
          )}
          <p className="flex items-center gap-2.5 text-[10px] text-slate-400 pt-2 border-t border-slate-200/60 mt-2.5">
            Requested: {new Date(req.requestedAt || Date.now()).toLocaleString()}
          </p>
        </div>

        {showActions ? (
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
              <button
                onClick={() => handleDeclineRequest(req.id)}
                disabled={decliningId === req.id || respondingId === req.id}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors disabled:opacity-50 text-xs flex items-center justify-center gap-1.5 cursor-pointer border-none"
              >
                {decliningId === req.id ? "Declining..." : "Decline"}
              </button>

              <button
                onClick={() => handleAcceptRequest(req.id)}
                disabled={respondingId === req.id || decliningId === req.id}
                className="w-full py-2.5 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 transition-colors shadow-sm disabled:opacity-50 text-xs flex items-center justify-center gap-1.5 cursor-pointer border-none hover:scale-[1.01] active:scale-[0.99]"
              >
                {respondingId === req.id ? "Accepting..." : "Accept & Go"}
              </button>
            </div>

            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full text-center py-2 text-slate-500 hover:text-slate-800 font-bold text-xs text-decoration-none"
            >
              Preview hospital on Maps ↗
            </a>
          </div>
        ) : (
          <div className="mt-auto">
            <div className="mb-3 flex items-center gap-2 text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2 text-xs font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              You accepted — live location is being shared
            </div>
            <LiveTrackingMap
              requestId={req.id}
              hospitalFallback={req.location}
              donorName="You"
            />
            {req.contactPhone && (
              <a
                href={`tel:${req.contactPhone}`}
                className="mt-3 w-full text-center py-3 bg-slate-900 text-white font-bold rounded-xl flex items-center justify-center text-decoration-none text-xs"
              >
                Call Emergency Contact
              </a>
            )}
            <button
              onClick={() => handleCancelAccepted(req.id)}
              disabled={cancellingId === req.id}
              className="mt-2 w-full py-2.5 bg-white border border-red-200 text-red-600 font-bold rounded-xl transition-colors hover:bg-red-50 hover:scale-[1.01] active:scale-[0.99] text-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
            >
              {cancellingId === req.id ? "Cancelling..." : "✕ Cancel Request"}
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {alerts.map((req) => (
        <DonorRequestAlert
          key={req.id}
          request={req}
          onView={() => viewAlert(req.id)}
          onDismiss={() => dismissAlert(req.id)}
        />
      ))}

      {incomingRequests.length === 0 && acceptedByMe.length === 0 ? null : (
      <section id="donor-inbox" className="py-24 bg-gradient-to-b from-red-50/50 to-white border-t border-slate-100">
      <div className="max-w-4xl mx-auto px-6">
        {acceptedByMe.length > 0 && (
          <div className="mb-16">
            <div className="text-center max-w-lg mx-auto mb-10">
              <div className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-100 text-[10px] font-extrabold px-4 py-1.5 rounded-full mb-3 uppercase tracking-wider">
                Active Delivery
              </div>
              <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-2">
                Your Accepted Requests
              </h2>
              <p className="text-sm text-slate-500 font-medium">
                GPS sharing is on. The requester can see you moving toward the hospital.
              </p>
            </div>
            <div className="grid gap-6 md:grid-cols-1">{acceptedByMe.map((req) => renderRequestCard(req, { showActions: false }))}</div>
          </div>
        )}

        {incomingRequests.length > 0 && (
          <>
            <div className="text-center max-w-lg mx-auto mb-12">
              <div className="inline-flex items-center gap-1.5 bg-red-50 text-red-700 border border-red-100 text-[10px] font-extrabold px-4 py-1.5 rounded-full mb-3 uppercase tracking-wider select-none shadow-[0_2px_10px_rgba(239,68,68,0.05)]">
                Emergency Match
              </div>
              <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-2">
                Emergency Requests For You
              </h2>
              <p className="text-sm text-slate-500 leading-relaxed font-medium">
                Accept to claim the request (first donor wins) and start live tracking, or decline to hide it.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              {incomingRequests.map((req) => renderRequestCard(req, { showActions: true }))}
            </div>
          </>
        )}
      </div>
      </section>
      )}
    </>
  );
};

export default DonorInbox;
