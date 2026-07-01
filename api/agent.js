const MAX_BODY_BYTES = 64 * 1024;
const CAPABILITIES = [
  "latest_lead_summary",
  "messages_summary",
  "active_projects_summary",
  "latest_visitors_summary",
  "latest_message_proposal",
  "visitor_control_with_approval"
];

function sendJson(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.end(JSON.stringify(body));
}

function methodNotAllowed(res, methods) {
  res.setHeader("Allow", methods.join(", "));
  return sendJson(res, 405, { ok: false, code: "method_not_allowed", error: "Method not allowed." });
}

async function readJson(req) {
  if (req.body && typeof req.body === "object") {
    let serialized;
    try {
      serialized = JSON.stringify(req.body);
    } catch (cause) {
      const error = new Error("Request body must be valid JSON.");
      error.statusCode = 400;
      error.code = "invalid_json";
      throw error;
    }
    if (Buffer.byteLength(serialized, "utf8") > MAX_BODY_BYTES) {
      const error = new Error("Request body is too large.");
      error.statusCode = 413;
      error.code = "body_too_large";
      throw error;
    }
    return req.body;
  }
  const chunks = [];
  let size = 0;

  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) {
      const error = new Error("Request body is too large.");
      error.statusCode = 413;
      error.code = "body_too_large";
      throw error;
    }
    chunks.push(chunk);
  }

  if (!chunks.length) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch (cause) {
    const error = new Error("Request body must be valid JSON.");
    error.statusCode = 400;
    error.code = "invalid_json";
    throw error;
  }
}

function loadAgent() {
  try {
    return require("../lib/agent");
  } catch (error) {
    console.error("[agent] backend initialization failed");
    const unavailable = new Error("Agent backend is not configured for this environment.");
    unavailable.statusCode = 503;
    unavailable.code = "agent_not_configured";
    throw unavailable;
  }
}

function publicError(error) {
  const status = Number(error?.statusCode || 500);
  return {
    status,
    body: {
      ok: false,
      code: error?.code || (status >= 500 ? "internal_error" : "request_failed"),
      error: status >= 500 && status !== 503 ? "Internal server error." : error?.message || "Request failed."
    }
  };
}

module.exports = async function handler(req, res) {
  const action = String(req.query?.action || "").trim().toLowerCase();
  const allowed = new Set(["status", "command", "approve", "visitor"]);
  if (!allowed.has(action)) {
    return sendJson(res, 404, { ok: false, code: "unknown_action", error: "Unknown agent action." });
  }

  if (action === "status" && req.method !== "GET") return methodNotAllowed(res, ["GET"]);
  if (action !== "status" && req.method !== "POST") return methodNotAllowed(res, ["POST"]);

  try {
    const agent = loadAgent();
    const actor = await agent.verifyAgentRequest(req);

    if (action === "status") {
      const [approvals, runs] = await Promise.all([
        agent.listPendingApprovals(),
        agent.listRecentRuns()
      ]);
      return sendJson(res, 200, { ok: true, capabilities: CAPABILITIES, approvals, runs });
    }

    const body = await readJson(req);
    if (action === "command") {
      const result = await agent.handleCommand({ text: body.text || body.command, actor, source: actor.source === "api_secret" ? "api" : "admin_panel" });
      return sendJson(res, 200, { ok: true, ...result });
    }

    if (action === "visitor") {
      const result = await agent.requestVisitorCommand({
        sessionId: body.sessionId,
        command: body.command || body.action,
        message: body.message,
        text: body.text,
        actor,
        source: actor.source === "api_secret" ? "api" : "admin_panel"
      });
      return sendJson(res, 200, { ok: true, ...result });
    }

    const result = await agent.decideApproval({
      approvalId: body.approvalId,
      decision: body.decision,
      actor
    });
    return sendJson(res, 200, { ok: true, ...result });
  } catch (error) {
    const { status, body } = publicError(error);
    return sendJson(res, status, body);
  }
};

module.exports._test = { readJson };
