const PRICE_TABLE = {
  TR: { currency: "TRY", base: 15000, page: 1000 },
  MT: { currency: "EUR", base: 1500, page: 100 }
};

function numberOr(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function buildProposalDraft(input) {
  const country = String(input.country || "TR").toUpperCase() === "MT" ? "MT" : "TR";
  const pricing = PRICE_TABLE[country];
  const pageCount = numberOr(input.pageCount, 10);
  const pages = pageCount * pricing.page;
  const total = pricing.base + pages;

  return {
    action: "create_proposal",
    clientName: input.name || "Anonymous",
    clientEmail: input.email || "",
    country,
    siteType: input.siteType || input.projectType || "CORPORATE",
    pageCount,
    totalPrice: total,
    currency: pricing.currency,
    messageId: input.id,
    projectId: input.raw?.projectId || null,
    notes: "AI proposal draft generated from latest lead. Review before approval.",
    breakdown: {
      base: pricing.base,
      pages,
      subtotal: total,
      totalOneTime: total,
      discountAmount: 0,
      finalTotal: total,
      totalMonthly: 0
    },
    sourceMessagePreview: {
      name: input.name,
      email: input.email,
      text: String(input.message || "").slice(0, 500),
      timestamp: input.timestamp
    }
  };
}

module.exports = {
  buildProposalDraft
};
