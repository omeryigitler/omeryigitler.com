const test = require("node:test");
const assert = require("node:assert/strict");
const {
  cleanAgentText,
  cleanScreenMessage,
  parseVisitorCommand,
  validateSessionId,
  validateVisitorCommand
} = require("../lib/visitor-command");

test("parses Turkish and English visitor commands", () => {
  assert.deepEqual(parseVisitorCommand("Durdur"), { command: "FREEZE", message: null });
  assert.deepEqual(parseVisitorCommand("Ekrana bakımdayız yaz"), { command: "FREEZE", message: "bakımdayız" });
  assert.deepEqual(parseVisitorCommand("Son ziyaretçiyi engelle"), { command: "BLOCK", message: null });
  assert.deepEqual(parseVisitorCommand("clear"), { command: "CLEAR", message: null });
  assert.deepEqual(parseVisitorCommand("Bugünkü mesajları özetle"), { command: "UNKNOWN", message: null });
});

test("bounds visitor input and rejects unsafe identifiers", () => {
  assert.equal(cleanScreenMessage("<b>bakım</b>\nşimdi"), "bbakım/b şimdi");
  assert.equal(cleanAgentText("  aktif\nprojeleri   listele  "), "aktif projeleri listele");
  assert.equal(validateVisitorCommand("freeze"), "FREEZE");
  assert.equal(validateSessionId("sess_ABC-123"), "sess_ABC-123");
  assert.throws(() => validateVisitorCommand("DELETE"), { code: "unsupported_visitor_command" });
  assert.throws(() => validateSessionId("../visitors/1"), { code: "invalid_session_id" });
});
