const crypto = require('node:crypto');
const { failure } = require('./studio-policy');
const STAGES = ['Discovery', 'Research', 'Qualified', 'Demo', 'Proposal', 'Contacted', 'Meeting', 'Negotiation', 'Won', 'Lost'];
const ROLES = ['Studio Director', 'Frontend', 'Backend', 'Security', 'Performance', 'QA', 'DevOps'];
const TRANSITIONS = { queued: ['paused', 'cancelled'], paused: ['queued', 'cancelled'], failed: ['queued', 'cancelled'], completed: [], cancelled: [] };
function text(value, max = 200) { return typeof value === 'string' ? value.trim().slice(0, max) : ''; }
function httpUrl(value) {
  try {
    const url = new URL(value);
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) throw Error();
    return url.href;
  } catch { throw failure('invalid_url', 'A valid HTTP(S) source URL is required.', 400); }
}
function prospect(input) {
  const name = text(input.name);
  const country = input.country;
  if (!name || !['MT', 'TR'].includes(country)) throw failure('invalid_prospect', 'A company name and MT/TR market are required.', 400);
  const source = httpUrl(input.source);
  const website = input.website ? httpUrl(input.website) : null;
  const domain = website ? new URL(website).hostname.toLowerCase().replace(/^www\./, '') : null;
  const location = text(input.location);
  const key = domain || `${country}:${name.normalize('NFKC').toLocaleLowerCase(country === 'TR' ? 'tr' : 'en')}:${location.toLowerCase()}`;
  return { id: crypto.createHash('sha256').update(key).digest('hex').slice(0, 32), name, country, location, website, domain,
    source, industry: text(input.industry), notes: text(input.notes, 2000),
    currency: country === 'MT' ? 'EUR' : 'TRY', language: country === 'MT' ? 'en' : 'tr' };
}
function createRecords(db, now = Date.now) {
  async function list() {
    const entries = await Promise.all(['studio_prospects', 'studio_jobs', 'studio_usage', 'studio_audit'].map(async collection => {
      const sort = collection === 'studio_usage' ? 'startedAt' : collection === 'studio_audit' ? 'at' : 'updatedAt';
      const docs = await db.collection(collection).orderBy(sort, 'desc').limit(50).get();
      return docs.docs.map(doc => ({ ...doc.data(), id: doc.id }));
    }));
    return { prospects: entries[0], jobs: entries[1], usage: entries[2], history: entries[3], stages: STAGES, roles: ROLES,
      executorAvailable: false, limit: 50 };
  }
  async function save(body, actor) {
    if (body.kind === 'prospect') {
      const data = prospect(body);
      const ref = db.collection('studio_prospects').doc(data.id);
      await db.runTransaction(async tx => {
        const previous = await tx.get(ref);
        tx.set(ref, { ...data, stage: previous.data()?.stage || 'Discovery', contactPermission: previous.data()?.contactPermission || 'unknown',
          createdAt: previous.data()?.createdAt || now(), updatedAt: now(), researchedAt: now(), updatedBy: actor.id }, { merge: true });
        tx.set(db.collection('studio_audit').doc(), { action: previous.exists ? 'prospect_updated' : 'prospect_created', targetId: data.id, actorId: actor.id, at: now() });
      });
      return { id: data.id };
    }
    if (body.kind === 'job') {
      if (!ROLES.includes(body.role) || !text(body.title)) throw failure('invalid_job', 'A task title and role are required.', 400);
      if (!/^[a-f0-9]{32}$/.test(body.prospectId || '')) throw failure('invalid_prospect', 'Link this task to a prospect.', 400);
      // Stable client key makes accidental double submission idempotent.
      if (!/^[a-zA-Z0-9_-]{8,100}$/.test(body.requestId || '')) throw failure('invalid_request_id', 'A request identifier is required.', 400);
      const ref = db.collection('studio_jobs').doc(body.requestId);
      await db.runTransaction(async tx => {
        const [existing, company] = await Promise.all([tx.get(ref), tx.get(db.collection('studio_prospects').doc(body.prospectId))]);
        if (!company.exists) throw failure('not_found', 'The company was not found.', 404);
        if (existing.exists) return;
        tx.set(ref, { title: text(body.title), role: body.role, prospectId: body.prospectId, status: 'paused',
          reason: 'executor_not_configured', createdAt: now(), updatedAt: now(), createdBy: actor.id, attempts: 0 });
        tx.set(db.collection('studio_audit').doc(), { action: 'job_created', targetId: ref.id, actorId: actor.id, at: now() });
      });
      return { id: ref.id };
    }
    throw failure('invalid_kind', 'Unknown record type.', 400);
  }
  async function transition(body, actor) {
    if (!/^[a-zA-Z0-9_-]{1,100}$/.test(body.id || '')) throw failure('invalid_id', 'Invalid record.', 400);
    if (!['prospect', 'job'].includes(body.kind)) throw failure('invalid_kind', 'Invalid record type.', 400);
    const ref = db.collection(body.kind === 'job' ? 'studio_jobs' : 'studio_prospects').doc(body.id);
    await db.runTransaction(async tx => {
      const doc = await tx.get(ref);
      if (!doc.exists) throw failure('not_found', 'The record was not found.', 404);
      const data = doc.data();
      let change;
      if (body.kind === 'job') {
        if (!(TRANSITIONS[data.status] || []).includes(body.status)) throw failure('invalid_transition', 'This task transition is not allowed.');
        if (body.status === 'queued') throw failure('executor_not_configured', 'The isolated runner is not connected. The task remains paused.');
        change = { status: body.status };
      } else {
        if (!STAGES.includes(body.stage)) throw failure('invalid_stage', 'Invalid sales stage.', 400);
        if (body.stage === 'Contacted' && body.contactConfirmed !== true) throw failure('contact_confirmation', 'Confirm that you completed the contact manually. No automatic message will be sent.');
        change = { stage: body.stage };
      }
      tx.set(ref, { ...change, updatedAt: now(), updatedBy: actor.id }, { merge: true });
      tx.set(db.collection('studio_audit').doc(), { action: `${body.kind}_transition`, targetId: body.id, actorId: actor.id, change, at: now() });
    });
    return { id: body.id };
  }
  return { list, save, transition };
}
module.exports = { STAGES, ROLES, prospect, createRecords,
  list: (...args) => createRecords(require('../api/_firebaseAdmin').db).list(...args),
  save: (...args) => createRecords(require('../api/_firebaseAdmin').db).save(...args),
  transition: (...args) => createRecords(require('../api/_firebaseAdmin').db).transition(...args)
};
