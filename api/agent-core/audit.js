const { admin } = require("../_firebaseAdmin");

async function logAudit(db, entry = {}) {
  try {
    await db.collection("agent_audit_logs").add({
      actor: entry.actor || "system",
      source: entry.source || "api",
      action: entry.action || "agent_action",
      targetType: entry.targetType || null,
      targetId: entry.targetId || null,
      risk: entry.risk || "low",
      result: entry.result || "success",
      message: entry.message || "",
      metadata: entry.metadata || {},
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
  } catch (error) {
    console.error("Agent audit write failed:", error);
  }
}

module.exports = {
  logAudit
};
