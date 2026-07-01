const { sendJson, methodNotAllowed } = require("../agent-core/http");

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return methodNotAllowed(res, ["POST"]);
  }

  return sendJson(res, 503, {
    ok: false,
    error: "Agent command endpoint requires auth wiring before use."
  });
};
