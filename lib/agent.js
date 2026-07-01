const crypto = require("node:crypto");
const { admin, db } = require("../api/_firebaseAdmin");
const { buildPricedProposal } = require("./pricing");
const {
  SUPPORTED_INTENTS,
  maskEmail,
  validateApprovalId,
  validateCommand,
  validateDecision
} = require("./agent-validation");
const {
  cleanScreenMessage,
  validateSessionId,
  validateVisitorCommand
} = require("./visitor-command");

const APPROVAL_TTL_MS = 24 * 60 * 60 * 1000;

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

function agentError(statusCode, code, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

function normalizeSource(value) {
  return value === "telegram" ? "telegram" : value === "api" ? "api" : "admin_panel";
}

function secretsEqual(expected, provided) {
  if (!expected || !provided) return false;
  const left = Buffer.from(String(expected));
  const right = Buffer.from(String(provided));
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

async function verifyAgentRequest(req) {
  const configuredSecret = process.env.AGENT_API_SECRET;
  const providedSecret = getHeader(req, "x-agent-secret");

  if (secretsEqual(configuredSecret, providedSecret)) {
    return { id: "agent_api_secret", source: "api_secret", role: "server" };
  }

  const authHeader = getHeader(req, "authorization") || "";
  const match = /^Bearer\s+(.+)$/i.exec(authHeader);
  if (!match) throw agentError(401, "authentication_required", "Firebase oturumu veya agent secret gereklidir.");

  let decoded;
  try {
    decoded = await admin.auth().verifyIdToken(match[1], true);
  } catch (error) {
    throw agentError(401, "invalid_token", "Firebase oturumu geçersiz veya süresi dolmuş.");
  }

  const allowedUids = envList("AGENT_ADMIN_UIDS");
  const allowedEmails = envList("AGENT_ADMIN_EMAILS").map((email) => email.toLowerCase());
  const email = String(decoded.email || "").toLowerCase();
  const hasAdminClaim = decoded.admin === true || decoded.supervisor === true || decoded.role === "admin";
  const uidAllowed = allowedUids.includes(decoded.uid);
  const emailAllowed = decoded.email_verified === true && email && allowedEmails.includes(email);

  if (!hasAdminClaim && !uidAllowed && !emailAllowed) {
    throw agentError(403, "agent_forbidden", "Bu hesap agent işlemleri için yetkili değil.");
  }

  return {
    id: decoded.uid,
    uid: decoded.uid,
    email: email || null,
    source: "firebase",
    role: hasAdminClaim ? "admin" : "allowed_user"
  };
}

function isSystemMessage(data) {
  return data?.type === "report" || data?.email === "tracker@taurus.sys" || data?.source === "system";
}

function timestampMs(value) {
  if (!value) return 0;
  if (typeof value.toMillis === "function") return value.toMillis();
  if (typeof value.toDate === "function") return value.toDate().getTime();
  if (value.seconds) return value.seconds * 1000;
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function serializeTimestamp(value) {
  const millis = timestampMs(value);
  return millis ? new Date(millis).toISOString() : null;
}

function normalizeMessage(doc) {
  const data = doc.data() || {};
  const projectConfig = data.config && typeof data.config === "object" ? data.config : {};
  const recordedAt = data.createdAt || data.timestamp || null;

  return {
    id: doc.id,
    name: data.name || "Anonymous",
    email: data.email || "",
    phone: data.phone || null,
    company: data.company || null,
    country: data.country || projectConfig.country || "TR",
    siteType: data.siteType || data.projectType || projectConfig.siteType || null,
    projectType: data.projectType || data.siteType || projectConfig.siteType || null,
    pageCount: data.pageCount || projectConfig.pageCount || null,
    designType: data.designType || projectConfig.designType || null,
    deliverySpeed: data.deliverySpeed || projectConfig.deliverySpeed || null,
    maintenanceLevel: data.maintenanceLevel || projectConfig.maintenanceLevel || null,
    features: Array.isArray(data.features) ? data.features : projectConfig.features || [],
    selectedAddons: Array.isArray(data.selectedAddons) ? data.selectedAddons : projectConfig.addons || [],
    status: data.status || "new",
    read: data.read === true,
    message: data.message || "",
    timestamp: serializeTimestamp(recordedAt),
    recordedAtMs: timestampMs(recordedAt),
    projectId: data.projectId || null,
    pricingInput: { ...data, ...projectConfig }
  };
}

async function queryLatestMessages(field, limit = 50) {
  try {
    const snapshot = await db.collection("messages").orderBy(field, "desc").limit(limit).get();
    return { ok: true, docs: snapshot.docs };
  } catch (error) {
    console.warn(`[agent] latest lead query failed for ${field}`);
    return { ok: false, docs: [] };
  }
}

async function getRecentLeadMessages(limit = 50) {
  const [createdResult, legacyResult] = await Promise.all([
    queryLatestMessages("createdAt", limit),
    queryLatestMessages("timestamp", limit)
  ]);
  if (!createdResult.ok && !legacyResult.ok) {
    throw agentError(503, "lead_query_unavailable", "Lead kayıtları şu anda okunamıyor.");
  }
  const byId = new Map();

  for (const doc of [...createdResult.docs, ...legacyResult.docs]) {
    if (!byId.has(doc.id)) byId.set(doc.id, doc);
  }

  return [...byId.values()]
    .filter((doc) => !isSystemMessage(doc.data() || {}))
    .map(normalizeMessage)
    .sort((left, right) => right.recordedAtMs - left.recordedAtMs)
    .slice(0, limit);
}

async function getLatestLeadMessage() {
  return (await getRecentLeadMessages(20))[0] || null;
}

function summarizeLead(message, proposal) {
  const text = String(message?.message || "").replace(/\s+/g, " ").trim();
  return {
    summary: text ? text.slice(0, 260) : "Lead mesajında açıklama bulunmuyor.",
    customerNeed: proposal.siteType,
    suggestedNextStep: "Fiyat ve kapsamı kontrol edip teklif taslağını açıkça onaylayın."
  };
}

function buildProposalPreview(message) {
  const priced = buildPricedProposal(message.pricingInput || message);
  return {
    action: "create_proposal",
    messageId: message.id,
    projectId: message.projectId || null,
    clientName: message.name || "Anonymous",
    clientEmailMasked: maskEmail(message.email),
    ...priced,
    notes: `Agent scope draft; pricing config ${priced.pricingVersion}.`
  };
}

function localDateKey(milliseconds) {
  if (!milliseconds) return null;
  const timeZone = process.env.AGENT_TIME_ZONE || "Europe/Malta";
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).format(new Date(milliseconds));
  } catch (error) {
    return new Date(milliseconds).toISOString().slice(0, 10);
  }
}

function messagePreview(message) {
  const text = String(message.message || "").replace(/\s+/g, " ").trim();
  return {
    id: message.id,
    name: message.name,
    email: maskEmail(message.email),
    projectType: message.projectType || message.siteType || null,
    status: message.status,
    read: message.read === true,
    receivedAt: message.timestamp,
    summary: text ? text.slice(0, 180) : "Açıklama yok."
  };
}

async function summarizeLatestLead() {
  const message = await getLatestLeadMessage();
  if (!message) return { summary: "Uygun lead mesajı bulunamadı.", data: { lead: null } };
  return {
    summary: `${message.name} için son lead bulundu: ${String(message.message || "Açıklama yok.").replace(/\s+/g, " ").trim().slice(0, 220)}`,
    data: { lead: messagePreview(message) }
  };
}

async function summarizeMessages(options = {}) {
  const messages = await getRecentLeadMessages(100);
  const today = localDateKey(Date.now());
  const filtered = messages.filter((message) => {
    if (options.todayOnly && localDateKey(message.recordedAtMs) !== today) return false;
    if (options.unreadOnly && message.read === true) return false;
    return true;
  }).slice(0, 20);
  const scope = options.todayOnly ? "bugünkü" : options.unreadOnly ? "okunmamış" : "son";
  return {
    summary: filtered.length
      ? `${filtered.length} ${scope} lead mesajı bulundu.`
      : `${scope[0].toLocaleUpperCase("tr-TR")}${scope.slice(1)} lead mesajı bulunamadı.`,
    data: { count: filtered.length, messages: filtered.map(messagePreview) }
  };
}

async function summarizeActiveProjects() {
  let snapshot;
  try {
    snapshot = await db.collection("projects").limit(100).get();
  } catch (error) {
    throw agentError(503, "project_query_unavailable", "Proje kayıtları şu anda okunamıyor.");
  }
  const terminalStatuses = new Set(["completed", "done", "cancelled", "canceled", "archived", "rejected"]);
  const projects = snapshot.docs
    .map((doc) => {
      const data = doc.data() || {};
      return {
        id: doc.id,
        name: data.projectName || data.name || "Untitled Project",
        clientName: data.clientName || "—",
        status: data.status || "active",
        stage: data.workflowStage || null,
        progress: Number(data.progress || 0),
        dueDate: data.dueDate || null,
        budget: Number(data.budget || 0),
        currency: data.currency || "TRY",
        updatedAt: serializeTimestamp(data.lastUpdated || data.createdAt),
        updatedAtMs: timestampMs(data.lastUpdated || data.createdAt)
      };
    })
    .filter((project) => !terminalStatuses.has(String(project.status).toLowerCase()))
    .sort((left, right) => right.updatedAtMs - left.updatedAtMs)
    .slice(0, 20)
    .map(({ updatedAtMs, ...project }) => project);
  return {
    summary: projects.length ? `${projects.length} aktif/bekleyen proje bulundu.` : "Aktif veya bekleyen proje bulunamadı.",
    data: { count: projects.length, projects }
  };
}

function visitorLocation(data) {
  const city = data.location?.city || data.city || "Unknown";
  const country = data.location?.country || data.country || "";
  return [city, country].filter(Boolean).join(", ");
}

function visitorDevice(data) {
  if (typeof data.device === "string") return data.device;
  return data.device?.model || data.device?.type || data.browser || "Unknown";
}

async function queryLatestVisitors(limit = 10) {
  for (const field of ["last_seen", "startTime"]) {
    try {
      const snapshot = await db.collection("visitors_v1").orderBy(field, "desc").limit(limit).get();
      return snapshot.docs;
    } catch (error) {
      console.warn(`[agent] visitor query failed for ${field}`);
    }
  }
  throw agentError(503, "visitor_query_unavailable", "Ziyaretçi kayıtları şu anda okunamıyor.");
}

async function summarizeLatestVisitors() {
  const docs = await queryLatestVisitors(10);
  const now = Date.now();
  const visitors = docs.map((doc) => {
    const data = doc.data() || {};
    const lastSeenMs = timestampMs(data.last_seen || data.startTime);
    return {
      sessionId: doc.id,
      location: visitorLocation(data),
      device: visitorDevice(data),
      browser: data.browser || null,
      online: Boolean(lastSeenMs && now - lastSeenMs < 3 * 60 * 1000),
      lastSeen: serializeTimestamp(data.last_seen || data.startTime)
    };
  });
  return {
    summary: visitors.length
      ? `${visitors.length} son ziyaretçi oturumu bulundu; ${visitors.filter((visitor) => visitor.online).length} tanesi çevrimiçi.`
      : "Ziyaretçi oturumu bulunamadı.",
    data: { count: visitors.length, visitors }
  };
}

async function executeReadCommand({ command, actor, source, toolName, reader }) {
  const actorId = actor?.id || "unknown";
  const commandRef = db.collection("agent_commands").doc();
  const runRef = db.collection("agent_runs").doc();
  const auditRef = db.collection("agent_audit_logs").doc();
  const startedAt = admin.firestore.Timestamp.now();

  try {
    const result = await reader(command.options || {});
    const batch = db.batch();
    batch.set(commandRef, {
      source,
      text: command.text,
      normalizedIntent: command.intent,
      status: "completed",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      completedAt: admin.firestore.FieldValue.serverTimestamp(),
      createdBy: actorId,
      risk: "low",
      relatedRunId: runRef.id
    });
    batch.set(runRef, {
      commandId: commandRef.id,
      source,
      intent: command.intent,
      status: "completed",
      model: "deterministic-v2",
      startedAt,
      completedAt: admin.firestore.FieldValue.serverTimestamp(),
      summary: result.summary,
      error: null,
      toolCalls: [{
        name: toolName,
        input: command.options || {},
        outputSummary: result.summary,
        status: "success",
        at: admin.firestore.Timestamp.now()
      }]
    });
    batch.set(auditRef, auditRecord({
      actor: actorId,
      source,
      action: command.intent,
      targetType: toolName.split(".")[0],
      risk: "low",
      result: "success",
      message: result.summary,
      metadata: { commandId: commandRef.id, runId: runRef.id }
    }));
    await batch.commit();
    return {
      commandId: commandRef.id,
      runId: runRef.id,
      status: "completed",
      intent: command.intent,
      ...result
    };
  } catch (error) {
    const batch = db.batch();
    batch.set(commandRef, {
      source,
      text: command.text,
      normalizedIntent: command.intent,
      status: "failed",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      completedAt: admin.firestore.FieldValue.serverTimestamp(),
      createdBy: actorId,
      risk: "low",
      relatedRunId: runRef.id
    });
    batch.set(runRef, {
      commandId: commandRef.id,
      source,
      intent: command.intent,
      status: "failed",
      model: "deterministic-v2",
      startedAt,
      completedAt: admin.firestore.FieldValue.serverTimestamp(),
      summary: null,
      error: error.code || "read_failed",
      toolCalls: [{ name: toolName, input: command.options || {}, outputSummary: "Read failed", status: "failed", at: admin.firestore.Timestamp.now() }]
    });
    batch.set(auditRef, auditRecord({
      actor: actorId,
      source,
      action: command.intent,
      targetType: toolName.split(".")[0],
      risk: "low",
      result: "failed",
      message: "Agent read tool failed.",
      metadata: { commandId: commandRef.id, runId: runRef.id, code: error.code || "read_failed" }
    }));
    await batch.commit();
    throw error;
  }
}

function clientDocId(email, name, stableFallback) {
  const normalized = String(email || `${name || "anonymous"}-${stableFallback || "agent"}@system.local`).trim().toLowerCase();
  return Buffer.from(normalized).toString("base64").replace(/[^a-zA-Z0-9]/g, "_");
}

function quoteNumberForApproval(approvalId) {
  const year = new Date().getUTCFullYear();
  // Keep agent identifiers outside the legacy Q-YYYY-NNN range so the existing
  // numeric quote counter cannot parse an agent id as its next sequence value.
  return `QA-${year}-${approvalId.slice(0, 8).toUpperCase()}`;
}

function auditRecord(entry = {}) {
  return {
    actor: entry.actor || "system",
    source: entry.source || "agent",
    action: entry.action || "agent_action",
    targetType: entry.targetType || null,
    targetId: entry.targetId || null,
    risk: entry.risk || "low",
    result: entry.result || "success",
    message: entry.message || "",
    metadata: entry.metadata || {},
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  };
}

async function handleProposalCommand({ command, actor, source }) {
  const actorId = actor?.id || "unknown";
  const commandRef = db.collection("agent_commands").doc();
  const runRef = db.collection("agent_runs").doc();
  const auditRef = db.collection("agent_audit_logs").doc();
  const latestMessage = await getLatestLeadMessage();
  const batch = db.batch();

  if (!latestMessage) {
    batch.set(commandRef, {
      source,
      text: command.text,
      normalizedIntent: command.intent,
      status: "completed",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      completedAt: admin.firestore.FieldValue.serverTimestamp(),
      createdBy: actorId,
      risk: "low",
      relatedRunId: runRef.id
    });
    batch.set(runRef, {
      commandId: commandRef.id,
      status: "completed",
      source,
      intent: command.intent,
      model: "deterministic-v2",
      startedAt: admin.firestore.FieldValue.serverTimestamp(),
      completedAt: admin.firestore.FieldValue.serverTimestamp(),
      summary: "No lead message found.",
      error: null,
      toolCalls: [{ name: "messages.getLatest", status: "success", outputSummary: "No lead found" }]
    });
    batch.set(auditRef, auditRecord({
      actor: actorId,
      source,
      action: "latest_lead_checked",
      targetType: "message",
      risk: "low",
      result: "success",
      message: "Agent checked the latest lead; no eligible lead was found.",
      metadata: { commandId: commandRef.id, runId: runRef.id }
    }));
    await batch.commit();
    return { commandId: commandRef.id, runId: runRef.id, status: "empty", message: "Uygun lead mesajı bulunamadı." };
  }

  const approvalRef = db.collection("agent_approvals").doc();
  const preview = buildProposalPreview(latestMessage);
  const summary = summarizeLead(latestMessage, preview);
  const expiresAt = admin.firestore.Timestamp.fromMillis(Date.now() + APPROVAL_TTL_MS);

  batch.set(commandRef, {
    source,
    text: command.text,
    normalizedIntent: command.intent,
    status: "waiting_approval",
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    createdBy: actorId,
    approvedBy: null,
    relatedRunId: runRef.id,
    approvalId: approvalRef.id,
    risk: "medium"
  });
  batch.set(runRef, {
    commandId: commandRef.id,
    status: "waiting_approval",
    source,
    intent: command.intent,
    model: "deterministic-v2",
    startedAt: admin.firestore.FieldValue.serverTimestamp(),
    completedAt: null,
    summary: summary.summary,
    error: null,
    toolCalls: [{
      name: "messages.getLatest",
      input: {},
      outputSummary: `Lead ${latestMessage.id} selected`,
      status: "success",
      at: admin.firestore.Timestamp.now()
    }]
  });
  batch.set(approvalRef, {
    commandId: commandRef.id,
    runId: runRef.id,
    source,
    requestedAction: "create_proposal",
    risk: "medium",
    payloadPreview: preview,
    status: "pending",
    requestedAt: admin.firestore.FieldValue.serverTimestamp(),
    expiresAt,
    decidedAt: null,
    decidedBy: null
  });
  batch.set(auditRef, auditRecord({
    actor: actorId,
    source,
    action: "approval_requested",
    targetType: "agent_approval",
    targetId: approvalRef.id,
    risk: "medium",
    result: "requires_approval",
    message: "Agent prepared a proposal draft and requested approval.",
    metadata: { commandId: commandRef.id, runId: runRef.id, messageId: latestMessage.id }
  }));
  await batch.commit();

  return {
    commandId: commandRef.id,
    runId: runRef.id,
    approvalId: approvalRef.id,
    status: "waiting_approval",
    summary,
    draft: preview
  };
}

async function requestVisitorCommand(input = {}) {
  const command = validateVisitorCommand(input.command || input.action);
  const source = normalizeSource(input.source || input.actor?.source);
  const actorId = input.actor?.id || "unknown";
  const message = command === "FREEZE" ? cleanScreenMessage(input.message || "") : null;
  let sessionDoc;

  if (input.sessionId) {
    const sessionId = validateSessionId(input.sessionId);
    const snapshot = await db.collection("visitors_v1").doc(sessionId).get();
    if (!snapshot.exists) throw agentError(404, "visitor_session_not_found", "Ziyaretçi oturumu bulunamadı.");
    sessionDoc = { id: snapshot.id || sessionId, data: () => snapshot.data() || {} };
  } else {
    sessionDoc = (await queryLatestVisitors(1))[0] || null;
    if (!sessionDoc) throw agentError(404, "visitor_session_not_found", "Aktif ziyaretçi oturumu bulunamadı.");
  }

  const sessionData = sessionDoc.data() || {};
  const commandRef = db.collection("agent_commands").doc();
  const runRef = db.collection("agent_runs").doc();
  const approvalRef = db.collection("agent_approvals").doc();
  const auditRef = db.collection("agent_audit_logs").doc();
  const expiresAt = admin.firestore.Timestamp.fromMillis(Date.now() + APPROVAL_TTL_MS);
  const preview = {
    action: "visitor_command",
    sessionId: sessionDoc.id,
    command,
    message,
    location: visitorLocation(sessionData),
    device: visitorDevice(sessionData),
    lastSeen: serializeTimestamp(sessionData.last_seen || sessionData.startTime)
  };
  const batch = db.batch();

  batch.set(commandRef, {
    source,
    text: String(input.text || `${command} ${sessionDoc.id}`).slice(0, 2000),
    normalizedIntent: SUPPORTED_INTENTS.VISITOR_CONTROL,
    status: "waiting_approval",
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    createdBy: actorId,
    approvedBy: null,
    relatedRunId: runRef.id,
    approvalId: approvalRef.id,
    risk: "high"
  });
  batch.set(runRef, {
    commandId: commandRef.id,
    source,
    intent: SUPPORTED_INTENTS.VISITOR_CONTROL,
    status: "waiting_approval",
    model: "deterministic-v2",
    startedAt: admin.firestore.FieldValue.serverTimestamp(),
    completedAt: null,
    summary: `${command} komutu ${sessionDoc.id} oturumu için onay bekliyor.`,
    error: null,
    toolCalls: [{
      name: "visitors.requestCommand",
      input: { sessionId: sessionDoc.id, command, hasMessage: Boolean(message) },
      outputSummary: "High-risk visitor command queued for approval",
      status: "success",
      at: admin.firestore.Timestamp.now()
    }]
  });
  batch.set(approvalRef, {
    commandId: commandRef.id,
    runId: runRef.id,
    source,
    requestedAction: "visitor_command",
    risk: "high",
    payloadPreview: preview,
    status: "pending",
    requestedAt: admin.firestore.FieldValue.serverTimestamp(),
    expiresAt,
    decidedAt: null,
    decidedBy: null
  });
  batch.set(auditRef, auditRecord({
    actor: actorId,
    source,
    action: "approval_requested",
    targetType: "visitor_session",
    targetId: sessionDoc.id,
    risk: "high",
    result: "requires_approval",
    message: `Visitor ${command} command requires approval.`,
    metadata: { commandId: commandRef.id, runId: runRef.id, approvalId: approvalRef.id }
  }));
  await batch.commit();

  return {
    commandId: commandRef.id,
    runId: runRef.id,
    approvalId: approvalRef.id,
    status: "waiting_approval",
    intent: SUPPORTED_INTENTS.VISITOR_CONTROL,
    summary: `${command} komutu açık onay bekliyor.`,
    draft: preview
  };
}

async function handleCommand(input = {}) {
  const command = validateCommand(input.text);
  const source = normalizeSource(input.source || input.actor?.source);

  if (command.intent === SUPPORTED_INTENTS.LATEST_MESSAGE_PROPOSAL) {
    return handleProposalCommand({ command, actor: input.actor, source });
  }
  if (command.intent === SUPPORTED_INTENTS.VISITOR_CONTROL) {
    return requestVisitorCommand({
      ...command.options,
      text: command.text,
      actor: input.actor,
      source
    });
  }

  const readers = {
    [SUPPORTED_INTENTS.LATEST_LEAD_SUMMARY]: ["messages.getLatest", summarizeLatestLead],
    [SUPPORTED_INTENTS.MESSAGES_SUMMARY]: ["messages.summarize", summarizeMessages],
    [SUPPORTED_INTENTS.ACTIVE_PROJECTS_SUMMARY]: ["projects.listActive", summarizeActiveProjects],
    [SUPPORTED_INTENTS.LATEST_VISITORS_SUMMARY]: ["visitors.summarizeLatest", summarizeLatestVisitors]
  };
  const selected = readers[command.intent];
  if (!selected) throw agentError(422, "unsupported_command", "Bu Agent komutu henüz desteklenmiyor.");
  return executeReadCommand({
    command,
    actor: input.actor,
    source,
    toolName: selected[0],
    reader: selected[1]
  });
}

async function listRecentRuns() {
  let snapshot;
  try {
    snapshot = await db.collection("agent_runs").orderBy("startedAt", "desc").limit(10).get();
  } catch (error) {
    console.warn("[agent] recent runs query failed");
    return [];
  }
  return snapshot.docs.map((doc) => {
    const data = doc.data() || {};
    return {
      id: doc.id,
      commandId: data.commandId || null,
      source: data.source || "admin_panel",
      intent: data.intent || null,
      status: data.status || "unknown",
      summary: data.summary || null,
      error: data.error || null,
      startedAt: serializeTimestamp(data.startedAt),
      completedAt: serializeTimestamp(data.completedAt),
      toolCalls: Array.isArray(data.toolCalls)
        ? data.toolCalls.slice(-5).map((tool) => ({
          name: tool.name || "unknown",
          status: tool.status || "unknown",
          outputSummary: tool.outputSummary || null
        }))
        : []
    };
  });
}

async function listPendingApprovals() {
  const snapshot = await db.collection("agent_approvals").where("status", "==", "pending").limit(50).get();
  const now = Date.now();

  return snapshot.docs
    .map((doc) => {
      const data = doc.data() || {};
      return {
        id: doc.id,
        commandId: data.commandId || null,
        runId: data.runId || null,
        source: data.source || "admin_panel",
        requestedAction: data.requestedAction || null,
        risk: data.risk || "medium",
        payloadPreview: data.payloadPreview || {},
        status: data.status || "pending",
        requestedAt: serializeTimestamp(data.requestedAt),
        expiresAt: serializeTimestamp(data.expiresAt),
        requestedAtMs: timestampMs(data.requestedAt),
        expiresAtMs: timestampMs(data.expiresAt)
      };
    })
    .filter((approval) => !approval.expiresAtMs || approval.expiresAtMs > now)
    .sort((left, right) => right.requestedAtMs - left.requestedAtMs)
    .slice(0, 20)
    .map(({ requestedAtMs, expiresAtMs, ...approval }) => approval);
}

async function decideApproval({ approvalId, decision, actor }) {
  const safeApprovalId = validateApprovalId(approvalId);
  const finalDecision = validateDecision(decision);
  const actorId = actor?.id || "unknown";
  const approvalRef = db.collection("agent_approvals").doc(safeApprovalId);

  return db.runTransaction(async (transaction) => {
    const approvalSnap = await transaction.get(approvalRef);
    if (!approvalSnap.exists) throw agentError(404, "approval_not_found", "Onay kaydı bulunamadı.");

    const approval = approvalSnap.data() || {};
    if (approval.status === "approved" && finalDecision === "approve" && approval.result) {
      return { status: "approved", approvalId: approvalRef.id, result: approval.result, idempotent: true };
    }
    if (approval.status === "rejected" && finalDecision === "reject") {
      return { status: "rejected", approvalId: approvalRef.id, idempotent: true };
    }
    if (approval.status !== "pending") {
      throw agentError(409, "approval_not_pending", "Onay kaydı artık beklemede değil.");
    }
    if (timestampMs(approval.expiresAt) && timestampMs(approval.expiresAt) <= Date.now()) {
      throw agentError(409, "approval_expired", "Onay kaydının süresi dolmuş.");
    }
    if (!["create_proposal", "visitor_command"].includes(approval.requestedAction)) {
      throw agentError(400, "unsupported_approval_action", "Desteklenmeyen onay işlemi.");
    }

    const commandRef = approval.commandId ? db.collection("agent_commands").doc(approval.commandId) : null;
    const runRef = approval.runId ? db.collection("agent_runs").doc(approval.runId) : null;
    const auditRef = db.collection("agent_audit_logs").doc();

    if (finalDecision === "reject") {
      transaction.update(approvalRef, {
        status: "rejected",
        decidedAt: admin.firestore.FieldValue.serverTimestamp(),
        decidedBy: actorId
      });
      if (commandRef) transaction.set(commandRef, {
        status: "rejected",
        completedAt: admin.firestore.FieldValue.serverTimestamp(),
        approvedBy: actorId
      }, { merge: true });
      if (runRef) transaction.set(runRef, {
        status: "rejected",
        completedAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
      transaction.set(auditRef, auditRecord({
        actor: actorId,
        source: approval.source || actor?.source || "agent",
        action: "approval_rejected",
        targetType: "agent_approval",
        targetId: approvalRef.id,
        risk: approval.risk || "medium",
        result: "success",
        message: "Agent approval was rejected.",
        metadata: { commandId: approval.commandId || null, runId: approval.runId || null }
      }));
      return { status: "rejected", approvalId: approvalRef.id };
    }

    if (approval.requestedAction === "visitor_command") {
      const sessionId = validateSessionId(approval.payloadPreview?.sessionId);
      const command = validateVisitorCommand(approval.payloadPreview?.command);
      const message = command === "FREEZE" ? cleanScreenMessage(approval.payloadPreview?.message || "") : null;
      const sessionRef = db.collection("visitors_v1").doc(sessionId);
      const sessionSnap = await transaction.get(sessionRef);
      if (!sessionSnap.exists) {
        throw agentError(409, "visitor_session_missing", "Ziyaretçi oturumu artık bulunamıyor.");
      }
      const result = { sessionId, command, message };

      transaction.set(sessionRef, {
        action: command.toLowerCase(),
        message,
        action_timestamp: admin.firestore.FieldValue.serverTimestamp(),
        agentApprovalId: approvalRef.id
      }, { merge: true });
      transaction.update(approvalRef, {
        status: "approved",
        decidedAt: admin.firestore.FieldValue.serverTimestamp(),
        decidedBy: actorId,
        result
      });
      if (commandRef) transaction.set(commandRef, {
        status: "completed",
        approvedBy: actorId,
        completedAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
      if (runRef) transaction.set(runRef, {
        status: "completed",
        completedAt: admin.firestore.FieldValue.serverTimestamp(),
        toolCalls: admin.firestore.FieldValue.arrayUnion({
          name: "visitors.dispatchCommand",
          input: { approvalId: approvalRef.id, sessionId, command, hasMessage: Boolean(message) },
          outputSummary: `${command} delivered to ${sessionId}`,
          status: "success",
          at: admin.firestore.Timestamp.now()
        })
      }, { merge: true });
      transaction.set(auditRef, auditRecord({
        actor: actorId,
        source: approval.source || actor?.source || "agent",
        action: "approval_executed",
        targetType: "visitor_session",
        targetId: sessionId,
        risk: "high",
        result: "success",
        message: `Approved visitor ${command} command was dispatched.`,
        metadata: {
          approvalId: approvalRef.id,
          commandId: approval.commandId || null,
          runId: approval.runId || null,
          hasMessage: Boolean(message)
        }
      }));

      return { status: "approved", approvalId: approvalRef.id, result };
    }

    const messageId = approval.payloadPreview?.messageId;
    if (!messageId) throw agentError(409, "approval_payload_invalid", "Onay kaydı kaynak mesajı içermiyor.");

    const messageRef = db.collection("messages").doc(messageId);
    const quoteRef = db.collection("quotes").doc(`agent_${safeApprovalId}`);
    const [messageSnap, quoteSnap] = await Promise.all([
      transaction.get(messageRef),
      transaction.get(quoteRef)
    ]);

    if (!messageSnap.exists) throw agentError(409, "source_message_missing", "Kaynak lead mesajı artık bulunamıyor.");
    const messageData = messageSnap.data() || {};
    if (messageData.quoteId && messageData.quoteId !== quoteRef.id) {
      throw agentError(409, "proposal_already_exists", "Bu lead için zaten bir teklif bulunuyor.");
    }

    const normalizedMessage = normalizeMessage({ id: messageRef.id, data: () => messageData });
    // Execute the immutable scope shown to the operator, not mutable source data.
    const priced = buildPricedProposal(approval.payloadPreview || {});
    const clientId = clientDocId(normalizedMessage.email, normalizedMessage.name, normalizedMessage.id);
    const clientRef = db.collection("clients").doc(clientId);
    const clientSnap = await transaction.get(clientRef);
    const quoteNumber = quoteNumberForApproval(safeApprovalId);
    const result = { id: quoteRef.id, quoteNumber, collection: "quotes" };

    if (!quoteSnap.exists) {
      transaction.create(quoteRef, {
        quoteNumber,
        clientId,
        clientName: normalizedMessage.name || "Anonymous",
        clientEmail: String(normalizedMessage.email || "").trim().toLowerCase(),
        country: priced.country,
        siteType: priced.siteType,
        designType: priced.designType,
        pageCount: priced.pageCount,
        features: priced.features,
        selectedAddons: priced.selectedAddons,
        deliverySpeed: priced.deliverySpeed,
        maintenanceLevel: priced.maintenanceLevel,
        totalPrice: priced.totalPrice,
        currency: priced.currency,
        breakdown: priced.breakdown,
        pricingVersion: priced.pricingVersion,
        status: "draft",
        messageId: normalizedMessage.id,
        projectId: normalizedMessage.projectId || null,
        notes: `Agent draft created from approved scope using pricing ${priced.pricingVersion}.`,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        sentAt: null,
        pdfUrl: null,
        agentApprovalId: approvalRef.id,
        agentCommandId: approval.commandId || null,
        createdByAgent: true
      });
      transaction.set(clientRef, {
        name: normalizedMessage.name || "Anonymous",
        email: String(normalizedMessage.email || "").trim().toLowerCase(),
        ...(clientSnap.exists ? {} : {
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          totalMessages: 0,
          totalProjects: 0,
          messageIds: [],
          projectIds: []
        }),
        lastContactDate: admin.firestore.FieldValue.serverTimestamp(),
        totalQuotes: admin.firestore.FieldValue.increment(1),
        quoteIds: admin.firestore.FieldValue.arrayUnion(quoteRef.id)
      }, { merge: true });
    }

    transaction.set(messageRef, {
      quoteId: quoteRef.id,
      status: "quoted",
      lastUpdated: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    transaction.update(approvalRef, {
      status: "approved",
      decidedAt: admin.firestore.FieldValue.serverTimestamp(),
      decidedBy: actorId,
      result
    });
    if (commandRef) transaction.set(commandRef, {
      status: "completed",
      approvedBy: actorId,
      completedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    if (runRef) transaction.set(runRef, {
      status: "completed",
      completedAt: admin.firestore.FieldValue.serverTimestamp(),
      toolCalls: admin.firestore.FieldValue.arrayUnion({
        name: "quotes.createDraft",
        input: { approvalId: approvalRef.id, messageId },
        outputSummary: `Created ${quoteNumber}`,
        status: "success",
        at: admin.firestore.Timestamp.now()
      })
    }, { merge: true });
    transaction.set(auditRef, auditRecord({
      actor: actorId,
      source: approval.source || actor?.source || "agent",
      action: "approval_executed",
      targetType: "quotes",
      targetId: quoteRef.id,
      risk: approval.risk || "medium",
      result: "success",
      message: "Approved agent proposal was created atomically.",
      metadata: {
        approvalId: approvalRef.id,
        commandId: approval.commandId || null,
        runId: approval.runId || null,
        messageId,
        pricingVersion: priced.pricingVersion
      }
    }));

    return { status: "approved", approvalId: approvalRef.id, result };
  });
}

module.exports = {
  decideApproval,
  handleCommand,
  listPendingApprovals,
  listRecentRuns,
  requestVisitorCommand,
  verifyAgentRequest
};
