(() => {
  const root = document.querySelector('[data-project-archive]');
  if (!root) return;

  const FALLBACK_PROJECTS = [
    {
      id: 'built-with-seyhan',
      title: 'Built with Seyhan',
      category: 'Fitness · Health · Lifestyle',
      kicker: 'Custom Coaching Website',
      challenge: 'Presenting a personal coaching brand, services and transformation pathway in a focused digital experience.',
      solution: 'A responsive, conversion-oriented website with clear coaching positioning, mobile-first content hierarchy and direct consultation calls to action.',
      result: 'A polished online presence that makes the coaching offer easier to understand and access across devices.',
      liveUrl: 'https://builtwithseyhan.com/tr',
      desktopImage: ''
    },
    {
      id: 'bugun-ne-yiyelim',
      title: 'Bugün Ne Yiyelim?',
      category: 'Food decision app',
      kicker: 'AI-Powered Food Decider',
      challenge: 'Overcoming daily decision fatigue when choosing what to eat.',
      solution: 'AI-driven recommendation engine personalized to user mood.',
      result: 'Instant, stress-free meal decisions tailored to the moment.',
      liveUrl: 'https://www.bugunneyiyelim.com/',
      desktopImage: ''
    },
    {
      id: 'elite-body-protocol',
      title: 'Elite Body Protocol',
      category: 'Gamified fitness app',
      kicker: 'React Web App',
      challenge: 'Designing a seamless cinematic transition between two different interface languages.',
      solution: 'Built with React and Tailwind for dynamic state management and complex CSS animations.',
      result: 'A highly engaging, gamified experience driven by narrative and interaction.',
      liveUrl: 'https://elitebody.omeryigitler.com/',
      desktopImage: 'assets/elite-modern.png?v=V10'
    },
    {
      id: 'reformer-pilates-malta',
      title: 'Reformer Pilates Malta',
      category: 'Wellness studio',
      kicker: 'Custom Website Design',
      challenge: 'Lack of online visibility and mobile booking information for clients.',
      solution: 'Custom responsive design with clear class information and SEO foundations.',
      result: 'Improved brand perception and accessible class information for local clients.',
      liveUrl: 'https://www.reformerpilatesmalta.com/',
      desktopImage: ''
    },
    {
      id: 'today-we-eat',
      title: 'Today We Eat',
      category: 'Food decision app',
      kicker: 'AI-Powered Food Decider',
      challenge: 'Overcoming daily decision fatigue when choosing what to eat.',
      solution: 'AI-driven recommendation engine personalized to the user and the moment.',
      result: 'Instant meal recommendations with a fast, focused interaction flow.',
      liveUrl: 'https://www.todayweeat.com/',
      desktopImage: 'assets/today-we-eat-desktop.png'
    }
  ];

  const allowedFilters = new Set(['all', 'sites', 'apps', 'ai', 'interactive']);
  const params = new URLSearchParams(window.location.search);
  let query = params.get('q') || '';
  let activeFilter = allowedFilters.has(params.get('filter')) ? params.get('filter') : 'all';
  let projects = FALLBACK_PROJECTS.slice();
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
    if (activeFilter !== 'all' && !tagsFor(project).includes(activeFilter)) return false;
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

  function syncUrl() {
    const next = new URLSearchParams();
    if (activeFilter !== 'all') next.set('filter', activeFilter);
    if (query.trim()) next.set('q', query.trim());
    const suffix = next.toString() ? `?${next}` : '';
    window.history.replaceState(null, '', `${window.location.pathname}${suffix}`);
  }

  function renderShell() {
    root.id = 'project-archive';
    root.className = 'project-finder-section projects-page-archive';
    root.setAttribute('aria-label', 'Project archive');
    root.innerHTML = `
      <div class="project-finder-shell" data-project-finder-content>
        <div class="project-finder-head">
          <div class="project-finder-head-copy">
            <span class="prompt">$</span>
            <strong>01 / PROJECT ARCHIVE</strong>
            <span class="project-finder-sep">—</span>
            <span class="project-finder-secondary">ALL PORTFOLIO WORK · DESIGNED + BUILT BY ME</span>
            <span class="project-finder-sep">—</span>
            <span><b data-project-count>${String(projects.length).padStart(2, '0')}</b> PROJECTS</span>
          </div>
          <a class="project-finder-all" href="#portfolio-projects-root">DETAILED CASE STUDIES <span aria-hidden="true">↘</span></a>
        </div>

        <form class="project-finder-search" data-project-search>
          ${searchIcon}
          <input class="project-finder-input" data-project-input type="search" autocomplete="off" spellcheck="false" placeholder="Search all projects..." aria-label="Search all portfolio projects" value="${escapeHtml(query)}">
          <button class="project-finder-open" type="submit">VIEW RESULTS ${arrowIcon}</button>
        </form>

        <div class="project-finder-foot">
          <div class="project-finder-chips" aria-label="Project disciplines">
            <button class="project-finder-chip${activeFilter === 'all' ? ' is-active' : ''}" type="button" data-filter="all">ALL</button>
            <button class="project-finder-chip${activeFilter === 'sites' ? ' is-active' : ''}" type="button" data-filter="sites">SITES</button>
            <button class="project-finder-chip${activeFilter === 'apps' ? ' is-active' : ''}" type="button" data-filter="apps">APPS</button>
            <button class="project-finder-chip${activeFilter === 'ai' ? ' is-active' : ''}" type="button" data-filter="ai">AI</button>
            <button class="project-finder-chip${activeFilter === 'interactive' ? ' is-active' : ''}" type="button" data-filter="interactive">INTERACTIVE</button>
          </div>
          <p class="project-finder-note"><strong>All work by Ömer Yiğitler</strong><br>Design · development · live result</p>
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

    bindControls();
    renderProjects();
    setupMagnifier();
  }

  function projectCard(project, index) {
    const image = project.desktopImage || project.mobileImage || '';
    const liveUrl = project.liveUrl || '#';
    const tags = tagsFor(project);
    const category = project.category || tags[0] || 'Portfolio project';
    const challenge = project.challenge || 'A focused digital problem to solve.';
    const solution = project.solution || project.kicker || 'A custom-designed and developed web experience.';
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
            <span>${escapeHtml((project.kicker || tags.join(' · ') || 'PORTFOLIO PROJECT').toUpperCase())}</span>
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

    grid.innerHTML = visible.length
      ? visible.map(projectCard).join('')
      : '<div class="selected-project-empty">NO MATCHING PROJECTS — TRY ANOTHER SEARCH OR FILTER.</div>';

    syncMagnifierClone();
  }

  function bindControls() {
    const form = root.querySelector('[data-project-search]');
    const input = root.querySelector('[data-project-input]');
    const filters = [...root.querySelectorAll('[data-filter]')];

    if (input) {
      input.addEventListener('input', () => {
        query = input.value || '';
        syncUrl();
        renderProjects();
      });
    }

    if (form) {
      form.addEventListener('submit', (event) => {
        event.preventDefault();
        syncUrl();
        const results = root.querySelector('.selected-project-results-head');
        if (results) results.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }

    filters.forEach((button) => {
      button.addEventListener('click', () => {
        activeFilter = button.dataset.filter || 'all';
        filters.forEach((item) => item.classList.toggle('is-active', item === button));
        syncUrl();
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
    if (!lens || !clone || !source || !window.matchMedia('(pointer: fine)').matches) return;

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
      projects = fetched.sort((a, b) => (Number(a.sortOrder) || 0) - (Number(b.sortOrder) || 0));
      renderProjects();
    } catch {
      // Keep the local portfolio fallback visible.
    }
  }

  renderShell();
  refreshProjects();
})();
