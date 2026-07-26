const axios = require("axios");

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const WEBHOOK_URL = "https://omeryigitler.com/api/telegram-webhook";
let lastConfiguredAt = 0;

function allowedOrigin(origin) {
  return origin === "https://omeryigitler.com" || origin === "https://www.omeryigitler.com";
}

function webhookSecret() {
  const value = String(process.env.TELEGRAM_WEBHOOK_SECRET || "").trim();
  if (!value) return "";
  if (!/^[A-Za-z0-9_-]{1,256}$/.test(value)) {
    throw new Error("TELEGRAM_WEBHOOK_SECRET contains unsupported characters");
  }
  return value;
}

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const origin = String(req.headers.origin || "");
  if (!allowedOrigin(origin)) return res.status(403).json({ error: "Origin not allowed" });
  if (!BOT_TOKEN) return res.status(500).json({ error: "Telegram bot is not configured" });

  if (Date.now() - lastConfiguredAt < 60_000) {
    return res.status(200).json({ ok: true, cached: true, webhook: WEBHOOK_URL });
  }

  try {
    const secret = webhookSecret();
    const payload = {
      url: WEBHOOK_URL,
      allowed_updates: ["message", "callback_query"],
      drop_pending_updates: false,
    };
    if (secret) payload.secret_token = secret;

    const response = await axios.post(
      `https://api.telegram.org/bot${BOT_TOKEN}/setWebhook`,
      payload,
      { timeout: 7000 },
    );

    if (!response.data?.ok) {
      throw new Error(response.data?.description || "Telegram rejected webhook configuration");
    }

    lastConfiguredAt = Date.now();
    return res.status(200).json({ ok: true, webhook: WEBHOOK_URL });
  } catch (error) {
    console.error("Telegram webhook self-heal failed:", error?.response?.data || error.message);
    return res.status(502).json({ error: "Telegram webhook configuration failed" });
  }
};
