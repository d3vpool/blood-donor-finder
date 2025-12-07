// src/components/ContactModal.jsx
import React, { useState, useEffect } from "react";
import "./ContactModal.css";
import { init, send } from "@emailjs/browser";
import { auth, db } from "../firebase"; // ensure this path matches your firebase export
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

/**
 * ContactModal
 * Props:
 *  - user: donor object
 *  - recipient: optional object { name, email, bloodType, message } (you can also rely on auth.currentUser)
 *  - onClose: close callback
 *
 * Requires in .env (frontend):
 *  REACT_APP_EMAILJS_PUBLIC_KEY
 *  REACT_APP_EMAILJS_SERVICE_ID
 *  REACT_APP_EMAILJS_TEMPLATE_ID
 */
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

  // Compute donor UID
  const donorUid =
    user.uid ||
    user.id ||
    user.userId ||
    user.donorId ||
    user.uidRef ||
    null;

  if (!donorUid) {
    console.warn("No donorUid found in user object", { user });
  }

  const escapeHtml = (str) => {
    if (str === null || str === undefined) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  };

  // Donor fields (defensive)
  const name = user.fullname || user.name || user.displayName || user.full_name || "Donor";
  const donorEmail = user.email || user.mail || "";
  const phone = user.phoneNo || user.contact || user.phone || "";
  const bloodGroup = user.bloodType || user.bloodGroup || user.blood || "Unknown";
  const address = user.address || user.city || user.location?.address || "";
  let locationText = address;
  if (!locationText) {
    const lat = user.location?.latitude ?? user.location?.lat;
    const lng = user.location?.longitude ?? user.location?.lng;
    if (Number.isFinite(Number(lat)) && Number.isFinite(Number(lng))) {
      locationText = `${Number(lat).toFixed(6)}, ${Number(lng).toFixed(6)}`;
    } else {
      locationText = "Not provided";
    }
  }

  // Recipient info: prefer explicit prop, else use logged-in user
  const currentUser = auth?.currentUser || null;
  const recipientName = /* name || */ recipient.name || currentUser?.displayName || currentUser?.fullname || "Recipient";
  const recipientEmail = recipient.email || currentUser?.email || "";

  // Accept / reject links (point to your hosted endpoint or a simple mailto / UI path)
  const origin = window.location.origin;
  const acceptLink = `${origin}/email-response?action=accept&donor=${encodeURIComponent(donorEmail)}&recipient=${encodeURIComponent(recipientEmail)}`;
  const rejectLink = `${origin}/email-response?action=reject&donor=${encodeURIComponent(donorEmail)}&recipient=${encodeURIComponent(recipientEmail)}`;

  async function handleRequest() {
    setSending(true);
    setError(null);
    setSent(false);

    const serviceId = process.env.REACT_APP_EMAILJS_SERVICE_ID;
    const templateId = process.env.REACT_APP_EMAILJS_TEMPLATE_ID;

    if (!serviceId || !templateId) {
      setError("EmailJS service/template not configured in .env");
      setSending(false);
      return;
    }

    if (!donorEmail) {
      setError("Donor has no email on record.");
      setSending(false);
      return;
    }

    // Build template params: these must match the variable names you set in the EmailJS template
    const templateParams = {
      // visible variables in HTML template
      name: recipientName, // the person requesting blood
      message: recipientMessage || recipient.message || `Requesting ${bloodGroup} blood — please respond if available.`,
      bloodtype: recipient.bloodType || recipient.blood || bloodGroup,
      accept_link: acceptLink,
      reject_link: rejectLink,

      // hidden / non-displayed variables (still available in template engine, and for EmailJS)
      donor_email: donorEmail,
      recipient_email: recipientEmail,
    };

    try {
      await send(serviceId, templateId, templateParams);
      
      // Create Firestore document in requests collection to trigger Cloud Function
      if (donorUid) {
        try {
          const bloodTypeToUse = recipient.bloodType || recipient.blood || bloodGroup;
          await addDoc(collection(db, "requests"), {
            toUid: donorUid,
            fromUid: currentUser?.uid || null,
            bloodType: bloodTypeToUse,
            quantity: 1,
            message: recipientMessage || recipient.message || "",
            createdAt: serverTimestamp(),
          });
          console.log("Firestore request document created", { donorUid, bloodType: bloodTypeToUse });
        } catch (firestoreErr) {
          console.error("Error creating Firestore request document:", firestoreErr);
          // Don't fail the whole request if Firestore write fails
        }
      } else {
        console.warn("No donorUid found; not creating requests doc", { user });
      }
      
      setSent(true);
      console.log("EmailJS: request sent", templateParams);
    } catch (err) {
      console.error("EmailJS send error:", err);
      // EmailJS returns an object in many cases; extract meaningful message
      const msg = (err && (err.text || err.message)) || JSON.stringify(err);
      setError(msg);
    } finally {
      setSending(false);
    }
  }

  return (
    <div id="contactModal" className="modal" role="dialog" aria-modal="true">
      <div className="modal-content">
        <div className="modal-header">
          <h3>Contact Donor</h3>
          <button
            className="modal-close"
            onClick={onClose}
            aria-label="Close contact modal"
          >
            &times;
          </button>
        </div>

        <div className="modal-body">
          <p><strong>Name:</strong> {escapeHtml(name)}</p>
          <p><strong>Blood Group:</strong> {escapeHtml(bloodGroup)}</p>
          <p><strong>Location:</strong> {escapeHtml(locationText)}</p>

          <p>
            <strong>Phone:</strong>{" "}
            {phone ? <a href={`tel:${escapeHtml(phone)}`}>{escapeHtml(phone)}</a> : "Not provided"}
          </p>

          <p>
            <strong>Email:</strong>{" "}
            {donorEmail ? <a href={`mailto:${escapeHtml(donorEmail)}`}>{escapeHtml(donorEmail)}</a> : "Not provided"}
          </p>

          <div className="input-block">
            <label htmlFor="recipientMessage">
              Your Details (Address + Phone)
            </label>
            <textarea
              id="recipientMessage"
              placeholder="ADDRESS AND PHONE NUMBER"
              value={recipientMessage}
              onChange={(e) => setRecipientMessage(e.target.value)}
              className="contact-textarea"
              rows={4}
            />
          </div>

          <p className="contact-note">
            Please be respectful when contacting donors. Explain your situation clearly and provide your contact information.
          </p>

          {error && <div className="error-message" role="alert">{error}</div>}
          {sent && <div className="success-message" role="status">Request email sent to donor.</div>}
        </div>

        <div className="modal-footer">
          <button
            className="request-button"
            disabled={sending || sent}
            onClick={handleRequest}
          >
            {sending ? "Sending..." : sent ? "Sent" : "Request Blood"}
          </button>

          <button className="contact-button" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
