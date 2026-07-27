const test = require("node:test");
const assert = require("node:assert/strict");
const { verifyGoogleAgentRequest } = require("../lib/google-agent-auth");

function requestWithToken(token) {
  return { headers: token ? { "x-google-id-token": token } : {} };
}

function jsonResponse(status, body) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body
  };
}

test("returns null when the Startpage token header is absent", async () => {
  const actor = await verifyGoogleAgentRequest(requestWithToken(null), {
    fetchImpl: async () => {
      throw new Error("fetch must not run");
    }
  });
  assert.equal(actor, null);
});

test("accepts a verified allowlisted Google account", async () => {
  const previousEmails = process.env.AGENT_ADMIN_EMAILS;
  const previousAudiences = process.env.STARTPAGE_GOOGLE_CLIENT_IDS;
  process.env.AGENT_ADMIN_EMAILS = "admin@example.com";
  process.env.STARTPAGE_GOOGLE_CLIENT_IDS = "startpage-client";

  try {
    const actor = await verifyGoogleAgentRequest(requestWithToken("valid-token"), {
      fetchImpl: async (url) => {
        assert.match(String(url), /id_token=valid-token/);
        return jsonResponse(200, {
          sub: "google-user-1",
          email: "admin@example.com",
          email_verified: "true",
          aud: "startpage-client",
          exp: Math.floor(Date.now() / 1000) + 3600
        });
      }
    });

    assert.deepEqual(actor, {
      id: "google:google-user-1",
      uid: "google-user-1",
      email: "admin@example.com",
      source: "google_startpage",
      role: "allowed_user"
    });
  } finally {
    if (previousEmails === undefined) delete process.env.AGENT_ADMIN_EMAILS;
    else process.env.AGENT_ADMIN_EMAILS = previousEmails;
    if (previousAudiences === undefined) delete process.env.STARTPAGE_GOOGLE_CLIENT_IDS;
    else process.env.STARTPAGE_GOOGLE_CLIENT_IDS = previousAudiences;
  }
});

test("rejects a Google account outside the allowlist", async () => {
  const previousEmails = process.env.AGENT_ADMIN_EMAILS;
  process.env.AGENT_ADMIN_EMAILS = "admin@example.com";

  try {
    await assert.rejects(
      verifyGoogleAgentRequest(requestWithToken("other-token"), {
        fetchImpl: async () => jsonResponse(200, {
          sub: "google-user-2",
          email: "other@example.com",
          email_verified: true,
          exp: Math.floor(Date.now() / 1000) + 3600
        })
      }),
      (error) => error?.code === "agent_forbidden" && error?.statusCode === 403
    );
  } finally {
    if (previousEmails === undefined) delete process.env.AGENT_ADMIN_EMAILS;
    else process.env.AGENT_ADMIN_EMAILS = previousEmails;
  }
});
