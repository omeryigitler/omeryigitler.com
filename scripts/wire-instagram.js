const fs = require('fs');
const path = require('path');

const indexPath = path.join(process.cwd(), 'index.html');
const original = fs.readFileSync(indexPath, 'utf8');

if (!original.includes('instagram-feed-section')) {
  console.log('Instagram feed is not connected yet.');
} else {
  console.log('Instagram feed is already connected.');
}
