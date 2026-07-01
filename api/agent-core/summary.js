function summarizeLead(message, draft) {
  const text = String(message?.message || "").trim();
  return {
    summary: text ? text.slice(0, 260) : "Lead message is empty or too short.",
    customerNeed: draft?.siteType || "CORPORATE",
    suggestedNextStep: "Review the generated proposal draft before approval."
  };
}

module.exports = {
  summarizeLead
};
