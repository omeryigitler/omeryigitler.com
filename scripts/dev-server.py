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
    def do_GET(self):
        parsed = urlparse(self.path)
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

        body = json.dumps(out).encode()
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, *args):
        pass


if __name__ == "__main__":
    print(f"dev server on http://127.0.0.1:{PORT} (static + /api/quotes)")
    ThreadingHTTPServer(("127.0.0.1", PORT), Handler).serve_forever()
