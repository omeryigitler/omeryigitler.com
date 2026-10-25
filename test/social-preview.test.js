const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { generateSvg, WIDTH, HEIGHT } = require("../scripts/generate-social-preview.js");

test("social share image is a 1200x630 static PNG with readable OG metadata", () => {
  const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
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
  const sourceLogo = fs.readFileSync(path.join(__dirname, "..", "favicon_taurus.svg"), "utf8");
  assert.ok(svg.includes(sourceLogo.replace(/<svg\b/, '<svg x="460" y="115" width="280" height="244"')));
  assert.ok(svg.includes('textLength="490"'), "the brand name must fit the centered square crop");
  assert.ok(svg.includes('x="600" y="447"'), "brand name must remain centered");
  assert.ok(svg.includes("WEB DESIGN"));
  assert.ok(svg.includes("&amp; DEVELOPMENT"));
  assert.ok(!svg.includes("<!-- TAURUS_MARK -->"), "the logo placeholder must be replaced");
  assert.ok(!svg.includes("Premium Web Design &amp; Development"), "avoid wide text that gets cropped");
});
