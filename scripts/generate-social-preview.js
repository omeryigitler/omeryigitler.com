/**
 * Produce the 1200 × 630 PNG used by Open Graph / Instagram / WhatsApp.
 * Instagram may crop OG banners to square. Critical elements therefore stay
 * inside the center 630 × 630 crop (x=285..915), with extra breathing room.
 *
 * Reuses the canonical Taurus vector; no hand-drawn or outdated logo copies.
 * Generated output is static and served without launching Chromium per request.
 */
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const WIDTH = 1200;
const HEIGHT = 630;
const TEMPLATE = path.join(ROOT, "public", "assets", "social-preview-v2.svg");
const OUTPUT = path.join(ROOT, "public", "assets", "social-preview-v2.png");

function generateSvg() {
  const template = fs.readFileSync(TEMPLATE, "utf8");
  const taurus = fs.readFileSync(path.join(ROOT, "public", "icons", "favicon_taurus.svg"), "utf8");
  if (!template.includes("<!-- TAURUS_MARK -->")) {
    throw new Error("Social preview template must contain TAURUS_MARK");
  }
  // Nested SVG clipping in Chromium removes most of the original Taurus mark.
  // Keep the canonical path/gradient, but position them inside a regular group.
  const rootTag = taurus.match(/^<svg\b[^>]*>/);
  if (!rootTag || !/<path\b/.test(taurus) || !/<\/svg>\s*$/.test(taurus)) {
    throw new Error("Canonical Taurus SVG has an unexpected structure");
  }
  const logoBody = taurus.slice(rootTag[0].length).replace(/<\/svg>\s*$/, "");
  const positionedTaurus = `<g id="social-taurus-mark" transform="translate(418 59) scale(0.7)">${logoBody}</g>`;
  return template.replace("<!-- TAURUS_MARK -->", positionedTaurus);
}

async function main() {
  const puppeteer = require("puppeteer-core");
  const chromium = require("@sparticuz/chromium");
  const executablePath = process.env.SOCIAL_PREVIEW_CHROMIUM_PATH || await chromium.executablePath();
  const browser = await puppeteer.launch({
    executablePath,
    pipe: true,
    args: chromium.args,
    headless: true,
    defaultViewport: { width: WIDTH, height: HEIGHT, deviceScaleFactor: 1 },
  });

  try {
    const page = await browser.newPage();
    const svg = generateSvg();
    // Use a data URL: no requests, external font downloads, or site runtime code.
    await page.goto(`data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`, { waitUntil: "load" });
    await page.screenshot({ path: OUTPUT, type: "png" });
    const size = fs.statSync(OUTPUT).size;
    // Keep the PNG below 300 KiB for dependable WhatsApp thumbnails.
    if (size > 300 * 1024) throw new Error(`Social preview exceeds WhatsApp-safe size: ${size} bytes`);
    console.log(`Social preview generated: ${path.relative(ROOT, OUTPUT)} (${WIDTH}x${HEIGHT}, ${size} bytes)`);
  } finally {
    await browser.close();
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error("Unable to generate the Open Graph social preview:", error);
    process.exitCode = 1;
  });
}

module.exports = { generateSvg, WIDTH, HEIGHT };
