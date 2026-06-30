(() => {
  const root = document.querySelector('[data-instagram-feed]');
  if (!root) return;

  const grid = root.querySelector('[data-instagram-grid]');
  const limit = root.getAttribute('data-limit') || '6';

  const fallback = [
    {
      id: 'fallback-1',
      media_url: '/assets/images/instagram-01.jpg',
      permalink: 'https://www.instagram.com/yigitleromer/',
      caption: 'Design details, systems and digital moments.'
    },
    {
      id: 'fallback-2',
      media_url: '/assets/images/instagram-02.jpg',
      permalink: 'https://www.instagram.com/yigitleromer/',
      caption: 'Building modern web experiences.'
    },
    {
      id: 'fallback-3',
      media_url: '/assets/images/instagram-03.jpg',
      permalink: 'https://www.instagram.com/yigitleromer/',
      caption: 'Projects, process and inspiration.'
    }
  ];

  function escapeHtml(value = '') {
    return String(value)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function render(items) {
    const validItems = items
      .map((item) => ({
        ...item,
        image: item.thumbnail_url || item.media_url
      }))
      .filter((item) => item.image && item.permalink)
      .slice(0, Number(limit));

    if (!validItems.length) {
      grid.innerHTML = '<div class="instagram-feed-empty">Instagram feed will appear here once the API token is connected.</div>';
      return;
    }

    grid.innerHTML = validItems.map((item) => {
      const mediaIcon = item.media_type === 'VIDEO' ? '▶' : item.media_type === 'CAROUSEL_ALBUM' ? '▣' : '◎';
      return `
        <a class="instagram-card" href="${escapeHtml(item.permalink)}" target="_blank" rel="noopener noreferrer" aria-label="Open Instagram post">
          <img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.caption || 'Instagram post by Ömer Yiğitler')}" loading="lazy" decoding="async">
          <span class="instagram-card-badge" aria-hidden="true">${mediaIcon}</span>
          ${item.caption ? `<p class="instagram-card-caption">${escapeHtml(item.caption)}</p>` : ''}
        </a>
      `;
    }).join('');
  }

  async function load() {
    try {
      const response = await fetch(`/api/instagram?limit=${encodeURIComponent(limit)}`);
      if (!response.ok) throw new Error('Instagram API unavailable');
      const payload = await response.json();
      render(Array.isArray(payload.data) ? payload.data : []);
    } catch {
      render(fallback);
    }
  }

  load();
})();
