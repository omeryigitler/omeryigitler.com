const crypto = require("node:crypto");
const chromium = require("@sparticuz/chromium");
const puppeteer = require("puppeteer-core");
const { admin, db, requireEnv } = require("./_firebaseAdmin");

const PROJECT_ID = "built-with-seyhan";
const TARGET_URL = "https://builtwithseyhan.com/";
const PROJECT = {
  slug: PROJECT_ID,
  title: "Built with Seyhan",
  category: "Online fitness coaching",
  kicker: "Custom Coaching Website",
  challenge: "Presenting a personal coaching brand, services and transformation pathway in a focused digital experience.",
  solution: "A responsive, conversion-oriented website with clear coaching positioning, mobile-first content hierarchy and direct consultation calls to action.",
  result: "A polished online presence that makes Mustafa Seyhan's coaching offer easier to understand and access across devices.",
  liveUrl: TARGET_URL,
  desktopImage: "",
  mobileImage: "",
  alternateDesktopImage: "",
  alternateLabelA: "Primary",
  alternateLabelB: "Alternate",
  accent: "#D8FF00",
  sortOrder: 50,
  displayType: "desktop-mobile",
  published: true,
  lang: ""
};

function sendJson(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.end(JSON.stringify(body));
}

function bucketName() {
  return String(process.env.FIREBASE_STORAGE_BUCKET || `${requireEnv("FIREBASE_PROJECT_ID")}.firebasestorage.app`).trim();
}

async function capture(browser, mobile) {
  const page = await browser.newPage();
  await page.setViewport(mobile
    ? { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true }
    : { width: 1440, height: 900, deviceScaleFactor: 1.25 });
  await page.setBypassServiceWorker(true);
  await page.setCacheEnabled(false);
  await page.setUserAgent(mobile
    ? "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1"
    : "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36");
  try {
    await page.goto(TARGET_URL, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForNetworkIdle({ idleTime: 700, timeout: 9000 }).catch(() => {});
    await page.evaluate(async () => {
      window.scrollTo(0, 0);
      if (document.fonts?.ready) await document.fonts.ready.catch(() => {});
    });
    await new Promise((resolve) => setTimeout(resolve, 1200));
    const bytes = await page.screenshot({ type: "jpeg", quality: 88, fullPage: false, optimizeForSpeed: true });
    return Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes);
  } finally {
    await page.close().catch(() => {});
  }
}

async function upload(buffer, device) {
  const bucket = admin.storage().bucket(bucketName());
  const filePath = `portfolio-captures/${PROJECT_ID}/${device}.jpg`;
  const downloadToken = crypto.randomUUID();
  const file = bucket.file(filePath);
  await file.save(buffer, {
    resumable: false,
    validation: "crc32c",
    metadata: {
      contentType: "image/jpeg",
      cacheControl: "public,max-age=31536000,immutable",
      metadata: { firebaseStorageDownloadTokens: downloadToken }
    }
  });
  return `https://firebasestorage.googleapis.com/v0/b/${encodeURIComponent(bucket.name)}/o/${encodeURIComponent(filePath)}?alt=media&token=${downloadToken}`;
}

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return sendJson(res, 405, { ok: false, error: "Method not allowed." });
  }

  const ref = db.collection("portfolio_projects").doc(PROJECT_ID);
  let browser;
  try {
    const existing = await ref.get();
    const data = existing.exists ? existing.data() || {} : {};
    if (data.desktopImage && data.mobileImage && data.capturedFrom === TARGET_URL) {
      return sendJson(res, 200, { ok: true, id: PROJECT_ID, alreadyComplete: true });
    }

    await ref.set({
      ...PROJECT,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      ...(existing.exists ? {} : { createdAt: admin.firestore.FieldValue.serverTimestamp() })
    }, { merge: true });

    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: null,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless
    });

    const [desktopBuffer, mobileBuffer] = await Promise.all([capture(browser, false), capture(browser, true)]);
    const [desktopImage, mobileImage] = await Promise.all([upload(desktopBuffer, "desktop"), upload(mobileBuffer, "mobile")]);

    await ref.set({
      ...PROJECT,
      desktopImage,
      mobileImage,
      capturedFrom: TARGET_URL,
      captureUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    return sendJson(res, 200, { ok: true, id: PROJECT_ID, installed: true, desktopImage, mobileImage });
  } catch (error) {
    console.error("[install-builtwithseyhan-once] failed:", error);
    return sendJson(res, 500, { ok: false, error: "Built with Seyhan could not be installed.", details: error?.message || String(error) });
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
};
