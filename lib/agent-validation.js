const SUPPORTED_INTENT = "latest_message_proposal";
const INTENTS = Object.freeze({
  PROPOSAL: SUPPORTED_INTENT,
  LEAD_NOTE: "lead_note",
  TODO_ADD: "todo_add",
  TODO_COMPLETE: "todo_complete",
  TODO_LIST: "todo_list",
  EVENT_ADD: "event_add",
  AGENDA_LIST: "agenda_list",
  DAILY_CHAT: "daily_chat"
});

function validationError(statusCode, code, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

function classifyIntent(text) {
  const normalized = text.toLocaleLowerCase("tr-TR");

  const refersToLead = /(son|latest|gelen|mesaj|message|lead)/i.test(normalized);
  const requestsProposal = /(teklif|proposal|quote|taslak|draft|özet|summary)/i.test(normalized);
  if (refersToLead && requestsProposal) return INTENTS.PROPOSAL;

  const mentionsNote = /(\bnot\b|notu|referans|reference)/i.test(normalized);
  const wantsNoteAdd = /(ekle|yaz|kaydet|add|append)/i.test(normalized);
  if (refersToLead && mentionsNote && wantsNoteAdd) return INTENTS.LEAD_NOTE;

  const mentionsTodo = /(yapılacak|yapilacak|to-?do|görev|gorev)/i.test(normalized);
  const mentionsAgenda = /(ajanda|takvim|randevu|toplantı|toplanti|etkinlik|calendar|event|meeting)/i.test(normalized);
  const wantsAdd = /(ekle|kaydet|oluştur|olustur|planla|not al|yaz|add|create|schedule)/i.test(normalized);
  const wantsComplete = /(tamamla|tamamlandı|tamamlandi|bitir|bitti|yapıldı|yapildi|done|complete)/i.test(normalized);
  const todoShorthand = /(yapılacak|yapilacak|to-?do|görev|gorev)\s*[:\-]/i.test(normalized);

  if (mentionsTodo && wantsComplete) return INTENTS.TODO_COMPLETE;
  if (mentionsTodo && (wantsAdd || todoShorthand)) return INTENTS.TODO_ADD;
  if (mentionsTodo) return INTENTS.TODO_LIST;
  if (mentionsAgenda && wantsAdd) return INTENTS.EVENT_ADD;
  if (mentionsAgenda) return INTENTS.AGENDA_LIST;

  // Destructive requests never fall through to chit-chat; they stay rejected.
  if (/(sil\b|kaldır|kaldir|delete|drop|remove|truncate|reset)/i.test(normalized)) {
    throw validationError(422, "unsupported_command", "Bu komut desteklenmiyor. Silme/temizleme işlemleri agent üzerinden yapılamaz.");
  }

  return INTENTS.DAILY_CHAT;
}

function validateCommand(value) {
  const text = String(value || "").trim();
  if (!text) throw validationError(400, "command_required", "Komut boş bırakılamaz.");
  if (text.length > 2000) throw validationError(413, "command_too_long", "Komut 2000 karakteri aşamaz.");

  return { text, intent: classifyIntent(text) };
}

function validateDecision(value) {
  if (value !== "approve" && value !== "reject") {
    throw validationError(400, "invalid_decision", "Karar yalnızca approve veya reject olabilir.");
  }
  return value;
}

function validateApprovalId(value) {
  const id = String(value || "").trim();
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(id)) {
    throw validationError(400, "invalid_approval_id", "Geçerli bir approvalId gereklidir.");
  }
  return id;
}

function maskEmail(value) {
  const email = String(value || "").trim().toLowerCase();
  const at = email.indexOf("@");
  if (at <= 1) return email ? "***" : "";
  return `${email.slice(0, 2)}***${email.slice(at)}`;
}

module.exports = {
  INTENTS,
  SUPPORTED_INTENT,
  classifyIntent,
  maskEmail,
  validateApprovalId,
  validateCommand,
  validateDecision,
  validationError
};
