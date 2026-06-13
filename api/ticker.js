// Ticker symbol list — shared across all visitors via Firestore (site_config/ticker).
//   GET  /api/ticker            → { symbols: [{ sym, type }, ...] }  (public, cached)
//   POST /api/ticker            → save list; requires x-ticker-token header
//
// All Firestore access goes through the Admin SDK, which bypasses security
// rules — the collection stays closed to public client access.

const { db, requireEnv } = require("./_firebaseAdmin");

const DOC_PATH = { collection: "site_config", doc: "ticker" };
const MAX_SYMBOLS = 20;
const VALID_TYPES = new Set(["stock", "crypto", "fx"]);
const SYMBOL_RE = /^[A-Z0-9.^=/-]{1,12}$/;

const DEFAULT_SYMBOLS = [
    { sym: "SAP", type: "stock" },
    { sym: "AAPL", type: "stock" },
    { sym: "NVDA", type: "stock" },
    { sym: "BTC", type: "crypto" },
    { sym: "ETH", type: "crypto" },
    { sym: "USD/TRY", type: "fx" },
    { sym: "EUR/TRY", type: "fx" }
];

function sanitize(list) {
    if (!Array.isArray(list)) return null;

    const seen = new Set();
    const clean = [];

    for (const entry of list) {
        if (!entry || typeof entry.sym !== "string") continue;
        const sym = entry.sym.trim().toUpperCase();
        const type = String(entry.type || "").toLowerCase();
        if (!SYMBOL_RE.test(sym) || !VALID_TYPES.has(type) || seen.has(sym)) continue;
        seen.add(sym);
        clean.push({ sym, type });
        if (clean.length >= MAX_SYMBOLS) break;
    }

    return clean.length ? clean : null;
}

module.exports = async (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-ticker-token");

    if (req.method === "OPTIONS") return res.status(200).end();

    const ref = db.collection(DOC_PATH.collection).doc(DOC_PATH.doc);

    if (req.method === "GET") {
        try {
            const snap = await ref.get();
            const symbols = snap.exists && Array.isArray(snap.data().symbols)
                ? snap.data().symbols
                : DEFAULT_SYMBOLS;
            res.setHeader("Cache-Control", "s-maxage=30, stale-while-revalidate=120");
            return res.status(200).json({ symbols });
        } catch (e) {
            return res.status(200).json({ symbols: DEFAULT_SYMBOLS });
        }
    }

    if (req.method === "POST") {
        let token;
        try {
            token = requireEnv("TICKER_ADMIN_TOKEN");
        } catch (e) {
            return res.status(500).json({ error: "Ticker admin token not configured." });
        }

        if (req.headers["x-ticker-token"] !== token) {
            return res.status(401).json({ error: "Unauthorized." });
        }

        const body = typeof req.body === "string" ? safeParse(req.body) : req.body || {};
        const symbols = sanitize(body.symbols);

        if (!symbols) {
            return res.status(400).json({ error: "Provide a non-empty symbols array of { sym, type }." });
        }

        await ref.set({ symbols, updatedAt: Date.now() }, { merge: true });
        return res.status(200).json({ ok: true, symbols });
    }

    return res.status(405).json({ error: "Method not allowed." });
};

function safeParse(str) {
    try {
        return JSON.parse(str);
    } catch (e) {
        return {};
    }
}
