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

const instagramSection = `
            <section id="instagram" class="instagram-feed-section" data-instagram-feed data-limit="6">
                <div class="instagram-feed-shell">
                    <div class="instagram-feed-copy-column">
                        <div class="instagram-feed-status">
                            <span class="prompt">$</span>
                            <span>status</span>
                            <span class="status-label">INSTAGRAM</span>
                            <span class="arrow">→</span>
                            <span class="value type-target" data-text="omeryigitler.web"></span>
                            <span class="cursor" style="height: 0.95em;"></span>
                        </div>
                        <h2 class="instagram-feed-title">Latest from Instagram</h2>
                        <p class="instagram-feed-copy">A live glimpse into the projects, ideas and moments shaping the studio — placed right before the contact flow.</p>
                        <div class="instagram-feed-actions">
                            <a class="instagram-feed-button" href="https://www.instagram.com/omeryigitler.web/" target="_blank" rel="noopener noreferrer">Follow Instagram ↗</a>
                        </div>
                    </div>
                    <div class="instagram-feed-grid" data-instagram-grid>
                        <div class="instagram-feed-empty">Loading Instagram feed…</div>
                    </div>
                </div>
            </section>
`;

// Trusted Types must be installed before any inline application script executes.
addBefore(
  '    <script>\n        /* Hide CookieYes during the globe intro;',
  '    <script src="/assets/js/trusted-types-bootstrap.js"></script>\n'
);
addBefore('</head>', '    <link rel="stylesheet" href="/assets/css/instagram-feed.css">\n');
addBefore('            <section id="contact">', instagramSection);
addBefore('</body>', '    <script src="/assets/js/instagram-feed.js" defer></script>\n');

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
console.log('Site integrations, security bootstrap and tracker hardening applied.');
