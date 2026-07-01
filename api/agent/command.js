const { readJson, sendJson, methodNotAllowed, errorResponse } = require("../agent-core/http");

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return methodNotAllowed(res, ["POST"]);
  }

  try {
    const body = await readJson(req);
    return sendJson(res, 200, {
      ok: true,
      text: body.text || body.command || null
    });
  } catch (error) {
    const { status, body } = errorResponse(error);
    return sendJson(res, status, body);
  }
};
