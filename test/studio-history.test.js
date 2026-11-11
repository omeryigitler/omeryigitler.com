const test = require('node:test');
const assert = require('node:assert/strict');
const { createHistory, visible } = require('../lib/studio-history');
const { createRecords } = require('../lib/studio-records');
const { createRunner } = require('../lib/studio-runner');
const { defaultSettings } = require('../lib/studio-leads');
const { cleanup } = require('../scripts/cleanup-studio-history');

function database(seed = {}) {
  const data = new Map(Object.entries(seed)); let sequence = 0, queue = Promise.resolve();
  const ref = (name, id) => ({ id, key: `${name}/${id}`, get: async () => snap(name, id), set: async value => data.set(`${name}/${id}`, structuredClone(value)) });
  const snap = (name, id) => ({ id, ref: ref(name, id), exists: data.has(`${name}/${id}`), data: () => structuredClone(data.get(`${name}/${id}`)) });
  return { data, collection: name => ({ doc: (id = `audit-${++sequence}`) => ref(name, id), orderBy: (field, direction) => ({ limit: max => ({ get: async () => ({ docs: [...data.entries()].filter(([key]) => key.startsWith(`${name}/`)).sort((a, b) => ((a[1][field] || 0) - (b[1][field] || 0)) * (direction === 'desc' ? -1 : 1)).slice(0, max).map(([key]) => snap(name, key.slice(name.length + 1))) }) }) }) }),
    runTransaction(fn) {
      const work = queue.then(async () => {
        let writing = false; const writes = [];
        const result = await fn({ get: async ref => { assert.equal(writing, false); return ref.get(); }, set: (ref, value, options) => { writing = true; writes.push(() => data.set(ref.key, options?.merge ? { ...data.get(ref.key), ...structuredClone(value) } : structuredClone(value))); } });
        writes.forEach(write => write()); return result;
      }); queue = work.catch(() => {}); return work;
    }
  };
}
const NOW = Date.parse('2026-11-11T14:30:00Z'), actor = { id: 'admin' }, production = { VERCEL: '1', VERCEL_ENV: 'production' };
const job = { kind: 'discovery', status: 'failed', title: 'Discover Hotels & guest houses · Sliema / St Julian’s', attempts: 1,
  options: { country: 'MT', region: 'sliema', industry: 'hospitality', limit: 3 }, errorCode: 'runner_failed', createdAt: Date.parse('2026-11-10T20:36:00Z'), updatedAt: NOW - 60000 };
const audit = db => [...db.data.values()].filter(row => row.action?.startsWith('job_history_'));

test('removing history hides only the run while retaining companies, concepts and run evidence', async () => {
  const company = { name: 'Company', draft: { revision: 'legacy-run-1', status: 'review' } };
  const db = database({ 'studio_jobs/legacy-run-1': job, 'studio_prospects/company': company });
  await createHistory(db, () => NOW, {}).change({ id: 'legacy-run-1', operation: 'remove' }, actor);
  assert.equal(visible(db.data.get('studio_jobs/legacy-run-1')), false);
  assert.deepEqual(db.data.get('studio_prospects/company'), company);
  assert.equal(db.data.get('studio_jobs/legacy-run-1').errorCode, 'runner_failed');
  assert.equal(db.data.get('studio_jobs/legacy-run-1').attempts, 1);
  assert.equal((await createRecords(db).list()).jobs.length, 0);
  assert.equal(audit(db).length, 1);
});
test('Undo restores the same history entry; repeated remove and restore are idempotent', async () => {
  const db = database({ 'studio_jobs/legacy-run-1': job }), history = createHistory(db, () => NOW, {});
  const input = { id: 'legacy-run-1', operation: 'remove' };
  assert.equal((await history.change(input, actor)).changed, true);
  assert.equal((await history.change(input, actor)).changed, false);
  assert.equal((await history.change({ ...input, operation: 'restore' }, actor)).changed, true);
  assert.equal((await history.change({ ...input, operation: 'restore' }, actor)).changed, false);
  assert.equal((await createRecords(db).list()).jobs[0].id, input.id); assert.equal(audit(db).length, 2);
});
test('active tasks and pending reviews cannot be removed from history', async () => {
  for (const status of ['queued', 'running', 'paused', 'review']) {
    const initial = { ...job, status }, db = database({ 'studio_jobs/legacy-run-1': initial });
    await assert.rejects(createHistory(db, () => NOW, {}).change({ id: 'legacy-run-1', operation: 'remove' }, actor), { code: 'run_not_finished' });
    assert.deepEqual(db.data.get('studio_jobs/legacy-run-1'), initial); assert.equal(audit(db).length, 0);
  }
});
test('invalid requests, missing runs and unisolated previews cannot mutate history', async () => {
  const db = database({ 'studio_jobs/legacy-run-1': job });
  for (const input of [{ id: '../studio_prospects/company', operation: 'remove' }, { id: 'legacy-run-1', operation: 'delete_everything' }]) {
    await assert.rejects(createHistory(db, () => NOW, {}).change(input, actor), { code: 'invalid_history_action' });
  }
  await assert.rejects(createHistory(db, () => NOW, {}).change({ id: 'not-found-run', operation: 'remove' }, actor), { code: 'not_found' });
  await assert.rejects(createHistory(db, () => NOW, { VERCEL_ENV: 'preview' }).change({ id: 'legacy-run-1', operation: 'remove' }, actor), { code: 'preview_backend_not_isolated' });
  assert.equal(db.data.size, 1);
});
test('removed runs cannot be restarted by a stale tab; restoring keeps their attempt history', async () => {
  const db = database({ 'studio_jobs/legacy-run-1': job }), history = createHistory(db, () => NOW, {}); let calls = 0;
  const runner = createRunner({ db, env: {}, now: () => NOW, pricing: defaultSettings(), discover: async () => { calls++; return []; } });
  await history.change({ id: 'legacy-run-1', operation: 'remove' }, actor);
  await assert.rejects(runner.run('legacy-run-1', actor), { code: 'job_removed' });
  assert.equal(calls, 0); assert.equal(db.data.get('studio_jobs/legacy-run-1').attempts, 1);
  await history.change({ id: 'legacy-run-1', operation: 'restore' }, actor); await runner.run('legacy-run-1', actor);
  assert.equal(calls, 1); assert.equal(db.data.get('studio_jobs/legacy-run-1').attempts, 2);
});
test('one-time cleanup does not initialize a database outside Vercel production', async () => {
  for (const env of [{}, { VERCEL: '1', VERCEL_ENV: 'preview' }, { VERCEL_ENV: 'production' }]) {
    const result = await cleanup({ collection() { assert.fail('No database access expected'); } }, () => NOW, env);
    assert.equal(result.status, 'skipped_non_production');
  }
});
test('authorized cleanup removes the unique old Sliema entry and leaves other/new runs and concepts intact', async () => {
  const other = { ...job, options: { ...job.options, region: 'valletta' } }, newer = { ...job, createdAt: NOW };
  const db = database({ 'studio_jobs/legacy-run-1': job, 'studio_jobs/other-run-1': other, 'studio_jobs/newer-run-1': newer, 'studio_prospects/company': { draft: { status: 'approved' } } });
  const result = await cleanup(db, () => NOW, production);
  assert.equal(result.jobId, 'legacy-run-1'); assert.equal(result.verifiedHidden, true);
  assert.deepEqual(db.data.get('studio_jobs/other-run-1'), other); assert.deepEqual(db.data.get('studio_jobs/newer-run-1'), newer);
  assert.equal(db.data.get('studio_prospects/company').draft.status, 'approved');
  assert.equal((await cleanup(db, () => NOW, production)).status, 'already_done'); assert.equal(audit(db).length, 1);
  await createHistory(db, () => NOW, production).change({ id: 'legacy-run-1', operation: 'restore' }, actor);
  await cleanup(db, () => NOW, production); assert.equal(visible(db.data.get('studio_jobs/legacy-run-1')), true);
});
test('cleanup refuses zero or multiple matches without changing any run', async () => {
  for (const seed of [{}, { 'studio_jobs/legacy-run-1': job, 'studio_jobs/legacy-run-2': job }]) {
    const db = database(seed);
    await assert.rejects(cleanup(db, () => NOW, production), { code: 'cleanup_match_count' });
    assert.deepEqual([...db.data.entries()], Object.entries(seed));
  }
});
test('a run started during cleanup selection is protected by the transaction', async () => {
  const db = database({ 'studio_jobs/legacy-run-1': job }), transaction = db.runTransaction;
  db.runTransaction = fn => { db.data.set('studio_jobs/legacy-run-1', { ...job, status: 'running' }); return transaction.call(db, fn); };
  await assert.rejects(cleanup(db, () => NOW, production), { code: 'run_not_finished' });
  assert.equal(db.data.get('studio_jobs/legacy-run-1').historyRemovedAt, undefined); assert.equal(audit(db).length, 0);
});
