function buildProposalDraft(input) {
  return {
    action: "draft_proposal",
    name: input.name || "Anonymous",
    country: input.country || "TR",
    sourceId: input.id,
    summary: String(input.message || "").slice(0, 500)
  };
}

module.exports = {
  buildProposalDraft
};
