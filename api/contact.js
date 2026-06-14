// Contact form handler — writes to Firestore `messages` (admin inbox) and
// sends an optional Telegram notification. Replaces the old mailto form so
// submissions actually reach the dashboard.

const { admin, db } = require("./_firebaseAdmin");

const MAX = { name: 120, email: 160, message: 4000 };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const SITE_TYPES = ["LANDING", "CORPORATE", "ECOMMERCE", "PROMO", "PORTAL"];
const DESIGN_TYPES = ["TEMPLATE", "CUSTOM"];
const SPEEDS = ["STANDARD", "FAST", "URGENT"];
const MAINT = ["NONE", "BASIC", "MID", "PREMIUM"];
const FEATURES = ["seo", "multilang", "graphics", "ux", "crm"];
const ADDONS = ["logo_design", "content_writing", "social_media", "google_maps"];

function clean(value, max) {
    return String(value == null ? "" : value).trim().slice(0, max);
}

function pick(value, allowed, fallback) {
    return allowed.includes(value) ? value : fallback;
}

function sanitizeConfig(c) {
    if (!c || typeof c !== "object") return null;
    const features = Array.isArray(c.features) ? c.features.filter((f) => FEATURES.includes(f)) : [];
    const addons = Array.isArray(c.addons) ? c.addons.filter((a) => ADDONS.includes(a)) : [];
    let pageCount = parseInt(c.pageCount, 10);
    if (!Number.isFinite(pageCount)) pageCount = 1;
    pageCount = Math.min(50, Math.max(1, pageCount));
    return {
        siteType: pick(c.siteType, SITE_TYPES, "LANDING"),
        designType: pick(c.designType, DESIGN_TYPES, "TEMPLATE"),
        pageCount,
        features,
        addons,
        deliverySpeed: pick(c.deliverySpeed, SPEEDS, "STANDARD"),
        maintenanceLevel: pick(c.maintenanceLevel, MAINT, "NONE")
    };
}

function configSummary(cfg) {
    if (!cfg) return "";
    const lines = [
        "Site: " + cfg.siteType + " · " + cfg.designType + " · " + cfg.pageCount + " pages",
        "Features: " + (cfg.features.length ? cfg.features.join(", ") : "none"),
        "Add-ons: " + (cfg.addons.length ? cfg.addons.join(", ") : "none"),
        "Timeline: " + cfg.deliverySpeed + " · Maintenance: " + cfg.maintenanceLevel
    ];
    return lines.join("\n");
}

function readBody(req) {
    if (!req.body) return {};
    if (typeof req.body === "string") {
        try { return JSON.parse(req.body); } catch (e) { return {}; }
    }
    return req.body;
}

// Cloudflare Turnstile verification. Returns { ok: true } when valid,
// { ok: false } when the token is invalid. If no secret is configured yet,
// returns { ok: true, skipped: true } so the form keeps working until the
// TURNSTILE_SECRET env var is added (then enforcement is automatic).
async function verifyTurnstile(token, ip) {
    const secret = process.env.TURNSTILE_SECRET;
    if (!secret) {
        console.warn("[contact] TURNSTILE_SECRET not set — skipping bot verification");
        return { ok: true, skipped: true };
    }
    if (!token) return { ok: false };

    try {
        const form = new URLSearchParams();
        form.append("secret", secret);
        form.append("response", token);
        if (ip) form.append("remoteip", ip);

        const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: form.toString()
        });
        const data = await res.json();
        return { ok: !!data.success };
    } catch (e) {
        // network failure verifying — fail closed
        return { ok: false };
    }
}

async function notifyTelegram(name, email, message, cfg) {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    if (!token || !chatId) return;

    let text =
        "📨 New project request\n\n" +
        "Name: " + name + "\n" +
        "Email: " + email + "\n\n" +
        message;
    if (cfg) text += "\n\n— Project config —\n" + configSummary(cfg);

    await fetch("https://api.telegram.org/bot" + token + "/sendMessage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text })
    });
}

module.exports = async (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") return res.status(200).end();
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed." });

    const body = readBody(req);

    // Honeypot: a filled hidden field = bot. Pretend success without saving.
    if (body.website && String(body.website).trim() !== "") {
        return res.status(200).json({ ok: true });
    }

    const name = clean(body.name, MAX.name);
    const email = clean(body.email, MAX.email);
    const message = clean(body.message, MAX.message);

    if (!name || !email || !message) {
        return res.status(400).json({ error: "Name, email and message are required." });
    }
    if (!EMAIL_RE.test(email)) {
        return res.status(400).json({ error: "Please provide a valid email address." });
    }

    const ip = (req.headers["x-forwarded-for"] || "").split(",")[0].trim();

    const verify = await verifyTurnstile(body.turnstileToken, ip);
    if (!verify.ok) {
        return res.status(403).json({ error: "Verification failed. Please refresh and try again." });
    }

    // Per-IP rate limit: max 3 submissions / hour (server-side, via Firestore)
    if (ip) {
        try {
            const RL_MAX = 3, RL_WINDOW = 60 * 60 * 1000, now = Date.now();
            const ref = db.collection("rate_limits").doc(ip.replace(/[^0-9a-fA-F.:]/g, "_") || "unknown");
            const snap = await ref.get();
            let hits = (snap.exists && Array.isArray(snap.data().hits) ? snap.data().hits : []).filter((t) => now - t < RL_WINDOW);
            if (hits.length >= RL_MAX) {
                return res.status(429).json({ error: "Too many requests. Please try again later." });
            }
            hits.push(now);
            await ref.set({ hits, updatedAt: now }, { merge: true });
        } catch (e) {
            // rate-limit store failure should not block a genuine message
        }
    }

    const config = sanitizeConfig(body.config);

    try {
        await db.collection("messages").add({
            name,
            email,
            message,
            config: config || null,
            source: config ? "project-configurator" : "contact-form",
            read: false,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
    } catch (e) {
        return res.status(500).json({ error: "Could not save your message. Please try again." });
    }

    // Telegram is best-effort — never block the success response on it.
    try { await notifyTelegram(name, email, message, config); } catch (e) {}

    return res.status(200).json({ ok: true });
};
