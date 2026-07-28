import React, { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { subscribeToTracking } from "../utils/liveTracking";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require("leaflet/dist/images/marker-icon-2x.png"),
  iconUrl: require("leaflet/dist/images/marker-icon.png"),
  shadowUrl: require("leaflet/dist/images/marker-shadow.png"),
});

const donorIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const hospitalIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

function FitBounds({ points }) {
  const map = useMap();
  useEffect(() => {
    const valid = points.filter((p) => Number.isFinite(p[0]) && Number.isFinite(p[1]));
    if (valid.length === 0) return;
    if (valid.length === 1) {
      map.setView(valid[0], 14);
      return;
    }
    map.fitBounds(valid, { padding: [40, 40], maxZoom: 15 });
  }, [points, map]);
  return null;
}

function formatAge(updatedAt) {
  if (!updatedAt) return "waiting for GPS…";
  const sec = Math.max(0, Math.round((Date.now() - updatedAt) / 1000));
  if (sec < 5) return "just now";
  if (sec < 60) return `${sec}s ago`;
  return `${Math.floor(sec / 60)}m ago`;
}

/**
 * Live map for an accepted blood request. Requester (and donor) see donor GPS from RTDB.
 */
export default function LiveTrackingMap({ requestId, hospitalFallback, donorName }) {
  const [session, setSession] = useState(null);
  const [error, setError] = useState(null);
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!requestId) return undefined;
    const unsub = subscribeToTracking(
      requestId,
      (data) => {
        setSession(data);
        setError(null);
      },
      (err) => {
        console.error("Tracking subscribe error:", err);
        setError(err?.message || "Unable to subscribe to live tracking.");
      }
    );
    return unsub;
  }, [requestId]);

  // Refresh "updated ago" label
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 5000);
    return () => clearInterval(id);
  }, []);

  const hospitalLat = Number(
    session?.hospital?.latitude ?? session?.hospital?.lat ?? hospitalFallback?.latitude ?? hospitalFallback?.lat
  );
  const hospitalLng = Number(
    session?.hospital?.longitude ?? session?.hospital?.lng ?? hospitalFallback?.longitude ?? hospitalFallback?.lng
  );
  const donorLat = Number(session?.location?.lat);
  const donorLng = Number(session?.location?.lng);

  const hasHospital = Number.isFinite(hospitalLat) && Number.isFinite(hospitalLng);
  const hasDonor = Number.isFinite(donorLat) && Number.isFinite(donorLng);
  const center = hasDonor
    ? [donorLat, donorLng]
    : hasHospital
      ? [hospitalLat, hospitalLng]
      : [12.9716, 77.5946];

  const points = [];
  if (hasHospital) points.push([hospitalLat, hospitalLng]);
  if (hasDonor) points.push([donorLat, donorLng]);

  return (
    <div className="mt-4 rounded-2xl overflow-hidden border border-slate-200 bg-slate-50">
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-slate-200 bg-white">
        <div>
          <p className="text-[10px] uppercase tracking-wider font-extrabold text-emerald-600 mb-0.5">
            Live Tracking
          </p>
          <p className="text-xs font-bold text-slate-800">
            {donorName || session?.patientName ? (
              <>
                {donorName || "Donor"} → {session?.hospitalName || "Hospital"}
              </>
            ) : (
              "Waiting for donor GPS…"
            )}
          </p>
        </div>
        <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
          {session?.status === "ended" ? "Ended" : formatAge(session?.location?.updatedAt)}
        </span>
      </div>

      {error && (
        <div className="px-4 py-2 text-xs font-bold text-amber-700 bg-amber-50 border-b border-amber-100">
          {error} — enable Firebase Realtime Database if this persists.
        </div>
      )}

      <div className="relative h-[280px] w-full">
        <MapContainer
          center={center}
          zoom={13}
          style={{ width: "100%", height: "100%", zIndex: 1 }}
          scrollWheelZoom={false}
        >
          <TileLayer
            attribution='&copy; OpenStreetMap &copy; CARTO'
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          />
          <FitBounds points={points} />

          {hasHospital && (
            <Marker position={[hospitalLat, hospitalLng]} icon={hospitalIcon}>
              <Popup>
                <strong>Hospital</strong>
                <div className="text-xs">{session?.hospitalName || "Destination"}</div>
              </Popup>
            </Marker>
          )}

          {hasDonor && (
            <Marker position={[donorLat, donorLng]} icon={donorIcon}>
              <Popup>
                <strong>{donorName || "Donor"}</strong>
                <div className="text-xs">Updated {formatAge(session?.location?.updatedAt)}</div>
              </Popup>
            </Marker>
          )}

          {hasHospital && hasDonor && (
            <Polyline
              positions={[
                [donorLat, donorLng],
                [hospitalLat, hospitalLng],
              ]}
              pathOptions={{ color: "#10b981", weight: 3, dashArray: "6 8", opacity: 0.8 }}
            />
          )}
        </MapContainer>

        {!hasDonor && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-[500] bg-white/95 border border-slate-200 text-slate-700 text-[11px] font-bold px-3 py-1.5 rounded-full shadow-sm">
            Waiting for donor location…
          </div>
        )}
      </div>
    </div>
  );
}
