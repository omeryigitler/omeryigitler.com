const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');

async function checkStatus(data) {
  let minted = 0;
  const updates = [];
  const admin = {
    auth: () => ({ createCustomToken: async () => { minted++; return 'verified-token'; } }),
    firestore: { FieldValue: { serverTimestamp: () => 'now' } }
  };
  const db = { collection: () => ({ doc: () => ({
    get: async () => ({ exists: true, data: () => data }),
    update: async value => updates.push(value)
  }) }) };
  const context = { module: { exports: {} }, require: name => {
    if (name === './_firebaseAdmin') return { admin, db };
    return {};
  }, Date, console };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../api/gateway.js'), 'utf8'), context);
  const response = { setHeader() {}, status() { return this; }, json(value) { this.body = value; } };
  await context.module.exports({ headers: {}, method: 'GET', query: { action: 'check_status', reqId: 'a'.repeat(32) } }, response);
  return { body: response.body, minted, updates };
}

test('expired Telegram approvals cannot mint new admin tokens', async () => {
  const result = await checkStatus({ status: 'approved', expiresAt: { toMillis: () => Date.now() - 1 } });
  assert.equal(result.body.status, 'expired');
  assert.equal(result.minted, 0);
});
test('approval without expiry fails closed', async () => {
  const result = await checkStatus({ status: 'approved' });
  assert.equal(result.body.status, 'expired');
  assert.equal(result.minted, 0);
});
test('valid Telegram approval retains the admin login flow', async () => {
  const result = await checkStatus({ status: 'approved', expiresAt: { toMillis: () => Date.now() + 60000 } });
  assert.equal(result.body.customToken, 'verified-token');
  assert.equal(result.minted, 1);
});

async function initializeDashboard(user) {
  let callback;
  let listeners = 0;
  const firebase = { initializeApp() {}, firestore: () => ({}), auth: () => ({ onAuthStateChanged(fn) { callback = fn; } }) };
  const window = { firebaseConfig: { apiKey: 'test' }, location: {} };
  const context = {
    firebase, window, console: { log() {}, warn() {} },
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
