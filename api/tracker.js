const admin = require('firebase-admin');
const axios = require('axios');

// ─── Firebase Init ───────────────────────────────────────────────────────────
if (!admin.apps.length) {
    const privateKey    = process.env.FIREBASE_PRIVATE_KEY;
    const clientEmail   = process.env.FIREBASE_CLIENT_EMAIL;
    const projectId     = process.env.FIREBASE_PROJECT_ID;

    if (!privateKey || !clientEmail || !projectId) {
        throw new Error(
            'Missing Firebase env vars: FIREBASE_PRIVATE_KEY, FIREBASE_CLIENT_EMAIL, FIREBASE_PROJECT_ID'
        );
    }

    admin.initializeApp({
        credential: admin.credential.cert({
            projectId,
            privateKey:  privateKey.replace(/\\n/g, '\n'),
            clientEmail
        })
    });
}

const db = admin.firestore();

// ─── Config ──────────────────────────────────────────────────────────────────
const BOT_TOKEN    = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID      = process.env.TELEGRAM_CHAT_ID;
const TRACKER_KEY  = process.env.TRACKER_SECRET_KEY; // secret header for endpoint protection

if (!BOT_TOKEN || !CHAT_ID) {
    throw new Error('Missing Telegram env vars: TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID');
}

const SEPARATOR = '━━━━━━━━━━━━━━━━━━━━━';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Escapes HTML special characters to prevent Telegram HTML injection. */
function escapeHtml(str = '') {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

/**
 * Normalizes the device field regardless of whether it arrives
 * as a plain string or as an object with { model, os } properties.
 */
function normalizeDevice(device) {
    if (!device) return { model: 'Unknown', os: 'N/A' };
    if (typeof device === 'string') return { model: device || 'Unknown', os: 'N/A' };
    if (typeof device === 'object') return { model: device.model || 'Unknown', os: device.os || 'N/A' };
    return { model: 'Unknown', os: 'N/A' };
}

/**
 * Determines whether the ipData received from the frontend is usable.
 * Returns false if it's missing, empty, or contains placeholder values.
 */
function isValidIpData(ipData) {
    if (!ipData || typeof ipData !== 'object') return false;
    if (!ipData.city || !ipData.country_name) return false;
    if (ipData.ip === '0.0.0.0' || ipData.ip === '127.0.0.1') return false;
    return true;
}

/**
 * Normalizes IPv6-mapped IPv4 addresses (e.g. ::ffff:127.0.0.1 → 127.0.0.1)
 * and detects private/loopback IPs to skip unnecessary geo API calls.
 */
function normalizeIP(ip = '') {
    const cleaned = ip.replace(/^::ffff:/, '');
    const isPrivate = /^(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|127\.|::1$)/.test(cleaned);
    return { ip: cleaned, isPrivate };
}

/**
 * Fetches geo-location data from ipapi.co for a given IP address.
 * Skips the call for private/loopback IPs.
 */
async function fetchGeoData(ip) {
    const { ip: cleanIP, isPrivate } = normalizeIP(ip);
    if (isPrivate) return { ip: cleanIP };
    try {
        const { data } = await axios.get(`https://ipapi.co/${cleanIP}/json/`, { timeout: 5000 });
        return data;
    } catch (err) {
        console.warn('Server-side Geo Fetch Failed:', err.message);
        return { ip: cleanIP };
    }
}

/**
 * Generates a short 8-character hash from a string.
 * Used for Telegram callback_data which has a 64-byte limit.
 */
function shortHash(str = '') {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = (Math.imul(31, hash) + str.charCodeAt(i)) | 0;
    }
    return Math.abs(hash).toString(36).substring(0, 8);
}

// ─── Handler ─────────────────────────────────────────────────────────────────
module.exports = async (req, res) => {
    // 1. Method check
    if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

    // 2. Secret key check (only enforced if TRACKER_SECRET_KEY is set in env)
    if (TRACKER_KEY) {
        const incomingKey = req.headers['x-tracker-key'];
        if (incomingKey !== TRACKER_KEY) {
            return res.status(401).send('Unauthorized');
        }
    }

    const { sessionID, ipData: rawIpData, device: rawDevice, browser, pathname } = req.body;

    if (!sessionID) return res.status(400).send('Missing Session ID');

    try {
        // 3. Resolve and normalize client IP
        const rawIP = req.headers['x-forwarded-for']?.split(',')[0].trim()
            || req.socket?.remoteAddress
            || 'Unknown';
        const { ip: clientIP } = normalizeIP(rawIP);

        // 4. Resolve geo data — server-side fetch is authoritative
        const ipData = isValidIpData(rawIpData)
            ? rawIpData
            : await fetchGeoData(clientIP);

        // 5. Normalize device info
        const device = normalizeDevice(rawDevice);

        // 6. Build session document
        //    - Timestamps stored as Firestore serverTimestamp for consistent querying
        //    - history uses arrayUnion to append entries without overwriting previous ones
        const sessionBase = {
            sessionID,
            ip:        clientIP,
            city:      ipData.city         || 'Unknown',
            country:   ipData.country_name || 'Unknown',
            org:       ipData.org          || 'Unknown',
            device,
            browser:   browser || 'Unknown',
            startTime: admin.firestore.FieldValue.serverTimestamp(),
            status:    'online',
            last_seen: admin.firestore.FieldValue.serverTimestamp(),
        };

        const historyEntry = admin.firestore.FieldValue.arrayUnion({
            time:   new Date().toISOString(),
            action: 'Entrance',
            detail: pathname || 'Unknown'
        });

        await db.collection('visitors_v1').doc(sessionID).set(
            { ...sessionBase, history: historyEntry },
            { merge: true }
        );

        // 7. Send Telegram notification
        //    - All user-supplied fields are HTML-escaped to prevent injection
        //    - callback_data uses a short hash to stay within Telegram's 64-byte limit
        const cbHash = shortHash(sessionID);

        const telegramMsg =
            `🎯 <b>Neural Link Established</b>\n` +
            `${SEPARATOR}\n` +
            `🆔 <b>SESSION:</b> <code>${escapeHtml(sessionID)}</code>\n` +
            `🌍 <b>LOCATION:</b> ${escapeHtml(sessionBase.city)}, ${escapeHtml(sessionBase.country)}\n` +
            `📡 <b>IP:</b> <code>${escapeHtml(clientIP)}</code>\n` +
            `🏢 <b>ISP:</b> ${escapeHtml(sessionBase.org)}\n` +
            `💻 <b>DEVICE:</b> ${escapeHtml(device.model)} (${escapeHtml(device.os)})\n` +
            `🌐 <b>BROWSER:</b> ${escapeHtml(sessionBase.browser)}\n` +
            `${SEPARATOR}`;

        const replyMarkup = {
            inline_keyboard: [
                [
                    { text: '🚨 ALARM', callback_data: `alarm_${cbHash}` },
                    { text: '⛔ BLOCK', callback_data: `block_${cbHash}` }
                ],
                [
                    { text: '🟢 CLEAR', callback_data: `clear_${cbHash}` }
                ]
            ]
        };

        try {
            await axios.post(
                `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
                { chat_id: CHAT_ID, text: telegramMsg, parse_mode: 'HTML', reply_markup: replyMarkup },
                { timeout: 5000 }
            );
        } catch (telegramErr) {
            // Telegram failure should not fail the whole request — Firestore save was successful
            console.error('Telegram Notification Failed:', telegramErr.message);
            return res.status(200).json({ success: true, telegramSent: false });
        }

        return res.status(200).json({ success: true, telegramSent: true });

    } catch (error) {
        console.error('Tracker API Error:', error);
        return res.status(500).json({ error: error.message });
    }
};
