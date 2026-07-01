const VALID_VISITOR_COMMANDS = new Set(["FREEZE", "CLEAR", "ALARM", "BLOCK"]);

function normalizeForIntent(value) {
  return String(value || "")
    .trim()
    .toLocaleUpperCase("tr-TR")
    .replace(/İ/g, "I")
    .replace(/İ/g, "I")
    .replace(/Ğ/g, "G")
    .replace(/Ü/g, "U")
    .replace(/Ş/g, "S")
    .replace(/Ö/g, "O")
    .replace(/Ç/g, "C");
}

function cleanScreenMessage(value) {
  if (typeof value !== "string") return null;

  const cleaned = value
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/[<>]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  return cleaned ? cleaned.slice(0, 180) : null;
}

function cleanAgentText(value) {
  if (typeof value !== "string") return null;
  const cleaned = value.replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim();
  return cleaned ? cleaned.slice(0, 2000) : null;
}

function parseVisitorCommand(rawText) {
  const text = String(rawText || "").trim();
  const normalized = normalizeForIntent(text);

  const writePatterns = [
    /^(?:SON\s+(?:ZIYARETCIYI|ZIYARETÇIYI)\s+)?(?:DURDUR|KAPAT|FREEZE|STOP|DON|DONDUR)\s+(?:VE\s+)?(.+?)\s+(?:YAZDIR|YAZ|GOSTER|GÖSTER)$/i,
    /^(?:EKRANA|SAYFAYA|ZIYARETCIYE|ZIYARETÇIYE|MESAJ|SUNU|ŞUNU)\s*:?\s*(.+?)(?:\s+(?:YAZDIR|YAZ|GOSTER|GÖSTER))?$/i,
    /^(?:YAZDIR|YAZ|GOSTER|GÖSTER)\s*:?\s*(.+)$/i,
  ];

  for (const pattern of writePatterns) {
    const match = text.match(pattern);
    if (match) {
      const message = cleanScreenMessage(match[1]);
      if (message) return { command: "FREEZE", message };
    }
  }

  if (/^(?:SON\s+(?:ZIYARETCIYI|ZIYARETÇIYI)\s+)?(?:DURDUR|KAPAT|FREEZE|STOP|DON|DONDUR)$/i.test(normalized)) {
    return { command: "FREEZE", message: null };
  }

  if (/^(?:SON\s+(?:ZIYARETCIYI|ZIYARETÇIYI)\s+)?(?:TEMIZLE|AC|DEVAM ET|CLEAR|IPTAL|UNBLOCK|ENGELI KALDIR)$/i.test(normalized)) {
    return { command: "CLEAR", message: null };
  }

  if (/^(?:SON\s+(?:ZIYARETCIYE|ZIYARETÇIYE)\s+)?(?:ALARM|UYAR|UYARI|SIREN)(?:\s+VER)?$/i.test(normalized)) {
    return { command: "ALARM", message: null };
  }

  if (/^(?:SON\s+(?:ZIYARETCIYI|ZIYARETÇIYI)\s+)?(?:ENGELLE|BLOCK|KARA LISTE|BAN)$/i.test(normalized)) {
    return { command: "BLOCK", message: null };
  }

  return { command: "UNKNOWN", message: null };
}

function validateVisitorCommand(value) {
  const command = String(value || "").trim().toUpperCase();
  if (!VALID_VISITOR_COMMANDS.has(command)) {
    const error = new Error("Desteklenmeyen ziyaretçi komutu.");
    error.statusCode = 422;
    error.code = "unsupported_visitor_command";
    throw error;
  }
  return command;
}

function validateSessionId(value) {
  const sessionId = String(value || "").trim();
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(sessionId)) {
    const error = new Error("Geçerli bir ziyaretçi oturum kimliği gereklidir.");
    error.statusCode = 400;
    error.code = "invalid_session_id";
    throw error;
  }
  return sessionId;
}

module.exports = {
  VALID_VISITOR_COMMANDS,
  cleanAgentText,
  cleanScreenMessage,
  normalizeForIntent,
  parseVisitorCommand,
  validateSessionId,
  validateVisitorCommand
};
