(() => {
  const PROJECTS_URL = 'projects.html';
  const FALLBACK_PROJECTS = [
    {
      id: 'built-with-seyhan',
      title: 'Built with Seyhan',
      category: 'Fitness · Health · Lifestyle',
      kicker: 'Custom Coaching Website',
      challenge: 'Present a personal coaching brand and transformation pathway clearly.',
      solution: 'A responsive conversion-focused coaching website with direct consultation actions.',
      result: 'A polished coaching presence built for desktop and mobile.',
      liveUrl: 'https://builtwithseyhan.com/tr',
      desktopImage: ''
    },
    {
      id: 'bugun-ne-yiyelim',
      title: 'Bugün Ne Yiyelim?',
      category: 'Food decision app',
      kicker: 'AI-Powered Food Decider',
      challenge: 'Reduce daily decision fatigue around what to eat.',
      solution: 'An AI-driven recommendation flow personalized to the moment.',
      result: 'Faster, simpler meal decisions.',
      liveUrl: 'https://www.bugunneyiyelim.com/',
      desktopImage: ''
    },
    {
      id: 'elite-body-protocol',
      title: 'Elite Body Protocol',
      category: 'Gamified fitness app',
      kicker: 'React Web App',
      challenge: 'Blend retro and modern interface languages into one experience.',
      solution: 'A React interaction system with cinematic state transitions.',
      result: 'A more engaging narrative-driven fitness experience.',
      liveUrl: 'https://elitebody.omeryigitler.com/',
      desktopImage: 'assets/elite-modern.png?v=V10'
    },
    {
      id: 'reformer-pilates-malta',
      title: 'Reformer Pilates Malta',
      category: 'Wellness studio',
      kicker: 'Custom Website Design',
      challenge: 'Improve visibility and make class information easier to access.',
      solution: 'A responsive studio website with clear schedules and SEO foundations.',
      result: 'A stronger local brand presence across devices.',
      liveUrl: 'https://www.reformerpilatesmalta.com/',
      desktopImage: ''
    },
    {
      id: 'today-we-eat',
      title: 'Today We Eat',
      category: 'Food decision app',
      kicker: 'AI-Powered Food Decider',
      challenge: 'Remove friction from everyday meal decisions.',
      solution: 'A fast AI-assisted recommendation experience.',
      result: 'Instant meal suggestions tailored to the user.',
      liveUrl: 'https://www.todayweeat.com/',
      desktopImage: 'assets/today-we-eat-desktop.png'
    }
  ];

  const root = document.querySelector('[data-instagram-feed]');
  if (!root) return;

  let projects = FALLBACK_PROJECTS.slice();
  let query = '';
  let activeFilter = 'all';
  let lensReady = false;

  const searchIcon = `
    <svg class="project-finder-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true">
      <circle cx="11" cy="11" r="6.8"></circle>
      <path d="m16.2 16.2 4.1 4.1"></path>
    </svg>`;

  const arrowIcon = `
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M5 12h14"></path><path d="m13 6 6 6-6 6"></path>
    </svg>`;

  function escapeHtml(value = '') {
    return String(value)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function displayUrl(url = '') {
    return String(url).replace(/^https?:\/\//i, '').replace(/^www\./i, '').replace(/\/$/, '');
  }

  function tagsFor(project) {
    const text = [project.title, project.category, project.kicker, project.challenge, project.solution]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    const tags = new Set();
    if (/app|application|react web app/.test(text)) tags.add('apps');
    if (/\bai\b|artificial intelligence|powered food decider/.test(text)) tags.add('ai');
    if (/interactive|gamif|cinematic|animation|motion/.test(text)) tags.add('interactive');
    if (!tags.size || /website|studio|coaching|wellness|site/.test(text)) tags.add('sites');
    return [...tags];
  }

  function matchesProject(project) {
    const filterMatch = activeFilter === 'all' || tagsFor(project).includes(activeFilter);
    if (!filterMatch) return false;
    const normalized = query.trim().toLowerCase();
    if (!normalized) return true;
    return [
      project.title,
      project.category,
      project.kicker,
      project.challenge,
      project.solution,
      project.result,
      project.liveUrl
    ].filter(Boolean).join(' ').toLowerCase().includes(normalized);
  }

  function renderShell() {
    root.id = 'selected-work';
    root.className = 'instagram-feed-section project-finder-section';
    root.removeAttribute('data-instagram-feed');
    root.removeAttribute('data-limit');
    root.setAttribute('aria-label', 'Selected work');

    root.innerHTML = `
      <div class="project-finder-shell" data-project-finder-content>
        <div class="project-finder-head">
          <div class="project-finder-head-copy">
            <span class="prompt">$</span>
            <strong>02 / SELECTED WORK</strong>
            <span class="project-finder-sep">—</span>
            <span class="project-finder-secondary">THINGS I’VE DESIGNED AND BUILT</span>
            <span class="project-finder-sep">—</span>
            <span><b data-project-count>${String(projects.length).padStart(2, '0')}</b> PROJECTS</span>
          </div>
          <a class="project-finder-all" href="${PROJECTS_URL}">EXPLORE ALL <span aria-hidden="true">↗</span></a>
        </div>

        <form class="project-finder-search" data-project-search>
          ${searchIcon}
          <input class="project-finder-input" data-project-input type="search" autocomplete="off" spellcheck="false" placeholder="Search selected projects..." aria-label="Search selected projects">
          <button class="project-finder-open" type="submit">OPEN ARCHIVE ${arrowIcon}</button>
        </form>

        <div class="project-finder-foot">
          <div class="project-finder-chips" aria-label="Project disciplines">
            <button class="project-finder-chip is-active" type="button" data-filter="all">ALL</button>
            <button class="project-finder-chip" type="button" data-filter="sites">SITES</button>
            <button class="project-finder-chip" type="button" data-filter="apps">APPS</button>
            <button class="project-finder-chip" type="button" data-filter="ai">AI</button>
            <button class="project-finder-chip" type="button" data-filter="interactive">INTERACTIVE</button>
          </div>
          <p class="project-finder-note"><strong>Selected case studies</strong><br>Challenge · solution · live result</p>
        </div>

        <div class="selected-project-results-head">
          <span data-result-count>${String(projects.length).padStart(2, '0')} RESULTS</span>
          <span>HOVER TO PREVIEW · OPEN LIVE PROJECT ↗</span>
        </div>
        <div class="selected-project-grid" data-project-grid></div>
      </div>

      <div class="project-magnifier" data-project-magnifier aria-hidden="true">
        <div class="project-magnifier-clone" data-project-magnifier-clone></div>
        <span class="project-magnifier-ring"></span>
        <span class="project-magnifier-glint"></span>
      </div>`;

    const hero = document.querySelector('.hero');
    if (hero && root.previousElementSibling !== hero) hero.insertAdjacentElement('afterend', root);

    bindControls();
    renderProjects();
    setupMagnifier();
  }

  function projectCard(project, index) {
    const image = project.desktopImage || project.mobileImage || '';
    const liveUrl = project.liveUrl || PROJECTS_URL;
    const tags = tagsFor(project);
    const category = project.category || tags[0] || 'Selected work';
    const challenge = project.challenge || 'A focused digital problem to solve.';
    const solution = project.solution || project.kicker || 'A custom-designed web experience.';
    const result = project.result || 'A polished live result.';

    return `
      <a class="selected-project-card${image ? ' has-preview' : ''}" href="${escapeHtml(liveUrl)}" target="_blank" rel="noopener noreferrer" data-project-card>
        ${image ? `<div class="selected-project-preview" aria-hidden="true"><img src="${escapeHtml(image)}" alt="" loading="lazy" decoding="async"></div>` : ''}
        <div class="selected-project-scrim" aria-hidden="true"></div>
        <div class="selected-project-content">
          <div class="selected-project-top">
            <span>${String(index + 1).padStart(2, '0')}</span>
            <span>${escapeHtml(category)}</span>
          </div>
          <div class="selected-project-main">
            <h3>${escapeHtml(project.title || 'Untitled project')}</h3>
            <p class="selected-project-url">${escapeHtml(displayUrl(liveUrl))}</p>
            ${image ? `<div class="selected-project-mobile-preview"><img src="${escapeHtml(image)}" alt="Preview of ${escapeHtml(project.title || 'project')}" loading="lazy" decoding="async"></div>` : ''}
            <dl class="selected-project-meta">
              <div><dt>CHALLENGE</dt><dd>${escapeHtml(challenge)}</dd></div>
              <div><dt>SOLUTION</dt><dd>${escapeHtml(solution)}</dd></div>
              <div><dt>RESULT</dt><dd>${escapeHtml(result)}</dd></div>
            </dl>
          </div>
          <div class="selected-project-bottom">
            <span>${escapeHtml((project.kicker || tags.join(' · ') || 'LIVE PROJECT').toUpperCase())}</span>
            <span>LIVE SITE ↗</span>
          </div>
        </div>
      </a>`;
  }

  function renderProjects() {
    const grid = root.querySelector('[data-project-grid]');
    const resultCount = root.querySelector('[data-result-count]');
    const countNode = root.querySelector('[data-project-count]');
    if (!grid) return;

    const visible = projects.filter(matchesProject);
    if (countNode) countNode.textContent = String(projects.length).padStart(2, '0');
    if (resultCount) resultCount.textContent = `${String(visible.length).padStart(2, '0')} RESULTS`;

    if (!visible.length) {
      grid.innerHTML = '<div class="selected-project-empty">NO MATCHING PROJECTS — TRY ANOTHER SEARCH OR FILTER.</div>';
    } else {
      grid.innerHTML = visible.map(projectCard).join('');
    }
    syncMagnifierClone();
  }

  function bindControls() {
    const form = root.querySelector('[data-project-search]');
    const input = root.querySelector('[data-project-input]');
    const filters = [...root.querySelectorAll('[data-filter]')];

    if (input) {
      input.addEventListener('input', () => {
        query = input.value || '';
        renderProjects();
      });
    }

    if (form) {
      form.addEventListener('submit', (event) => {
        event.preventDefault();
        const suffix = query.trim() ? `?q=${encodeURIComponent(query.trim())}` : '';
        window.location.href = `${PROJECTS_URL}${suffix}`;
      });
    }

    filters.forEach((button) => {
      button.addEventListener('click', () => {
        activeFilter = button.dataset.filter || 'all';
        filters.forEach((item) => item.classList.toggle('is-active', item === button));
        renderProjects();
      });
    });
  }

  function syncMagnifierClone() {
    if (!lensReady) return;
    const source = root.querySelector('[data-project-finder-content]');
    const clone = root.querySelector('[data-project-magnifier-clone]');
    if (!source || !clone) return;

    clone.innerHTML = source.innerHTML;
    clone.querySelectorAll('input, button, a').forEach((element) => {
      element.tabIndex = -1;
      element.setAttribute('aria-hidden', 'true');
      element.style.pointerEvents = 'none';
    });
    const clonedInput = clone.querySelector('[data-project-input]');
    if (clonedInput) clonedInput.value = query;
  }

  function setupMagnifier() {
    const lens = root.querySelector('[data-project-magnifier]');
    const clone = root.querySelector('[data-project-magnifier-clone]');
    const source = root.querySelector('[data-project-finder-content]');
    if (!lens || !clone || !source) return;

    const pointer = window.matchMedia('(pointer: fine)');
    if (!pointer.matches) return;

    lensReady = true;
    syncMagnifierClone();

    const move = (event) => {
      if (event.pointerType === 'touch') return;
      const rootRect = root.getBoundingClientRect();
      const sourceRect = source.getBoundingClientRect();
      const size = lens.offsetWidth || 70;
      const zoom = 1.42;
      const x = event.clientX - rootRect.left;
      const y = event.clientY - rootRect.top;
      const sourceX = event.clientX - sourceRect.left;
      const sourceY = event.clientY - sourceRect.top;

      lens.style.opacity = '1';
      lens.style.transform = `translate3d(${x - size / 2}px, ${y - size / 2}px, 0)`;
      clone.style.width = `${sourceRect.width}px`;
      clone.style.height = `${sourceRect.height}px`;
      clone.style.transform = `translate3d(${size / 2 - sourceX * zoom}px, ${size / 2 - sourceY * zoom}px, 0) scale(${zoom})`;
    };

    root.addEventListener('pointerenter', (event) => {
      syncMagnifierClone();
      move(event);
    });
    root.addEventListener('pointermove', move);
    root.addEventListener('pointerleave', () => { lens.style.opacity = '0'; });
  }

  async function refreshProjects() {
    try {
      const response = await fetch('/api/portfolio', { headers: { Accept: 'application/json' } });
      if (!response.ok) return;
      const payload = await response.json();
      const fetched = Array.isArray(payload.projects)
        ? payload.projects.filter((project) => project && project.published !== false)
        : [];
      if (!fetched.length) return;
      projects = fetched;
      renderProjects();
    } catch {
      // Keep the local selected-work fallback visible.
    }
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
      if (submit) submit.textContent = 'Configure Project & Request Quote';

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

  renderShell();
  refreshProjects();
  addLocationCue();
  alignContactWithAdminPipeline();
})();
