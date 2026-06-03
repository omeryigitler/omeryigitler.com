(() => {
  const FALLBACK_PROJECTS = [
    { title: 'Bugün Ne Yiyelim?', category: 'AI-Powered Food Decider', shortDescription: 'A playful Turkish food decider built to solve daily choice fatigue in seconds.', longDescription: 'Mood-based meal discovery with a bright interface and quick decision flow.', liveUrl: 'https://www.bugunneyiyelim.com/', desktopImage: 'assets/bugun-desktop.png', mobileImage: 'assets/bugun-desktop.png', placement: { mainProjects: true, qrLinks: true }, order: { mainProjects: 1, qrLinks: 1 }, status: 'published' },
    { title: 'Today We Eat', category: 'AI-Powered Food Decider', shortDescription: 'An English adaptation of the same fast, mood-led food recommendation experience.', longDescription: 'The same quick and engaging recommendation concept for an international audience.', liveUrl: 'https://www.todayweeat.com/', desktopImage: 'assets/today-we-eat-desktop.png', mobileImage: 'assets/today-we-eat-desktop.png', placement: { mainProjects: true, qrLinks: true }, order: { mainProjects: 2, qrLinks: 2 }, status: 'published' },
    { title: 'mybabyshire', category: 'E-commerce Experience', shortDescription: 'A soft, trust-driven shopping experience with warm visual presentation.', longDescription: 'A gentle visual language focused on softness, clarity and reassuring browsing.', liveUrl: 'https://www.mybabyshire.com/', desktopImage: '', mobileImage: '', placement: { mainProjects: true, qrLinks: true }, order: { mainProjects: 3, qrLinks: 3 }, status: 'published' },
    { title: 'DAWL Studio', category: 'Premium Brand Concept', shortDescription: 'A premium brand direction with atmosphere, calm and refined detail.', longDescription: 'Minimal, dark and gold-led branding crafted to feel calm and elevated.', liveUrl: 'https://www.dawlstudio.com/', desktopImage: '', mobileImage: '', placement: { mainProjects: true, qrLinks: true }, order: { mainProjects: 4, qrLinks: 4 }, status: 'published' },
    { title: 'Mustafa Seyhan', category: 'Personal Brand / Business', shortDescription: 'A personal or business-oriented web presence with a confident modern profile.', longDescription: 'A clean identity-driven layout designed to present credibility and clarity.', liveUrl: 'https://www.mustafaseyhan.com/', desktopImage: '', mobileImage: '', placement: { mainProjects: true, qrLinks: true }, order: { mainProjects: 5, qrLinks: 5 }, status: 'published' },
    { title: 'Reformer Pilates Malta', category: 'Wellness / Local Business', shortDescription: 'A calm, mobile-friendly local business site for class discovery.', longDescription: 'Responsive structure, clear information hierarchy and a softer studio tone.', liveUrl: 'https://www.reformerpilatesmalta.com/', desktopImage: 'assets/pilates-desktop.png', mobileImage: 'assets/pilates-desktop.png', placement: { mainProjects: true, qrLinks: true }, order: { mainProjects: 6, qrLinks: 6 }, status: 'published' },
    { title: 'Elite Body Protocol', category: 'Gamified Fitness Experience', shortDescription: 'A gamified fitness app concept with a more immersive interface direction.', longDescription: 'A dynamic interface language blending high-contrast visuals and app structure.', liveUrl: 'https://elitebody.omeryigitler.com/', desktopImage: 'assets/elite-modern.png?v=V10', mobileImage: 'assets/elite-modern.png?v=V10', placement: { mainProjects: true, qrLinks: true }, order: { mainProjects: 7, qrLinks: 7 }, status: 'published' }
  ];

  const esc = (v = '') => String(v).replace(/[&<>"']/g, s => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[s]));
  const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

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
    if (image) return `<div class="oy-mock"><img src="${esc(image)}" alt="" loading="lazy"></div>`;
    return `<div class="oy-mock oy-fallback"><div></div><span>${esc((project.title || 'WEB').slice(0, 2).toUpperCase())}</span></div>`;
  }

  function qrCard(project, index) {
    return `<a class="oy-qr-card" href="${esc(project.liveUrl)}" target="_blank" rel="noopener noreferrer">
      <div class="oy-qr-top"><span><b>${String(index).padStart(2, '0')}</b> ${esc(project.category)}</span><i>↗</i></div>
      <div class="oy-qr-body"><div><h2>${esc(project.title)}</h2><p>${esc(project.shortDescription)}</p></div>${mockup(project)}</div>
      <div class="oy-qr-bottom"><b>View Project</b><small>Live Site</small></div>
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
    container.innerHTML = projects.map(qrCard).join('') || '<p class="oy-empty">No public projects selected for QR Gateway.</p>';
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
    style.textContent = `.oy-qr-card{display:block;color:inherit;text-decoration:none;border:1px solid rgba(255,255,255,.09);border-radius:28px;background:linear-gradient(180deg,rgba(255,255,255,.025),rgba(255,255,255,.015)),#101010;box-shadow:0 24px 70px rgba(0,0,0,.45);overflow:hidden;margin-bottom:14px}.oy-qr-top{min-height:170px;position:relative;padding:18px;border-bottom:1px solid rgba(255,255,255,.06);background:radial-gradient(circle at 12% 18%,rgba(255,215,0,.1),transparent 18rem),linear-gradient(135deg,rgba(8,14,30,.95),rgba(3,3,3,.98))}.oy-qr-top span{display:inline-flex;padding:7px 10px;border-radius:999px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.04);font-size:10px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:rgba(255,255,255,.74)}.oy-qr-top b{color:#ffd700;margin-right:6px}.oy-qr-top i{position:absolute;right:18px;top:18px;width:36px;height:36px;border-radius:999px;display:grid;place-items:center;background:#ffd700;color:#050505;font-style:normal;font-weight:900}.oy-qr-body{position:absolute;margin-top:-118px;width:100%;padding:0 18px 0;display:flex;align-items:flex-end;gap:12px;pointer-events:none}.oy-qr-body h2{max-width:220px;margin:0 0 8px;font-size:25px;line-height:1.06;font-weight:800;letter-spacing:-.04em}.oy-qr-body p{max-width:250px;margin:0;color:rgba(255,255,255,.64);font-size:13px;line-height:1.55}.oy-mock{margin-left:auto;width:46%;min-width:135px;aspect-ratio:16/10;border-radius:18px;border:1px solid rgba(255,255,255,.12);background:#111;box-shadow:0 16px 38px rgba(0,0,0,.34);overflow:hidden;display:grid;place-items:center}.oy-mock img{width:100%;height:100%;object-fit:cover;object-position:top}.oy-fallback{aspect-ratio:10/14}.oy-fallback div{position:absolute;inset:10px;border-radius:12px;background:linear-gradient(180deg,rgba(255,215,0,.16),rgba(255,255,255,.04));border:1px solid rgba(255,215,0,.18)}.oy-fallback span{position:relative;color:#ffd700;font-weight:900;letter-spacing:.08em}.oy-qr-bottom{padding:86px 18px 18px;display:flex;justify-content:space-between;gap:12px}.oy-qr-bottom b{font-size:12px;letter-spacing:.12em;text-transform:uppercase}.oy-qr-bottom b:after{content:' →';color:#ffd700}.oy-qr-bottom small{color:rgba(255,255,255,.42);font-size:11px;font-weight:700}.oy-main-placeholder{min-height:320px;display:grid;place-items:center;background:linear-gradient(135deg,rgba(255,215,0,.12),rgba(255,255,255,.03));color:#ffd700;font-weight:900;text-transform:uppercase;letter-spacing:.12em}.oy-empty{text-align:center;color:rgba(255,255,255,.55);font-size:12px;text-transform:uppercase;letter-spacing:.14em;padding:40px 0}`;
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
