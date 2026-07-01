const test = require("node:test");
const assert = require("node:assert/strict");
const Module = require("node:module");

const originalLoad = Module._load;
Module._load = function patchedLoad(request, parent, isMain) {
  if (request === "./_firebaseAdmin" && parent?.filename?.endsWith("/api/contact.js")) {
    return { admin: { firestore: {} }, db: {} };
  }
  return originalLoad.call(this, request, parent, isMain);
};
const contact = require("../api/contact");
Module._load = originalLoad;

const { sanitizeConfig, verifyTurnstile } = contact._test;

test("requires a Turnstile token when production verification is configured", async () => {
  const previousSecret = process.env.TURNSTILE_SECRET;
  process.env.TURNSTILE_SECRET = "test-secret";
  try {
    const result = await verifyTurnstile("", "127.0.0.1", async () => { throw new Error("not called"); });
    assert.deepEqual(result, { ok: false, reason: "missing_token" });
  } finally {
    if (previousSecret === undefined) delete process.env.TURNSTILE_SECRET;
    else process.env.TURNSTILE_SECRET = previousSecret;
  }
});

test("accepts only successful contact tokens for an allowed hostname", async () => {
  const previousSecret = process.env.TURNSTILE_SECRET;
  process.env.TURNSTILE_SECRET = "test-secret";
  const fetchImpl = async () => ({
    ok: true,
    json: async () => ({ success: true, action: "contact", hostname: "omeryigitler.com" })
  });
  try {
    assert.deepEqual(await verifyTurnstile("valid-token", "127.0.0.1", fetchImpl), { ok: true });
  } finally {
    if (previousSecret === undefined) delete process.env.TURNSTILE_SECRET;
    else process.env.TURNSTILE_SECRET = previousSecret;
  }
});

test("rejects a token issued for another hostname", async () => {
  const previousSecret = process.env.TURNSTILE_SECRET;
  process.env.TURNSTILE_SECRET = "test-secret";
  const fetchImpl = async () => ({
    ok: true,
    json: async () => ({ success: true, action: "contact", hostname: "attacker.example" })
  });
  try {
    assert.deepEqual(await verifyTurnstile("valid-token", "127.0.0.1", fetchImpl), { ok: false, reason: "hostname_mismatch" });
  } finally {
    if (previousSecret === undefined) delete process.env.TURNSTILE_SECRET;
    else process.env.TURNSTILE_SECRET = previousSecret;
  }
});

test("fails closed when Turnstile omits the expected action or hostname", async () => {
  const previousSecret = process.env.TURNSTILE_SECRET;
  process.env.TURNSTILE_SECRET = "test-secret";
  try {
    const missingAction = async () => ({
      ok: true,
      json: async () => ({ success: true, hostname: "omeryigitler.com" })
    });
    const missingHostname = async () => ({
      ok: true,
      json: async () => ({ success: true, action: "contact" })
    });
    assert.deepEqual(await verifyTurnstile("token", "127.0.0.1", missingAction), { ok: false, reason: "action_mismatch" });
    assert.deepEqual(await verifyTurnstile("token", "127.0.0.1", missingHostname), { ok: false, reason: "hostname_mismatch" });
  } finally {
    if (previousSecret === undefined) delete process.env.TURNSTILE_SECRET;
    else process.env.TURNSTILE_SECRET = previousSecret;
  }
});

test("sanitizes configuration values at the API boundary", () => {
  assert.deepEqual(sanitizeConfig({
    country: "MT",
    siteType: "PORTAL",
    designType: "CUSTOM",
    pageCount: 500,
    features: ["seo", "seo", "malicious"],
    addons: ["logo_design", "logo_design", "malicious"],
    deliverySpeed: "URGENT",
    maintenanceLevel: "PREMIUM"
  }), {
    country: "MT",
    siteType: "PORTAL",
    designType: "CUSTOM",
    pageCount: 50,
    features: ["seo"],
    addons: ["logo_design"],
    deliverySpeed: "URGENT",
    maintenanceLevel: "PREMIUM"
  });
});

test("loads without Firebase credentials so Preview can return a structured response", () => {
  assert.equal(typeof contact, "function");
  assert.equal(typeof contact._test.verifyTurnstile, "function");
});
