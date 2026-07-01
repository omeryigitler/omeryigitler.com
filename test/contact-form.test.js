const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");

test("loads Turnstile explicitly and never posts an empty token", () => {
  assert.match(html, /turnstile\/v0\/api\.js\?render=explicit/);
  assert.match(html, /if \(!token\) \{[\s\S]*ensureTurnstile\(\);[\s\S]*return;/);
  assert.doesNotMatch(html, /If Turnstile is loaded it must issue a token/);
});

test("shows a persistent, accessible security status", () => {
  assert.match(html, /id="cfgSecurityStatus" role="status" aria-live="polite"/);
  assert.match(html, /Security verification was blocked/);
});
