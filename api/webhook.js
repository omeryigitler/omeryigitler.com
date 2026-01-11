const admin = require('firebase-admin');
const axios = require('axios');
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-001" });

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
                        await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
                            chat_id: chatId,
                            text: "🔓 <b>Gateway Unlocked</b>",
                            parse_mode: 'HTML'
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

    // --- VOICE COMMAND HANDLER (Gemini AI) ---
    const message = req.body.message;
    if (message && message.voice) {
        try {
            const chatId = message.chat.id;
            const fileId = message.voice.file_id;

            // 1. Get File Path
            const fileRes = await axios.get(`https://api.telegram.org/bot${BOT_TOKEN}/getFile?file_id=${fileId}`);
            const filePath = fileRes.data.result.file_path;
            const fileUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${filePath}`;

            // 2. Download Audio
            const audioRes = await axios.get(fileUrl, { responseType: 'arraybuffer' });
            const base64Audio = Buffer.from(audioRes.data).toString('base64');

            // 3. Send to Gemini
            const prompt = "Listen to this audio. Return ONLY one of these keywords based on the intent: 'FREEZE' (for stop, dur, dondur, kapat), 'CLEAR' (for start, aç, devam, temizle), 'ALARM' (for alarm, tespit), 'BLOCK' (for block, engelle). If unclear, return 'UNKNOWN'.";

            const result = await model.generateContent([
                prompt,
                { inlineData: { data: base64Audio, mimeType: "audio/ogg" } }
            ]);

            const command = result.response.text().trim().toUpperCase();

            // 4. Execute Command
            if (['FREEZE', 'CLEAR', 'ALARM', 'BLOCK'].includes(command)) {
                // Find most recent active session to apply command
                const snapshot = await db.collection('visitors_v1')
                    .orderBy('action_timestamp', 'desc')
                    .limit(1)
                    .get();

                if (!snapshot.empty) {
                    const sessionDoc = snapshot.docs[0];
                    const sessionID = sessionDoc.id;
                    const action = command.toLowerCase();

                    // Update Firestore
                    await sessionDoc.ref.set({
                        action: action,
                        action_timestamp: admin.firestore.FieldValue.serverTimestamp()
                    }, { merge: true });

                    // Reply to User
                    await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
                        chat_id: chatId,
                        text: `🎤 <b>Voice Command:</b> ${command} \n✅ Applied to active session.`,
                        parse_mode: 'HTML'
                    });
                }
            } else {
                await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
                    chat_id: chatId,
                    text: `❓ Could not understand command (${command}).`,
                });
            }

        } catch (error) {
            console.error("Voice Handler Error:", error);
            try {
                await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
                    chat_id: message.chat.id,
                    text: `⚠️ Voice Error: ${error.message}`,
                });
            } catch (e) { }
        }
    }

    return res.status(200).send('OK');
};
