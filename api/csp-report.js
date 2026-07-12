const MAX_REPORT_BYTES = 16 * 1024;

function readReport(req) {
  if (!req.body) return null;
  if (typeof req.body === 'object') return req.body;

  const raw = String(req.body).slice(0, MAX_REPORT_BYTES);
  try {
    return JSON.parse(raw);
  } catch (error) {
    return { raw };
  }
}

module.exports = async function cspReportHandler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end();
  }

  const report = readReport(req);
  const payload = report?.['csp-report'] || report?.body || report || {};

  // Keep logs compact and never persist page content or request headers.
  console.warn('[csp-report]', {
    documentUri: String(payload.documentURI || payload['document-uri'] || '').slice(0, 500),
    effectiveDirective: String(payload.effectiveDirective || payload['effective-directive'] || '').slice(0, 120),
    violatedDirective: String(payload.violatedDirective || payload['violated-directive'] || '').slice(0, 200),
    blockedUri: String(payload.blockedURL || payload['blocked-uri'] || '').slice(0, 500),
    sourceFile: String(payload.sourceFile || payload['source-file'] || '').slice(0, 500),
    lineNumber: Number(payload.lineNumber || payload['line-number'] || 0),
    disposition: String(payload.disposition || '').slice(0, 40)
  });

  return res.status(204).end();
};
