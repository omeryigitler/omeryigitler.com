const SUPPORTED_INTENT = "latest_message_proposal";

function validationError(statusCode, code, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

function validateCommand(value) {
  const text = String(value || "").trim();
  if (!text) throw validationError(400, "command_required", "Komut boş bırakılamaz.");
  if (text.length > 2000) throw validationError(413, "command_too_long", "Komut 2000 karakteri aşamaz.");

  const normalized = text.toLocaleLowerCase("tr-TR");
  const refersToLead = /(son|latest|gelen|mesaj|message|lead)/i.test(normalized);
  const requestsProposal = /(teklif|proposal|quote|taslak|draft|özet|summary)/i.test(normalized);
  if (!refersToLead || !requestsProposal) {
    throw validationError(422, "unsupported_command", "Şimdilik yalnızca son lead özeti ve teklif taslağı komutu destekleniyor.");
  }

  return { text, intent: SUPPORTED_INTENT };
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
  SUPPORTED_INTENT,
  maskEmail,
  validateApprovalId,
  validateCommand,
  validateDecision,
  validationError
};
