const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { generateSvg, WIDTH, HEIGHT } = require("../scripts/generate-social-preview.js");

test("social share image is a 1200x630 static PNG with readable OG metadata", () => {
  const html = fs.readFileSync(path.join(__dirname, "..", "src/pages/index.html"), "utf8");
  const imageUrl = "https://omeryigitler.com/assets/social-preview-v2.png";
  assert.equal(WIDTH, 1200);
  assert.equal(HEIGHT, 630);
  assert.match(html, /<meta property="og:image" content="https:\/\/omeryigitler\.com\/assets\/social-preview-v2\.png">/);
  assert.match(html, /<meta property="twitter:image" content="https:\/\/omeryigitler\.com\/assets\/social-preview-v2\.png">/);
  assert.match(html, /<meta property="og:image:width" content="1200">/);
  assert.match(html, /<meta property="og:image:height" content="630">/);
  assert.match(html, /<meta property="og:image:type" content="image\/png">/);
  assert.ok(html.includes(imageUrl));
});

test("social artwork reuses canonical Taurus logo inside a centered safe square", () => {
  const svg = generateSvg();
  const sourceLogo = fs.readFileSync(path.join(__dirname, "..", "public/icons/favicon_taurus.svg"), "utf8");
  const sourceMark = sourceLogo.match(/<path\b[^>]*\/>/);
  assert.ok(sourceMark, "expected canonical Taurus path");
  assert.ok(svg.includes(sourceMark[0]), "reuse the original complete Taurus path");
  assert.ok(svg.includes('<g id="social-taurus-mark" transform="translate(418 59) scale(0.7)">'));
  assert.equal((svg.match(/<svg\b/g) || []).length, 1, "avoid nested SVG clipping in Chromium");
  assert.ok(svg.includes('textLength="490"'), "the brand name must fit the centered square crop");
  assert.ok(svg.includes('x="600" y="447"'), "brand name must remain centered");
  assert.ok(svg.includes("WEB DESIGN"));
  assert.ok(svg.includes("&amp; DEVELOPMENT"));
  assert.ok(!svg.includes("<!-- TAURUS_MARK -->"), "the logo placeholder must be replaced");
  assert.ok(!svg.includes("Premium Web Design &amp; Development"), "avoid wide text that gets cropped");
});

test("WhatsApp crawlers receive Open Graph image and required tags", () => {
  const root = path.join(__dirname, "..");
  const html = fs.readFileSync(path.join(root, "src/pages/index.html"), "utf8");
  const head = html.slice(0, html.indexOf("</head>"));
  assert.ok(Buffer.byteLength(head, "utf8") < 300 * 1024, "Open Graph head must be in first 300 KB");
  for (const property of ["og:title", "og:description", "og:url", "og:image"]) {
    const start = head.indexOf('<meta property="' + property + '"');
    assert.ok(start > -1, property + " must appear inside the head");
    const element = head.slice(start, head.indexOf(">", start) + 1);
    assert.match(element, /content="[^"]+"/, property + " must have a nonempty value");
  }
  assert.ok(head.includes('content="https://omeryigitler.com/assets/social-preview-v2.png"'));
  const robots = fs.readFileSync(path.join(root, "public/robots.txt"), "utf8");
  assert.ok(/User-agent: \*\s+Allow: \//.test(robots), "public social crawler must be allowed");
});
