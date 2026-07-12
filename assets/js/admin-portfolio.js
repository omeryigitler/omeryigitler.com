(() => {
  if (!/admin\.html$/i.test(window.location.pathname)) return;

  const defaults = [
    { id: "bugun-ne-yiyelim", slug: "bugun-ne-yiyelim", title: "Bugün Ne Yiyelim?", category: "Food decision app", kicker: "AI-Powered Food Decider", challenge: "Overcoming daily decision fatigue when choosing what to eat.", solution: "AI-driven recommendation engine personalized to user mood.", result: "Instant, stress-free meal decisions tailored to the moment.", liveUrl: "https://www.bugunneyiyelim.com/", desktopImage: "assets/bugun-desktop.png", mobileImage: "assets/bugun-mobile.png", alternateDesktopImage: "", alternateLabelA: "Primary", alternateLabelB: "Alternate", accent: "#FF2A1A", sortOrder: 20, displayType: "desktop-mobile", published: true, lang: "tr" },
    { id: "elite-body-protocol", slug: "elite-body-protocol", title: "Elite Body Protocol", category: "Gamified fitness app", kicker: "React Web App", challenge: "Designing a seamless cinematic transition between two completely different UI design languages (Retro vs. Modern).", solution: "Built with React and Tailwind for dynamic state management and complex CSS animations.", result: "A highly engaging, gamified experience that increases user retention through narrative.", liveUrl: "https://elitebody.omeryigitler.com", desktopImage: "assets/elite-modern.png?v=V10", mobileImage: "", alternateDesktopImage: "assets/elite-retro.png?v=V10", alternateLabelA: "Modern", alternateLabelB: "Retro", accent: "#a78bfa", sortOrder: 30, displayType: "desktop-swap", published: true, lang: "" },
    { id: "reformer-pilates-malta", slug: "reformer-pilates-malta", title: "Reformer Pilates Malta", category: "Wellness studio", kicker: "Custom Website Design", challenge: "Lack of online visibility and mobile booking options for clients.", solution: "Custom responsive design with clear class schedules and SEO foundations.", result: "Improved brand perception and accessible class information for locals.", liveUrl: "https://www.reformerpilatesmalta.com/", desktopImage: "assets/pilates-desktop.png", mobileImage: "assets/pilates-mobile.png", alternateDesktopImage: "", alternateLabelA: "Primary", alternateLabelB: "Alternate", accent: "#D38B99", sortOrder: 40, displayType: "desktop-mobile", published: true, lang: "" },
    { id: "today-we-eat", slug: "today-we-eat", title: "Today We Eat", category: "Food decision app", kicker: "AI-Powered Food Decider", challenge: "Overcoming daily decision fatigue when choosing what to eat.", solution: "AI-driven recommendation engine personalized to user mood.", result: "Instant, stress-free meal decisions tailored to the moment.", liveUrl: "https://www.todayweeat.com/", desktopImage: "assets/today-we-eat-desktop.png", mobileImage: "assets/today-we-eat-mobile.png", alternateDesktopImage: "", alternateLabelA: "Primary", alternateLabelB: "Alternate", accent: "#FF2A1A", sortOrder: 50, displayType: "desktop-mobile", published: true, lang: "" }
  ];

  const state = { mounted: false, editingId: null, projects: [], capturing: new Set(), reordering: false };
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
      .pf-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.pf-field{display:flex;flex-direction:column;gap:7px}.pf-field.wide{grid-column:1/-1}.pf-field>label{color:#777;font:800 9px "JetBrains Mono",monospace;letter-spacing:.12em;text-transform:uppercase}.pf-field input,.pf-field textarea,.pf-field select{width:100%;padding:11px 12px;border:1px solid rgba(255,255,255,.11);border-radius:12px;outline:0;background:rgba(0,0,0,.42);color:#fff;font:500 12px Manrope,sans-serif}.pf-field textarea{min-height:80px;resize:vertical;line-height:1.55}.pf-field input:focus,.pf-field textarea:focus,.pf-field select:focus{border-color:rgba(255,215,0,.65);box-shadow:0 0 0 3px rgba(255,215,0,.06)}.pf-help{color:#666;font:600 10px Manrope,sans-serif;line-height:1.45}.pf-toggle{display:flex!important;align-items:center;gap:10px;min-height:43px;color:#d2d2d2!important;font-size:11px!important}.pf-actions{display:flex;flex-wrap:wrap;gap:10px;margin-top:16px}.pf-btn{padding:11px 14px;border:1px solid rgba(255,255,255,.13);border-radius:11px;background:rgba(255,255,255,.05);color:#ddd;cursor:pointer;font:800 9px "JetBrains Mono",monospace;letter-spacing:.12em;text-transform:uppercase}.pf-btn:hover{border-color:rgba(255,215,0,.45);color:#FFD700}.pf-btn.primary{border-color:#FFD700;background:#FFD700;color:#080808}.pf-btn.primary:hover{border-color:#fff;background:#fff;color:#050505}.pf-btn.capture{border-color:rgba(34,197,94,.35);color:#86efac;background:rgba(34,197,94,.07)}.pf-btn:disabled{opacity:.5;cursor:wait}
      .pf-order-head{display:flex;justify-content:space-between;gap:16px;align-items:flex-end;margin-top:26px;padding-top:20px;border-top:1px solid rgba(255,255,255,.08)}.pf-order-head strong{display:block;color:#fff;font:800 11px "JetBrains Mono",monospace;letter-spacing:.12em;text-transform:uppercase}.pf-order-head span{display:block;margin-top:5px;color:#686868;font:600 10px Manrope,sans-serif;line-height:1.45}
      .pf-list{display:grid;gap:10px;margin-top:12px}.pf-row{display:grid;grid-template-columns:32px 74px minmax(0,1fr) auto;align-items:center;gap:12px;padding:10px;border:1px solid rgba(255,255,255,.08);border-radius:14px;background:rgba(255,255,255,.025)}.pf-position{width:28px;height:28px;display:grid;place-items:center;border:1px solid rgba(255,215,0,.18);border-radius:999px;color:#FFD700;background:rgba(255,215,0,.05);font:800 9px "JetBrains Mono",monospace}.pf-thumb{width:74px;height:48px;border:1px solid rgba(255,255,255,.1);border-radius:8px;background:#0b0b0b;object-fit:cover;object-position:top}.pf-title{color:#fff;font:700 12px Manrope,sans-serif}.pf-meta{margin-top:4px;color:#777;font:700 9px "JetBrains Mono",monospace;letter-spacing:.08em;text-transform:uppercase;line-height:1.5}.pf-status{color:#22c55e}.pf-status.hidden{color:#888}.pf-row-actions{display:flex;gap:7px;align-items:center}.pf-order-actions{display:flex;gap:5px;padding-right:3px;margin-right:3px;border-right:1px solid rgba(255,255,255,.08)}.pf-icon{width:34px;height:34px;border:1px solid rgba(255,255,255,.1);border-radius:9px;background:rgba(255,255,255,.04);color:#ccc;cursor:pointer}.pf-icon:hover{border-color:rgba(255,215,0,.4);color:#FFD700}.pf-icon.order{font-size:15px;color:#FFD700}.pf-icon.capture{color:#86efac}.pf-icon.delete:hover{border-color:rgba(248,113,113,.4);color:#f87171}.pf-icon:disabled{opacity:.3;cursor:not-allowed}.pf-empty{padding:22px;border:1px dashed rgba(255,255,255,.12);border-radius:14px;color:#777;text-align:center;font:700 10px "JetBrains Mono",monospace;letter-spacing:.1em;text-transform:uppercase}
      @media(max-width:820px){.pf-grid{grid-template-columns:1fr}.pf-field.wide{grid-column:auto}.pf-head,.pf-order-head{flex-direction:column;align-items:flex-start}.pf-row{grid-template-columns:28px 58px minmax(0,1fr)}.pf-thumb{width:58px}.pf-row-actions{grid-column:1/-1;justify-content:flex-end}}
    `;
    document.head.appendChild(style);
  }

  function markup() {
    return `<section class="pf-card" id="portfolio-admin-card">
      <div class="pf-head"><div><h3>Portfolio Manager</h3><p>Project URL is captured at 1440×900 desktop and 390×844 mobile. Only the first visible viewport is used.</p></div><span class="pf-badge">Auto previews</span></div>
      <form id="portfolio-admin-form">
        <div class="pf-grid">
          <div class="pf-field"><label for="pf-title">Project title</label><input id="pf-title" required></div>
          <div class="pf-field"><label for="pf-category">Category</label><input id="pf-category" required></div>
          <div class="pf-field"><label for="pf-kicker">Service / technology</label><input id="pf-kicker" required></div>
          <div class="pf-field"><label for="pf-url">Project URL</label><input id="pf-url" type="url" required placeholder="https://"></div>
          <div class="pf-field wide"><label for="pf-challenge">Challenge</label><textarea id="pf-challenge" required></textarea></div>
          <div class="pf-field wide"><label for="pf-solution">Solution</label><textarea id="pf-solution" required></textarea></div>
          <div class="pf-field wide"><label for="pf-result">Result</label><textarea id="pf-result" required></textarea></div>
          <div class="pf-field wide"><label for="pf-desktop">Desktop preview override</label><input id="pf-desktop" placeholder="Filled automatically after capture"><span class="pf-help">Optional. Leave empty to capture from the project URL.</span></div>
          <div class="pf-field wide"><label for="pf-mobile">Mobile preview override</label><input id="pf-mobile" placeholder="Filled automatically after capture"><span class="pf-help">Optional. Leave empty to capture the mobile first viewport.</span></div>
          <div class="pf-field wide"><label for="pf-alt">Alternate desktop image (hover swap)</label><input id="pf-alt" placeholder="assets/project-alternate.png"></div>
          <div class="pf-field"><label for="pf-label-a">Primary label</label><input id="pf-label-a" value="Primary"></div>
          <div class="pf-field"><label for="pf-label-b">Alternate label</label><input id="pf-label-b" value="Alternate"></div>
          <div class="pf-field"><label for="pf-display">Presentation</label><select id="pf-display"><option value="desktop-mobile">Desktop + mobile</option><option value="desktop-swap">Desktop hover swap</option></select></div>
          <div class="pf-field"><label for="pf-accent">Accent</label><input id="pf-accent" type="color" value="#FFD700"></div>
          <div class="pf-field"><label for="pf-order">Sort order</label><input id="pf-order" type="number" step="1" value="50"><span class="pf-help">Advanced value. Use the arrows in the project list for normal ordering.</span></div>
          <div class="pf-field"><label for="pf-lang">Title language</label><input id="pf-lang" placeholder="tr / en"></div>
          <div class="pf-field wide"><label>Automation</label><label class="pf-toggle"><input id="pf-auto-capture" type="checkbox" checked> Capture desktop and mobile previews when saved</label></div>
          <div class="pf-field wide"><label>Publishing</label><label class="pf-toggle"><input id="pf-published" type="checkbox" checked> Visible on projects page</label></div>
        </div>
        <div class="pf-actions"><button class="pf-btn primary" id="pf-save" type="submit">Save project</button><button class="pf-btn capture" id="pf-capture" type="button">Capture preview now</button><button class="pf-btn" id="pf-reset" type="button">Clear form</button><button class="pf-btn" id="pf-seed" type="button">Restore base entries</button><button class="pf-btn" id="pf-refresh-all" type="button">Refresh all previews</button></div>
      </form>
      <div class="pf-order-head"><div><strong>Project order</strong><span>Use the arrows to move projects. Changes are saved immediately and include hidden projects.</span></div><span id="pf-order-state">Ready</span></div>
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
    $("pf-published").checked = true;
    $("pf-auto-capture").checked = true;
    $("pf-save").textContent = "Save project";
  }

  function readForm() {
    const title = $("pf-title").value.trim();
    return {
      slug: slugify(title), title,
      category: $("pf-category").value.trim(), kicker: $("pf-kicker").value.trim(),
      challenge: $("pf-challenge").value.trim(), solution: $("pf-solution").value.trim(), result: $("pf-result").value.trim(),
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
      list.innerHTML = '<div class="pf-empty">No portfolio records. Restore the base entries or add a project.</div>';
      return;
    }
    list.innerHTML = projects.map((project, index) => {
      const busy = state.capturing.has(project.id);
      const captureLabel = project.captureUpdatedAt ? "auto-captured" : "manual preview";
      return `<article class="pf-row">
        <div class="pf-position">${index + 1}</div>
        <img class="pf-thumb" src="${esc(project.desktopImage || "assets/preview.png")}" alt="">
        <div><div class="pf-title">${esc(project.title || "Untitled")}</div><div class="pf-meta"><span class="pf-status${project.published === false ? " hidden" : ""}">${project.published === false ? "Hidden" : "Published"}</span> · ${esc(captureLabel)} · order ${esc(project.sortOrder ?? 999)}</div></div>
        <div class="pf-row-actions">
          <div class="pf-order-actions">
            <button class="pf-icon order" type="button" data-move-up="${esc(project.id)}" title="Move up" ${index === 0 || state.reordering ? "disabled" : ""}>↑</button>
            <button class="pf-icon order" type="button" data-move-down="${esc(project.id)}" title="Move down" ${index === projects.length - 1 || state.reordering ? "disabled" : ""}>↓</button>
          </div>
          <button class="pf-icon capture" type="button" data-capture="${esc(project.id)}" title="Capture first desktop and mobile viewport" ${busy ? "disabled" : ""}>↻</button>
          <button class="pf-icon" type="button" data-edit="${esc(project.id)}" title="Edit">✎</button>
          <button class="pf-icon delete" type="button" data-delete="${esc(project.id)}" title="Delete">×</button>
        </div>
      </article>`;
    }).join("");
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

  async function moveProject(id, direction) {
    if (state.reordering) return;
    const currentIndex = state.projects.findIndex((project) => project.id === id);
    const targetIndex = currentIndex + direction;
    if (currentIndex < 0 || targetIndex < 0 || targetIndex >= state.projects.length) return;

    const reordered = [...state.projects];
    [reordered[currentIndex], reordered[targetIndex]] = [reordered[targetIndex], reordered[currentIndex]];
    reordered.forEach((project, index) => { project.sortOrder = (index + 1) * 10; });

    state.reordering = true;
    $("pf-order-state").textContent = "Saving order…";
    render(reordered);
    try {
      await request({ op: "reorder", ids: reordered.map((project) => project.id) });
      await load();
      $("pf-order-state").textContent = "Order saved";
      window.setTimeout(() => { if ($("pf-order-state")) $("pf-order-state").textContent = "Ready"; }, 1600);
    } catch (error) {
      await load().catch(() => {});
      $("pf-order-state").textContent = "Save failed";
      await alertUser("ORDER SAVE FAILED", error.message || "Project order could not be saved.", "circle-x");
    } finally {
      state.reordering = false;
      render(state.projects);
    }
  }

  function edit(id) {
    const p = state.projects.find((item) => item.id === id);
    if (!p) return;
    state.editingId = id;
    const values = { "pf-title": p.title, "pf-category": p.category, "pf-kicker": p.kicker, "pf-challenge": p.challenge, "pf-solution": p.solution, "pf-result": p.result, "pf-url": p.liveUrl, "pf-desktop": p.desktopImage, "pf-mobile": p.mobileImage, "pf-alt": p.alternateDesktopImage, "pf-label-a": p.alternateLabelA || "Primary", "pf-label-b": p.alternateLabelB || "Alternate", "pf-display": p.displayType || "desktop-mobile", "pf-accent": p.accent || "#FFD700", "pf-order": p.sortOrder ?? 999, "pf-lang": p.lang || "" };
    Object.entries(values).forEach(([fieldId, value]) => { $(fieldId).value = value ?? ""; });
    $("pf-published").checked = p.published !== false;
    $("pf-auto-capture").checked = true;
    $("pf-save").textContent = "Update project";
    $("portfolio-admin-card").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function captureOne(id, silent) {
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
    const button = $("pf-save");
    button.disabled = true;
    let captureError = null;
    try {
      const project = readForm();
      const id = state.editingId || project.slug;
      button.textContent = "Saving…";
      await request({ op: "upsert", id, project });
      if ($("pf-auto-capture").checked) {
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
      if (!state.editingId) button.textContent = "Save project";
    }
  }

  async function captureCurrent() {
    const project = readForm();
    if (!project.title || !project.liveUrl) return alertUser("MISSING DATA", "Enter the project title and URL first.", "triangle-alert");
    const id = state.editingId || project.slug;
    const button = $("pf-capture");
    button.disabled = true;
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
      button.textContent = "Capture preview now";
    }
  }

  async function refreshAll() {
    if (!state.projects.length) return;
    const confirmed = typeof window.systemConfirm === "function" ? await window.systemConfirm("REFRESH ALL PREVIEWS", `Capture desktop and mobile first views for ${state.projects.length} projects?`, "camera") : window.confirm("Refresh all project previews?");
    if (!confirmed) return;
    const button = $("pf-refresh-all");
    button.disabled = true;
    const failures = [];
    try {
      for (let index = 0; index < state.projects.length; index += 1) {
        const project = state.projects[index];
        button.textContent = `Capturing ${index + 1}/${state.projects.length}`;
        try { await requestCapture(project.id, project.liveUrl); }
        catch (error) { failures.push(`${project.title}: ${error.message}`); }
      }
      await load();
      await alertUser(failures.length ? "CAPTURE COMPLETED WITH WARNINGS" : "ALL PREVIEWS CAPTURED", failures.length ? failures.join("\n") : "Every project now uses a fresh desktop and mobile first-view screenshot.", failures.length ? "triangle-alert" : "camera");
    } finally {
      button.disabled = false;
      button.textContent = "Refresh all previews";
    }
  }

  async function remove(id) {
    const p = state.projects.find((item) => item.id === id);
    const confirmed = typeof window.systemConfirm === "function" ? await window.systemConfirm("DELETE PORTFOLIO ITEM", `Remove ${p?.title || "this project"}?`, "trash-2") : window.confirm("Delete this portfolio item?");
    if (!confirmed) return;
    try { await request({ op: "delete", id }); if (state.editingId === id) reset(); await load(); }
    catch (error) { await alertUser("DELETE FAILED", error.message || "Portfolio record could not be deleted.", "circle-x"); }
  }

  async function seed(showNotice = true) {
    try {
      await request({ op: "seed", projects: defaults });
      await load();
      if (showNotice) await alertUser("PORTFOLIO RESTORED", "The base case studies are available. Use the order arrows to place them and Refresh all previews to capture their current first screens.", "database");
    } catch (error) {
      await alertUser("RESTORE FAILED", error.message || "Default projects could not be restored.", "circle-x");
    }
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
    $("pf-seed").addEventListener("click", () => seed(true));
    $("pf-refresh-all").addEventListener("click", refreshAll);
    try {
      const projects = await load();
      if (!projects.length) await seed(false);
      reset();
    } catch (error) {
      console.error("Portfolio Manager initialization failed", error);
      $("pf-list").innerHTML = `<div class="pf-empty">${esc(error.message || "Portfolio Manager could not load.")}</div>`;
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount, { once: true }); else mount();
})();
