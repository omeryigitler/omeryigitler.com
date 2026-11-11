const test = require('node:test');
const assert = require('node:assert/strict');
const { createEngine } = require('../lib/studio-ai');
const { createRecords, prospect } = require('../lib/studio-records');
const { validateSettings, DEFAULT_SETTINGS } = require('../lib/studio-policy');
const fs = require('node:fs');
const { assertIsolatedPreview } = require('../lib/studio-policy');

function database(initial = {}) {
  const data = new Map(Object.entries(initial));
  let sequence = 0, queue = Promise.resolve();
  const snap = key => ({ exists: data.has(key), data: () => data.get(key) });
  const db = {
    data,
    collection(name) { return {
      doc(id = `auto-${++sequence}`) { const key = `${name}/${id}`; return { key, id, get: async () => snap(key) }; }
    }; },
    batch() {
      const writes = [];
      return { set(ref, value, options) { writes.push([ref.key,value,options]); }, async commit() {
        for (const [key,value,options] of writes) data.set(key, options?.merge ? {...data.get(key),...value} : value);
      } };
    },
    runTransaction(fn) {
      const work = queue.then(async () => {
        const batch = db.batch();
        const value = await fn({ get: async ref => snap(ref.key), set: batch.set });
        await batch.commit(); return value;
      });
      queue = work.catch(() => {}); return work;
    }
  };
  return db;
}
const NOW = Date.parse('2026-11-02T10:00:00Z');
const env = { GEMINI_API_KEY: 'test-only', STUDIO_GEMINI_BILLING: 'verified_free', STUDIO_FREE_VERIFIED_UNTIL: '2026-11-03', STUDIO_FREE_MODELS: 'gemini-test,gemini-alternate' };
const result = { response: { usageMetadata: { promptTokenCount: 12, candidatesTokenCount: 6 } } };
function setup(config, overrides) {
  const db = database(config ? { 'studio_config/ai': config } : {});
  return { db, engine: createEngine({ db, env: { ...env, ...overrides }, now: () => NOW }) };
}
for (const [label, config, overrides, code] of [
  ['master OFF', { enabled: false }, {}, 'ai_disabled'],
  ['paused', { paused: true }, {}, 'ai_paused'],
  ['unknown billing', {}, { STUDIO_GEMINI_BILLING: 'unknown' }, 'billing_unverified'],
  ['expired verification', {}, { STUDIO_FREE_VERIFIED_UNTIL: '2026-01-01' }, 'billing_unverified'],
  ['missing key', {}, { GEMINI_API_KEY: '' }, 'provider_missing'],
  ['no allowed model', {}, { STUDIO_FREE_MODELS: '' }, 'billing_unverified']
]) test(`${label} makes no provider calls`, async () => {
  const {engine}=setup(config,overrides); let calls=0;
  await assert.rejects(engine.generate(x=>x, async()=>{calls++;return result;}),{code}); assert.equal(calls,0);
});
test('paid settings cannot be enabled by API, documents, or HYBRID mode', async () => {
  for(const value of [{premiumEnabled:true},{dailyBudgetEur:1},{maxConcurrency:0},{mode:'PAID'},{apiKey:'secret'}]) assert.throws(()=>validateSettings(value));
  const {engine}=setup({mode:'HYBRID',premiumEnabled:true,dailyBudgetEur:999});
  const status=await engine.status(); assert.equal(status.settings.premiumEnabled,false);assert.equal(status.settings.dailyBudgetEur,0);
});
test('free fallback uses only the explicitly verified allowlist and records usage', async () => {
  const {engine,db}=setup();const calls=[];
  await engine.generate(x=>x,async model=>{calls.push(model);if(calls.length===1)throw Error('429 quota');return result;});
  assert.deepEqual(calls,['gemini-test','gemini-alternate']);
  const usage=[...db.data.entries()].filter(([key])=>key.startsWith('studio_usage/')).map(([,value])=>value);
  assert.equal(usage.length,2);assert.equal(usage[1].inputTokens,12);assert.equal(usage[1].confirmedCostEur,null);
  assert.deepEqual(db.data.get('studio_runtime/ai').leases,{});
});
test('quota exhaustion stops without paid fallback',async()=>{
  const {engine}=setup(); let calls=0;
  await assert.rejects(engine.generate(x=>x,async()=>{calls++;throw Error('429');}),{code:'quota_exhausted'});assert.equal(calls,2);
});
test('non-quota failure does not retry',async()=>{
  const {engine}=setup();let calls=0;
  await assert.rejects(engine.generate(x=>x,async()=>{calls++;throw Error('503');}),{code:'provider_error'});assert.equal(calls,1);
});
test('daily request limit is reserved before execution',async()=>{
  const {engine}=setup({maxRequestsPerDay:1});let calls=0;
  const run=async()=>{calls++;return result;};await engine.generate(x=>x,run);
  await assert.rejects(engine.generate(x=>x,run),{code:'request_limit'});assert.equal(calls,1);
});
test('task limit survives repeated requests and prevents bypass through retry',async()=>{
  const {engine}=setup({maxRequestsPerTask:1});let calls=0;
  const run=async()=>{calls++;return result;};await engine.generate(x=>x,run,{taskId:'same-task'});
  await assert.rejects(engine.generate(x=>x,run,{taskId:'same-task'}),{code:'request_limit'});assert.equal(calls,1);
});
test('concurrent calls cannot overbook a single slot',async()=>{
  const {engine}=setup();let release,started;
  const ready=new Promise(r=>{started=r;});const pending=new Promise(r=>{release=r;});
  const first=engine.generate(x=>x,async()=>{started();await pending;return result;});await ready;
  await assert.rejects(engine.generate(x=>x,async()=>result),{code:'concurrency_limit'});release();await first;
  await engine.generate(x=>x,async()=>result);
});
test('emergency stop between attempts prevents fallback',async()=>{
  const {engine,db}=setup();let calls=0;
  await assert.rejects(engine.generate(x=>x,async()=>{calls++;db.data.set('studio_config/ai',{enabled:false});throw Error('429');}),{code:'ai_disabled'});assert.equal(calls,1);
});
test('AI settings update and audit commit together without secrets',async()=>{
  const {engine,db}=setup();await engine.save({...DEFAULT_SETTINGS,enabled:false},'admin');
  assert.equal(db.data.get('studio_config/ai').enabled,false);
  assert.equal([...db.data.keys()].filter(k=>k.startsWith('studio_audit/')).length,1);
  assert.ok(!JSON.stringify([...db.data.values()]).includes('test-only'));
});
const company={kind:'prospect',name:'Example',country:'MT',location:'Sliema',website:'https://www.example.com/path',source:'https://example.com/about'};
test('domain normalization deduplicates prospects and retains pipeline state',async()=>{
  const db=database(),records=createRecords(db,()=>NOW),actor={id:'admin'};
  const first=await records.save(company,actor);await records.transition({kind:'prospect',id:first.id,stage:'Qualified'},actor);
  const second=await records.save({...company,website:'https://example.com'},actor);
  assert.equal(first.id,second.id);assert.equal(db.data.get('studio_prospects/'+first.id).stage,'Qualified');
});
test('prospect validation rejects forged source URLs and markets',()=>{
  for(const changes of [{source:'javascript:alert(1)'},{source:'https://user:pass@example.com'},{country:'XX'}])assert.throws(()=>prospect({...company,...changes}));
});
test('job creation is idempotent and cancellation preserves company data',async()=>{
  const db=database(),records=createRecords(db,()=>NOW),actor={id:'admin'};
  const {id}=await records.save(company,actor);const body={kind:'job',title:'Design demo',role:'Frontend',prospectId:id,requestId:'job-example-1'};
  await records.save(body,actor);await records.save(body,actor);
  assert.equal([...db.data.keys()].filter(k=>k.startsWith('studio_jobs/')).length,1);
  await assert.rejects(records.transition({kind:'job',id:body.requestId,status:'queued'},actor),{code:'executor_not_configured'});
  await records.transition({kind:'job',id:body.requestId,status:'cancelled'},actor);
  assert.equal(db.data.get('studio_prospects/'+id).name,'Example');
  await assert.rejects(records.transition({kind:'job',id:body.requestId,status:'queued'},actor),{code:'invalid_transition'});
});
test('CRM works with AI disabled; contacted stage requires human confirmation',async()=>{
  const db=database({'studio_config/ai':{enabled:false}}),records=createRecords(db,()=>NOW),actor={id:'admin'};
  const {id}=await records.save(company,actor);
  await assert.rejects(records.transition({kind:'prospect',id,stage:'Contacted'},actor),{code:'contact_confirmation'});
  await records.transition({kind:'prospect',id,stage:'Contacted',contactConfirmed:true},actor);
  assert.equal(db.data.get('studio_prospects/'+id).stage,'Contacted');
});
test('admin-only assets are not referenced by public pages',()=>{
  for(const page of ['index.html','projects.html']) assert.doesNotMatch(fs.readFileSync('src/pages/'+page,'utf8'),/studio-admin|studio-os/);
  assert.doesNotMatch(fs.readFileSync('src/pages/admin.html','utf8'),/telegram-bot-token|botToken:/);
});
test('shared production credentials are blocked in preview', async()=>{
  assert.throws(()=>assertIsolatedPreview({VERCEL_ENV:'preview'}),{code:'preview_backend_not_isolated'});
  assert.doesNotThrow(()=>assertIsolatedPreview({VERCEL_ENV:'preview',STUDIO_PREVIEW_ISOLATED:'true'}));
  const {engine}=setup({}, {VERCEL_ENV:'preview'});
  await assert.rejects(engine.generate(x=>x,async()=>result),{code:'preview_backend_not_isolated'});
  await assert.rejects(engine.save({...DEFAULT_SETTINGS},'admin'),{code:'preview_backend_not_isolated'});
});
test('unauthenticated callers cannot read or mutate Studio endpoints', async()=>{
  const Module = require('node:module'); const original=Module._load;
  Module._load=function(request,parent,isMain){
    if(parent?.filename?.endsWith('/api/agent.js')){
      if(request==='../lib/agent')return {verifyAgentRequest:async()=>{throw Object.assign(Error('No access'),{statusCode:403,code:'agent_forbidden'});}};
      if(request==='../lib/google-agent-auth')return {verifyGoogleAgentRequest:async()=>null};
      if(request.includes('studio-') && !request.endsWith('studio-access'))throw Error('Privileged dependency loaded before authorization');
    }
    return original.call(this,request,parent,isMain);
  };
  try {
    const handler=require('../api/agent');
    for(const [action,method] of [['studio-status','GET'],['studio-records','GET'],['studio-settings','POST'],['studio-save','POST'],['studio-transition','POST'],['studio-history','POST'],['studio-pricing-config','GET'],['studio-pricing-save','POST'],['studio-pricing-settings','POST'],['studio-lead-process','POST'],['studio-runner-status','GET'],['studio-enqueue','POST'],['studio-run','POST'],['studio-draft-decision','POST']]){
      const res={statusCode:200,setHeader(){},end(value){this.body=JSON.parse(value);}};
      await handler({method,query:{action},headers:{},body:{settings:{enabled:true}}},res);
      assert.equal(res.statusCode,403);assert.equal(res.body.code,'agent_forbidden');
    }
  } finally {Module._load=original;}
});
