const crypto = require('node:crypto');
const { failure, settings, assertIsolatedPreview } = require('./studio-policy');
const { parameters, REGIONS, INDUSTRIES, DIRECTORY_MESSAGES, createDiscovery } = require('./studio-discovery');
const { prospect } = require('./studio-records');
const { research } = require('./studio-research');
const { makeDraft, refineCopy } = require('./studio-drafts');
const idPattern = /^[a-zA-Z0-9_-]{8,100}$/;
const companyPattern = /^[a-f0-9]{32}$/;
const digest = value => crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
function createRunner({ db, env = process.env, now = Date.now, discover, inspectCompany = research, refine = refineCopy, ai, pricing, logger = console } = {}) {
  const find = discover || createDiscovery({ db, now, onAttempt: attempt => logger.info('[studio-directory]', attempt) });
  const configRef = db.collection('studio_config').doc('ai');
  const leaseRef = db.collection('studio_runtime').doc('runner');
  const jobs = db.collection('studio_jobs');
  function active(config) {
    assertIsolatedPreview(env);
    const value = settings(config);
    if (!value.enabled || value.paused) throw failure('runner_paused', 'The runner is paused in AI controls. Your records and drafts remain available.');
  }
  async function status() {
    const config = settings((await configRef.get()).data());
    return { available: true, paused: !config.enabled || config.paused, provider: 'OpenStreetMap / bounded HTTPS inspection',
      regions: Object.entries(REGIONS).map(([id, value]) => ({ id, label: value.label, country: value.country })),
      industries: Object.entries(INDUSTRIES).map(([id, value]) => ({ id, label: value.label })),
      maxCompanies: 3, schedule: 'on_demand', paidExecutionAvailable: false };
  }
  async function enqueue(input, actor) {
    assertIsolatedPreview(env);
    if (!idPattern.test(input.requestId || '')) throw failure('invalid_request_id', 'A stable request identifier is required.', 400);
    if (!['discovery', 'draft', 'copy'].includes(input.kind)) throw failure('invalid_job', 'Select a supported runner task.', 400);
    const options = input.kind === 'discovery' ? parameters(input) : { prospectId: input.prospectId };
    if (input.kind === 'discovery' && input.automation === true) options.automation = true;
    if (input.kind !== 'discovery' && !companyPattern.test(options.prospectId || '')) throw failure('invalid_prospect', 'Select a company record.', 400);
    const fingerprint = digest({ kind: input.kind, options }), ref = jobs.doc(input.requestId);
    await db.runTransaction(async tx => {
      const [existing, config, company] = await Promise.all([tx.get(ref), tx.get(configRef), input.kind !== 'discovery' ? tx.get(db.collection('studio_prospects').doc(options.prospectId)) : null]);
      active(config.data());
      if (existing.exists) {
        if (existing.data().fingerprint !== fingerprint) throw failure('job_conflict', 'This request identifier belongs to another task.');
        return;
      }
      if (input.kind !== 'discovery' && !company.exists) throw failure('not_found', 'Company not found.', 404);
      if (input.kind === 'copy' && !company.data()?.draft) throw failure('draft_required', 'Prepare a concept before refining its copy.', 400);
      tx.set(ref, { kind: input.kind, fingerprint, options, prospectId: options.prospectId || null,
        title: input.kind === 'discovery' ? `Discover ${INDUSTRIES[options.industry].label} · ${REGIONS[options.region].label}` : `${input.kind === 'copy' ? 'Refine copy' : 'Research & concept'} · ${company.data().name}`,
        role: input.kind === 'discovery' ? 'Research' : input.kind === 'copy' ? 'Copywriter' : 'Design',
        status: 'queued', attempts: 0, createdAt: now(), updatedAt: now(), createdBy: actor.id, steps: [] });
      tx.set(db.collection('studio_audit').doc(), { action: 'runner_queued', targetId: ref.id, actorId: actor.id, at: now() });
    });
    return { id: ref.id };
  }
  async function run(id, actor) {
    if (!idPattern.test(id || '')) throw failure('invalid_job', 'Invalid task.', 400);
    const ref = jobs.doc(id), token = crypto.randomUUID();
    const job = await db.runTransaction(async tx => {
      const [doc, lease, config] = await Promise.all([tx.get(ref), tx.get(leaseRef), tx.get(configRef)]);
      if (!doc.exists || !['discovery', 'draft', 'copy'].includes(doc.data().kind)) throw failure('unsupported_job', 'This planning task has no executor. Create a research or concept task.', 400);
      const data = doc.data();
      if (data.historyRemovedAt) throw failure('job_removed', 'This task was removed from run history. Restore it before retrying.');
      if (['completed', 'review', 'approved', 'cancelled'].includes(data.status)) return null;
      active(config.data());
      if (lease.data()?.until > now()) throw failure('runner_busy', 'Another task is running. Its lease must finish before a retry.');
      if (data.attempts >= 3) throw failure('attempt_limit', 'This task reached its retry limit. Review the error before starting a new task.');
      tx.set(leaseRef, { jobId: id, token, until: now() + 120000 });
      tx.set(ref, { status: 'running', leaseToken: token, updatedAt: now(), attempts: data.attempts + 1, errorCode: null, reason: null, retryAt: null, phase: data.kind === 'discovery' ? 'directory' : data.kind === 'copy' ? 'copy' : 'research' }, { merge: true });
      tx.set(db.collection('studio_audit').doc(), { action: 'runner_started', targetId: id, actorId: actor.id, at: now() });
      return data;
    });
    if (!job) return { id, idempotent: true };
    const steps = [...(job.steps || [])];
    async function commitStep(label, write) {
      const step = { label, at: now() };
      await db.runTransaction(async tx => {
        const [live, config] = await Promise.all([tx.get(ref), tx.get(configRef)]);
        active(config.data());
        if (live.data()?.leaseToken !== token || live.data()?.status !== 'running') throw failure('job_cancelled', 'This task was stopped.');
        // write() performs all company/pricing reads before its first write.
        if (write) await write(tx);
        tx.set(ref, { steps: [...steps, step], updatedAt: now() }, { merge: true });
      });
      steps.push(step);
    }
    let output = [], review = false, phase = job.kind === 'copy' ? 'copy' : job.kind === 'discovery' ? 'directory' : 'research';
    try {
      if (job.kind === 'copy') {
        const companyRef = db.collection('studio_prospects').doc(job.options.prospectId), company = (await companyRef.get()).data();
        if (!company?.draft) throw failure('draft_required', 'The concept no longer exists.', 404);
        const draft = await refine(company, company.draft, id, ai || require('./studio-ai').engine());
        await commitStep('Free model copy ready for review', async tx => {
          const latest = (await tx.get(companyRef)).data();
          if (latest?.draft?.revision !== company.draft.revision) throw failure('draft_changed', 'The concept changed during this task. Refresh and retry.');
          tx.set(companyRef, { draft: { ...draft, revision: id }, updatedAt: now() }, { merge: true });
        });
        output = [job.options.prospectId]; review = true;
      } else {
        const companies = job.kind === 'discovery' ? await find(job.options) : [{ id: job.options.prospectId, ...(await db.collection('studio_prospects').doc(job.options.prospectId).get()).data() }];
        phase = 'storage';
        await commitStep(job.kind === 'discovery' ? `Directory returned ${companies.length} source-backed companies` : 'Company loaded');
        phase = 'pricing';
        const price = pricing || await require('./studio-leads').createService(db, now).settings();
        for (const input of companies) {
          // Source URL and market are validated even for provider output.
          const data = prospect(input), companyId = input.id || data.id, companyRef = db.collection('studio_prospects').doc(companyId);
          const existing = (await companyRef.get()).data();
          if (existing?.lastRunnerId === id) {
            if (job.options.automation === true) await require('./studio-workflows').createWorkflows({ db, env, now }).start(companyId, actor);
            output.push(companyId); review ||= existing.draft?.status === 'review'; continue;
          }
          const company = { ...data, ...existing, id: companyId };
          if (job.options.automation === true) {
            await commitStep(`${company.name}: ready for AI research`, async tx => {
              const latest = (await tx.get(companyRef)).data();
              tx.set(companyRef, { ...data, ...latest, sourceKey: input.sourceKey || latest?.sourceKey || null,
                stage: latest?.stage || 'Research', contactPermission: latest?.contactPermission || 'unknown',
                lastRunnerId: id, createdAt: latest?.createdAt || now(), updatedAt: now(), updatedBy: actor.id }, { merge: true });
            });
            await require('./studio-workflows').createWorkflows({ db, env, now }).start(companyId, actor);
            output.push(companyId); continue;
          }
          phase = 'research';
          const analysis = await inspectCompany(company, { now });
          const shouldDraft = job.kind === 'draft' || analysis.score >= 70;
          phase = 'concept';
          const draft = shouldDraft ? { ...makeDraft(company, analysis, price, now()), revision: id } : null;
          phase = 'storage';
          await commitStep(`${company.name}: research complete${draft ? ', concept ready' : ', below concept threshold'}`, async tx => {
            const latest = (await tx.get(companyRef)).data();
            // An approved concept is never overwritten by a discovery rerun.
            const keepDraft = job.kind === 'discovery' && latest?.draft;
            tx.set(companyRef, { ...data, ...latest, research: analysis, sourceKey: input.sourceKey || latest?.sourceKey || null,
              stage: latest?.stage || 'Research', contactPermission: latest?.contactPermission || 'unknown',
              ...(draft && !keepDraft ? { draft } : {}), lastRunnerId: id, createdAt: latest?.createdAt || now(), updatedAt: now(), updatedBy: actor.id }, { merge: true });
          });
          output.push(companyId); review ||= Boolean(draft);
        }
      }
      phase = 'storage';
      await db.runTransaction(async tx => {
        const [live, lease, config] = await Promise.all([tx.get(ref), tx.get(leaseRef), tx.get(configRef)]);
        active(config.data());
        if (live.data()?.leaseToken !== token || live.data()?.status !== 'running') throw failure('job_cancelled', 'This task was stopped.');
        tx.set(ref, { status: review ? 'review' : 'completed', output, steps, updatedAt: now(), finishedAt: now(), leaseToken: null, phase: 'finished' }, { merge: true });
        if (lease.data()?.token === token) tx.set(leaseRef, { until: 0 });
        tx.set(db.collection('studio_audit').doc(), { action: 'runner_finished', targetId: id, actorId: actor.id, at: now(), output, review });
      });
      return { id, output, status: review ? 'review' : 'completed' };
    } catch (error) {
      const code = /^[a-z_]{1,60}$/.test(error?.code || '') ? error.code : 'runner_failed';
      const reason = DIRECTORY_MESSAGES[code] || (error.statusCode && error.statusCode < 500 ? error.message : `The task stopped during ${phase}. Saved progress is retained. Retry this task or report its reference if it fails again.`);
      const retryAt = Number.isSafeInteger(error.retryAt) && error.retryAt > now() ? error.retryAt : null;
      // Allowlisted metadata only. Never log raw exceptions, URLs, business
      // records, provider response bodies or environment/credential values.
      const diagnostic = { code, phase, errorType: ['TimeoutError', 'AbortError', 'TypeError', 'Error'].includes(error?.name) ? error.name : 'Error', ...(Number.isInteger(error?.code) ? { storageCode: error.code } : {}) };
      const frame = String(error?.stack || '').split('\n').slice(1).map(line => line.match(/\blib\/(studio-[a-z-]+\.js:\d+:\d+)\b/)).find(Boolean);
      if (frame) diagnostic.frame = frame[1];
      logger.warn('[studio-runner]', { jobId: id, ...diagnostic });
      await db.runTransaction(async tx => {
        const [live, lease] = await Promise.all([tx.get(ref), tx.get(leaseRef)]);
        if (live.data()?.leaseToken === token && live.data()?.status === 'running') tx.set(ref, { status: ['runner_paused', 'ai_paused', 'ai_disabled'].includes(code) ? 'paused' : 'failed', errorCode: code, reason, phase, retryAt,
          // A locally blocked request made no provider call and is not a run
          // attempt. Actual network attempts still count toward the cap.
          ...(['directory_limit', 'directory_cooldown'].includes(code) ? { attempts: job.attempts } : {}), updatedAt: now(), leaseToken: null }, { merge: true });
        if (lease.data()?.token === token) tx.set(leaseRef, { until: 0 });
        tx.set(db.collection('studio_audit').doc(), { action: 'runner_stopped', targetId: id, actorId: actor.id, at: now(), errorCode: code, phase, retryAt });
      });
      throw failure(code, reason, error.statusCode || 503);
    }
  }
  async function decide(input, actor) {
    assertIsolatedPreview(env);
    if (!companyPattern.test(input.prospectId || '') || !idPattern.test(input.revision || '') || !['approved', 'rejected'].includes(input.decision)) throw failure('invalid_decision', 'Select the current concept and an approval decision.', 400);
    const ref = db.collection('studio_prospects').doc(input.prospectId);
    await db.runTransaction(async tx => {
      const doc = await tx.get(ref), draft = doc.data()?.draft;
      if (!draft || draft.revision !== input.revision) throw failure('draft_changed', 'The concept changed. Refresh it before deciding.');
      if (draft.status === input.decision) return;
      if (draft.status !== 'review') throw failure('invalid_decision', 'This concept already has a review decision.');
      const runRef = jobs.doc(input.revision), run = await tx.get(runRef);
      const outputs = run.data()?.output || [];
      const siblings = await Promise.all(outputs.filter(id => id !== input.prospectId).map(id => tx.get(db.collection('studio_prospects').doc(id))));
      const pending = siblings.some(row => row.data()?.draft?.revision === input.revision && row.data()?.draft?.status === 'review');
      tx.set(ref, { draft: { ...draft, status: input.decision, decidedAt: now(), decidedBy: actor.id }, updatedAt: now() }, { merge: true });
      if (run.exists && !pending && run.data().status === 'review') tx.set(runRef, { status: 'completed', reviewedAt: now(), updatedAt: now() }, { merge: true });
      tx.set(db.collection('studio_audit').doc(), { action: `draft_${input.decision}`, targetId: input.prospectId, actorId: actor.id, revision: input.revision, at: now() });
    });
    return { id: input.prospectId, status: input.decision };
  }
  return { status, enqueue, run, decide };
}
function service() { return createRunner({ db: require('../api/_firebaseAdmin').db }); }
module.exports = { createRunner, service };
