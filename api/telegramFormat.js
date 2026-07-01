const SEPARATOR = "━━━━━━━━━━━━━━━━━━━━";

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function cleanValue(value, fallback = "Unknown") {
  if (value === null || value === undefined || value === "") return fallback;
  if (typeof value === "object") {
    return formatDevice(value, fallback);
  }
  return String(value);
}

function formatCode(value, fallback = "Unknown") {
  return `<code>${escapeHtml(cleanValue(value, fallback))}</code>`;
}

function formatDevice(device, fallback = "Unknown") {
  if (!device) return fallback;
  if (typeof device === "string") return device.trim() || fallback;

  if (typeof device === "object") {
    const model = device.model || device.device || device.type || device.vendor || "";
    const os = device.os || device.platform || "";
    const browser = device.browser || device.browserName || "";
    const parts = [model, os, browser].filter(Boolean);
    return parts.length ? parts.join(" / ") : fallback;
  }

  return String(device);
}

function row(icon, label, value, options = {}) {
  const displayValue = options.code ? formatCode(value, options.fallback) : escapeHtml(cleanValue(value, options.fallback));
  return `${icon} <b>${escapeHtml(label)}</b>\n${displayValue}`;
}

function panel({ title, subtitle, rows = [], footer }) {
  return [
    `◼️ <b>${escapeHtml(title)}</b>`,
    subtitle ? `<i>${escapeHtml(subtitle)}</i>` : null,
    SEPARATOR,
    ...rows,
    footer ? SEPARATOR : null,
    footer ? `<i>${escapeHtml(footer)}</i>` : null,
  ].filter(Boolean).join("\n");
}

function actionKeyboard(sessionID) {
  return {
    inline_keyboard: [
      [
        { text: "❄️ FREEZE", callback_data: `freeze_${sessionID}` },
        { text: "🚨 ALARM", callback_data: `alarm_${sessionID}` },
      ],
      [
        { text: "⛔ BLOCK", callback_data: `block_${sessionID}` },
        { text: "🟢 CLEAR", callback_data: `clear_${sessionID}` },
      ],
    ],
  };
}

function authKeyboard(reqId, options) {
  return {
    inline_keyboard: options.map((option) => [{
      text: `${option}`,
      callback_data: `auth_${reqId}_${option}`,
    }]),
  };
}

function agentApprovalKeyboard(approvalId) {
  return {
    inline_keyboard: [[
      { text: "✅ APPROVE", callback_data: `agentapprove_${approvalId}` },
      { text: "❌ REJECT", callback_data: `agentreject_${approvalId}` },
    ]],
  };
}

function commandLabel(command) {
  return {
    FREEZE: "Freeze visitor screen",
    CLEAR: "Clear active command",
    ALARM: "Trigger alarm",
    BLOCK: "Block visitor session",
  }[command] || command || "Unknown";
}

module.exports = {
  SEPARATOR,
  actionKeyboard,
  agentApprovalKeyboard,
  authKeyboard,
  cleanValue,
  commandLabel,
  escapeHtml,
  formatCode,
  formatDevice,
  panel,
  row,
};
