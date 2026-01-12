const admin = require('firebase-admin');
const axios = require('axios');

// Initialize Firebase (Using the project's standard fallback)
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
const CHAT_ID = "6886010817";

module.exports = async (req, res) => {
    if (req.method !== 'POST') return res.status(200).send('OK');

    let { sessionID, ipData, device, browser, pathname } = req.body;

    if (!sessionID) return res.status(400).send('Missing Session ID');

    try {
        // 1. Server-side IP Detection (Reliable fallback for office networks)
        const clientIP = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket.remoteAddress;

        // 2. Fetch Geo-data on server if frontend failed or to verify
        if (!ipData || !ipData.city || ipData.ip === '0.0.0.0') {
            try {
                const geoRes = await axios.get(`https://ipapi.co/${clientIP}/json/`);
                ipData = geoRes.data;
            } catch (e) {
                console.warn("Server-side Geo Fetch Failed:", e.message);
                ipData = ipData || { ip: clientIP };
            }
        }

        const sessionData = {
            sessionID,
            ip: clientIP,
            city: ipData.city || 'Unknown',
            country: ipData.country_name || 'Unknown',
            org: ipData.org || 'Unknown',
            device: device || 'Unknown',
            browser: browser || 'Unknown',
            startTime: new Date().toISOString(),
            status: 'online',
            last_seen: admin.firestore.FieldValue.serverTimestamp(),
            history: [
                { time: new Date().toLocaleTimeString('tr-TR'), action: 'Entrance', detail: pathname || 'Unknown' }
            ]
        };

        // 3. Initialize/Update Firestore Document
        await db.collection('visitors_v1').doc(sessionID).set(sessionData, { merge: true });

        // 4. Send Telegram Notification (Neural Link Established - Per Final Guide)
        const telegramMsg = `🎯 <b>Neural Link Established</b>\n\n` +
            `🆔 <b>ID:</b> <code>${sessionID}</code>\n` +
            `🌍 <b>Loc:</b> ${sessionData.city}, ${sessionData.country}\n` +
            `📡 <b>IP:</b> <code>${sessionData.ip}</code>\n` +
            `🏢 <b>ISP:</b> ${sessionData.org}\n` +
            `💻 <b>Sys:</b> ${sessionData.device}`;

        const buttons = {
            inline_keyboard: [
                [
                    { text: "🚨 ALARM", callback_data: `alarm_${sessionID}` },
                    { text: "⛔ BLOCK", callback_data: `block_${sessionID}` }
                ],
                [
                    { text: "🟢 CLEAR", callback_data: `clear_${sessionID}` }
                ]
            ]
        };

        await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
            chat_id: CHAT_ID,
            text: telegramMsg,
            parse_mode: 'HTML',
            reply_markup: buttons
        });

        return res.status(200).json({ success: true });
    } catch (error) {
        console.error("Tracker API Error:", error);
        return res.status(500).json({ error: error.message });
    }
};
