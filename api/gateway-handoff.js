const crypto = require("crypto");
const { admin, db } = require("./_firebaseAdmin");

const HANDOFF_TTL_MS = 45 * 1000;
const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY || "AIzaSyC0DAIT0cVPD4WFpfgqrn0lfb-kyFRsnWM";
const ALLOWED_TARGETS = new Set(["startpage", "admin"]);
const SESSION_AGES = {
  passkey: 12 * 60 * 60,
  telegram: 60 * 60,
};

function noStore(res) {
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

function sha256Base64Url(value) {
  return crypto.createHash("sha256").update(value).digest("base64url");
}

function ticketHash(ticket) {
  return crypto.createHash("sha256").update(ticket).digest("hex");
}

function safeEqual(left, right) {
  const leftBuffer = Buffer.from(String(left || ""));
  const rightBuffer = Buffer.from(String(right || ""));
  if (leftBuffer.length !== rightBuffer.length) return false;
  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function getClientIp(req) {
  const forwardedFor = req.headers["x-forwarded-for"];
  if (typeof forwardedFor === "string" && forwardedFor.trim()) {
    return forwardedFor.split(",")[0].trim();
  }
  return req.socket?.remoteAddress || "Unknown";
}

async function exchangeCustomToken(customToken) {
  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${encodeURIComponent(FIREBASE_API_KEY)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: customToken, returnSecureToken: true }),
    },
  );

  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.idToken) {
    throw new Error("Gateway token exchange failed");
  }
  return String(data.idToken);
}

async function issueHandoff(req, res, body) {
  const customToken = String(body.customToken || "");
  const target = String(body.target || "");
  const verifierHash = String(body.verifierHash || "");

  if (
    !ALLOWED_TARGETS.has(target) ||
    !customToken ||
    customToken.length > 12000 ||
    !/^[A-Za-z0-9_-]{43}$/.test(verifierHash)
  ) {
    return res.status(400).json({ error: "Invalid handoff request" });
  }

  const idToken = await exchangeCustomToken(customToken);
  const decoded = await admin.auth().verifyIdToken(idToken, true);
  const uid = String(decoded.uid || "");
  const provider = String(decoded.provider || "");
  const authorized =
    decoded.admin === true &&
    decoded.role === "admin" &&
    /^(?:passkey_admin_primary|telegram_admin_)/.test(uid) &&
    (provider === "passkey" || provider === "telegram");

  if (!authorized) {
    return res.status(403).json({ error: "Unauthorized gateway identity" });
  }

  const ticket = crypto.randomBytes(32).toString("base64url");
  const hash = ticketHash(ticket);
  const now = Date.now();
  const expiresAt = admin.firestore.Timestamp.fromMillis(now + HANDOFF_TTL_MS);
  const scope = provider === "passkey" ? "full" : "workspace";

  await db.collection("gateway_handoffs").doc(hash).set({
    target,
    uid,
    provider,
    scope,
    verifierHash,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    expiresAt,
    ip: getClientIp(req),
    userAgent: String(req.headers["user-agent"] || "").slice(0, 500),
  });

  return res.status(200).json({
    handoffToken: ticket,
    expiresInMs: HANDOFF_TTL_MS,
  });
}

async function redeemHandoff(req, res, body) {
  const ticket = String(body.handoffToken || "");
  const target = String(body.target || "");
  const verifier = String(body.verifier || "");

  if (
    !ALLOWED_TARGETS.has(target) ||
    !/^[A-Za-z0-9_-]{40,100}$/.test(ticket) ||
    !/^[A-Za-z0-9_-]{43,128}$/.test(verifier)
  ) {
    return res.status(400).json({ error: "Invalid handoff token" });
  }

  const hash = ticketHash(ticket);
  const suppliedVerifierHash = sha256Base64Url(verifier);
  const docRef = db.collection("gateway_handoffs").doc(hash);
  const auditRef = db.collection("gateway_handoff_audit").doc();
  let result = null;

  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(docRef);
    if (!snapshot.exists) throw new Error("Handoff not found or already burned");

    const data = snapshot.data() || {};
    const expiresAtMs = data.expiresAt?.toMillis ? data.expiresAt.toMillis() : 0;
    const valid =
      data.target === target &&
      expiresAtMs > Date.now() &&
      safeEqual(data.verifierHash, suppliedVerifierHash);

    if (!valid) throw new Error("Handoff expired or verifier mismatch");

    result = {
      uid: String(data.uid || ""),
      provider: String(data.provider || "telegram"),
      scope: String(data.scope || "workspace"),
    };

    // Burn-on-read: the live ticket is deleted in the same atomic transaction.
    transaction.delete(docRef);
    transaction.set(auditRef, {
      ticketHash: hash,
      target,
      uid: result.uid,
      provider: result.provider,
      scope: result.scope,
      redeemedAt: admin.firestore.FieldValue.serverTimestamp(),
      redeemIp: getClientIp(req),
      userAgent: String(req.headers["user-agent"] || "").slice(0, 500),
    });
  });

  if (
    !result?.uid ||
    !/^(?:passkey_admin_primary|telegram_admin_)/.test(result.uid) ||
    !["passkey", "telegram"].includes(result.provider) ||
    !["full", "workspace"].includes(result.scope)
  ) {
    return res.status(403).json({ error: "Invalid handoff identity" });
  }

  return res.status(200).json({
    verified: true,
    uid: result.uid,
    provider: result.provider,
    scope: result.scope,
    sessionMaxAge: SESSION_AGES[result.provider],
  });
}

module.exports = async (req, res) => {
  noStore(res);
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const body = readBody(req);
  const action = String(req.query.action || body.action || "");

  try {
    if (action === "issue") return issueHandoff(req, res, body);
    if (action === "redeem") return redeemHandoff(req, res, body);
    return res.status(400).json({ error: "Invalid action" });
  } catch (error) {
    console.error("Gateway handoff error:", error);
    return res.status(401).json({ error: "Gateway handoff failed" });
  }
};
