/**
 * TAURUS WEBHOOK BRIDGE (Vercel Serverless Version)
 * 
 * Telegram butonlarından gelen istekleri Firebase'e ileten köprü.
 */

const admin = require('firebase-admin');

// Firebase Admin initialization
if (!admin.apps.length) {
    const serviceAccount = {
        "type": "service_account",
        "project_id": "omeryigitler-5abfb",
        "private_key_id": "173ed69424660f200024d81675d65ab8b5c64801",
        "private_key": process.env.FIREBASE_PRIVATE_KEY
            ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
            : "-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQCqBSNaafCJWDjO\nz60CQWqAxTmH7gIqSXaHlSBSUWaBELd4uznWI9DFcKILkxFsyd2aNpZPZWjS6opn\ng2E8lXnr2P0Ho5oRzzsRw5qwe/CmvNEcx4HiHZbnbhIQ6JiP3mX9Q3Ur3MW+TzA3\nhO5HBdyEe6E1LAhDwGFvXRBsi48F33sSLCDrSjPl+VerVi4kbhd1qp7Qfj2eGl6h\nIWYpgcpYtHS++3rHK/u8DZZ47DM6MD4djma8rJgaCcW9r75D3ksPsXfYJkTPw5e5\nUdF79pTMEVjSiCayNdSv4Xmh6psC/UtELR4YKsgtUTDU40qkZorfOWy0pIL9D1WS\nFYPpcpNLAgMBAAECggEABL8G+R+q+NKPJ2rRvBXiaLzYucwxoEeTuP43PEUMdP7n\n+EVVvH4cdl6KD4OoAV7zQjpS4N2GWxj0Cya2QLA1iplwmtV82BFuZzUMLPAQzD7K\nIaEKJatIyqYed/1eQOnm8/Z9n19W39SrFmmuEyp9OO+QlQDpLCcDMU4qRrVwpSvH\nxoycWFozjgjUVQbtogb+e7uTq3IgJFdK1aiNKV+bmgG5KVrv+vF3dPFxw7SWh+ST\nDVbXUF/ULOKF4JOTs6dunPVG209VRYJS6+jw8PPTIozDDTSY0ev0yBhRUFUwXGjd\naJOlv2gLzRU/kWO7zDz95ZrTLMT6kFILdSLXxVUCpQKBgQDYADF9uvRPBhKTEsgG\nM6oXgh5G/ESIY4e5lFMF0gFjLvqezzLhMeMLTM69MWX9nUA0imzTjv1EpeOSPVQd\nlF5KH19dZdihEYe0QjLDMb3VJe66SN0aXFW4/BCcQVnPI4+bzFAhnIDhdeQllusV\nRgEj8YWKa9B+qeLkev4QoxbS1QKBgQDJgSsjOp0hgDTMCECLBDKunvPndoBuAnh0\nFPAf2FajPxbvUqEpugYRMMfzNxpuW12/2CGNsOsRllWHy2+rJdx1lbts/hDUQCUF\nFePRFf2vtvDuKXI7xMzo1MFYbHWNlzGKmuhYVsBUrr5SToJKyCRQ8jglyXiqqJXE\n88mXxZWdnwKBgDPPmA94kLGD22C72I7kRaBt7aVJTYcJmLzC/0ceIIcR9buyJ5os\nxTEos05eUwCKf6QasA/u9IFK6VNispKFzDgrXkyg6V15PvvWBScc/1PpTWIRqDdy\nfn1ouPNCGbC97uyIDZCCYcey5468rJblu9BLVqTlR5WaWnpDpj2HYSohAoGAerdX\ndhT0LLrPbJJ5/C+KTh4vm/7nKBgJE2jM9Bfka3a4mPdRfv/zQfTbUJt2VU7/QR53\nELt17TgIzrJuR2S/ZjzR8AaqaRjHctlp7KPf42seP2yuTQgFYqZvOVKUJK63VRoR\n9fqfFvN0pNt7Ld/FfiaFWz3fZs9UpqVxWCTUgTECgYB60AYRqgfHG7ATIUGb9oyB\nO2D+DgmT3dcgP+Cw4POvr+nWmRtuCswgHWkQcaG0vpclhYbcvcwrP84Rh35yBYmQ\n8fD6ZFxuxoT1mDgMy1ZgzaoMBHmSBor07rnct0DZ8LKHR7ixVG3fmMG4US3aStvy\n5H0sIhu0upGXfh67QPHmvw==\n-----END PRIVATE KEY-----\n",
        "client_email": "firebase-adminsdk-fbsvc@omeryigitler-5abfb.iam.gserviceaccount.com",
    };

    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();
const BOT_TOKEN = "8567285538:AAHKfo8bqee43rprC-GCv3Je423R57YQkCE";

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).send('Method Not Allowed');
    }

    const callbackQuery = req.body.callback_query;

    if (callbackQuery) {
        const data = callbackQuery.data; // e.g., "alarm_sess_abc123"
        const [action, sessionID] = data.split('_');
        const chatId = callbackQuery.message.chat.id;

        try {
            // 1. Update Firestore
            await db.collection('visitors_v1').doc(sessionID).update({
                action: action,
                action_timestamp: admin.firestore.FieldValue.serverTimestamp()
            });

            // 2. Acknowledge Telegram
            const axios = require('axios');
            await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/answerCallbackQuery`, {
                callback_query_id: callbackQuery.id,
                text: `🚀 EMİR ALINDI: ${action.toUpperCase()} - Uygulanıyor...`
            });

            // 3. Confirm to Admin
            await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
                chat_id: chatId,
                text: `✅ <b>KONTROL PANELİ:</b>\n\n👤 <b>Session:</b> <code>${sessionID}</code>\n⚡ <b>Komut:</b> <code>${action}</code>\n🛡️ <b>Durum:</b> Veritabanı Güncellendi.`,
                parse_mode: 'HTML'
            });

            return res.status(200).send('OK');

        } catch (error) {
            console.error("Webhook Error:", error);
            return res.status(500).send('Internal Error');
        }
    }

    res.status(200).send('OK');
};
