#!/usr/bin/env python3
"""Static dev server + /api/quotes proxy (mirrors api/quotes.js for local concept work)."""
import json
import re
import sys
import urllib.request
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse, parse_qs

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 4173
YAHOO = "https://query1.finance.yahoo.com/v8/finance/chart/{}?range=1d&interval=1d"
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
SYMBOL_RE = re.compile(r"^[A-Z0-9.^=-]{1,12}$")

# In-memory ticker store for local dev (Vercel uses Firestore via api/ticker.js)
_ticker_store = {
    "symbols": [
        {"sym": "SAP", "type": "stock"},
        {"sym": "AAPL", "type": "stock"},
        {"sym": "NVDA", "type": "stock"},
        {"sym": "BTC", "type": "crypto"},
        {"sym": "ETH", "type": "crypto"},
        {"sym": "USD/TRY", "type": "fx"},
        {"sym": "EUR/TRY", "type": "fx"},
    ]
}


def fetch_quote(symbol):
    req = urllib.request.Request(YAHOO.format(symbol), headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=6) as res:
        meta = json.load(res)["chart"]["result"][0]["meta"]
    price = meta.get("regularMarketPrice")
    prev = meta.get("chartPreviousClose")
    if not isinstance(price, (int, float)):
        return None
    change = ((price - prev) / prev) * 100 if isinstance(prev, (int, float)) and prev else None
    return {"price": price, "change": change}


class Handler(SimpleHTTPRequestHandler):
    def _send_json(self, payload, status=200):
        body = json.dumps(payload).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, x-ticker-token")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        parsed = urlparse(self.path)

        if parsed.path == "/api/ticker":
            return self._send_json({"symbols": _ticker_store["symbols"]})

        if parsed.path != "/api/quotes":
            return super().do_GET()

        symbols = [
            s.strip().upper()
            for s in parse_qs(parsed.query).get("symbols", [""])[0].split(",")
            if SYMBOL_RE.match(s.strip().upper())
        ][:12]

        out = {}
        for sym in symbols:
            try:
                quote = fetch_quote(sym)
                if quote:
                    out[sym] = quote
            except Exception:
                pass

        self._send_json(out)

    def do_POST(self):
        parsed = urlparse(self.path)
        if parsed.path != "/api/ticker":
            return self._send_json({"error": "not found"}, 404)

        # Local dev: accept any token (real auth lives in api/ticker.js on Vercel)
        length = int(self.headers.get("Content-Length", 0))
        try:
            data = json.loads(self.rfile.read(length) or b"{}")
        except Exception:
            data = {}

        symbols = data.get("symbols")
        if isinstance(symbols, list) and symbols:
            _ticker_store["symbols"] = symbols
            return self._send_json({"ok": True, "symbols": symbols})
        return self._send_json({"error": "bad symbols"}, 400)

    def log_message(self, *args):
        pass


if __name__ == "__main__":
    print(f"dev server on http://127.0.0.1:{PORT} (static + /api/quotes)")
    ThreadingHTTPServer(("127.0.0.1", PORT), Handler).serve_forever()
