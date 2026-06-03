(() => {
  if (!/links\.html$/i.test(location.pathname)) return;

  const projects = [
    ['Bugün Ne Yiyelim?', 'AI App', 'AI-Powered Food Decider', 'A playful Turkish food decider built to solve daily choice fatigue in seconds.', 'https://www.bugunneyiyelim.com/', 'assets/bugun-desktop.png'],
    ['Today We Eat', 'AI App', 'AI-Powered Food Decider', 'An English adaptation of the same fast, mood-led food recommendation experience.', 'https://www.todayweeat.com/', 'assets/today-we-eat-desktop.png'],
    ['mybabyshire', 'E-commerce', 'E-commerce Experience', 'A soft, trust-driven shopping experience with warm visual presentation.', 'https://www.mybabyshire.com/', ''],
    ['DAWL Studio', 'Brand Studio', 'Premium Brand Concept', 'A premium brand direction with atmosphere, calm and refined detail.', 'https://www.dawlstudio.com/', ''],
    ['Mustafa Seyhan', 'Client Site', 'Personal Brand / Business', 'A personal or business-oriented web presence with a confident modern profile.', 'https://www.mustafaseyhan.com/', ''],
    ['Reformer Pilates Malta', 'Studio Website', 'Wellness / Local Business', 'A calm, mobile-friendly local business site for class discovery.', 'https://www.reformerpilatesmalta.com/', 'assets/pilates-desktop.png'],
    ['Elite Body Protocol', 'Web App', 'Gamified Fitness Experience', 'A gamified fitness app concept with a more immersive interface direction.', 'https://elitebody.omeryigitler.com/', 'assets/elite-modern.png?v=V10']
  ];

  const esc = (v = '') => String(v).replace(/[&<>"']/g, s => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[s]));

  function styles() {
    if (document.getElementById('qr-renderer-style')) return;
    const s = document.createElement('style');
    s.id = 'qr-renderer-style';
    s.textContent = `#qr-projects{display:grid;gap:16px}.oy-home,.oy-card{color:inherit;text-decoration:none;border:1px solid rgba(255,255,255,.10);background:linear-gradient(180deg,rgba(255,255,255,.032),rgba(255,255,255,.014)),#101010;box-shadow:0 22px 64px rgba(0,0,0,.42);overflow:hidden}.oy-home{display:grid;grid-template-columns:46px 1fr 38px;align-items:center;gap:14px;min-height:88px;padding:16px;border-radius:26px;border-color:rgba(255,215,0,.34);background:linear-gradient(135deg,rgba(255,215,0,.10),rgba(255,255,255,.025)),#101010}.oy-home-icon{width:46px;height:46px;border-radius:16px;display:grid;place-items:center;background:rgba(255,215,0,.10);border:1px solid rgba(255,215,0,.24);color:#ffd700;font-size:12px;font-weight:900;letter-spacing:.08em}.oy-home span,.oy-label{display:block;color:#ffd700;font-size:10px;font-weight:900;letter-spacing:.16em;text-transform:uppercase}.oy-home h2{margin:3px 0 2px;font-size:16px;line-height:1.12;font-weight:900}.oy-home p{margin:0;color:rgba(255,255,255,.62);font-size:12px;font-weight:700}.oy-home-arrow,.oy-arrow{display:grid;place-items:center;border-radius:999px;background:#ffd700;color:#050505;font-style:normal;font-weight:900}.oy-home-arrow{width:38px;height:38px}.oy-card{display:block;border-radius:30px;transition:transform .24s ease,border-color .24s ease,box-shadow .24s ease}.oy-card:hover,.oy-card:focus-visible,.oy-home:hover,.oy-home:focus-visible{transform:translateY(-2px);border-color:rgba(255,215,0,.34);box-shadow:0 28px 76px rgba(0,0,0,.5),0 0 28px rgba(255,215,0,.08);outline:0}.oy-head{display:grid;grid-template-columns:auto 1fr 38px;align-items:center;gap:9px;padding:16px 16px 12px}.oy-num{display:inline-flex;align-items:center;justify-content:center;min-width:36px;height:28px;padding:0 10px;border-radius:999px;background:rgba(255,215,0,.10);border:1px solid rgba(255,215,0,.26);color:#ffd700;font-size:11px;font-weight:900;letter-spacing:.08em}.oy-type{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:rgba(255,255,255,.70);font-size:10px;font-weight:900;letter-spacing:.14em;text-transform:uppercase}.oy-arrow{width:38px;height:38px}.oy-preview{position:relative;margin:0 16px;border:1px solid rgba(255,255,255,.12);border-radius:24px;background:radial-gradient(circle at 22% 20%,rgba(255,215,0,.10),transparent 16rem),linear-gradient(135deg,#111827,#050505);box-shadow:inset 0 0 0 1px rgba(255,255,255,.025),0 16px 38px rgba(0,0,0,.30);overflow:hidden;min-height:170px}.oy-browser{height:24px;display:flex;align-items:center;gap:6px;padding:0 12px;background:rgba(0,0,0,.50);border-bottom:1px solid rgba(255,255,255,.07)}.oy-browser span{width:7px;height:7px;border-radius:999px}.oy-browser span:nth-child(1){background:#ff5f57}.oy-browser span:nth-child(2){background:#ffbd2e}.oy-browser span:nth-child(3){background:#28c840}.oy-preview img{display:block;width:100%;height:calc(100% - 24px);min-height:146px;object-fit:cover;object-position:top center}.oy-fallback{display:grid;place-items:center}.oy-fallback div{position:absolute;inset:14px;border-radius:18px;display:grid;place-items:center;background:linear-gradient(135deg,rgba(255,215,0,.14),rgba(255,255,255,.035));border:1px solid rgba(255,215,0,.20)}.oy-fallback b{color:#ffd700;font-size:26px;font-weight:900;letter-spacing:.12em}.oy-content{padding:16px 18px 18px}.oy-content h2{margin:8px 0 8px;font-size:25px;line-height:1.08;font-weight:900;letter-spacing:-.045em}.oy-content p{margin:0;color:rgba(255,255,255,.66);font-size:13px;line-height:1.62}.oy-cta{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-top:16px;padding-top:15px;border-top:1px solid rgba(255,255,255,.07)}.oy-cta b{font-size:12px;font-weight:900;letter-spacing:.12em;text-transform:uppercase}.oy-cta b:after{content:' →';color:#ffd700}.oy-cta small{color:rgba(255,255,255,.42);font-size:11px;font-weight:800}@media(max-width:390px){.oy-preview{min-height:152px;border-radius:21px}.oy-preview img{min-height:128px}.oy-content h2{font-size:23px}.oy-home{grid-template-columns:42px 1fr 34px;padding:14px}.oy-home-icon{width:42px;height:42px}.oy-home-arrow,.oy-arrow{width:34px;height:34px}.oy-type{font-size:9px}}`;
    document.head.appendChild(s);
  }

  function preview(title, image) {
    if (image) return `<div class="oy-preview"><div class="oy-browser"><span></span><span></span><span></span></div><img src="${esc(image)}" alt="${esc(title)} preview" loading="lazy"></div>`;
    return `<div class="oy-preview oy-fallback"><div><b>${esc(title.slice(0,2).toUpperCase())}</b></div></div>`;
  }

  function card(p, i) {
    return `<a class="oy-card" href="${esc(p[4])}" target="_blank" rel="noopener noreferrer"><div class="oy-head"><span class="oy-num">${String(i + 1).padStart(2, '0')}</span><span class="oy-type">${esc(p[1])}</span><span class="oy-arrow">↗</span></div>${preview(p[0], p[5])}<div class="oy-content"><span class="oy-label">${esc(p[2])}</span><h2>${esc(p[0])}</h2><p>${esc(p[3])}</p><div class="oy-cta"><b>View Project</b><small>Live Site</small></div></div></a>`;
  }

  function init() {
    styles();
    const el = document.getElementById('qr-projects');
    if (!el) return;
    el.innerHTML = `<a class="oy-home" href="https://omeryigitler.com/" target="_blank" rel="noopener noreferrer"><div class="oy-home-icon">ÖY</div><div><span>Portfolio Hub</span><h2>Main Website</h2><p>omeryigitler.com</p></div><div class="oy-home-arrow">↗</div></a>` + projects.map(card).join('');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
