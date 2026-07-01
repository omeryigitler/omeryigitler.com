const { readJson, sendJson, methodNotAllowed, errorResponse } = require("../agent-core/http");
const { handleCommand } = require("../agent-core/router");

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return methodNotAllowed(res, ["POST"]);
  }

  try {
    const body = await readJson(req);
    const result = await handleCommand({
      text: body.text || body.command,
      source: body.source || "admin_panel",
      actor: { id: "pending-auth" }
    });
    return sendJson(res, 200, {
      ok: true,
      ...result
    });
  } catch (error) {
    const { status, body } = errorResponse(error);
    return sendJson(res, status, body);
  }
};
