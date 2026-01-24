// DEPLOY_TRIGGER: 2026-01-12_08:11
const admin = require('firebase-admin');
const axios = require('axios');
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

// Initialize Firebase (With Fallback Key for Vercel)
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert({
            "project_id": "omeryigitler-5abfb",
            "private_key": process.env.FIREBASE_PRIVATE_KEY
                ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
                : "-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQCqBSNaafCJWDjO\nz60CQWqAxTmH7gIqSXaHlSBSUWaBELd4uznWI9DFcKILkxFsyd2aNpZPZWjS6opn\ng2E8lXnr2P0Ho5oRzzsRw5qwe/CmvNEcx4HiHZbnbhIQ6JiP3mX9Q3Ur3MW+TzA3\nhO5HBdyEe6E1LAhDwGFvXRBsi48F33sSLCDrSjPl+VerVi4kbhd1qp7Qfj2eGl6h\nIWYpgcpYtHS++3rHK/u8DZZ47DM6MD4djma8rJgaCcW9r75D3ksPsXfYJkTPw5e5\nUdF79pTMEVjSiCayNdSv4Xmh6psC/UtELR4YKsgtUTDU40qkZorfOWy0pIL9D1WS\nFYPpcpNLAgMBAAECggEABL8G+R+q+NKPJ2rRvBXiaLzYucwxoEeTuP43PEUMdP7n\n+EVVvH4cdl6KD4OoAV7zQjpS4N2GWxj0Cya2QLA1iplwmtV82BFuZzUMLPAQzD7K\nIaEKJatIyqYed/1eQOnm8/Z9n19W39SrFmmuEyp9OO+QlQDpLCcDMU4qRrVwpSvH\nxoycWFozjgjUVQbtogb+e7uTq3IgJFdK1aiNKV+bmgG5KVrv+vF3dPFxw7SWh+ST\nDVbXUF/ULOKF4JOTs6dunPVG209VRYJS6+jw8PPTIozDDTSY0ev0yBhRUFUwXGjd\naJOlv2gLzRU/kWO7zDz95ZrTLMT6kFILdSLXxVUCpQKBgQDYADF9uvRPBhKTEsgG\nM6oXgh5G/ESIY4e5lFMF0gFjLvqezzLhMeMLTM69MWX9nUA0imzTjv1EpeOSPVQd\nlF5KH19dZdihEYe0QjLDMb3VJe66SN0aXFW4/BCcQVnPI4+bzFAhnIDhdeQllusV\nRgEj8YWKa9B+qeLkev4QoxbS1QKBgQDJgSsjOp0hgDTMCECLBDKunvPndoBuAnh0\nFPAf2FajPxbvUqEpugYRMMfzNxpuW12/2CGNsOsRllWHy2+rJdx1lbts/hDUQCUF\nFePRFf2vtvDuKXI7xMzo1MFYbHWNlzGKmuhYVsBUrr5SToJKyCRQ8jglyXiqqJXE\n88mXxZWdnwKBgDPPmA94kLGD22C72I7kRaBt7aVJTYcJmLzC/0ceIIcR9buyJ5os\nxTEos05eUwCKf6QasA/u9IFK6VNispKFzDgrXkyg6V15PvvWBScc/1PpTWIRqDdy\nfn1ouPNCGbC97uyIDZCCYcey5468rJblu9BLVqTlR5WaWnpDpj2HYSohAoGAerdX\ndhT0LLrPbJJ5/C+KTh4vm/7nKBgJE2jM9Bfka3a4mPdRfv/zQfTbUJt2VU7/QR53\nELt17TgIzrJuR2S/ZjzR8AaqaRjHctlp7KPf42seP2yuTQgFYqZvOVKUJK63VRoR\n9fqfFvN0pNt7Ld/FfiaFWz3fZs9UpqVxWCTUgTECgYB60AYRqgfHG7ATIUGb9oyB\nO2D+DgmT3dcgP+Cw4POvr+nWmRtuCswgHWkQcaG0vpclhYbcvcwrP84Rh35yBYmQ\n8fD6ZFxuxoT1mDgMy1ZgzaoMBHmSBor07rnct0DZ8LKHR7ixVG3fmMG4US3aStvy\n5H0sIhu0upGXfh67QPHmvw==\n-----END PRIVATE KEY-----\n",
            "client_email": "firebase-adminsdk-fbsvc@omeryigitler-5abfb.iam.gserviceaccount.com"
        })
    });
}

const db = admin.firestore();
const BOT_TOKEN = "8567285538:AAHKfo8bqee43rprC-GCv3Je423R57YQkCE";

module.exports = async (req, res) => {
    // 1. Immediately return 200 OK to Telegram if this is not a POST
    if (req.method !== 'POST') return res.status(200).send('OK');

    const callbackQuery = req.body.callback_query;
    if (callbackQuery) {
        const data = callbackQuery.data;
        const chatId = callbackQuery.message.chat.id;

        // --- AUTHENTICATION HANDLER ---
        if (data.startsWith('auth_')) {
            // Format: auth_REQID_CODE (e.g., auth_abc123_84)
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
                        text: "Expired Request yw"
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
                // 1. Answer Callback (Stop Loading Spinner)
                await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/answerCallbackQuery`, {
                    callback_query_id: callbackQuery.id,
                    text: `Command Received: ${action.toUpperCase()}`
                });

                // 2. Update Firestore (Use SET to prevent "Document Not Found" race condition)
                await db.collection('visitors_v1').doc(sessionID).set({
                    action: action,
                    action_timestamp: admin.firestore.FieldValue.serverTimestamp()
                }, { merge: true });

                // 3. Send Confirmation Message (CLEAN - No IDs)
                // Notification removed as per user request (redundant)
            } catch (error) {
                console.error("Tracker Webhook Error:", error);
            }
        }
    }

    // --- INTELLIGENT COMMAND HANDLER (Voice & Text) ---
    const message = req.body.message;
    if (message && (message.voice || message.text)) {
        // SECURITY: Quota Protection (Allowlist)
        // User ID: 6886010817 (Ömer Yiğitler)
        const ALLOWED_IDS = [6886010817];

        if (!ALLOWED_IDS.includes(message.chat.id)) {
            console.warn(`⛔ Blocked unauthorized attempt from: ${message.chat.id}`);
            return res.status(200).send('OK');
        }

        try {
            const chatId = message.chat.id;
            let inputs = [];

            // Case A: Voice Note
            if (message.voice) {
                const fileId = message.voice.file_id;
                const fileRes = await axios.get(`https://api.telegram.org/bot${BOT_TOKEN}/getFile?file_id=${fileId}`);
                const filePath = fileRes.data.result.file_path;
                const fileUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${filePath}`;
                const audioRes = await axios.get(fileUrl, { responseType: 'arraybuffer' });
                const base64Audio = Buffer.from(audioRes.data).toString('base64');

                inputs = [
                    { inlineData: { data: base64Audio, mimeType: "audio/ogg" } }
                ];
            }
            // Case B: Text Message
            else if (message.text) {
                inputs = [
                    `COMMAND TEXT: "${message.text}"`
                ];
            }

            // 3. Send to Gemini (Use Standard Stable Model)
            // "gemini-2.5" might be hallucinated or beta. Using 1.5-flash for speed/reliability.
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

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

            // 4. Execute Command
            if (['FREEZE', 'CLEAR', 'ALARM', 'BLOCK'].includes(command)) {
                // Find most recent active session
                const snapshot = await db.collection('visitors_v1')
                    .orderBy('startTime', 'desc')
                    .limit(1)
                    .get();

                if (!snapshot.empty) {
                    const sessionDoc = snapshot.docs[0];
                    const action = command.toLowerCase();

                    // Update Firestore
                    await sessionDoc.ref.set({
                        action: action,
                        message: messageContent,
                        action_timestamp: admin.firestore.FieldValue.serverTimestamp()
                    }, { merge: true });

                    // Reply success
                    await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
                        chat_id: chatId,
                        text: `🤖 <b>Command Executed:</b> ${command} \n📝 ${messageContent || 'No message'}`,
                        parse_mode: 'HTML'
                    });
                } else {
                    await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
                        chat_id: chatId,
                        text: `⚠️ No active sessions found to control.`
                    });
                }
            } else {
                // Only reply if it was a direct text match attempt, otherwise silent
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
