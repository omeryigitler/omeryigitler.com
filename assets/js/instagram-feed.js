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

    let query = '';
    let lensReady = false;
    const LENS_SIZE = 72;
    const LENS_ZOOM = 1.42;

    const openArchive = (filter = 'all', search = query) => {
      const params = new URLSearchParams();
      if (filter !== 'all') params.set('filter', filter);
      if (search.trim()) params.set('q', search.trim());
      window.location.href = `${PROJECTS_URL}${params.toString() ? `?${params}` : ''}`;
    };

    root.id = 'selected-work';
    root.className = 'instagram-feed-section project-finder-section portfolio-launcher';
    root.removeAttribute('data-instagram-feed');
    root.removeAttribute('data-limit');
    root.setAttribute('aria-label', 'Project index');
    root.innerHTML = `
      <div class="project-finder-shell" data-project-finder-content>
        <div class="project-finder-head">
          <span>PROJECT INDEX <span class="project-finder-sep">—</span> ${String(projects.length).padStart(2,'0')} GITHUB PROJECTS</span>
          <a class="project-finder-all" href="${PROJECTS_URL}">EXPLORE ALL ${arrowIcon}</a>
        </div>
        <form class="project-finder-search" data-project-search>
          ${searchIcon}
          <input class="project-finder-input" data-project-input type="search" autocomplete="off" spellcheck="false" placeholder="Search projects, tools, experiments..." aria-label="Search all projects">
        </form>
        <div class="project-finder-foot">
          <div class="project-finder-chips" aria-label="Project categories">
            ${filters.map((filter) => `<button class="project-finder-chip${filter.value === 'all' ? ' is-active' : ''}" type="button" data-filter="${filter.value}">${filter.label}</button>`).join('')}
          </div>
        </div>
      </div>
      <div class="project-magnifier" data-project-magnifier aria-hidden="true">
        <div class="project-magnifier-clone" data-project-magnifier-clone></div>
        <span class="project-magnifier-ring"></span>
        <span class="project-magnifier-glint"></span>
      </div>`;

    const hero = document.querySelector('.hero');
    if (hero && root.previousElementSibling !== hero) hero.insertAdjacentElement('afterend', root);

    const form = root.querySelector('[data-project-search]');
    const input = root.querySelector('[data-project-input]');
    input?.addEventListener('input', () => {
      query = input.value || '';
      syncLensContent();
    });
    form?.addEventListener('submit', (event) => {
      event.preventDefault();
      openArchive();
    });
    root.querySelectorAll('[data-filter]').forEach((button) => {
      button.addEventListener('click', () => openArchive(button.dataset.filter || 'all', ''));
    });
    root.addEventListener('click', (event) => {
      if (!event.target.closest('input,button,a')) openArchive();
    });

    function syncLensContent() {
      if (!lensReady) return;
      const source = root.querySelector('[data-project-finder-content]');
      const clone = root.querySelector('[data-project-magnifier-clone]');
      if (!source || !clone) return;
      clone.innerHTML = source.innerHTML;
      clone.querySelectorAll('input,button,a').forEach((element) => {
        element.tabIndex = -1;
        element.setAttribute('aria-hidden','true');
        element.style.pointerEvents = 'none';
      });
      const clonedInput = clone.querySelector('[data-project-input]');
      if (clonedInput) clonedInput.value = query;
    }

    function setupMagnifier() {
      if (!window.matchMedia('(pointer: fine)').matches) return;
      const lens = root.querySelector('[data-project-magnifier]');
      const clone = root.querySelector('[data-project-magnifier-clone]');
      const source = root.querySelector('[data-project-finder-content]');
      if (!lens || !clone || !source) return;
      lensReady = true;
      syncLensContent();

      const move = (event) => {
        if (event.pointerType === 'touch') return;
        const sectionRect = root.getBoundingClientRect();
        const sourceRect = source.getBoundingClientRect();
        const sectionX = event.clientX - sectionRect.left;
        const sectionY = event.clientY - sectionRect.top;
        const sourceX = event.clientX - sourceRect.left;
        const sourceY = event.clientY - sourceRect.top;

        lens.style.opacity = '1';
        lens.style.transform = `translate3d(${sectionX - LENS_SIZE / 2}px, ${sectionY - LENS_SIZE / 2}px, 0)`;
        clone.style.width = `${sourceRect.width}px`;
        clone.style.height = `${sourceRect.height}px`;
        clone.style.transform = `translate3d(${LENS_SIZE / 2 - sourceX * LENS_ZOOM}px, ${LENS_SIZE / 2 - sourceY * LENS_ZOOM}px, 0) scale(${LENS_ZOOM})`;
      };

      root.addEventListener('pointerenter', (event) => {
        syncLensContent();
        move(event);
      });
      root.addEventListener('pointermove', move);
      root.addEventListener('pointerleave', () => { lens.style.opacity = '0'; });
    }

    setupMagnifier();
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
      if (textarea) {
        const phrases = ['Tell us about the project...', 'A new website for my business...', 'Redesign + SEO for my store...', 'An online booking system...'];
        textarea.placeholder = phrases[0];
        if (!textarea.dataset.rotatingPlaceholder) {
          textarea.dataset.rotatingPlaceholder = 'true';
          const reduced = matchMedia('(prefers-reduced-motion:reduce)');
          let phrase = 0, char = phrases[0].length, deleting = true, timer;
          const step = () => {
            if (document.hidden || reduced.matches || document.activeElement === textarea || textarea.value) return;
            textarea.placeholder = phrases[phrase].slice(0, char);
            let delay;
            if (deleting && char > 0) { char--; delay = 30; }
            else if (deleting) { deleting = false; phrase = (phrase + 1) % phrases.length; delay = 500; }
            else if (char < phrases[phrase].length) { char++; delay = 65; }
            else { deleting = true; delay = 2800; }
            timer = setTimeout(step, delay);
          };
          const resume = () => { clearTimeout(timer); timer = setTimeout(step, 3000); };
          textarea.addEventListener('focus', () => { clearTimeout(timer); textarea.placeholder = phrases[phrase]; });
          textarea.addEventListener('blur', resume);
          textarea.addEventListener('input', resume);
          document.addEventListener('visibilitychange', resume);
          reduced.addEventListener('change', resume);
          resume();
        }
      }
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
  function setupSectionActions() {
    const labels = [
      ['.project-finder-head > span', 'project archive', '31 projects indexed'],
      ['#expertise .badge', 'expertise', 'complete digital solutions'],
      ['.oy-signal-label', 'diagnostics', 'conversion system diagnostics'],
      ['.philosophy-kicker', 'principles', 'just work that lasts'],
      ['#contact > .section-status', 'contact', 'ready for new projects'],
      ['.archive-status', 'project archive', '31 projects indexed']
    ];
    labels.forEach(([selector, key, value]) => {
      const host = document.querySelector(selector);
      if (!host || host.classList.contains('section-terminal')) return;
      host.classList.add('section-terminal');
      host.innerHTML = `<span class="terminal-prompt" aria-hidden="true">$</span><span class="terminal-key">${key}</span><span class="terminal-arrow" aria-hidden="true">→</span><span class="section-type">${value}</span>`;
    });
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    document.querySelectorAll('.section-type').forEach(el => {
      if (el.dataset.label) return;
      const label = el.textContent.trim();
      el.dataset.label = label;
      el.setAttribute('aria-label', label);
      const text = document.createElement('span');
      text.className = 'section-type-text';
      text.setAttribute('aria-hidden', 'true');
      text.textContent = label;
      el.replaceChildren(text);
      if (reduced.matches || !('IntersectionObserver' in window)) return;
      let index = label.length, deleting = true, timer = null, visible = false;
      const tick = () => {
        if (!visible || document.hidden) { timer = null; return; }
        index += deleting ? -1 : 1;
        text.textContent = label.slice(0, index);
        let delay = deleting ? 38 : 70;
        if (index === 0) { deleting = false; delay = 600; }
        if (index === label.length) { deleting = true; delay = 3000; }
        timer = setTimeout(tick, delay);
      };
      const resume = () => {
        clearTimeout(timer); timer = null;
        if (visible && !document.hidden) timer = setTimeout(tick, 1800);
      };
      new IntersectionObserver(entries => { visible = entries[0].isIntersecting; resume(); }, {threshold:0.1}).observe(el);
      document.addEventListener('visibilitychange', resume);
      reduced.addEventListener('change', () => { if (reduced.matches) { visible = false; clearTimeout(timer); text.textContent = label; } });
    });
    const briefButton = document.querySelector('.brief-start');
    if (briefButton && !briefButton.dataset.bound) {
    briefButton.dataset.bound = 'true';
    briefButton.addEventListener('click', () => {
      const field = document.getElementById('projectMessage');
      field?.focus({preventScroll:true});
      field?.scrollIntoView({behavior:reduced.matches ? 'instant' : 'smooth',block:'center'});
    });
    }
    if (!document.querySelector('.oy-signal-label') && document.querySelector('#process')) {
      const lateSection = new MutationObserver(() => {
        if (document.querySelector('.oy-signal-label')) { lateSection.disconnect(); setupSectionActions(); }
      });
      lateSection.observe(document.body, {childList:true, subtree:true});
    }
  }
  function setupFooterMotion() {
    const footer = document.querySelector('.signal-footer');
    const word = footer?.querySelector('.footer-word');
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (!word || reduced.matches) return;
    const veil = document.createElement('canvas');
    veil.className = 'footer-pixel-veil';
    veil.setAttribute('aria-hidden', 'true');
    const ctx = veil.getContext('2d');
    if (!ctx) return;
    footer.append(veil);
    let frame = 0, width = 0, height = 0;
    const paint = () => {
      frame = 0;
      const rect = footer.getBoundingClientRect();
      const progress = Math.max(0, Math.min(1, (innerHeight - rect.top) / Math.max(1, Math.min(rect.height, innerHeight * .85))));
      word.style.transform = `translate3d(${(1 - progress) * 8}%,0,0)`;
      const w = Math.ceil(rect.width), h = Math.ceil(rect.height);
      if (w !== width || h !== height) { width = veil.width = w; height = veil.height = h; }
      ctx.clearRect(0, 0, width, height);
      if (reduced.matches) return;
      const cell = width < 700 ? 22 : 32;
      const rows = Math.ceil(height / cell);
      ctx.fillStyle = '#050505';
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < Math.ceil(width / cell); col++) {
          const noise = ((col * 73 + row * 137 + col * row * 19) % 101) / 100;
          const threshold = .04 + .94 * ((row / Math.max(1, rows - 1)) * .68 + noise * .32);
          if (progress < threshold) ctx.fillRect(col * cell, row * cell, cell, cell);
        }
      }
      footer.dataset.reveal = progress.toFixed(3);
    };
    const update = () => { if (!frame) frame = requestAnimationFrame(paint); };
    addEventListener('scroll', update, {passive:true});
    addEventListener('resize', update, {passive:true});
    reduced.addEventListener('change', update);
    new ResizeObserver(update).observe(footer);
    paint();
  }
  function setupMagneticPointer() {
    const fine = matchMedia('(pointer:fine)');
    const reduced = matchMedia('(prefers-reduced-motion:reduce)');
    if (!fine.matches || reduced.matches) return;
    const pointer = document.createElement('div');
    pointer.className = 'magnetic-pointer';
    pointer.hidden = true;
    pointer.setAttribute('aria-hidden', 'true');
    document.body.append(pointer);
    let x = 0, y = 0, targetX = 0, targetY = 0, frame = 0, shown = false;
    const paint = () => {
      x += (targetX - x) * .38; y += (targetY - y) * .38;
      pointer.style.transform = `translate3d(${x}px,${y}px,0)`;
      frame = Math.abs(targetX-x) + Math.abs(targetY-y) > .15 ? requestAnimationFrame(paint) : 0;
    };
    const hide = () => { shown = false; pointer.hidden = true; document.documentElement.classList.remove('magnetic-pointer-active'); cancelAnimationFrame(frame); frame = 0; };
    document.addEventListener('pointermove', event => {
      if (event.pointerType === 'touch' || reduced.matches || !fine.matches || event.target.closest('.project-finder-section')) { hide(); return; }
      let nearest = null, distance = 70;
      document.querySelectorAll('a,button,summary').forEach(el => {
        if (el.matches(':disabled') || !el.getClientRects().length) return;
        const r = el.getBoundingClientRect();
        if (r.width > 400 || r.height > 160) return;
        const dx = Math.max(r.left-event.clientX, 0, event.clientX-r.right);
        const dy = Math.max(r.top-event.clientY, 0, event.clientY-r.bottom);
        const d = Math.hypot(dx,dy);
        if (d < distance) { distance = d; nearest = r; }
      });
      targetX = event.clientX; targetY = event.clientY;
      if (nearest) {
        const pull = .32 * (1-distance/70);
        targetX += (nearest.left + nearest.width/2 - targetX) * pull;
        targetY += (nearest.top + nearest.height/2 - targetY) * pull;
      }
      pointer.classList.toggle('is-attracted', !!nearest);
      // Resolve the actual painted background, including black buttons on yellow.
      let surface = event.target, onYellow = false;
      while (surface instanceof Element) {
        const rgba = getComputedStyle(surface).backgroundColor.match(/[\d.]+/g)?.map(Number);
        if (rgba && (rgba.length < 4 || rgba[3] > .8)) {
          onYellow = rgba[0] > 150 && rgba[1] > 110 && rgba[2] < 140;
          break;
        }
        surface = surface.parentElement;
      }
      pointer.classList.toggle('on-yellow', onYellow);
      if (!shown) { x=targetX; y=targetY; shown=true; }
      pointer.hidden = false;
      document.documentElement.classList.add('magnetic-pointer-active');
      if (!frame) frame = requestAnimationFrame(paint);
    }, {passive:true});
    document.documentElement.addEventListener('pointerleave', hide);
    addEventListener('blur', hide);
    document.addEventListener('keydown', event => { if (event.key === 'Tab') hide(); });
    fine.addEventListener('change', hide); reduced.addEventListener('change', hide);
  }
  function setupPixelMagnets() {
    const oldWord = document.querySelector('.footer-word');
    const svg = oldWord?.querySelector('svg');
    if (!svg) return;
    // The wordmark is an interactive field, not one large home link.
    const word = document.createElement('div');
    word.className = oldWord.className;
    word.setAttribute('role', 'img');
    word.setAttribute('aria-label', 'omeryigitler.com');
    word.append(svg);
    oldWord.replaceWith(word);
    const reduced = matchMedia('(prefers-reduced-motion:reduce)');
    const fine = matchMedia('(pointer:fine)');
    if (reduced.matches || !fine.matches) return;
    const field = word.closest('.footer-word-window');
    const cells = [...svg.querySelectorAll('rect')].map(el => ({
      el, cx:Number(el.getAttribute('x'))+.39, cy:Number(el.getAttribute('y'))+.39,
      x:0, y:0, vx:0, vy:0, scale:1, dirty:false
    }));
    let pointer = null, pressed = false, frame = 0, last = 0;
    const paint = now => {
      const step = Math.min(2, (now-last)/16.67 || 1); last=now;
      let moving = false, affected = 0;
      const bounds = svg.getBoundingClientRect();
      const unit = bounds.width / 288;
      const px = pointer ? (pointer.x-bounds.left)/unit : 0;
      const unitY = bounds.height / 21;
      const py = pointer ? (pointer.y-bounds.top)/unitY : 0;
      const radius = 86/unit;
      cells.forEach(cell => {
        const dx=px-cell.cx, dy=py-cell.cy;
        const distance=Math.hypot(dx,dy);
        const strength=pointer ? Math.max(0,1-distance/radius) ** 2 : 0;
        const pull=pressed ? 1.1 : .72;
        const tx=dx*strength*pull, ty=dy*strength*pull;
        const scale=1+strength*(pressed ? -.5 : .65);
        if (strength>0) affected++;
        if (!strength && !cell.dirty) return;
        cell.vx=(cell.vx+(tx-cell.x)*.13*step)*(.72**step);
        cell.vy=(cell.vy+(ty-cell.y)*.13*step)*(.72**step);
        cell.x+=cell.vx*step; cell.y+=cell.vy*step;
        cell.scale+=(scale-cell.scale)*Math.min(1,.22*step);
        const unsettled=Math.abs(tx-cell.x)+Math.abs(ty-cell.y)+Math.abs(cell.vx)+Math.abs(cell.vy)+Math.abs(scale-cell.scale)>.004;
        moving ||= unsettled;
        cell.dirty=strength>0 || unsettled;
        if (!cell.dirty) { cell.el.removeAttribute('transform'); cell.x=cell.y=cell.vx=cell.vy=0; cell.scale=1; }
        else cell.el.setAttribute('transform',`translate(${cell.x.toFixed(3)} ${cell.y.toFixed(3)}) translate(${cell.cx} ${cell.cy}) scale(${cell.scale.toFixed(3)}) translate(${-cell.cx} ${-cell.cy})`);
      });
      field.dataset.activePixels=String(affected);
      frame=moving ? requestAnimationFrame(paint) : 0;
    };
    const wake=()=>{ if (!frame) { last=performance.now(); frame=requestAnimationFrame(paint); } };
    const reset=()=>{ pointer=null; pressed=false; wake(); };
    field.addEventListener('pointermove',e=>{
      if(e.pointerType==='touch' || reduced.matches || !fine.matches) return;
      pointer={x:e.clientX,y:e.clientY}; wake();
    },{passive:true});
    field.addEventListener('pointerdown',e=>{ if(e.pointerType!=='touch' && !reduced.matches) { pressed=true; wake(); } });
    addEventListener('pointerup',()=>{ if(pressed) { pressed=false; wake(); } });
    field.addEventListener('pointerleave',reset);
    addEventListener('scroll',reset,{passive:true});
    addEventListener('blur',reset);
    document.addEventListener('visibilitychange',reset);
    reduced.addEventListener('change',reset); fine.addEventListener('change',reset);
  }

  setupPixelMagnets();
  setupFooterMotion();
  setupMagneticPointer();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', setupSectionActions, {once:true});
  else setupSectionActions();
})();

