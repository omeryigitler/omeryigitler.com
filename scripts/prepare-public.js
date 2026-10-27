const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');

function preparePublic(root, output = path.join(root, 'dist')) {
  fs.rmSync(output, { recursive: true, force: true });
  fs.mkdirSync(output, { recursive: true });
  // Only public files belong in the static output. APIs are handled separately
  // by Vercel; documentation, tests, source, config and dependencies stay private.
  const pages = path.join(root, 'src/pages');
  for (const name of fs.readdirSync(pages).filter(name => name.endsWith('.html'))) {
    fs.copyFileSync(path.join(pages, name), path.join(output, name));
  }
  const publicDir = path.join(root, 'public');
  for (const entry of fs.readdirSync(publicDir)) {
    if (entry === 'icons') continue;
    fs.cpSync(path.join(publicDir, entry), path.join(output, entry), { recursive: true });
  }
  // Group icon sources in Git, but preserve all existing root icon URLs for
  // browser bookmarks, installed shortcuts and cached web manifests.
  fs.cpSync(path.join(publicDir, 'icons'), output, { recursive: true });
  fs.cpSync(path.join(root, 'pricing-tool/dist'), path.join(output, 'pricing-tool/dist'), { recursive: true });

  const homePath = path.join(output, 'index.html');
  const archivePath = path.join(output, 'projects.html');
  const home = fs.readFileSync(homePath, 'utf8');
  const footer = home.match(/<footer class="signal-footer"[\s\S]*?<\/footer>/);
  if (!footer) throw new Error('Homepage signal footer is missing');
  const archive = fs.readFileSync(archivePath, 'utf8');
  if (!/<footer\b/.test(archive)) throw new Error('Project archive footer is missing');
  fs.writeFileSync(archivePath, archive.replace(/<footer[\s\S]*?<\/footer>/,
    () => footer[0].replaceAll('href="#contact"', 'href="/#contact"')));

  // Cache versions belong in the output, never in hand-maintained source files.
  for (const name of fs.readdirSync(output).filter(name => name.endsWith('.html'))) {
    const file = path.join(output, name);
    const html = fs.readFileSync(file, 'utf8').replace(
      /((?:src|href)=["'])(\/?assets\/[^"'?#]+\.(?:js|css))(?:\?[^"']*)?(["'])/g,
      (match, prefix, asset, quote) => {
        const assetFile = path.join(output, asset.replace(/^\//, ''));
        if (!fs.existsSync(assetFile)) throw new Error(`Missing asset ${asset} in ${name}`);
        const hash = createHash('sha256').update(fs.readFileSync(assetFile)).digest('hex').slice(0, 16);
        return `${prefix}${asset}?v=${hash}${quote}`;
      });
    fs.writeFileSync(file, html);
  }
}

if (require.main === module) preparePublic(path.resolve(__dirname, '..'));
module.exports = { preparePublic };
