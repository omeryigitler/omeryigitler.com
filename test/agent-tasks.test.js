const test = require("node:test");
const assert = require("node:assert/strict");
const Module = require("node:module");

const originalLoad = Module._load;
Module._load = function patchedLoad(request, parent, isMain) {
  if (request === "../api/_firebaseAdmin" && parent?.filename?.endsWith("/lib/agent-tasks.js")) {
    return { admin: { firestore: {} }, db: {} };
  }
  return originalLoad.call(this, request, parent, isMain);
};
const tasks = require("../lib/agent-tasks");
Module._load = originalLoad;

const { classifyIntent, validateCommand } = require("../lib/agent-validation");
const { parseTurkishDateTime, stripKeywords, dateKeyInTz } = tasks._test;

// A fixed Wednesday noon UTC so relative-day parsing is deterministic.
const NOW = new Date("2026-07-01T12:00:00Z");
const TZ = "Europe/Istanbul";

test("classifies todo, agenda and chat intents from Turkish commands", () => {
  assert.equal(classifyIntent("son gelen mesajın referansına Ahmet ismini ekle"), "lead_note");
  assert.equal(classifyIntent("todo ekle: müşteriye dön"), "todo_add");
  assert.equal(classifyIntent("görev: siteyi yayınla"), "todo_add");
  assert.equal(classifyIntent("yapılacakları listele"), "todo_list");
  assert.equal(classifyIntent("müşteriye dön görevini tamamla"), "todo_complete");
  assert.equal(classifyIntent("yarın 14:00 toplantı ekle"), "event_add");
  assert.equal(classifyIntent("bugün ajandada ne var"), "agenda_list");
  assert.equal(classifyIntent("günaydın, bugün nasıl gidiyor?"), "daily_chat");
});

test("keeps the proposal flow and destructive-command rejection intact", () => {
  assert.equal(validateCommand("Son gelen mesajı özetle ve teklif taslağı hazırla").intent, "latest_message_proposal");
  assert.throws(() => validateCommand("Tüm projeleri sil"), { code: "unsupported_command" });
});

test("parses relative Turkish dates and clock times", () => {
  const today = dateKeyInTz(NOW, TZ);
  assert.deepEqual(parseTurkishDateTime("bugün 15:30 arama", NOW, TZ), { dateKey: today, time: "15:30" });

  const tomorrow = parseTurkishDateTime("yarın saat 9 toplantı", NOW, TZ);
  assert.equal(tomorrow.dateKey, "2026-07-02");
  assert.equal(tomorrow.time, "09:00");

  assert.deepEqual(parseTurkishDateTime("15.08.2026 14:00 lansman", NOW, TZ), { dateKey: "2026-08-15", time: "14:00" });
  assert.equal(parseTurkishDateTime("cuma müşteri görüşmesi", NOW, TZ).dateKey, "2026-07-03");
  assert.deepEqual(parseTurkishDateTime("tarihsiz bir not", NOW, TZ), { dateKey: null, time: null });
});

test("extracts clean titles from natural commands", () => {
  assert.equal(stripKeywords("todo ekle: müşteriye geri dön"), "müşteriye geri dön");
  assert.equal(stripKeywords("yarın 14:00 lansman provası takvime ekle"), "lansman provası");
});

test("extracts the note body from a lead-note command", () => {
  const { extractNoteText } = tasks._test;
  assert.equal(extractNoteText("son gelen mesajın referansına Ahmet ismini ekle"), "Ahmet");
  assert.equal(extractNoteText("lead'e not ekle: fiyat onaylandı"), "fiyat onaylandı");
});
