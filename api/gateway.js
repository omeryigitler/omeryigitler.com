const axios = require("axios");
const crypto = require("crypto");
const {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} = require("@simplewebauthn/server");
const { isoBase64URL } = require("@simplewebauthn/server/helpers");
const { admin, db, requireEnv } = require("./_firebaseAdmin");
const { authKeyboard, panel, row } = require("./telegramFormat");
const telegramWebhookHandler = require("./webhook");

const AUTH_REQUEST_TTL_MS = 5 * 60 * 1000;
const PASSKEY_CHALLENGE_TTL_MS = 2 * 60 * 1000;
const PASSKEY_REGISTRATION_TTL_MS = 5 * 60 * 1000;
const AUTH_RATE_WINDOW_MS = 10 * 60 * 1000;
const AUTH_RATE_LIMIT = 6;
const WEBHOOK_REFRESH_MS = 15 * 60 * 1000;
const TELEGRAM_WEBHOOK_URL = "https://omeryigitler.com/api/gateway?telegram_webhook=1";
const ALLOWED_ORIGINS = new Set([
  "https://omeryigitler.com",
  "https://www.omeryigitler.com",
]);

let webhookEnsuredAt = 0;

function httpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function setCors(req, res) {
  const origin = req.headers.origin;
  if (ALLOWED_ORIGINS.has(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "no-referrer");
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

function optionalEnv(name) {
  const value = process.env[name];
  return value && String(value).trim() ? String(value).trim() : "";
}

function getTelegramAdminChatId() {
  return (
    optionalEnv("TELEGRAM_CHAT_ID") ||
    optionalEnv("TELEGRAM_ALLOWED_IDS").split(",")[0]?.trim() ||
    ""
  );
}

function getClientIp(req) {
  const forwardedFor = req.headers["x-forwarded-for"];
  if (typeof forwardedFor === "string" && forwardedFor.trim()) {
    return forwardedFor.split(",")[0].trim();
  }
  return req.socket?.remoteAddress || "Unknown";
}

function safeEqual(left, right) {
  const leftBuffer = Buffer.from(String(left || ""));
  const rightBuffer = Buffer.from(String(right || ""));
  if (leftBuffer.length !== rightBuffer.length) return false;
  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function webhookSecret() {
  const configured = optionalEnv("TELEGRAM_WEBHOOK_SECRET");
  if (configured) return configured;
  const botToken = requireEnv("TELEGRAM_BOT_TOKEN");
  return crypto
    .createHash("sha256")
    .update(`${botToken}:taurus-webhook-v1`)
    .digest("hex");
}

function isTelegramWebhookAuthorized(req) {
  return safeEqual(
    req.headers["x-telegram-bot-api-secret-token"],
    webhookSecret(),
  );
}

async function ensureTelegramWebhook() {
  if (Date.now() - webhookEnsuredAt < WEBHOOK_REFRESH_MS) return;

  const botToken = requireEnv("TELEGRAM_BOT_TOKEN");
  const response = await axios.post(
    `https://api.telegram.org/bot${botToken}/setWebhook`,
    {
      url: TELEGRAM_WEBHOOK_URL,
      secret_token: webhookSecret(),
      allowed_updates: ["message", "callback_query"],
      drop_pending_updates: false,
      max_connections: 20,
    },
    { timeout: 10000 },
  );

  if (!response.data?.ok) throw new Error("Telegram webhook setup failed");
  webhookEnsuredAt = Date.now();
}

function requireTrustedOrigin(req) {
  const origin = String(req.headers.origin || "");
  if (!ALLOWED_ORIGINS.has(origin)) {
    throw httpError(403, "Untrusted request origin");
  }
}

async function enforceRateLimit(req, purpose, limit = AUTH_RATE_LIMIT, windowMs = AUTH_RATE_WINDOW_MS) {
  const ipHash = crypto.createHash("sha256").update(getClientIp(req)).digest("hex");
  const ref = db.collection("gateway_rate_limits").doc(`${purpose}_${ipHash}`);
  const now = Date.now();
  let retryAfter = 0;

  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    const data = snapshot.exists ? snapshot.data() || {} : {};
    const windowStart = Number(data.windowStart || 0);
    const count = Number(data.count || 0);

    if (!windowStart || now - windowStart >= windowMs) {
      transaction.set(ref, {
        purpose,
        count: 1,
        windowStart: now,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      return;
    }

    if (count >= limit) {
      retryAfter = Math.max(1, Math.ceil((windowMs - (now - windowStart)) / 1000));
      return;
    }

    transaction.update(ref, {
      count: admin.firestore.FieldValue.increment(1),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  });

  if (retryAfter) {
    const error = httpError(429, "Too many gateway attempts. Try again later.");
    error.retryAfter = retryAfter;
    throw error;
  }
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

function cleanCommandMessage(value) {
  if (typeof value !== "string") return null;
  const cleaned = value
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/[<>]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned ? cleaned.slice(0, 180) : null;
}

function getPasskeyCredentials() {
  const configured = optionalEnv("PASSKEY_CREDENTIALS");
  if (configured) {
    try {
      const parsed = JSON.parse(configured);
      if (Array.isArray(parsed)) {
        return parsed
          .map((credential, index) => normalizePasskeyCredential(credential, index))
          .filter(Boolean);
      }
    } catch (error) {
      console.error("Invalid PASSKEY_CREDENTIALS JSON:", error);
    }
  }

  const credentialID = optionalEnv("PASSKEY_CREDENTIAL_ID");
  const publicKey = optionalEnv("PASSKEY_PUBLIC_KEY");
  if (!credentialID || !publicKey) return [];
  return [normalizePasskeyCredential({
    label: optionalEnv("PASSKEY_LABEL") || "Primary Device",
    id: credentialID,
    publicKey,
    counter: optionalEnv("PASSKEY_COUNTER") || 0,
    transports: optionalEnv("PASSKEY_TRANSPORTS") || "internal",
  }, 0)].filter(Boolean);
}

function normalizePasskeyCredential(credential, index) {
  const id = String(credential?.id || credential?.credentialID || "").trim();
  const publicKey = String(credential?.publicKey || credential?.credentialPublicKey || "").trim();
  if (!id || !publicKey) return null;

  const transportValue = credential?.transports || "internal";
  const transports = Array.isArray(transportValue)
    ? transportValue
    : String(transportValue).split(",");
  const counter = Number(credential?.counter || 0);

  return {
    label: String(credential?.label || `Device ${index + 1}`).trim(),
    id,
    publicKey,
    counter: Number.isFinite(counter) ? counter : 0,
    transports: transports.map((transport) => String(transport).trim()).filter(Boolean),
  };
}

function getPasskeyConfig() {
  const rpID = optionalEnv("PASSKEY_RP_ID") || "omeryigitler.com";
  const origins = (
    optionalEnv("PASSKEY_ORIGINS") ||
    optionalEnv("PASSKEY_ORIGIN") ||
    `https://${rpID},https://www.${rpID}`
  ).split(",").map((origin) => origin.trim()).filter(Boolean);
  const credentials = getPasskeyCredentials();
  const challengeSecret = optionalEnv("PASSKEY_CHALLENGE_SECRET") || optionalEnv("TELEGRAM_BOT_TOKEN");

  return {
    enabled: Boolean(credentials.length && challengeSecret),
    rpID,
    origins,
    challengeSecret,
    credentials,
  };
}

function getPasskeySetupConfig() {
  const config = getPasskeyConfig();
  return {
    ...config,
    enabled: Boolean(config.challengeSecret && optionalEnv("PASSKEY_SETUP_TOKEN")),
    setupToken: optionalEnv("PASSKEY_SETUP_TOKEN"),
  };
}

function verifySetupToken(value, expected) {
  return Boolean(value && expected && safeEqual(value, expected));
}

function signChallengePayload(payload, secret) {
  return crypto.createHmac("sha256", secret).update(payload).digest("base64url");
}

function createSignedChallenge(secret, ttlMs, kind) {
  const payload = {
    kind,
    nonce: crypto.randomBytes(24).toString("base64url"),
    exp: Date.now() + ttlMs,
  };
  const unsigned = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = signChallengePayload(unsigned, secret);
  return Buffer.from(JSON.stringify({ ...payload, sig })).toString("base64url");
}

function verifySignedChallenge(challenge, secret, kind) {
  try {
    let decoded = Buffer.from(challenge, "base64url").toString("utf8");
    if (!decoded.trim().startsWith("{")) {
      decoded = Buffer.from(decoded, "base64url").toString("utf8");
    }
    const parsed = JSON.parse(decoded);
    const { sig, ...payload } = parsed || {};
    if (!sig || !payload?.nonce || !payload?.exp || payload.kind !== kind || Date.now() > Number(payload.exp)) {
      return false;
    }
    const unsigned = Buffer.from(JSON.stringify(payload)).toString("base64url");
    return safeEqual(sig, signChallengePayload(unsigned, secret));
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

function getRegistrationPublicKeyValue(publicKey) {
  return isoBase64URL.fromBuffer(publicKey);
}

function getSetupLabel(value) {
  return String(value || "Apple Device")
    .replace(/[<>]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 60) || "Apple Device";
}

async function createAdminCustomToken(provider = "passkey", uidSuffix = "primary") {
  return admin.auth().createCustomToken(`${provider}_admin_${uidSuffix}`, {
    admin: true,
    role: "admin",
    provider,
  });
}

async function sendAuthChallenge({ reqId, options, ip, userAgent }) {
  await ensureTelegramWebhook();
  const botToken = requireEnv("TELEGRAM_BOT_TOKEN");
  const chatId = getTelegramAdminChatId();
  if (!chatId) throw new Error("Missing required environment variable: TELEGRAM_CHAT_ID");

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

  await axios.post(
    `https://api.telegram.org/bot${botToken}/sendMessage`,
    {
      chat_id: chatId,
      text: message,
      parse_mode: "HTML",
      reply_markup: authKeyboard(reqId, options),
    },
    { timeout: 10000 },
  );
}

async function handleAuthInit(req, res, body) {
  requireTrustedOrigin(req);
  await enforceRateLimit(req, "auth_init");

  const reqId = String(body.reqId || "").trim();
  if (!/^[a-f0-9]{32}$/i.test(reqId)) {
    return res.status(400).json({ error: "Invalid reqId" });
  }

  const challengeCode = generateCode();
  const options = generateOptions(challengeCode);
  const expiresAt = admin.firestore.Timestamp.fromMillis(Date.now() + AUTH_REQUEST_TTL_MS);
  const ip = getClientIp(req);
  const userAgent = String(body.userAgent || req.headers["user-agent"] || "").slice(0, 500);
  const docRef = db.collection("auth_requests").doc(reqId);

  await docRef.set({
    expectedCode: challengeCode,
    status: "pending",
    attempts: 0,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    expiresAt,
    ip,
    userAgent,
  });

  try {
    await sendAuthChallenge({ reqId, options, ip, userAgent });
  } catch (error) {
    await docRef.delete().catch(() => {});
    throw error;
  }

  return res.status(200).json({
    status: "pending",
    reqId,
    challengeCode,
    expiresInMs: AUTH_REQUEST_TTL_MS,
  });
}

async function claimApprovedRequest(reqId) {
  const docRef = db.collection("auth_requests").doc(reqId);
  const consumeId = crypto.randomBytes(18).toString("base64url");
  const now = Date.now();
  let result = { status: "not_found" };

  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(docRef);
    if (!snapshot.exists) return;

    const data = snapshot.data() || {};
    const expiresAtMs = data.expiresAt?.toMillis ? data.expiresAt.toMillis() : 0;

    if (data.status === "pending" && expiresAtMs && now > expiresAtMs) {
      transaction.update(docRef, {
        status: "expired",
        expiredAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      result = { status: "expired" };
      return;
    }

    if (data.status === "approved") {
      transaction.update(docRef, {
        status: "consuming",
        consumeId,
        consumingAtMs: now,
      });
      result = { status: "claimed", approvedBy: String(data.approvedBy || "primary"), consumeId };
      return;
    }

    if (data.status === "consuming" && now - Number(data.consumingAtMs || 0) > 30000) {
      transaction.update(docRef, { consumeId, consumingAtMs: now });
      result = { status: "claimed", approvedBy: String(data.approvedBy || "primary"), consumeId };
      return;
    }

    result = { status: String(data.status || "pending") };
  });

  return { ...result, docRef };
}

async function handleCheckStatus(req, res) {
  const reqId = String(req.query.reqId || "").trim();
  if (!/^[a-f0-9]{32}$/i.test(reqId)) {
    return res.status(400).json({ error: "Invalid reqId" });
  }

  const claim = await claimApprovedRequest(reqId);
  if (claim.status !== "claimed") {
    const clientStatus = claim.status === "consuming" ? "processing" : claim.status;
    return res.status(claim.status === "not_found" ? 404 : 200).json({ status: clientStatus });
  }

  try {
    const customToken = await createAdminCustomToken("telegram", claim.approvedBy);
    await db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(claim.docRef);
      const data = snapshot.exists ? snapshot.data() || {} : {};
      if (data.status !== "consuming" || data.consumeId !== claim.consumeId) {
        throw new Error("Approval consumption ownership lost");
      }
      transaction.update(claim.docRef, {
        status: "consumed",
        consumedAt: admin.firestore.FieldValue.serverTimestamp(),
        consumeId: admin.firestore.FieldValue.delete(),
        consumingAtMs: admin.firestore.FieldValue.delete(),
      });
    });
    return res.status(200).json({ status: "approved", customToken });
  } catch (error) {
    await db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(claim.docRef);
      const data = snapshot.exists ? snapshot.data() || {} : {};
      if (data.status === "consuming" && data.consumeId === claim.consumeId) {
        transaction.update(claim.docRef, {
          status: "approved",
          consumeId: admin.firestore.FieldValue.delete(),
          consumingAtMs: admin.firestore.FieldValue.delete(),
        });
      }
    }).catch(() => {});
    throw error;
  }
}

async function handlePasskeyStatus(_req, res) {
  const config = getPasskeyConfig();
  return res.status(200).json({
    enabled: Boolean(config.enabled),
    credentialCount: config.enabled ? config.credentials.length : 0,
  });
}

async function handlePasskeyChallenge(req, res) {
  requireTrustedOrigin(req);
  const config = getPasskeyConfig();
  if (!config.enabled) return res.status(503).json({ error: "Passkey is not configured" });

  const options = await generateAuthenticationOptions({
    rpID: config.rpID,
    allowCredentials: config.credentials.map((credential) => ({
      id: credential.id,
      transports: credential.transports,
    })),
    challenge: createSignedChallenge(config.challengeSecret, PASSKEY_CHALLENGE_TTL_MS, "authentication"),
    timeout: PASSKEY_CHALLENGE_TTL_MS,
    userVerification: "required",
  });
  return res.status(200).json(options);
}

async function handlePasskeyVerify(req, res, body) {
  requireTrustedOrigin(req);
  await enforceRateLimit(req, "passkey_verify", 12, AUTH_RATE_WINDOW_MS);
  const config = getPasskeyConfig();
  if (!config.enabled) return res.status(503).json({ error: "Passkey is not configured" });

  const response = body.response || body;
  if (!response?.id) return res.status(400).json({ error: "Missing passkey response" });
  const credential = config.credentials.find((item) => item.id === response.id);
  if (!credential) return res.status(403).json({ error: "Unknown credential" });

  let verification;
  try {
    verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge: (challenge) => verifySignedChallenge(challenge, config.challengeSecret, "authentication"),
      expectedOrigin: config.origins,
      expectedRPID: config.rpID,
      requireUserVerification: true,
      credential: {
        id: credential.id,
        publicKey: getPasskeyPublicKeyBytes(credential.publicKey),
        counter: credential.counter,
        transports: credential.transports,
      },
    });
  } catch (error) {
    console.error("Passkey verification failed:", error);
    return res.status(400).json({ verified: false, error: error.message });
  }

  if (!verification.verified) return res.status(401).json({ verified: false });
  const customToken = await createAdminCustomToken("passkey");
  return res.status(200).json({ verified: true, status: "approved", customToken });
}

function requirePasskeySetup(body) {
  const config = getPasskeySetupConfig();
  if (!config.enabled) {
    return { error: { status: 503, body: { error: "Passkey setup is not configured" } } };
  }
  if (!verifySetupToken(body.setupToken, config.setupToken)) {
    return { error: { status: 403, body: { error: "Invalid setup token" } } };
  }
  return { config };
}

async function handlePasskeyRegisterOptions(req, res, body) {
  requireTrustedOrigin(req);
  await enforceRateLimit(req, "passkey_setup", 5, 15 * 60 * 1000);
  const setup = requirePasskeySetup(body);
  if (setup.error) return res.status(setup.error.status).json(setup.error.body);
  const { config } = setup;

  const options = await generateRegistrationOptions({
    rpName: "Taurus Gateway",
    rpID: config.rpID,
    userName: "omer-admin",
    userDisplayName: "Ömer Yiğitler",
    userID: new Uint8Array(Buffer.from("omer-admin-primary")),
    challenge: createSignedChallenge(config.challengeSecret, PASSKEY_REGISTRATION_TTL_MS, "registration"),
    timeout: PASSKEY_REGISTRATION_TTL_MS,
    attestationType: "none",
    excludeCredentials: config.credentials.map((credential) => ({
      id: credential.id,
      transports: credential.transports,
    })),
    authenticatorSelection: {
      authenticatorAttachment: "platform",
      residentKey: "required",
      userVerification: "required",
    },
    preferredAuthenticatorType: "localDevice",
  });
  return res.status(200).json(options);
}

async function handlePasskeyRegisterVerify(req, res, body) {
  requireTrustedOrigin(req);
  await enforceRateLimit(req, "passkey_setup", 5, 15 * 60 * 1000);
  const setup = requirePasskeySetup(body);
  if (setup.error) return res.status(setup.error.status).json(setup.error.body);
  const { config } = setup;
  const response = body.response || body;
  if (!response?.id) return res.status(400).json({ error: "Missing registration response" });

  let verification;
  try {
    verification = await verifyRegistrationResponse({
      response,
      expectedChallenge: (challenge) => verifySignedChallenge(challenge, config.challengeSecret, "registration"),
      expectedOrigin: config.origins,
      expectedRPID: config.rpID,
      requireUserVerification: true,
    });
  } catch (error) {
    console.error("Passkey registration failed:", error);
    return res.status(400).json({ verified: false, error: error.message });
  }

  if (!verification.verified || !verification.registrationInfo?.credential) {
    return res.status(401).json({ verified: false });
  }

  const credential = verification.registrationInfo.credential;
  const label = getSetupLabel(body.label);
  const transports = response.response?.transports?.length ? response.response.transports : ["internal"];
  const registeredCredential = {
    label,
    id: credential.id,
    publicKey: getRegistrationPublicKeyValue(credential.publicKey),
    counter: credential.counter || 0,
    transports,
    deviceType: verification.registrationInfo.credentialDeviceType,
    backedUp: verification.registrationInfo.credentialBackedUp,
  };
  const nextCredentials = [
    ...config.credentials.filter((item) => item.id !== registeredCredential.id),
    registeredCredential,
  ];

  return res.status(200).json({
    verified: true,
    credential: registeredCredential,
    env: {
      PASSKEY_CREDENTIALS: JSON.stringify(nextCredentials),
      PASSKEY_RP_ID: config.rpID,
      PASSKEY_ORIGINS: config.origins.join(","),
      PASSKEY_TRANSPORTS: transports.join(","),
      PASSKEY_COUNTER: String(registeredCredential.counter),
    },
  });
}

function requireMethod(req, method) {
  if (req.method !== method) throw httpError(405, `Method ${req.method} not allowed`);
}

module.exports = async (req, res) => {
  setCors(req, res);

  if (req.method === "OPTIONS") return res.status(200).send("OK");

  if (String(req.query.telegram_webhook || "") === "1") {
    if (req.method !== "POST") return res.status(405).send("Method Not Allowed");
    if (!isTelegramWebhookAuthorized(req)) return res.status(401).send("Unauthorized");
    return telegramWebhookHandler(req, res);
  }

  const body = readBody(req);
  const action = String(req.query.action || body.action || "");
  if (!action) return res.status(400).json({ error: "Missing action parameter" });

  try {
    if (action === "check_command") {
      const sessionId = String(req.query.sessionId || body.sessionId || "");
      if (!sessionId) return res.status(400).json({ error: "Missing sessionId" });
      const doc = await db.collection("visitors_v1").doc(sessionId).get();
      if (!doc.exists) return res.status(200).json({ action: null, message: null });
      const data = doc.data() || {};
      return res.status(200).json({
        action: data.action || null,
        message: cleanCommandMessage(data.message),
        action_timestamp: data.action_timestamp || null,
      });
    }

    if (action === "ack_command") {
      requireMethod(req, "POST");
      const sessionId = String(req.query.sessionId || body.sessionId || "");
      if (!sessionId) return res.status(400).json({ error: "Missing sessionId" });
      await db.collection("visitors_v1").doc(sessionId).update({
        action: admin.firestore.FieldValue.delete(),
        message: admin.firestore.FieldValue.delete(),
        action_timestamp: admin.firestore.FieldValue.delete(),
      });
      return res.status(200).json({ status: "cleared" });
    }

    if (action === "auth_init") {
      requireMethod(req, "POST");
      return handleAuthInit(req, res, body);
    }
    if (action === "check_status") {
      requireMethod(req, "GET");
      return handleCheckStatus(req, res);
    }
    if (action === "passkey_status") {
      requireMethod(req, "GET");
      return handlePasskeyStatus(req, res);
    }
    if (action === "passkey_challenge") {
      requireMethod(req, "POST");
      return handlePasskeyChallenge(req, res);
    }
    if (action === "passkey_verify") {
      requireMethod(req, "POST");
      return handlePasskeyVerify(req, res, body);
    }
    if (action === "passkey_register_options") {
      requireMethod(req, "POST");
      return handlePasskeyRegisterOptions(req, res, body);
    }
    if (action === "passkey_register_verify") {
      requireMethod(req, "POST");
      return handlePasskeyRegisterVerify(req, res, body);
    }

    return res.status(400).json({ error: "Invalid action" });
  } catch (error) {
    const status = Number(error.status || 500);
    if (error.retryAfter) res.setHeader("Retry-After", String(error.retryAfter));
    console.error("Gateway Error:", error);
    return res.status(status).json({ error: error.message });
  }
};
