const test = require('node:test');
const assert = require('node:assert/strict');
const { createRunner } = require('../lib/studio-runner');
const { parameters, query, candidates, createDiscovery } = require('../lib/studio-discovery');
const { publicAddress, websiteUrl, inspect, research, readWebsite } = require('../lib/studio-research');
const { makeDraft, validateCopy } = require('../lib/studio-drafts');
const { defaultSettings } = require('../lib/studio-leads');
const { prospect } = require('../lib/studio-records');

function database(seed = {}) {
  const data = new Map(Object.entries(seed)); let sequence = 0, queue = Promise.resolve();
  const snap = ref => ({ id: ref.id, exists: data.has(ref.key), data: () => structuredClone(data.get(ref.key)) });
  return { data, collection: name => ({ doc: (id = `audit-${++sequence}`) => ({ key: `${name}/${id}`, id, get: async () => snap({ key: `${name}/${id}`, id }) }) }),
    runTransaction(fn) { const work = queue.then(async () => { let writing = false; const writes = []; const result = await fn({ get: async ref => { assert.equal(writing, false, 'Firestore reads must precede writes'); return snap(ref); }, set: (ref, value, options) => { writing = true; writes.push(() => data.set(ref.key, options?.merge ? { ...data.get(ref.key), ...structuredClone(value) } : structuredClone(value))); } }); writes.forEach(fn => fn()); return result; }); queue = work.catch(() => {}); return work; },
    batch() { const writes = []; return { set: (ref, value) => writes.push(() => data.set(ref.key, value)), commit: async () => writes.forEach(fn => fn()) }; }
  };
}
const NOW = Date.parse('2026-11-10T10:00:00Z'), actor = { id: 'test-admin' };
const search = { country: 'MT', region: 'valletta', industry: 'dining', limit: 2 };
const company = { name: 'Example Café', country: 'MT', location: 'Valletta', industry: 'Restaurants & cafés', source: 'https://www.openstreetmap.org/node/123', website: null };
const row = { type: 'node', id: 123, tags: { name: 'Example Café', amenity: 'cafe' } };
function setup(options = {}) {
  const db = database(options.seed), runner = createRunner({ db, now: () => NOW, env: {}, ai: {}, pricing: defaultSettings(), discover: async () => [company], ...options });
  return { db, runner };
}
test('discovery validates the region, market, sector and bounded output before building QL', () => {
  for (const change of [{ region: 'sliema);out;' }, { country: 'TR' }, { industry: '[evil]' }, { limit: 4 }]) assert.throws(() => parameters({ ...search, ...change }), { code: 'invalid_search' });
  assert.match(query(search), /\[timeout:15\]/); assert.match(query(search), /out tags 30/);
  assert.equal(parameters({ ...search, country: 'TR', region: 'istanbul' }).country, 'TR');
});
test('directory results retain exact source URLs, deduplicate domains and exclude chain brands', () => {
  const rows = candidates({ elements: [row, { ...row, id: 124, tags: { name: 'Chain', brand: 'Chain' } }, { ...row, id: 125, tags: { name: 'Example Café' } }] }, search);
  assert.equal(rows.length, 1); assert.equal(rows[0].source, 'https://www.openstreetmap.org/node/123'); assert.equal(rows[0].website, null);
  assert.match(rows[0].notes, /does not establish/);
  assert.throws(() => candidates({ elements: [], remark: 'timeout' }, search), { code: 'directory_incomplete' });
});
test('directory caches results and enforces a shared cooldown before another external call', async () => {
  const db = database(); let calls = 0;
  const discover = createDiscovery({ db, now: () => NOW, fetchImpl: async () => { calls++; return new Response(JSON.stringify({ elements: [row] })); } });
  assert.equal((await discover(search)).length, 1); await discover(search); assert.equal(calls, 1);
  await assert.rejects(discover({ ...search, industry: 'beauty' }), { code: 'directory_limit' }); assert.equal(calls, 1);
});
test('unsafe site addresses, credentials, protocol and local domains never reach a network request', async () => {
  for (const ip of ['127.0.0.1', '10.0.0.1', '169.254.169.254', '172.16.1.1', '192.168.0.1', '100.64.1.1', '198.18.0.1', '::1', '::ffff:127.0.0.1']) assert.equal(publicAddress(ip), false, ip);
  assert.equal(publicAddress('8.8.8.8'), true);
  for (const url of ['http://example.com', 'https://127.0.0.1', 'https://user:pass@example.com', 'https://example.com:3000', 'https://example.internal']) assert.throws(() => websiteUrl(url), { code: 'unsafe_website' });
  let calls = 0;
  await assert.rejects(readWebsite('https://example.com', { lookup: async () => [{ address: '127.0.0.1', family: 4 }], request: () => { calls++; } }), { code: 'unsafe_website' });
  assert.equal(calls, 0);
});
test('website requests pin checked DNS addresses and validate redirect targets', async () => {
  const { EventEmitter } = require('node:events'); let requests = 0;
  const request = (url, options, cb) => {
    requests++; options.lookup(url.hostname, {}, (error, address) => assert.equal(address, '8.8.8.8'));
    const req = new EventEmitter(); req.destroy = error => req.emit('error', error); req.end = () => queueMicrotask(() => { const res = new EventEmitter(); res.statusCode = 302; res.headers = { location: 'https://127.0.0.1/private' }; cb(res); res.emit('end'); req.emit('close'); }); return req;
  };
  await assert.rejects(readWebsite('https://example.com', { lookup: async () => [{ address: '8.8.8.8', family: 4 }], request }), { code: 'unsafe_website' });
  assert.equal(requests, 1);
});
test('website findings are bounded structural evidence and failed inspection is not a negative quality claim', async () => {
  const checks = inspect('<title>Example</title><meta name="viewport" content="width=device-width"><script>"<h1>fake</h1>"</script>');
  assert.equal(checks.title, true); assert.equal(checks.viewport, true); assert.equal(checks.heading, false);
  const failed = await research({ ...company, website: 'https://example.com' }, { read: async () => { throw Error('private detail'); }, now: () => NOW });
  assert.equal(failed.score, 0); assert.equal(failed.status, 'unavailable'); assert.ok(!JSON.stringify(failed).includes('private detail'));
});
test('directory-only findings explicitly avoid asserting the business has no website', async () => {
  const result = await research(company, { now: () => NOW }); assert.equal(result.status, 'directory_only'); assert.match(result.limitations[0], /does not prove/);
});
test('on-demand run discovers, researches and persists private draft and estimate without creating CRM orders or messages', async () => {
  const { db, runner } = setup();
  await runner.enqueue({ ...search, kind: 'discovery', requestId: 'research-run-1' }, actor);
  const result = await runner.run('research-run-1', actor); assert.equal(result.status, 'review');
  const saved = db.data.get('studio_prospects/' + result.output[0]); assert.equal(saved.draft.status, 'review'); assert.equal(saved.draft.generatedBy, 'template'); assert.equal(saved.draft.language, 'en'); assert.equal(saved.research.score, 75); assert.ok(saved.draft.proposal.breakdown.finalTotal > 0);
  assert.equal([...db.data.keys()].some(key => /^(quotes|projects|messages|clients)\//.test(key)), false);
  assert.equal(db.data.get('studio_runtime/runner').until, 0);
});
test('finished job retry is idempotent; a conflicting enqueue cannot reuse its ID', async () => {
  let calls = 0; const { db, runner } = setup({ discover: async () => { calls++; return [company]; } });
  const input = { ...search, kind: 'discovery', requestId: 'research-run-2' };
  await runner.enqueue(input, actor); await runner.enqueue(input, actor); await runner.run(input.requestId, actor); await runner.run(input.requestId, actor); assert.equal(calls, 1);
  await assert.rejects(runner.enqueue({ ...input, industry: 'beauty' }, actor), { code: 'job_conflict' });
  assert.equal([...db.data.keys()].filter(key => key.startsWith('studio_prospects/')).length, 1);
});
test('runner saves low opportunity research without creating an automatic concept', async () => {
  const { db, runner } = setup({ inspectCompany: async () => ({ score: 30, status: 'inspected', signals: [], limitations: [] }) });
  await runner.enqueue({ ...search, kind: 'discovery', requestId: 'low-score-run' }, actor); const result = await runner.run('low-score-run', actor);
  assert.equal(result.status, 'completed'); assert.equal(db.data.get('studio_prospects/' + result.output[0]).draft, undefined);
});
test('draft review is revision-checked, auditable and sends nothing; completed reviews close the run', async () => {
  const { db, runner } = setup(); await runner.enqueue({ ...search, kind: 'discovery', requestId: 'review-run-1' }, actor); const result = await runner.run('review-run-1', actor);
  await assert.rejects(runner.decide({ prospectId: result.output[0], revision: 'stale-run-1', decision: 'approved' }, actor), { code: 'draft_changed' });
  const decision = { prospectId: result.output[0], revision: 'review-run-1', decision: 'approved' }; await runner.decide(decision, actor); await runner.decide(decision, actor);
  assert.equal(db.data.get('studio_prospects/' + result.output[0]).draft.status, 'approved'); assert.equal(db.data.get('studio_jobs/review-run-1').status, 'completed');
  assert.equal([...db.data.values()].filter(row => row.action === 'draft_approved').length, 1);
});
test('rediscovery preserves approved concepts and manually advanced sales stages', async () => {
  const { db, runner } = setup(); await runner.enqueue({ ...search, kind: 'discovery', requestId: 'first-run-id' }, actor); const first = await runner.run('first-run-id', actor);
  const key = 'studio_prospects/' + first.output[0], saved = db.data.get(key); saved.stage = 'Meeting'; saved.draft.status = 'approved';
  await runner.enqueue({ ...search, kind: 'discovery', requestId: 'second-run-id' }, actor); await runner.run('second-run-id', actor);
  assert.equal(db.data.get(key).stage, 'Meeting'); assert.equal(db.data.get(key).draft.revision, 'first-run-id'); assert.equal(db.data.get(key).draft.status, 'approved');
});
test('a single durable lease prevents concurrent duplicate execution', async () => {
  let release, started; const ready = new Promise(r => started = r), wait = new Promise(r => release = r);
  const { runner } = setup({ discover: async () => { started(); await wait; return [company]; } });
  for (const requestId of ['parallel-run-1', 'parallel-run-2']) await runner.enqueue({ ...search, kind: 'discovery', requestId }, actor);
  const pending = runner.run('parallel-run-1', actor); await ready;
  await assert.rejects(runner.run('parallel-run-2', actor), { code: 'runner_busy' }); release(); await pending;
});
test('a stopped runner commits no new company or draft after the next checkpoint', async () => {
  const { db, runner } = setup({ discover: async () => { db.data.set('studio_config/ai', { paused: true }); return [company]; } });
  await runner.enqueue({ ...search, kind: 'discovery', requestId: 'emergency-run' }, actor);
  await assert.rejects(runner.run('emergency-run', actor), { code: 'runner_paused' });
  assert.equal(db.data.get('studio_jobs/emergency-run').status, 'paused'); assert.equal([...db.data.keys()].some(key => key.startsWith('studio_prospects/')), false);
});
test('cancelled runs cannot publish their result after an in-flight request finishes', async () => {
  const { db, runner } = setup({ discover: async () => { const job = db.data.get('studio_jobs/cancelled-run'); job.status = 'cancelled'; return [company]; } });
  await runner.enqueue({ ...search, kind: 'discovery', requestId: 'cancelled-run' }, actor);
  await assert.rejects(runner.run('cancelled-run', actor), { code: 'job_cancelled' }); assert.equal(db.data.get('studio_jobs/cancelled-run').status, 'cancelled');
  assert.equal([...db.data.keys()].some(key => key.startsWith('studio_prospects/')), false);
});
test('shared production preview access is blocked before queue writes or external calls', async () => {
  const { db, runner } = setup({ env: { VERCEL_ENV: 'preview' } }); await assert.rejects(runner.enqueue({ ...search, kind: 'discovery', requestId: 'preview-run-1' }, actor), { code: 'preview_backend_not_isolated' }); assert.equal(db.data.size, 0);
});
test('Türkiye uses Turkish concept copy and TRY estimate independent of English operator UI', async () => {
  const input = { ...company, country: 'TR', location: 'İzmir', industry: 'Beauty salons' }, draft = makeDraft(input, { signals: [] }, defaultSettings(), NOW);
  assert.equal(draft.language, 'tr'); assert.equal(draft.proposal.request.country, 'TR'); assert.match(draft.headline, /dijital/);
  assert.throws(() => validateCopy({ headline: 'Incomplete' }), { code: 'invalid_copy' });
});
test('copy refinement is a separate explicit job and a failed model never masquerades as generated content', async () => {
  const { db, runner } = setup({ refine: async () => { throw Object.assign(Error('Free access unverified'), { code: 'billing_unverified', statusCode: 409 }); } });
  const id = prospect(company).id, original = makeDraft(company, { signals: [] }, defaultSettings(), NOW); original.revision = 'original-run'; db.data.set('studio_prospects/' + id, { ...company, draft: original });
  await runner.enqueue({ kind: 'copy', prospectId: id, requestId: 'copy-failed-run' }, actor); await assert.rejects(runner.run('copy-failed-run', actor), { code: 'billing_unverified' });
  assert.equal(db.data.get('studio_prospects/' + id).draft.revision, 'original-run'); assert.equal(db.data.get('studio_jobs/copy-failed-run').status, 'failed');
});
