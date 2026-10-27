(() => {
  const root = document.querySelector('[data-project-archive]');
  if (!root) return;
  const data = window.OMER_ARCHIVE_DATA || { filters: [], projects: [], count: 0 };
  const projects = data.projects || [];
  const filters = data.filters || [];
  const params = new URLSearchParams(window.location.search);
  const allowed = new Set(filters.map((item) => item.value));
  let query = params.get('q') || '';
  let filter = allowed.has(params.get('filter')) ? params.get('filter') : 'all';

  const searchIcon = `<svg class="archive-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="6.8"></circle><path d="m16.2 16.2 4.1 4.1"></path></svg>`;
  const leftIcon = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 12H5"></path><path d="m11 6-6 6 6 6"></path></svg>`;
  const upIcon = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 17 17 7"></path><path d="M7 7h10v10"></path></svg>`;
  const closeIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"></path></svg>`;

  function esc(v=''){return String(v).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;')}
  function displayUrl(url=''){return String(url).replace(/^https?:\/\//,'').replace(/^www\./,'').replace(/\/$/,'')}
  function previewName(repo=''){return repo.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'')}
  function previewUrl(repo=''){return `https://raw.githubusercontent.com/omeryigitler/Portfolio/main/public/project-previews/${previewName(repo)}.png`}
  function githubFallback(repo=''){return `https://github.com/omeryigitler/${repo}`}
  function syncUrl(){const p=new URLSearchParams();if(filter!=='all')p.set('filter',filter);if(query.trim())p.set('q',query.trim());history.replaceState(null,'',`${location.pathname}${p.toString()?`?${p}`:''}`)}
  function getResults(){const q=query.trim().toLowerCase();return projects.filter((p)=>(filter==='all'||p.category===filter)&&(!q||p.title.toLowerCase().includes(q)||p.repo.toLowerCase().includes(q)||p.category.toLowerCase().includes(q)||p.kind.toLowerCase().includes(q)||(p.stack||[]).some((s)=>s.toLowerCase().includes(q))))}

  function card(project,index){
    const repositoryUrl=project.githubUrl||githubFallback(project.repo);const targetUrl=project.siteUrl||repositoryUrl;const live=Boolean(project.siteUrl);const label=live?(project.siteLabel||displayUrl(project.siteUrl)):`github / omeryigitler / ${project.repo}`;const purl=project.previewUrl === null ? null : (project.previewUrl || previewUrl(project.repo));
    return `<a class="archive-card${live?' has-live':' no-live'}" data-repo="${esc(project.repo)}" href="${esc(targetUrl)}" target="_blank" rel="noreferrer">
      ${live&&purl?`<div class="archive-card-preview" aria-hidden="true"><img data-preview-img loading="lazy" decoding="async" src="${esc(purl)}" alt=""></div><div class="archive-card-cover" aria-hidden="true"></div>`:''}
      <div class="archive-card-content">
        <div class="archive-card-top"><span>${String(index+1).padStart(2,'0')}</span><span>${esc(project.category)}</span></div>
        <div class="archive-card-main"><h2 class="archive-card-title">${esc(project.title)}</h2><p class="archive-card-url">${esc(label)}</p>
          ${live&&purl?`<div class="archive-card-mobile-preview"><span class="preview-placeholder" aria-hidden="true">Project preview</span><img data-mobile-preview src="${esc(purl)}" alt="" loading="lazy" decoding="async"></div>`:''}
          <div class="archive-card-meta"><div class="archive-card-meta-row"><span>PROJECT</span><span>${esc(project.kind)}</span></div><div class="archive-card-meta-row"><span>STACK</span><span>${esc((project.stack||[]).join(' · '))}</span></div></div>
        </div>
        <div class="archive-card-bottom"><span>${live?'LIVE PROJECT':'REPOSITORY'}</span><span>${live?'LIVE SITE':'GITHUB'} ${upIcon}</span></div>
      </div>
    </a>`;
  }

  function render(){
    const results=getResults();const grid=root.querySelector('[data-archive-grid]');const count=root.querySelector('[data-result-count]');if(count)count.textContent=`${String(results.length).padStart(2,'0')} RESULTS`;if(!grid)return;
    grid.innerHTML=results.length?results.map(card).join(''):'<div class="archive-empty"><p>No matching projects.</p><button type="button" class="project-finder-chip" data-reset-search>Clear search and filters</button></div>';
    grid.querySelectorAll('.archive-card.has-live').forEach((cardEl)=>{
      const img=cardEl.querySelector('[data-preview-img]');const mobile=cardEl.querySelector('[data-mobile-preview]');
      const mark=()=>{cardEl.classList.remove('preview-failed');cardEl.classList.add('preview-loaded')};const fail=()=>{if ([img,mobile].some(image=>image&&image.naturalWidth)) return;cardEl.classList.remove('preview-loaded');cardEl.classList.add('preview-failed')};
      if(img){if(img.complete){if(img.naturalWidth)mark();else fail();}img.addEventListener('load',mark,{once:true});img.addEventListener('error',fail,{once:true})}
      if(mobile){if(mobile.complete){if(mobile.naturalWidth)mark();else fail();}mobile.addEventListener('load',mark,{once:true});mobile.addEventListener('error',fail,{once:true})}
    });
    grid.querySelector('[data-reset-search]')?.addEventListener('click', () => {
      query=''; filter='all'; input.value=''; clear.style.display='none';
      root.querySelectorAll('[data-filter]').forEach(button => {
        const active=button.dataset.filter==='all'; button.classList.toggle('is-active',active); button.setAttribute('aria-pressed',active);
      });
      syncUrl(); render(); input.focus();
    });
    setupMobilePreview();
  }

  let previewObserver;
  const mobileMedia = matchMedia('(max-width:767px)');
  function setupMobilePreview(){
    previewObserver?.disconnect();
    const cards = [...root.querySelectorAll('.archive-card.has-live')];
    cards.forEach(card => card.classList.remove('mobile-preview-active'));
    if (!mobileMedia.matches) return;
    if (!('IntersectionObserver' in window)) { cards.forEach(card => card.classList.add('mobile-preview-active')); return; }
    const visible = new Set();
    previewObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => entry.isIntersecting ? visible.add(entry.target) : visible.delete(entry.target));
      const nearest = [...visible].sort((a,b) => {
        const distance = card => { const rect = card.getBoundingClientRect(); return Math.abs(rect.top + rect.height / 2 - innerHeight / 2); };
        return distance(a) - distance(b);
      })[0];
      cards.forEach(card => card.classList.toggle('mobile-preview-active', card === nearest));
    }, {rootMargin:'-28% 0px -28% 0px', threshold:.01});
    cards.forEach(card => previewObserver.observe(card));
  }
  mobileMedia.addEventListener('change', setupMobilePreview);

  root.className='projects-page-archive';
  root.innerHTML=`<div class="archive-shell">
    <header class="archive-header"><div class="archive-header-left archive-status" aria-label="Project archive status"><span class="archive-prompt">$</span><span class="archive-status-key">project archive</span><span class="archive-status-arrow">→</span><strong>${String(projects.length).padStart(2,'0')} projects indexed</strong><span class="archive-status-cursor" aria-hidden="true"></span></div><a class="archive-back" href="/">${leftIcon} BACK HOME</a></header>
    <div class="archive-intro"><p class="archive-eyebrow">EVERYTHING I’VE BUILT / SHIPPED / TESTED</p><h1 class="archive-title"><span class="line-soft">All projects.</span><span class="line-soft">Experiments</span><span class="line-soft">&amp; tools<span class="accent">.</span></span></h1></div>
    <div class="archive-controls"><div class="archive-search">${searchIcon}<input type="search" autocomplete="off" spellcheck="false" class="archive-search-input" data-archive-input value="${esc(query)}" placeholder="Search all projects..." aria-label="Search project archive"><div class="archive-search-right"><span data-result-count role="status" aria-live="polite" aria-atomic="true">${String(projects.length).padStart(2,'0')} RESULTS</span><button class="archive-clear" data-clear type="button" aria-label="Clear search" style="display:${query?'grid':'none'}">${closeIcon}</button></div></div><div class="archive-filter-row">${filters.map(item=>`<button class="project-finder-chip${item.value===filter?' is-active':''}" type="button" aria-pressed="${item.value===filter}" data-filter="${item.value}">${item.label}</button>`).join('')}</div></div>
    <div class="archive-grid" data-archive-grid></div>
  </div>`;

  const input=root.querySelector('[data-archive-input]');const clear=root.querySelector('[data-clear]');
  input?.addEventListener('input',()=>{query=input.value||'';if(clear)clear.style.display=query?'grid':'none';syncUrl();render()});
  clear?.addEventListener('click',()=>{query='';input.value='';clear.style.display='none';syncUrl();render();input.focus()});
  root.querySelectorAll('[data-filter]').forEach((button)=>button.addEventListener('click',()=>{filter=button.dataset.filter||'all';root.querySelectorAll('[data-filter]').forEach(b=>{b.classList.toggle('is-active',b===button);b.setAttribute('aria-pressed',b===button)});syncUrl();render()}));
  render();
})();

