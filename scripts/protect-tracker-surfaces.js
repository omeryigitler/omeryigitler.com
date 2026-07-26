const fs = require('node:fs');
const path = require('node:path');

const root = process.cwd();
const trackerPath = path.join(root, 'assets/js/tracker/taurus-tracker.js');
let tracker = fs.readFileSync(trackerPath, 'utf8');

const marker = 'TAURUS_PROTECTED_SURFACE_GUARD';
if (!tracker.includes(marker)) {
  const opener = '(function () {\n';
  const guard = `(function () {\n    // ${marker}: control surfaces must never receive visitor overlays or commands.\n    const protectedSurface = /\\/(?:admin|gateway|start-gateway|passkey-setup)\\.html$/i.test(window.location.pathname);\n    if (protectedSurface) {\n        const removeOverlay = () => document.getElementById('taurus-overlay')?.remove();\n        removeOverlay();\n        if (document.readyState === 'loading') {\n            document.addEventListener('DOMContentLoaded', removeOverlay, { once: true });\n        }\n        console.info('🐂 Taurus Tracker disabled on protected control surface.');\n        return;\n    }\n`;

  const index = tracker.indexOf(opener);
  if (index === -1) {
    throw new Error('[protected-surfaces] Tracker IIFE opener not found');
  }
  tracker = tracker.slice(0, index) + guard + tracker.slice(index + opener.length);
}

fs.writeFileSync(trackerPath, tracker, 'utf8');

const htmlFiles = ['admin.html', 'gateway.html', 'start-gateway.html', 'passkey-setup.html'];
for (const relativePath of htmlFiles) {
  const filePath = path.join(root, relativePath);
  if (!fs.existsSync(filePath)) continue;
  let html = fs.readFileSync(filePath, 'utf8');
  html = html.replace(/taurus-tracker\.js\?v=V\d+/g, 'taurus-tracker.js?v=V45');

  if (relativePath === 'admin.html' && !html.includes('admin-runtime-recovery.js')) {
    if (!html.includes('</body>')) {
      throw new Error('[protected-surfaces] admin.html closing body tag not found');
    }
    html = html.replace(
      '</body>',
      '    <script src="assets/js/admin-runtime-recovery.js?v=V1"></script>\n</body>'
    );
  }

  fs.writeFileSync(filePath, html, 'utf8');
}

console.log('[protected-surfaces] Tracker disabled on protected pages and admin recovery injected.');
