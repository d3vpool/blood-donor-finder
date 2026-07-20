// src/components/DonorMap.jsx
import React, { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix Leaflet's broken default icon paths when bundled with webpack/CRA
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require("leaflet/dist/images/marker-icon-2x.png"),
  iconUrl: require("leaflet/dist/images/marker-icon.png"),
  shadowUrl: require("leaflet/dist/images/marker-shadow.png"),
});

// Blue marker — user's location
const userIcon = new L.Icon({
  iconUrl:
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

// Red marker — donors
const donorIcon = new L.Icon({
  iconUrl:
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

/**
 * Inner component — must live inside <MapContainer> to use useMap().
 * Handles: pan-to-location on search, and exposing focusOn to parent.
 */
function MapController({ recipientLocation, setMapController }) {
  const map = useMap();

  // Expose focusOn so SearchResult card clicks can pan the map
  useEffect(() => {
    setMapController({
      focusOn: (lat, lng, zoom = 15) => {
        const pos = [Number(lat), Number(lng)];
        if (Number.isFinite(pos[0]) && Number.isFinite(pos[1])) {
          map.flyTo(pos, zoom, { duration: 0.8 });
        }
      },
    });
    return () => setMapController(null);
  }, [map, setMapController]);

  // Pan to recipient's location whenever a new search is performed
  useEffect(() => {
    if (recipientLocation) {
      map.setView([recipientLocation.lat, recipientLocation.lng], 13);
    }
  }, [recipientLocation, map]);

  return null;
}

export default function DonorMap({ recipientLocation, donors = [], setMapController, isSearching }) {
  // Initial map center — Bangalore as sensible default for India
  const defaultCenter = [12.9716, 77.5946];

  return (
    <div id="donorMapContainer" className="relative w-full h-[450px] rounded-2xl overflow-hidden shadow-lg border border-slate-200 mb-12">
      {/* Loading Overlay */}
      {isSearching && (
        <div className="absolute inset-0 bg-slate-900/35 backdrop-blur-[2px] z-[9999] flex items-center justify-center transition-all duration-300">
          <div className="bg-white px-5 py-3.5 rounded-2xl shadow-xl border border-slate-100 flex items-center gap-3 animate-fade-in">
            <svg className="animate-spin h-5 w-5 text-red-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span className="text-sm font-bold text-slate-800 tracking-tight">Plotting nearby donors...</span>
          </div>
        </div>
      )}

      <MapContainer
        center={defaultCenter}
        zoom={11}
        style={{ width: "100%", height: "100%", zIndex: 1 }}
        scrollWheelZoom={true}
      >
        {/* Voyager tiles URL — clean, modern, warm accents */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions" target="_blank">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />

        {/* Handles panning + exposes focusOn controller */}
        <MapController
          recipientLocation={recipientLocation}
          setMapController={setMapController}
        />

        {/* User location — blue pin */}
        {recipientLocation && (
          <Marker
            position={[recipientLocation.lat, recipientLocation.lng]}
            icon={userIcon}
          >
            <Popup>
              <div className="font-sans font-bold text-slate-900 text-xs py-0.5">
                📍 Your Location
              </div>
            </Popup>
          </Marker>
        )}

        {/* Donor markers — red pins */}
        {donors.map((donor, idx) => {
          const lat = Number(
            donor.location?.latitude ?? donor.location?.lat
          );
          const lng = Number(
            donor.location?.longitude ?? donor.location?.lng
          );
          if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

          const gmapsUrl = `https://www.google.com/maps?q=${lat},${lng}`;

          return (
            <Marker key={donor.id || idx} position={[lat, lng]} icon={donorIcon}>
              <Popup>
                <div className="font-sans min-w-[200px] py-1">
                  <div className="font-extrabold text-slate-900 text-sm mb-1 leading-tight">
                    {donor.fullname || "Donor"}
                  </div>
                  {donor.bloodType && (
                    <div className="inline-block bg-red-50 text-red-700 border border-red-100 font-black text-xs px-2.5 py-0.5 rounded-full mb-3 select-none">
                      {donor.bloodType}
                    </div>
                  )}
                  <div className="text-xs text-slate-600 space-y-1.5 font-medium mb-3">
                    {donor.email && (
                      <div className="flex items-center gap-1.5">
                        <span>✉️</span>
                        <span className="break-all">{donor.email}</span>
                      </div>
                    )}
                    {donor.phoneNo && (
                      <div className="flex items-center gap-1.5">
                        <span>📞</span>
                        <span>{donor.phoneNo}</span>
                      </div>
                    )}
                  </div>
                  <div>
                    <a
                      href={gmapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center text-center w-full bg-slate-900 hover:bg-black text-white font-bold text-xs py-2 px-3 rounded-lg transition-colors text-decoration-none shadow-sm"
                    >
                      Open in Maps ↗
                    </a>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
