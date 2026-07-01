const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

test("never returns Graph paging URLs that embed the access token", () => {
  const source = fs.readFileSync(path.join(__dirname, "..", "api", "instagram.js"), "utf8");
  assert.doesNotMatch(source, /paging:\s*data\.paging/);
  assert.match(source, /Never return Graph API next\/previous URLs/);
});

test("public Instagram handler returns cursors without next or previous URLs", async () => {
  const originalFetch = global.fetch;
  const originalToken = process.env.INSTAGRAM_ACCESS_TOKEN;
  process.env.INSTAGRAM_ACCESS_TOKEN = "test-token";
  global.fetch = async () => ({
    ok: true,
    json: async () => ({
      data: [{ id: "1", media_type: "IMAGE" }],
      paging: {
        cursors: { before: "before", after: "after" },
        next: "https://graph.instagram.com/page?access_token=secret"
      }
    })
  });
  delete require.cache[require.resolve("../api/instagram")];
  const handler = require("../api/instagram");
  const response = {
    statusCode: 200,
    headers: {},
    setHeader(name, value) { this.headers[name.toLowerCase()] = value; },
    end(value) { this.body = value; }
  };

  try {
    await handler({ method: "GET", query: { limit: "1" } }, response);
    const body = JSON.parse(response.body);
    assert.deepEqual(body.paging, { cursors: { before: "before", after: "after" } });
    assert.equal(JSON.stringify(body).includes("access_token"), false);
    assert.deepEqual(Object.keys(body.data[0]).sort(), [
      "caption", "id", "media_type", "media_url", "permalink", "thumbnail_url", "timestamp"
    ]);
  } finally {
    global.fetch = originalFetch;
    if (originalToken === undefined) delete process.env.INSTAGRAM_ACCESS_TOKEN;
    else process.env.INSTAGRAM_ACCESS_TOKEN = originalToken;
  }
});

test("bounds invalid Instagram limits and strips unexpected media fields", () => {
  const handler = require("../api/instagram");
  assert.equal(handler._test.normalizeLimit("not-a-number"), 6);
  assert.equal(handler._test.normalizeLimit("99"), 12);
  assert.deepEqual(handler._test.sanitizeMedia({ id: "1", media_type: "IMAGE", access_token: "secret" }), {
    id: "1",
    caption: "",
    media_type: "IMAGE",
    media_url: null,
    thumbnail_url: null,
    permalink: null,
    timestamp: null
  });
});
