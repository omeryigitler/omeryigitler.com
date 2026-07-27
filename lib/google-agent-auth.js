const TOKENINFO_ENDPOINT = "https://oauth2.googleapis.com/tokeninfo";
const VERIFY_TIMEOUT_MS = 7000;

function envList(name) {
  return String(process.env[name] || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

function getHeader(req, name) {
  const target = String(name || "").toLowerCase();
  for (const [key, value] of Object.entries(req?.headers || {})) {
    if (key.toLowerCase() === target) return Array.isArray(value) ? value[0] : value;
  }
  return null;
}

function authError(statusCode, code, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

function isVerified(value) {
  return value === true || value === "true";
}

async function verifyGoogleAgentRequest(req, options = {}) {
  const token = String(getHeader(req, "x-google-id-token") || "").trim();
  if (!token) return null;

  const fetchImpl = options.fetchImpl || globalThis.fetch;
  if (typeof fetchImpl !== "function") {
    throw authError(503, "google_auth_unavailable", "Google kimlik doğrulaması bu ortamda kullanılamıyor.");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), VERIFY_TIMEOUT_MS);
  let response;
  let payload;

  try {
    response = await fetchImpl(`${TOKENINFO_ENDPOINT}?id_token=${encodeURIComponent(token)}`, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: controller.signal
    });
    payload = await response.json().catch(() => ({}));
  } catch (error) {
    if (error?.name === "AbortError") {
      throw authError(504, "google_auth_timeout", "Google oturum doğrulaması zaman aşımına uğradı.");
    }
    throw authError(502, "google_auth_failed", "Google oturumu doğrulanamadı.");
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok || payload.error_description || payload.error) {
    throw authError(401, "invalid_google_token", "Google oturumu geçersiz veya süresi dolmuş.");
  }

  const email = String(payload.email || "").trim().toLowerCase();
  const allowedEmails = envList("AGENT_ADMIN_EMAILS").map((value) => value.toLowerCase());
  if (!email || !isVerified(payload.email_verified)) {
    throw authError(403, "google_email_unverified", "Doğrulanmış bir Google hesabı gereklidir.");
  }
  if (!allowedEmails.length) {
    throw authError(503, "agent_email_allowlist_missing", "Agent yönetici e-posta listesi yapılandırılmamış.");
  }
  if (!allowedEmails.includes(email)) {
    throw authError(403, "agent_forbidden", "Bu Google hesabı agent işlemleri için yetkili değil.");
  }

  const allowedAudiences = envList("STARTPAGE_GOOGLE_CLIENT_IDS");
  if (allowedAudiences.length && !allowedAudiences.includes(String(payload.aud || ""))) {
    throw authError(403, "google_audience_forbidden", "Google oturumu izin verilen Startpage istemcisine ait değil.");
  }

  const expiresAt = Number(payload.exp || 0) * 1000;
  if (expiresAt && expiresAt <= Date.now()) {
    throw authError(401, "expired_google_token", "Google oturumunun süresi dolmuş.");
  }

  return {
    id: `google:${payload.sub || email}`,
    uid: payload.sub || null,
    email,
    source: "google_startpage",
    role: "allowed_user"
  };
}

module.exports = {
  verifyGoogleAgentRequest,
  _test: { authError, envList, getHeader, isVerified }
};
