const admin  = require('firebase-admin');
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
const TRACKER_KEY    = process.env.TRACKER_SECRET_KEY;
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || 'https://omeryigitler.com';
const CODE_SALT      = process.env.CODE_SALT || 'taurus_default_salt'; // Add to .env for production

// ─── Rate Limiter ─────────────────────────────────────────────────────────────
// NOTE: This is an in-memory rate limiter. It works for single-instance deployments
// but will be inconsistent on serverless (Vercel) where each cold start resets it.
// For production at scale, replace with Upstash Redis:
//   https://upstash.com — drop-in replacement, ~5 lines of change
const rateLimitMap = new Map();
const RATE_LIMIT_MAX    = 30;
const RATE_LIMIT_WINDOW = 60 * 1000;

function isRateLimited(ip) {
    const now   = Date.now();
    const entry = rateLimitMap.get(ip);

    if (!entry || now > entry.resetAt) {
        rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
        // Prune old entries to prevent memory growth on long-running instances
        if (rateLimitMap.size > 5000) {
            for (const [key, val] of rateLimitMap) {
                if (now > val.resetAt) rateLimitMap.delete(key);
            }
        }
        return false;
    }

    if (entry.count >= RATE_LIMIT_MAX) return true;
    entry.count++;
    return false;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function normalizeIP(ip = '') {
    return ip.replace(/^::ffff:/, '');
}

function parseBody(body) {
    if (typeof body === 'string') {
        try { return JSON.parse(body); } catch { return {}; }
    }
    return body || {};
}

/** Validates a sessionId or reqId string — alphanumeric + _ - only, max 64 chars. */
function isValidId(id) {
    return typeof id === 'string' && id.length > 0 && id.length <= 64 && /^[a-zA-Z0-9_-]+$/.test(id);
}

/**
 * Hashes an expectedCode with a salt using SHA-256.
 * Stored in Firestore instead of plaintext to protect OTP values.
 */
function hashCode(code) {
    return crypto.createHash('sha256').update(`${code}:${CODE_SALT}`).digest('hex');
}

/**
 * Safely serializes a Firestore Timestamp to ISO string.
 * Falls back gracefully if the value is already a string or null.
 */
function serializeTimestamp(value) {
    if (!value) return null;
    if (typeof value.toDate === 'function') return value.toDate().toISOString();
    return String(value);
}

// ─── Handler ─────────────────────────────────────────────────────────────────
module.exports = async (req, res) => {
    // 1. CORS — only allow requests from the configured origin
    const requestOrigin = req.headers.origin;
    if (requestOrigin === ALLOWED_ORIGIN) {
        res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
        res.setHeader('Vary', 'Origin');
    }
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-tracker-key');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

    if (req.method === 'OPTIONS') return res.status(200).send('OK');

    // 2. Resolve client IP
    const clientIP = normalizeIP(
        req.headers['cf-connecting-ip'] ||
        req.headers['x-real-ip'] ||
        req.headers['x-forwarded-for']?.split(',')[0].trim() ||
        req.socket?.remoteAddress ||
        'Unknown'
    );

    // 3. Rate limit
    if (isRateLimited(clientIP)) {
        res.setHeader('Retry-After', '60');
        return res.status(429).json({ error: 'Too Many Requests' });
    }

    // 4. Secret key check (only enforced if TRACKER_SECRET_KEY is set)
    if (TRACKER_KEY && req.headers['x-tracker-key'] !== TRACKER_KEY) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    // 5. Parse body and determine action
    const body   = parseBody(req.body);
    const action = req.query.action || body.action;

    if (!action) {
        return res.status(400).json({ error: 'Missing action parameter' });
    }

    // 6. Method enforcement
    const GET_ACTIONS  = ['check_command', 'check_status'];
    const POST_ACTIONS = ['ack_command', 'auth_init'];

    if (GET_ACTIONS.includes(action) && req.method !== 'GET') {
        return res.status(405).json({ error: 'Method Not Allowed — use GET' });
    }
    if (POST_ACTIONS.includes(action) && req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed — use POST' });
    }

    try {

        // ── 1. CHECK COMMAND ─────────────────────────────────────────────────
        // Tracker polls this to receive remote commands (alarm, block, freeze, clear)
        if (action === 'check_command') {
            const sessionId = req.query.sessionId || body.sessionId;
            if (!isValidId(sessionId)) return res.status(400).json({ error: 'Invalid or missing sessionId' });

            const doc = await db.collection('visitors_v1').doc(sessionId).get();
            if (!doc.exists) return res.status(200).json({ action: null });

            const data = doc.data();
            return res.status(200).json({
                action:           data.action                          || null,
                action_timestamp: serializeTimestamp(data.action_timestamp)
            });
        }

        // ── 2. ACK COMMAND ───────────────────────────────────────────────────
        // Tracker confirms it has executed a command — clears it from Firestore
        if (action === 'ack_command') {
            const sessionId = req.query.sessionId || body.sessionId;
            if (!isValidId(sessionId)) return res.status(400).json({ error: 'Invalid or missing sessionId' });

            const docRef = db.collection('visitors_v1').doc(sessionId);
            const snap   = await docRef.get();

            // If doc doesn't exist, treat as already cleared — not an error
            if (!snap.exists) return res.status(200).json({ status: 'cleared' });

            await docRef.update({
                action:           admin.firestore.FieldValue.delete(),
                action_timestamp: admin.firestore.FieldValue.delete()
            });

            return res.status(200).json({ status: 'cleared' });
        }

        // ── 3. AUTH INIT ─────────────────────────────────────────────────────
        // Gateway page creates an auth request with an expected code
        if (action === 'auth_init') {
            const { reqId, expectedCode } = body;

            if (!isValidId(reqId)) {
                return res.status(400).json({ error: 'Invalid or missing reqId' });
            }

            // expectedCode: digits only, 1-10 chars
            if (!expectedCode || !/^\d{1,10}$/.test(String(expectedCode))) {
                return res.status(400).json({ error: 'Invalid expectedCode — must be numeric, max 10 digits' });
            }

            const docRef = db.collection('auth_requests').doc(reqId);
            const snap   = await docRef.get();

            // Prevent overwriting an existing pending request
            if (snap.exists && snap.data().status === 'pending') {
                return res.status(409).json({ error: 'Auth request already exists' });
            }

            // Store hashed code — never store OTP values in plaintext
            await docRef.set({
                expectedCodeHash: hashCode(String(expectedCode)),
                status:           'pending',
                createdAt:        admin.firestore.FieldValue.serverTimestamp(),
                expiresAt:        new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5 min TTL
                ip:               clientIP
            });

            return res.status(200).json({ status: 'ok' });
        }

        // ── 4. CHECK STATUS ──────────────────────────────────────────────────
        // Gateway page polls this to see if auth has been approved
        if (action === 'check_status') {
            const reqId = req.query.reqId || body.reqId;
            if (!isValidId(reqId)) return res.status(400).json({ error: 'Invalid or missing reqId' });

            const doc = await db.collection('auth_requests').doc(reqId).get();
            if (!doc.exists) return res.status(404).json({ status: 'not_found' });

            const data = doc.data();

            // Enforce TTL — expire requests older than 5 minutes
            if (data.expiresAt && new Date() > new Date(data.expiresAt)) {
                return res.status(200).json({ status: 'expired' });
            }

            return res.status(200).json({ status: data.status });
        }

        // Unknown action
        return res.status(400).json({ error: 'Invalid action' });

    } catch (e) {
        // Never expose internal error details to the client in production
        console.error('Gateway Error:', e);
        return res.status(500).json({ error: 'Internal server error' });
    }
};
