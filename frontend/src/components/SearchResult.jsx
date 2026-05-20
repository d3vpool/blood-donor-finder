import React, { useState } from "react";
import ContactModal from "./ContactModal";

export default function SearchResult({ results = [], focusOn }) {
  const [selectedUser, setSelectedUser] = useState(null);

  const handleShowOnMap = (lat, lng) => {
    const container = document.getElementById("donorMapContainer");
    if (container) {
      try { container.scrollIntoView({ behavior: "smooth", block: "start" }); }
      catch (_) { window.scrollTo({ top: 0, behavior: "smooth" }); }
    }
    setTimeout(() => {
      if (typeof focusOn === "function") focusOn(Number(lat), Number(lng), 15);
    }, 350);
  };

  return (
    <section className="py-16" id="search-result">
      <div className="max-w-5xl mx-auto px-6">
        <div id="searchResults">
          <h3 className="text-2xl font-bold mb-6">Available Donors</h3>

          {results.length === 0 ? (
            <div className="text-center py-8 bg-white rounded-2xl shadow-sm col-span-full">
              <p className="text-gray-500">No donors found.</p>
            </div>
          ) : (
            <div id="donorCards" className="grid grid-cols-[repeat(auto-fit,minmax(250px,1fr))] gap-5">
              {results.map((user, idx) => {
                const lat = user?.location?.latitude ?? user?.location?.lat;
                const lng = user?.location?.longitude ?? user?.location?.lng;
                return (
                  <div key={user.email || idx} className="bg-white p-5 rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.1)] transition-all duration-300 hover:shadow-md hover:-translate-y-0.5">
                    <div className="flex justify-between items-center mb-3">
                      <span className="font-bold text-gray-900 text-lg">{user.fullname}</span>
                      <span className="bg-red-100 text-red-700 font-bold text-sm px-2.5 py-1 rounded-full">{user.bloodType || user.bloodGroup}</span>
                    </div>

                    <div className="text-sm text-gray-600 space-y-1 mb-4">
                      <p>📍 {user.address}</p>
                      <p>📞 {user.phoneNo}</p>
                      <p>✉️ {user.email}</p>
                    </div>

                    <div className="flex flex-col gap-2">
                      <button
                        className="bg-[#e74c3c] text-white border-none rounded-md py-2.5 px-4 w-full font-semibold cursor-pointer hover:bg-[#c0392b] transition-colors"
                        onClick={() => setSelectedUser(user)}
                      >
                        Contact Donor
                      </button>
                      <button
                        className="bg-gray-100 text-gray-700 border-none rounded-md py-2.5 px-4 w-full font-medium cursor-pointer hover:bg-gray-200 transition-colors"
                        onClick={() => { if (lat != null && lng != null) handleShowOnMap(lat, lng); }}
                      >
                        Show on Map
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
        <ContactModal user={selectedUser} onClose={() => setSelectedUser(null)} />
      )}
    </section>
  );
}
