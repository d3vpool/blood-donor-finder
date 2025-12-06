// src/components/DonorMap.jsx
import React, { useEffect, useRef, useState } from "react";
import { GoogleMap, useJsApiLoader } from "@react-google-maps/api";

const containerStyle = { width: "100%", height: "400px" };

export default function DonorMap({
  recipientLocation,
  donors = [],
  setMapController
}) {
  const apiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
  const { isLoaded, loadError } = useJsApiLoader({ googleMapsApiKey: apiKey });

  const escapeHtml = (str) => {
  if (!str && str !== "") return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
  };


  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const infoWindowRef = useRef(null);
  const [mapReady, setMapReady] = useState(false);

  const normalized = (() => {
    if (!recipientLocation) return null;

    const latRaw =
      recipientLocation.lat ??
      recipientLocation.latitude ??
      (recipientLocation.coords && recipientLocation.coords.latitude);

    const lngRaw =
      recipientLocation.lng ??
      recipientLocation.longitude ??
      (recipientLocation.coords && recipientLocation.coords.longitude);

    const lat = Number(latRaw);
    const lng = Number(lngRaw);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

    return { lat, lng };
  })();

  useEffect(() => {
    console.log("DonorMap input recipientLocation:", recipientLocation);
    console.log("DonorMap normalized:", normalized);
  }, [recipientLocation]);

  useEffect(() => {
    if (!isLoaded || !mapReady || !mapRef.current) return;

    const map = mapRef.current;

    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    if (!infoWindowRef.current)
      infoWindowRef.current = new window.google.maps.InfoWindow();
    else infoWindowRef.current.close();

    if (normalized) {
      const userMarker = new window.google.maps.Marker({
        position: normalized,
        map,
        icon: "https://maps.gstatic.com/mapfiles/ms2/micons/blue-dot.png",
        title: "Your Location",
      });
      markersRef.current.push(userMarker);

      map.setCenter(normalized);
      map.setZoom(13);
    } else {
      console.warn("normalized is null — skipping setCenter");
    }

    donors.forEach((d) => {
      const lat = Number(d.location?.latitude ?? d.location?.lat);
      const lng = Number(d.location?.longitude ?? d.location?.lng);

      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

      const pos = { lat, lng };

      const m = new window.google.maps.Marker({
        position: pos,
        map,
        title: d.fullname,
      });

      m.addListener("click", () => {
        const gmapsUrl = `https://www.google.com/maps?q=${pos.lat},${pos.lng}`;

        infoWindowRef.current.setContent(`
          <div style="min-width:220px">
            <div><strong>${escapeHtml(d.fullname || "Donor")}</strong></div>
            <div style="font-size:13px;color:#555">${escapeHtml(d.email || "")}</div>
                
            <div style="margin-top:6px">
              <a href="${gmapsUrl}" 
                target="_blank" 
                rel="noopener noreferrer"
                style="color:#1a73e8; font-weight:600; text-decoration:none;">
                View on Google Maps
              </a>
            </div>
          </div>
        `);
        infoWindowRef.current.open(map, m);
      });

      markersRef.current.push(m);
    });
  }, [isLoaded, mapReady, donors, normalized]);

  useEffect(() => {
    if (!isLoaded || !mapReady || !mapRef.current) {
      setMapController(null);
      return;
    }

    setMapController({
      focusOn: (lat, lng) => {
        const map = mapRef.current;

        const pos = { lat: Number(lat), lng: Number(lng) };
        if (!Number.isFinite(pos.lat) || !Number.isFinite(pos.lng)) {
          console.warn("focusOn received invalid coords:", pos);
          return;
        }

        map.panTo(pos);
        map.setZoom(15);

        const marker = markersRef.current.find((m) => {
          const p = m.getPosition().toJSON();
          return p.lat === pos.lat && p.lng === pos.lng;
        });

        if (marker) {
          const donor = donors.find(
            (d) =>
              Number(d.location.latitude) === pos.lat &&
              Number(d.location.longitude) === pos.lng
          );
          if (donor) {
            const gmapsUrl = `https://www.google.com/maps?q=${pos.lat},${pos.lng}`;

            infoWindowRef.current.setContent(`
              <div style="min-width:220px">
                <div><strong>${escapeHtml(donor.fullname || "Donor")}</strong></div>
                <div style="font-size:13px;color:#555">${escapeHtml(donor.email || "")}</div>
                
                <div style="margin-top:6px">
                  <a href="${gmapsUrl}" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    style="color:#1a73e8; font-weight:600; text-decoration:none;">
                    View on Google Maps
                  </a>
                </div>
              </div>
            `);

            infoWindowRef.current.open(map, marker);
          }
        }

        // No direct DOM scrolling here; SearchResult triggers scroll.
      },
    });

    return () => setMapController(null);
  }, [isLoaded, mapReady, donors]);

  if (loadError) return <div>Map failed to load</div>;
  if (!isLoaded) return null;

  return (
    <div id="donorMapContainer" style={{ width: "100%" }}>
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={normalized || { lat: 12.9716, lng: 77.5946 }}
        zoom={normalized ? 13 : 11}
        onLoad={(m) => {
          mapRef.current = m;
          setMapReady(true);
        }}
        onUnmount={() => {
          mapRef.current = null;
          setMapReady(false);
        }}
      />
    </div>
  );
}
