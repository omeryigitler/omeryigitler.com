const test = require("node:test");
const assert = require("node:assert/strict");
const handler = require("../api/agent");
const { readJson } = handler._test;

function responseRecorder() {
  return {
    statusCode: 200,
    headers: {},
    body: "",
    setHeader(name, value) { this.headers[name.toLowerCase()] = value; },
    end(value = "") { this.body = value; }
  };
}

test("rejects unknown agent actions before loading privileged dependencies", async () => {
  const response = responseRecorder();
  await handler({ method: "GET", query: { action: "delete_everything" }, headers: {} }, response);
  assert.equal(response.statusCode, 404);
  assert.equal(JSON.parse(response.body).code, "unknown_action");
});

test("enforces the action-specific HTTP method before authentication", async () => {
  const response = responseRecorder();
  await handler({ method: "GET", query: { action: "approve" }, headers: {} }, response);
  assert.equal(response.statusCode, 405);
  assert.equal(response.headers.allow, "POST");
});

test("enforces the body limit even when Vercel already parsed JSON", async () => {
  await assert.rejects(
    readJson({ body: { text: "x".repeat(65 * 1024) } }),
    { code: "body_too_large", statusCode: 413 }
  );
});
