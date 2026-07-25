const crypto = require("crypto");
const { admin, db } = require("./_firebaseAdmin");

const COOKIE_NAME = "taurus_admin_session";

function hashToken(token) {
  return crypto.createHash("sha256").update(String(token || "")).digest("hex");
}

function getClientIp(req) {
  const forwardedFor = req.headers["x-forwarded-for"];
  if (typeof forwardedFor === "string" && forwardedFor.trim()) {
    return forwardedFor.split(",")[0].trim();
  }
  return req.socket?.remoteAddress || "Unknown";
}

function parseCookies(req) {
  const header = String(req.headers.cookie || "");
  return Object.fromEntries(
    header
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const index = part.indexOf("=");
        if (index === -1) return [part, ""];
        return [part.slice(0, index), decodeURIComponent(part.slice(index + 1))];
      }),
  );
}

async function issueAdminSession({ uid, provider, scope, maxAge, req }) {
  const token = crypto.randomBytes(32).toString("base64url");
  const tokenHash = hashToken(token);
  const expiresAt = admin.firestore.Timestamp.fromMillis(Date.now() + maxAge * 1000);

  await db.collection("gateway_sessions").doc(tokenHash).set({
    target: "admin",
    uid,
    provider,
    scope,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    expiresAt,
    revoked: false,
    ip: getClientIp(req),
    userAgent: String(req.headers["user-agent"] || "").slice(0, 500),
  });

  return token;
}

async function verifyAdminSession(req) {
  const token = parseCookies(req)[COOKIE_NAME];
  if (!token || !/^[A-Za-z0-9_-]{40,100}$/.test(token)) return null;

  const tokenHash = hashToken(token);
  const snapshot = await db.collection("gateway_sessions").doc(tokenHash).get();
  if (!snapshot.exists) return null;

  const data = snapshot.data() || {};
  const expiresAtMs = data.expiresAt?.toMillis ? data.expiresAt.toMillis() : 0;
  if (
    data.revoked ||
    data.target !== "admin" ||
    !expiresAtMs ||
    Date.now() >= expiresAtMs ||
    !["passkey", "telegram"].includes(String(data.provider || "")) ||
    !["full", "workspace"].includes(String(data.scope || ""))
  ) {
    return null;
  }

  return {
    token,
    tokenHash,
    uid: String(data.uid || ""),
    provider: String(data.provider),
    scope: String(data.scope),
    expiresAtMs,
  };
}

async function revokeAdminSession(req) {
  const session = await verifyAdminSession(req);
  if (!session) return;
  await db.collection("gateway_sessions").doc(session.tokenHash).set({
    revoked: true,
    revokedAt: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });
}

function sessionCookie(token, maxAge) {
  return `${COOKIE_NAME}=${encodeURIComponent(token)}; Max-Age=${Math.max(0, Math.floor(maxAge))}; Path=/; HttpOnly; Secure; SameSite=Lax`;
}

function clearSessionCookie() {
  return `${COOKIE_NAME}=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Lax`;
}

module.exports = {
  COOKIE_NAME,
  clearSessionCookie,
  issueAdminSession,
  revokeAdminSession,
  sessionCookie,
  verifyAdminSession,
};
