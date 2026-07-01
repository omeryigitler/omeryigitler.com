async function readJson(req) {
  if (req.body && typeof req.body === "object") return req.body;

  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (!chunks.length) return {};

  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw) return {};

  try {
    return JSON.parse(raw);
  } catch (error) {
    const err = new Error("Invalid JSON body");
    err.statusCode = 400;
    throw err;
  }
}

function sendJson(res, status, body, cache = "no-store") {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", cache);
  res.end(JSON.stringify(body));
}

function methodNotAllowed(res, allowedMethods) {
  res.setHeader("Allow", allowedMethods.join(", "));
  sendJson(res, 405, { error: "Method not allowed", allowedMethods });
}

function errorResponse(error) {
  const status = Number(error?.statusCode || error?.status || 500);
  return {
    status,
    body: {
      error: status >= 500 ? "Internal server error" : error.message || "Request failed",
      details: process.env.NODE_ENV === "development" ? String(error?.stack || error) : undefined
    }
  };
}

module.exports = {
  readJson,
  sendJson,
  methodNotAllowed,
  errorResponse
};
