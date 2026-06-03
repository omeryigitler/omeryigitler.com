(() => {
  const INPUT_CLASS = 'w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm text-white focus:outline-none focus:border-taurusGold transition-colors placeholder:text-gray-600';
  const LABEL_CLASS = 'text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-2 block';

  const fields = [
    'public-title', 'public-category', 'public-short', 'public-long', 'public-url',
    'public-desktop-image', 'public-mobile-image', 'public-theme', 'public-order-main', 'public-order-qr'
  ];

  const checks = ['public-enabled', 'public-main', 'public-qr', 'public-home'];
  let currentProjectId = null;

  const $ = (id) => document.getElementById(id);
  const val = (id) => ($(id)?.value || '').trim();
  const checked = (id) => !!$(id)?.checked;

  function waitForReady() {
    return new Promise(resolve => {
      const tick = () => {
        if (document.getElementById('project-modal') && window.db && typeof window.openProjectModal === 'function') resolve();
        else setTimeout(tick, 250);
      };
      tick();
    });
  }

  function field(id, label, placeholder = '', type = 'text') {
    return `<label><span class="${LABEL_CLASS}">${label}</span><input id="${id}" type="${type}" placeholder="${placeholder}" class="${INPUT_CLASS}"></label>`;
  }

  function textarea(id, label, placeholder = '', rows = 4) {
    return `<label><span class="${LABEL_CLASS}">${label}</span><textarea id="${id}" rows="${rows}" placeholder="${placeholder}" class="${INPUT_CLASS} resize-none"></textarea></label>`;
  }

  function checkbox(id, label, sub = '') {
    return `<label class="flex items-start gap-3 p-4 rounded-2xl bg-white/5 border border-white/10 hover:border-taurusGold/30 transition-all cursor-pointer"><input id="${id}" type="checkbox" class="mt-0.5"><span><b class="block text-xs text-white uppercase tracking-widest">${label}</b>${sub ? `<small class="block text-[10px] text-gray-500 mt-1 leading-relaxed">${sub}</small>` : ''}</span></label>`;
  }

  function installTab() {
    if ($('tab-btn-public')) return;
    const nav = document.querySelector('#project-modal .no-scrollbar');
    if (!nav) return;
    nav.insertAdjacentHTML('beforeend', `<button id="tab-btn-public" onclick="switchProjectTab('public')" class="project-tab-btn py-4 text-[10px] font-bold uppercase tracking-widest border-b-2 border-transparent text-gray-500 hover:text-white transition-all whitespace-nowrap">Public Showcase</button>`);

    const host = document.querySelector('#project-modal .custom-scrollbar');
    if (!host) return;
    host.insertAdjacentHTML('beforeend', `
      <div id="tab-public" class="project-tab-content hidden space-y-8 animate-fade-in">
        <div class="rounded-3xl border border-taurusGold/20 bg-taurusGold/5 p-5">
          <h4 class="text-taurusGold text-[10px] font-black uppercase tracking-[0.2em] mb-2">Public Showcase Output</h4>
          <p class="text-xs text-gray-400 leading-relaxed">These fields control where this project appears on the public website. One admin entry can feed the desktop Projects page and the QR mobile gateway.</p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          ${checkbox('public-enabled', 'Published', 'Only published projects are visible on public pages.')}
          ${checkbox('public-main', 'Show on Main Projects', 'Display inside projects.html.')}
          ${checkbox('public-qr', 'Show on QR Gateway', 'Display inside links.html mobile QR page.')}
          ${checkbox('public-home', 'Show on Home Featured', 'Reserved for the homepage featured area.')}
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          ${field('public-title', 'Public Title', 'Bugün Ne Yiyelim?')}
          ${field('public-category', 'Category / Label', 'AI-Powered Food Decider')}
          ${field('public-url', 'Live URL', 'https://example.com', 'url')}
          ${field('public-theme', 'Theme / Accent', 'gold')}
          ${field('public-order-main', 'Main Projects Order', '1', 'number')}
          ${field('public-order-qr', 'QR Gateway Order', '1', 'number')}
        </div>

        ${textarea('public-short', 'Short Description', 'Short card text for QR and compact cards.', 3)}
        ${textarea('public-long', 'Long Description', 'Longer case-study description for projects.html.', 5)}

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          ${field('public-desktop-image', 'Desktop Preview Image URL', 'assets/project-desktop.png')}
          ${field('public-mobile-image', 'Mobile Preview Image URL', 'assets/project-mobile.png')}
        </div>

        <div class="flex flex-col md:flex-row gap-3 justify-end pt-4 border-t border-white/5">
          <button onclick="window.PublicShowcaseAdmin?.seedDefaults()" class="px-5 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-[10px] font-black uppercase tracking-widest hover:bg-white hover:text-black transition-all">Load Default Projects</button>
          <button onclick="window.PublicShowcaseAdmin?.save()" class="px-6 py-3 rounded-xl bg-taurusGold text-black text-[10px] font-black uppercase tracking-widest hover:bg-white transition-all">Save Public Showcase</button>
        </div>
      </div>
    `);
  }

  function buildShowcase() {
    return {
      enabled: checked('public-enabled'),
      status: checked('public-enabled') ? 'published' : 'draft',
      title: val('public-title'),
      category: val('public-category'),
      shortDescription: val('public-short'),
      longDescription: val('public-long'),
      liveUrl: val('public-url'),
      desktopImage: val('public-desktop-image'),
      mobileImage: val('public-mobile-image'),
      theme: val('public-theme') || 'gold',
      placement: {
        mainProjects: checked('public-main'),
        qrLinks: checked('public-qr'),
        homeFeatured: checked('public-home')
      },
      order: {
        mainProjects: Number(val('public-order-main') || 999),
        qrLinks: Number(val('public-order-qr') || 999)
      }
    };
  }

  function fill(data = {}) {
    const s = data.publicShowcase || {};
    if ($('public-title')) $('public-title').value = s.title || data.projectName || data.name || '';
    if ($('public-category')) $('public-category').value = s.category || data.siteType || '';
    if ($('public-short')) $('public-short').value = s.shortDescription || '';
    if ($('public-long')) $('public-long').value = s.longDescription || s.shortDescription || '';
    if ($('public-url')) $('public-url').value = s.liveUrl || data.liveUrl || '';
    if ($('public-desktop-image')) $('public-desktop-image').value = s.desktopImage || s.imageUrl || '';
    if ($('public-mobile-image')) $('public-mobile-image').value = s.mobileImage || s.desktopImage || '';
    if ($('public-theme')) $('public-theme').value = s.theme || 'gold';
    if ($('public-order-main')) $('public-order-main').value = s.order?.mainProjects || s.mainOrder || 999;
    if ($('public-order-qr')) $('public-order-qr').value = s.order?.qrLinks || s.qrOrder || 999;
    if ($('public-enabled')) $('public-enabled').checked = !!s.enabled || s.status === 'published';
    if ($('public-main')) $('public-main').checked = !!(s.placement?.mainProjects || s.showOnMainProjects);
    if ($('public-qr')) $('public-qr').checked = !!(s.placement?.qrLinks || s.showOnQr);
    if ($('public-home')) $('public-home').checked = !!(s.placement?.homeFeatured || s.showOnHome);
  }

  async function loadForProject(id) {
    currentProjectId = id || null;
    fields.forEach(id => { if ($(id)) $(id).value = ''; });
    checks.forEach(id => { if ($(id)) $(id).checked = false; });
    if (!id || !window.db) return;
    try {
      const doc = await window.db.collection('projects').doc(id).get();
      if (doc.exists) fill(doc.data());
    } catch (e) {
      console.warn('Public showcase load failed:', e.message);
    }
  }

  async function save() {
    if (!currentProjectId) {
      systemAlert('SAVE PROJECT FIRST', 'Create or save the project once before publishing it to the public showcase.', 'info');
      return;
    }
    try {
      await window.db.collection('projects').doc(currentProjectId).update({
        publicShowcase: buildShowcase(),
        lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
      });
      systemAlert('PUBLIC SHOWCASE SAVED', 'This project can now feed projects.html and the QR Gateway according to its visibility settings.', 'check-circle');
    } catch (e) {
      systemAlert('SAVE FAILED', e.message, 'x-circle');
    }
  }

  const defaults = [
    ['Bugün Ne Yiyelim?', 'AI-Powered Food Decider', 'https://www.bugunneyiyelim.com/', 'assets/bugun-desktop.png', 1],
    ['Today We Eat', 'AI-Powered Food Decider', 'https://www.todayweeat.com/', 'assets/today-we-eat-desktop.png', 2],
    ['mybabyshire', 'E-commerce Experience', 'https://www.mybabyshire.com/', '', 3],
    ['DAWL Studio', 'Premium Brand Concept', 'https://www.dawlstudio.com/', '', 4],
    ['Mustafa Seyhan', 'Personal Brand / Business', 'https://www.mustafaseyhan.com/', '', 5],
    ['Reformer Pilates Malta', 'Wellness / Local Business', 'https://www.reformerpilatesmalta.com/', 'assets/pilates-desktop.png', 6],
    ['Elite Body Protocol', 'Gamified Fitness Experience', 'https://elitebody.omeryigitler.com/', 'assets/elite-modern.png?v=V10', 7]
  ];

  async function seedDefaults() {
    const ok = await systemConfirm('LOAD DEFAULT PROJECTS', 'This creates or updates public showcase entries for the current known portfolio projects.', 'database');
    if (!ok || !window.db) return;
    try {
      for (const item of defaults) {
        const [title, category, liveUrl, image, order] = item;
        const qs = await window.db.collection('projects').where('publicShowcase.title', '==', title).limit(1).get();
        const payload = {
          projectName: title,
          name: title,
          status: 'active',
          publicShowcase: {
            enabled: true,
            status: 'published',
            title,
            category,
            shortDescription: title + ' public showcase entry.',
            longDescription: title + ' project generated from the admin public showcase defaults.',
            liveUrl,
            desktopImage: image,
            mobileImage: image,
            theme: 'gold',
            placement: { mainProjects: true, qrLinks: true, homeFeatured: false },
            order: { mainProjects: order, qrLinks: order }
          },
          lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
        };
        if (qs.empty) await window.db.collection('projects').add({ ...payload, clientName: 'Portfolio', clientEmail: 'portfolio@omeryigitler.com', createdAt: firebase.firestore.FieldValue.serverTimestamp() });
        else await window.db.collection('projects').doc(qs.docs[0].id).update(payload);
      }
      systemAlert('DEFAULTS LOADED', 'Public showcase defaults were saved. You can edit each project from the Projects tab.', 'check-circle');
    } catch (e) {
      systemAlert('LOAD FAILED', e.message, 'x-circle');
    }
  }

  async function init() {
    await waitForReady();
    installTab();
    const originalOpen = window.openProjectModal;
    window.openProjectModal = async function(id = null, providedDocs = null) {
      await originalOpen.apply(this, arguments);
      installTab();
      setTimeout(() => loadForProject(id), 80);
    };
    window.PublicShowcaseAdmin = { save, seedDefaults, fill, loadForProject };
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
