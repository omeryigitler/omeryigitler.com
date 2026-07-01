const { parseVisitorCommand } = require("./visitor-command");

const SUPPORTED_INTENTS = Object.freeze({
  LATEST_MESSAGE_PROPOSAL: "latest_message_proposal",
  LATEST_LEAD_SUMMARY: "latest_lead_summary",
  MESSAGES_SUMMARY: "messages_summary",
  ACTIVE_PROJECTS_SUMMARY: "active_projects_summary",
  LATEST_VISITORS_SUMMARY: "latest_visitors_summary",
  VISITOR_CONTROL: "visitor_control"
});

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
  const requestsProposal = /(teklif|proposal|quote|taslak|draft)/i.test(normalized);

  if (refersToLead && requestsProposal) {
    return { text, intent: SUPPORTED_INTENTS.LATEST_MESSAGE_PROPOSAL, options: {} };
  }

  const visitorCommand = parseVisitorCommand(text);
  if (visitorCommand.command !== "UNKNOWN") {
    return {
      text,
      intent: SUPPORTED_INTENTS.VISITOR_CONTROL,
      options: visitorCommand
    };
  }

  const asksForSummary = /(özet|ozet|summary|listele|list|kim|nedir|neler|göster|goster)/i.test(normalized);
  const refersToProjects = /(proje|project)/i.test(normalized);
  const refersToVisitors = /(ziyaretçi|ziyaretci|visitor|trafik|traffic)/i.test(normalized);
  const refersToMessages = /(mesaj|message|lead|talep|inbox|gelen kutu)/i.test(normalized);

  if (refersToProjects && /(aktif|active|devam|bekleyen|pending|durum|status)/i.test(normalized)) {
    return { text, intent: SUPPORTED_INTENTS.ACTIVE_PROJECTS_SUMMARY, options: {} };
  }

  if (refersToVisitors && asksForSummary) {
    return { text, intent: SUPPORTED_INTENTS.LATEST_VISITORS_SUMMARY, options: {} };
  }

  if (refersToMessages && /(bugün|bugun|today|okunmamış|okunmamis|unread|bekleyen|pending)/i.test(normalized)) {
    return {
      text,
      intent: SUPPORTED_INTENTS.MESSAGES_SUMMARY,
      options: {
        todayOnly: /(bugün|bugun|today)/i.test(normalized),
        unreadOnly: /(okunmamış|okunmamis|unread|bekleyen|pending)/i.test(normalized)
      }
    };
  }

  if (refersToLead && asksForSummary) {
    return { text, intent: SUPPORTED_INTENTS.LATEST_LEAD_SUMMARY, options: {} };
  }

  throw validationError(
    422,
    "unsupported_command",
    "Desteklenen komutlar: son lead özeti/teklifi, bugünkü veya okunmamış mesajlar, aktif projeler ve son ziyaretçiler."
  );
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
  SUPPORTED_INTENTS,
  maskEmail,
  validateApprovalId,
  validateCommand,
  validateDecision,
  validationError
};
