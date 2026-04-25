const axios = require("axios");
const { admin, db, requireEnv } = require("./_firebaseAdmin");

const AUTH_REQUEST_TTL_MS = 5 * 60 * 1000;

function setCors(req, res) {
  const allowedOrigins = new Set([
    "https://omeryigitler.com",
    "https://www.omeryigitler.com",
  ]);
  const origin = req.headers.origin;

  if (allowedOrigins.has(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }

  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
}

function readBody(req) {
  if (!req.body) return {};
  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body);
    } catch (_) {
      return {};
    }
  }
  return req.body;
}

function getTelegramAdminChatId() {
  return (
    process.env.TELEGRAM_CHAT_ID ||
    (process.env.TELEGRAM_ALLOWED_IDS || "").split(",")[0]?.trim() ||
    ""
  );
}

function generateCode() {
  return Math.floor(Math.random() * 90) + 10;
}

function generateOptions(challengeCode) {
  const options = [challengeCode];

  while (options.length < 3) {
    const next = generateCode();
    if (!options.includes(next)) options.push(next);
  }

  return options.sort(() => Math.random() - 0.5);
}

function getClientIp(req) {
  const forwardedFor = req.headers["x-forwarded-for"];
  if (typeof forwardedFor === "string" && forwardedFor.trim()) {
    return forwardedFor.split(",")[0].trim();
  }
  return req.socket?.remoteAddress || "Unknown";
}

async function sendAuthChallenge({ reqId, challengeCode, options, ip, userAgent }) {
  const botToken = requireEnv("TELEGRAM_BOT_TOKEN");
  const chatId = getTelegramAdminChatId();

  if (!chatId) {
    throw new Error("Missing required environment variable: TELEGRAM_CHAT_ID");
  }

  const keyboard = {
    inline_keyboard: [
      options.map((option) => ({
        text: `${option}`,
        callback_data: `auth_${reqId}_${option}`,
      })),
    ],
  };

  const separator = "---------------------";
  const message = [
    "GATEWAY AUTH REQUEST",
    separator,
    `ID: ${reqId}`,
    `IP: ${ip}`,
    `DEVICE: ${userAgent || "Unknown"}`,
    "",
    `Tap the matching number: ${challengeCode}`,
    separator,
  ].join("\n");

  await axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    chat_id: chatId,
    text: message,
    reply_markup: keyboard,
  });
}

async function handleAuthInit(req, res, body) {
  const reqId = String(body.reqId || "").trim();

  if (!/^[a-f0-9]{32}$/i.test(reqId)) {
    return res.status(400).json({ error: "Invalid reqId" });
  }

  const challengeCode = generateCode();
  const options = generateOptions(challengeCode);
  const now = Date.now();
  const expiresAt = admin.firestore.Timestamp.fromMillis(now + AUTH_REQUEST_TTL_MS);
  const ip = getClientIp(req);
  const userAgent = String(body.userAgent || req.headers["user-agent"] || "").slice(0, 500);

  await db.collection("auth_requests").doc(reqId).set({
    expectedCode: challengeCode,
    status: "pending",
    attempts: 0,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    expiresAt,
    ip,
    userAgent,
  });

  await sendAuthChallenge({
    reqId,
    challengeCode,
    options,
    ip,
    userAgent,
  });

  return res.status(200).json({
    status: "pending",
    reqId,
    challengeCode,
    expiresInMs: AUTH_REQUEST_TTL_MS,
  });
}

async function handleCheckStatus(req, res) {
  const reqId = String(req.query.reqId || "").trim();

  if (!/^[a-f0-9]{32}$/i.test(reqId)) {
    return res.status(400).json({ error: "Invalid reqId" });
  }

  const docRef = db.collection("auth_requests").doc(reqId);
  const doc = await docRef.get();

  if (!doc.exists) {
    return res.status(404).json({ status: "not_found" });
  }

  const data = doc.data() || {};
  const expiresAtMs = data.expiresAt?.toMillis ? data.expiresAt.toMillis() : 0;

  if (data.status === "pending" && expiresAtMs && Date.now() > expiresAtMs) {
    await docRef.update({
      status: "expired",
      expiredAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return res.status(200).json({ status: "expired" });
  }

  if (data.status === "approved") {
    const uid = `telegram_admin_${data.approvedBy || "primary"}`;
    const customToken = await admin.auth().createCustomToken(uid, {
      admin: true,
      role: "admin",
    });

    return res.status(200).json({
      status: "approved",
      customToken,
    });
  }

  return res.status(200).json({ status: data.status || "pending" });
}

module.exports = async (req, res) => {
  setCors(req, res);

  if (req.method === "OPTIONS") {
    return res.status(200).send("OK");
  }

  const body = readBody(req);
  const action = req.query.action || body.action;

  if (!action) {
    return res.status(400).json({ error: "Missing action parameter" });
  }

  try {
    if (action === "check_command") {
      const sessionId = req.query.sessionId || body.sessionId;
      if (!sessionId) return res.status(400).json({ error: "Missing sessionId" });

      const doc = await db.collection("visitors_v1").doc(sessionId).get();
      if (!doc.exists) return res.status(200).json({ action: null });

      const data = doc.data();
      return res.status(200).json({
        action: data.action || null,
        action_timestamp: data.action_timestamp || null,
      });
    }

    if (action === "ack_command") {
      const sessionId = req.query.sessionId || body.sessionId;
      if (!sessionId) return res.status(400).json({ error: "Missing sessionId" });

      await db.collection("visitors_v1").doc(sessionId).update({
        action: admin.firestore.FieldValue.delete(),
        action_timestamp: admin.firestore.FieldValue.delete(),
      });

      return res.status(200).json({ status: "cleared" });
    }

    if (action === "auth_init") {
      return handleAuthInit(req, res, body);
    }

    if (action === "check_status") {
      return handleCheckStatus(req, res);
    }

    return res.status(400).json({ error: "Invalid action" });
  } catch (error) {
    console.error("Gateway Error:", error);
    return res.status(500).json({ error: error.message });
  }
};
