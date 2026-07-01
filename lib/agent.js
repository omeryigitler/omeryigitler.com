const { admin, db } = require("../api/_firebaseAdmin");

function envList(name) {
  return String(process.env[name] || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

function getHeader(req, name) {
  const target = name.toLowerCase();
  for (const [key, value] of Object.entries(req.headers || {})) {
    if (key.toLowerCase() === target) return Array.isArray(value) ? value[0] : value;
  }
  return null;
}

function authError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

async function verifyAgentRequest(req) {
  const configuredSecret = process.env.AGENT_API_SECRET;
  const providedSecret = getHeader(req, "x-agent-secret");

  if (configuredSecret && providedSecret && providedSecret === configuredSecret) {
    return { id: "agent_api_secret", source: "api_secret", role: "server" };
  }

  const authHeader = getHeader(req, "authorization") || "";
  const match = /^Bearer\s+(.+)$/i.exec(authHeader);
  if (!match) throw authError(401, "Missing Firebase ID token or agent secret");

  let decoded;
  try {
    decoded = await admin.auth().verifyIdToken(match[1]);
  } catch (error) {
    throw authError(401, "Invalid Firebase ID token");
  }

  const allowedUids = envList("AGENT_ADMIN_UIDS");
  const allowedEmails = envList("AGENT_ADMIN_EMAILS").map((email) => email.toLowerCase());
  const email = String(decoded.email || "").toLowerCase();
  const hasAdminClaim = decoded.admin === true || decoded.supervisor === true || decoded.role === "admin";
  const uidAllowed = allowedUids.includes(decoded.uid);
  const emailAllowed = email && allowedEmails.includes(email);
  const allowAnyFirebaseUser = process.env.AGENT_ALLOW_ANY_FIREBASE_USER === "true";

  if (!hasAdminClaim && !uidAllowed && !emailAllowed && !allowAnyFirebaseUser) {
    throw authError(403, "Firebase user is not authorized for agent actions");
  }

  return { id: decoded.uid, uid: decoded.uid, email: email || null, source: "firebase", role: hasAdminClaim ? "admin" : "allowed_user" };
}

function isSystemMessage(data) {
  return data?.type === "report" || data?.email === "tracker@taurus.sys";
}

function serializeTimestamp(timestamp) {
  if (!timestamp) return null;
  if (typeof timestamp.toDate === "function") return timestamp.toDate().toISOString();
  if (timestamp.seconds) return new Date(timestamp.seconds * 1000).toISOString();
  return null;
}

function timestampMs(value) {
  if (!value) return 0;
  if (typeof value.toMillis === "function") return value.toMillis();
  if (value.seconds) return value.seconds * 1000;
  return 0;
}

function normalizeMessage(doc) {
  const data = doc.data() || {};
  return {
    id: doc.id,
    name: data.name || "Anonymous",
    email: data.email || "",
    phone: data.phone || null,
    company: data.company || null,
    country: data.country || "TR",
    siteType: data.siteType || data.projectType || null,
    projectType: data.projectType || data.siteType || null,
    pageCount: data.pageCount || null,
    designType: data.designType || null,
    deliverySpeed: data.deliverySpeed || null,
    selectedAddons: Array.isArray(data.selectedAddons) ? data.selectedAddons : [],
    status: data.status || "unknown",
    message: data.message || "",
    timestamp: serializeTimestamp(data.timestamp),
    raw: data
  };
}

async function getLatestLeadMessage() {
  const snapshot = await db.collection("messages").orderBy("timestamp", "desc").limit(20).get();
  for (const doc of snapshot.docs) {
    const data = doc.data() || {};
    if (!isSystemMessage(data)) return normalizeMessage(doc);
  }
  return null;
}

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

function summarizeLead(message, draft) {
  const text = String(message?.message || "").trim();
  return {
    summary: text ? text.slice(0, 260) : "Lead message is empty or too short.",
    customerNeed: draft?.siteType || "CORPORATE",
    suggestedNextStep: "Review the generated proposal draft before approval."
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

async function ensureClient(payload) {
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

async function nextProposalNumber() {
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

async function logAudit(entry = {}) {
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

  const latestMessage = await getLatestLeadMessage();
  if (!latestMessage) {
    await commandRef.update({ status: "completed", risk: "low" });
    return { commandId: commandRef.id, status: "empty", message: "No lead message found." };
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

  await commandRef.update({ status: "waiting_approval", approvalId: approvalRef.id });
  return { commandId: commandRef.id, approvalId: approvalRef.id, status: "waiting_approval", summary, draft };
}

async function listPendingApprovals() {
  const snapshot = await db.collection("agent_approvals").where("status", "==", "pending").limit(50).get();
  return snapshot.docs
    .map((doc) => {
      const data = doc.data() || {};
      return {
        id: doc.id,
        commandId: data.commandId || null,
        runId: data.runId || null,
        requestedAction: data.requestedAction || null,
        risk: data.risk || "medium",
        payloadPreview: data.payloadPreview || {},
        status: data.status || "pending",
        requestedAt: serializeTimestamp(data.requestedAt),
        requestedAtMs: timestampMs(data.requestedAt)
      };
    })
    .sort((a, b) => b.requestedAtMs - a.requestedAtMs)
    .slice(0, 20)
    .map(({ requestedAtMs, ...approval }) => approval);
}

async function createApprovedProposal(draft, meta = {}) {
  const payload = cleanDraft(draft);
  const clientId = await ensureClient(payload);
  const quoteNumber = await nextProposalNumber();
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
    await db.collection("messages").doc(payload.messageId).set({ quoteId: ref.id, status: "quoted" }, { merge: true });
  }

  return { id: ref.id, quoteNumber, collection: "quotes" };
}

async function getPendingApproval(id) {
  if (!id) throw authError(400, "approvalId is required");
  const ref = db.collection("agent_approvals").doc(id);
  const snap = await ref.get();
  if (!snap.exists) throw authError(404, "Approval not found");
  const data = snap.data() || {};
  if (data.status !== "pending") throw authError(409, "Approval is not pending");
  return { ref, data };
}

async function decideApproval({ approvalId, decision, actor }) {
  const finalDecision = decision === "reject" ? "reject" : "approve";
  const { ref, data } = await getPendingApproval(approvalId);

  if (finalDecision === "reject") {
    await ref.update({ status: "rejected", decidedAt: admin.firestore.FieldValue.serverTimestamp(), decidedBy: actor.id });
    await logAudit({ actor: actor.id, source: "agent", action: "approval_rejected", targetType: "agent_approval", targetId: ref.id, risk: data.risk || "medium", result: "success", message: "Agent approval was rejected." });
    return { status: "rejected", approvalId: ref.id };
  }

  if (data.requestedAction !== "create_proposal") throw authError(400, "Unsupported approval action");
  const result = await createApprovedProposal(data.payloadPreview, { approvalId: ref.id, commandId: data.commandId || null });
  await ref.update({ status: "approved", decidedAt: admin.firestore.FieldValue.serverTimestamp(), decidedBy: actor.id, result });

  if (data.commandId) {
    await db.collection("agent_commands").doc(data.commandId).set({ status: "completed", approvedBy: actor.id, completedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
  }

  await logAudit({ actor: actor.id, source: "agent", action: "approval_executed", targetType: result.collection, targetId: result.id, risk: data.risk || "medium", result: "success", message: "Agent approval was approved and executed.", metadata: { approvalId: ref.id, commandId: data.commandId || null } });
  return { status: "approved", approvalId: ref.id, result };
}

module.exports = {
  verifyAgentRequest,
  handleCommand,
  listPendingApprovals,
  decideApproval
};
