// Deliberately small, source-backed directory searches. No model or paid API.
const crypto = require('node:crypto');
const { failure } = require('./studio-policy');
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
  return `[out:json][timeout:15];nwr${INDUSTRIES[p.industry].filter}["name"](${REGIONS[p.region].box.join(',')});out tags 30;`;
}
async function readJson(response, max = 300000) {
  if (!response.ok) throw failure('directory_unavailable', 'The public directory is busy. Retry later; no substitute companies were invented.', 503);
  const reader = response.body.getReader(); let size = 0; const chunks = [];
  try { for (;;) { const { done, value } = await reader.read(); if (done) break; size += value.length; if (size > max) throw failure('directory_response_limit', 'Directory response exceeded the safe limit.', 503); chunks.push(Buffer.from(value)); } }
  finally { reader.releaseLock(); }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { throw failure('directory_invalid', 'The directory returned an invalid response.', 503); }
}
function candidates(result, input) {
  const p = parameters(input), seen = new Set();
  if (!Array.isArray(result.elements) || result.remark) throw failure('directory_incomplete', 'The directory search did not complete. Retry later.', 503);
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
function createDiscovery({ db, now = Date.now, fetchImpl = fetch, endpoint = process.env.STUDIO_DIRECTORY_URL || 'https://overpass-api.de/api/interpreter' }) {
  return async input => {
    const p = parameters(input), cacheKey = crypto.createHash('sha256').update(`${p.region}:${p.industry}`).digest('hex');
    const cache = db.collection('studio_directory_cache').doc(cacheKey), quota = db.collection('studio_runtime').doc('directory');
    const cached = (await cache.get()).data();
    if (cached?.expiresAt > now()) return candidates(cached.result, p);
    await db.runTransaction(async tx => {
      const data = (await tx.get(quota)).data() || {}, day = new Date(now()).toISOString().slice(0, 10);
      if (data.nextAt > now() || (data.day === day && data.requests >= 5)) throw failure('directory_limit', 'Directory searches are limited to five per day with a one-minute cooldown. Cached searches remain available.');
      tx.set(quota, { day, requests: data.day === day ? data.requests + 1 : 1, nextAt: now() + 60000 });
    });
    const url = new URL(endpoint);
    if (url.protocol !== 'https:' || url.username || url.password) throw failure('directory_configuration', 'A secure directory endpoint is required.', 503);
    const response = await fetchImpl(url.href, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'TaurusAgency/1.0 (+https://omeryigitler.com)' }, body: new URLSearchParams({ data: query(p) }), signal: AbortSignal.timeout(19000), redirect: 'error' });
    const result = await readJson(response); const rows = candidates(result, p);
    const batch = db.batch(); batch.set(cache, { result, expiresAt: now() + 86400000 }); await batch.commit();
    return rows;
  };
}
module.exports = { REGIONS, INDUSTRIES, parameters, query, candidates, createDiscovery };
