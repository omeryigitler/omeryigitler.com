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

const AUTH_REQUEST_TTL_MS = 5 * 60 * 1000;
const PASSKEY_CHALLENGE_TTL_MS = 2 * 60 * 1000;
const PASSKEY_REGISTRATION_TTL_MS = 5 * 60 * 1000;

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
  const credentials = getPasskeyCredentials();
  const challengeSecret = optionalEnv("PASSKEY_CHALLENGE_SECRET") || optionalEnv("TELEGRAM_BOT_TOKEN");

  if (!credentials.length || !challengeSecret) {
    return { enabled: false, rpID, origins, missing: true };
  }

  return {
    enabled: true,
    rpID,
    origins,
    challengeSecret,
    credentials,
  };
}

function getPasskeySetupConfig() {
  const rpID = optionalEnv("PASSKEY_RP_ID") || "omeryigitler.com";
  const origins = (
    optionalEnv("PASSKEY_ORIGINS") ||
    optionalEnv("PASSKEY_ORIGIN") ||
    `https://${rpID},https://www.${rpID}`
  )
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  const challengeSecret = optionalEnv("PASSKEY_CHALLENGE_SECRET") || optionalEnv("TELEGRAM_BOT_TOKEN");
  const setupToken = optionalEnv("PASSKEY_SETUP_TOKEN");

  return {
    enabled: Boolean(challengeSecret && setupToken),
    rpID,
    origins,
    challengeSecret,
    setupToken,
    credentials: getPasskeyCredentials(),
  };
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

function verifySetupToken(value, expected) {
  if (!value || !expected) return false;
  const actualBuffer = Buffer.from(String(value));
  const expectedBuffer = Buffer.from(String(expected));
  if (actualBuffer.length !== expectedBuffer.length) return false;
  return crypto.timingSafeEqual(actualBuffer, expectedBuffer);
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

function createPasskeyChallenge(secret) {
  return createSignedChallenge(secret, PASSKEY_CHALLENGE_TTL_MS, "authentication");
}

function createRegistrationChallenge(secret) {
  return createSignedChallenge(secret, PASSKEY_REGISTRATION_TTL_MS, "registration");
}

function verifySignedChallenge(challenge, secret, kind) {
  try {
    const parsed = JSON.parse(Buffer.from(challenge, "base64url").toString("utf8"));
    const { sig, ...payload } = parsed || {};
    if (!sig || !payload?.nonce || !payload?.exp || payload.kind !== kind || Date.now() > Number(payload.exp)) return false;

    const unsigned = Buffer.from(JSON.stringify(payload)).toString("base64url");
    const expectedSig = signChallengePayload(unsigned, secret);
    if (Buffer.byteLength(sig) !== Buffer.byteLength(expectedSig)) return false;
    return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig));
  } catch (_) {
    return false;
  }
}

function verifyPasskeyChallenge(challenge, secret) {
  return verifySignedChallenge(challenge, secret, "authentication");
}

function verifyRegistrationChallenge(challenge, secret) {
  return verifySignedChallenge(challenge, secret, "registration");
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
    allowCredentials: config.credentials.map((credential) => ({
      id: credential.id,
      transports: credential.transports,
    })),
    challenge: createPasskeyChallenge(config.challengeSecret),
    timeout: PASSKEY_CHALLENGE_TTL_MS,
    userVerification: "required",
  });

  return res.status(200).json(options);
}

async function handlePasskeyStatus(req, res) {
  const config = getPasskeyConfig();
  return res.status(200).json({
    enabled: Boolean(config.enabled),
    credentialCount: config.enabled ? config.credentials.length : 0,
  });
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

  const credential = config.credentials.find((item) => item.id === response.id);
  if (!credential) {
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
  const setup = requirePasskeySetup(body);
  if (setup.error) return res.status(setup.error.status).json(setup.error.body);

  const { config } = setup;
  const options = await generateRegistrationOptions({
    rpName: "Taurus Gateway",
    rpID: config.rpID,
    userName: "omer-admin",
    userDisplayName: "Ömer Yiğitler",
    userID: new Uint8Array(Buffer.from("omer-admin-primary")),
    challenge: createRegistrationChallenge(config.challengeSecret),
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
  const setup = requirePasskeySetup(body);
  if (setup.error) return res.status(setup.error.status).json(setup.error.body);

  const { config } = setup;
  const response = body.response || body;
  if (!response?.id) {
    return res.status(400).json({ error: "Missing registration response" });
  }

  let verification;
  try {
    verification = await verifyRegistrationResponse({
      response,
      expectedChallenge: (challenge) => verifyRegistrationChallenge(challenge, config.challengeSecret),
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

    if (action === "passkey_status") {
      return handlePasskeyStatus(req, res);
    }

    if (action === "passkey_challenge") {
      return handlePasskeyChallenge(req, res);
    }

    if (action === "passkey_verify") {
      return handlePasskeyVerify(req, res, body);
    }

    if (action === "passkey_register_options") {
      return handlePasskeyRegisterOptions(req, res, body);
    }

    if (action === "passkey_register_verify") {
      return handlePasskeyRegisterVerify(req, res, body);
    }

    return res.status(400).json({ error: "Invalid action" });
  } catch (error) {
    console.error("Gateway Error:", error);
    return res.status(500).json({ error: error.message });
  }
};
