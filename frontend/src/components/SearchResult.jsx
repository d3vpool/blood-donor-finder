import React, { useState } from "react";
import ContactModal from "./ContactModal";
import DirectRequestModal from "./DirectRequestModal";

function SearchResultSkeleton() {
  return (
    <div className="bg-white p-7 rounded-3xl border border-slate-100 shadow-sm animate-pulse">
      <div className="flex items-center gap-3.5 mb-5">
        <div className="w-11 h-11 bg-slate-200 rounded-2xl shrink-0"></div>
        <div className="flex-grow space-y-2">
          <div className="h-4 bg-slate-200 rounded-md w-3/4"></div>
          <div className="h-3 bg-slate-200 rounded-md w-1/2"></div>
        </div>
      </div>
      <div className="space-y-3.5 mb-6">
        <div className="h-4 bg-slate-200 rounded-md w-full"></div>
        <div className="h-4 bg-slate-200 rounded-md w-5/6"></div>
      </div>
      <div className="space-y-2.5">
        <div className="h-11 bg-slate-200 rounded-xl w-full"></div>
        <div className="h-11 bg-slate-200 rounded-xl w-full"></div>
      </div>
    </div>
  );
}

function formatDistance(meters) {
  const m = Number(meters);
  if (!Number.isFinite(m) || m < 0) return null;
  if (m < 1000) return `${Math.round(m)} m`;
  return `${(m / 1000).toFixed(1)} km`;
}

export default function SearchResult({ results = [], focusOn, isSearching, recipientLocation }) {
  const [selectedUser, setSelectedUser] = useState(null);
  const [requestTarget, setRequestTarget] = useState(null);

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
    <section className="py-24 bg-white" id="search-result">
      <div className="max-w-5xl mx-auto px-6">
        <div id="searchResults" className="animate-slide-up">
          <div className="flex items-center justify-between mb-10">
            <div>
              <h3 className="text-2xl font-extrabold text-slate-900 tracking-tight mb-2">Available Donors</h3>
              <p className="text-sm text-slate-500 font-medium">Click on a donor profile to contact them or pinpoint their location on the map.</p>
            </div>
            {results.length > 0 && !isSearching && (
              <span className="bg-red-50 text-red-600 font-extrabold text-xs px-3.5 py-1.5 rounded-full border border-red-100 select-none shadow-sm">
                Found {results.length} Donors
              </span>
            )}
          </div>

          {isSearching ? (
            <div id="donorCards" className="grid grid-cols-[repeat(auto-fit,minmax(290px,1fr))] gap-6">
              <SearchResultSkeleton />
              <SearchResultSkeleton />
              <SearchResultSkeleton />
            </div>
          ) : results.length === 0 ? (
            <div className="text-center py-16 px-6 bg-slate-50 border border-slate-100 rounded-3xl col-span-full">
              <span className="block text-3xl mb-3">🔍</span>
              <p className="text-slate-500 font-bold text-sm">No donors found within the search range.</p>
            </div>
          ) : (
            <div id="donorCards" className="grid grid-cols-[repeat(auto-fit,minmax(290px,1fr))] gap-6">
              {results.map((user, idx) => {
                const lat = user?.location?.latitude ?? user?.location?.lat;
                const lng = user?.location?.longitude ?? user?.location?.lng;
                const initials = (user.fullname || "Donor").split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
                const distanceLabel = formatDistance(user.distance);

                return (
                  <div key={user.email || idx} className="bg-white p-7 rounded-3xl border border-slate-100 shadow-[0_4px_20px_rgba(15,23,42,0.02)] hover:shadow-[0_20px_45px_rgba(15,23,42,0.06)] hover:-translate-y-1.5 transition-all duration-300 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-3.5 mb-5">
                        <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-red-500/10 to-rose-500/5 text-red-600 font-extrabold text-sm flex items-center justify-center border border-red-500/15 shrink-0 select-none">
                          {initials}
                        </div>
                        <div className="min-w-0 flex-grow">
                          <span className="block font-extrabold text-slate-900 text-base tracking-tight truncate leading-tight">{user.fullname}</span>
                          <span className="flex items-center gap-1 text-[10px] font-bold text-slate-500 mt-0.5">
                            <svg className="w-3.5 h-3.5 text-red-500 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"/></svg>
                            {distanceLabel ? `${distanceLabel} from you` : "Active Volunteer"}
                          </span>
                        </div>
                        <span className="bg-red-50 text-red-700 font-black text-xs px-3.5 py-1.5 rounded-2xl border border-red-100 shrink-0 select-none shadow-sm shadow-red-500/5">{user.bloodType || user.bloodGroup}</span>
                      </div>

                      <div className="text-sm text-slate-600 space-y-2.5 mb-6 font-medium border-t border-slate-100 pt-4">
                        <p className="flex items-start gap-2.5">
                          <svg className="w-4 h-4 text-red-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                          <span className="break-words text-xs">{user.address}</span>
                        </p>
                        <p className="flex items-center gap-2.5">
                          <svg className="w-4 h-4 text-slate-400 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.94.725l.548 2.2a1 1 0 01-.321.988l-1.305.98a10.582 10.582 0 004.872 4.872l.98-1.305a1 1 0 01.988-.321l2.2.548a1 1 0 01.725.94V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>
                          <span className="text-xs">{user.phoneNo}</span>
                        </p>
                        <p className="flex items-center gap-2.5">
                          <svg className="w-4 h-4 text-slate-400 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
                          <span className="break-all text-xs">{user.email}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <button
                        className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white border-none rounded-xl py-3 px-4 w-full font-bold cursor-pointer transition-all shadow-md shadow-green-500/10 hover:shadow-lg hover:shadow-green-500/20 hover:scale-[1.01] active:scale-[0.99]"
                        onClick={() => setRequestTarget(user)}
                      >
                        Send Blood Request
                      </button>
                      <button
                        className="bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white border-none rounded-xl py-3 px-4 w-full font-bold cursor-pointer transition-all shadow-md shadow-red-500/10 hover:shadow-lg hover:shadow-red-500/20 hover:scale-[1.01] active:scale-[0.99]"
                        onClick={() => setSelectedUser(user)}
                      >
                        Contact Donor
                      </button>
                      <button
                        className="bg-slate-100 hover:bg-slate-200 text-slate-700 border-none rounded-xl py-3 px-4 w-full font-bold cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.99]"
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

      {requestTarget && (
        <DirectRequestModal
          donor={requestTarget}
          recipientLocation={recipientLocation}
          onClose={() => setRequestTarget(null)}
        />
      )}
    </section>
  );
}
