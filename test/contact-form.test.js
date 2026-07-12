const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");

test("loads Turnstile explicitly and never posts an empty token", () => {
  assert.match(html, /turnstile\/v0\/api\.js\?render=explicit/);
  // A missing token defers the submission (pendingSubmit) instead of posting;
  // doSubmit is the only path to /api/contact and always receives a token.
  assert.match(html, /if \(token\) \{\s*doSubmit\(token\);\s*return;/);
  assert.match(html, /pendingSubmit = true;/);
  assert.match(html, /turnstileToken: token/);
  assert.doesNotMatch(html, /If Turnstile is loaded it must issue a token/);
});

test("warms the Turnstile script on first form interaction", () => {
  assert.match(html, /form\.addEventListener\("focusin", function warmOnce\(\)/);
  assert.match(html, /loadTurnstileScript\(\)\.catch/);
});

test("shows a persistent, accessible security status", () => {
  assert.match(html, /id="cfgSecurityStatus" role="status" aria-live="polite"/);
  assert.match(html, /Security verification was blocked/);
});
