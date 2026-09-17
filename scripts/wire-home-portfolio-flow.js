const fs = require("fs");
const path = require("path");

const indexPath = path.join(__dirname, "..", "index.html");
const cssMarkerStart = "<!-- home-portfolio-flow:css:start -->";
const cssMarkerEnd = "<!-- home-portfolio-flow:css:end -->";
const jsMarkerStart = "<!-- home-portfolio-flow:js:start -->";
const jsMarkerEnd = "<!-- home-portfolio-flow:js:end -->";
const cssBlock = `${cssMarkerStart}\n    <link rel="stylesheet" href="/assets/css/home-portfolio-flow.css?v=V1">\n    ${cssMarkerEnd}`;
const jsBlock = `${jsMarkerStart}\n    <script src="/assets/js/home-portfolio-flow.js?v=V1" defer></script>\n    ${jsMarkerEnd}`;

function stripBlock(html, start, end) {
  const pattern = new RegExp(`${start.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[\\s\\S]*?${end.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*`, "g");
  return html.replace(pattern, "");
}

let html = fs.readFileSync(indexPath, "utf8");
html = stripBlock(html, cssMarkerStart, cssMarkerEnd);
html = stripBlock(html, jsMarkerStart, jsMarkerEnd);

if (!html.includes("</head>") || !html.includes("</body>")) {
  throw new Error("index.html is missing required head/body closing tags");
}

html = html.replace("</head>", `    ${cssBlock}\n</head>`);
html = html.replace("</body>", `    ${jsBlock}\n</body>`);
fs.writeFileSync(indexPath, html);
console.log("Wired homepage portfolio continuum assets into index.html");
