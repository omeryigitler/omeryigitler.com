const crypto = require('node:crypto');
const { settings, entitlement, assertFreeExecution, assertIsolatedPreview, failure } = require('./studio-policy');

// Dependencies are injected so tests never need credentials or external calls.
function createEngine({ db, env = process.env, now = Date.now }) {
  const configRef = db.collection('studio_config').doc('ai');
  const leaseRef = db.collection('studio_runtime').doc('ai');
  async function status() {
    const config = settings((await configRef.get()).data());
    return { settings: config, provider: { name: 'Gemini', ...entitlement(env, now()) },
      paidExecutionAvailable: false, costStatus: 'Model dışı giderler dahil değildir; sağlayıcı faturası doğrulanmadı.' };
  }
  async function save(value, actorId) {
    assertIsolatedPreview(env);
    const { validateSettings } = require('./studio-policy');
    const config = validateSettings(value);
    const batch = db.batch();
    batch.set(configRef, { ...config, updatedAt: now(), updatedBy: actorId });
    batch.set(db.collection('studio_audit').doc(), { action: 'ai_settings', actorId, settings: config, at: now() });
    await batch.commit();
    return status();
  }
  async function reserve(taskId, model, requestId) {
    return db.runTransaction(async tx => {
      const [configDoc, leasesDoc] = await Promise.all([tx.get(configRef), tx.get(leaseRef)]);
      const config = settings(configDoc.data());
      assertFreeExecution(config, entitlement(env, now()));
      if (!entitlement(env, now()).models.includes(model)) throw failure('model_not_allowed', 'Model ücretsiz izin listesinde değil.');
      const day = new Date(now()).toISOString().slice(0, 10);
      const dayRef = db.collection('studio_usage_days').doc(day);
      const taskRef = db.collection('studio_usage_tasks').doc(taskId);
      const [dayDoc, taskDoc] = await Promise.all([tx.get(dayRef), tx.get(taskRef)]);
      const requests = dayDoc.data()?.requests || 0;
      const taskRequests = taskDoc.data()?.requests || 0;
      const leases = Object.fromEntries(Object.entries(leasesDoc.data()?.leases || {}).filter(([, expiry]) => expiry > now()));
      if (requests >= config.maxRequestsPerDay || taskRequests >= config.maxRequestsPerTask) throw failure('request_limit', 'İstek sınırı doldu; görev bekletildi.');
      if (Object.keys(leases).length >= config.maxConcurrency) throw failure('concurrency_limit', 'AI meşgul; görev daha sonra sürdürülebilir.');
      tx.set(leaseRef, { leases: { ...leases, [requestId]: now() + 60000 } });
      tx.set(dayRef, { requests: requests + 1, day });
      tx.set(taskRef, { requests: taskRequests + 1, updatedAt: now() });
      tx.set(db.collection('studio_usage').doc(requestId), { taskId, model, provider: 'gemini', startedAt: now(), status: 'running', estimatedModelCostEur: 0, confirmedCostEur: null });
    });
  }
  async function finish(requestId, result, error) {
    await db.runTransaction(async tx => {
      const doc = await tx.get(leaseRef);
      const leases = { ...(doc.data()?.leases || {}) };
      delete leases[requestId];
      tx.set(leaseRef, { leases });
      const usage = result?.response?.usageMetadata || {};
      tx.set(db.collection('studio_usage').doc(requestId), {
        finishedAt: now(), status: error ? 'failed' : 'completed',
        errorCode: error ? (isQuota(error) ? 'quota_exhausted' : 'provider_error') : null,
        inputTokens: Number(usage.promptTokenCount) || 0, outputTokens: Number(usage.candidatesTokenCount) || 0
      }, { merge: true });
    });
  }
  async function generate(buildModel, runModel, { taskId = crypto.randomUUID() } = {}) {
    assertIsolatedPreview(env);
    if (!/^[a-zA-Z0-9_-]{1,100}$/.test(taskId)) throw failure('invalid_task', 'Geçersiz görev.', 400);
    const initial = await status();
    assertFreeExecution(initial.settings, initial.provider);
    let lastError;
    for (const model of initial.provider.models.slice(0, initial.settings.maxRequestsPerTask)) {
      const requestId = crypto.randomUUID();
      await reserve(taskId, model, requestId);
      let result, error;
      try { result = await runModel(buildModel(model)); } catch (cause) { error = cause; }
      // An accounting failure stops the chain; it cannot trigger another call.
      await finish(requestId, result, error);
      if (!error) return result;
      lastError = error;
      if (!isQuota(error)) throw failure('provider_error', 'AI sağlayıcısı yanıt veremedi; yeniden deneme durduruldu.', 503);
    }
    if (lastError) throw failure('quota_exhausted', 'İzin verilen ücretsiz modellerin kotası doldu. Ücretli çağrı yapılmadı.');
    throw failure('billing_unverified', 'İzin verilen model yok.');
  }
  return { status, save, generate };
}
function isQuota(error) { return error?.status === 429 || /429|quota|rate.?limit/i.test(String(error?.message || '')); }
function engine() {
  return createEngine({ db: require('../api/_firebaseAdmin').db });
}
module.exports = { createEngine, engine };
