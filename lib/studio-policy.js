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
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw failure('invalid_settings', 'Geçerli ayarlar gerekli.', 400);
  const normalized = settings(value);
  for (const [key, val] of Object.entries(value)) {
    if (!(key in normalized) || normalized[key] !== val) throw failure('invalid_settings', `Geçersiz veya desteklenmeyen ayar: ${key}`, 400);
  }
  return normalized;
}

function entitlement(env = process.env, now = Date.now()) {
  const expires = Date.parse(env.STUDIO_FREE_VERIFIED_UNTIL || '');
  const models = [...new Set(String(env.STUDIO_FREE_MODELS || '').split(',').map(s => s.trim()).filter(s => /^gemini-[a-z0-9.-]{1,80}$/.test(s)))].slice(0, 3);
  return {
    verified: env.STUDIO_GEMINI_BILLING === 'verified_free' && expires > now && models.length > 0,
    expiresAt: Number.isFinite(expires) ? new Date(expires).toISOString() : null,
    models, configured: Boolean(env.GEMINI_API_KEY)
  };
}

function assertFreeExecution(config, verified) {
  if (!config.enabled) throw failure('ai_disabled', 'AI kapalı. Standart admin işlemleri kullanılabilir.');
  if (config.paused) throw failure('ai_paused', 'AI işleri duraklatıldı.');
  if (!verified.configured) throw failure('provider_missing', 'Gemini sunucu anahtarı yapılandırılmamış.');
  if (!verified.verified) throw failure('billing_unverified', 'Ücretsiz kullanım hakkı doğrulanmadı; harcama önlemek için çağrı engellendi.');
}

function assertIsolatedPreview(env = process.env) {
  if (env.VERCEL_ENV === 'preview' && env.STUDIO_PREVIEW_ISOLATED !== 'true') {
    throw failure('preview_backend_not_isolated', 'Preview için ayrı Firebase ortamı doğrulanmadı; Studio işlemleri engellendi.', 503);
  }
}

module.exports = { DEFAULT_SETTINGS, settings, validateSettings, entitlement, assertFreeExecution, assertIsolatedPreview, failure };
