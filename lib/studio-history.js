const { failure, assertIsolatedPreview } = require('./studio-policy');
const removable = new Set(['failed', 'cancelled', 'completed', 'approved']);
const visible = job => !job.historyRemovedAt;

function createHistory(db, now = Date.now, env = process.env) {
  async function change(input, actor) {
    assertIsolatedPreview(env);
    if (!/^[a-zA-Z0-9_-]{8,100}$/.test(input?.id || '') || !['remove', 'restore'].includes(input?.operation)) {
      throw failure('invalid_history_action', 'Select a run and a supported history action.', 400);
    }
    const ref = db.collection('studio_jobs').doc(input.id), removed = input.operation === 'remove';
    const changed = await db.runTransaction(async tx => {
      const doc = await tx.get(ref);
      if (!doc.exists) throw failure('not_found', 'The run was not found.', 404);
      const job = doc.data();
      if (!removable.has(job.status)) throw failure('run_not_finished', 'Cancel the task or finish its review before removing it from history.');
      if (Boolean(job.historyRemovedAt) === removed) return false;
      tx.set(ref, { historyRemovedAt: removed ? now() : null, historyRemovedBy: removed ? actor.id : null }, { merge: true });
      tx.set(db.collection('studio_audit').doc(), { action: removed ? 'job_history_removed' : 'job_history_restored', targetId: ref.id, actorId: actor.id, at: now() });
      return true;
    });
    return { id: ref.id, removed, changed };
  }
  return { change };
}
module.exports = { visible, createHistory, change: (...args) => createHistory(require('../api/_firebaseAdmin').db).change(...args) };
