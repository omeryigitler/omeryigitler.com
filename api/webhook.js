// DEPLOY_TRIGGER: 2026-01-12_08:11
const admin = require('firebase-admin');
const axios = require('axios');
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

// Initialize Firebase
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert({
            "project_id": "omeryigitler-5abfb",
            "private_key": process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
            "client_email": "firebase-adminsdk-fbsvc@omeryigitler-5abfb.iam.gserviceaccount.com"
        })
    });
}

const db = admin.firestore();
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

module.exports = async (req, res) => {
    if (req.method !== 'POST') return res.status(200).send('OK');

    const callbackQuery = req.body.callback_query;
    if (callbackQuery) {
        const data = callbackQuery.data;
        const chatId = callbackQuery.message.chat.id;

        // --- AUTHENTICATION HANDLER ---
        if (data.startsWith('auth_')) {
            const parts = data.split('_');
            const reqId = parts[1];
            const code = parseInt(parts[2]);

            try {
                const docRef = db.collection('auth_requests').doc(reqId);
                const doc = await docRef.get();

                if (doc.exists && doc.data().status === 'pending') {
                    const expectedCode = doc.data().expectedCode;

                    if (code === expectedCode) {
                        await docRef.update({ status: 'approved' });
                        await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/answerCallbackQuery`, {
                            callback_query_id: callbackQuery.id,
                            text: "Access Granted ✅"
                        });
                    } else {
                        await docRef.update({ status: 'denied', attempts: admin.firestore.FieldValue.increment(1) });
                        await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/answerCallbackQuery`, {
                            callback_query_id: callbackQuery.id,
                            text: "Wrong Code ⛔"
                        });
                    }
                } else {
                    await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/answerCallbackQuery`, {
                        callback_query_id: callbackQuery.id,
                        text: "Expired Request ⚠️"
                    });
                }
            } catch (e) { console.error("Auth Error", e); }

            return res.status(200).send('OK');
        }

        // --- TRACKER LOGIC (Alarm, Block, etc.) ---
        const firstUnderscore = data.indexOf('_');
        if (firstUnderscore !== -1) {
            const action = data.substring(0, firstUnderscore);
            const sessionID = data.substring(firstUnderscore + 1);

            try {
                await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/answerCallbackQuery`, {
                    callback_query_id: callbackQuery.id,
                    text: `Command Received: ${action.toUpperCase()}`
                });

                await db.collection('visitors_v1').doc(sessionID).set({
                    action: action,
                    action_timestamp: admin.firestore.FieldValue.serverTimestamp()
                }, { merge: true });

            } catch (error) {
                console.error("Tracker Webhook Error:", error);
            }
        }
    }

    // --- INTELLIGENT COMMAND HANDLER (Voice & Text) ---
    const message = req.body.message;
    if (message && (message.voice || message.text)) {
        const ALLOWED_IDS = [6886010817];

        if (!ALLOWED_IDS.includes(message.chat.id)) {
            console.warn(`⛔ Blocked unauthorized attempt from: ${message.chat.id}`);
            return res.status(200).send('OK');
        }

        try {
            const chatId = message.chat.id;
            let inputs = [];

            if (message.voice) {
                const fileId = message.voice.file_id;
                const fileRes = await axios.get(`https://api.telegram.org/bot${BOT_TOKEN}/getFile?file_id=${fileId}`);
                const filePath = fileRes.data.result.file_path;
                const fileUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${filePath}`;
                const audioRes = await axios.get(fileUrl, { responseType: 'arraybuffer' });
                const base64Audio = Buffer.from(audioRes.data).toString('base64');
                inputs = [{ inlineData: { data: base64Audio, mimeType: "audio/ogg" } }];
            } else if (message.text) {
                inputs = [`COMMAND TEXT: "${message.text}"`];
            }

            const prompt = `
            Analyze the intent of the user's command (Audio or Text). 
            Return ONLY raw JSON. No markdown formatting.
            
            Schema: { "command": "FREEZE" | "CLEAR" | "ALARM" | "BLOCK" | "UNKNOWN", "message": string | null }
            
            Rules:
            1. "Durdur", "Kapat", "Freeze", "Stop", "Don" -> { "command": "FREEZE", "message": null }
            2. "Durdur ve [X] yaz", "Ekrana [X] yaz", "Mesaj: [X]" -> { "command": "FREEZE", "message": "[X]" }
            3. "Temizle", "Aç", "Devam et", "Clear", "İptal" -> { "command": "CLEAR", "message": null }
            4. "Alarm" -> ALARM, "Engelle" -> BLOCK.
            5. If unknown -> UNKNOWN.
            `;

            const result = await model.generateContent([prompt, ...inputs]);
            const responseText = result.response.text().replace(/```json|```/g, '').trim();
            const responseData = JSON.parse(responseText);

            const command = responseData.command.toUpperCase();
            const messageContent = responseData.message;

            if (['FREEZE', 'CLEAR', 'ALARM', 'BLOCK'].includes(command)) {
                const snapshot = await db.collection('visitors_v1')
                    .orderBy('startTime', 'desc')
                    .limit(1)
                    .get();

                if (!snapshot.empty) {
                    const sessionDoc = snapshot.docs[0];

                    await sessionDoc.ref.set({
                        action: command.toLowerCase(),
                        message: messageContent,
                        action_timestamp: admin.firestore.FieldValue.serverTimestamp()
                    }, { merge: true });

                    await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
                        chat_id: chatId,
                        text: `🤖 <b>Command Executed:</b> ${command}\n📝 ${messageContent || 'No message'}`,
                        parse_mode: 'HTML'
                    });
                } else {
                    await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
                        chat_id: chatId,
                        text: `⚠️ No active sessions found to control.`
                    });
                }
            } else {
                if (message.text) {
                    await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
                        chat_id: chatId,
                        text: `❓ Unknown command: "${message.text}"`
                    });
                }
            }

        } catch (error) {
            console.error("Handler Error:", error);
            await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
                chat_id: message.chat.id,
                text: `⚠️ System Error: ${error.message}`
            });
        }
    }

    return res.status(200).send('OK');
};
