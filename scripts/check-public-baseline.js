const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const baseline = process.argv[2];
if (!baseline) throw new Error('Usage: node scripts/check-public-baseline.js /path/to/baseline/dist');
const output = path.resolve(__dirname, '../dist');
const allowed = new Set(['admin.html', 'assets/js/admin-app.js', 'assets/css/studio-admin.css']);
function files(root, prefix = '') {
  return fs.readdirSync(path.join(root, prefix), { withFileTypes: true }).flatMap(entry => {
    const relative = path.join(prefix, entry.name);
    return entry.isDirectory() ? files(root, relative) : [relative];
  });
}
function digest(root, relative) {
  const file = path.join(root, relative);
  return fs.existsSync(file) ? crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex') : null;
}
const all = new Set([...files(baseline), ...files(output)]);
const unexpected = [...all].filter(file => !allowed.has(file) && digest(baseline, file) !== digest(output, file));
if (unexpected.length) throw new Error(`Unexpected public output differences:\n${unexpected.join('\n')}`);
console.log(`Public baseline verified: ${[...all].filter(file => !allowed.has(file)).length} files unchanged; only explicit admin outputs may differ.`);
