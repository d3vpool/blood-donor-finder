// src/components/ContactModal.jsx
import React, { useState, useEffect } from "react";
import { init, send } from "@emailjs/browser";
import { auth, db } from "../firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

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
    <div id="contactModal" className="fixed inset-0 w-full h-full bg-black/60 flex items-center justify-center z-[999]" role="dialog" aria-modal="true">
      <div className="relative bg-white p-6 rounded-xl w-[90%] max-w-[420px] shadow-[0_4px_10px_rgba(0,0,0,0.2)]">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-gray-800">Contact Donor</h3>
          <button className="text-gray-400 hover:text-red-500 transition-colors text-2xl leading-none bg-transparent border-none cursor-pointer p-0" onClick={onClose} aria-label="Close">&times;</button>
        </div>

        <div className="space-y-2 text-sm text-gray-700 mb-4">
          <p><strong>Name:</strong> {escapeHtml(name)}</p>
          <p><strong>Blood Group:</strong> <span className="text-red-600 font-bold">{escapeHtml(bloodGroup)}</span></p>
          <p><strong>Location:</strong> {escapeHtml(locationText)}</p>
          <p><strong>Phone:</strong> {phone ? <a href={`tel:${escapeHtml(phone)}`} className="text-[#e74c3c] font-medium hover:underline">{escapeHtml(phone)}</a> : "Not provided"}</p>
          <p><strong>Email:</strong> {donorEmail ? <a href={`mailto:${escapeHtml(donorEmail)}`} className="text-[#e74c3c] font-medium hover:underline">{escapeHtml(donorEmail)}</a> : "Not provided"}</p>
        </div>

        <div className="mb-4">
          <label htmlFor="recipientMessage" className="block text-sm font-medium text-gray-700 mb-1.5">Your Details (Address + Phone)</label>
          <textarea id="recipientMessage" placeholder="ADDRESS AND PHONE NUMBER" value={recipientMessage} onChange={(e) => setRecipientMessage(e.target.value)} className="w-full min-h-[80px] p-2 border border-gray-300 rounded-lg text-sm resize-y focus:outline-none focus:border-[#e74c3c] focus:ring-2 focus:ring-red-200" rows={4} />
        </div>

        <p className="bg-red-50 border-l-4 border-[#e74c3c] text-red-700 text-xs py-2.5 px-3 rounded-md mb-4 leading-relaxed">
          Please be respectful when contacting donors. Explain your situation clearly and provide your contact information.
        </p>

        {error && <div className="bg-red-100 text-red-600 text-sm py-2 px-3 rounded-md mb-3" role="alert">{error}</div>}
        {sent && <div className="bg-green-100 text-green-700 text-sm py-2 px-3 rounded-md mb-3" role="status">Request email sent to donor.</div>}

        <button className="w-full bg-green-500 text-white border-none rounded-lg py-2.5 px-4 font-semibold cursor-pointer mb-2.5 hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed" disabled={sending || sent} onClick={handleRequest}>
          {sending ? "Sending..." : sent ? "Sent ✓" : "Request Blood"}
        </button>
        <button className="w-full bg-[#e74c3c] text-white border-none rounded-lg py-2.5 px-4 font-semibold cursor-pointer hover:bg-[#c0392b] transition-colors" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}
