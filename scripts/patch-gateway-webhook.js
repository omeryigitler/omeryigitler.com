const fs = require('node:fs');
const path = require('node:path');

const root = process.cwd();
const webhookPath = path.join(root, 'api/webhook.js');
const gatewayPath = path.join(root, 'api/gateway.js');

let webhook = fs.readFileSync(webhookPath, 'utf8');
let gateway = fs.readFileSync(gatewayPath, 'utf8');

function replaceOnce(source, pattern, replacement, label) {
  const matches = source.match(pattern);
  if (!matches) throw new Error(`[gateway-webhook] ${label}: pattern not found`);
  const output = source.replace(pattern, replacement);
  if (output === source) throw new Error(`[gateway-webhook] ${label}: replacement made no change`);
  return output;
}

const authCallback = `async function handleAuthCallback(callbackQuery) {
  const fromId = callbackQuery.from?.id || callbackQuery.message?.chat?.id;

  if (!isAllowedTelegramId(fromId)) {
    await answerCallback(callbackQuery, "Unauthorized");
    console.warn(\`Blocked unauthorized auth callback from: \${fromId}\`);
    return;
  }

  const match = /^auth_([a-f0-9]{32})_(\\d{2})$/i.exec(callbackQuery.data || "");
  if (!match) {
    await answerCallback(callbackQuery, "Invalid request");
    return;
  }

  // Telegram requires answerCallbackQuery immediately. Firestore work must never
  // keep the mobile button spinner open.
  await answerCallback(callbackQuery, "Checking");

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
    return;
  }

  const chatId = callbackQuery.message?.chat?.id;
  const messageId = callbackQuery.message?.message_id;
  if (chatId && messageId) {
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

  if (chatId) {
    const text = result === "approved"
      ? "✅ Taurus Gateway: access granted."
      : result === "denied"
        ? "❌ Taurus Gateway: wrong code."
        : "⌛ Taurus Gateway: request expired.";
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
}

async function handleTrackerCallback`;

webhook = replaceOnce(
  webhook,
  /async function handleAuthCallback\(callbackQuery\) \{[\s\S]*?\n\}\n\nasync function handleTrackerCallback/,
  authCallback,
  'immediate Telegram callback acknowledgement',
);

const webhookSetup = `function optionalEnv(name) {
  const value = process.env[name];
  return value && String(value).trim() ? String(value).trim() : "";
}

let telegramWebhookConfiguredAt = 0;

async function ensureTelegramWebhook() {
  if (Date.now() - telegramWebhookConfiguredAt < 60_000) return;

  const botToken = requireEnv("TELEGRAM_BOT_TOKEN");
  const secret = optionalEnv("TELEGRAM_WEBHOOK_SECRET");
  if (secret && !/^[A-Za-z0-9_-]{1,256}$/.test(secret)) {
    throw new Error("TELEGRAM_WEBHOOK_SECRET contains unsupported characters");
  }

  const payload = {
    url: "https://omeryigitler.com/api/webhook",
    allowed_updates: ["message", "callback_query"],
    drop_pending_updates: false,
  };
  if (secret) payload.secret_token = secret;

  const response = await axios.post(
    \`https://api.telegram.org/bot\${botToken}/setWebhook\`,
    payload,
    { timeout: 7000 },
  );
  if (!response.data?.ok) {
    throw new Error(response.data?.description || "Telegram rejected webhook configuration");
  }

  telegramWebhookConfiguredAt = Date.now();
}`;

gateway = replaceOnce(
  gateway,
  /function optionalEnv\(name\) \{\n  const value = process\.env\[name\];\n  return value && String\(value\)\.trim\(\) \? String\(value\)\.trim\(\) : "";\n\}/,
  webhookSetup,
  'Telegram webhook self-heal helper',
);

gateway = replaceOnce(
  gateway,
  /  const challengeCode = generateCode\(\);/,
  '  await ensureTelegramWebhook();\n\n  const challengeCode = generateCode();',
  'auth initialization webhook check',
);

// Fail the build if the generated server functions are not syntactically valid.
new Function(webhook);
new Function(gateway);

fs.writeFileSync(webhookPath, webhook, 'utf8');
fs.writeFileSync(gatewayPath, gateway, 'utf8');
console.log('[gateway-webhook] Existing gateway and webhook functions patched successfully.');
