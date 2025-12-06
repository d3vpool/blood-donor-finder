import React, { useState } from "react";
import ContactModal from "./ContactModal";
import "./SearchResult.css";

export default function SearchResult({ results = [], focusOn }) {
  const [selectedUser, setSelectedUser] = useState(null);

  const handleShowOnMap = (lat, lng) => {
    const container = document.getElementById("donorMapContainer");
    if (container) {
      try {
        container.scrollIntoView({ behavior: "smooth", block: "start" });
      } catch (_) {
        // fallback
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    }
    // give scroll a short moment to start, then call focus
    setTimeout(() => {
      if (typeof focusOn === "function") focusOn(Number(lat), Number(lng), 15);
    }, 350);
  };

  return (
    <section className="search-result" id="search-result">
      <div className="container">
        <div id="searchResults" className="search-results">
          <h3 className="results-title">Available Donors</h3>

          {results.length === 0 ? (
            <p>No donors found.</p>
          ) : (
            <div id="donorCards" className="donor-grid">
              {results.map((user, idx) => {
                const lat =
                  user?.location?.latitude ?? user?.location?.lat;
                const lng =
                  user?.location?.longitude ?? user?.location?.lng;

                return (
                  <div
                    key={user.email || idx}
                    className="donor-card"
                  >
                    <div className="donor-card-header">
                      <span className="donor-name">
                        {user.fullname}
                      </span>
                      <span className="donor-blood">
                        {user.bloodType || user.bloodGroup}
                      </span>
                    </div>

                    <div className="donor-details">
                      <p>Location: {user.address}</p>
                      <p>Contact: {user.phoneNo}</p>
                      <p>Email: {user.email}</p>
                    </div>

                    <div className="donor-card-actions">
                      <button
                        className="contact-btn"
                        onClick={() => setSelectedUser(user)}
                      >
                        Contact Donor
                      </button>

                      <button
                        className="focus-btn"
                        onClick={() => {
                          if (lat != null && lng != null) handleShowOnMap(lat, lng);
                        }}
                      >
                        Show on map
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {selectedUser && (
        <ContactModal
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
        />
      )}
    </section>
  );
}
