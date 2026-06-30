const fs = require('fs');
const path = require('path');

const indexPath = path.join(process.cwd(), 'index.html');
let html = fs.readFileSync(indexPath, 'utf8');

function addBefore(marker, addition) {
  if (html.includes(addition.trim())) return;
  const index = html.indexOf(marker);
  if (index === -1) throw new Error(`Marker not found: ${marker}`);
  html = html.slice(0, index) + addition + html.slice(index);
}

addBefore('</head>', '    <link rel="stylesheet" href="/assets/css/instagram-feed.css">\n');

fs.writeFileSync(indexPath, html);
console.log('Instagram feed styles connected.');
