const fs = require('fs');
const path = require('path');

const indexPath = path.join(process.cwd(), 'index.html');
const trackerPath = path.join(process.cwd(), 'assets/js/tracker/taurus-tracker.js');
let html = fs.readFileSync(indexPath, 'utf8');

function addBefore(marker, addition) {
  if (html.includes(addition.trim())) return;
  const index = html.indexOf(marker);
  if (index === -1) throw new Error(`Marker not found: ${marker}`);
  html = html.slice(0, index) + addition + html.slice(index);
}

function optimizePrimaryFonts() {
  const href = 'https://fonts.googleapis.com/css2?family=Syncopate:wght@400;700&family=Manrope:wght@300;400;600;800&family=JetBrains+Mono:wght@400;700&display=swap';
  const blockingTag = `    <link href="${href}" rel="stylesheet">`;
  const optimizedTags = [
    `    <link rel="preload" href="${href}" as="style">`,
    `    <link href="${href}" rel="stylesheet" media="print" onload="this.onload=null;this.media='all'">`,
    `    <noscript><link href="${href}" rel="stylesheet"></noscript>`
  ].join('\n');

  if (html.includes(optimizedTags)) return;
  if (!html.includes(blockingTag)) throw new Error('Primary Google Fonts tag not found.');
  html = html.replace(blockingTag, optimizedTags);
}

const instagramSection = fs.readFileSync(path.join(process.cwd(), 'snippets/instagram-section.html'), 'utf8').trim();

// Trusted Types must be installed before any inline application script executes.
addBefore(
  '    <script>\n        /* Hide CookieYes during the globe intro;',
  '    <script src="/assets/js/trusted-types-bootstrap.js"></script>\n'
);
optimizePrimaryFonts();
addBefore('</head>', '    <link rel="stylesheet" href="/assets/css/instagram-feed.css">\n');
// Keep an existing section in sync with the single source template.
if (/<section id="instagram"[\s\S]*?<\/section>/.test(html)) {
  html = html.replace(/<section id="instagram"[\s\S]*?<\/section>/, instagramSection);
} else {
  addBefore('            <section id="contact">', instagramSection + '\n');
}
html = html.replace(/\s*<script src="\/assets\/js\/instagram-feed.js" defer><\/script>/g, '');

fs.writeFileSync(indexPath, html);

// Remove the legacy browser read of the private Telegram configuration. The
// credentials are backend-only and the old read produced a permanent Firestore
// permission error for every anonymous visitor.
let tracker = fs.readFileSync(trackerPath, 'utf8');
tracker = tracker.replace(
  /\n\s*\/\/ CACHE TELEGRAM CONFIG \(Early Fetch\)[\s\S]*?\n\s*} catch \(e\) \{ console\.warn\("Config Cache Failed", e\); \}\n/,
  '\n        // Telegram credentials are backend-only; public clients never read security_config.\n'
);

// Upsert the history batch and requeue it on transient failures. This handles
// missing session documents and avoids losing events when a network write fails.
tracker = tracker.replace(
  /\s*window\.db\.collection\(CONFIG\.collection\)\.doc\(sessionID\)\.update\(\{\s*history: firebase\.firestore\.FieldValue\.arrayUnion\(\.\.\.entries\),\s*last_seen: firebase\.firestore\.FieldValue\.serverTimestamp\(\)\s*}\)\.catch\(e => console\.log\("Log Error", e\)\);/,
  `
        window.db.collection(CONFIG.collection).doc(sessionID).set({
            history: firebase.firestore.FieldValue.arrayUnion(...entries),
            last_seen: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true }).catch((error) => {
            pendingHistory = entries.concat(pendingHistory);
            scheduleHistoryFlush();
            console.log("Log Error", error);
        });`
);

// Remote-command acknowledgements are also safe when the session document was
// recreated between the snapshot and the click.
tracker = tracker.replace(
  "window.db.collection(CONFIG.collection).doc(sessionID).update({ action: null });",
  "window.db.collection(CONFIG.collection).doc(sessionID).set({ action: null }, { merge: true });"
);

fs.writeFileSync(trackerPath, tracker);
console.log('Site integrations, font loading, security bootstrap and tracker hardening applied.');
