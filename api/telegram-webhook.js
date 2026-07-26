const axios = require("axios");
const { admin, db } = require("./_firebaseAdmin");

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const LEGACY_WEBHOOK_URL = "https://omeryigitler.com/api/webhook";

function allowedTelegramIds() {
  return (process.env.TELEGRAM_ALLOWED_IDS || process.env.TELEGRAM_CHAT_ID || "")
    .split(",")
    .map((value) => Number(String(value).trim()))
    .filter(Boolean);
}

function isAllowedTelegramId(value) {
  const allowed = allowedTelegramIds();
  return allowed.length > 0 && allowed.includes(Number(value));
}

function webhookSecret() {
  return String(process.env.TELEGRAM_WEBHOOK_SECRET || "").trim();
}

function isAuthorizedWebhook(req) {
  const expected = webhookSecret();
  if (!expected) return true;
  return req.headers["x-telegram-bot-api-secret-token"] === expected;
}

async function telegram(method, payload) {
  if (!BOT_TOKEN) throw new Error("TELEGRAM_BOT_TOKEN is missing");
  const response = await axios.post(
    `https://api.telegram.org/bot${BOT_TOKEN}/${method}`,
    payload,
    { timeout: 5000 },
  );
  return response.data;
}

async function acknowledge(callbackQuery, text = "Processing") {
  try {
    await telegram("answerCallbackQuery", {
      callback_query_id: callbackQuery.id,
      text,
      cache_time: 0,
    });
  } catch (error) {
    console.error("Immediate callback acknowledgement failed:", error?.response?.data || error.message);
  }
}

async function clearKeyboard(callbackQuery) {
  const chatId = callbackQuery.message?.chat?.id;
  const messageId = callbackQuery.message?.message_id;
  if (!chatId || !messageId) return;

  try {
    await telegram("editMessageReplyMarkup", {
      chat_id: chatId,
      message_id: messageId,
      reply_markup: { inline_keyboard: [] },
    });
  } catch (error) {
    console.warn("Could not clear auth keyboard:", error?.response?.data || error.message);
  }
}

async function sendResult(callbackQuery, text) {
  const chatId = callbackQuery.message?.chat?.id || callbackQuery.from?.id;
  if (!chatId) return;
  try {
    await telegram("sendMessage", {
      chat_id: chatId,
      text,
      disable_notification: true,
    });
  } catch (error) {
    console.warn("Could not send auth result:", error?.response?.data || error.message);
  }
}

async function processAuthCallback(callbackQuery) {
  const fromId = callbackQuery.from?.id || callbackQuery.message?.chat?.id;
  const match = /^auth_([a-f0-9]{32})_(\d{2})$/i.exec(callbackQuery.data || "");

  if (!isAllowedTelegramId(fromId)) {
    await acknowledge(callbackQuery, "Unauthorized");
    console.warn(`Blocked unauthorized auth callback from ${fromId}`);
    return;
  }

  if (!match) {
    await acknowledge(callbackQuery, "Invalid request");
    return;
  }

  // Stop Telegram's loading spinner before Firestore or any other network work.
  await acknowledge(callbackQuery, "Checking");

  const [, reqId, selectedCode] = match;
  const code = Number(selectedCode);
  const docRef = db.collection("auth_requests").doc(reqId);

  let result = "expired";
  try {
    result = await db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(docRef);
      if (!snapshot.exists) return "expired";

      const data = snapshot.data() || {};
      const expiresAtMs = data.expiresAt?.toMillis ? data.expiresAt.toMillis() : 0;
      const expired = Boolean(expiresAtMs && Date.now() > expiresAtMs);

      if (data.status !== "pending" || expired) {
        if (data.status === "pending" && expired) {
          transaction.update(docRef, {
            status: "expired",
            expiredAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        }
        return "expired";
      }

      if (code === Number(data.expectedCode)) {
        transaction.update(docRef, {
          status: "approved",
          approvedAt: admin.firestore.FieldValue.serverTimestamp(),
          approvedBy: String(fromId),
        });
        return "approved";
      }

      transaction.update(docRef, {
        status: "denied",
        deniedAt: admin.firestore.FieldValue.serverTimestamp(),
        deniedBy: String(fromId),
        attempts: admin.firestore.FieldValue.increment(1),
      });
      return "denied";
    });
  } catch (error) {
    console.error("Auth callback transaction failed:", error);
    await sendResult(callbackQuery, "⚠️ Taurus Gateway: approval could not be saved. Try again.");
    return;
  }

  await clearKeyboard(callbackQuery);

  if (result === "approved") {
    await sendResult(callbackQuery, "✅ Taurus Gateway: access granted.");
  } else if (result === "denied") {
    await sendResult(callbackQuery, "❌ Taurus Gateway: wrong code.");
  } else {
    await sendResult(callbackQuery, "⌛ Taurus Gateway: request expired.");
  }
}

async function forwardLegacyUpdate(req) {
  const headers = { "Content-Type": "application/json" };
  const secret = webhookSecret();
  if (secret) headers["X-Telegram-Bot-Api-Secret-Token"] = secret;

  await axios.post(LEGACY_WEBHOOK_URL, req.body || {}, {
    headers,
    timeout: 8000,
  });
}

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(200).send("OK");

  if (!isAuthorizedWebhook(req)) {
    console.warn("Telegram webhook rejected: secret header mismatch.");
    return res.status(401).send("Unauthorized");
  }

  const callbackQuery = req.body?.callback_query;
  if (!callbackQuery?.data?.startsWith("auth_")) {
    try {
      await forwardLegacyUpdate(req);
    } catch (error) {
      console.error("Legacy Telegram update forwarding failed:", error?.response?.data || error.message);
    }
    return res.status(200).send("OK");
  }

  try {
    await processAuthCallback(callbackQuery);
  } catch (error) {
    console.error("Telegram auth callback fatal error:", error);
  }
  return res.status(200).send("OK");
};
