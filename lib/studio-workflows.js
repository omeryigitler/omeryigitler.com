const crypto = require('node:crypto');
const { failure, assertIsolatedPreview, settings } = require('./studio-policy');
const { normalizeRequest, calculate, createService } = require('./studio-leads');
const { createMail, emailPattern } = require('./studio-mail');
const { createModel, publicUrl } = require('./studio-agent-model');
const { proposalHtml, conceptHtml, renderPdf, money } = require('./studio-workflow-files');
const hash = value => crypto.createHash('sha256').update(typeof value === 'string' ? value : JSON.stringify(value)).digest('hex');
const idPattern = /^[a-f0-9]{32}$/;
const pending = ['research_pending', 'proposal_pending', 'proposal_files', 'concept_pending', 'concept_files'];
const summaries = flow => ({ id: flow.id, companyName: flow.company.name, state: flow.state, version: flow.version, updatedAt: flow.updatedAt, error: flow.error || null });
function createWorkflows({ db, env = process.env, now = Date.now, model, ai, mail, pdf = renderPdf, pricing } = {}) {
  const flows = db.collection('studio_workflows'), files = db.collection('studio_workflow_files'), outbox = db.collection('studio_outbox');
  const transport = mail || createMail({ env });
  const agent = model || createModel({ ai: ai || require('./studio-ai').createEngine({ db, env, now }), env });
  const active = value => { assertIsolatedPreview(env); const s = settings(value); if (!s.enabled || s.paused) throw failure('runner_paused', 'The runner is paused in AI controls. Saved work is retained.'); };
  function validateId(id) { if (!idPattern.test(id || '')) throw failure('invalid_workflow', 'Select a company workflow.', 400); }
  async function read(id) { validateId(id); const doc = await flows.doc(id).get(); if (!doc.exists) throw failure('not_found', 'This company has no automation yet.', 404); return { ...doc.data(), id }; }
  async function list() { const docs = await flows.orderBy('updatedAt', 'desc').limit(50).get(); return docs.docs.map(d => summaries({ ...d.data(), id: d.id })); }
  function preview(flow, kind) {
    const content = flow[kind], s = transport.status(), provider = transport.provider(flow.contact);
    const pricingText = flow.company.country === 'TR' ? `\n\nProje tahmini: ${money(flow.proposal.breakdown.finalTotal, flow.company.country)}. Ayrıntılı kapsam ekteki tekliftedir.` : `\n\nProject estimate: ${money(flow.proposal.breakdown.finalTotal, flow.company.country)}. The attached proposal describes the scope.`;
    const text = `${content.body}${kind === 'proposal' ? pricingText : ''}\n\nÖmer Yiğitler\nomeryigitler.com\n${s.replyTo}`;
    const attachments = (flow[`${kind}Files`] || []).map(f => ({ id: f.id, name: f.name, type: f.type, size: f.size, hash: f.hash }));
    const value = { from: s.from, replyTo: s.replyTo, to: flow.contact.email, subject: content.subject, text, provider, attachments };
    return { ...value, reviewDigest: hash(value), connected: provider === 'smtp' ? s.smtpConfigured : s.permissionedConfigured };
  }
  async function get(id) {
    const flow = await read(id), { lease, actions, ...safe } = flow;
    const kind = ['proposal_review','concept_review'].includes(flow.state) ? flow.state.split('_')[0] : null;
    let delivery = null;
    if (kind) { const doc = await outbox.doc(`${id}_${kind}`).get(); const d = doc.data(); if (d) delivery = { status: d.status, provider: d.provider, firstAttemptAt: d.firstAttemptAt, attempts: d.attempts, acceptedAt: d.acceptedAt || null }; }
    return { workflow: safe, ...(kind ? { preview: preview(flow, kind) } : {}), delivery, mail: transport.status() };
  }
  async function file(id, fileId) {
    validateId(id);
    if (!new RegExp(`^${id}_(proposal_pdf|concept_pdf|concept_html)$`).test(fileId || '')) throw failure('invalid_file', 'Select a workflow file.', 400);
    const [flow, doc] = await Promise.all([read(id), files.doc(fileId).get()]);
    if (!doc.exists || ![...(flow.proposalFiles || []), ...(flow.conceptFiles || [])].some(f => f.id === fileId)) throw failure('not_found', 'This file is not ready.', 404);
    return doc.data();
  }
  async function start(id, actor) {
    validateId(id); assertIsolatedPreview(env);
    await db.runTransaction(async tx => {
      const ref = flows.doc(id), [flow, company, config] = await Promise.all([tx.get(ref), tx.get(db.collection('studio_prospects').doc(id)), tx.get(db.collection('studio_config').doc('ai'))]);
      active(config.data());
      if (flow.exists) return;
      if (!company.exists) throw failure('not_found', 'The company record was not found.', 404);
      const c = company.data();
      tx.set(ref, { company: { name: c.name, country: c.country, location: c.location || '', industry: c.industry || '', website: c.website || null, source: c.source },
        state: 'research_pending', version: 1, createdAt: now(), updatedAt: now(), createdBy: actor.id, actions: [], error: null });
      tx.set(db.collection('studio_audit').doc(), { action: 'automation_started', targetId: id, actorId: actor.id, at: now() });
    });
    return get(id);
  }
  async function claim(input, actor) {
    validateId(input.id);
    if (!/^[a-zA-Z0-9_-]{8,100}$/.test(input.requestId || '') || !Number.isSafeInteger(input.version)) throw failure('invalid_action', 'Refresh the workflow before continuing.', 400);
    const fingerprint = hash(input), token = crypto.randomUUID();
    return db.runTransaction(async tx => {
      const ref = flows.doc(input.id), [doc, config] = await Promise.all([tx.get(ref), tx.get(db.collection('studio_config').doc('ai'))]);
      if (!doc.exists) throw failure('not_found', 'Workflow not found.', 404);
      const flow = { ...doc.data(), id: input.id }, previous = flow.actions?.find(a => a.id === input.requestId);
      if (previous) { if (previous.hash !== fingerprint) throw failure('action_conflict', 'This action identifier belongs to a different approval.'); return null; }
      active(config.data());
      if (flow.version !== input.version) throw failure('workflow_changed', 'This workflow changed. Review its latest result before continuing.');
      if (flow.lease?.until > now()) throw failure('workflow_busy', 'This step is already running. Refresh shortly.');
      tx.set(ref, { lease: { token, until: now() + 120000 }, updatedAt: now() }, { merge: true });
      return { flow, token, fingerprint, actorId: actor.id };
    });
  }
  async function finish(input, claimed, change, extra) {
    const ref = flows.doc(input.id);
    await db.runTransaction(async tx => {
      const doc = await tx.get(ref), current = doc.data();
      if (current?.lease?.token !== claimed.token || current.version !== input.version) throw failure('workflow_changed', 'The workflow lease changed. Refresh its saved result.');
      if (extra) await extra(tx);
      tx.set(ref, { ...change, lease: null, error: null, version: current.version + 1, updatedAt: now(),
        actions: [...(current.actions || []), { id: input.requestId, hash: claimed.fingerprint }].slice(-30) }, { merge: true });
      tx.set(db.collection('studio_audit').doc(), { action: `automation_${input.operation}`, targetId: input.id, actorId: claimed.actorId, state: change.state || current.state, at: now() });
    });
  }
  async function buildFiles(flow, kind) {
    const html = kind === 'proposal' ? proposalHtml(flow) : conceptHtml(flow), bytes = await pdf(html);
    if (!Buffer.isBuffer(bytes) || bytes.length < 20 || bytes.length > 350000 || !bytes.subarray(0,5).equals(Buffer.from('%PDF-'))) throw failure('pdf_failed', 'PDF generation did not return a valid bounded document.', 503);
    const make = (ext, buffer, type) => ({ id: `${flow.id}_${kind}_${ext}`, name: `${kind}-${flow.id.slice(0, 8)}.${ext}`, type, size: buffer.length, hash: hash(buffer.toString('base64')), base64: buffer.toString('base64'), createdAt: now() });
    const result = [make('pdf', bytes, 'application/pdf')];
    if (kind === 'concept') result.push(make('html', Buffer.from(html), 'text/html'));
    if (Buffer.byteLength(html) > 100000) throw failure('file_limit', 'The generated concept exceeded the file limit.', 503);
    return result;
  }
  async function dispatch(flow, kind, input) {
    const reviewed = preview(flow, kind);
    if (input.reviewDigest !== reviewed.reviewDigest) throw failure('review_changed', 'The recipient, message, sender or attachments changed. Review the new preview before sending.');
    transport.assertReady(reviewed.provider);
    const key = `${flow.id}_${kind}`, ref = outbox.doc(key);
    const first = await db.runTransaction(async tx => {
      const dayRef = db.collection('studio_mail_days').doc(new Date(now()).toISOString().slice(0, 10));
      const [doc, day, live, config] = await Promise.all([tx.get(ref), tx.get(dayRef), tx.get(flows.doc(flow.id)), tx.get(db.collection('studio_config').doc('ai'))]);
      active(config.data());
      if (live.data()?.version !== input.version) throw failure('workflow_changed', 'Refresh the workflow before sending.');
      const d = doc.data();
      if (d && d.digest !== reviewed.reviewDigest) throw failure('review_changed', 'An earlier attempt has different content. Check Sent mail before changing this message.');
      if (d?.status === 'accepted') return { accepted: true, id: d.providerId, key };
      if (d?.status === 'unknown' || (d?.status === 'sending' && d.provider === 'smtp')) throw failure('delivery_unknown', 'Check your mailbox Sent folder. This message may already have been sent and will not be resent automatically.');
      if (d && now() - d.firstAttemptAt > 23 * 3600000) throw failure('delivery_unknown', 'The provider duplicate-protection window has expired. Check Sent mail before continuing; no retry was made.');
      if (d?.attempts >= 3) throw failure('mail_attempt_limit', 'This reviewed message reached its retry limit. Check the mailbox before proceeding.');
      if (!d && (day.data()?.messages || 0) >= 10) throw failure('mail_daily_limit', 'The daily email limit was reached. Continue tomorrow.');
      tx.set(ref, { status: 'sending', provider: reviewed.provider, digest: reviewed.reviewDigest, firstAttemptAt: d?.firstAttemptAt || now(), attempts: (d?.attempts || 0) + 1, updatedAt: now(), approvedBy: input.actorId || null }, { merge: true });
      if (!d) tx.set(dayRef, { messages: (day.data()?.messages || 0) + 1 });
      return { accepted: false, key };
    });
    if (first.accepted) return { providerId: first.id, acceptedAt: now() };
    const attachments = await Promise.all(reviewed.attachments.map(async f => {
      const doc = await files.doc(f.id).get(), value = doc.data();
      if (!value || value.hash !== f.hash || hash(value.base64) !== f.hash) throw failure('file_changed', 'A reviewed attachment is no longer valid. No message was sent.');
      return value;
    }));
    let sent;
    try { sent = await transport.send({ ...reviewed, attachments }, `studio-${hash(first.key).slice(0, 40)}`, reviewed.provider); }
    catch (error) {
      const batch = db.batch();
      batch.set(ref, { status: error.code === 'delivery_unknown' ? 'unknown' : 'retryable', updatedAt: now() }, { merge: true });
      await batch.commit();
      throw error;
    }
    const accepted = { providerId: sent.id, acceptedAt: now() }, batch = db.batch();
    batch.set(ref, { status: 'accepted', ...accepted, updatedAt: now() }, { merge: true });
    await batch.commit();
    return accepted;
  }
  async function handoff(tx, flow, accepted) {
    const id = `auto_${flow.id}`, quoteRef = db.collection('quotes').doc(id), projectRef = db.collection('projects').doc(id);
    const clientId = Buffer.from(flow.contact.email).toString('base64').replace(/[^a-zA-Z0-9]/g, '_'), clientRef = db.collection('clients').doc(clientId);
    const [project, client] = await Promise.all([tx.get(projectRef), tx.get(clientRef)]);
    const c = client.data() || {}, union = (name, value) => [...new Set([...(c[name] || []), value])];
    tx.set(clientRef, { name: flow.company.name, email: flow.contact.email, createdAt: c.createdAt || now(), lastContactDate: now(), quoteIds: union('quoteIds', id), projectIds: union('projectIds', id), totalQuotes: union('quoteIds', id).length, totalProjects: union('projectIds', id).length }, { merge: true });
    tx.set(projectRef, { ...flow.proposal.request, name: `Website for ${flow.company.name}`, projectName: `Website for ${flow.company.name}`, projectNumber: `PA-${flow.id.slice(0,8).toUpperCase()}`,
      clientId, clientName: flow.company.name, clientEmail: flow.contact.email, quoteId: id, budget: flow.proposal.breakdown.finalTotal, currency: flow.company.country === 'TR' ? 'TRY' : 'EUR',
      breakdown: flow.proposal.breakdown, description: flow.proposal.summary, status: 'active', workflowStage: 'proposal', finalApproved: false, progress: 0, clientDecision: 'pending', buildOwner: 'omer',
      automationId: flow.id, conceptSentAt: accepted.acceptedAt, createdAt: project.data()?.createdAt || now(), lastUpdated: now(), documents: project.data()?.documents || {} }, { merge: true });
    tx.set(quoteRef, { projectId: id, clientId }, { merge: true });
    tx.set(db.collection('studio_prospects').doc(flow.id), { stage: 'Contacted', automationId: flow.id, updatedAt: now() }, { merge: true });
  }
  async function action(input, actor) {
    if (input.operation === 'start') return start(input.id, actor);
    if (!['advance','continue','skip','confirm_sent'].includes(input.operation)) throw failure('invalid_action', 'Choose a workflow action.', 400);
    const claimed = await claim(input, actor);
    if (!claimed) return { ...await get(input.id), idempotent: true };
    const flow = claimed.flow;
    try {
      let change, extra;
      if (input.operation === 'skip') {
        if (['handoff','skipped'].includes(flow.state)) throw failure('invalid_action', 'This workflow has already finished.');
        const kind = flow.state.split('_')[0], delivery = ['proposal','concept'].includes(kind) ? (await outbox.doc(`${flow.id}_${kind}`).get()).data() : null;
        if (delivery && ['sending','unknown','accepted'].includes(delivery.status)) throw failure('delivery_unknown', 'Resolve the existing email attempt before skipping.');
        change = { state: 'skipped' };
      } else if (input.operation === 'advance') {
        if (!pending.includes(flow.state)) throw failure('review_required', 'Review this result and use Continue before progressing.');
        if (flow.state === 'research_pending') change = { research: await agent.research(flow.company, `wf_${flow.id}_research`), state: 'research_review' };
        if (flow.state === 'proposal_pending') {
          const result = await agent.proposal(flow.company, flow.research, `wf_${flow.id}_proposal`);
          const rates = pricing || await createService(db, now).settings();
          const request = normalizeRequest({ ...result.scope, country: flow.company.country, customerName: flow.company.name, customerEmail: flow.contact.email, pageCount: result.pages.length, designType: 'CUSTOM', discountValue: 0, selectedAddons: [] });
          change = { proposal: { ...result, request, breakdown: calculate(request, rates), pricingVersion: rates.version || hash(rates), quoteNumber: `QA-${new Date(now()).getUTCFullYear()}-${flow.id.slice(0,8).toUpperCase()}` }, state: 'proposal_files' };
        }
        if (flow.state === 'concept_pending') change = { concept: await agent.concept(flow.company, { research: flow.research, proposal: flow.proposal }, `wf_${flow.id}_concept`), state: 'concept_files' };
        if (['proposal_files','concept_files'].includes(flow.state)) {
          const kind = flow.state.split('_')[0], results = await buildFiles(flow, kind);
          change = { [`${kind}Files`]: results.map(({ base64, createdAt, ...meta }) => meta), state: `${kind}_review`, ...(kind === 'concept' ? { conceptHtml: conceptHtml(flow) } : {}) };
          extra = async tx => {
            for (const value of results) tx.set(files.doc(value.id), value);
            if (kind === 'proposal') tx.set(db.collection('quotes').doc(`auto_${flow.id}`), { ...flow.proposal.request, quoteNumber: flow.proposal.quoteNumber, clientName: flow.company.name, clientEmail: flow.contact.email,
              totalPrice: flow.proposal.breakdown.finalTotal, currency: flow.company.country === 'TR' ? 'TRY' : 'EUR', breakdown: flow.proposal.breakdown, status: 'draft', createdAt: now(), updatedAt: now(), automationId: flow.id, source: 'studio_automation', sentAt: null });
          };
        }
      } else if (input.operation === 'continue' && flow.state === 'research_review') {
        const c = input.contact || {};
        if (input.companyReviewed !== true || c.verified !== true || !emailPattern.test(c.email || '') || c.email.length > 160 || !publicUrl(c.source) || !['requested','permitted','first_contact'].includes(c.basis)) throw failure('contact_review_required', 'Confirm the business and a real recipient, its source and contact basis before preparing a proposal.', 400);
        change = { contact: { email: c.email.toLowerCase(), source: publicUrl(c.source), basis: c.basis, verifiedAt: now(), verifiedBy: actor.id }, researchApprovedAt: now(), state: 'proposal_pending' };
      } else if (['continue','confirm_sent'].includes(input.operation) && ['proposal_review','concept_review'].includes(flow.state)) {
        const kind = flow.state.split('_')[0];
        let accepted;
        if (input.operation === 'confirm_sent') {
          const ref = outbox.doc(`${flow.id}_${kind}`), doc = await ref.get(), d = doc.data();
          if (!d || d.status === 'accepted' || input.checkedSentFolder !== true || input.reviewDigest !== preview(flow, kind).reviewDigest) throw failure('confirmation_required', 'Check the exact recipient and subject in Sent mail before marking this message accepted.', 400);
          accepted = { providerId: 'owner-confirmed-in-sent', acceptedAt: now(), reconciledBy: actor.id };
          const batch = db.batch(); batch.set(ref, { status: 'accepted', ...accepted }, { merge: true }); await batch.commit();
        } else accepted = await dispatch(flow, kind, { ...input, actorId: actor.id });
        change = { [`${kind}Delivery`]: accepted, state: kind === 'proposal' ? 'concept_pending' : 'handoff' };
        extra = async tx => {
          if (kind === 'concept') await handoff(tx, flow, accepted);
          else {
            tx.set(db.collection('quotes').doc(`auto_${flow.id}`), { status: 'sent', sentAt: accepted.acceptedAt, updatedAt: now() }, { merge: true });
            tx.set(db.collection('studio_prospects').doc(flow.id), { stage: 'Proposal', updatedAt: now() }, { merge: true });
          }
        };
      } else throw failure('invalid_action', 'This action is not available at the current step.');
      await finish(input, claimed, change, extra);
    } catch (error) {
      const code = /^[a-z_]{1,60}$/.test(error.code || '') ? error.code : 'workflow_failed';
      const message = error.statusCode && error.statusCode < 504 ? error.message : 'This step stopped. Saved work is retained. Retry to resume.';
      await db.runTransaction(async tx => { const ref = flows.doc(input.id), doc = await tx.get(ref); if (doc.data()?.lease?.token === claimed.token) tx.set(ref, { lease: null, error: { code, message, at: now() }, updatedAt: now() }, { merge: true }); });
      throw failure(code, message, error.statusCode || 503);
    }
    return get(input.id);
  }
  return { start, action, get, list, file, mailStatus: transport.status };
}
function service() { return createWorkflows({ db: require('../api/_firebaseAdmin').db }); }
module.exports = { createWorkflows, service, summaries, pending };

