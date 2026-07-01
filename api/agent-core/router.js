const { db } = require("../_firebaseAdmin");
const { getLatestLeadMessage } = require("./tools/messages");
const { buildProposalDraft } = require("./tools/proposals");
const { summarizeLead } = require("./summary");

async function handleCommand(input) {
  const latestMessage = await getLatestLeadMessage(db);
  if (!latestMessage) {
    return {
      status: "empty",
      received: Boolean(input && input.text),
      message: "No lead message found."
    };
  }

  const draft = buildProposalDraft(latestMessage);
  const summary = summarizeLead(latestMessage, draft);

  return {
    status: "proposal_ready",
    received: Boolean(input && input.text),
    summary,
    draft
  };
}

module.exports = {
  handleCommand
};
