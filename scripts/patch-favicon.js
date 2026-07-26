const fs = require("node:fs");
const path = require("node:path");

const indexPath = path.resolve(__dirname, "..", "index.html");
let html = fs.readFileSync(indexPath, "utf8");
let changed = false;

const legacyFavicon = '    <link rel="icon" href="assets/favicon_transparent.svg" type="image/svg+xml">';
const previousBlock = [
  '    <link rel="icon" href="/favicon.ico" sizes="16x16 32x32 48x48">',
  '    <link rel="icon" href="/favicon.svg" type="image/svg+xml" sizes="any">',
  '    <link rel="icon" href="/favicon-32x32.png" type="image/png" sizes="32x32">',
  '    <link rel="icon" href="/favicon-16x16.png" type="image/png" sizes="16x16">',
  '    <link rel="apple-touch-icon" href="/apple-touch-icon.png" sizes="180x180">',
  '    <link rel="manifest" href="/site.webmanifest">',
].join("\n");
const faviconBlock = [
  '    <link rel="icon" href="/favicon.svg" type="image/svg+xml" sizes="any">',
  '    <link rel="alternate icon" href="/favicon.ico" sizes="16x16 32x32 48x48">',
  '    <link rel="apple-touch-icon" href="/apple-touch-icon.png" sizes="180x180">',
  '    <link rel="manifest" href="/site.webmanifest">',
].join("\n");

if (!html.includes(faviconBlock)) {
  if (html.includes(previousBlock)) {
    html = html.replace(previousBlock, faviconBlock);
  } else if (html.includes(legacyFavicon)) {
    html = html.replace(legacyFavicon, faviconBlock);
  } else {
    throw new Error("Could not find existing favicon metadata in index.html");
  }
  changed = true;
}

const structuredImage = '      "image": "https://omeryigitler.com/assets/preview.png",\n';
const structuredLogo = '      "logo": "https://omeryigitler.com/favicon.svg",\n';
const previousStructuredLogo = '      "logo": "https://omeryigitler.com/icon-512.png",\n';
if (!html.includes(structuredLogo)) {
  if (html.includes(previousStructuredLogo)) {
    html = html.replace(previousStructuredLogo, structuredLogo);
  } else if (html.includes(structuredImage)) {
    html = html.replace(structuredImage, structuredImage + structuredLogo);
  } else {
    throw new Error("Could not find the structured-data image field in index.html");
  }
  changed = true;
}

if (changed) {
  fs.writeFileSync(indexPath, html, "utf8");
  console.log("Patched round favicon, app-icon and structured-data metadata in index.html");
} else {
  console.log("Round favicon metadata is already up to date");
}
