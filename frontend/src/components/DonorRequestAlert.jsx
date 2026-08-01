// src/components/DonorRequestAlert.jsx
import React from "react";

const urgencyColors = {
  Critical: "text-red-700 bg-red-50 border-red-200",
  Urgent: "text-amber-700 bg-amber-50 border-amber-200",
  Standard: "text-blue-700 bg-blue-50 border-blue-200",
};

export default function DonorRequestAlert({ request, onView, onDismiss }) {
  const isCritical = request.urgency === "Critical";

  return (
    <div
      className={`fixed top-20 right-4 md:right-6 z-[9999] w-[92vw] max-w-sm animate-slide-up ${
        isCritical ? "animate-critical-pulse" : ""
      }`}
      role="alertdialog"
      aria-modal="true"
    >
      <div
        className={`bg-white rounded-3xl p-5 shadow-2xl border ${
          isCritical ? "border-red-400 shadow-red-500/25" : "border-slate-200 shadow-slate-200/60"
        }`}
      >
        <div className="flex items-start gap-3 mb-4">
          <div className="w-12 h-12 shrink-0 rounded-2xl bg-gradient-to-tr from-red-500 to-rose-600 text-white flex items-center justify-center select-none">
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2s-6.5 7.5-6.5 12a6.5 6.5 0 0 0 13 0C18.5 9.5 12 2 12 2z" />
            </svg>
          </div>
          <div className="min-w-0 flex-grow">
            <p className="text-[10px] uppercase tracking-wider font-extrabold text-red-600 mb-0.5">
              New Blood Request
            </p>
            <h3 className="text-base font-extrabold text-slate-900 tracking-tight truncate">
              {request.patientName || "Urgent Request"}
            </h3>
          </div>
          <button
            className="text-slate-400 hover:text-slate-600 transition-colors bg-slate-50 hover:bg-slate-100 rounded-full flex items-center justify-center w-7 h-7 border border-slate-100 cursor-pointer text-base leading-none shrink-0"
            onClick={onDismiss}
            aria-label="Dismiss alert"
          >
            &times;
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 mb-4">
          <span className="bg-red-50 text-red-700 border border-red-100 text-xs font-black px-3 py-1 rounded-full select-none">
            {request.bloodType || "Blood"} NEEDED
          </span>
          <span
            className={`text-[10px] font-black tracking-widest uppercase px-2.5 py-1 rounded-full border select-none ${
              urgencyColors[request.urgency] || "bg-slate-50 border-slate-200 text-slate-600"
            }`}
          >
            {request.urgency || "Standard"}
          </span>
        </div>

        {request.hospitalName && (
          <p className="text-xs text-slate-600 font-medium mb-5 break-words">
            <strong className="text-slate-900">Hospital:</strong> {request.hospitalName}
          </p>
        )}

        <div className="flex flex-col gap-2">
          <button
            className="w-full bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white border-none rounded-xl py-3 px-4 font-bold cursor-pointer transition-all shadow-md shadow-red-500/10 hover:shadow-lg hover:scale-[1.01] active:scale-[0.99] text-xs"
            onClick={onView}
          >
            View Request
          </button>
          <button
            className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 border-none rounded-xl py-2.5 px-4 font-bold cursor-pointer transition-all text-xs"
            onClick={onDismiss}
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
