// DEPLOY_TRIGGER: 2026-04-12_admin_auth_hardening
const axios = require("axios");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { admin, db, requireEnv } = require("./_firebaseAdmin");

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

function getAllowedTelegramIds() {
  return (process.env.TELEGRAM_ALLOWED_IDS || process.env.TELEGRAM_CHAT_ID || "")
    .split(",")
    .map((id) => Number(String(id).trim()))
    .filter(Boolean);
}

function isAllowedTelegramId(id) {
  const allowedIds = getAllowedTelegramIds();
  return allowedIds.length > 0 && allowedIds.includes(Number(id));
}

function getGeminiModel() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const modelName = process.env.GEMINI_MODEL || "gemini-2.5-flash-lite";
  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({ model: modelName });
}

async function telegram(method, payload) {
  if (!BOT_TOKEN) {
    throw new Error("Missing required environment variable: TELEGRAM_BOT_TOKEN");
  }

  const url = `https://api.telegram.org/bot${BOT_TOKEN}/${method}`;
  const response = await axios.post(url, payload);
  return response.data;
}

async function answerCallback(callbackQuery, text) {
  try {
    await telegram("answerCallbackQuery", {
      callback_query_id: callbackQuery.id,
      text,
    });
  } catch (error) {
    console.error("Callback answer failed:", error);
  }
}

async function handleAuthCallback(callbackQuery) {
  const fromId = callbackQuery.from?.id || callbackQuery.message?.chat?.id;

  if (!isAllowedTelegramId(fromId)) {
    await answerCallback(callbackQuery, "Unauthorized");
    console.warn(`Blocked unauthorized auth callback from: ${fromId}`);
    return;
  }

  const match = /^auth_([a-f0-9]{32})_(\d{2})$/i.exec(callbackQuery.data || "");
  if (!match) {
    await answerCallback(callbackQuery, "Invalid request");
    return;
  }

  const [, reqId, selectedCode] = match;
  const code = Number(selectedCode);
  const docRef = db.collection("auth_requests").doc(reqId);
  const doc = await docRef.get();

  if (!doc.exists) {
    await answerCallback(callbackQuery, "Expired request");
    return;
  }

  const data = doc.data() || {};
  const expiresAtMs = data.expiresAt?.toMillis ? data.expiresAt.toMillis() : 0;

  if (data.status !== "pending" || (expiresAtMs && Date.now() > expiresAtMs)) {
    if (data.status === "pending") {
      await docRef.update({
        status: "expired",
        expiredAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
    await answerCallback(callbackQuery, "Expired request");
    return;
  }

  if (code === Number(data.expectedCode)) {
    await docRef.update({
      status: "approved",
      approvedAt: admin.firestore.FieldValue.serverTimestamp(),
      approvedBy: String(fromId),
    });
    await answerCallback(callbackQuery, "Access granted");
    return;
  }

  await docRef.update({
    status: "denied",
    deniedAt: admin.firestore.FieldValue.serverTimestamp(),
    deniedBy: String(fromId),
    attempts: admin.firestore.FieldValue.increment(1),
  });
  await answerCallback(callbackQuery, "Wrong code");
}

async function handleTrackerCallback(callbackQuery) {
  const fromId = callbackQuery.from?.id || callbackQuery.message?.chat?.id;

  if (!isAllowedTelegramId(fromId)) {
    await answerCallback(callbackQuery, "Unauthorized");
    console.warn(`Blocked unauthorized tracker callback from: ${fromId}`);
    return;
  }

  const data = callbackQuery.data || "";
  const firstUnderscore = data.indexOf("_");
  if (firstUnderscore === -1) return;

  const action = data.substring(0, firstUnderscore);
  const sessionID = data.substring(firstUnderscore + 1);

  await answerCallback(callbackQuery, `Command received: ${action.toUpperCase()}`);

  await db.collection("visitors_v1").doc(sessionID).set(
    {
      action,
      action_timestamp: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
}

async function executeVisitorCommand(chatId, command, messageContent) {
  const snapshot = await db
    .collection("visitors_v1")
    .orderBy("startTime", "desc")
    .limit(1)
    .get();

  if (snapshot.empty) {
    await telegram("sendMessage", {
      chat_id: chatId,
      text: "No active sessions found to control.",
    });
    return;
  }

  const sessionDoc = snapshot.docs[0];

  await sessionDoc.ref.set(
    {
      action: command.toLowerCase(),
      message: messageContent || null,
      action_timestamp: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  await telegram("sendMessage", {
    chat_id: chatId,
    text: `Command executed: ${command}\nMessage: ${messageContent || "No message"}`,
  });
}

async function handleTelegramMessage(message, model) {
  if (!isAllowedTelegramId(message.chat.id)) {
    console.warn(`Blocked unauthorized message from: ${message.chat.id}`);
    return;
  }

  const chatId = message.chat.id;
  let inputs = [];

  if (message.voice) {
    if (!model) {
      await telegram("sendMessage", {
        chat_id: chatId,
        text: "GEMINI_API_KEY missing. Voice command processing is disabled.",
      });
      return;
    }

    const fileId = message.voice.file_id;
    const fileRes = await axios.get(
      `https://api.telegram.org/bot${BOT_TOKEN}/getFile?file_id=${fileId}`
    );
    const filePath = fileRes.data?.result?.file_path;

    if (!filePath) {
      throw new Error("Telegram voice file path not found");
    }

    const fileUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${filePath}`;
    const audioRes = await axios.get(fileUrl, { responseType: "arraybuffer" });
    const base64Audio = Buffer.from(audioRes.data).toString("base64");

    inputs = [
      {
        inlineData: {
          data: base64Audio,
          mimeType: "audio/ogg",
        },
      },
    ];
  } else if (message.text) {
    const textUpper = String(message.text).trim().toUpperCase();

    if (!model) {
      let fallbackCommand = "UNKNOWN";

      if (["DURDUR", "KAPAT", "FREEZE", "STOP", "DON"].includes(textUpper)) {
        fallbackCommand = "FREEZE";
      } else if (
        ["TEMIZLE", "AC", "AÇ", "DEVAM ET", "CLEAR", "IPTAL", "İPTAL"].includes(
          textUpper
        )
      ) {
        fallbackCommand = "CLEAR";
      } else if (textUpper === "ALARM") {
        fallbackCommand = "ALARM";
      } else if (textUpper === "ENGELLE" || textUpper === "BLOCK") {
        fallbackCommand = "BLOCK";
      }

      if (fallbackCommand === "UNKNOWN") {
        await telegram("sendMessage", {
          chat_id: chatId,
          text: `Unknown command: "${message.text}"`,
        });
        return;
      }

      await executeVisitorCommand(chatId, fallbackCommand, null);
      return;
    }

    inputs = [`COMMAND TEXT: "${message.text}"`];
  }

  const prompt = `
Analyze the intent of the user's command (Audio or Text).
Return ONLY raw JSON. No markdown formatting.

Schema:
{ "command": "FREEZE" | "CLEAR" | "ALARM" | "BLOCK" | "UNKNOWN", "message": string | null }

Rules:
1. "Durdur", "Kapat", "Freeze", "Stop", "Don" -> { "command": "FREEZE", "message": null }
2. "Durdur ve [X] yaz", "Ekrana [X] yaz", "Mesaj: [X]" -> { "command": "FREEZE", "message": "[X]" }
3. "Temizle", "Aç", "Devam et", "Clear", "İptal" -> { "command": "CLEAR", "message": null }
4. "Alarm" -> ALARM, "Engelle" -> BLOCK
5. If unknown -> UNKNOWN
  `.trim();

  const result = await model.generateContent([prompt, ...inputs]);
  const responseText = result.response
    .text()
    .replace(/```json|```/g, "")
    .trim();

  let responseData;
  try {
    responseData = JSON.parse(responseText);
  } catch {
    throw new Error(`Invalid JSON returned from Gemini: ${responseText}`);
  }

  const command = String(responseData.command || "UNKNOWN").toUpperCase();
  const messageContent = responseData.message || null;

  if (["FREEZE", "CLEAR", "ALARM", "BLOCK"].includes(command)) {
    await executeVisitorCommand(chatId, command, messageContent);
  } else if (message.text) {
    await telegram("sendMessage", {
      chat_id: chatId,
      text: `Unknown command: "${message.text}"`,
    });
  }
}

const model = getGeminiModel();

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(200).send("OK");
  }

  try {
    const callbackQuery = req.body?.callback_query;

    if (callbackQuery?.data?.startsWith("auth_")) {
      await handleAuthCallback(callbackQuery);
      return res.status(200).send("OK");
    }

    if (callbackQuery) {
      await handleTrackerCallback(callbackQuery);
      return res.status(200).send("OK");
    }

    const message = req.body?.message;
    if (message && (message.voice || message.text)) {
      await handleTelegramMessage(message, model);
    }

    return res.status(200).send("OK");
  } catch (error) {
    console.error("Webhook Fatal Error:", error);
    return res.status(200).send("OK");
  }
};
