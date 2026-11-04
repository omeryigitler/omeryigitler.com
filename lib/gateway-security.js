const crypto = require('node:crypto');
const COOKIE = '__Host-taurus_challenge';
const hash = value => crypto.createHash('sha256').update(String(value)).digest('hex');
function failure(status, message) { return Object.assign(new Error(message), { status }); }
function browserSession(req) {
  const value = String(req.headers.cookie || '').split(';').map(s => s.trim()).find(s => s.startsWith(COOKIE + '='))?.slice(COOKIE.length + 1);
  return /^[a-f0-9]{64}$/.test(value || '') ? value : null;
}
function requireSession(req) {
  const value = browserSession(req);
  if (!value) throw failure(401, 'Reload this page to start a secure session.');
  return hash(value);
}
function sameOrigin(req) {
  const origin = req.headers.origin;
  return origin === 'https://omeryigitler.com' || origin === 'https://www.omeryigitler.com';
}
function bootstrap(req, res) {
  const token = browserSession(req) || crypto.randomBytes(32).toString('hex');
  res.setHeader('Set-Cookie', `${COOKIE}=${token}; Path=/; Max-Age=900; HttpOnly; Secure; SameSite=Strict`);
  return res.status(200).json({ ready: true });
}
function requestId(value) {
  if (!/^[a-f0-9]{32}$/.test(value || '')) throw failure(400, 'Invalid request.');
  return value;
}
async function throttle(db, key, limit, windowMs, now = Date.now()) {
  const ref = db.collection('gateway_limits').doc(hash(key));
  await db.runTransaction(async tx => {
    const snapshot = await tx.get(ref);
    const data = snapshot.exists ? snapshot.data() : {};
    const active = Number(data.resetAt) > now;
    if (active && Number(data.count) >= limit) throw failure(429, 'Too many requests. Please wait and try again.');
    tx.set(ref, { count: active ? Number(data.count) + 1 : 1, resetAt: active ? data.resetAt : now + windowMs });
  });
}
async function consumeApproval(db, reqId, sessionHash) {
  const ref = db.collection('auth_requests').doc(requestId(reqId));
  return db.runTransaction(async tx => {
    const snapshot = await tx.get(ref);
    const data = snapshot.exists ? snapshot.data() : {};
    if (!snapshot.exists || data.sessionHash !== sessionHash) throw failure(403, 'Request unavailable.');
    const expires = data.expiresAt?.toMillis?.() || 0;
    if (Date.now() >= expires) return { status: 'expired' };
    if (data.status !== 'approved') return { status: data.status || 'pending' };
    tx.update(ref, { status: 'consumed', consumedAt: Date.now() });
    return { status: 'approved', approvedBy: data.approvedBy };
  });
}
async function saveChallenge(db, challenge, sessionHash, reqId, ttl) {
  await db.collection('gateway_challenges').doc(hash(challenge)).create({
    sessionHash, reqId, expiresAt: Date.now() + ttl, consumed: false
  });
}
function clientChallenge(response) {
  try {
    const raw = response?.response?.clientDataJSON;
    if (typeof raw !== 'string' || raw.length > 16384) throw new Error();
    const challenge = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8')).challenge;
    if (typeof challenge !== 'string' || challenge.length > 4096) throw new Error();
    return challenge;
  } catch (_) { throw failure(400, 'Invalid credential response.'); }
}
async function consumeChallenge(db, challenge, sessionHash, reqId, credentialId, newCounter) {
  const ref = db.collection('gateway_challenges').doc(hash(challenge));
  const counterRef = credentialId ? db.collection('gateway_credentials').doc(hash(credentialId)) : null;
  await db.runTransaction(async tx => {
    const snapshot = await tx.get(ref);
    const counterSnapshot = counterRef ? await tx.get(counterRef) : null;
    const data = snapshot.exists ? snapshot.data() : {};
    if (!snapshot.exists || data.consumed || data.sessionHash !== sessionHash || data.reqId !== reqId || !Number.isFinite(data.expiresAt) || Date.now() >= data.expiresAt) {
      throw failure(403, 'Verification expired. Please try again.');
    }
    const oldCounter = counterSnapshot?.exists ? Number(counterSnapshot.data().counter || 0) : 0;
    if (counterRef && (oldCounter > 0 || newCounter > 0) && newCounter <= oldCounter) throw failure(403, 'Credential replay rejected.');
    tx.update(ref, { consumed: true, consumedAt: Date.now() });
    if (counterRef) tx.set(counterRef, { counter: newCounter, updatedAt: Date.now() });
  });
}
module.exports = { hash, failure, browserSession, requireSession, sameOrigin, bootstrap, requestId, throttle, consumeApproval, saveChallenge, clientChallenge, consumeChallenge };
