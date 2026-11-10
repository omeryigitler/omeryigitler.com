const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const security = require('../lib/gateway-security');
const id = 'a'.repeat(32);
const cookie = 'b'.repeat(64);
const sessionHash = security.hash(cookie);
function memoryDB(seed = {}) {
  const data = new Map(Object.entries(seed)); let queue = Promise.resolve();
  const snapshot = key => ({ exists: data.has(key), data: () => data.get(key) });
  return { data, collection: name => ({ doc: id => ({ key: `${name}/${id}`, get: async () => snapshot(`${name}/${id}`), create: async value => { const key = `${name}/${id}`; if (data.has(key)) throw Error('exists'); data.set(key,value); } }) }),
    runTransaction(fn) { const work = queue.then(async () => { const writes=[]; const result=await fn({get:async ref=>snapshot(ref.key),set:(ref,value)=>writes.push(()=>data.set(ref.key,value)),update:(ref,value)=>writes.push(()=>data.set(ref.key,{...data.get(ref.key),...value}))}); writes.forEach(fn=>fn()); return result; }); queue=work.catch(()=>{}); return work; }
  };
}
function handler(db, auth = {}) {
  const context = { module: {exports:{}}, process, Buffer, Uint8Array, Date, console: {error(){}}, require: name => {
    if(name==='./_firebaseAdmin')return {db,admin:{auth:()=>auth}};
    if(name==='node:fs')return {readFileSync:file=>{assert.equal(file,path.join(process.cwd(),'server-generated','admin.html'));return '<!DOCTYPE html><title>Private admin</title>';}};
    if(name==='axios'||name.startsWith('@simplewebauthn'))return {};
    if(name==='./telegramFormat')return {};
    if(name==='../lib/gateway-security')return security;
    return require(name);
  }};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../api/gateway.js'),'utf8'),context);
  return async (action,body={},headers={},method='POST')=>{const res={headers:{},setHeader(k,v){this.headers[k]=v;},status(code){this.code=code;return this;},json(body){this.body=body;return this;},send(body){this.body=body;return this;},end(){return this;}};
    await context.module.exports({method,query:{action},body,headers:{origin:'https://omeryigitler.com',cookie:`__Host-taurus_challenge=${cookie}`,...headers}},res);return res;};
}
function approval(extra={}) {return {sessionHash,status:'approved',expiresAt:{toMillis:()=>Date.now()+60000},...extra};}
test('Telegram approval is browser-bound and consumed atomically only once',async()=>{
 const db=memoryDB({['auth_requests/'+id]:approval()});let minted=0;
 const call=handler(db,{createCustomToken:async()=>{minted++;return 'token';}});
 const wrong=await call('check_status',{reqId:id},{cookie:'__Host-taurus_challenge='+ 'c'.repeat(64)});
 assert.equal(wrong.code,403);assert.equal(minted,0);
 const result=await Promise.all([call('check_status',{reqId:id}),call('check_status',{reqId:id})]);
 assert.equal(result.filter(r=>r.body.customToken==='token').length,1);assert.equal(minted,1);
});
test('expired and missing-expiry Telegram approvals never mint a token',async()=>{
 for(const expiresAt of [undefined,{toMillis:()=>Date.now()-1}]){
 const call=handler(memoryDB({['auth_requests/'+id]:approval({expiresAt})}),{createCustomToken:()=>{throw Error('must not mint');}});
 const result=await call('check_status',{reqId:id});assert.equal(result.body.status,'expired');}
});
test('state-changing gateway actions require same-origin POST',async()=>{
 const call=handler(memoryDB());
 for(const action of ['bootstrap','session','logout','auth_init','check_status','passkey_challenge','passkey_verify','passkey_register_options','passkey_register_verify']) {
 assert.equal((await call(action,{}, {},'GET')).code,405);
 assert.equal((await call(action,{}, {origin:'https://evil.example'})).code,403);
 assert.equal((await call(action,{}, {origin:undefined})).code,403);
 }
});
test('bootstrap cookie is secure HttpOnly host-only; session binding requires it',async()=>{
 const call=handler(memoryDB());const result=await call('bootstrap',{}, {cookie:''});
 assert.match(result.headers['Set-Cookie'],/^__Host-taurus_challenge=[a-f0-9]{64}; Path=\/; Max-Age=900; HttpOnly; Secure; SameSite=Strict$/);
 assert.throws(()=>security.requireSession({headers:{}}),{status:401});
});
test('rate limit survives independent requests and resets only after window',async()=>{
 const db=memoryDB();await security.throttle(db,'ip',2,100,1000);await security.throttle(db,'ip',2,100,1001);
 await assert.rejects(security.throttle(db,'ip',2,100,1002),{status:429});
 await security.throttle(db,'ip',2,100,1100);
});
test('passkey challenge rejects wrong browser, request, expiry and parallel replay',async()=>{
 const db=memoryDB();await security.saveChallenge(db,'challenge',sessionHash,id,60000);
 await assert.rejects(security.consumeChallenge(db,'challenge','wrong',id),{status:403});
 await assert.rejects(security.consumeChallenge(db,'challenge',sessionHash,'wrong'),{status:403});
 const results=await Promise.allSettled([security.consumeChallenge(db,'challenge',sessionHash,id,'credential',1),security.consumeChallenge(db,'challenge',sessionHash,id,'credential',1)]);
 assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
 await security.saveChallenge(db,'expired',sessionHash,id,-1);
 await assert.rejects(security.consumeChallenge(db,'expired',sessionHash,id),{status:403});
});
test('passkey counter persists and rejects stale counters while supporting synced zero counters',async()=>{
 const db=memoryDB();
 for(const [challenge,count] of [['one',1],['two',2]]){await security.saveChallenge(db,challenge,sessionHash,id,60000);await security.consumeChallenge(db,challenge,sessionHash,id,'device',count);}
 await security.saveChallenge(db,'stale',sessionHash,id,60000);
 await assert.rejects(security.consumeChallenge(db,'stale',sessionHash,id,'device',1),{status:403});
 for(const challenge of ['sync1','sync2']){await security.saveChallenge(db,challenge,sessionHash,id,60000);await security.consumeChallenge(db,challenge,sessionHash,id,'synced',0);}
});
test('session cookies require fresh admin authentication and protect admin HTML',async()=>{
 let claims={admin:false,role:'admin',auth_time:Date.now()/1000};let cookies=0;
 const call=handler(memoryDB(),{verifyIdToken:async()=>claims,createSessionCookie:async()=>{cookies++;return 'session';},verifySessionCookie:async()=>claims});
 assert.equal((await call('session',{idToken:'id'})).code,403);
 claims={admin:true,role:'admin',auth_time:Date.now()/1000-600};assert.equal((await call('session',{idToken:'id'})).code,403);assert.equal(cookies,0);
 claims.auth_time=Date.now()/1000;const result=await call('session',{idToken:'id'});assert.equal(result.code,200);assert.match(result.headers['Set-Cookie'],/HttpOnly; Secure; SameSite=Strict/);
 assert.equal((await call('admin_page',{}, {},'GET')).code,302);
 const admin=await call('admin_page',{}, {cookie:'__Host-taurus_admin=session'},'GET');assert.equal(admin.code,200);assert.match(admin.body,/<!DOCTYPE html>/i);assert.equal(admin.headers['Cache-Control'],'private, no-store');
 const logout=await call('logout');assert.match(logout.headers['Set-Cookie'],/Max-Age=0/);
});

async function initializeDashboard(user) {
  let callback;
  let listeners = 0;
  const firebase = { initializeApp() {}, firestore: () => ({}), auth: () => ({ onAuthStateChanged(fn) { callback = fn; } }) };
  const window = { firebaseConfig: { apiKey: 'test' }, location: {}, dispatchEvent() {} };
  const context = {
    firebase, window, Event, console: { log() {}, warn() {} },
    document: { addEventListener: (_, fn) => fn() },
    setupRealtimeListeners: () => listeners++, loadTrafficChart() {}, startAutoPipelineListener() {}, setInterval() {}
  };
  const source = fs.readFileSync(path.join(__dirname, '../src/admin/state-and-pricing.js'), 'utf8');
  vm.runInNewContext(source.slice(source.lastIndexOf("document.addEventListener('DOMContentLoaded'")), context);
  await callback(user);
  return { listeners, redirect: window.location.href };
}

test('anonymous and non-admin sessions cannot start dashboard listeners', async () => {
  for (const user of [null, { isAnonymous: true }, { getIdTokenResult: async () => ({ claims: {} }) }]) {
    const result = await initializeDashboard(user);
    assert.equal(result.listeners, 0);
    assert.equal(result.redirect, 'gateway.html');
  }
});
test('verified admin session starts dashboard listeners', async () => {
  const result = await initializeDashboard({ getIdTokenResult: async () => ({ claims: { admin: true, role: 'admin' } }) });
  assert.equal(result.listeners, 1);
  assert.equal(result.redirect, undefined);
});

test('Telegram webhook fails closed without a secret and rejects a mismatched secret', () => {
  const source = fs.readFileSync(path.join(__dirname, '../api/webhook.js'), 'utf8');
  const helper = source.slice(source.indexOf('function isTelegramWebhookAuthorized'), source.indexOf('function getGeminiModel'));
  const context = { process: { env: {} } };
  vm.runInNewContext(helper, context);
  assert.equal(context.isTelegramWebhookAuthorized({ headers: {} }), false);
  context.process.env.TELEGRAM_WEBHOOK_SECRET = 'test-only-secret';
  assert.equal(context.isTelegramWebhookAuthorized({ headers: { 'x-telegram-bot-api-secret-token': 'wrong' } }), false);
  assert.equal(context.isTelegramWebhookAuthorized({ headers: { 'x-telegram-bot-api-secret-token': 'test-only-secret' } }), true);
});
