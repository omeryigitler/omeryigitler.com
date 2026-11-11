const DEFAULT_SETTINGS = Object.freeze({
  enabled: true, mode: 'FREE', paused: false, automatic: false,
  premiumEnabled: false, dailyBudgetEur: 0, monthlyBudgetEur: 0, taskBudgetEur: 0,
  maxRequestsPerTask: 2, maxRequestsPerDay: 50, maxConcurrency: 1
});

function failure(code, message, statusCode = 409) {
  return Object.assign(new Error(message), { code, statusCode });
}

function settings(value = {}) {
  const result = { ...DEFAULT_SETTINGS };
  for (const key of ['enabled', 'paused', 'automatic']) {
    if (typeof value[key] === 'boolean') result[key] = value[key];
  }
  if (['FREE', 'HYBRID'].includes(value.mode)) result.mode = value.mode;
  for (const [key, max] of [['maxRequestsPerTask', 3], ['maxRequestsPerDay', 500], ['maxConcurrency', 3]]) {
    if (Number.isInteger(value[key]) && value[key] > 0 && value[key] <= max) result[key] = value[key];
  }
  // Paid adapters are deliberately unavailable until pricing + authorization
  // reservations are implemented. Neither mode nor a forged document enables one.
  return result;
}

function validateSettings(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw failure('invalid_settings', 'Valid settings are required.', 400);
  const normalized = settings(value);
  for (const [key, val] of Object.entries(value)) {
    if (!(key in normalized) || normalized[key] !== val) throw failure('invalid_settings', `Invalid or unsupported setting: ${key}`, 400);
  }
  return normalized;
}

// Reviewed against Google's Standard free-tier table on 2026-11-11.
const FREE_AGENT_MODELS = ['gemini-2.5-flash-lite'];
function credentialBinding(env) {
  return require('node:crypto').createHash('sha256').update(env.GEMINI_API_KEY || '').digest('hex');
}
function entitlement(env = process.env, now = Date.now(), confirmation = {}) {
  const expires = Date.parse(env.STUDIO_FREE_VERIFIED_UNTIL || '');
  const models = [...new Set(String(env.STUDIO_FREE_MODELS || '').split(',').map(s => s.trim()).filter(s => /^gemini-[a-z0-9.-]{1,80}$/.test(s)))].slice(0, 3);
  const serverVerified = env.STUDIO_GEMINI_BILLING === 'verified_free' && expires > now && models.length > 0;
  const ownerVerified = confirmation.billingDisabled === true && confirmation.expiresAt > now &&
    confirmation.expiresAt <= now + 7 * 86400000 && confirmation.credentialBinding === credentialBinding(env) &&
    Array.isArray(confirmation.models) && confirmation.models.length === 1 && FREE_AGENT_MODELS.includes(confirmation.models[0]);
  const until = serverVerified ? expires : ownerVerified ? confirmation.expiresAt : null;
  return { verified: serverVerified || ownerVerified, expiresAt: until ? new Date(until).toISOString() : null,
    models: serverVerified ? models : ownerVerified ? confirmation.models : [], configured: Boolean(env.GEMINI_API_KEY),
    verificationSource: serverVerified ? 'server' : ownerVerified ? 'owner_confirmation' : null, availableModels: FREE_AGENT_MODELS };
}

function assertFreeExecution(config, verified) {
  if (!config.enabled) throw failure('ai_disabled', 'AI is off. Standard workspace tools remain available.');
  if (config.paused) throw failure('ai_paused', 'AI tasks are paused.');
  if (!verified.configured) throw failure('provider_missing', 'The Gemini server credential is not configured.');
  if (!verified.verified) throw failure('billing_unverified', 'Free-tier access is not verified. Requests are blocked to prevent spending.');
}

function assertIsolatedPreview(env = process.env) {
  if (env.VERCEL_ENV === 'preview' && env.STUDIO_PREVIEW_ISOLATED !== 'true') {
    throw failure('preview_backend_not_isolated', 'An isolated preview backend is not verified. Studio actions are blocked.', 503);
  }
}

module.exports = { DEFAULT_SETTINGS, settings, validateSettings, entitlement, assertFreeExecution, assertIsolatedPreview, failure, FREE_AGENT_MODELS, credentialBinding };
