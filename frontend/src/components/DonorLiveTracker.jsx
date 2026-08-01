import { useEffect, useRef, useState } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../firebase";
import { isRealUser } from "../utils/authUser";
import { startDonorLocationPublisher } from "../services/tracking";

/**
 * Invisible controller: when the signed-in user is the accepted donor on any
 * active request, stream their GPS into RTDB for the requester's live map.
 */
export default function DonorLiveTracker() {
  const [activeRequestIds, setActiveRequestIds] = useState([]);
  const stoppersRef = useRef(new Map());

  useEffect(() => {
    let firestoreUnsub = null;

    const authUnsub = onAuthStateChanged(auth, (user) => {
      if (firestoreUnsub) {
        firestoreUnsub();
        firestoreUnsub = null;
      }
      // Stop all publishers on auth change
      stoppersRef.current.forEach((stop) => stop());
      stoppersRef.current.clear();
      setActiveRequestIds([]);

      if (!isRealUser(user)) return;

      const q = query(
        collection(db, "BloodRequests"),
        where("acceptedBy", "==", user.uid),
        where("status", "==", "accepted")
      );

      firestoreUnsub = onSnapshot(
        q,
        (snap) => {
          const ids = snap.docs.map((d) => d.id);
          setActiveRequestIds(ids);
        },
        (err) => {
          console.warn("DonorLiveTracker listen failed:", err);
        }
      );
    });

    return () => {
      authUnsub();
      if (firestoreUnsub) firestoreUnsub();
      stoppersRef.current.forEach((stop) => stop());
      stoppersRef.current.clear();
    };
  }, []);

  useEffect(() => {
    const wanted = new Set(activeRequestIds);
    const running = stoppersRef.current;

    // Stop publishers for requests no longer active
    for (const [id, stop] of running.entries()) {
      if (!wanted.has(id)) {
        stop();
        running.delete(id);
      }
    }

    // Start publishers for new accepted requests
    for (const id of wanted) {
      if (running.has(id)) continue;
      try {
        const stop = startDonorLocationPublisher(id, {
          minIntervalMs: 4000,
          enableHighAccuracy: true,
        });
        running.set(id, stop);
      } catch (err) {
        console.warn("Could not start donor GPS publisher:", err);
      }
    }
  }, [activeRequestIds]);

  if (activeRequestIds.length === 0) return null;

  return (
    <div className="fixed bottom-4 left-4 z-[900] max-w-xs bg-emerald-600 text-white text-xs font-bold px-4 py-3 rounded-2xl shadow-lg border border-emerald-400/30">
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
        Sharing live location for {activeRequestIds.length} active{" "}
        {activeRequestIds.length === 1 ? "delivery" : "deliveries"}
      </div>
    </div>
  );
}
