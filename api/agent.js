const { verifyAgentRequest, handleCommand, listPendingApprovals, decideApproval } = require("../lib/agent");

async function readJson(req) {
  if (req.body && typeof req.body === "object") return req.body;
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (!chunks.length) return {};
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw) return {};
  return JSON.parse(raw);
}

function sendJson(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(body));
}

function errorResponse(error) {
  const status = Number(error?.statusCode || error?.status || 500);
  return {
    status,
    body: {
      error: status >= 500 ? "Internal server error" : error.message || "Request failed"
    }
  };
}

function methodNotAllowed(res, allowedMethods) {
  res.setHeader("Allow", allowedMethods.join(", "));
  return sendJson(res, 405, { ok: false, error: "Method not allowed", allowedMethods });
}

module.exports = async (req, res) => {
  const action = String(req.query?.action || "").toLowerCase();

  try {
    const actor = await verifyAgentRequest(req);

    if (action === "status") {
      if (req.method !== "GET") return methodNotAllowed(res, ["GET"]);
      const approvals = await listPendingApprovals();
      return sendJson(res, 200, { ok: true, approvals });
    }

    if (req.method !== "POST") return methodNotAllowed(res, ["POST"]);
    const body = await readJson(req);

    if (action === "approve") {
      const result = await decideApproval({ approvalId: body.approvalId, decision: body.decision, actor });
      return sendJson(res, 200, { ok: true, ...result });
    }

    const result = await handleCommand({
      text: body.text || body.command,
      source: body.source || "admin_panel",
      actor
    });
    return sendJson(res, 200, { ok: true, ...result });
  } catch (error) {
    const { status, body } = errorResponse(error);
    return sendJson(res, status, { ok: false, ...body });
  }
};
