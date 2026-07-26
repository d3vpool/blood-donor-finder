// src/components/ContactModal.jsx
import React, { useState, useEffect } from "react";
import { init, send } from "@emailjs/browser";
import { auth, db } from "../firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

const inputClass = "w-full min-h-[90px] p-4 border border-slate-200 rounded-xl text-sm font-semibold bg-slate-50 text-slate-900 focus:outline-none focus:border-red-500 focus:ring-4 focus:ring-red-500/10 focus:bg-white resize-none transition-all shadow-sm hover:border-slate-300";

export default function ContactModal({ user, recipient = {}, onClose }) {
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(null);
  const [recipientMessage, setRecipientMessage] = useState("");

  useEffect(() => {
    const pub = process.env.REACT_APP_EMAILJS_PUBLIC_KEY;
    if (pub) init(pub);
  }, []);

  if (!user) return null;

  const donorUid = user.uid || user.id || user.userId || user.donorId || null;
  const escapeHtml = (str) => str == null ? "" : String(str).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;");

  const name = user.fullname || user.name || user.displayName || "Donor";
  const donorEmail = user.email || user.mail || "";
  const phone = user.phoneNo || user.contact || user.phone || "";
  const bloodGroup = user.bloodType || user.bloodGroup || "Unknown";
  const address = user.address || user.city || "";
  let locationText = address;
  if (!locationText) {
    const lat = user.location?.latitude ?? user.location?.lat;
    const lng = user.location?.longitude ?? user.location?.lng;
    locationText = (Number.isFinite(Number(lat)) && Number.isFinite(Number(lng))) ? `${Number(lat).toFixed(6)}, ${Number(lng).toFixed(6)}` : "Not provided";
  }

  const currentUser = auth?.currentUser || null;
  const recipientName = recipient.name || currentUser?.displayName || "Recipient";
  const recipientEmail = recipient.email || currentUser?.email || "";
  const origin = window.location.origin;
  const acceptLink = `${origin}/email-response?action=accept&donor=${encodeURIComponent(donorEmail)}&recipient=${encodeURIComponent(recipientEmail)}`;
  const rejectLink = `${origin}/email-response?action=reject&donor=${encodeURIComponent(donorEmail)}&recipient=${encodeURIComponent(recipientEmail)}`;

  async function handleRequest() {
    setSending(true); setError(null); setSent(false);
    const serviceId = process.env.REACT_APP_EMAILJS_SERVICE_ID;
    const templateId = process.env.REACT_APP_EMAILJS_TEMPLATE_ID;
    if (!serviceId || !templateId) { setError("EmailJS service/template not configured in .env"); setSending(false); return; }
    if (!donorEmail) { setError("Donor has no email on record."); setSending(false); return; }
    const templateParams = { name: recipientName, message: recipientMessage || `Requesting ${bloodGroup} blood — please respond if available.`, bloodtype: recipient.bloodType || bloodGroup, accept_link: acceptLink, reject_link: rejectLink, donor_email: donorEmail, recipient_email: recipientEmail };
    try {
      await send(serviceId, templateId, templateParams);
      try {
        if (donorUid) await addDoc(collection(db, "requests"), { toUid: donorUid, fromUid: currentUser?.uid || null, bloodType: recipient.bloodType || bloodGroup, quantity: 1, message: recipientMessage || "", createdAt: serverTimestamp() });
      } catch (e) { console.error("Error creating Firestore request doc:", e); }
      setSent(true);
    } catch (err) { setError((err && (err.text || err.message)) || JSON.stringify(err)); }
    finally { setSending(false); }
  }

  return (
    <div id="contactModal" className="fixed inset-0 w-full h-full bg-slate-950/40 flex items-center justify-center z-[999] backdrop-blur-[4px] animate-fade-in" role="dialog" aria-modal="true">
      <div className="relative bg-white p-8 rounded-3xl w-[95%] max-w-[440px] shadow-[0_20px_50px_rgba(15,23,42,0.15)] border border-slate-100 animate-slide-up">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">Contact Donor</h3>
          <button className="text-slate-400 hover:text-slate-600 transition-colors bg-slate-50 hover:bg-slate-100 rounded-full flex items-center justify-center w-8 h-8 border border-slate-100 cursor-pointer text-xl leading-none" onClick={onClose} aria-label="Close">&times;</button>
        </div>

        <div className="space-y-3 text-sm text-slate-600 mb-6 bg-slate-50 p-5 rounded-2xl border border-slate-100 font-medium">
          <p className="flex justify-between border-b border-slate-200/50 pb-2.5"><strong className="text-slate-900">Name:</strong> <span className="font-bold text-slate-900">{escapeHtml(name)}</span></p>
          <p className="flex justify-between border-b border-slate-200/50 pb-2.5"><strong className="text-slate-900">Blood Group:</strong> <span className="text-red-700 font-black bg-red-50 border border-red-100 px-2.5 py-0.5 rounded-full text-xs">{escapeHtml(bloodGroup)}</span></p>
          <p className="flex justify-between border-b border-slate-200/50 pb-2.5"><strong className="text-slate-900">Location:</strong> <span className="max-w-[200px] truncate font-bold text-slate-900" title={locationText}>{escapeHtml(locationText)}</span></p>
          <p className="flex justify-between border-b border-slate-200/50 pb-2.5"><strong className="text-slate-900">Phone:</strong> {phone ? <a href={`tel:${escapeHtml(phone)}`} className="text-red-600 font-black hover:underline">{escapeHtml(phone)}</a> : <span className="text-slate-400">Not provided</span>}</p>
          <p className="flex justify-between"><strong className="text-slate-900">Email:</strong> {donorEmail ? <a href={`mailto:${escapeHtml(donorEmail)}`} className="text-red-600 font-black hover:underline max-w-[200px] truncate" title={donorEmail}>{escapeHtml(donorEmail)}</a> : <span className="text-slate-400">Not provided</span>}</p>
        </div>

        <div className="mb-5">
          <label htmlFor="recipientMessage" className="block text-[10px] uppercase tracking-wider font-extrabold text-slate-400 mb-2">Your Contact Details / Situation</label>
          <textarea 
            id="recipientMessage" 
            placeholder="Please enter your address, phone number, and brief reason so the donor can contact you back easily." 
            value={recipientMessage} 
            onChange={(e) => setRecipientMessage(e.target.value)} 
            className={inputClass} 
            rows={3} 
          />
        </div>

        <p className="bg-red-50/70 border-l-4 border-red-500 text-red-800 text-xs py-3 px-4 rounded-r-xl mb-6 leading-relaxed font-semibold">
          Please write respectfully. State your contact info clearly so the donor can act fast.
        </p>

        {error && <div className="bg-red-50 border border-red-200 text-red-700 text-xs py-2.5 px-3 rounded-xl mb-4 font-bold text-center animate-fade-in" role="alert">⚠️ {error}</div>}
        {sent && <div className="bg-green-50 border border-green-200 text-green-700 text-xs py-2.5 px-3 rounded-xl mb-4 font-bold text-center animate-fade-in" role="status">✓ Request email sent to donor.</div>}

        <div className="flex flex-col gap-2">
          <button 
            className="w-full bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white border-none rounded-xl py-3.5 px-4 font-bold cursor-pointer transition-all shadow-md shadow-red-500/10 hover:shadow-lg hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 text-sm" 
            disabled={sending || sent} 
            onClick={handleRequest}
          >
            {sending ? "Sending Request..." : sent ? "Request Sent ✓" : "Send Blood Request"}
          </button>
          <button className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 border-none rounded-xl py-3.5 px-4 font-bold cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.99] text-sm" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
