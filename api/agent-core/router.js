const { admin, db } = require("../_firebaseAdmin");
const { getLatestLeadMessage } = require("./tools/messages");
const { buildProposalDraft } = require("./tools/proposals");
const { summarizeLead } = require("./summary");

async function handleCommand(input) {
  const commandRef = db.collection("agent_commands").doc();
  await commandRef.set({
    source: input.source || "admin_panel",
    text: String(input.text || ""),
    normalizedIntent: "latest_message_proposal",
    status: "running",
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    createdBy: input.actor?.id || "unknown",
    risk: "medium"
  });

  const latestMessage = await getLatestLeadMessage(db);
  if (!latestMessage) {
    await commandRef.update({ status: "completed", risk: "low" });
    return {
      commandId: commandRef.id,
      status: "empty",
      message: "No lead message found."
    };
  }

  const draft = buildProposalDraft(latestMessage);
  const summary = summarizeLead(latestMessage, draft);
  const approvalRef = db.collection("agent_approvals").doc();

  await approvalRef.set({
    commandId: commandRef.id,
    requestedAction: "create_proposal",
    risk: "medium",
    payloadPreview: draft,
    status: "pending",
    requestedAt: admin.firestore.FieldValue.serverTimestamp(),
    decidedAt: null,
    decidedBy: null
  });

  await commandRef.update({
    status: "waiting_approval",
    approvalId: approvalRef.id
  });

  return {
    commandId: commandRef.id,
    approvalId: approvalRef.id,
    status: "waiting_approval",
    summary,
    draft
  };
}

module.exports = {
  handleCommand
};
