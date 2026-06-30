const fs = require('fs');
const path = require('path');

const indexPath = path.join(process.cwd(), 'index.html');
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
                        <p class="instagram-feed-kicker">instagram</p>
                        <h2 class="instagram-feed-title">Latest from Instagram</h2>
                        <p class="instagram-feed-copy">A live glimpse into the projects, ideas and moments shaping the studio — placed right before the contact flow.</p>
                        <div class="instagram-feed-actions">
                            <a class="instagram-feed-button" href="https://instagram.com/yigitleromer" target="_blank" rel="noopener noreferrer">Follow Instagram ↗</a>
                        </div>
                    </div>
                    <div class="instagram-feed-grid" data-instagram-grid>
                        <div class="instagram-feed-empty">Loading Instagram feed…</div>
                    </div>
                </div>
            </section>
`;

addBefore('</head>', '    <link rel="stylesheet" href="/assets/css/instagram-feed.css">\n');
addBefore('            <section id="contact">', instagramSection);
addBefore('</body>', '    <script src="/assets/js/instagram-feed.js" defer></script>\n');

fs.writeFileSync(indexPath, html);
console.log('Instagram feed connected.');
