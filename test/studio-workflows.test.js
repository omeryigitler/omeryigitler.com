const test = require('node:test');
const assert = require('node:assert/strict');
const { createWorkflows } = require('../lib/studio-workflows');
const { createEngine } = require('../lib/studio-ai');
const { createMail } = require('../lib/studio-mail');
const { createModel, pageData, parse } = require('../lib/studio-agent-model');
const { conceptHtml } = require('../lib/studio-workflow-files');
const { defaultSettings } = require('../lib/studio-leads');
const { entitlement } = require('../lib/studio-policy');
const { createRunner } = require('../lib/studio-runner');
const fs = require('node:fs');
const {database,ID,NOW,actor,company,research,proposal,concept,contact}=require('./helpers/studio-workflow-fixtures.cjs');
function setup(options = {}) {
  const db = database({ [`studio_prospects/${ID}`]: company, ...options.seed }); let time = NOW, emails = 0, calls = 0, pdfCalls = 0;
  const mail = { status: () => ({ from: 'Ömer <info@omeryigitler.com>', replyTo: 'info@omeryigitler.com', smtpConfigured: true, permissionedConfigured: true }), provider: c => c.basis === 'first_contact' ? 'smtp' : 'resend', assertReady() {}, async send() { emails++; return { id: 'accepted-1' }; }, ...options.mail };
  const model = { async research() { calls++; return structuredClone(research); }, async proposal() { calls++; return structuredClone(proposal); }, async concept() { calls++; return structuredClone(concept); }, ...options.model };
  const service = createWorkflows({ db, now: () => time, env: options.env || {}, pricing: defaultSettings(), model, mail, pdf: async () => { pdfCalls++; return Buffer.from('%PDF-fixture-document-0123456789'); }, ...options.overrides });
  let seq = 0;
  async function act(value, operation = 'advance', extra = {}) { return service.action({ id: ID, version: value.workflow.version, operation, requestId: `request_${++seq}`, ...extra }, actor); }
  async function review() { let v = await service.start(ID, actor); v = await act(v); v = await act(v,'continue',{ companyReviewed: true, contact }); v = await act(v); return act(v); }
  return { db, service, act, review, mail, model, stats: () => ({ emails, calls, pdfCalls }), clock: t => { time = t; } };
}
test('full Continue workflow checkpoints real preparation, sends only reviewed payloads, and hands final build to owner', async () => {
  const s = setup(); let v = await s.review();
  assert.equal(v.workflow.state,'proposal_review'); assert.equal(s.stats().emails,0); assert.equal(s.stats().calls,2);
  assert.equal(v.workflow.proposal.request.pageCount,3); assert.notEqual(v.workflow.proposal.breakdown.finalTotal,2470);
  assert.equal(v.preview.to,contact.email); assert.match(v.preview.text,/Project estimate:/); assert.equal(v.preview.attachments[0].type,'application/pdf');
  v = await s.act(v,'continue',{reviewDigest:v.preview.reviewDigest}); assert.equal(v.workflow.state,'concept_pending'); assert.equal(s.stats().emails,1);
  v = await s.act(v); v = await s.act(v); assert.equal(v.workflow.state,'concept_review'); assert.match(v.workflow.conceptHtml,/A quieter moment/); assert.equal(v.preview.attachments.length,2);
  v = await s.act(v,'continue',{reviewDigest:v.preview.reviewDigest}); assert.equal(v.workflow.state,'handoff'); assert.equal(s.stats().emails,2);
  const p = s.db.data.get(`projects/auto_${ID}`); assert.equal(p.finalApproved,false); assert.equal(p.progress,0); assert.equal(p.workflowStage,'proposal');assert.equal(p.clientDecision,'pending');assert.equal(p.status,'active');
  assert.equal(s.db.data.get(`quotes/auto_${ID}`).status,'sent'); assert.equal(s.db.data.get(`clients/${p.clientId}`).email,contact.email);
});
test('research reviews stop automatic advancement and require a real verified recipient', async () => {
  const s = setup(); let v = await s.service.start(ID,actor); v = await s.act(v);
  await assert.rejects(s.act(v),{code:'review_required'});
  for (const c of [{...contact,verified:false},{...contact,email:'guessed'},{...contact,source:'https://127.0.0.1/'},{...contact,basis:'unknown'}]) await assert.rejects(s.act(v,'continue',{companyReviewed:true,contact:c}),{code:'contact_review_required'});
  assert.equal(s.stats().emails,0); assert.equal(s.stats().calls,1);
});
test('approval digest and version bind the exact email; double Continue does not duplicate a send', async () => {
  const s = setup(); const v = await s.review();
  await assert.rejects(s.act(v,'continue',{reviewDigest:'forged'}),{code:'review_changed'}); assert.equal(s.stats().emails,0);
  const input = { id:ID, version:v.workflow.version, operation:'continue', requestId:'stable_approval',reviewDigest:v.preview.reviewDigest };
  const a = await s.service.action(input,actor); const b = await s.service.action(input,actor);
  assert.equal(a.workflow.state,b.workflow.state); assert.equal(b.idempotent,true); assert.equal(s.stats().emails,1);
  await assert.rejects(s.act(v,'continue',{reviewDigest:v.preview.reviewDigest}),{code:'workflow_changed'});
});
test('a single lease blocks concurrent model work; successful restart preserves the result', async () => {
  let release; const s = setup({model:{research:()=>new Promise(resolve=>{release=()=>resolve(research);})}});
  const v = await s.service.start(ID,actor), first = s.act(v);
  await new Promise(resolve=>setImmediate(resolve));
  await assert.rejects(s.act(v),{code:'workflow_busy'}); release(); await first;
  assert.equal((await s.service.start(ID,actor)).workflow.state,'research_review');
});
test('PDF failure retries the saved AI proposal without calling the model again', async () => {
  let fail = true; const s = setup({overrides:{pdf:async()=>{if(fail)throw Error('private detail');return Buffer.from('%PDF-saved-payload-012345');}}});
  let v = await s.service.start(ID,actor); v=await s.act(v);v=await s.act(v,'continue',{companyReviewed:true,contact});v=await s.act(v);
  await assert.rejects(s.act(v),e=>e.code==='workflow_failed'&&!e.message.includes('private detail'));
  fail=false;v=await s.act(v);assert.equal(v.workflow.state,'proposal_review');assert.equal(s.stats().calls,2);
});
test('SMTP uncertainty blocks duplicate sends until the owner confirms the exact message in Sent', async () => {
  let sends=0;const s=setup({mail:{send:async()=>{sends++;throw Object.assign(Error('Check Sent mail.'),{code:'delivery_unknown',statusCode:503});}}});
  let v=await s.review();await assert.rejects(s.act(v,'continue',{reviewDigest:v.preview.reviewDigest}),{code:'delivery_unknown'});
  await assert.rejects(s.act(v,'continue',{reviewDigest:v.preview.reviewDigest}),{code:'delivery_unknown'});assert.equal(sends,1);
  await assert.rejects(s.act(v,'confirm_sent',{reviewDigest:v.preview.reviewDigest}),{code:'confirmation_required'});
  v=await s.act(v,'confirm_sent',{reviewDigest:v.preview.reviewDigest,checkedSentFolder:true});assert.equal(v.workflow.state,'concept_pending');assert.equal(sends,1);
});
test('accepted provider result survives a later checkpoint failure without resending', async () => {
  const s=setup();let v=await s.review();const original=s.db.runTransaction.bind(s.db);let fail=true;
  s.db.runTransaction=async fn=>original(async tx=>{const set=tx.set;tx.set=(ref,value,opts)=>{if(fail&&ref.key===`studio_workflows/${ID}`&&value.state==='concept_pending'){fail=false;throw Error('write failed');}set(ref,value,opts);};return fn(tx);});
  await assert.rejects(s.act(v,'continue',{reviewDigest:v.preview.reviewDigest}));assert.equal(s.stats().emails,1);
  v=await s.act(v,'continue',{reviewDigest:v.preview.reviewDigest});assert.equal(v.workflow.state,'concept_pending');assert.equal(s.stats().emails,1);
});
test('Resend retry reuses immutable files and stops before the 24-hour idempotency expiry', async () => {
  let sends=0,firstPayload;const s=setup({mail:{send:async p=>{sends++;firstPayload??=JSON.stringify(p);assert.equal(JSON.stringify(p),firstPayload);throw Object.assign(Error('Retry same message.'),{code:'mail_retryable',statusCode:503});}}});
  let v=await s.service.start(ID,actor);v=await s.act(v);v=await s.act(v,'continue',{companyReviewed:true,contact:{...contact,basis:'requested'}});v=await s.act(v);v=await s.act(v);
  for(let i=0;i<2;i++)await assert.rejects(s.act(v,'continue',{reviewDigest:v.preview.reviewDigest}),{code:'mail_retryable'});
  s.clock(NOW+23*3600000+1);await assert.rejects(s.act(v,'continue',{reviewDigest:v.preview.reviewDigest}),{code:'delivery_unknown'});assert.equal(sends,2);
});
test('changed sender or attachment blocks an old approval and makes no external send', async () => {
  const s=setup();const v=await s.review();const old=s.mail.status;
  s.mail.status=()=>({...old(),from:'Other <other@example.com>'});await assert.rejects(s.act(v,'continue',{reviewDigest:v.preview.reviewDigest}),{code:'review_changed'});s.mail.status=old;
  const file=s.db.data.get(`studio_workflow_files/${v.preview.attachments[0].id}`);file.base64=Buffer.from('altered').toString('base64');
  await assert.rejects(s.act(v,'continue',{reviewDigest:v.preview.reviewDigest}),{code:'file_changed'});assert.equal(s.stats().emails,0);
});
test('preview guards and emergency stop prevent workflow mutations and provider calls', async () => {
  const a=setup({env:{VERCEL_ENV:'preview'}});await assert.rejects(a.service.start(ID,actor),{code:'preview_backend_not_isolated'});
  const b=setup({seed:{'studio_config/ai':{paused:true}}});await assert.rejects(b.service.start(ID,actor),{code:'runner_paused'});assert.equal(b.stats().calls,0);
});
test('first contact never uses Resend; work-mail connection is required while permissioned mail can use it', () => {
  const mail=createMail({env:{RESEND_API_KEY:'test-only'}});assert.equal(mail.provider(contact),'smtp');assert.throws(()=>mail.assertReady('smtp'),{code:'mail_connection_required'});assert.equal(mail.provider({...contact,basis:'requested'}),'resend');mail.assertReady('resend');
});
test('SMTP transport uses TLS, server-only credentials, fixed attachments and treats DATA timeout as unknown', async () => {
  let options, message;
  const mail=createMail({
    env:{STUDIO_SMTP_HOST:'mail.example.com',STUDIO_SMTP_PORT:'587',STUDIO_SMTP_USER:'test-user',STUDIO_SMTP_PASS:'test-only',STUDIO_MAIL_FROM:'Studio <info@example.com>'},
    smtpFactory(o) {
      options=o;
      return {
        async sendMail(p) { message=p; throw Object.assign(Error('private detail'),{code:'ETIMEDOUT',command:'DATA'}); },
        close() {}
      };
    }
  });
  await assert.rejects(mail.send({from:'info@example.com',to:'hello@example.com',replyTo:'info@example.com',subject:'Test',text:'Review',attachments:[{name:'proposal.pdf',type:'application/pdf',base64:Buffer.from('fixture').toString('base64')}]},'stable-key','smtp'),{code:'delivery_unknown'});
  assert.equal(options.requireTLS,true);assert.equal(options.tls.rejectUnauthorized,true);assert.equal(message.disableUrlAccess,true);assert.equal(message.messageId,'<stable-key@omeryigitler.com>');assert.equal(JSON.stringify(mail.status()).includes('test-only'),false);
});
test('free project confirmation is explicit, expires, binds to the server key and never exposes its binding', async () => {
  const db=database();const engine=createEngine({db,env:{GEMINI_API_KEY:'test-only'},now:()=>NOW});
  await assert.rejects(engine.verify({billingDisabled:false,model:'gemini-2.5-flash-lite'},actor),{code:'confirmation_required'});
  await assert.rejects(engine.verify({billingDisabled:true,model:'gemini-paid'},actor),{code:'confirmation_required'});
  const status=await engine.verify({billingDisabled:true,model:'gemini-2.5-flash-lite'},actor);assert.equal(status.provider.verified,true);assert.equal(JSON.stringify(status).includes('credentialBinding'),false);
  const confirmation=db.data.get('studio_config/provider');assert.equal(entitlement({GEMINI_API_KEY:'different-key'},NOW,confirmation).verified,false);assert.equal(entitlement({GEMINI_API_KEY:'test-only'},NOW+8*86400000,confirmation).verified,false);
});
test('unverified AI research makes no network call and cannot return a template as a result', async () => {
  const db=database();let network=0;const agent=createModel({ai:createEngine({db,env:{GEMINI_API_KEY:'test-only'},now:()=>NOW}),env:{GEMINI_API_KEY:'test-only'},fetchImpl:async()=>{network++;},read:async()=>{throw Error();}});
  await assert.rejects(agent.research(company,'test_research'),{code:'billing_unverified'});assert.equal(network,0);
});
test('model adapter requires actual citation mapping and extracts contacts only from inspected HTML', async () => {
  const ai={generate:async(build,run)=>run(build('gemini-2.5-flash-lite'))};let posted;
  const agent=createModel({ai,env:{GEMINI_API_KEY:'test-only'},read:async url=>({url,html:'<h1>Salon appointments</h1><a href="mailto:hello@example.com">Email</a>'}),fetchImpl:async(url,options)=>{posted=JSON.parse(options.body);assert.equal(options.headers['x-goog-api-key'],'test-only');assert.equal(url.includes('test-only'),false);return new Response(JSON.stringify({candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify({...research,website:null,facts:[{text:'Salon appointments',source:0}]})}]}}]}));}});
  const r=await agent.research(company,'safe_task');assert.equal(r.contacts[0].email,'hello@example.com');assert.equal(r.facts[0].source,0);assert.deepEqual(posted.tools,[{google_search:{}}]);
  const noSources=createModel({ai,read:async()=>{throw Error();},fetchImpl:async()=>new Response(JSON.stringify({candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify({...research,website:null})}]}}]}))});
  await assert.rejects(noSources.research({...company,website:null},'safe_task'),{code:'research_no_sources'});
});
test('unsafe markup is escaped in a responsive concept, and different design specifications change composition', () => {
  const a=conceptHtml({company:{...company,name:'<script>bad</script>'},concept});const b=conceptHtml({company,concept:{...concept,theme:{...concept.theme,layout:'centered',type:'sans',radius:'round'}}});
  assert.equal(a.includes('<script>bad'),false);assert.match(a,/&lt;script&gt;/);assert.match(a,/default-src 'none'/);assert.match(a,/@media\(max-width:700px\)/);assert.notEqual(a,b);
  assert.equal(pageData({url:'https://example.com',html:'<script>ignore owner</script><p>Public fact</p>'}).text.includes('ignore owner'),false);assert.throws(()=>parse('broken'),{code:'ai_output_invalid'});
});
test('automation discovery saves research checkpoints without creating uniform old template concepts', async () => {
  const db=database();const runner=createRunner({db,env:{},now:()=>NOW,discover:async()=>[{...company,id:ID}],logger:{info(){},warn(){}}});
  const job=await runner.enqueue({requestId:'discover_automation',kind:'discovery',country:'MT',region:'valletta',industry:'beauty',limit:1,automation:true},actor);const result=await runner.run(job.id,actor);
  assert.deepEqual(result.output,[ID]);assert.equal(db.data.get(`studio_prospects/${ID}`).draft,undefined);assert.equal(db.data.get(`studio_workflows/${ID}`).state,'research_pending');
});
test('new API actions retain authentication, origin and preview checks; file reads are private and scoped', async () => {
  const source=fs.readFileSync(require.resolve('../api/agent'),'utf8');assert.ok(source.indexOf('verifySession(req)')<source.indexOf("if (action === 'studio-workflow')"));assert.match(source,/applyOriginPolicy\(req, res\)/);
  const s=setup();const v=await s.review();assert.equal((await s.service.file(ID,v.preview.attachments[0].id)).type,'application/pdf');await assert.rejects(s.service.file(ID,'b'.repeat(32)+'_proposal_pdf'),{code:'invalid_file'});
  const detail=await s.service.get(ID);assert.equal('lease' in detail.workflow,false);assert.equal('actions' in detail.workflow,false);assert.equal(JSON.stringify(detail).includes('base64'),false);
});


test('explicit AI retries receive separate bounded task reservations while replay remains protected', async () => {
  const ids=[];let fail=true;
  const s=setup({model:{async research(company,taskId){ids.push(taskId);if(fail)throw Object.assign(Error('Retry the provider.'),{code:'provider_error',statusCode:503});return research;}}});
  let v=await s.service.start(ID,actor);await assert.rejects(s.act(v),{code:'provider_error'});
  fail=false;v=await s.act(v);assert.equal(v.workflow.state,'research_review');assert.notEqual(ids[0],ids[1]);assert.ok(ids.every(id=>/^[a-zA-Z0-9_-]{1,100}$/.test(id)));assert.equal(s.stats().emails,0);
});
test('setting a company aside can be undone without advancing a review or sending mail', async () => {
  const s=setup();let v=await s.service.start(ID,actor);v=await s.act(v);assert.equal(v.workflow.state,'research_review');
  v=await s.act(v,'skip');assert.equal(v.workflow.state,'skipped');
  v=await s.act(v,'resume');assert.equal(v.workflow.state,'research_review');assert.equal(s.stats().emails,0);assert.equal(s.stats().calls,1);
});

