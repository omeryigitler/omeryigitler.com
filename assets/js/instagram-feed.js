(() => {
  const PROJECTS_URL = 'projects.html';
  const FALLBACK_PROJECT_COUNT = 4;
  const root = document.querySelector('[data-instagram-feed]');

  const searchIcon = `
    <svg class="project-finder-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true">
      <circle cx="11" cy="11" r="6.8"></circle>
      <path d="m16.2 16.2 4.1 4.1"></path>
    </svg>`;

  const arrowIcon = `
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M5 12h14"></path><path d="m13 6 6 6-6 6"></path>
    </svg>`;

  function renderProjectFinder(count) {
    if (!root) return;
    const safeCount = Number.isFinite(Number(count)) && Number(count) > 0 ? Number(count) : FALLBACK_PROJECT_COUNT;
    const countLabel = String(safeCount).padStart(2, '0');

    root.id = 'selected-work';
    root.className = 'instagram-feed-section project-finder-section';
    root.removeAttribute('data-instagram-feed');
    root.removeAttribute('data-limit');
    root.setAttribute('aria-label', 'Selected work');

    root.innerHTML = `
      <div class="project-finder-shell">
        <div class="project-finder-head">
          <div class="project-finder-head-copy">
            <span class="prompt">$</span>
            <strong>02 / SELECTED WORK</strong>
            <span class="project-finder-sep">—</span>
            <span class="project-finder-secondary">THINGS I’VE DESIGNED AND BUILT</span>
            <span class="project-finder-sep">—</span>
            <span><b data-project-count>${countLabel}</b> PROJECTS</span>
          </div>
          <a class="project-finder-all" href="${PROJECTS_URL}">EXPLORE ALL <span aria-hidden="true">↗</span></a>
        </div>

        <a class="project-finder-launch" href="${PROJECTS_URL}" aria-label="Browse selected projects">
          ${searchIcon}
          <span class="project-finder-label">Search selected projects...</span>
          <span class="project-finder-open">OPEN ARCHIVE ${arrowIcon}</span>
        </a>

        <div class="project-finder-foot">
          <div class="project-finder-chips" aria-label="Project disciplines">
            <span class="project-finder-chip is-active">ALL</span>
            <span class="project-finder-chip">SITES</span>
            <span class="project-finder-chip">APPS</span>
            <span class="project-finder-chip">AI</span>
            <span class="project-finder-chip">INTERACTIVE</span>
          </div>
          <p class="project-finder-note"><strong>Selected case studies</strong><br>Challenge · solution · live result</p>
        </div>
      </div>`;
  }

  async function refreshProjectCount() {
    if (!root) return;
    try {
      const response = await fetch('/api/portfolio', { headers: { Accept: 'application/json' } });
      if (!response.ok) return;
      const payload = await response.json();
      const projects = Array.isArray(payload.projects) ? payload.projects.filter((project) => project && project.published !== false) : [];
      if (!projects.length) return;
      const countNode = root.querySelector('[data-project-count]');
      if (countNode) countNode.textContent = String(projects.length).padStart(2, '0');
    } catch {
      // The launcher remains useful with the local fallback count.
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

    /* Keep the current Firestore messages -> admin inbox -> project/quote pipeline
       intact. The public brand promises custom work, so select CUSTOM through the
       configurator's own click handler and remove TEMPLATE from the visible UI.
       The backend schema still accepts historical TEMPLATE records. */
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

  /* Render immediately so the old Instagram feed never becomes part of the
     visible homepage. Then reconcile the count with the existing portfolio API. */
  if (root) {
    renderProjectFinder(FALLBACK_PROJECT_COUNT);
    refreshProjectCount();
  }

  addLocationCue();
  alignContactWithAdminPipeline();
})();
