// Explicit live integration check. Real public reads, in-memory persistence;
// no Firebase, customer messages, model credentials or production writes.
const assert = require('node:assert/strict');
const { createRunner } = require('../lib/studio-runner');
const { createDiscovery } = require('../lib/studio-discovery');
const { defaultSettings } = require('../lib/studio-leads');
const data = new Map(); let sequence = 0;
const snapshot = ref => ({ exists: data.has(ref.key), data: () => structuredClone(data.get(ref.key)) });
const db = {
  collection: name => ({ doc: (id = `check-${++sequence}`) => ({ id, key: `${name}/${id}`, get() { return Promise.resolve(snapshot(this)); } }) }),
  async runTransaction(fn) {
    const writes = [];
    const result = await fn({ get: async ref => snapshot(ref), set: (ref, value, options) => writes.push(() => data.set(ref.key, options?.merge ? { ...data.get(ref.key), ...structuredClone(value) } : structuredClone(value))) });
    writes.forEach(write => write()); return result;
  },
  batch() { const writes = []; return { set: (ref, value) => writes.push(() => data.set(ref.key, value)), commit: async () => writes.forEach(write => write()) }; }
};
async function main() {
  const started = Date.now();
  const runner = createRunner({ db, env: {}, pricing: defaultSettings(), discover: createDiscovery({ db, onAttempt: event => console.info(JSON.stringify(event)) }) });
  const id = 'live-source-check', actor = { id: 'isolated-check' };
  await runner.enqueue({ kind: 'discovery', requestId: id, country: 'MT', region: 'sliema', industry: 'hospitality', limit: 3 }, actor);
  const result = await runner.run(id, actor);
  assert.ok(result.output.length > 0, 'Expected at least one source-backed hotel in the selected area');
  const companies = result.output.map(id => data.get(`studio_prospects/${id}`));
  for (const company of companies) {
    assert.match(company.source, /^https:\/\/www\.openstreetmap\.org\/(node|way|relation)\/\d+$/);
    assert.equal(company.country, 'MT'); assert.ok(company.research);
    if (company.draft) { assert.equal(company.draft.generatedBy, 'template'); assert.ok(company.draft.proposal.breakdown.finalTotal > 0); }
  }
  console.info(JSON.stringify({ result: 'PASS', status: result.status, companies: companies.length, concepts: companies.filter(row => row.draft).length, sources: companies.map(row => row.source), unavailableInspections: companies.filter(row => row.research.status === 'unavailable').length, elapsedMs: Date.now() - started, checkedAt: new Date().toISOString() }));
}
main().catch(error => { console.error(JSON.stringify({ result: 'FAIL', code: /^[a-z_]{1,60}$/.test(error?.code || '') ? error.code : 'check_failed' })); process.exitCode = 1; });
