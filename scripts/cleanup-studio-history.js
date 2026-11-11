// User-requested removal of the single old Sliema run shown on 11 November.
// Executes once on a reviewed production deployment, using the server's existing
// Firebase identity. No credential is retrieved, copied, printed or sent out.
const { createHistory, visible } = require('../lib/studio-history');
const migration = '2026-11-11-remove-old-sliema-run';
const cutoff = Date.parse('2026-11-11T12:00:00Z');
function matches(job) {
  return job.kind === 'discovery' && ['failed', 'cancelled', 'completed', 'approved'].includes(job.status) &&
    job.options?.country === 'MT' && job.options?.region === 'sliema' && job.options?.industry === 'hospitality' &&
    Number.isSafeInteger(job.createdAt) && job.createdAt < cutoff;
}
async function cleanup(db, now = Date.now, env = process.env) {
  if (env.VERCEL !== '1' || env.VERCEL_ENV !== 'production') return { migration, status: 'skipped_non_production' };
  const receipt = db.collection('studio_migrations').doc(migration);
  const previous = (await receipt.get()).data();
  if (previous?.status === 'done') return { migration, status: 'already_done', jobId: previous.jobId };
  const docs = await db.collection('studio_jobs').orderBy('createdAt', 'desc').limit(100).get();
  const candidates = docs.docs.filter(doc => matches(doc.data()));
  // The screenshot contains one run. Never select arbitrarily or bulk-remove
  // history when production data differs from the authorized request.
  if (candidates.length !== 1) throw Object.assign(new Error('Expected one matching old run'), { code: 'cleanup_match_count', count: candidates.length });
  const ref = candidates[0].ref;
  const result = await createHistory(db, now, env).change({ id: ref.id, operation: 'remove' }, { id: 'user-requested-history-cleanup' });
  if (visible((await ref.get()).data())) throw Object.assign(new Error('Removal was not verified'), { code: 'cleanup_not_verified' });
  await receipt.set({ status: 'done', jobId: ref.id, at: now() });
  return { migration, status: 'removed', jobId: ref.id, changed: result.changed, verifiedHidden: true };
}
if (require.main === module) {
  (async () => {
    if (process.env.VERCEL !== '1' || process.env.VERCEL_ENV !== 'production') return;
    const result = await cleanup(require('../api/_firebaseAdmin').db);
    console.info('[studio-history-cleanup]', JSON.stringify(result));
  })().catch(error => {
    console.error('[studio-history-cleanup]', JSON.stringify({ code: /^[a-z_]{1,60}$/.test(error?.code || '') ? error.code : 'cleanup_failed', ...(Number.isInteger(error?.count) ? { count: error.count } : {}) }));
    process.exitCode = 1;
  });
}
module.exports = { matches, cleanup };
