const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const { applyOriginPolicy, verifySession } = require('../lib/studio-access');

function bridge(referrer = 'https://start.omeryigitler.com/', search = '?embed=agency&view=projects') {
  const events = {}, calls = [], sent = [], classes = [];
  const parent = { postMessage: (data, origin) => sent.push({ data, origin }) };
  const window = { addEventListener: (name, fn) => { events[name] = fn; } };
  vm.runInNewContext(fs.readFileSync('public/assets/js/start-agency-bridge.js', 'utf8'), {
    parent, window, URL, URLSearchParams, location: { search },
    document: { referrer, documentElement: { classList: { add: name => classes.push(name) } }, addEventListener() {} },
    switchTab: view => calls.push(view)
  });
  return { events, calls, sent, classes, parent };
}
test('only the Startpage can activate embedded navigation; readiness follows admin authentication', () => {
  assert.equal(bridge('https://untrusted.example/').classes.length, 0);
  const b = bridge();
  assert.equal(b.calls.length, 0);
  b.events.message({ origin: 'https://untrusted.example', source: b.parent, data: { type: 'taurus:agency:navigate', view: 'clients' } });
  b.events['taurus:admin-ready']();
  assert.deepEqual(b.calls, ['projects']);
  assert.equal(JSON.stringify(b.sent), '[{"data":{"type":"taurus:agency:ready"},"origin":"https://start.omeryigitler.com"}]');
});
test('navigation rejects spoofed windows and unknown views, retaining the world view', () => {
  const b = bridge(); b.events['taurus:admin-ready']();
  for (const [source, view] of [[{}, 'clients'], [b.parent, 'settings'], [b.parent, 'https://untrusted.example']]) {
    b.events.message({ origin: 'https://start.omeryigitler.com', source, data: { type: 'taurus:agency:navigate', view } });
  }
  assert.deepEqual(b.calls, ['projects']);
  b.events.message({ origin: 'https://start.omeryigitler.com', source: b.parent, data: { type: 'taurus:agency:navigate', view: 'intelligence' } });
  assert.deepEqual(b.calls, ['projects', 'intelligence']);
});
test('Studio cookie access verifies revocation and both admin claims', async () => {
  const req = { headers: { cookie: '__Host-taurus_admin=test-session' } };
  let checks = 0;
  const auth = { verifySessionCookie: async (cookie, revoked) => { checks++; assert.equal(revoked, true); assert.equal(cookie, 'test-session'); return { uid: 'admin', admin: true, role: 'admin' }; } };
  assert.equal((await verifySession(req, auth)).id, 'admin'); assert.equal(checks, 1);
  for (const claims of [{ admin: true }, { role: 'admin' }, { admin: false, role: 'admin' }]) {
    await assert.rejects(verifySession(req, { verifySessionCookie: async () => claims }), { statusCode: 403 });
  }
  await assert.rejects(verifySession(req, { verifySessionCookie: async () => { throw Error('revoked'); } }), { statusCode: 401 });
  assert.equal(await verifySession({ headers: {} }, auth), null);
});
test('Studio CORS trusts only the two workspaces and blocks cookie mutations without Origin', () => {
  const headers = {}, res = { setHeader: (name, value) => { headers[name] = value; } };
  applyOriginPolicy({ method: 'OPTIONS', headers: { origin: 'https://start.omeryigitler.com' } }, res);
  assert.equal(headers['Access-Control-Allow-Origin'], 'https://start.omeryigitler.com');
  assert.equal(headers['Access-Control-Allow-Credentials'], 'true');
  for (const origin of ['https://evil.example', 'https://start.omeryigitler.com.evil.example', 'null']) {
    assert.throws(() => applyOriginPolicy({ method: 'POST', headers: { origin } }, res), { statusCode: 403 });
  }
  assert.throws(() => applyOriginPolicy({ method: 'POST', headers: { cookie: '__Host-taurus_admin=test-session' } }, res), { statusCode: 403 });
  assert.doesNotThrow(() => applyOriginPolicy({ method: 'POST', headers: { origin: 'https://omeryigitler.com', cookie: '__Host-taurus_admin=test-session' } }, res));
});
