const https = require('node:https');
const dns = require('node:dns').promises;
const net = require('node:net');
const { failure } = require('./studio-policy');

function publicAddress(address) {
  // Restrict website inspection to global IPv4. Other networks are skipped,
  // never fetched through a permissive fallback or an automatic redirect.
  if (net.isIP(address) !== 4) return false;
  const [a, b, c] = address.split('.').map(Number);
  return !(a === 0 || a === 10 || a === 127 || a >= 224 ||
    (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) || (a === 192 && (b === 168 || b === 0 || (b === 88 && c === 99))) ||
    (a === 198 && (b === 18 || b === 19 || (b === 51 && c === 100))) ||
    (a === 203 && b === 0 && c === 113));
}
function websiteUrl(value) {
  let url;
  try { url = new URL(value); } catch { throw failure('unsafe_website', 'Website inspection was skipped: invalid URL.'); }
  if (url.protocol !== 'https:' || (url.port && url.port !== '443') || url.username || url.password || net.isIP(url.hostname) || !url.hostname.includes('.') || /(?:^|\.)(?:localhost|local|internal|test|invalid)$/.test(url.hostname)) throw failure('unsafe_website', 'Website inspection requires a public HTTPS domain.');
  url.hash = ''; return url;
}
async function readWebsite(value, { lookup = dns.lookup, request = https.request, deadline = Date.now() + 6000 } = {}, redirects = 0) {
  const url = websiteUrl(value), remaining = deadline - Date.now();
  if (remaining <= 0) throw failure('website_timeout', 'Website inspection timed out.');
  const addresses = await Promise.race([lookup(url.hostname, { all: true, family: 4 }), new Promise((_, reject) => { const timer = setTimeout(() => reject(failure('website_timeout', 'DNS lookup timed out.')), remaining); timer.unref?.(); })]);
  if (!addresses.length || addresses.some(entry => !publicAddress(entry.address))) throw failure('unsafe_website', 'Website inspection blocked a non-public network address.');
  // Pin the checked address to the TLS connection to prevent DNS rebinding.
  const response = await new Promise((resolve, reject) => {
    const req = request(url, { method: 'GET', agent: false, headers: { 'User-Agent': 'TaurusAgency/1.0 (+https://omeryigitler.com)', Accept: 'text/html', 'Accept-Encoding': 'identity' },
      lookup: (_host, options, callback) => options?.all ? callback(null, [{ address: addresses[0].address, family: 4 }]) : callback(null, addresses[0].address, 4) }, res => {
      let size = 0; const chunks = [];
      res.on('data', chunk => { size += chunk.length; if (size > 350000) { req.destroy(failure('website_size', 'Website inspection exceeded the response limit.')); } else chunks.push(chunk); });
      res.on('error', reject);
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, html: Buffer.concat(chunks).toString('utf8') }));
    });
    const timer = setTimeout(() => req.destroy(failure('website_timeout', 'Website inspection timed out.')), Math.max(1, deadline - Date.now()));
    req.on('error', reject); req.on('close', () => clearTimeout(timer)); req.end();
  });
  if ([301, 302, 303, 307, 308].includes(response.status)) {
    if (redirects >= 2 || !response.headers.location) throw failure('website_redirect', 'Website redirect limit reached.');
    return readWebsite(new URL(response.headers.location, url).href, { lookup, request, deadline }, redirects + 1);
  }
  if (response.status !== 200 || !/^text\/html\b/i.test(response.headers['content-type'] || '')) throw failure('website_unavailable', 'The website did not return a readable public HTML page.');
  return { url: url.href, html: response.html };
}
function inspect(html) {
  // Only structural signals are retained. Remote scripts/content never execute.
  const clean = String(html).replace(/<!--[\s\S]*?-->/g, '').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
  const meta = [...clean.matchAll(/<meta\b[^>]*>/gi)].map(m => m[0]);
  return {
    title: /<title\b[^>]*>\s*[^<]+\s*<\/title>/i.test(clean),
    viewport: meta.some(tag => /name\s*=\s*["']viewport["']/i.test(tag)),
    description: meta.some(tag => /name\s*=\s*["']description["']/i.test(tag) && /content\s*=\s*["'][^"']{10,}/i.test(tag)),
    heading: /<h1\b[^>]*>\s*[\s\S]*?<\/h1>/i.test(clean),
    contact: /(?:href\s*=\s*["'](?:tel:|mailto:)|<form\b|href\s*=\s*["'][^"']*contact)/i.test(clean)
  };
}
async function research(company, { read = readWebsite, now = Date.now } = {}) {
  const base = { at: now(), source: company.source, score: 0, signals: [], limitations: [], status: 'directory_only' };
  if (!company.website) return { ...base, score: 75, signals: ['No website is listed in the directory entry.'], limitations: ['A missing directory field does not prove the business has no website.', 'Verify the company, service offering and contact permission before sharing a concept.'] };
  try {
    const page = await read(company.website), checks = inspect(page.html);
    const gaps = Object.entries(checks).filter(([, pass]) => !pass).map(([name]) => name);
    return { ...base, status: 'inspected', checkedUrl: page.url, checks, score: Math.min(95, 30 + gaps.length * 15),
      signals: gaps.length ? gaps.map(name => `Initial HTML: ${name} signal was not found.`) : ['The initial HTML contains title, viewport, description, heading and contact signals.'],
      limitations: ['This is a single-page structural check, not a performance or accessibility audit.', 'JavaScript-rendered content may be missed. Opportunity scores require human review.'] };
  } catch (error) {
    return { ...base, status: 'unavailable', score: 0, signals: ['The listed website could not be safely inspected.'], limitations: ['No quality conclusion was drawn from the failed request.'], errorCode: error?.code && /^[a-z_]{1,50}$/.test(error.code) ? error.code : 'website_unavailable' };
  }
}
module.exports = { publicAddress, websiteUrl, readWebsite, inspect, research };
