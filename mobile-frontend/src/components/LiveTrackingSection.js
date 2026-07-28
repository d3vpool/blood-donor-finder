import React, { useEffect, useState, useRef } from "react";
import { View, Text, Pressable } from "react-native";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../services/firebase";
import { startMobileLocationPublisher, subscribeToTracking } from "../services/liveTracking";

/**
 * Phase 4 mobile parity: stream GPS for accepted deliveries and show live status.
 * Requires the user to be signed in with the same Firebase Auth account as web.
 */
export default function LiveTrackingSection() {
  const [user, setUser] = useState(null);
  const [accepted, setAccepted] = useState([]);
  const [live, setLive] = useState(null);
  const [sharing, setSharing] = useState(false);
  const [error, setError] = useState(null);
  const stopRef = useRef(null);

  useEffect(() => {
    return onAuthStateChanged(auth, setUser);
  }, []);

  useEffect(() => {
    if (!user || user.isAnonymous) {
      setAccepted([]);
      return undefined;
    }
    const q = query(
      collection(db, "BloodRequests"),
      where("acceptedBy", "==", user.uid),
      where("status", "==", "accepted")
    );
    return onSnapshot(q, (snap) => {
      setAccepted(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
  }, [user]);

  useEffect(() => {
    if (accepted.length === 0) {
      setLive(null);
      return undefined;
    }
    return subscribeToTracking(accepted[0].id, setLive, (err) => setError(err.message));
  }, [accepted]);

  useEffect(() => {
    return () => {
      if (stopRef.current) stopRef.current();
    };
  }, []);

  const toggleSharing = async () => {
    setError(null);
    if (sharing && stopRef.current) {
      stopRef.current();
      stopRef.current = null;
      setSharing(false);
      return;
    }
    if (accepted.length === 0) {
      setError("No accepted delivery to track.");
      return;
    }
    try {
      stopRef.current = await startMobileLocationPublisher(accepted[0].id);
      setSharing(true);
    } catch (err) {
      setError(err.message || "Could not start GPS sharing");
    }
  };

  if (!user || user.isAnonymous) {
    return (
      <View className="mx-4 my-6 p-5 rounded-2xl bg-white/5 border border-white/10">
        <Text className="text-white font-bold text-base mb-1">Live Delivery Tracking</Text>
        <Text className="text-gray-400 text-sm">
          Sign in with your LifeLink account to share GPS during an accepted emergency delivery.
        </Text>
      </View>
    );
  }

  return (
    <View className="mx-4 my-6 p-5 rounded-2xl bg-white/5 border border-white/10">
      <Text className="text-white font-bold text-base mb-1">Live Delivery Tracking</Text>
      <Text className="text-gray-400 text-sm mb-4">
        {accepted.length > 0
          ? `Active: ${accepted[0].patientName || "request"} · ${accepted[0].bloodType || ""}`
          : "No accepted deliveries right now."}
      </Text>

      {live?.location && (
        <Text className="text-emerald-400 text-xs font-bold mb-3">
          Last ping: {Number(live.location.lat).toFixed(5)}, {Number(live.location.lng).toFixed(5)}
        </Text>
      )}

      {error ? <Text className="text-red-400 text-xs mb-3">{error}</Text> : null}

      <Pressable
        onPress={toggleSharing}
        disabled={accepted.length === 0}
        className={`py-3 rounded-xl items-center ${
          sharing ? "bg-emerald-600" : accepted.length ? "bg-red-600" : "bg-gray-700"
        }`}
      >
        <Text className="text-white font-bold text-sm">
          {sharing ? "Stop Sharing Location" : "Start Sharing Location"}
        </Text>
      </Pressable>
    </View>
  );
}
