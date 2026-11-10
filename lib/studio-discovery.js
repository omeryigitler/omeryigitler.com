// Deliberately small, source-backed directory searches. No model or paid API.
const crypto = require('node:crypto');
const { failure } = require('./studio-policy');
// Both services expose the same OSM dataset. One sequential failover at most;
// a rate limit is never bypassed by switching hosts. No paid adapter exists.
const PUBLIC_ENDPOINTS = Object.freeze([
  'https://overpass.private.coffee/api/interpreter',
  'https://overpass-api.de/api/interpreter'
]);
const RETRYABLE = new Set(['directory_timeout', 'directory_network', 'directory_unavailable', 'directory_incomplete']);
const DIRECTORY_MESSAGES = Object.freeze({
  directory_timeout: 'The business directory did not respond in time. Retry this task later; saved research is retained.',
  directory_network: 'The business directory could not be reached. Retry this task later; saved research is retained.',
  directory_unavailable: 'The public business directory is temporarily busy. Retry this task later.',
  directory_rate_limit: 'The public business directory is limiting requests. Wait before retrying this task.',
  directory_incomplete: 'The business directory could not finish the search. Retry this task later.',
  directory_invalid: 'The business directory returned unreadable data. No companies were imported.',
  directory_response_limit: 'The business directory response exceeded the size limit. No companies were imported.',
  directory_configuration: 'The business directory connection needs a server configuration review.',
  directory_cooldown: 'Wait one minute between new directory searches. Cached results remain available.',
  directory_limit: 'Today’s five new directory searches have been used. Retry tomorrow; cached results remain available.'
});
function directoryFailure(code, statusCode = 503, detail = {}) {
  return Object.assign(failure(code, DIRECTORY_MESSAGES[code], statusCode), detail);
}
const REGIONS = Object.freeze({
  valletta: { label: 'Valletta', country: 'MT', box: [35.89, 14.50, 35.91, 14.53] },
  sliema: { label: 'Sliema / St Julian’s', country: 'MT', box: [35.90, 14.47, 35.94, 14.52] },
  gozo: { label: 'Victoria, Gozo', country: 'MT', box: [36.03, 14.22, 36.06, 14.25] },
  istanbul: { label: 'İstanbul · Beyoğlu', country: 'TR', box: [41.02, 28.96, 41.05, 29.00] },
  ankara: { label: 'Ankara · Çankaya', country: 'TR', box: [39.89, 32.83, 39.93, 32.88] },
  izmir: { label: 'İzmir · Konak', country: 'TR', box: [38.40, 27.11, 38.44, 27.16] },
  antalya: { label: 'Antalya · Muratpaşa', country: 'TR', box: [36.87, 30.69, 36.90, 30.74] }
});
const INDUSTRIES = Object.freeze({
  hospitality: { label: 'Hotels & guest houses', filter: '["tourism"~"^(hotel|guest_house)$"]' },
  dining: { label: 'Restaurants & cafés', filter: '["amenity"~"^(restaurant|cafe)$"]' },
  fitness: { label: 'Fitness studios', filter: '["leisure"="fitness_centre"]' },
  beauty: { label: 'Beauty & hair salons', filter: '["shop"~"^(beauty|hairdresser)$"]' },
  retail: { label: 'Independent shops', filter: '["shop"~"^(clothes|florist|bakery|furniture)$"]' }
});
function parameters(input) {
  const region = REGIONS[input.region], industry = INDUSTRIES[input.industry];
  if (!region || !industry || region.country !== input.country) throw failure('invalid_search', 'Select a supported market, region and industry.', 400);
  const limit = Number(input.limit || 3);
  if (!Number.isInteger(limit) || limit < 1 || limit > 3) throw failure('invalid_search', 'A search can prepare at most three companies.', 400);
  return { country: region.country, region: input.region, industry: input.industry, limit };
}
function query(input) {
  const p = parameters(input);
  return `[out:json][timeout:8][maxsize:33554432];nwr${INDUSTRIES[p.industry].filter}["name"](${REGIONS[p.region].box.join(',')});out tags 30;`;
}
async function readJson(response, max = 300000) {
  if (!response.ok) {
    await response.body?.cancel().catch(() => {});
    const code = response.status === 429 ? 'directory_rate_limit' : [502, 503, 504].includes(response.status) ? 'directory_unavailable' : 'directory_configuration';
    throw directoryFailure(code, 503, { providerStatus: response.status });
  }
  if (!response.body) throw directoryFailure('directory_invalid');
  const reader = response.body.getReader(); let size = 0; const chunks = [];
  try { for (;;) { const { done, value } = await reader.read(); if (done) break; size += value.length; if (size > max) { await reader.cancel(); throw directoryFailure('directory_response_limit'); } chunks.push(Buffer.from(value)); } }
  finally { reader.releaseLock(); }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { throw directoryFailure('directory_invalid'); }
}
function candidates(result, input) {
  const p = parameters(input), seen = new Set();
  if (!Array.isArray(result?.elements) || result.remark) throw directoryFailure('directory_incomplete');
  return result.elements.filter(row => ['node', 'way', 'relation'].includes(row.type) && Number.isSafeInteger(row.id) && row.id > 0 && row.tags?.name && !row.tags.brand && !row.tags['brand:wikidata']).map(row => {
    const tags = row.tags;
    let website = tags.website || tags['contact:website'] || null;
    if (website && !/^https?:\/\//i.test(website)) website = `https://${website}`;
    try { if (website && (!['http:', 'https:'].includes(new URL(website).protocol) || new URL(website).username || new URL(website).password)) website = null; } catch { website = null; }
    return { name: String(tags.name).slice(0, 200), country: p.country, location: REGIONS[p.region].label,
      industry: INDUSTRIES[p.industry].label, industryKey: p.industry, website,
      source: `https://www.openstreetmap.org/${row.type}/${row.id}`, sourceKey: `osm:${row.type}:${row.id}`,
      notes: website ? 'Website listed in the public business directory.' : 'No website listed in this directory entry. This does not establish that the company has no website.' };
  }).filter(row => { const key = row.website ? new URL(row.website).hostname.replace(/^www\./, '') : row.name.toLocaleLowerCase(); if (seen.has(key)) return false; seen.add(key); return true; }).slice(0, p.limit);
}
function createDiscovery({ db, now = Date.now, fetchImpl = fetch, endpoint = process.env.STUDIO_DIRECTORY_URL, onAttempt = () => {} }) {
  return async input => {
    const p = parameters(input), cacheKey = crypto.createHash('sha256').update(`${p.region}:${p.industry}`).digest('hex');
    const cache = db.collection('studio_directory_cache').doc(cacheKey), quota = db.collection('studio_runtime').doc('directory');
    const cached = (await cache.get()).data();
    if (cached?.expiresAt > now()) return candidates(cached.result, p);
    // A custom compatible endpoint is exclusive: never leak its query to a
    // public service or log its URL/credentials on a configuration error.
    const endpoints = endpoint ? [endpoint] : PUBLIC_ENDPOINTS;
    const urls = endpoints.map(value => {
      try { const url = new URL(value); if (url.protocol !== 'https:' || url.username || url.password) throw Error(); return url; }
      catch { throw directoryFailure('directory_configuration'); }
    });
    await db.runTransaction(async tx => {
      const data = (await tx.get(quota)).data() || {}, day = new Date(now()).toISOString().slice(0, 10);
      if (data.day === day && data.requests >= 5) throw directoryFailure('directory_limit', 409, { retryAt: Date.parse(`${day}T00:00:00Z`) + 86400000 });
      if (data.nextAt > now()) throw directoryFailure('directory_cooldown', 409, { retryAt: data.nextAt });
      tx.set(quota, { day, requests: data.day === day ? data.requests + 1 : 1, nextAt: now() + 60000 });
    });
    const attempts = [];
    for (const [index, url] of urls.entries()) {
      const provider = endpoint ? 'configured' : index === 0 ? 'osm_private_coffee' : 'osm_overpass', started = Date.now();
      let result, rows;
      try {
        // 28s directory + at most 18s website inspection fits the 60s runner.
        const response = await fetchImpl(url.href, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'TaurusAgency/1.0 (+https://omeryigitler.com)' }, body: new URLSearchParams({ data: query(p) }), signal: AbortSignal.timeout(14000), redirect: 'error' });
        result = await readJson(response); rows = candidates(result, p);
      } catch (cause) {
        const code = DIRECTORY_MESSAGES[cause?.code] ? cause.code : ['TimeoutError', 'AbortError'].includes(cause?.name) || ['ETIMEDOUT', 'UND_ERR_CONNECT_TIMEOUT', 'UND_ERR_HEADERS_TIMEOUT', 'UND_ERR_BODY_TIMEOUT'].includes(cause?.cause?.code || cause?.code) ? 'directory_timeout' : 'directory_network';
        const attempt = { provider, code, elapsedMs: Date.now() - started, ...(Number.isInteger(cause?.providerStatus) ? { status: cause.providerStatus } : {}) };
        attempts.push(attempt); onAttempt(attempt);
        if (index + 1 < urls.length && RETRYABLE.has(code)) continue;
        throw directoryFailure(code, 503, { providerAttempts: attempts, retryAt: now() + 60000 });
      }
      onAttempt({ provider, code: 'ok', elapsedMs: Date.now() - started });
      // Database failures are outside the provider catch and never trigger
      // another external request or get misreported as a network error.
      const batch = db.batch(); batch.set(cache, { result, expiresAt: now() + 86400000 }); await batch.commit();
      return rows;
    }
  };
}
module.exports = { REGIONS, INDUSTRIES, PUBLIC_ENDPOINTS, DIRECTORY_MESSAGES, parameters, query, candidates, createDiscovery };
