(() => {
  if (!/admin\.html$/i.test(window.location.pathname)) return;

  const state = { mounted: false, editingId: null, projects: [], capturing: new Set(), reordering: false, dirty: false, filter: "all", query: "", scope: "all", dragging: null };
  const $ = (id) => document.getElementById(id);
  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char]));
  const slugify = (value) => String(value || "project").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || `project-${Date.now()}`;

  async function authHeaders() {
    const user = window.firebase?.auth?.().currentUser;
    if (!user) throw new Error("Firebase admin session is not ready.");
    return { Accept: "application/json", "Content-Type": "application/json", Authorization: `Bearer ${await user.getIdToken()}` };
  }

  async function request(body = null) {
    const response = await fetch("/api/portfolio?includeHidden=1", {
      method: body ? "POST" : "GET",
      headers: await authHeaders(),
      body: body ? JSON.stringify(body) : undefined
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload.ok === false) throw new Error(payload.error || `Portfolio API returned ${response.status}`);
    return payload;
  }

  async function requestCapture(id, url) {
    const response = await fetch("/api/portfolio-capture", {
      method: "POST",
      headers: await authHeaders(),
      body: JSON.stringify({ id, url })
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload.ok === false) throw new Error(payload.error || `Capture API returned ${response.status}`);
    return payload;
  }

  function alertUser(title, message, icon = "check-circle") {
    return typeof window.systemAlert === "function" ? window.systemAlert(title, message, icon) : Promise.resolve(window.alert(message));
  }

  function installStyles() {
    if ($("portfolio-admin-styles")) return;
    const style = document.createElement("style");
    style.id = "portfolio-admin-styles";
    style.textContent = `
      .pf-card{padding:24px;border:1px solid rgba(255,255,255,.09);border-radius:24px;background:rgba(255,255,255,.035);backdrop-filter:blur(20px)}
      .pf-head{display:flex;justify-content:space-between;gap:16px;margin-bottom:20px}.pf-head h3{margin:0;color:#fff;font:700 17px Syncopate,sans-serif;text-transform:uppercase}.pf-head p{margin:8px 0 0;color:#737373;font:700 10px "JetBrains Mono",monospace;letter-spacing:.12em;text-transform:uppercase;line-height:1.6}.pf-badge{height:max-content;padding:8px 11px;border:1px solid rgba(255,215,0,.3);border-radius:999px;color:#FFD700;background:rgba(255,215,0,.07);font:800 9px "JetBrains Mono",monospace;letter-spacing:.12em;text-transform:uppercase}
      .pf-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.pf-field{display:flex;flex-direction:column;gap:7px}.pf-field.wide{grid-column:1/-1}.pf-field>label{color:#777;font:800 9px "JetBrains Mono",monospace;letter-spacing:.12em;text-transform:uppercase}.pf-field input,.pf-field textarea,.pf-field select{width:100%;padding:11px 12px;border:1px solid rgba(255,255,255,.11);border-radius:12px;outline:0;background:rgba(0,0,0,.42);color:#fff;font:500 12px Manrope,sans-serif}.pf-field textarea{min-height:80px;resize:vertical;line-height:1.55}.pf-field input:focus,.pf-field textarea:focus,.pf-field select:focus{border-color:rgba(255,215,0,.65);box-shadow:0 0 0 3px rgba(255,215,0,.06)}.pf-help{color:#666;font:600 10px Manrope,sans-serif;line-height:1.45}.pf-toggle{display:flex!important;align-items:center;gap:10px;min-height:43px;color:#d2d2d2!important;font-size:11px!important}.pf-toggle input{width:16px!important;height:16px;flex:none}.pf-btn:focus-visible,.pf-icon:focus-visible{outline:2px solid #FFD700;outline-offset:3px}.pf-actions{display:flex;flex-wrap:wrap;gap:10px;margin-top:16px}.pf-btn{padding:11px 14px;border:1px solid rgba(255,255,255,.13);border-radius:11px;background:rgba(255,255,255,.05);color:#ddd;cursor:pointer;font:800 9px "JetBrains Mono",monospace;letter-spacing:.12em;text-transform:uppercase}.pf-btn:hover{border-color:rgba(255,215,0,.45);color:#FFD700}.pf-btn.primary{border-color:#FFD700;background:#FFD700;color:#080808}.pf-btn.primary:hover{border-color:#fff;background:#fff;color:#050505}.pf-btn.capture{border-color:rgba(34,197,94,.35);color:#86efac;background:rgba(34,197,94,.07)}.pf-btn:disabled{opacity:.5;cursor:wait}
      .pf-order-head{display:flex;justify-content:space-between;gap:16px;align-items:flex-end;margin-top:26px;padding-top:20px;border-top:1px solid rgba(255,255,255,.08)}.pf-order-head strong{display:block;color:#fff;font:800 11px "JetBrains Mono",monospace;letter-spacing:.12em;text-transform:uppercase}.pf-order-head span{display:block;margin-top:5px;color:#686868;font:600 10px Manrope,sans-serif;line-height:1.45}
      .pf-list{display:grid;gap:10px;margin-top:12px}.pf-row{display:grid;grid-template-columns:32px 74px minmax(0,1fr) auto;align-items:center;gap:12px;padding:10px;border:1px solid rgba(255,255,255,.08);border-radius:14px;background:rgba(255,255,255,.025)}.pf-position{width:28px;height:28px;display:grid;place-items:center;border:1px solid rgba(255,215,0,.18);border-radius:999px;color:#FFD700;background:rgba(255,215,0,.05);font:800 9px "JetBrains Mono",monospace}.pf-thumb{width:74px;height:48px;border:1px solid rgba(255,255,255,.1);border-radius:8px;background:#0b0b0b;object-fit:cover;object-position:top}.pf-title{color:#fff;font:700 12px Manrope,sans-serif}.pf-meta{margin-top:4px;color:#777;font:700 9px "JetBrains Mono",monospace;letter-spacing:.08em;text-transform:uppercase;line-height:1.5}.pf-status{color:#22c55e}.pf-status.draft{color:#888}.pf-row-actions{display:flex;flex-wrap:wrap;gap:7px;align-items:center}.pf-order-actions{display:flex;gap:5px;padding-right:3px;margin-right:3px;border-right:1px solid rgba(255,255,255,.08)}.pf-icon{width:34px;height:34px;border:1px solid rgba(255,255,255,.1);border-radius:9px;background:rgba(255,255,255,.04);color:#ccc;cursor:pointer}.pf-icon:hover{border-color:rgba(255,215,0,.4);color:#FFD700}.pf-icon.order{font-size:15px;color:#FFD700}.pf-icon.capture{color:#86efac}.pf-icon.delete:hover{border-color:rgba(248,113,113,.4);color:#f87171}.pf-icon:disabled{opacity:.3;cursor:not-allowed}.pf-empty{padding:22px;border:1px dashed rgba(255,255,255,.12);border-radius:14px;color:#777;text-align:center;font:700 10px "JetBrains Mono",monospace;letter-spacing:.1em;text-transform:uppercase}
      @media(max-width:820px){.pf-grid{grid-template-columns:1fr}.pf-field.wide{grid-column:auto}.pf-head,.pf-order-head{flex-direction:column;align-items:flex-start}.pf-row{grid-template-columns:28px 58px minmax(0,1fr)}.pf-thumb{width:58px}.pf-row-actions{grid-column:1/-1;justify-content:flex-end}}
    `;
    document.head.appendChild(style);
  }

  function markup() {
    return `<section class="pf-card" id="portfolio-admin-card">
      <div class="pf-head"><div><h3>Proje Kontrol Paneli</h3><p>GitHub projelerini taslak olarak al. Yayınlanacak işleri, ana sayfa seçimini ve sıralamayı sen belirle.</p></div><span class="pf-badge">Yayın kontrolü</span></div>
      <div class="pf-actions"><button class="pf-btn primary" id="pf-sync" type="button">GitHub’dan getir / yenile</button><a class="pf-btn" href="/projects.html" target="_blank" rel="noopener">Yayındaki projeleri aç ↗</a></div>
      <p class="pf-help" id="pf-sync-state" role="status">Yeni repolar taslak gelir. Düzenlediğin içerik ve sıralama korunur.</p>
      <details id="pf-editor"><summary class="pf-btn">Proje ekle / düzenle</summary>
      <form id="portfolio-admin-form">
        <div class="pf-grid">
          <div class="pf-field"><label for="pf-title">Proje adı</label><input id="pf-title" required></div>
          <div class="pf-field"><label for="pf-archive-category">Arşiv filtresi</label><select id="pf-archive-category"><option value="other">Diğer</option><option value="sites">Sites</option><option value="commerce">Commerce</option><option value="apps">Apps</option><option value="tools">Tools</option><option value="experiments">Experiments</option></select></div>
          <div class="pf-field"><label for="pf-category">Kategori</label><input id="pf-category" required></div>
          <div class="pf-field"><label for="pf-kicker">Hizmet / teknoloji</label><input id="pf-kicker"></div>
          <div class="pf-field"><label for="pf-url">Canlı site adresi</label><input id="pf-url" type="url" placeholder="https://"></div>
          <div class="pf-field"><label for="pf-github">GitHub bağlantısı</label><input id="pf-github" type="url" placeholder="https://github.com/omeryigitler/..."></div>
          <div class="pf-field"><label for="pf-stack">Teknolojiler (virgülle ayır)</label><input id="pf-stack"></div>
          <div class="pf-field wide"><label for="pf-description">Kısa açıklama</label><textarea id="pf-description"></textarea></div>
          <div class="pf-field wide"><label for="pf-challenge">Problem</label><textarea id="pf-challenge"></textarea></div>
          <div class="pf-field wide"><label for="pf-solution">Çözüm</label><textarea id="pf-solution"></textarea></div>
          <div class="pf-field wide"><label for="pf-result">Sonuç</label><textarea id="pf-result"></textarea></div>
          <div class="pf-field wide"><label for="pf-desktop">Kapak görseli adresi</label><input id="pf-desktop" placeholder="Önizleme yakalandığında otomatik doldurulur"><span class="pf-help">İsteğe bağlı. Canlı site adresinden önizleme alabilirsin.</span></div>
          <div class="pf-field wide"><label for="pf-mobile">Mobil görsel adresi</label><input id="pf-mobile" placeholder="Önizleme yakalandığında otomatik doldurulur"><span class="pf-help">İsteğe bağlı mobil önizleme.</span></div>
          <div class="pf-field wide"><label for="pf-alt">Alternatif masaüstü görseli</label><input id="pf-alt" placeholder="assets/project-alternate.png"></div>
          <div class="pf-field"><label for="pf-label-a">İlk görünüm etiketi</label><input id="pf-label-a" value="Primary"></div>
          <div class="pf-field"><label for="pf-label-b">Alternatif görünüm etiketi</label><input id="pf-label-b" value="Alternate"></div>
          <div class="pf-field"><label for="pf-display">Sunum</label><select id="pf-display"><option value="desktop-mobile">Masaüstü + mobil</option><option value="desktop-swap">İki masaüstü görünümü</option></select></div>
          <div class="pf-field"><label for="pf-accent">Vurgu rengi</label><input id="pf-accent" type="color" value="#FFD700"></div>
          <div class="pf-field"><label for="pf-order">Sıra değeri</label><input id="pf-order" type="number" step="1" value="50"><span class="pf-help">Sıralama için aşağıdaki listeyi kullanabilirsin.</span></div>
          <div class="pf-field"><label for="pf-lang">Başlık dili</label><input id="pf-lang" placeholder="tr / en"></div>
          <div class="pf-field wide"><label>Görseller</label><label class="pf-toggle"><input id="pf-auto-capture" type="checkbox" checked> Kaydederken canlı siteden önizleme al</label></div>
          <div class="pf-field wide"><label>Yayın ayarları</label><label class="pf-toggle"><input id="pf-published" type="checkbox"> Projeler sayfasında yayınla</label><label class="pf-toggle"><input id="pf-featured" type="checkbox"> Ana sayfada öne çıkar (yalnızca yayındayken görünür)</label></div>
        </div>
        <div class="pf-actions"><button class="pf-btn primary" id="pf-save" type="submit">Projeyi kaydet</button><button class="pf-btn capture" id="pf-capture" type="button">Önizlemeyi yenile</button><button class="pf-btn" id="pf-reset" type="button">Yeni proje</button><button class="pf-btn" id="pf-refresh-all" type="button">Tüm görselleri yenile</button></div>
      </form></details>
      <div class="pf-grid" style="margin-top:24px">
        <div class="pf-field"><label for="pf-search">Proje ara</label><input id="pf-search" type="search" placeholder="İsim, repo veya kategori"></div>
        <div class="pf-field"><label for="pf-filter">Görünüm</label><select id="pf-filter"><option value="all">Tümü</option><option value="draft">Taslak</option><option value="published">Yayında</option><option value="featured">Öne çıkanlar</option></select></div>
        <div class="pf-field"><label for="pf-scope">Düzenlenecek sıralama</label><select id="pf-scope"><option value="all">Projeler sayfası</option><option value="featured">Ana sayfa vitrini</option></select></div>
      </div>
      <div class="pf-actions"><button class="pf-btn primary" id="pf-save-order" type="button" disabled>Sıralamayı kaydet</button><button class="pf-btn" id="pf-discard-order" type="button" disabled>Değişikliği geri al</button></div>
      <div class="pf-order-head"><div><strong>Proje sıralaması</strong><span>Sürükle veya okları kullan; ardından sıralamayı kaydet. Sıralama için aramayı ve durum filtresini temizle.</span></div><span id="pf-order-state">Ready</span></div>
      <div class="pf-list" id="pf-list"><div class="pf-empty">Loading portfolio records…</div></div>
    </section>`;
  }

  function reset() {
    state.editingId = null;
    $("portfolio-admin-form")?.reset();
    $("pf-accent").value = "#FFD700";
    $("pf-order").value = String((state.projects.length + 1) * 10);
    $("pf-label-a").value = "Primary";
    $("pf-label-b").value = "Alternate";
    $("pf-published").checked = false;
    $("pf-featured").checked = false;
    $("pf-auto-capture").checked = true;
    $("pf-save").textContent = "Projeyi kaydet";
  }

  function readForm() {
    const title = $("pf-title").value.trim();
    return {
      slug: slugify(title), title,
      archiveCategory: $("pf-archive-category").value, category: $("pf-category").value.trim(), kicker: $("pf-kicker").value.trim(),
      challenge: $("pf-challenge").value.trim(), solution: $("pf-solution").value.trim(), result: $("pf-result").value.trim(),
      githubUrl: $("pf-github").value.trim(), description: $("pf-description").value.trim(), stack: $("pf-stack").value.split(",").map((value) => value.trim()).filter(Boolean), featured: $("pf-featured").checked,
      liveUrl: $("pf-url").value.trim(), desktopImage: $("pf-desktop").value.trim(), mobileImage: $("pf-mobile").value.trim(),
      alternateDesktopImage: $("pf-alt").value.trim(), alternateLabelA: $("pf-label-a").value.trim() || "Primary", alternateLabelB: $("pf-label-b").value.trim() || "Alternate",
      displayType: $("pf-display").value, accent: $("pf-accent").value || "#FFD700", sortOrder: Number($("pf-order").value || 999),
      lang: $("pf-lang").value.trim(), published: $("pf-published").checked
    };
  }

  function render(projects) {
    state.projects = projects;
    const list = $("pf-list");
    if (!projects.length) {
      $("pf-save-order").disabled = true;
      $("pf-discard-order").disabled = true;
      list.innerHTML = '<div class="pf-empty">Henüz proje yok. GitHub’dan getir veya yeni proje ekle.</div>';
      return;
    }
    const ordered = visibleProjects();
    const canOrder = !state.query && state.filter === "all" && !state.reordering && state.capturing.size === 0;
    $("pf-save-order").disabled = !state.dirty || state.reordering;
    $("pf-discard-order").disabled = !state.dirty || state.reordering;
    $("pf-scope").disabled = state.dirty || state.reordering;
    list.innerHTML = ordered.map((project, index) => {
      const busy = state.capturing.has(project.id);
        return `<article class="pf-row" data-project-id="${esc(project.id)}" draggable="${canOrder}">
        <div class="pf-position">${index + 1}</div>
        <img class="pf-thumb" src="${esc(project.desktopImage || "assets/preview.png")}" alt="">
        <div><div class="pf-title">${esc(project.title || "Untitled")}</div><div class="pf-meta"><span class="pf-status${project.published === false ? " draft" : ""}">${project.published === false ? "Taslak" : "Yayında"}</span> · ${esc(project.category)} ${project.featured ? " · ★ Vitrin" : ""}${project.githubArchived ? " · Arşiv" : ""}${project.githubFork ? " · Fork" : ""}</div></div>
        <div class="pf-row-actions">
          <div class="pf-order-actions">
            <button class="pf-icon order" type="button" data-move-up="${esc(project.id)}" title="Yukarı taşı" ${index === 0 || !canOrder ? "disabled" : ""}>↑</button>
            <button class="pf-icon order" type="button" data-move-down="${esc(project.id)}" title="Aşağı taşı" ${index === ordered.length - 1 || !canOrder ? "disabled" : ""}>↓</button>
          </div>
          <button class="pf-btn" type="button" data-publish="${esc(project.id)}" ${state.dirty || state.reordering ? "disabled" : ""}>${project.published ? "Yayından kaldır" : "Yayınla"}</button>
          <button class="pf-icon" type="button" data-feature="${esc(project.id)}" aria-label="Ana sayfada öne çıkar: ${esc(project.title)}" aria-pressed="${project.featured === true}" ${state.dirty || state.reordering ? "disabled" : ""}>${project.featured ? "★" : "☆"}</button>
          <button class="pf-icon" type="button" data-preview="${esc(project.id)}" title="Önizle">◉</button>
          <button class="pf-icon capture" type="button" data-capture="${esc(project.id)}" title="Capture first desktop and mobile viewport" ${busy || !project.liveUrl || state.dirty ? "disabled" : ""}>↻</button>
          <button class="pf-icon" type="button" data-edit="${esc(project.id)}" title="Düzenle">✎</button>
          <button class="pf-icon delete" type="button" data-delete="${esc(project.id)}" title="Sil">×</button>
        </div>
      </article>`;
    }).join("");
    if (!ordered.length) list.innerHTML = '<div class="pf-empty">Bu görünümde proje bulunamadı.</div>';
    list.querySelectorAll("[data-publish]").forEach((button) => button.addEventListener("click", () => toggleVisibility(button.dataset.publish, "published")));
    list.querySelectorAll("[data-feature]").forEach((button) => button.addEventListener("click", () => toggleVisibility(button.dataset.feature, "featured")));
    list.querySelectorAll("[data-preview]").forEach((button) => button.addEventListener("click", () => preview(button.dataset.preview)));
    list.querySelectorAll("[data-project-id]").forEach((row) => {
      row.addEventListener("dragstart", (event) => { if (!canOrder || event.target.closest("button")) return event.preventDefault(); state.dragging = row.dataset.projectId; event.dataTransfer.setData("text/plain", state.dragging); });
      row.addEventListener("dragover", (event) => { if (canOrder) event.preventDefault(); });
      row.addEventListener("drop", (event) => { event.preventDefault(); if (canOrder && state.dragging) reorderLocal(state.dragging, row.dataset.projectId); state.dragging = null; });
      row.addEventListener("dragend", () => { state.dragging = null; });
    });
    list.querySelectorAll("[data-edit]").forEach((button) => button.addEventListener("click", () => edit(button.dataset.edit)));
    list.querySelectorAll("[data-delete]").forEach((button) => button.addEventListener("click", () => remove(button.dataset.delete)));
    list.querySelectorAll("[data-capture]").forEach((button) => button.addEventListener("click", () => captureOne(button.dataset.capture, false)));
    list.querySelectorAll("[data-move-up]").forEach((button) => button.addEventListener("click", () => moveProject(button.dataset.moveUp, -1)));
    list.querySelectorAll("[data-move-down]").forEach((button) => button.addEventListener("click", () => moveProject(button.dataset.moveDown, 1)));
  }

  async function load() {
    const payload = await request();
    const projects = Array.isArray(payload.projects) ? payload.projects : [];
    projects.sort((a, b) => Number(a.sortOrder ?? 999) - Number(b.sortOrder ?? 999) || String(a.title || "").localeCompare(String(b.title || "")));
    render(projects);
    return projects;
  }

  function visibleProjects() {
    const field = state.scope === "featured" ? "featuredOrder" : "sortOrder";
    return [...state.projects].filter((p) => state.scope !== "featured" || p.featured)
      .sort((a, b) => Number(a[field] ?? 9999) - Number(b[field] ?? 9999) || a.title.localeCompare(b.title))
      .filter((p) => state.filter === "all" || (state.filter === "draft" && !p.published) || (state.filter === "published" && p.published) || (state.filter === "featured" && p.featured))
      .filter((p) => `${p.title} ${p.category} ${p.githubRepoName || ""}`.toLocaleLowerCase("tr").includes(state.query.toLocaleLowerCase("tr")));
  }

  function reorderLocal(id, target) {
    if (state.reordering || state.capturing.size || state.query || state.filter !== "all" || id === target) return;
    const ordered = visibleProjects();
    const from = ordered.findIndex((p) => p.id === id);
    const to = ordered.findIndex((p) => p.id === target);
    if (from < 0 || to < 0) return;
    ordered.splice(to, 0, ordered.splice(from, 1)[0]);
    const field = state.scope === "featured" ? "featuredOrder" : "sortOrder";
    ordered.forEach((p, index) => { p[field] = (index + 1) * 10; });
    state.dirty = true;
    $("pf-order-state").textContent = "Kaydedilmemiş sıra değişiklikleri";
    render(state.projects);
  }

  function moveProject(id, direction) {
    const ordered = visibleProjects();
    const target = ordered[ordered.findIndex((p) => p.id === id) + direction];
    if (target) reorderLocal(id, target.id);
  }

  async function saveOrder() {
    if (!state.dirty || state.reordering) return;
    state.reordering = true;
    render(state.projects);
    try {
      const field = state.scope === "featured" ? "featuredOrder" : "sortOrder";
      const ids = [...state.projects].filter((p) => state.scope !== "featured" || p.featured).sort((a,b) => a[field] - b[field]).map((p) => p.id);
      await request({ op: "reorder", ids, scope: state.scope });
      state.dirty = false;
      await load();
      $("pf-order-state").textContent = "Sıralama kaydedildi";
    } catch (error) { await alertUser("SIRA KAYDEDİLEMEDİ", error.message, "circle-x"); }
    finally { state.reordering = false; render(state.projects); }
  }

  async function toggleVisibility(id, field) {
    if (state.dirty || state.reordering) return;
    const project = state.projects.find((p) => p.id === id);
    state.reordering = true;
    render(state.projects);
    try { await request({ op: "visibility", id, [field]: !project[field] }); await load(); }
    catch (error) { await alertUser("GÜNCELLENEMEDİ", error.message, "circle-x"); }
    finally { state.reordering = false; render(state.projects); }
  }

  async function syncGithub() {
    if (state.dirty || state.reordering) return alertUser("ÖNCE SIRALAMAYI KAYDET", "Sıralamayı kaydet veya değişiklikleri geri al.");
    const button = $("pf-sync");
    button.disabled = true;
    state.reordering = true;
    render(state.projects);
    $("pf-sync-state").textContent = "GitHub projeleri alınıyor…";
    try {
      const result = await request({ op: "sync-github" });
      await load();
      $("pf-sync-state").textContent = `${result.added} yeni taslak eklendi, ${result.updated} kayıt yenilendi. Hiçbir proje otomatik yayınlanmadı.`;
    } catch (error) { $("pf-sync-state").textContent = error.message; }
    finally { button.disabled = false; state.reordering = false; render(state.projects); }
  }

  function preview(id) {
    const p = state.projects.find((item) => item.id === id);
    if (!p) return;
    $("pf-preview")?.remove();
    const dialog = document.createElement("dialog");
    dialog.id = "pf-preview";
    dialog.style.cssText = "background:#111;color:#fff;border:1px solid #665719;border-radius:18px;padding:24px;width:min(580px,90vw);max-height:85vh;overflow:auto";
    dialog.innerHTML = `<button class="pf-btn" type="button">Kapat ×</button><p class="pf-help">Kart önizlemesi · ${p.published ? "Yayında" : "Taslak — ziyaretçilere görünmez"}</p>${p.desktopImage ? `<img src="${esc(p.desktopImage)}" alt="" style="width:100%;max-height:260px;object-fit:contain">` : ""}<h2>${esc(p.title)}</h2><p>${esc(p.category)}</p><p>${esc(p.description || p.kicker)}</p><p>${esc((p.stack || []).join(" · "))}</p>`;
    dialog.querySelector("button").addEventListener("click", () => dialog.close());
    dialog.addEventListener("close", () => dialog.remove());
    document.body.appendChild(dialog);
    dialog.showModal();
  }

  function edit(id) {
    const p = state.projects.find((item) => item.id === id);
    if (!p) return;
    state.editingId = id;
    $("pf-editor").open = true;
    const values = { "pf-github": p.githubUrl || "", "pf-description": p.description || "", "pf-stack": (p.stack || []).join(", "), "pf-title": p.title, "pf-archive-category": p.archiveCategory || "other", "pf-category": p.category, "pf-kicker": p.kicker, "pf-challenge": p.challenge, "pf-solution": p.solution, "pf-result": p.result, "pf-url": p.liveUrl, "pf-desktop": p.desktopImage, "pf-mobile": p.mobileImage, "pf-alt": p.alternateDesktopImage, "pf-label-a": p.alternateLabelA || "Primary", "pf-label-b": p.alternateLabelB || "Alternate", "pf-display": p.displayType || "desktop-mobile", "pf-accent": p.accent || "#FFD700", "pf-order": p.sortOrder ?? 999, "pf-lang": p.lang || "" };
    Object.entries(values).forEach(([fieldId, value]) => { $(fieldId).value = value ?? ""; });
    $("pf-published").checked = p.published !== false;
    $("pf-featured").checked = p.featured === true;
    $("pf-auto-capture").checked = true;
    $("pf-save").textContent = "Projeyi güncelle";
    $("portfolio-admin-card").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function captureOne(id, silent) {
    if (state.dirty || state.reordering) return;
    const project = state.projects.find((item) => item.id === id);
    if (!project) return;
    state.capturing.add(id);
    render(state.projects);
    try {
      await requestCapture(id, project.liveUrl);
      await load();
      if (!silent) await alertUser("PREVIEWS CAPTURED", "Desktop and mobile first-view screenshots were refreshed from the project URL.", "camera");
    } catch (error) {
      if (!silent) await alertUser("CAPTURE FAILED", error.message || "The project URL could not be captured.", "circle-x");
    } finally {
      state.capturing.delete(id);
      render(state.projects);
    }
  }

  async function save(event) {
    event.preventDefault();
    if (state.dirty || state.reordering) return alertUser("ÖNCE SIRALAMAYI KAYDET", "Sıralamayı kaydet veya değişiklikleri geri al.");
    const button = $("pf-save");
    button.disabled = true;
    state.reordering = true;
    render(state.projects);
    let captureError = null;
    try {
      const project = readForm();
      const id = state.editingId || project.slug;
      button.textContent = "Saving…";
      await request({ op: "upsert", id, project });
      if ($("pf-auto-capture").checked && project.liveUrl) {
        button.textContent = "Capturing previews…";
        try { await requestCapture(id, project.liveUrl); }
        catch (error) { captureError = error; }
      }
      await load();
      reset();
      await alertUser(captureError ? "PROJECT SAVED" : "PORTFOLIO UPDATED", captureError ? `Project data was saved, but preview capture failed: ${captureError.message}` : "Project data and first-view desktop/mobile previews are ready.", captureError ? "triangle-alert" : "layout-template");
    } catch (error) {
      console.error("Portfolio save failed", error);
      await alertUser("SAVE FAILED", error.message || "Portfolio record could not be saved.", "circle-x");
    } finally {
      button.disabled = false;
      state.reordering = false;
      render(state.projects);
      // Restore the mode-appropriate label even when the save failed mid-flight,
      // so the button never stays stuck on "Saving…" / "Capturing previews…".
      button.textContent = state.editingId ? "Projeyi güncelle" : "Projeyi kaydet";
    }
  }

  async function captureCurrent() {
    if (state.dirty || state.reordering) return;
    const project = readForm();
    if (!project.title || !project.liveUrl) return alertUser("MISSING DATA", "Enter the project title and URL first.", "triangle-alert");
    const id = state.editingId || project.slug;
    const button = $("pf-capture");
    button.disabled = true;
    state.reordering = true; render(state.projects);
    button.textContent = "Capturing…";
    try {
      await request({ op: "upsert", id, project });
      const result = await requestCapture(id, project.liveUrl);
      $("pf-desktop").value = result.desktopImage || "";
      $("pf-mobile").value = result.mobileImage || "";
      await load();
      state.editingId = id;
      await alertUser("PREVIEWS CAPTURED", "The first visible desktop and mobile screens were captured from the URL.", "camera");
    } catch (error) {
      await alertUser("CAPTURE FAILED", error.message || "The project URL could not be captured.", "circle-x");
    } finally {
      button.disabled = false;
      button.textContent = "Önizlemeyi yenile";
      state.reordering = false; render(state.projects);
    }
  }

  async function refreshAll() {
    if (!state.projects.length || state.dirty || state.reordering) return;
    const confirmed = typeof window.systemConfirm === "function" ? await window.systemConfirm("REFRESH ALL PREVIEWS", `Capture desktop and mobile first views for ${state.projects.length} projects?`, "camera") : window.confirm("Refresh all project previews?");
    if (!confirmed) return;
    const button = $("pf-refresh-all");
    button.disabled = true;
    state.reordering = true; render(state.projects);
    const failures = [];
    try {
      for (let index = 0; index < state.projects.length; index += 1) {
        const project = state.projects[index];
        if (!project.liveUrl) continue;
        button.textContent = `Capturing ${index + 1}/${state.projects.length}`;
        try { await requestCapture(project.id, project.liveUrl); }
        catch (error) { failures.push(`${project.title}: ${error.message}`); }
      }
      await load();
      await alertUser(failures.length ? "CAPTURE COMPLETED WITH WARNINGS" : "ALL PREVIEWS CAPTURED", failures.length ? failures.join("\n") : "Every project now uses a fresh desktop and mobile first-view screenshot.", failures.length ? "triangle-alert" : "camera");
    } finally {
      button.disabled = false;
      button.textContent = "Tüm görselleri yenile";
      state.reordering = false; render(state.projects);
    }
  }

  async function remove(id) {
    if (state.dirty || state.reordering) return alertUser("ÖNCE SIRALAMAYI KAYDET", "Sıralamayı kaydet veya değişiklikleri geri al.");
    const p = state.projects.find((item) => item.id === id);
    const confirmed = typeof window.systemConfirm === "function" ? await window.systemConfirm("DELETE PORTFOLIO ITEM", `Remove ${p?.title || "this project"}?`, "trash-2") : window.confirm("Delete this portfolio item?");
    if (!confirmed) return;
    try { await request({ op: "delete", id }); if (state.editingId === id) reset(); await load(); }
    catch (error) { await alertUser("DELETE FAILED", error.message || "Portfolio record could not be deleted.", "circle-x"); }
  }

  async function mount() {
    if (state.mounted) return;
    const settings = document.querySelector("#view-settings .max-w-3xl");
    if (!settings || !window.firebase?.auth?.().currentUser) { window.setTimeout(mount, 350); return; }
    state.mounted = true;
    installStyles();
    settings.insertAdjacentHTML("beforeend", markup());
    $("portfolio-admin-form").addEventListener("submit", save);
    $("pf-capture").addEventListener("click", captureCurrent);
    $("pf-reset").addEventListener("click", reset);
    $("pf-refresh-all").addEventListener("click", refreshAll);
    $("pf-sync").addEventListener("click", syncGithub);
    $("pf-save-order").addEventListener("click", saveOrder);
    $("pf-discard-order").addEventListener("click", async () => { try { await load(); state.dirty = false; $("pf-order-state").textContent = "Değişiklikler geri alındı"; render(state.projects); } catch (error) { await alertUser("YÜKLENEMEDİ", error.message); } });
    $("pf-search").addEventListener("input", (event) => { state.query = event.target.value; render(state.projects); });
    $("pf-filter").addEventListener("change", (event) => { state.filter = event.target.value; render(state.projects); });
    $("pf-scope").addEventListener("change", (event) => { state.scope = event.target.value; render(state.projects); });
    window.addEventListener("beforeunload", (event) => { if (state.dirty) { event.preventDefault(); event.returnValue = ""; } });
    try {
      await load();
      reset();
    } catch (error) {
      console.error("Portfolio Manager initialization failed", error);
      $("pf-list").innerHTML = `<div class="pf-empty">${esc(error.message || "Portfolio Manager could not load.")}</div>`;
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount, { once: true }); else mount();
})();
