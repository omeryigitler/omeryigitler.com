const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { preparePublic } = require('../scripts/prepare-public');

test('public output is repeatable, versions changes and excludes private source', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'portfolio-build-'));
  try {
    const write = (file, value) => {
      fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
      fs.writeFileSync(path.join(root, file), value);
    };
    const home = '<script src="/assets/js/app.js?v=old"></script><footer class="signal-footer"><a href="#contact">Contact</a></footer>';
    write('index.html', home);
    write('projects.html', '<footer>outdated</footer>');
    write('assets/js/app.js', 'window.ready = true;');
    write('pricing-tool/dist/index.html', '<p>Pricing</p>');
    for (const file of ['.env', 'api/private.js', 'src/admin/state.js', 'README.md', '_TEMPLATE_new_page.html']) write(file, 'not public');
    preparePublic(root);
    const output = path.join(root, 'dist');
    const first = fs.readFileSync(path.join(output, 'index.html'), 'utf8');
    assert.match(first, /app\.js\?v=[a-f0-9]{16}/);
    assert.match(fs.readFileSync(path.join(output, 'projects.html'), 'utf8'), /href="\/#contact"/);
    for (const file of ['.env', 'api', 'src', 'README.md', '_TEMPLATE_new_page.html']) assert.equal(fs.existsSync(path.join(output, file)), false);
    write('dist/stale.html', 'old output');
    preparePublic(root);
    assert.equal(fs.readFileSync(path.join(output, 'index.html'), 'utf8'), first);
    assert.equal(fs.existsSync(path.join(output, 'stale.html')), false);
    assert.equal(fs.readFileSync(path.join(root, 'index.html'), 'utf8'), home);
    write('assets/js/app.js', 'window.ready = false;');
    preparePublic(root);
    assert.notEqual(fs.readFileSync(path.join(output, 'index.html'), 'utf8'), first);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
