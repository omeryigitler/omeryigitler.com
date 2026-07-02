const MAX_BODY_BYTES = 64 * 1024;

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
    console.error("[agent] backend initialization failed:", error?.message);
    const unavailable = new Error("Agent backend is not configured for this environment.");
    unavailable.statusCode = 503;
    unavailable.code = "agent_not_configured";
    throw unavailable;
  }
}

function loadTasks() {
  try {
    return require("../lib/agent-tasks");
  } catch (error) {
    console.error("[agent] task backend initialization failed:", error?.message);
    const unavailable = new Error("Agent task backend is not configured for this environment.");
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
  const getActions = new Set(["status", "todos", "agenda"]);
  const postActions = new Set(["command", "approve", "todo", "event"]);
  if (!getActions.has(action) && !postActions.has(action)) {
    return sendJson(res, 404, { ok: false, code: "unknown_action", error: "Unknown agent action." });
  }

  if (getActions.has(action) && req.method !== "GET") return methodNotAllowed(res, ["GET"]);
  if (postActions.has(action) && req.method !== "POST") return methodNotAllowed(res, ["POST"]);

  try {
    const agent = loadAgent();
    const actor = await agent.verifyAgentRequest(req);

    if (action === "status") {
      const approvals = await agent.listPendingApprovals();
      return sendJson(res, 200, { ok: true, approvals });
    }
    if (action === "todos") {
      const todos = await loadTasks().listTodos({ includeDone: req.query?.all === "1" });
      return sendJson(res, 200, { ok: true, todos });
    }
    if (action === "agenda") {
      const events = await loadTasks().listAgenda({});
      return sendJson(res, 200, { ok: true, events });
    }

    const body = await readJson(req);
    if (action === "command") {
      const result = await agent.handleCommand({ text: body.text || body.command, actor });
      return sendJson(res, 200, { ok: true, ...result });
    }
    if (action === "todo") {
      const tasks = loadTasks();
      const op = String(body.op || "add").toLowerCase();
      if (op === "complete") {
        const todo = await tasks.completeTodo({ todoId: body.id, matchText: body.title, actorId: actor.id });
        return sendJson(res, 200, { ok: true, todo });
      }
      const todo = await tasks.addTodo({ title: body.title, dueDateKey: body.dueDateKey || null, actorId: actor.id });
      return sendJson(res, 200, { ok: true, todo });
    }
    if (action === "event") {
      const event = await loadTasks().addEvent({
        title: body.title,
        dateKey: body.dateKey,
        time: body.time || null,
        actorId: actor.id
      });
      return sendJson(res, 200, { ok: true, event });
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
