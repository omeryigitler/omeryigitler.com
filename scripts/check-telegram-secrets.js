// Check source files and deployable output. Never include a matching value in logs.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const ignored = new Set(['.git', 'node_modules', '.next', '.vercel', 'coverage']);
const token = /[0-9]{5,16}:[A-Za-z0-9_-]{35,}/;
function scan(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ignored.has(entry.name)) continue;
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) scan(file);
    else if (entry.isFile()) {
      const data = fs.readFileSync(file);
      if (!data.subarray(0, 4096).includes(0) && token.test(data.toString('utf8'))) {
        console.error('Telegram credential detected in', path.relative(root, file));
        process.exitCode = 1;
      }
    }
  }
}
scan(root);
