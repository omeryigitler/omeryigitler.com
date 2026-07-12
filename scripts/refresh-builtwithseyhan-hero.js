const crypto = require("node:crypto");
const chromium = require("@sparticuz/chromium");
const puppeteer = require("puppeteer-core");
const { admin, db, requireEnv } = require("../api/_firebaseAdmin");

const PROJECT_ID = "built-with-seyhan";
const TARGET_URL = "https://builtwithseyhan.com/tr";
const DESKTOP_VIEWPORT = { width: 1440, height: 900, deviceScaleFactor: 1 };
const MOBILE_VIEWPORT = { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true };

function bucketName() {
  return String(process.env.FIREBASE_STORAGE_BUCKET || `${requireEnv("FIREBASE_PROJECT_ID")}.firebasestorage.app`).trim();
}

async function preparePage(browser, viewport, mobile) {
  const page = await browser.newPage();
  await page.setViewport(viewport);
  await page.setCacheEnabled(false);
  await page.setBypassServiceWorker(true);
  await page.setUserAgent(mobile
    ? "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1"
    : "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36");
  return page;
}

async function capture(browser, viewport, mobile) {
  const page = await preparePage(browser, viewport, mobile);
  try {
    await page.goto(TARGET_URL, { waitUntil: "domcontentloaded", timeout: 45000 });

    // Capture the initial hero while it is fully visible. Do not wait for
    // network-idle or a fixed 4+ second delay because the hero is removed then.
    await page.waitForFunction((isMobile) => {
      const normalize = (value) => String(value || "").replace(/\s+/g, " ").trim().toUpperCase();
      const minFontSize = isMobile ? 26 : 48;
      return Array.from(document.querySelectorAll("h1, h2, [role='heading']")).some((element) => {
        const text = normalize(element.textContent);
        const rect = element.getBoundingClientRect();
        const style = window.getComputedStyle(element);
        const opacity = Number.parseFloat(style.opacity || "1");
        const fontSize = Number.parseFloat(style.fontSize || "0");
        return text.includes("BUILT WITH SEYHAN") &&
          rect.width > (isMobile ? 180 : 420) &&
          rect.height > (isMobile ? 60 : 110) &&
          rect.top < window.innerHeight && rect.bottom > 0 &&
          style.display !== "none" && style.visibility !== "hidden" &&
          opacity >= 0.95 && fontSize >= minFontSize;
      });
    }, { timeout: 15000 }, mobile);

    // Give the entrance animation a brief moment to settle, still safely before
    // the approximately four-second removal point.
    await new Promise((resolve) => setTimeout(resolve, 650));
    await page.evaluate(async () => {
      window.scrollTo(0, 0);
      if (document.fonts?.ready) {
        await Promise.race([
          document.fonts.ready.catch(() => {}),
          new Promise((resolve) => setTimeout(resolve, 700))
        ]);
      }
    });

    await page.addStyleTag({
      content: "*,*::before,*::after{animation-play-state:paused!important;transition:none!important;}"
    });
    await new Promise((resolve) => setTimeout(resolve, 120));

    const bytes = await page.screenshot({ type: "jpeg", quality: 90, fullPage: false, optimizeForSpeed: true });
    return Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes);
  } finally {
    await page.close().catch(() => {});
  }
}

async function upload(buffer, device) {
  const bucket = admin.storage().bucket(bucketName());
  const path = `portfolio-captures/${PROJECT_ID}/${device}.jpg`;
  const token = crypto.randomUUID();
  await bucket.file(path).save(buffer, {
    resumable: false,
    validation: "crc32c",
    metadata: {
      contentType: "image/jpeg",
      cacheControl: "public,max-age=31536000,immutable",
      metadata: { firebaseStorageDownloadTokens: token }
    }
  });
  return `https://firebasestorage.googleapis.com/v0/b/${encodeURIComponent(bucket.name)}/o/${encodeURIComponent(path)}?alt=media&token=${token}`;
}

async function main() {
  if (process.env.VERCEL_ENV && process.env.VERCEL_ENV !== "production") {
    console.log("Skipping Built with Seyhan capture outside production.");
    return;
  }

  const browser = await puppeteer.launch({
    args: chromium.args,
    defaultViewport: null,
    executablePath: await chromium.executablePath(),
    headless: chromium.headless
  });

  try {
    const [desktopBuffer, mobileBuffer] = await Promise.all([
      capture(browser, DESKTOP_VIEWPORT, false),
      capture(browser, MOBILE_VIEWPORT, true)
    ]);
    const [desktopImage, mobileImage] = await Promise.all([
      upload(desktopBuffer, "desktop"),
      upload(mobileBuffer, "mobile")
    ]);

    await db.collection("portfolio_projects").doc(PROJECT_ID).set({
      liveUrl: TARGET_URL,
      desktopImage,
      mobileImage,
      capturedFrom: TARGET_URL,
      captureUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    console.log(JSON.stringify({ ok: true, id: PROJECT_ID, capturedFrom: TARGET_URL, desktopImage, mobileImage }));
  } finally {
    await browser.close().catch(() => {});
  }
}

main().catch((error) => {
  console.error("Built with Seyhan hero recapture failed:", error);
  process.exit(1);
});
