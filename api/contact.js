const crypto = require("node:crypto");

const MAX = { name: 120, email: 160, message: 4000 };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SITE_TYPES = ["LANDING", "CORPORATE", "ECOMMERCE", "PROMO", "PORTAL"];
const DESIGN_TYPES = ["TEMPLATE", "CUSTOM"];
const SPEEDS = ["STANDARD", "FAST", "URGENT"];
const MAINTENANCE = ["NONE", "BASIC", "MID", "PREMIUM"];
const FEATURES = ["seo", "multilang", "graphics", "ux", "crm"];
const ADDONS = ["logo_design", "content_writing", "social_media", "google_maps"];
const COUNTRIES = ["TR", "MT"];
const RATE_LIMIT_MAX = 3;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
let firebaseRuntime = null;

function loadFirebaseRuntime() {
  if (firebaseRuntime) return firebaseRuntime;
  try {
    firebaseRuntime = require("./_firebaseAdmin");
    return firebaseRuntime;
  } catch (error) {
    console.error("[contact] Firebase Admin initialization failed");
    return null;
  }
}

function clean(value, max) {
  return String(value == null ? "" : value).trim().slice(0, max);
}

function pick(value, allowed, fallback) {
  return allowed.includes(value) ? value : fallback;
}

function sanitizeConfig(input) {
  if (!input || typeof input !== "object") return null;
  const features = Array.isArray(input.features) ? [...new Set(input.features.filter((value) => FEATURES.includes(value)))] : [];
  const addons = Array.isArray(input.addons) ? [...new Set(input.addons.filter((value) => ADDONS.includes(value)))] : [];
  let pageCount = Number.parseInt(input.pageCount, 10);
  if (!Number.isFinite(pageCount)) pageCount = 1;
  pageCount = Math.min(50, Math.max(1, pageCount));

  return {
    country: pick(input.country, COUNTRIES, "TR"),
    siteType: pick(input.siteType, SITE_TYPES, "LANDING"),
    designType: pick(input.designType, DESIGN_TYPES, "TEMPLATE"),
    pageCount,
    features,
    addons,
    deliverySpeed: pick(input.deliverySpeed, SPEEDS, "STANDARD"),
    maintenanceLevel: pick(input.maintenanceLevel, MAINTENANCE, "NONE")
  };
}

function configSummary(config) {
  if (!config) return "";
  return [
    `Site: ${config.siteType} · ${config.designType} · ${config.pageCount} pages`,
    `Features: ${config.features.length ? config.features.join(", ") : "none"}`,
    `Add-ons: ${config.addons.length ? config.addons.join(", ") : "none"}`,
    `Timeline: ${config.deliverySpeed} · Maintenance: ${config.maintenanceLevel}`
  ].join("\n");
}

function readBody(req) {
  if (!req.body) return {};
  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body);
    } catch (error) {
      return {};
    }
  }
  return req.body;
}

function envList(name) {
  return String(process.env[name] || "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
}

function allowedTurnstileHosts() {
  const hosts = new Set([
    "omeryigitler.com",
    "www.omeryigitler.com",
    ...envList("TURNSTILE_ALLOWED_HOSTS")
  ]);
  if (process.env.VERCEL_URL) hosts.add(String(process.env.VERCEL_URL).toLowerCase());
  return hosts;
}

async function verifyTurnstile(token, ip, fetchImpl = fetch) {
  const secret = process.env.TURNSTILE_SECRET;
  if (!secret) {
    if (process.env.VERCEL_ENV === "production") return { ok: false, reason: "misconfigured" };
    return { ok: true, skipped: true };
  }
  if (!token) return { ok: false, reason: "missing_token" };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const form = new URLSearchParams();
    form.append("secret", secret);
    form.append("response", token);
    if (ip) form.append("remoteip", ip);

    const response = await fetchImpl("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form.toString(),
      signal: controller.signal
    });
    if (!response.ok) return { ok: false, reason: "verification_unavailable" };

    const data = await response.json();
    if (!data.success) {
      return {
        ok: false,
        reason: "invalid_token",
        errorCodes: Array.isArray(data["error-codes"]) ? data["error-codes"].slice(0, 5) : []
      };
    }
    if (data.action !== "contact") return { ok: false, reason: "action_mismatch" };
    const hostname = String(data.hostname || "").toLowerCase();
    if (!hostname || !allowedTurnstileHosts().has(hostname)) {
      return { ok: false, reason: "hostname_mismatch" };
    }

    return { ok: true };
  } catch (error) {
    return { ok: false, reason: "verification_unavailable" };
  } finally {
    clearTimeout(timeout);
  }
}

function rateLimitKey(ip) {
  const secret = process.env.RATE_LIMIT_HASH_SECRET || process.env.TURNSTILE_SECRET;
  if (secret) return crypto.createHmac("sha256", secret).update(ip).digest("hex");
  return crypto.createHash("sha256").update(ip).digest("hex");
}

async function enforceRateLimit(ip, database, adminSdk, now = Date.now()) {
  if (!ip) return { allowed: true };
  const ref = database.collection("rate_limits").doc(`contact_${rateLimitKey(ip)}`);

  return database.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    const stored = snapshot.exists && Array.isArray(snapshot.data()?.hits) ? snapshot.data().hits : [];
    const hits = stored.filter((timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS);
    if (hits.length >= RATE_LIMIT_MAX) return { allowed: false };

    hits.push(now);
    transaction.set(ref, {
      hits,
      updatedAt: adminSdk.firestore.FieldValue.serverTimestamp(),
      expiresAt: adminSdk.firestore.Timestamp.fromMillis(now + RATE_LIMIT_WINDOW_MS)
    }, { merge: true });
    return { allowed: true };
  });
}

async function notifyTelegram(name, email, message, config) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return { sent: false, reason: "not_configured" };

  let text = `📨 New project request\n\nName: ${name}\nEmail: ${email}\n\n${message}`;
  if (config) text += `\n\n— Project config —\n${configSummary(config)}`;
  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
    signal: AbortSignal.timeout(5000)
  });
  if (!response.ok) throw new Error("Telegram notification failed.");
  return { sent: true };
}

async function notifyEmail(name, email, message, config) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { sent: false, reason: "not_configured" };

  const to = String(process.env.CONTACT_EMAIL_TO || "info@omeryigitler.com").trim();
  const from = String(process.env.CONTACT_EMAIL_FROM || "Taurus Contact <contact@omeryigitler.com>").trim();
  let text = `New project request\n\nName: ${name}\nEmail: ${email}\n\n${message}`;
  if (config) text += `\n\n— Project config —\n${configSummary(config)}`;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      from,
      to: [to],
      reply_to: email,
      subject: `📨 New project request — ${name}`,
      text
    }),
    signal: AbortSignal.timeout(8000)
  });
  if (!response.ok) throw new Error(`Email notification failed (${response.status}).`);
  return { sent: true };
}

function sendError(res, status, code, error) {
  return res.status(status).json({ ok: false, code, error });
}

async function contactHandler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  if (req.method === "OPTIONS") {
    res.setHeader("Allow", "POST, OPTIONS");
    return res.status(204).end();
  }
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST, OPTIONS");
    return sendError(res, 405, "method_not_allowed", "Method not allowed.");
  }

  const requestId = crypto.randomUUID();
  const body = readBody(req);
  if (body.website && String(body.website).trim() !== "") return res.status(200).json({ ok: true });

  const name = clean(body.name, MAX.name);
  const email = clean(body.email, MAX.email);
  const message = clean(body.message, MAX.message);
  if (!name || !email || !message) {
    return sendError(res, 400, "required_fields_missing", "Name, email and project details are required.");
  }
  if (!EMAIL_RE.test(email)) {
    return sendError(res, 400, "invalid_email", "Please provide a valid email address.");
  }

  const ip = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim();
  const verification = await verifyTurnstile(body.turnstileToken, ip);
  if (!verification.ok) {
    console.warn("[contact] verification rejected", {
      requestId,
      reason: verification.reason,
      errorCodes: verification.errorCodes || []
    });
    if (verification.reason === "verification_unavailable" || verification.reason === "misconfigured") {
      return sendError(res, 503, "verification_unavailable", "Security verification is temporarily unavailable. Please try again shortly.");
    }
    return sendError(res, 403, "verification_failed", "Security verification failed. Please retry the check.");
  }

  const config = sanitizeConfig(body.config);
  const firebase = loadFirebaseRuntime();
  let stored = false;

  if (firebase) {
    const { admin, db } = firebase;
    try {
      const rateLimit = await enforceRateLimit(ip, db, admin);
      if (!rateLimit.allowed) {
        return sendError(res, 429, "rate_limited", "Too many requests. Please try again later.");
      }
    } catch (error) {
      console.warn("[contact] rate limit storage unavailable", { requestId, error: error?.message });
    }

    const serverTimestamp = admin.firestore.FieldValue.serverTimestamp();
    try {
      await db.collection("messages").add({
        name,
        email,
        message,
        config: config || null,
        country: config?.country || "TR",
        siteType: config?.siteType || null,
        projectType: config?.siteType || null,
        designType: config?.designType || null,
        pageCount: config?.pageCount || null,
        features: config?.features || [],
        selectedAddons: config?.addons || [],
        deliverySpeed: config?.deliverySpeed || null,
        maintenanceLevel: config?.maintenanceLevel || null,
        source: config ? "project-configurator" : "contact-form",
        status: "new",
        read: false,
        requestId,
        createdAt: serverTimestamp,
        timestamp: serverTimestamp
      });
      stored = true;
    } catch (error) {
      console.error("[contact] message write failed", { requestId, error: error?.message });
    }
  } else {
    console.error("[contact] Firestore unavailable, falling back to notifications only", { requestId });
  }

  // Even if Firestore is down, the request must still reach the owner —
  // never show the customer an error while a notification channel can deliver it.
  const [telegramResult, emailResult] = await Promise.allSettled([
    notifyTelegram(name, email, message, config),
    notifyEmail(name, email, message, config)
  ]);
  const telegramSent = telegramResult.status === "fulfilled" && telegramResult.value?.sent === true;
  const emailSent = emailResult.status === "fulfilled" && emailResult.value?.sent === true;
  if (telegramResult.status === "rejected") {
    console.warn("[contact] Telegram notification failed", { requestId, error: telegramResult.reason?.message });
  }
  if (emailResult.status === "rejected") {
    console.warn("[contact] email notification failed", { requestId, error: emailResult.reason?.message });
  }

  if (!stored && !telegramSent && !emailSent) {
    console.error("[contact] request could not be delivered on any channel", { requestId });
    return sendError(res, 503, "contact_backend_unavailable", "Your request could not be delivered right now. Please email info@omeryigitler.com directly.");
  }

  return res.status(200).json({ ok: true, requestId, stored });
}

module.exports = contactHandler;
module.exports._test = {
  allowedTurnstileHosts,
  rateLimitKey,
  sanitizeConfig,
  verifyTurnstile
};
