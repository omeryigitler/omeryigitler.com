/**
 * TAURUS WEBHOOK BRIDGE (Node.js / Express)
 * 
 * Bu dosya, Telegram'daki butonlara basıldığında Firebase'i güncelleyen aracı sunucu kodudur.
 * Vercel, Render veya kendi sunucunuzda çalıştırabilirsiniz.
 */

const express = require('express');
const axios = require('axios');
const admin = require('firebase-admin');

// Firebase Admin Setup (Kendi JSON dosyanızın yolunu verin)
// const serviceAccount = require("./serviceAccountKey.json");
// admin.initializeApp({
//   credential: admin.credential.cert(serviceAccount)
// });

const db = admin.firestore();
const app = express();
app.use(express.json());

const BOT_TOKEN = "8567285538:AAHKfo8bqee43rprC-GCv3Je423R57YQkCE";

app.post('/webhook', async (req, res) => {
    const callbackQuery = req.body.callback_query;

    if (callbackQuery) {
        const data = callbackQuery.data; // Örn: "alarm_SESSION_ID"
        const [action, sessionID] = data.split('_');
        const chatId = callbackQuery.message.chat.id;

        try {
            // Firebase'i Güncelle
            await db.collection('visitors_v1').doc(sessionID).update({
                action: action,
                action_timestamp: admin.firestore.FieldValue.serverTimestamp()
            });

            // Telegram'a Başarılı Yanıtı Döndür
            await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/answerCallbackQuery`, {
                callback_query_id: callbackQuery.id,
                text: `${action.toUpperCase()} Komutu başarıyla gönderildi! 🚀`
            });

            // Mesajın altına onay işareti ekle
            await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
                chat_id: chatId,
                text: `✅ <b>ONAY:</b> ${sessionID} için <b>${action}</b> emri uygulandı.`,
                parse_mode: 'HTML'
            });

        } catch (error) {
            console.error("Webhook Error:", error);
        }
    }

    res.sendStatus(200);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Webhook Bridge listening on port ${PORT}`));
