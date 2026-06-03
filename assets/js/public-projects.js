(() => {
  const FALLBACK_PROJECTS = [
    { title: 'Bugün Ne Yiyelim?', category: 'AI-Powered Food Decider', shortCategory: 'AI App', shortDescription: 'A playful Turkish food decider built to solve daily choice fatigue in seconds.', longDescription: 'Mood-based meal discovery with a bright interface and quick decision flow.', liveUrl: 'https://www.bugunneyiyelim.com/', desktopImage: 'assets/bugun-desktop.png', mobileImage: 'assets/bugun-desktop.png', placement: { mainProjects: true, qrLinks: true }, order: { mainProjects: 1, qrLinks: 1 }, status: 'published' },
    { title: 'Today We Eat', category: 'AI-Powered Food Decider', shortCategory: 'AI App', shortDescription: 'An English adaptation of the same fast, mood-led food recommendation experience.', longDescription: 'The same quick and engaging recommendation concept for an international audience.', liveUrl: 'https://www.todayweeat.com/', desktopImage: 'assets/today-we-eat-desktop.png', mobileImage: 'assets/today-we-eat-desktop.png', placement: { mainProjects: true, qrLinks: true }, order: { mainProjects: 2, qrLinks: 2 }, status: 'published' },
    { title: 'mybabyshire', category: 'E-commerce Experience', shortCategory: 'E-commerce', shortDescription: 'A soft, trust-driven shopping experience with warm visual presentation.', longDescription: 'A gentle visual language focused on softness, clarity and reassuring browsing.', liveUrl: 'https://www.mybabyshire.com/', desktopImage: '', mobileImage: '', placement: { mainProjects: true, qrLinks: true }, order: { mainProjects: 3, qrLinks: 3 }, status: 'published' },
    { title: 'DAWL Studio', category: 'Premium Brand Concept', shortCategory: 'Brand Studio', shortDescription: 'A premium brand direction with atmosphere, calm and refined detail.', longDescription: 'Minimal, dark and gold-led branding crafted to feel calm and elevated.', liveUrl: 'https://www.dawlstudio.com/', desktopImage: '', mobileImage: '', placement: { mainProjects: true, qrLinks: true }, order: { mainProjects: 4, qrLinks: 4 }, status: 'published' },
    { title: 'Mustafa Seyhan', category: 'Personal Brand / Business', shortCategory: 'Client Site', shortDescription: 'A personal or business-oriented web presence with a confident modern profile.', longDescription: 'A clean identity-driven layout designed to present credibility and clarity.', liveUrl: 'https://www.mustafaseyhan.com/', desktopImage: '', mobileImage: '', placement: { mainProjects: true, qrLinks: true }, order: { mainProjects: 5, qrLinks: 5 }, status: 'published' },
    { title: 'Reformer Pilates Malta', category: 'Wellness / Local Business', shortCategory: 'Studio Website', shortDescription: 'A calm, mobile-friendly local business site for class discovery.', longDescription: 'Responsive structure, clear information hierarchy and a softer studio tone.', liveUrl: 'https://www.reformerpilatesmalta.com/', desktopImage: 'assets/pilates-desktop.png', mobileImage: 'assets/pilates-desktop.png', placement: { mainProjects: true, qrLinks: true }, order: { mainProjects: 6, qrLinks: 6 }, status: 'published' },
    { title: 'Elite Body Protocol', category: 'Gamified Fitness Experience', shortCategory: 'Web App', shortDescription: 'A gamified fitness app concept with a more immersive interface direction.', longDescription: 'A dynamic interface language blending high-contrast visuals and app structure.', liveUrl: 'https://elitebody.omeryigitler.com/', desktopImage: 'assets/elite-modern.png?v=V10', mobileImage: 'assets/elite-modern.png?v=V10', placement: { mainProjects: true, qrLinks: true }, order: { mainProjects: 7, qrLinks: 7 }, status: 'published' }
  ];

  const MAIN_WEBSITE = {
    title: 'Main Website',
    category: 'Portfolio Hub',
    shortCategory: 'Main Website',
    shortDescription: 'Open the central Ömer Yiğitler portfolio and service experience.',
    longDescription: 'Visit the main site for the full portfolio, service positioning and complete brand experience.',
    liveUrl: 'https://omeryigitler.com/',
    desktopImage: '',
    mobileImage: '',
    status: 'published'
  };

  const esc = (v = '') => String(v).replace(/[&<>"']/g, s => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[s]));
  const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));
  const shortLabel = (project) => project.shortCategory || project.category || 'Web Project';

  async function waitForFirestore() {
    for (let i = 0; i < 40; i++) {
      if (window.db && typeof window.db.collection === 'function') return window.db;
      if (window.firebase && window.firebaseConfig && typeof window.firebase.firestore === 'function') {
        try {
          if (!window.firebase.apps.length) window.firebase.initializeApp(window.firebaseConfig);
          window.db = window.firebase.firestore();
          return window.db;
        } catch (e) {}
      }
      await wait(150);
    }
    return null;
  }

  function normalizeProject(doc) {
    const data = doc.data ? doc.data() : doc;
    const s = data.publicShowcase || {};
    const title = s.title || data.projectName || data.name || 'Untitled Project';
    return {
      id: doc.id || title,
      title,
      category: s.category || data.siteType || 'Web Project',
      shortCategory: s.shortCategory || s.typeLabel || '',
      shortDescription: s.shortDescription || data.description || data.requests || '',
      longDescription: s.longDescription || s.shortDescription || data.description || '',
      liveUrl: s.liveUrl || data.liveUrl || '#',
      desktopImage: s.desktopImage || s.imageUrl || s.previewImage || '',
      mobileImage: s.mobileImage || s.desktopImage || s.imageUrl || '',
      theme: s.theme || 'gold',
      placement: {
        mainProjects: !!(s.placement?.mainProjects || s.showOnMainProjects),
        qrLinks: !!(s.placement?.qrLinks || s.showOnQr)
      },
      order: {
        mainProjects: Number(s.order?.mainProjects || s.mainOrder || 999),
        qrLinks: Number(s.order?.qrLinks || s.qrOrder || 999)
      },
      status: s.status || 'draft'
    };
  }

  async function getProjects() {
    const db = await waitForFirestore();
    if (!db) return FALLBACK_PROJECTS;
    try {
      const snap = await db.collection('projects').where('publicShowcase.enabled', '==', true).get();
      const items = [];
      snap.forEach(doc => items.push(normalizeProject(doc)));
      const published = items.filter(p => p.status === 'published');
      return published.length ? published : FALLBACK_PROJECTS;
    } catch (e) {
      console.warn('Public projects fallback:', e.message);
      return FALLBACK_PROJECTS;
    }
  }

  function mockup(project) {
    const image = project.mobileImage || project.desktopImage;
    if (image) {
      return `<div class="oy-preview"><div class="oy-browser"><span></span><span></span><span></span></div><img src="${esc(image)}" alt="${esc(project.title)} preview" loading="lazy"></div>`;
    }
    return `<div class="oy-preview oy-preview-fallback"><div class="oy-fallback-grid"><span>${esc((project.title || 'WEB').slice(0, 2).toUpperCase())}</span></div></div>`;
  }

  function qrHomeCard() {
    return `<a class="oy-home-card" href="${esc(MAIN_WEBSITE.liveUrl)}" target="_blank" rel="noopener noreferrer" aria-label="Open main website">
      <div class="oy-home-icon">ÖY</div>
      <div class="oy-home-copy"><span>${esc(MAIN_WEBSITE.category)}</span><h2>${esc(MAIN_WEBSITE.title)}</h2><p>omeryigitler.com</p></div>
      <div class="oy-home-arrow">↗</div>
    </a>`;
  }

  function qrCard(project, index) {
    const number = String(index + 1).padStart(2, '0');
    return `<a class="oy-qr-card" href="${esc(project.liveUrl)}" target="_blank" rel="noopener noreferrer" aria-label="Open ${esc(project.title)}">
      <div class="oy-card-head"><span class="oy-number">${number}</span><span class="oy-type">${esc(shortLabel(project))}</span><span class="oy-arrow">↗</span></div>
      ${mockup(project)}
      <div class="oy-card-content"><span class="oy-label">${esc(project.category)}</span><h2>${esc(project.title)}</h2><p>${esc(project.shortDescription)}</p><div class="oy-cta"><b>View Project</b><small>Live Site</small></div></div>
    </a>`;
  }

  function mainCard(project, index) {
    const reverse = index % 2 === 0 ? '' : ' md:flex-row-reverse';
    const image = project.desktopImage || project.mobileImage;
    return `<article class="oy-main-card flex flex-col${reverse} gap-8 md:gap-12 items-center mb-24">
      <a href="${esc(project.liveUrl)}" target="_blank" rel="noopener noreferrer" class="oy-main-visual w-full md:w-1/2 rounded-[2rem] overflow-hidden border border-white/10 bg-white/5 group block">
        ${image ? `<img src="${esc(image)}" alt="${esc(project.title)} preview" loading="lazy" class="w-full h-full object-cover object-top transition-transform duration-700 group-hover:scale-105">` : `<div class="oy-main-placeholder"><span>${esc(project.title)}</span></div>`}
      </a>
      <div class="w-full md:w-1/2 text-center md:text-left">
        <span class="inline-flex mb-4 px-3 py-1 rounded-full border border-taurusGold/30 text-taurusGold text-[10px] font-black uppercase tracking-[0.18em]">${esc(project.category)}</span>
        <h2 class="font-display text-3xl md:text-5xl font-bold text-white mb-5 leading-tight">${esc(project.title)}</h2>
        <p class="text-gray-400 text-sm md:text-base leading-relaxed mb-7">${esc(project.longDescription || project.shortDescription)}</p>
        <a href="${esc(project.liveUrl)}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-taurusGold text-black text-[10px] font-black uppercase tracking-widest hover:bg-white transition-all">View Project <span>↗</span></a>
      </div>
    </article>`;
  }

  async function renderQr() {
    const container = document.getElementById('qr-projects');
    if (!container) return;
    const all = await getProjects();
    const projects = all.filter(p => p.placement.qrLinks).sort((a, b) => a.order.qrLinks - b.order.qrLinks);
    container.innerHTML = qrHomeCard() + (projects.map(qrCard).join('') || '<p class="oy-empty">No public projects selected for QR Gateway.</p>');
  }

  async function renderMainProjects() {
    if (!/projects\.html$/i.test(location.pathname)) return;
    const main = document.querySelector('main');
    if (!main) return;
    const intro = main.querySelector('.text-center.mb-16');
    if (!intro) return;

    let container = document.getElementById('public-projects-dynamic');
    if (!container) {
      container = document.createElement('section');
      container.id = 'public-projects-dynamic';
      container.className = 'w-full max-w-6xl';
      intro.insertAdjacentElement('afterend', container);
    }

    Array.from(main.children).forEach(child => {
      if (child !== intro && child !== container && !child.matches('script')) child.style.display = 'none';
    });

    const all = await getProjects();
    const projects = all.filter(p => p.placement.mainProjects).sort((a, b) => a.order.mainProjects - b.order.mainProjects);
    container.innerHTML = projects.map(mainCard).join('') || '<div class="text-center text-gray-500 py-20">No public projects selected.</div>';
  }

  function injectStyles() {
    if (document.getElementById('public-projects-style')) return;
    const style = document.createElement('style');
    style.id = 'public-projects-style';
    style.textContent = `
      #qr-projects{display:grid;gap:16px}.oy-home-card,.oy-qr-card{color:inherit;text-decoration:none;border:1px solid rgba(255,255,255,.10);background:linear-gradient(180deg,rgba(255,255,255,.032),rgba(255,255,255,.014)),#101010;box-shadow:0 22px 64px rgba(0,0,0,.42);overflow:hidden}.oy-home-card{display:grid;grid-template-columns:46px 1fr 38px;align-items:center;gap:14px;min-height:88px;padding:16px;border-radius:26px;border-color:rgba(255,215,0,.34);background:linear-gradient(135deg,rgba(255,215,0,.10),rgba(255,255,255,.025)),#101010}.oy-home-icon{width:46px;height:46px;border-radius:16px;display:grid;place-items:center;background:rgba(255,215,0,.10);border:1px solid rgba(255,215,0,.24);color:#ffd700;font-size:12px;font-weight:900;letter-spacing:.08em}.oy-home-copy span,.oy-label{display:block;color:#ffd700;font-size:10px;font-weight:900;letter-spacing:.16em;text-transform:uppercase}.oy-home-copy h2{margin:3px 0 2px;font-size:16px;line-height:1.12;font-weight:900}.oy-home-copy p{margin:0;color:rgba(255,255,255,.62);font-size:12px;font-weight:700}.oy-home-arrow,.oy-arrow{display:grid;place-items:center;border-radius:999px;background:#ffd700;color:#050505;font-style:normal;font-weight:900}.oy-home-arrow{width:38px;height:38px}.oy-qr-card{display:block;border-radius:30px;transition:transform .24s ease,border-color .24s ease,box-shadow .24s ease}.oy-qr-card:hover,.oy-qr-card:focus-visible,.oy-home-card:hover,.oy-home-card:focus-visible{transform:translateY(-2px);border-color:rgba(255,215,0,.34);box-shadow:0 28px 76px rgba(0,0,0,.5),0 0 28px rgba(255,215,0,.08);outline:0}.oy-card-head{display:grid;grid-template-columns:auto 1fr 38px;align-items:center;gap:9px;padding:16px 16px 12px}.oy-number{display:inline-flex;align-items:center;justify-content:center;min-width:36px;height:28px;padding:0 10px;border-radius:999px;background:rgba(255,215,0,.10);border:1px solid rgba(255,215,0,.26);color:#ffd700;font-size:11px;font-weight:900;letter-spacing:.08em}.oy-type{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:rgba(255,255,255,.70);font-size:10px;font-weight:900;letter-spacing:.14em;text-transform:uppercase}.oy-arrow{width:38px;height:38px}.oy-preview{position:relative;margin:0 16px;border:1px solid rgba(255,255,255,.12);border-radius:24px;background:radial-gradient(circle at 22% 20%,rgba(255,215,0,.10),transparent 16rem),linear-gradient(135deg,#111827,#050505);box-shadow:inset 0 0 0 1px rgba(255,255,255,.025),0 16px 38px rgba(0,0,0,.30);overflow:hidden;min-height:170px}.oy-browser{height:24px;display:flex;align-items:center;gap:6px;padding:0 12px;background:rgba(0,0,0,.50);border-bottom:1px solid rgba(255,255,255,.07)}.oy-browser span{width:7px;height:7px;border-radius:999px;background:rgba(255,255,255,.30)}.oy-browser span:nth-child(1){background:#ff5f57}.oy-browser span:nth-child(2){background:#ffbd2e}.oy-browser span:nth-child(3){background:#28c840}.oy-preview img{display:block;width:100%;height:calc(100% - 24px);min-height:146px;object-fit:cover;object-position:top center}.oy-preview-fallback{display:grid;place-items:center}.oy-fallback-grid{position:absolute;inset:14px;border-radius:18px;display:grid;place-items:center;background:linear-gradient(135deg,rgba(255,215,0,.14),rgba(255,255,255,.035));border:1px solid rgba(255,215,0,.20)}.oy-fallback-grid span{color:#ffd700;font-size:26px;font-weight:900;letter-spacing:.12em}.oy-card-content{padding:16px 18px 18px}.oy-card-content h2{margin:8px 0 8px;font-size:25px;line-height:1.08;font-weight:900;letter-spacing:-.045em}.oy-card-content p{margin:0;color:rgba(255,255,255,.66);font-size:13px;line-height:1.62}.oy-cta{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-top:16px;padding-top:15px;border-top:1px solid rgba(255,255,255,.07)}.oy-cta b{font-size:12px;font-weight:900;letter-spacing:.12em;text-transform:uppercase}.oy-cta b:after{content:' →';color:#ffd700}.oy-cta small{color:rgba(255,255,255,.42);font-size:11px;font-weight:800}.oy-main-placeholder{min-height:320px;display:grid;place-items:center;background:linear-gradient(135deg,rgba(255,215,0,.12),rgba(255,255,255,.03));color:#ffd700;font-weight:900;text-transform:uppercase;letter-spacing:.12em}.oy-empty{text-align:center;color:rgba(255,255,255,.55);font-size:12px;text-transform:uppercase;letter-spacing:.14em;padding:40px 0}@media(max-width:390px){.oy-preview{min-height:152px;border-radius:21px}.oy-preview img{min-height:128px}.oy-card-content h2{font-size:23px}.oy-home-card{grid-template-columns:42px 1fr 34px;padding:14px}.oy-home-icon{width:42px;height:42px}.oy-home-arrow,.oy-arrow{width:34px;height:34px}.oy-type{font-size:9px}}
    `;
    document.head.appendChild(style);
  }

  function init() {
    injectStyles();
    renderQr();
    renderMainProjects();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
