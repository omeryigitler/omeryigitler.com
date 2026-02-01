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
  const renderMode = process.env.PDF_RENDER_MODE || 'html';
  const requestData = {
    ...request,
    breakdown
  };
  const payload = Buffer.from(encodeURIComponent(JSON.stringify(requestData))).toString('base64');

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

    let outputBuffer;

    if (renderMode === 'native') {
      await page.waitForFunction(() => !!window.__TAURUS_PDF_GENERATOR__, { timeout: PDF_TIMEOUT_MS });
      const pdfBytes = await page.evaluate(async (data, kind) => {
        const generator = window.__TAURUS_PDF_GENERATOR__;
        if (!generator) throw new Error('PDF generator not ready');
        const blob = await generator(data, data.breakdown, kind === 'contract' ? 'contract' : 'quote');
        const arrayBuffer = await blob.arrayBuffer();
        return Array.from(new Uint8Array(arrayBuffer));
      }, requestData, type);
      outputBuffer = Buffer.from(pdfBytes);
    } else {
      const selector = view === 'proposal' ? '#proposal-content' : '#contract-content';
      await page.emulateMediaType('print');
      await page.waitForSelector(selector, { timeout: PDF_TIMEOUT_MS });
      try {
        await page.evaluateHandle('document.fonts.ready');
      } catch (e) {
        // ignore font readiness errors
      }
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        preferCSSPageSize: true,
        margin: { top: '12mm', bottom: '12mm', left: '12mm', right: '12mm' }
      });
      outputBuffer = Buffer.isBuffer(pdfBuffer) ? pdfBuffer : Buffer.from(pdfBuffer);
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=${view === 'proposal' ? 'Quote' : 'Contract'}.pdf`);
    res.setHeader('Content-Length', outputBuffer.length);
    res.status(200).send(outputBuffer);
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
