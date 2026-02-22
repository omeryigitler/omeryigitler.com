const admin  = require('firebase-admin');
const axios  = require('axios');
const crypto = require('crypto');

// ─── Firebase Init ───────────────────────────────────────────────────────────
if (!admin.apps.length) {
    const privateKey  = process.env.FIREBASE_PRIVATE_KEY;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const projectId   = process.env.FIREBASE_PROJECT_ID;

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
const BOT_TOKEN   = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID     = process.env.TELEGRAM_CHAT_ID;
const TRACKER_KEY = process.env.TRACKER_SECRET_KEY;

if (!BOT_TOKEN || !CHAT_ID) {
    throw new Error('Missing Telegram env vars: TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID');
}

const SEPARATOR = '━━━━━━━━━━━━━━━━━━━━━';

// ─── In-memory rate limiter ───────────────────────────────────────────────────
// Tracks request count per IP. Resets automatically after the window expires.
const rateLimitMap = new Map(); // ip → { count, resetAt }
const RATE_LIMIT_MAX    = 20;          // max requests
const RATE_LIMIT_WINDOW = 60 * 1000;  // per 60 seconds

function isRateLimited(ip) {
    const now  = Date.now();
    const entry = rateLimitMap.get(ip);

    if (!entry || now > entry.resetAt) {
        rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
        return false;
    }

    if (entry.count >= RATE_LIMIT_MAX) return true;

    entry.count++;
    return false;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Escapes HTML special characters to prevent Telegram message injection. */
function escapeHtml(str = '') {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

/** Truncates a string to a max length to prevent oversized Firestore writes. */
function cap(str, max) {
    if (!str || typeof str !== 'string') return '';
    return str.slice(0, max);
}

/** Validates and sanitizes all incoming string fields. */
function sanitizeInput({ sessionID, browser, pathname }) {
    const sid  = cap(String(sessionID || ''), 128).trim();
    const brws = cap(String(browser   || ''), 100).trim();
    const path = cap(String(pathname  || ''), 300).trim();

    if (!sid) throw new Error('Invalid sessionID');

    return { sessionID: sid, browser: brws, pathname: path };
}

/**
 * Normalizes the device field regardless of whether it arrives
 * as a plain string or as an object with { model, os } properties.
 */
function normalizeDevice(device) {
    if (!device) return { model: 'Unknown', os: 'N/A' };
    if (typeof device === 'string') return { model: device || 'Unknown', os: 'N/A' };
    if (typeof device === 'object') return {
        model: cap(device.model, 100) || 'Unknown',
        os:    cap(device.os,    100) || 'N/A'
    };
    return { model: 'Unknown', os: 'N/A' };
}

/**
 * Normalizes IPv6-mapped IPv4 addresses (e.g. ::ffff:127.0.0.1 → 127.0.0.1)
 * and detects private/loopback IPs to skip unnecessary geo API calls.
 */
function normalizeIP(ip = '') {
    const cleaned   = ip.replace(/^::ffff:/, '');
    const isPrivate = /^(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|127\.|::1$)/.test(cleaned);
    return { ip: cleaned, isPrivate };
}

/**
 * Always fetches geo data server-side for accuracy.
 * Frontend data is not trusted as it can be spoofed.
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
 * Generates a short collision-resistant hash using SHA-256.
 * Used for Telegram callback_data which has a 64-byte limit.
 * Also stored in Firestore so callback handlers can resolve the session.
 */
function shortHash(str = '') {
    return crypto.createHash('sha256').update(str).digest('hex').slice(0, 10);
}

// ─── Handler ─────────────────────────────────────────────────────────────────
module.exports = async (req, res) => {
    // 1. Method check
    if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

    // 2. Resolve client IP early (needed for rate limiting)
    const rawIP    = req.headers['cf-connecting-ip']          // Cloudflare
        || req.headers['x-real-ip']                           // nginx
        || req.headers['x-forwarded-for']?.split(',')[0].trim() // generic proxy
        || req.socket?.remoteAddress
        || 'Unknown';
    const { ip: clientIP } = normalizeIP(rawIP);

    // 3. Rate limit check
    if (isRateLimited(clientIP)) {
        return res.status(429).send('Too Many Requests');
    }

    // 4. Secret key check (only enforced if TRACKER_SECRET_KEY is set)
    if (TRACKER_KEY && req.headers['x-tracker-key'] !== TRACKER_KEY) {
        return res.status(401).send('Unauthorized');
    }

    // 5. Input validation & sanitization
    let sessionID, browser, pathname;
    try {
        ({ sessionID, browser, pathname } = sanitizeInput(req.body));
    } catch {
        return res.status(400).send('Invalid input');
    }

    const rawDevice = req.body.device;

    try {
        // 6. Fetch geo data server-side (not trusting frontend)
        const ipData = await fetchGeoData(clientIP);

        // 7. Normalize device info
        const device = normalizeDevice(rawDevice);

        // 8. Persist to Firestore
        //    - startTime is only written on first visit (won't reset on re-entry)
        //    - history uses arrayUnion to append without overwriting previous entries
        //    - callbackKey stored so callback handlers can resolve the session by hash
        const cbHash  = shortHash(sessionID);
        const docRef  = db.collection('visitors_v1').doc(sessionID);
        const snap    = await docRef.get();

        const sessionData = {
            sessionID,
            ip:          clientIP,
            city:        ipData.city         || 'Unknown',
            country:     ipData.country_name || 'Unknown',
            org:         ipData.org          || 'Unknown',
            device,
            browser:     browser || 'Unknown',
            status:      'online',
            last_seen:   admin.firestore.FieldValue.serverTimestamp(),
            callbackKey: cbHash,
            history:     admin.firestore.FieldValue.arrayUnion({
                time:   new Date().toISOString(),
                action: 'Entrance',
                detail: pathname || 'Unknown'
            })
        };

        // Only set startTime on first document creation
        if (!snap.exists) {
            sessionData.startTime = admin.firestore.FieldValue.serverTimestamp();
        }

        await docRef.set(sessionData, { merge: true });

        // 9. Build and send Telegram notification
        const telegramMsg =
            `🎯 <b>Neural Link Established</b>\n` +
            `${SEPARATOR}\n` +
            `🆔 <b>SESSION:</b> <code>${escapeHtml(sessionID)}</code>\n` +
            `🌍 <b>LOCATION:</b> ${escapeHtml(sessionData.city)}, ${escapeHtml(sessionData.country)}\n` +
            `📡 <b>IP:</b> <code>${escapeHtml(clientIP)}</code>\n` +
            `🏢 <b>ISP:</b> ${escapeHtml(sessionData.org)}\n` +
            `💻 <b>DEVICE:</b> ${escapeHtml(device.model)} (${escapeHtml(device.os)})\n` +
            `🌐 <b>BROWSER:</b> ${escapeHtml(sessionData.browser)}\n` +
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
            const tgRes = await axios.post(
                `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
                { chat_id: CHAT_ID, text: telegramMsg, parse_mode: 'HTML', reply_markup: replyMarkup },
                { timeout: 5000 }
            );

            // Telegram can return HTTP 200 but still signal failure in the body
            if (!tgRes.data?.ok) {
                throw new Error(tgRes.data?.description || 'Telegram API returned ok: false');
            }
        } catch (telegramErr) {
            // Telegram failure does not fail the request — Firestore save was successful
            console.error('Telegram Notification Failed:', telegramErr.message);
            return res.status(200).json({ success: true, telegramSent: false });
        }

        return res.status(200).json({ success: true, telegramSent: true });

    } catch (error) {
        console.error('Tracker API Error:', error);
        return res.status(500).json({ error: error.message });
    }
};
