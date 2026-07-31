const fs = require("node:fs");
const path = require("node:path");

const rootDir = path.resolve(__dirname, "..");
const faviconBlock = [
  '    <link rel="icon" href="/favicon.svg" type="image/svg+xml" sizes="any">',
  '    <link rel="alternate icon" href="/favicon.ico" sizes="16x16 32x32 48x48">',
  '    <link rel="apple-touch-icon" href="/apple-touch-icon.png" sizes="180x180">',
  '    <link rel="manifest" href="/site.webmanifest">',
  '    <meta name="theme-color" content="#050505">',
].join("\n");

const iconLinkPattern = /^[ \t]*<link\b(?=[^>]*\brel=(['"])(?:icon|alternate icon|shortcut icon|apple-touch-icon|manifest)\1)[^>]*>\s*\r?\n?/gim;
const themeMetaPattern = /^[ \t]*<meta\b(?=[^>]*\bname=(['"])theme-color\1)[^>]*>\s*\r?\n?/gim;

const htmlFiles = fs
  .readdirSync(rootDir, { withFileTypes: true })
  .filter((entry) => entry.isFile() && entry.name.endsWith(".html"))
  .map((entry) => entry.name)
  .sort();

if (!htmlFiles.length) {
  throw new Error("No root HTML files found for favicon metadata patching");
}

let patchedCount = 0;
for (const fileName of htmlFiles) {
  const filePath = path.join(rootDir, fileName);
  const original = fs.readFileSync(filePath, "utf8");
  let html = original.replace(iconLinkPattern, "").replace(themeMetaPattern, "");

  const titleClose = html.indexOf("</title>");
  const headClose = html.indexOf("</head>");
  if (titleClose !== -1) {
    const insertAt = titleClose + "</title>".length;
    html = `${html.slice(0, insertAt)}\n${faviconBlock}${html.slice(insertAt)}`;
  } else if (headClose !== -1) {
    html = `${html.slice(0, headClose)}${faviconBlock}\n${html.slice(headClose)}`;
  } else {
    throw new Error(`Could not find <head> insertion point in ${fileName}`);
  }

  if (fileName === "index.html") {
    const desiredStructuredLogo = '      "logo": "https://omeryigitler.com/favicon.svg",';
    const legacyStructuredLogoPattern = /^\s*"logo":\s*"https:\/\/omeryigitler\.com\/(?:icon-512\.png|favicon\.svg)",\s*$/m;
    if (legacyStructuredLogoPattern.test(html)) {
      html = html.replace(legacyStructuredLogoPattern, desiredStructuredLogo);
    } else {
      const structuredImage = '      "image": "https://omeryigitler.com/assets/preview.png",';
      if (html.includes(structuredImage)) {
        html = html.replace(structuredImage, `${structuredImage}\n${desiredStructuredLogo}`);
      }
    }
  }

  if (html !== original) {
    fs.writeFileSync(filePath, html, "utf8");
    patchedCount += 1;
  }
}

console.log(`Unified round favicon metadata across ${patchedCount}/${htmlFiles.length} root HTML pages`);
