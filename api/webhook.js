// DEPLOY_TRIGGER: 2026-04-25_gemini_command_hardening
const crypto = require("node:crypto");
const axios = require("axios");
const { GoogleGenerativeAI, SchemaType } = require("@google/generative-ai");
const { admin, db } = require("./_firebaseAdmin");
const { agentApprovalKeyboard, panel, row } = require("./telegramFormat");
const {
  decideApproval,
  handleCommand,
  requestVisitorCommand
} = require("../lib/agent");
const {
  cleanAgentText,
  cleanScreenMessage,
  parseVisitorCommand
} = require("../lib/visitor-command");

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const VALID_COMMANDS = new Set(["FREEZE", "CLEAR", "ALARM", "BLOCK"]);
const TELEGRAM_TIMEOUT_MS = 8000;
const MAX_VOICE_BYTES = 10 * 1024 * 1024;
const COMMAND_RESPONSE_SCHEMA = {
  type: SchemaType.OBJECT,
  properties: {
    command: {
      type: SchemaType.STRING,
      enum: ["FREEZE", "CLEAR", "ALARM", "BLOCK", "AGENT", "UNKNOWN"],
      description: "The normalized visitor-control command, AGENT for supported operational requests, or UNKNOWN.",
    },
    message: {
      type: SchemaType.STRING,
      description: "Text to show on the visitor screen. Return an empty string when no screen message is requested.",
    },
    agent_text: {
      type: SchemaType.STRING,
      description: "For AGENT, transcribe the operational request. Otherwise return an empty string.",
    },
  },
  required: ["command", "message", "agent_text"],
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
  const providedSecret = req.headers["x-telegram-bot-api-secret-token"];
  if (!expectedSecret || !providedSecret) return false;
  const expected = Buffer.from(String(expectedSecret));
  const provided = Buffer.from(String(providedSecret));
  return expected.length === provided.length && crypto.timingSafeEqual(expected, provided);
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
  const response = await axios.post(url, payload, { timeout: TELEGRAM_TIMEOUT_MS });
  return response.data;
}

async function answerCallback(callbackQuery, text) {
  try {
    await telegram("answerCallbackQuery", {
      callback_query_id: callbackQuery.id,
      text,
    });
  } catch (error) {
    console.error("Callback answer failed", { code: error?.code || "telegram_error" });
  }
}

function telegramActor(chatId) {
  return { id: `telegram:${chatId}`, source: "telegram", role: "admin" };
}

async function sendAgentResult(chatId, result) {
  const waitingApproval = result.status === "waiting_approval" && result.approvalId;
  const summary = typeof result.summary === "string"
    ? result.summary
    : result.summary?.summary || result.message || "Agent işlemi tamamlandı.";
  const data = result.data ? JSON.stringify(result.data).slice(0, 1200) : null;
  await telegram("sendMessage", {
    chat_id: chatId,
    text: panel({
      title: waitingApproval ? "AGENT // APPROVAL REQUIRED" : "AGENT // RESULT",
      subtitle: waitingApproval ? "No write has been executed" : "Operational command completed",
      rows: [
        row("⚙️", "Status", result.status || "completed"),
        row("🧠", "Summary", summary),
        data ? row("📋", "Data", data) : null,
        waitingApproval ? row("🆔", "Approval", result.approvalId, { code: true }) : null,
      ].filter(Boolean),
      footer: waitingApproval ? "Approve or reject explicitly below." : "All tool calls were written to the Agent audit log.",
    }),
    parse_mode: "HTML",
    ...(waitingApproval ? { reply_markup: agentApprovalKeyboard(result.approvalId) } : {}),
  });
}

async function queueVisitorApproval(chatId, command, message, sessionId, text) {
  const result = await requestVisitorCommand({
    sessionId,
    command,
    message,
    text,
    actor: telegramActor(chatId),
    source: "telegram",
  });
  await sendAgentResult(chatId, result);
  return result;
}

function normalizeGeminiCommand(responseData) {
  const command = String(responseData?.command || "UNKNOWN").trim().toUpperCase();
  const normalizedCommand = VALID_COMMANDS.has(command) || command === "AGENT" ? command : "UNKNOWN";
  const message = cleanScreenMessage(responseData?.message || "");

  return {
    command: normalizedCommand,
    message,
    agentText: cleanAgentText(responseData?.agent_text || ""),
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
- AGENT: operational requests such as summarizing leads/messages, listing active projects or recent visitors, and preparing the latest-message proposal.
- UNKNOWN: use this if the intent is not one of the commands above.

Screen message rule:
- If the admin says "ekrana [text] yaz", "ziyaretçiye [text] göster", "mesaj: [text]", "durdur ve [text] yaz", or similar, return FREEZE and put only the clean screen text in message.
- Do not include command words such as "ekrana", "yaz", "göster", "durdur" inside message.
- If there is no explicit screen text, message must be an empty string.
- Keep message under 180 characters.
- For AGENT, put a concise transcription of the complete request in agent_text and leave message empty.
- For visitor-control commands and UNKNOWN, agent_text must be an empty string.

Examples:
"Durdur" -> {"command":"FREEZE","message":"","agent_text":""}
"Ekrana bakımdayız yaz" -> {"command":"FREEZE","message":"bakımdayız","agent_text":""}
"Temizle" -> {"command":"CLEAR","message":"","agent_text":""}
"Engelle" -> {"command":"BLOCK","message":"","agent_text":""}
"Alarm ver" -> {"command":"ALARM","message":"","agent_text":""}
"Bugünkü mesajları özetle" -> {"command":"AGENT","message":"","agent_text":"Bugünkü mesajları özetle"}
"Aktif projeleri listele" -> {"command":"AGENT","message":"","agent_text":"Aktif projeleri listele"}
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

async function handleAgentApprovalCallback(callbackQuery) {
  const fromId = callbackQuery.from?.id || callbackQuery.message?.chat?.id;
  if (!isAllowedTelegramId(fromId)) {
    await answerCallback(callbackQuery, "Unauthorized");
    return;
  }

  const match = /^agent(approve|reject)_([A-Za-z0-9_-]{1,128})$/.exec(callbackQuery.data || "");
  if (!match) {
    await answerCallback(callbackQuery, "Invalid approval");
    return;
  }

  const decision = match[1] === "approve" ? "approve" : "reject";
  try {
    const result = await decideApproval({
      approvalId: match[2],
      decision,
      actor: telegramActor(fromId),
    });
    await answerCallback(callbackQuery, result.status === "approved" ? "Approved" : "Rejected");
    await sendAgentResult(fromId, {
      ...result,
      summary: result.status === "approved" ? "Onaylanan Agent işlemi uygulandı." : "Agent işlemi reddedildi.",
      data: result.result || null,
    });
  } catch (error) {
    await answerCallback(callbackQuery, error.message?.slice(0, 120) || "Approval failed");
  }
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

  if (!VALID_COMMANDS.has(action.toUpperCase())) {
    await answerCallback(callbackQuery, "Unsupported action");
    return;
  }

  await queueVisitorApproval(fromId, action, null, sessionID, `${action.toUpperCase()} ${sessionID}`);
  await answerCallback(callbackQuery, `Approval requested: ${action.toUpperCase()}`);
}

async function executeVisitorCommand(chatId, command, messageContent) {
  await queueVisitorApproval(chatId, command, messageContent, null, `${command} latest visitor`);
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
  await queueVisitorApproval(chatId, command, message, sessionID, `${command} ${sessionID}`);
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
      `https://api.telegram.org/bot${BOT_TOKEN}/getFile?file_id=${fileId}`,
      { timeout: TELEGRAM_TIMEOUT_MS }
    );
    const filePath = fileRes.data?.result?.file_path;

    if (!filePath) {
      throw new Error("Telegram voice file path not found");
    }

    const fileUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${filePath}`;
    const audioRes = await axios.get(fileUrl, {
      responseType: "arraybuffer",
      timeout: TELEGRAM_TIMEOUT_MS,
      maxContentLength: MAX_VOICE_BYTES,
      maxBodyLength: MAX_VOICE_BYTES,
    });
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
    const fallback = parseVisitorCommand(message.text);

    if (fallback.command !== "UNKNOWN") {
      await executeVisitorCommand(chatId, fallback.command, fallback.message);
      return;
    }

    try {
      const result = await handleCommand({
        text: message.text,
        actor: telegramActor(chatId),
        source: "telegram",
      });
      await sendAgentResult(chatId, result);
      return;
    } catch (error) {
      if (error.code !== "unsupported_command") {
        await telegram("sendMessage", {
          chat_id: chatId,
          text: panel({
            title: "AGENT // COMMAND FAILED",
            subtitle: "The operation could not be completed",
            rows: [row("⚠️", "Error", error.message || "Unknown error")],
            footer: "The failure was recorded in the Agent audit log when execution had started.",
          }),
          parse_mode: "HTML",
        });
        return;
      }
    }

    if (!model) {
      await telegram("sendMessage", {
        chat_id: chatId,
        text: panel({
          title: "AGENT // COMMAND NOT RECOGNIZED",
          subtitle: "No supported operational intent was matched",
          rows: [row("💬", "Received", message.text)],
          footer: "Try lead/message summaries, active projects, recent visitors, proposal draft, freeze, clear, alarm or block.",
        }),
        parse_mode: "HTML",
      });
      return;
    }

    inputs = [`COMMAND TEXT: "${message.text}"`];
  }

  let responseData;
  try {
    responseData = await classifyCommandWithGemini(model, inputs);
  } catch (error) {
    console.error("Gemini command parsing failed", { code: error?.code || "gemini_error" });

    if (message.text) {
      responseData = parseVisitorCommand(message.text);
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
  } else if (responseData.command === "AGENT" && responseData.agentText) {
    try {
      const result = await handleCommand({
        text: responseData.agentText,
        actor: telegramActor(chatId),
        source: "telegram",
      });
      await sendAgentResult(chatId, result);
    } catch (error) {
      await telegram("sendMessage", {
        chat_id: chatId,
        text: panel({
          title: "AGENT // VOICE COMMAND FAILED",
          subtitle: "The transcribed request is not supported or could not run",
          rows: [row("⚠️", "Error", error.message || "Unknown error")],
          footer: "Try a shorter request using one supported capability.",
        }),
        parse_mode: "HTML",
      });
    }
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

    if (/^agent(?:approve|reject)_/.test(callbackQuery?.data || "")) {
      await handleAgentApprovalCallback(callbackQuery);
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
    console.error("Webhook request failed", { code: error?.code || "webhook_error" });
    return res.status(200).send("OK");
  }
};
