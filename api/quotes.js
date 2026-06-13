// Stock quotes proxy — Yahoo Finance v8 chart endpoint (no API key required).
// GET /api/quotes?symbols=SAP,AAPL,NVDA → { "SAP": { "price": 162.4, "change": -0.76 }, ... }

const YAHOO_BASE = 'https://query1.finance.yahoo.com/v8/finance/chart/';
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36';
const MAX_SYMBOLS = 12;

async function fetchQuote(symbol) {
    const res = await fetch(YAHOO_BASE + encodeURIComponent(symbol) + '?range=1d&interval=1d', {
        headers: { 'User-Agent': UA }
    });

    if (!res.ok) return null;

    const data = await res.json();
    const meta = data && data.chart && data.chart.result && data.chart.result[0] && data.chart.result[0].meta;
    if (!meta || typeof meta.regularMarketPrice !== 'number') return null;

    const price = meta.regularMarketPrice;
    const prevClose = typeof meta.chartPreviousClose === 'number' ? meta.chartPreviousClose : null;
    const change = prevClose ? ((price - prevClose) / prevClose) * 100 : null;

    return { price, change };
}

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=120');

    if (req.method === 'OPTIONS') return res.status(200).end();

    const raw = (req.query.symbols || '').toString();
    const symbols = raw
        .split(',')
        .map((s) => s.trim().toUpperCase())
        .filter((s) => /^[A-Z0-9.^=-]{1,12}$/.test(s))
        .slice(0, MAX_SYMBOLS);

    if (!symbols.length) {
        return res.status(400).json({ error: 'Pass ?symbols=AAPL,SAP (comma separated).' });
    }

    const out = {};
    await Promise.all(symbols.map(async (sym) => {
        try {
            const quote = await fetchQuote(sym);
            if (quote) out[sym] = quote;
        } catch (e) {
            // symbol silently skipped — caller falls back per-symbol
        }
    }));

    return res.status(200).json(out);
};
