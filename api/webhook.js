// DEPLOY_TRIGGER: 2026-04-25_gemini_command_hardening
const axios = require("axios");
const { GoogleGenerativeAI, SchemaType } = require("@google/generative-ai");
const { admin, db } = require("./_firebaseAdmin");
const { commandLabel, panel, row } = require("./telegramFormat");

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const VALID_COMMANDS = new Set(["FREEZE", "CLEAR", "ALARM", "BLOCK"]);
const COMMAND_RESPONSE_SCHEMA = {
  type: SchemaType.OBJECT,
  properties: {
    command: {
      type: SchemaType.STRING,
      enum: ["FREEZE", "CLEAR", "ALARM", "BLOCK", "UNKNOWN"],
      description: "The normalized visitor-control command.",
    },
    message: {
      type: SchemaType.STRING,
      description: "Text to show on the visitor screen. Return an empty string when no screen message is requested.",
    },
  },
  required: ["command", "message"],
};

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

function isTelegramWebhookAuthorized(req) {
  const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!expectedSecret) return true;

  return req.headers["x-telegram-bot-api-secret-token"] === expectedSecret;
}

function getGeminiModel() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const modelName = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({
    model: modelName,
    generationConfig: {
      temperature: 0,
      responseMimeType: "application/json",
      responseSchema: COMMAND_RESPONSE_SCHEMA,
    },
  });
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

function normalizeForIntent(value) {
  return String(value || "")
    .trim()
    .toLocaleUpperCase("tr-TR")
    .replace(/İ/g, "I")
    .replace(/İ/g, "I")
    .replace(/Ğ/g, "G")
    .replace(/Ü/g, "U")
    .replace(/Ş/g, "S")
    .replace(/Ö/g, "O")
    .replace(/Ç/g, "C");
}

function cleanScreenMessage(value) {
  if (typeof value !== "string") return null;

  const cleaned = value
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/[<>]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned) return null;
  return cleaned.slice(0, 180);
}

function parseTextCommandFallback(rawText) {
  const text = String(rawText || "").trim();
  const normalized = normalizeForIntent(text);

  const writePatterns = [
    /^(?:DURDUR|KAPAT|FREEZE|STOP|DON)\s+(?:VE\s+)?(.+?)\s+(?:YAZDIR|YAZ|GOSTER|GÖSTER)$/i,
    /^(?:EKRANA|SAYFAYA|ZIYARETCIYE|ZIYARETÇIYE|MESAJ|SUNU|ŞUNU)\s*:?\s*(.+?)(?:\s+(?:YAZDIR|YAZ|GOSTER|GÖSTER))?$/i,
    /^(?:YAZDIR|YAZ|GOSTER|GÖSTER)\s*:?\s*(.+)$/i,
  ];

  for (const pattern of writePatterns) {
    const match = text.match(pattern);
    if (match) {
      const screenMessage = cleanScreenMessage(match[1]);
      if (screenMessage) {
        return { command: "FREEZE", message: screenMessage };
      }
    }
  }

  if (["DURDUR", "KAPAT", "FREEZE", "STOP", "DON"].includes(normalized)) {
    return { command: "FREEZE", message: null };
  }

  if (["TEMIZLE", "AC", "AÇ", "DEVAM ET", "CLEAR", "IPTAL", "İPTAL", "UNBLOCK", "ENGELI KALDIR", "ENGELİ KALDIR"].includes(normalized)) {
    return { command: "CLEAR", message: null };
  }

  if (["ALARM", "UYAR", "UYARI", "SIREN", "SİREN"].includes(normalized)) {
    return { command: "ALARM", message: null };
  }

  if (["ENGELLE", "BLOCK", "KARA LISTE", "KARA LİSTE", "BAN"].includes(normalized)) {
    return { command: "BLOCK", message: null };
  }

  return { command: "UNKNOWN", message: null };
}

function normalizeGeminiCommand(responseData) {
  const command = String(responseData?.command || "UNKNOWN").trim().toUpperCase();
  const normalizedCommand = VALID_COMMANDS.has(command) ? command : "UNKNOWN";
  const message = cleanScreenMessage(responseData?.message || "");

  return {
    command: normalizedCommand,
    message,
  };
}

async function classifyCommandWithGemini(model, inputs) {
  const prompt = `
You are a strict command classifier for a private website visitor-control system.
The admin may send Turkish or English text, or a Turkish/English voice note.
Return ONLY valid JSON that matches the schema. Do not include markdown, comments, explanations, or extra keys.

Commands:
- FREEZE: stop/freeze the latest visitor session. Use this when the admin says durdur, kapat, don, freeze, stop.
- CLEAR: clear the active command and let the visitor continue. Use this when the admin says temizle, aç, devam et, iptal, clear, unblock, engeli kaldır.
- ALARM: trigger an alert/warning on the visitor screen.
- BLOCK: block/ban the visitor session. Use this only for explicit block/engelle/ban/kara liste intent.
- UNKNOWN: use this if the intent is not one of the commands above.

Screen message rule:
- If the admin says "ekrana [text] yaz", "ziyaretçiye [text] göster", "mesaj: [text]", "durdur ve [text] yaz", or similar, return FREEZE and put only the clean screen text in message.
- Do not include command words such as "ekrana", "yaz", "göster", "durdur" inside message.
- If there is no explicit screen text, message must be an empty string.
- Keep message under 180 characters.

Examples:
"Durdur" -> {"command":"FREEZE","message":""}
"Ekrana bakımdayız yaz" -> {"command":"FREEZE","message":"bakımdayız"}
"Durdur ve lütfen sonra tekrar dene yaz" -> {"command":"FREEZE","message":"lütfen sonra tekrar dene"}
"Temizle" -> {"command":"CLEAR","message":""}
"Engelle" -> {"command":"BLOCK","message":""}
"Alarm ver" -> {"command":"ALARM","message":""}
  `.trim();

  const result = await model.generateContent([prompt, ...inputs]);
  const responseText = result.response
    .text()
    .replace(/```json|```/g, "")
    .trim();

  return normalizeGeminiCommand(JSON.parse(responseText));
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

  // Button commands never carry a screen message — clear any stale one from a
  // previous reply-freeze, so a fresh FREEZE tap is message-free.
  await db.collection("visitors_v1").doc(sessionID).set(
    {
      action,
      message: null,
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
      text: panel({
        title: "TAURUS // COMMAND CENTER",
        subtitle: "No active visitor session found",
        rows: [
          row("⚙️", "Requested Action", commandLabel(command)),
        ],
        footer: "Open visitor intelligence and wait for a live session.",
      }),
      parse_mode: "HTML",
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
    text: panel({
      title: "TAURUS // COMMAND SENT",
      subtitle: "Visitor control command delivered",
      rows: [
        row("⚙️", "Action", commandLabel(command)),
        row("🆔", "Session", sessionDoc.id, { code: true }),
        row("💬", "Screen Message", messageContent || "No message"),
      ],
      footer: "The visitor session will apply this command on the next pulse.",
    }),
    parse_mode: "HTML",
  });
}

// Pull the visitor sessionID out of a notification the admin replied to.
// The Session value is the first <code> entity in the notification text.
function sessionIdFromReply(replyMsg) {
  if (!replyMsg) return null;
  const text = replyMsg.text || replyMsg.caption || "";
  const entities = replyMsg.entities || replyMsg.caption_entities || [];
  const codeEnt = entities.find((e) => e.type === "code");
  if (codeEnt) return text.substring(codeEnt.offset, codeEnt.offset + codeEnt.length).trim();

  // fallback: the line right after a short "Session" header
  const lines = text.split("\n");
  for (let i = 0; i < lines.length - 1; i += 1) {
    if (/session/i.test(lines[i]) && lines[i].length < 28) return lines[i + 1].trim();
  }
  return null;
}

async function applyToSession(chatId, sessionID, command, message) {
  const ref = db.collection("visitors_v1").doc(sessionID);
  const snap = await ref.get();
  if (!snap.exists) {
    await telegram("sendMessage", {
      chat_id: chatId,
      text: panel({
        title: "TAURUS // SESSION NOT FOUND",
        subtitle: "That visitor session is no longer active",
        rows: [row("🆔", "Session", sessionID, { code: true })],
        footer: "The visitor may have closed the tab.",
      }),
      parse_mode: "HTML",
    });
    return;
  }

  await ref.set(
    {
      action: command.toLowerCase(),
      message: message || null,
      action_timestamp: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  await telegram("sendMessage", {
    chat_id: chatId,
    text: panel({
      title: "TAURUS // SCREEN MESSAGE SENT",
      subtitle: "Delivered to the targeted visitor",
      rows: [
        row("⚙️", "Action", commandLabel(command)),
        row("🆔", "Session", sessionID, { code: true }),
        row("💬", "On Screen", message || "No message"),
      ],
      footer: "Applies on the visitor's next pulse. Reply again to change it.",
    }),
    parse_mode: "HTML",
  });
}

async function handleTelegramMessage(message, model) {
  if (!isAllowedTelegramId(message.chat.id)) {
    console.warn(`Blocked unauthorized message from: ${message.chat.id}`);
    return;
  }

  const chatId = message.chat.id;
  let inputs = [];

  // EASY FLOW: reply to a visitor notification with text →
  // freeze that exact visitor and show the text on their screen verbatim.
  if (message.reply_to_message && (message.text || "").trim()) {
    const sid = sessionIdFromReply(message.reply_to_message);
    if (sid) {
      await applyToSession(chatId, sid, "FREEZE", message.text.trim());
      return;
    }
  }

  if (message.voice) {
    if (!model) {
      await telegram("sendMessage", {
        chat_id: chatId,
        text: panel({
          title: "TAURUS // VOICE COMMAND OFFLINE",
          subtitle: "Voice processing is not configured",
          rows: [
            row("🔑", "Missing Config", "GEMINI_API_KEY"),
          ],
          footer: "Type the command as text until voice processing is enabled.",
        }),
        parse_mode: "HTML",
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
    const fallback = parseTextCommandFallback(message.text);

    if (!model) {
      if (fallback.command === "UNKNOWN") {
        await telegram("sendMessage", {
          chat_id: chatId,
          text: panel({
            title: "TAURUS // COMMAND NOT RECOGNIZED",
            subtitle: "No visitor-control action was matched",
            rows: [
              row("💬", "Received", message.text),
            ],
            footer: "Try: freeze, clear, alarm, block, or 'ekrana mesaj yaz'.",
          }),
          parse_mode: "HTML",
        });
        return;
      }

      await executeVisitorCommand(chatId, fallback.command, fallback.message);
      return;
    }

    inputs = [`COMMAND TEXT: "${message.text}"`];
  }

  let responseData;
  try {
    responseData = await classifyCommandWithGemini(model, inputs);
  } catch (error) {
    console.error("Gemini command parsing failed:", error);

    if (message.text) {
      responseData = parseTextCommandFallback(message.text);
    } else {
      await telegram("sendMessage", {
        chat_id: chatId,
        text: panel({
          title: "TAURUS // VOICE COMMAND FAILED",
          subtitle: "The voice message could not be understood",
          rows: [
            row("🎙️", "Input", "Voice message"),
          ],
          footer: "Please send a shorter voice note or type the command.",
        }),
        parse_mode: "HTML",
      });
      return;
    }
  }

  if (VALID_COMMANDS.has(responseData.command)) {
    await executeVisitorCommand(chatId, responseData.command, responseData.message);
  } else if (message.text) {
    await telegram("sendMessage", {
      chat_id: chatId,
      text: panel({
        title: "TAURUS // COMMAND NOT RECOGNIZED",
        subtitle: "No visitor-control action was matched",
        rows: [
          row("💬", "Received", message.text),
        ],
        footer: "Try: freeze, clear, alarm, block, or 'ekrana mesaj yaz'.",
      }),
      parse_mode: "HTML",
    });
  }
}

const model = getGeminiModel();

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(200).send("OK");
  }

  if (!isTelegramWebhookAuthorized(req)) {
    console.warn("Blocked webhook request with invalid Telegram secret token.");
    return res.status(401).send("Unauthorized");
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
