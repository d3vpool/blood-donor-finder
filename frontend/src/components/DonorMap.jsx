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

export default function DonorMap({ recipientLocation, donors = [], setMapController }) {
  // Initial map center — Bangalore as sensible default for India
  const defaultCenter = [12.9716, 77.5946];

  return (
    <div id="donorMapContainer" style={{ width: "100%", height: "420px" }}>
      <MapContainer
        center={defaultCenter}
        zoom={11}
        style={{ width: "100%", height: "100%" }}
        scrollWheelZoom={true}
      >
        {/* OpenStreetMap tiles — completely free, no API key */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
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
              <strong>📍 Your Location</strong>
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
                <div style={{ minWidth: "190px", lineHeight: "1.5" }}>
                  <div>
                    <strong style={{ fontSize: "14px" }}>
                      {donor.fullname || "Donor"}
                    </strong>
                  </div>
                  {donor.bloodType && (
                    <div
                      style={{
                        display: "inline-block",
                        background: "#fee2e2",
                        color: "#b91c1c",
                        fontWeight: 700,
                        fontSize: "12px",
                        padding: "1px 8px",
                        borderRadius: "999px",
                        margin: "4px 0",
                      }}
                    >
                      {donor.bloodType}
                    </div>
                  )}
                  {donor.email && (
                    <div style={{ fontSize: "12px", color: "#555" }}>
                      ✉️ {donor.email}
                    </div>
                  )}
                  {donor.phoneNo && (
                    <div style={{ fontSize: "12px", color: "#555" }}>
                      📞 {donor.phoneNo}
                    </div>
                  )}
                  <div style={{ marginTop: "8px" }}>
                    <a
                      href={gmapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        color: "#1a73e8",
                        fontWeight: 600,
                        fontSize: "12px",
                        textDecoration: "none",
                      }}
                    >
                      View on Google Maps ↗
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
