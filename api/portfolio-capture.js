const crypto = require("node:crypto");
const dns = require("node:dns").promises;
const net = require("node:net");
const chromium = require("@sparticuz/chromium");
const puppeteer = require("puppeteer-core");
const { admin, db, requireEnv } = require("./_firebaseAdmin");

const COLLECTION = "portfolio_projects";
const CAPTURE_TIMEOUT_MS = 30000;
const DESKTOP_VIEWPORT = { width: 1440, height: 900, deviceScaleFactor: 1.25 };
const MOBILE_VIEWPORT = { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true };

function sendJson(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.end(JSON.stringify(body));
}

function fail(statusCode, code, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

async function readJson(req) {
  if (req.body && typeof req.body === "object") return req.body;
  const chunks = [];
  let bytes = 0;
  for await (const chunk of req) {
    bytes += chunk.length;
    if (bytes > 32 * 1024) throw fail(413, "body_too_large", "Request body is too large.");
    chunks.push(chunk);
  }
  if (!chunks.length) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw fail(400, "invalid_json", "Request body must be valid JSON.");
  }
}

function cleanId(value) {
  const id = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 100);
  if (!id) throw fail(400, "invalid_id", "A valid project id is required.");
  return id;
}

function isPrivateIp(address) {
  if (!address) return true;
  if (net.isIPv4(address)) {
    const parts = address.split(".").map(Number);
    const [a, b] = parts;
    return a === 0 || a === 10 || a === 127 || a >= 224 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 198 && (b === 18 || b === 19));
  }
  if (net.isIPv6(address)) {
    const normalized = address.toLowerCase();
    return normalized === "::" || normalized === "::1" ||
      normalized.startsWith("fc") || normalized.startsWith("fd") ||
      normalized.startsWith("fe8") || normalized.startsWith("fe9") ||
      normalized.startsWith("fea") || normalized.startsWith("feb") ||
      normalized.startsWith("2001:db8:") || normalized.startsWith("::ffff:127.") ||
      normalized.startsWith("::ffff:10.") || normalized.startsWith("::ffff:192.168.");
  }
  return true;
}

function blockedHostname(hostname) {
  const host = String(hostname || "").toLowerCase().replace(/\.$/, "");
  return !host || host === "localhost" || host.endsWith(".localhost") ||
    host.endsWith(".local") || host.endsWith(".internal") ||
    host === "metadata.google.internal";
}

async function assertPublicUrl(value) {
  let url;
  try {
    url = new URL(String(value || ""));
  } catch {
    throw fail(400, "invalid_url", "A valid public http or https URL is required.");
  }
  if (!new Set(["http:", "https:"]).has(url.protocol)) {
    throw fail(400, "invalid_protocol", "Only http and https URLs can be captured.");
  }
  if (url.username || url.password || blockedHostname(url.hostname)) {
    throw fail(400, "blocked_url", "This URL cannot be captured.");
  }
  if (net.isIP(url.hostname)) {
    if (isPrivateIp(url.hostname)) throw fail(400, "blocked_address", "Private network addresses cannot be captured.");
  } else {
    let records;
    try {
      records = await dns.lookup(url.hostname, { all: true, verbatim: true });
    } catch {
      throw fail(400, "dns_failed", "The project hostname could not be resolved.");
    }
    if (!records.length || records.some((record) => isPrivateIp(record.address))) {
      throw fail(400, "blocked_address", "Private network addresses cannot be captured.");
    }
  }
  return url.toString();
}

async function verifyAdmin(req) {
  const agent = require("../lib/agent");
  return agent.verifyAgentRequest(req);
}

function directPrivateRequest(value) {
  try {
    const url = new URL(value);
    return blockedHostname(url.hostname) || (net.isIP(url.hostname) && isPrivateIp(url.hostname));
  } catch {
    return true;
  }
}

async function preparePage(browser, viewport, mobile) {
  const page = await browser.newPage();
  await page.setViewport(viewport);
  await page.setBypassServiceWorker(true);
  await page.setCacheEnabled(false);
  await page.setUserAgent(mobile
    ? "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1"
    : "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36");
  await page.setRequestInterception(true);
  page.on("request", async (request) => {
    try {
      const isMainNavigation = request.isNavigationRequest() && request.frame() === page.mainFrame();
      if (isMainNavigation) await assertPublicUrl(request.url());
      else if (/^https?:/i.test(request.url()) && directPrivateRequest(request.url())) return request.abort("blockedbyclient");
      return request.continue();
    } catch {
      return request.abort("blockedbyclient");
    }
  });
  return page;
}

async function captureViewport(browser, targetUrl, device) {
  const mobile = device === "mobile";
  const page = await preparePage(browser, mobile ? MOBILE_VIEWPORT : DESKTOP_VIEWPORT, mobile);
  try {
    await page.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: CAPTURE_TIMEOUT_MS });
    await assertPublicUrl(page.url());
    await page.waitForNetworkIdle({ idleTime: 700, timeout: 9000 }).catch(() => {});
    await page.evaluate(async () => {
      window.scrollTo(0, 0);
      if (document.fonts?.ready) await document.fonts.ready.catch(() => {});
    });
    await new Promise((resolve) => setTimeout(resolve, 900));
    const bytes = await page.screenshot({ type: "jpeg", quality: 88, fullPage: false, optimizeForSpeed: true });
    return Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes);
  } finally {
    await page.close().catch(() => {});
  }
}

function bucketName() {
  return String(process.env.FIREBASE_STORAGE_BUCKET || `${requireEnv("FIREBASE_PROJECT_ID")}.firebasestorage.app`).trim();
}

async function uploadCapture(buffer, projectId, device) {
  const bucket = admin.storage().bucket(bucketName());
  const filePath = `portfolio-captures/${projectId}/${device}.jpg`;
  const token = crypto.randomUUID();
  const file = bucket.file(filePath);
  await file.save(buffer, {
    resumable: false,
    validation: "crc32c",
    metadata: {
      contentType: "image/jpeg",
      cacheControl: "public,max-age=31536000,immutable",
      metadata: { firebaseStorageDownloadTokens: token }
    }
  });
  return `https://firebasestorage.googleapis.com/v0/b/${encodeURIComponent(bucket.name)}/o/${encodeURIComponent(filePath)}?alt=media&token=${token}`;
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return sendJson(res, 405, { ok: false, code: "method_not_allowed", error: "Method not allowed." });
  }

  let browser;
  try {
    await verifyAdmin(req);
    const body = await readJson(req);
    const id = cleanId(body.id);
    const ref = db.collection(COLLECTION).doc(id);
    const snapshot = await ref.get();
    const stored = snapshot.exists ? snapshot.data() || {} : {};
    const targetUrl = await assertPublicUrl(body.url || stored.liveUrl);

    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: null,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless
    });

    const [desktopBuffer, mobileBuffer] = await Promise.all([
      captureViewport(browser, targetUrl, "desktop"),
      captureViewport(browser, targetUrl, "mobile")
    ]);
    const [desktopImage, mobileImage] = await Promise.all([
      uploadCapture(desktopBuffer, id, "desktop"),
      uploadCapture(mobileBuffer, id, "mobile")
    ]);

    await ref.set({
      liveUrl: targetUrl,
      desktopImage,
      mobileImage,
      capturedFrom: targetUrl,
      captureUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    return sendJson(res, 200, { ok: true, id, desktopImage, mobileImage, capturedFrom: targetUrl });
  } catch (cause) {
    console.error("[portfolio-capture] failed:", cause);
    const status = Number(cause?.statusCode || 500);
    return sendJson(res, status, {
      ok: false,
      code: cause?.code || (status >= 500 ? "capture_failed" : "request_failed"),
      error: status >= 500 ? "Project previews could not be captured." : cause?.message || "Capture failed."
    });
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
};
