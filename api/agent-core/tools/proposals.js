const { admin } = require("../../_firebaseAdmin");

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

function cleanDraft(draft) {
  const output = { ...(draft || {}) };
  delete output.action;
  delete output.sourceMessagePreview;
  return output;
}

function clientDocId(email, name) {
  const normalized = String(email || `${name || "anonymous"}-${Date.now()}@system.local`).trim().toLowerCase();
  return Buffer.from(normalized).toString("base64").replace(/[^a-zA-Z0-9]/g, "_");
}

async function ensureClient(db, payload) {
  const id = clientDocId(payload.clientEmail, payload.clientName);
  const ref = db.collection("clients").doc(id);
  const snap = await ref.get();

  if (!snap.exists) {
    await ref.set({
      name: payload.clientName || "Anonymous",
      email: String(payload.clientEmail || "").trim().toLowerCase(),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      lastContactDate: admin.firestore.FieldValue.serverTimestamp(),
      totalMessages: 0,
      totalQuotes: 0,
      totalProjects: 0,
      messageIds: [],
      quoteIds: [],
      projectIds: []
    });
  }

  return id;
}

async function nextProposalNumber(db) {
  const year = new Date().getFullYear();
  const prefix = `Q-${year}-`;
  const snapshot = await db.collection("quotes")
    .where("quoteNumber", ">=", `${prefix}000`)
    .where("quoteNumber", "<", `${prefix}ZZZ`)
    .orderBy("quoteNumber", "desc")
    .limit(1)
    .get();

  if (snapshot.empty) return `${prefix}001`;
  const last = snapshot.docs[0].data()?.quoteNumber || `${prefix}000`;
  const lastNumber = Number(String(last).split("-")[2] || 0);
  return `${prefix}${String(lastNumber + 1).padStart(3, "0")}`;
}

async function createApprovedProposal(db, draft, meta = {}) {
  const payload = cleanDraft(draft);
  const clientId = await ensureClient(db, payload);
  const quoteNumber = await nextProposalNumber(db);
  const doc = {
    ...payload,
    quoteNumber,
    clientId,
    status: "draft",
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    sentAt: null,
    pdfUrl: null,
    agentApprovalId: meta.approvalId || null,
    agentCommandId: meta.commandId || null,
    createdByAgent: true
  };

  const ref = await db.collection("quotes").add(doc);

  await db.collection("clients").doc(clientId).set({
    totalQuotes: admin.firestore.FieldValue.increment(1),
    quoteIds: admin.firestore.FieldValue.arrayUnion(ref.id),
    lastContactDate: admin.firestore.FieldValue.serverTimestamp()
  }, { merge: true });

  if (payload.messageId) {
    await db.collection("messages").doc(payload.messageId).set({
      quoteId: ref.id,
      status: "quoted"
    }, { merge: true });
  }

  return {
    id: ref.id,
    quoteNumber,
    collection: "quotes"
  };
}

module.exports = {
  buildProposalDraft,
  createApprovedProposal
};
