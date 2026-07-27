const fs = require("node:fs");
const path = require("node:path");

const indexPath = path.resolve(__dirname, "..", "index.html");
let html = fs.readFileSync(indexPath, "utf8");

const previousCredit = "            <p class=\"foot-credit\">Designed &amp; Developed by <b>Ömer Yiğitler</b></p>";
const canonicalCredit = "            <p class=\"foot-credit\">Designed &amp; Developed by <b>ÖMER YİĞİTLER</b></p>";

if (!html.includes(canonicalCredit)) {
  if (!html.includes(previousCredit)) {
    throw new Error("Could not find the homepage footer credit in index.html");
  }

  html = html.replace(previousCredit, canonicalCredit);
  fs.writeFileSync(indexPath, html, "utf8");
  console.log("Patched the canonical uppercase homepage footer credit");
} else {
  console.log("Homepage footer credit is already canonical");
}
