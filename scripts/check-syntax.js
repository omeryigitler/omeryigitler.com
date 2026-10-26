const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
function check(directory) {
  for (const entry of fs.readdirSync(path.join(root, directory), { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) check(file);
    else if (entry.name.endsWith('.js')) execFileSync(process.execPath, ['--check', file], { cwd: root, stdio: 'inherit' });
  }
}
for (const directory of ['api', 'lib', 'scripts', 'assets/js', 'src/admin']) check(directory);
