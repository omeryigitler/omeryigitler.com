const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const sourceDir = path.join(root, 'src/admin');
const files = JSON.parse(fs.readFileSync(path.join(sourceDir, 'manifest.json'), 'utf8'));
// Keep one classic script so existing inline event handlers, function hoisting,
// and shared lexical bindings behave exactly as before the file extraction.
const source = files.map(file => fs.readFileSync(path.join(sourceDir, file), 'utf8')).join('');
new vm.Script(source, { filename: 'admin-app.js' });
fs.writeFileSync(path.join(root, 'public/assets/js/admin-app.js'), source);
