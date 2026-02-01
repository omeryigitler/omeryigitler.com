const chromium = require('@sparticuz/chromium');
const puppeteer = require('puppeteer-core');

const PDF_TIMEOUT_MS = 25000;

const readBody = async (req) => {
  if (req.body && typeof req.body === 'object') return req.body;
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (!chunks.length) return {};
  const raw = Buffer.concat(chunks).toString('utf8');
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch (e) {
    return {};
  }
};

const getBaseUrl = (req) => {
  const proto = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  return `${proto}://${host}`;
};

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const body = await readBody(req);
  const { type, request, breakdown } = body || {};

  if (!type || !request || !breakdown) {
    res.status(400).json({ error: 'Missing payload' });
    return;
  }

  const view = type === 'contract' ? 'contract' : 'proposal';
  const payload = Buffer.from(encodeURIComponent(JSON.stringify({
    ...request,
    breakdown
  }))).toString('base64');

  const baseUrl = process.env.PDF_BASE_URL || getBaseUrl(req);
  const targetUrl = `${baseUrl}/pricing-tool/dist/index.html?view=${view}&payload=${payload}&pdf=1`;

  let browser;
  try {
    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: { width: 1280, height: 720, deviceScaleFactor: 2 },
      executablePath: await chromium.executablePath(),
      headless: chromium.headless
    });

    const page = await browser.newPage();
    await page.goto(targetUrl, { waitUntil: 'networkidle0', timeout: PDF_TIMEOUT_MS });

    const selector = view === 'proposal' ? '#proposal-content' : '#contract-content';
    await page.waitForSelector(selector, { timeout: PDF_TIMEOUT_MS });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '12mm', bottom: '12mm', left: '12mm', right: '12mm' }
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=${view === 'proposal' ? 'Quote' : 'Contract'}.pdf`);
    res.status(200).send(pdfBuffer);
  } catch (e) {
    console.error('PDF generation failed:', e);
    res.status(500).json({ error: 'PDF generation failed', details: e.message || String(e) });
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch (e) {
        // ignore
      }
    }
  }
};
