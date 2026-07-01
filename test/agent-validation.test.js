const test = require("node:test");
const assert = require("node:assert/strict");
const {
  maskEmail,
  validateApprovalId,
  validateCommand,
  validateDecision
} = require("../lib/agent-validation");

test("accepts the narrow supported Turkish proposal command", () => {
  const result = validateCommand("Son gelen mesajı özetle ve teklif taslağı hazırla");
  assert.equal(result.intent, "latest_message_proposal");
});

test("routes operational read commands and visitor controls", () => {
  assert.equal(validateCommand("Bugünkü mesajları özetle").intent, "messages_summary");
  assert.equal(validateCommand("Okunmamış leadleri listele").options.unreadOnly, true);
  assert.equal(validateCommand("Aktif projeleri listele").intent, "active_projects_summary");
  assert.equal(validateCommand("Son ziyaretçileri özetle").intent, "latest_visitors_summary");
  assert.equal(validateCommand("Son gelen lead kim?").intent, "latest_lead_summary");
  assert.deepEqual(validateCommand("Son ziyaretçiyi dondur ve bakımdayız yaz").options, {
    command: "FREEZE",
    message: "bakımdayız"
  });
});

test("rejects blank and unsupported commands", () => {
  assert.throws(() => validateCommand(""), { code: "command_required" });
  assert.throws(() => validateCommand("Tüm projeleri sil"), { code: "unsupported_command" });
});

test("approval decisions are explicit and approval ids are bounded", () => {
  assert.equal(validateDecision("approve"), "approve");
  assert.equal(validateDecision("reject"), "reject");
  assert.throws(() => validateDecision(undefined), { code: "invalid_decision" });
  assert.equal(validateApprovalId("abc_123-Z"), "abc_123-Z");
  assert.throws(() => validateApprovalId("../quotes/1"), { code: "invalid_approval_id" });
});

test("masks customer email in approval previews", () => {
  assert.equal(maskEmail("customer@example.com"), "cu***@example.com");
  assert.equal(maskEmail(""), "");
});
