#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
node - "$@" <<'JS'
const fs = require('node:fs');
const [name, title = 'New Page | Ömer Yiğitler', description = 'Your page description here'] = process.argv.slice(2);
if (!name || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(name)) {
  console.error('Usage: bash scripts/create-page.sh page-name "Page title" "Description"');
  process.exit(1);
}
const escape = value => value.replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const output = `src/pages/${name}.html`;
const html = fs.readFileSync('templates/page.html', 'utf8')
  .replaceAll('New Page | Ömer Yiğitler', escape(title))
  .replaceAll('Your Page Title', escape(title))
  .replaceAll('Your page description here', escape(description))
  .replaceAll('your-page.html', `${name}.html`);
fs.writeFileSync(output, html, { flag: 'wx' });
console.log(`Created ${output}; published URL: /${name}.html`);
JS
