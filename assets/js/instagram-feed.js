(() => {
  const PROJECTS_URL = 'projects.html';
  const filters = [
    { value: 'all', label: 'ALL' },
    { value: 'sites', label: 'SITES' },
    { value: 'commerce', label: 'COMMERCE' },
    { value: 'apps', label: 'APPS' },
    { value: 'tools', label: 'TOOLS' },
    { value: 'experiments', label: 'EXPERIMENTS' }
  ];

  const projects = [
    { repo:'reformerpilatesmalta.com', title:'Reformer Pilates Malta', category:'sites', kind:'Fitness booking platform', stack:['Next.js','TypeScript','Firebase'], siteUrl:'https://reformerpilatesmalta.com' },
    { repo:'bugunneyiyelim.com', title:'What Eat Today', category:'apps', kind:'Food discovery app', stack:['Web App','Responsive UI','Vercel'], siteUrl:'https://www.todayweeat.com/', siteLabel:'TODAYWEEAT.COM' },
    { repo:'mybabyshire.com', title:'MyBabyShire', category:'commerce', kind:'Baby e-commerce platform', stack:['React','Vite','Prisma','Express'], siteUrl:'https://mybabyshire.com' },
    { repo:'xxl-cafe-o-co.', title:'XXL Cafe & Co.', category:'commerce', kind:'Coffee commerce website', stack:['React','Commerce UI','Vercel'], siteUrl:'https://xxl-cafe-o-co.vercel.app', githubUrl:'https://github.com/omeryigitler/xxl-cafe-o-co.' },
    { repo:'Japanese-Bakery', title:'Japanese Bakery', category:'commerce', kind:'Editorial food e-commerce', stack:['React','Interaction','Vercel'], siteUrl:'https://japanese-bakery.vercel.app', siteLabel:'JAPANESE-BAKERY.VERCEL.APP', githubUrl:'https://github.com/omeryigitler/Japanese-Bakery' },
    { repo:'dawlstudio.com', title:'Dawl Studio', category:'sites', kind:'Creative studio commerce platform', stack:['React','Vite','Supabase','Stripe'], siteUrl:'https://dawlstudio.com' },
    { repo:'builtwithseyhan.com', title:'Built With Seyhan', category:'sites', kind:'Fitness coaching platform', stack:['Next.js','TypeScript','Supabase','Tailwind'], siteUrl:'https://builtwithseyhan.com' },
    { repo:'yasemin-ozgan', title:'Elena Moreau', category:'sites', kind:'Luxury real estate website', stack:['React','TypeScript','Motion','Vercel'], siteUrl:'https://elena-real-estate.vercel.app' },
    { repo:'muhasebe', title:'Accounting Studio', category:'apps', kind:'Accounting / calculator website', stack:['React','Vite','GSAP','Tailwind'], siteUrl:'https://muhasebe-delta-virid.vercel.app', siteLabel:'MUHASEBE-DELTA-VIRID.VERCEL.APP', githubUrl:'https://github.com/omeryigitler/muhasebe' },
    { repo:'mybabyshire-archive', title:'MyBabyShire Archive', category:'commerce', kind:'Legacy baby commerce experience', stack:['React','Commerce UI','Vercel'], siteUrl:'https://mybabyshire-archive.vercel.app', siteLabel:'MYBABYSHIRE-ARCHIVE.VERCEL.APP' },
    { repo:'verdant-nyc---four-seasons-landscapes', title:'Verdant NYC — Four Seasons Landscapes', category:'sites', kind:'Landscape studio website', stack:['React','Responsive UI','Vercel'], siteUrl:'https://verdant-nyc-four-seasons-landscapes.vercel.app', siteLabel:'VERCEL / VERDANT NYC' },
    { repo:'parfum', title:"L'Essence", category:'commerce', kind:'Fragrance e-commerce', stack:['React','Commerce UI','Vercel'], siteUrl:'https://parfum-eta.vercel.app' },
    { repo:'the-maltese-bean', title:'The Maltese Bean', category:'sites', kind:'Hospitality / coffee website', stack:['React','Responsive UI','Vercel'], siteUrl:'https://the-maltese-bean.vercel.app', siteLabel:'VERCEL / THE MALTESE BEAN' },
    { repo:'cafe', title:'Cafe', category:'commerce', kind:'Hospitality / commerce experience', stack:['React','Motion','Vercel'], siteUrl:'https://cafe-o-co.vercel.app', siteLabel:'VERCEL / CAFE', githubUrl:'https://github.com/omeryigitler/cafe' },
    { repo:'Architecture-eCommerce-3D', title:'Architecture eCommerce 3D', category:'commerce', kind:'3D product commerce experience', stack:['React','3D Web','Interaction','Vercel'], siteUrl:'https://architecture-e-commerce-3d.vercel.app', siteLabel:'ARCHITECTURE-E-COMMERCE-3D.VERCEL.APP', githubUrl:'https://github.com/omeryigitler/Architecture-eCommerce-3D' },
    { repo:'nailstudio', title:'Nail Studio', category:'commerce', kind:'Beauty / booking commerce', stack:['React','Commerce UI','Vercel'], siteUrl:'https://nailstudio-gamma.vercel.app' },
    { repo:'module-page-v1', title:'Module Page V1', category:'tools', kind:'SaaS module builder', stack:['React','Vite','TypeScript','Supabase'], siteUrl:'https://module-page-v1.vercel.app', siteLabel:'VERCEL / MODULE PAGE' },
    { repo:'core-engine-admin-panel', title:'Core Engine Admin Panel', category:'tools', kind:'Admin / operations dashboard', stack:['React','Vite','TypeScript','Recharts'], siteUrl:'https://core-engine-admin-panel.vercel.app', siteLabel:'VERCEL / CORE ENGINE' },
    { repo:'olinkbu.com', title:'Olinkbu', category:'apps', kind:'Link / profile web app', stack:['Web App','Responsive UI','Vercel'], siteUrl:'https://olinkbu.com' },
    { repo:'date.omeryigitler.com', title:'Date', category:'apps', kind:'Date utility app', stack:['Web App','Interaction','Vercel'], siteUrl:'https://date.omeryigitler.com' },
    { repo:'berfinakbas.com', title:'Berfin Akbaş', category:'sites', kind:'Personal portfolio website', stack:['React','Interaction','Vercel'], siteUrl:'https://berfinakbas-com.vercel.app', githubUrl:'https://github.com/omeryigitler/berfinakbas.com' },
    { repo:'Dashboard', title:'Dashboard', category:'tools', kind:'Content / operations dashboard', stack:['React','Vite','Express','TypeScript'], siteUrl:'https://dashboard-dasboard.vercel.app', siteLabel:'VERCEL / DASHBOARD', githubUrl:'https://github.com/omeryigitler/Dashboard' },
    { repo:'startpage', title:'Startpage', category:'sites', kind:'Personal command dashboard', stack:['Next.js','TypeScript','Neon','NextAuth'], siteUrl:'https://start.omeryigitler.com', siteLabel:'START.OMERYIGITLER.COM', githubUrl:'https://github.com/omeryigitler/startpage' },
    { repo:'ramazanda-malta.omeryigitler.com', title:'Ramazanda Malta', category:'apps', kind:'Ramadan utility app', stack:['Web App','Responsive UI','Vercel'], siteUrl:'https://ramazanda-malta.omeryigitler.com' },
    { repo:'atelier-couture-belgium', title:'Atelier Couture Belgium', category:'sites', kind:'Fashion / couture website', stack:['React','TypeScript','Vercel'], siteUrl:'https://atelier-couture-belgium.vercel.app', siteLabel:'VERCEL / ATELIER COUTURE' },
    { repo:'full-stack', title:'Full Stack', category:'tools', kind:'Full-stack development prototype', stack:['Frontend','Backend','API'] },
    { repo:'finance-agent-browser', title:'Finance Agent Browser', category:'tools', kind:'Finance intelligence dashboard', stack:['Python','FastAPI','Neon','Vercel'] },
    { repo:'GymApp', title:'Gym App', category:'apps', kind:'Workout tracking product', stack:['Web App','TypeScript','Vercel'] },
    { repo:'kedi', title:'Cat', category:'experiments', kind:'Creative interaction experiment', stack:['Interaction','Motion','Frontend'], githubUrl:'https://github.com/omeryigitler/kedi' },
    { repo:'-Property-Management', title:'Property Management', category:'apps', kind:'Property management app', stack:['Application UI','Data','Frontend'], githubUrl:'https://github.com/omeryigitler/-Property-Management' },
    { repo:'Portfolio', title:'Portfolio', category:'sites', kind:'Portfolio design system', stack:['React','TypeScript','Vite','GSAP'], githubUrl:'https://github.com/omeryigitler/Portfolio' }
  ];

  window.OMER_ARCHIVE_DATA = { filters, projects, count: projects.length };

  const arrowIcon = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14"></path><path d="m13 6 6 6-6 6"></path></svg>`;
  const searchIcon = `<svg class="project-finder-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="6.8"></circle><path d="m16.2 16.2 4.1 4.1"></path></svg>`;

  function setupArchiveLauncher() {
    const root = document.querySelector('[data-instagram-feed]');
    if (!root) return;
    const selected = projects.slice(0, 3);
    const preview = (repo) => `https://raw.githubusercontent.com/omeryigitler/Portfolio/main/public/project-previews/${repo.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'')}.png`;
    root.id = 'selected-work';
    root.className = 'selected-work';
    root.removeAttribute('data-instagram-feed');
    root.removeAttribute('data-limit');
    root.setAttribute('aria-labelledby', 'selected-work-heading');
    root.innerHTML = `<div class="selected-work-head"><div><p class="section-kicker">SELECTED WORK</p><h2 id="selected-work-heading">Built for real <span class="soft">businesses.</span></h2></div><a class="work-all" href="${PROJECTS_URL}">View all ${projects.length} projects ${arrowIcon}</a></div>
      <div class="selected-work-grid">${selected.map((project,i) => `<a class="selected-project" href="${project.siteUrl}" target="_blank" rel="noopener noreferrer"><div class="selected-project-image"><img src="${preview(project.repo)}" alt="${project.title} website preview" loading="lazy" decoding="async" width="1200" height="800"><span class="preview-unavailable" hidden>Preview unavailable · Open project ↗</span></div><div class="selected-project-info"><span class="section-kicker">0${i+1} / ${project.category}</span><h3>${project.title}</h3><p>${project.kind}</p><span class="project-visit">Visit website ↗</span></div></a>`).join('')}</div>`;
    root.querySelectorAll('img').forEach(img => {
      const failed = () => { img.hidden = true; img.nextElementSibling.hidden = false; };
      img.addEventListener('error', failed, {once:true});
      if (img.complete && !img.naturalWidth) failed();
    });
    const hero = document.querySelector('.hero');
    if (hero) hero.insertAdjacentElement('afterend', root);
  }

  function addLocationCue() {
    const hero = document.querySelector('.hero');
    if (!hero || hero.querySelector('.home-location-note')) return;
    const sub = hero.querySelector('p.sub');
    if (!sub) return;
    const note = document.createElement('div');
    note.className = 'home-location-note';
    note.textContent = 'Malta · working worldwide';
    sub.insertAdjacentElement('afterend', note);
  }

  function alignContactWithAdminPipeline() {
    const contact = document.getElementById('contact');
    if (!contact) return;

    const form = document.getElementById('contactForm');
    const contactCard = form ? form.closest('.contact-card') : null;
    if (contactCard) {
      const heading = contactCard.querySelector('h3');
      const lede = contactCard.querySelector('.lede');
      const textarea = document.getElementById('projectMessage');
      const submit = form.querySelector('.send-btn');

      if (heading) heading.textContent = 'Start a Project';
      if (lede) lede.textContent = 'Tell me what you’re building. I’ll turn the brief into a clear project scope.';
      if (textarea) textarea.setAttribute('placeholder', 'Tell me about the project...');
      if (submit) submit.textContent = 'Continue to project details';

      if (!contactCard.querySelector('.contact-flow-hint')) {
        const hint = document.createElement('p');
        hint.className = 'contact-flow-hint';
        hint.innerHTML = '<strong>01</strong> brief · <strong>02</strong> scope · <strong>03</strong> secure request';
        form.insertAdjacentElement('beforebegin', hint);
      }
    }

    const supportCopy = contact.querySelector('.support-info p');
    if (supportCopy && /^We provide/i.test(supportCopy.textContent || '')) {
      supportCopy.textContent = 'I provide continuous security updates and performance optimization for every project.';
    }

    const designGrid = document.querySelector('.chip-grid[data-group="designType"]');
    if (designGrid) {
      const custom = designGrid.querySelector('.chip[data-value="CUSTOM"]');
      const template = designGrid.querySelector('.chip[data-value="TEMPLATE"]');
      if (custom && !custom.classList.contains('is-on')) custom.click();
      if (template) template.remove();
      designGrid.classList.remove('two');
      if (custom) {
        custom.classList.add('is-on');
        custom.textContent = 'Custom Design';
      }
      const label = designGrid.previousElementSibling;
      if (label && label.classList.contains('cfg-flabel')) label.textContent = 'Design Approach';
    }
  }

  function setupProcessBlueprint() {
    const process = document.getElementById('process');
    const wrap = process?.querySelector('.warp-wrap');
    if (!process || !wrap || wrap.dataset.blueprintReady === '1') return;
    wrap.dataset.blueprintReady = '1';

    const steps = [
      {
        label: 'Strategy',
        title: 'From visitor to enquiry',
        copy: 'We map how a local customer finds you, understands what you sell, trusts the business, and contacts you without friction.',
        output: 'User journey · sitemap · conversion path',
        tags: ['Google', 'Trust', 'Call / WhatsApp']
      },
      {
        label: 'Interface',
        title: 'A storefront people understand',
        copy: 'Services, prices, photos, reviews, location, and contact actions are arranged so visitors instantly know what to do next.',
        output: 'Responsive UI · content hierarchy · interactions',
        tags: ['Services', 'Photos', 'Clear actions']
      },
      {
        label: 'Development',
        title: 'Built to load and convert',
        copy: 'The approved design becomes a fast production site with working forms, tracking, responsive checks, SEO foundations, and clean code.',
        output: 'Production code · forms · analytics · SEO',
        tags: ['Fast pages', 'Forms work', 'Tracking']
      },
      {
        label: 'Launch',
        title: 'Live project proof',
        copy: 'The system finishes as real work: tested on desktop and phone, connected to the domain, monitored, and prepared for handover.',
        output: 'QA · domain · monitoring · handover',
        tags: ['Desktop QA', 'Mobile QA', 'Live launch']
      }
    ];

    wrap.classList.add('process-blueprint-wrap');
    wrap.innerHTML = `
      <div class="process-blueprint-sticky" data-process-sticky>
        <div class="process-system-hud">
          <span><b>$</b> PROCESS / BUILD SYSTEM</span>
          <span><strong data-process-step>01 / 04</strong><i>—</i><span data-process-label>STRATEGY</span></span>
        </div>
        <div class="process-system-body">
          <aside class="process-rail" aria-label="Process stages">
            <div class="process-rail-line"><span data-process-rail-fill></span></div>
            ${steps.map((step, index) => `
              <div class="process-rail-step${index === 0 ? ' is-active' : ''}" data-process-rail-step="${index}">
                <span class="process-rail-number">${String(index + 1).padStart(2, '0')}</span>
                <span class="process-rail-name">${step.label}</span>
              </div>`).join('')}
          </aside>
          <div class="process-sheet-stage" data-process-stage>
            ${steps.map((step, index) => `
              <article class="process-sheet${index === 0 ? ' is-active' : ''}" data-process-sheet="${index}">
                <span class="process-sheet-ghost">${String(index + 1).padStart(2, '0')}</span>
                <div class="process-sheet-content">
                  <div class="process-sheet-kicker">${String(index + 1).padStart(2, '0')} / ${step.label}</div>
                  <h3>${step.title}</h3>
                  <p>${step.copy}</p>
                  <div class="process-output"><span>OUTPUT</span><strong>${step.output}</strong></div>
                  <div class="process-tags">${step.tags.map((tag) => `<span>${tag}</span>`).join('')}</div>
                </div>
              </article>`).join('')}
          </div>
        </div>
        <div class="process-system-progress"><span data-process-progress></span></div>
      </div>`;

    const desktop = window.matchMedia('(min-width: 900px)');
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const sheets = [...wrap.querySelectorAll('[data-process-sheet]')];
    const railSteps = [...wrap.querySelectorAll('[data-process-rail-step]')];
    const stepEl = wrap.querySelector('[data-process-step]');
    const labelEl = wrap.querySelector('[data-process-label]');
    const progressEl = wrap.querySelector('[data-process-progress]');
    const railFill = wrap.querySelector('[data-process-rail-fill]');
    let raf = 0;

    function paint() {
      raf = 0;
      if (!desktop.matches || reduced) {
        sheets.forEach((sheet) => {
          sheet.style.removeProperty('transform');
          sheet.style.removeProperty('opacity');
          sheet.style.removeProperty('visibility');
        });
        return;
      }

      const rect = wrap.getBoundingClientRect();
      const scrollable = Math.max(1, wrap.offsetHeight - window.innerHeight);
      const progress = Math.max(0, Math.min(1, -rect.top / scrollable));
      const position = progress * (steps.length - 1);
      const active = Math.max(0, Math.min(steps.length - 1, Math.round(position)));

      sheets.forEach((sheet, index) => {
        const delta = index - position;
        const distance = Math.abs(delta);
        const y = delta * 118;
        const scale = Math.max(.94, 1 - distance * .028);
        const opacity = Math.max(0, 1 - distance * .92);
        sheet.style.transform = `translate3d(0, calc(-50% + ${y.toFixed(1)}px), 0) scale(${scale.toFixed(3)})`;
        sheet.style.opacity = opacity.toFixed(3);
        sheet.style.visibility = opacity < .02 ? 'hidden' : 'visible';
        sheet.classList.toggle('is-active', index === active);
      });

      railSteps.forEach((step, index) => step.classList.toggle('is-active', index === active));
      if (stepEl) stepEl.textContent = `${String(active + 1).padStart(2, '0')} / 04`;
      if (labelEl) labelEl.textContent = steps[active].label.toUpperCase();
      if (progressEl) progressEl.style.width = `${(progress * 100).toFixed(2)}%`;
      if (railFill) railFill.style.height = `${(progress * 100).toFixed(2)}%`;
    }

    function requestPaint() {
      if (!raf) raf = requestAnimationFrame(paint);
    }

    window.addEventListener('scroll', requestPaint, { passive: true });
    window.addEventListener('resize', requestPaint, { passive: true });
    desktop.addEventListener?.('change', requestPaint);
    paint();
  }

  setupArchiveLauncher();
  addLocationCue();
  alignContactWithAdminPipeline();
  setupProcessBlueprint();
})();
