const axios = require("axios");
const crypto = require("crypto");
const {
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} = require("@simplewebauthn/server");
const { isoBase64URL } = require("@simplewebauthn/server/helpers");
const { admin, db, requireEnv } = require("./_firebaseAdmin");
const { authKeyboard, panel, row } = require("./telegramFormat");

const AUTH_REQUEST_TTL_MS = 5 * 60 * 1000;
const PASSKEY_CHALLENGE_TTL_MS = 2 * 60 * 1000;

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

function cleanCommandMessage(value) {
  if (typeof value !== "string") return null;

  const cleaned = value
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/[<>]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned) return null;
  return cleaned.slice(0, 180);
}

function optionalEnv(name) {
  const value = process.env[name];
  return value && String(value).trim() ? String(value).trim() : "";
}

function getPasskeyConfig() {
  const rpID = optionalEnv("PASSKEY_RP_ID") || "omeryigitler.com";
  const origins = (
    optionalEnv("PASSKEY_ORIGINS") ||
    optionalEnv("PASSKEY_ORIGIN") ||
    `https://${rpID},https://www.${rpID}`
  )
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  const credentialID = optionalEnv("PASSKEY_CREDENTIAL_ID");
  const publicKey = optionalEnv("PASSKEY_PUBLIC_KEY");
  const challengeSecret = optionalEnv("PASSKEY_CHALLENGE_SECRET") || optionalEnv("TELEGRAM_BOT_TOKEN");
  const transports = (optionalEnv("PASSKEY_TRANSPORTS") || "internal")
    .split(",")
    .map((transport) => transport.trim())
    .filter(Boolean);
  const counter = Number(optionalEnv("PASSKEY_COUNTER") || 0);

  if (!credentialID || !publicKey || !challengeSecret) {
    return { enabled: false, rpID, origins, missing: true };
  }

  return {
    enabled: true,
    rpID,
    origins,
    credentialID,
    publicKey,
    challengeSecret,
    transports,
    counter: Number.isFinite(counter) ? counter : 0,
  };
}

function signChallengePayload(payload, secret) {
  return crypto.createHmac("sha256", secret).update(payload).digest("base64url");
}

function createPasskeyChallenge(secret) {
  const payload = {
    nonce: crypto.randomBytes(24).toString("base64url"),
    exp: Date.now() + PASSKEY_CHALLENGE_TTL_MS,
  };
  const unsigned = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = signChallengePayload(unsigned, secret);
  return Buffer.from(JSON.stringify({ ...payload, sig })).toString("base64url");
}

function verifyPasskeyChallenge(challenge, secret) {
  try {
    const parsed = JSON.parse(Buffer.from(challenge, "base64url").toString("utf8"));
    const { sig, ...payload } = parsed || {};
    if (!sig || !payload?.nonce || !payload?.exp || Date.now() > Number(payload.exp)) return false;

    const unsigned = Buffer.from(JSON.stringify(payload)).toString("base64url");
    const expectedSig = signChallengePayload(unsigned, secret);
    if (Buffer.byteLength(sig) !== Buffer.byteLength(expectedSig)) return false;
    return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig));
  } catch (_) {
    return false;
  }
}

function getPasskeyPublicKeyBytes(publicKey) {
  if (publicKey.trim().startsWith("[")) {
    const parsed = JSON.parse(publicKey);
    if (Array.isArray(parsed)) return new Uint8Array(parsed);
  }

  return new Uint8Array(isoBase64URL.toBuffer(publicKey));
}

async function createAdminCustomToken(provider = "passkey") {
  return admin.auth().createCustomToken(`${provider}_admin_primary`, {
    admin: true,
    role: "admin",
    provider,
  });
}

async function sendAuthChallenge({ reqId, challengeCode, options, ip, userAgent }) {
  const botToken = requireEnv("TELEGRAM_BOT_TOKEN");
  const chatId = getTelegramAdminChatId();

  if (!chatId) {
    throw new Error("Missing required environment variable: TELEGRAM_CHAT_ID");
  }

  const message = panel({
    title: "TAURUS // GATEWAY AUTH",
    subtitle: "Admin login approval requested",
    rows: [
      row("🆔", "Request ID", reqId, { code: true }),
      row("📡", "IP Address", ip, { code: true }),
      row("💻", "Device", userAgent || "Unknown"),
    ],
    footer: "Select the number shown on the gateway screen. The code is hidden here for security.",
  });

  await axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    chat_id: chatId,
    text: message,
    parse_mode: "HTML",
    reply_markup: authKeyboard(reqId, options),
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
    const customToken = await admin.auth().createCustomToken(`telegram_admin_${data.approvedBy || "primary"}`, {
      admin: true,
      role: "admin",
      provider: "telegram",
    });

    return res.status(200).json({
      status: "approved",
      customToken,
    });
  }

  return res.status(200).json({ status: data.status || "pending" });
}

async function handlePasskeyChallenge(req, res) {
  const config = getPasskeyConfig();
  if (!config.enabled) {
    return res.status(503).json({ error: "Passkey is not configured" });
  }

  const options = await generateAuthenticationOptions({
    rpID: config.rpID,
    allowCredentials: [{
      id: config.credentialID,
      transports: config.transports,
    }],
    challenge: createPasskeyChallenge(config.challengeSecret),
    timeout: PASSKEY_CHALLENGE_TTL_MS,
    userVerification: "required",
  });

  return res.status(200).json(options);
}

async function handlePasskeyVerify(req, res, body) {
  const config = getPasskeyConfig();
  if (!config.enabled) {
    return res.status(503).json({ error: "Passkey is not configured" });
  }

  const response = body.response || body;
  if (!response?.id) {
    return res.status(400).json({ error: "Missing passkey response" });
  }

  if (response.id !== config.credentialID) {
    return res.status(403).json({ error: "Unknown credential" });
  }

  let verification;
  try {
    verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge: (challenge) => verifyPasskeyChallenge(challenge, config.challengeSecret),
      expectedOrigin: config.origins,
      expectedRPID: config.rpID,
      requireUserVerification: true,
      credential: {
        id: config.credentialID,
        publicKey: getPasskeyPublicKeyBytes(config.publicKey),
        counter: config.counter,
        transports: config.transports,
      },
    });
  } catch (error) {
    console.error("Passkey verification failed:", error);
    return res.status(400).json({ verified: false, error: error.message });
  }

  if (!verification.verified) {
    return res.status(401).json({ verified: false });
  }

  const customToken = await createAdminCustomToken("passkey");
  return res.status(200).json({
    verified: true,
    status: "approved",
    customToken,
  });
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
      if (!doc.exists) return res.status(200).json({ action: null, message: null });

      const data = doc.data();
      return res.status(200).json({
        action: data.action || null,
        message: cleanCommandMessage(data.message),
        action_timestamp: data.action_timestamp || null,
      });
    }

    if (action === "ack_command") {
      const sessionId = req.query.sessionId || body.sessionId;
      if (!sessionId) return res.status(400).json({ error: "Missing sessionId" });

      await db.collection("visitors_v1").doc(sessionId).update({
        action: admin.firestore.FieldValue.delete(),
        message: admin.firestore.FieldValue.delete(),
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

    if (action === "passkey_challenge") {
      return handlePasskeyChallenge(req, res);
    }

    if (action === "passkey_verify") {
      return handlePasskeyVerify(req, res, body);
    }

    return res.status(400).json({ error: "Invalid action" });
  } catch (error) {
    console.error("Gateway Error:", error);
    return res.status(500).json({ error: error.message });
  }
};
