const START_ORIGIN = 'https://start.omeryigitler.com';
const ADMIN_ORIGIN = 'https://omeryigitler.com';
function denied(statusCode = 403) {
  return Object.assign(new Error(statusCode === 401 ? 'Yönetici Gateway oturumunu yenileyin.' : 'Bu kaynaktan ajans işlemine izin verilmiyor.'), {
    statusCode, code: statusCode === 401 ? 'authentication_required' : 'origin_forbidden'
  });
}
function applyOriginPolicy(req, res) {
  const origin = req.headers?.origin;
  if (origin && origin !== START_ORIGIN && origin !== ADMIN_ORIGIN) throw denied();
  // Cookie-authenticated mutations must originate in one of the two workspaces.
  if (!origin && req.method !== 'GET' && /(?:^|;\s*)__Host-taurus_admin=/.test(req.headers?.cookie || '')) throw denied();
  if (origin === START_ORIGIN) {
    res.setHeader('Access-Control-Allow-Origin', START_ORIGIN);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  }
  if (req.method === 'OPTIONS' && origin !== START_ORIGIN && origin !== ADMIN_ORIGIN) throw denied();
}
async function verifySession(req, auth) {
  const cookie = String(req.headers?.cookie || '').split(';').map(value => value.trim()).find(value => value.startsWith('__Host-taurus_admin='))?.slice(20);
  if (!cookie) return null;
  if (cookie.length > 12000) throw denied(401);
  let claims;
  try { claims = await (auth || require('../api/_firebaseAdmin').admin.auth()).verifySessionCookie(cookie, true); }
  catch (_) { throw denied(401); }
  if (claims.admin !== true || claims.role !== 'admin') throw denied();
  return { id: claims.uid, uid: claims.uid, source: 'gateway', role: 'admin' };
}
module.exports = { applyOriginPolicy, verifySession };
