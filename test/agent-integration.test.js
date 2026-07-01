const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

function source(file) {
  return fs.readFileSync(path.join(__dirname, "..", file), "utf8");
}

test("admin loads the Agent UI and exposes approvals plus recent runs", () => {
  const admin = source("admin.html");
  const ui = source("assets/js/admin-agent.js");
  assert.match(admin, /assets\/js\/admin-agent\.js/);
  assert.match(ui, /id: "agent-runs"/);
  assert.match(ui, /window\.TaurusAgent = Object\.freeze/);
  assert.match(ui, /api\("visitor"/);
});

test("admin and Telegram visitor controls route through server-side approval", () => {
  const admin = source("admin.html");
  const webhook = source("api/webhook.js");
  const remoteFunction = admin.slice(admin.indexOf("async function sendRemoteCommand"), admin.indexOf("// Session Modal Functions"));
  assert.match(remoteFunction, /TaurusAgent\.requestVisitorCommand/);
  assert.doesNotMatch(remoteFunction, /collection\(['"]visitors_v1['"]\)/);
  assert.match(webhook, /queueVisitorApproval/);
  assert.match(webhook, /handleAgentApprovalCallback/);
  assert.doesNotMatch(webhook, /action_timestamp/);
  assert.doesNotMatch(webhook, /if \(!expectedSecret\) return true/);
  assert.match(webhook, /timingSafeEqual/);
});

test("previously exposed Gemini credential is no longer committed", () => {
  const geminiService = source("elitebody/services/geminiService.ts");
  assert.doesNotMatch(geminiService, /AIza[0-9A-Za-z_-]{20,}/);
  assert.match(geminiService, /VITE_GEMINI_API_KEY is not configured/);
});
