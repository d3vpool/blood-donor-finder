// backend/functions/index.js
const admin = require("firebase-admin");
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { logger } = require("firebase-functions");
//const { onRequest } = require("firebase-functions/v2/https");
const nodemailer = require("nodemailer");
//const functions = require("firebase-functions");

admin.initializeApp();
const db = admin.firestore();

// --- safe SMTP config (no functions.config() calls) ---
let smtpUser = process.env.SMTP_USER || process.env.SMTP_USER_LOCAL;
let smtpPass = process.env.SMTP_PASS || process.env.SMTP_PASS_LOCAL;

try {
  const localCfg = require("./.runtimeconfig.json");
  smtpUser = smtpUser || (localCfg && localCfg.smtp && localCfg.smtp.user);
  smtpPass = smtpPass || (localCfg && localCfg.smtp && localCfg.smtp.pass);
} catch (e) {
  // no local runtimeconfig — that's fine
}

if (!smtpUser || !smtpPass) {
  logger.warn("SMTP credentials missing in environment. Using jsonTransport for local dev (no real emails will be sent).");
}
logger.info("ENV CHECK SMTP_USER/SMTP_PASS", {
  env_SMTP_USER: !!process.env.SMTP_USER,
  env_SMTP_PASS: !!process.env.SMTP_PASS,
  effective_smtpUser: !!smtpUser,
  effective_smtpPass: !!smtpPass
});




const transporter = smtpUser && smtpPass
  ? nodemailer.createTransport({
      service: "gmail",
      auth: { user: smtpUser, pass: smtpPass }
    })
  : nodemailer.createTransport({ jsonTransport: true });

// optional verify - logs readiness / error
transporter.verify((err, success) => {
  if (err) {
    logger.warn("Mailer transport verification failed", { err: err.message || err });
  } else {
    logger.info("Mailer transport ready");
  }
});



exports.notifyDonorOnRequest = onDocumentCreated(
  "requests/{reqId}",
  async (event) => {
    const reqId = event.params?.reqId;
    logger.info("notifyDonorOnRequest triggered", { reqId });

    try {
      const reqData = event.data?.data || {};
      const toUid = reqData?.toUid;
      const quantity = reqData?.quantity;
      const bloodType = reqData?.bloodType;

      logger.info("Request document data", { reqData, toUid, quantity, bloodType });

      if (!toUid) {
        logger.warn("Missing toUid in request doc", { reqId, reqData });
        return;
      }

      // 1) Try UserTokens/<toUid>
      let fcmToken = null;
      const tokenDocRef = db.doc(`UserTokens/${toUid}`);
      try {
        const tokenSnap = await tokenDocRef.get();
        if (tokenSnap.exists) {
          const td = tokenSnap.data();
          // Check if fcmTokens is an array and find the first non-empty string token
          if (Array.isArray(td.fcmTokens)) {
            fcmToken = td.fcmTokens.find(token => typeof token === 'string' && token.trim().length > 0) || null;
            if (fcmToken) {
              logger.info("Found token in UserTokens", { toUid });
              logger.info("Using FCM token from UserTokens", { toUid, token: fcmToken });
            } else {
              logger.info("UserTokens doc has no fcmTokens or empty array", { toUid, td });
            }
          } else {
            logger.info("UserTokens doc has no fcmTokens or empty array", { toUid, td });
          }
        }
      } catch (err) {
        logger.error("Error reading UserTokens doc", { toUid, err });
      }

      // 2) Fallback to Donors/<toUid>.fcmToken
      let donorDocRef = null;
      if (!fcmToken) {
        donorDocRef = db.doc(`Donors/${toUid}`);
        try {
          const donorSnap = await donorDocRef.get();
          if (donorSnap.exists) {
            const dd = donorSnap.data();
            fcmToken = dd?.fcmToken || dd?.token || null;
            if (fcmToken) logger.info("Found token in Donors", { toUid });
          }
        } catch (err) {
          logger.error("Error reading Donors doc", { toUid, err });
        }
      }

      if (!fcmToken) {
        logger.info("No FCM token found for target uid", { toUid, reqId });
        return;
      }

      const message = {
        token: fcmToken,
        notification: {
          title: "Blood request near you",
          body: `A recipient needs ${quantity || "some"} units of ${bloodType || "blood"}`
        },
        data: { requestId: String(reqId) }
      };

      try {
        const sendResult = await admin.messaging().send(message);
        logger.info("FCM send success", { sendResult, toUid, reqId });
      } catch (sendErr) {
        logger.error("FCM send error", { sendErr, toUid, reqId });

        // If the token is invalid/not-registered, remove it from DB to avoid future errors
        const code = sendErr?.code || (sendErr?.errorInfo && sendErr.errorInfo.code);
        if (
          code === "messaging/registration-token-not-registered" ||
          code === "messaging/invalid-registration-token"
        ) {
          try {
            if (tokenDocRef && fcmToken) {
              // Remove the specific token from the fcmTokens array
              await tokenDocRef.update({
                fcmTokens: admin.firestore.FieldValue.arrayRemove(fcmToken)
              });
              logger.warn("Removed stale token from UserTokens fcmTokens array", { toUid });
            } else if (donorDocRef) {
              // remove fcmToken field from donor doc
              await donorDocRef.update({ fcmToken: admin.firestore.FieldValue.delete() });
              logger.warn("Removed stale fcmToken from Donors doc", { toUid });
            }
          } catch (cleanupErr) {
            logger.error("Error cleaning up stale token", { cleanupErr, toUid });
          }
        }
      }
    } catch (err) {
      logger.error("notifyDonorOnRequest - unexpected error", { err });
    }
  }
);
