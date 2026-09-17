(function () {
  "use strict";

  const hero = document.querySelector("main > .hero");
  if (!hero || document.getElementById("selected-work")) return;

  const section = document.createElement("section");
  section.id = "selected-work";
  section.className = "home-work-continuum";
  section.setAttribute("aria-label", "Selected work");

  const bridge = document.createElement("div");
  bridge.className = "home-work-bridge";
  const bridgeLabel = document.createElement("p");
  bridgeLabel.className = "home-work-bridge-label";
  bridgeLabel.textContent = "Selected work";
  const bridgeCue = document.createElement("p");
  bridgeCue.className = "home-work-bridge-cue";
  const arrow = document.createElement("span");
  arrow.setAttribute("aria-hidden", "true");
  arrow.textContent = "↓";
  bridgeCue.append(arrow, document.createTextNode("scroll into the work"));
  bridge.append(bridgeLabel, bridgeCue);

  const list = document.createElement("div");
  list.className = "home-work-list";
  const loading = document.createElement("p");
  loading.className = "home-work-loading";
  loading.textContent = "Loading selected work…";
  list.appendChild(loading);

  const footer = document.createElement("div");
  footer.className = "home-work-footer";
  const allWork = document.createElement("a");
  allWork.className = "home-work-all";
  allWork.href = "projects.html";
  allWork.textContent = "View all case studies";
  footer.appendChild(allWork);

  section.append(bridge, list, footer);
  hero.insertAdjacentElement("afterend", section);
  hero.classList.add("hero-project-connected");

  function value(input, fallback) {
    return typeof input === "string" && input.trim() ? input.trim() : fallback;
  }

  function accent(input) {
    const candidate = value(input, "#FFD700");
    return /^#[0-9a-f]{3,8}$/i.test(candidate) ? candidate : "#FFD700";
  }

  function link(input) {
    try {
      const url = new URL(value(input, "projects.html"), window.location.href);
      return /^(https?:)$/.test(url.protocol) ? url.href : "projects.html";
    } catch (error) {
      return "projects.html";
    }
  }

  function image(input) {
    const candidate = value(input, "assets/preview.png");
    try {
      const url = new URL(candidate, window.location.href);
      return /^(https?:)$/.test(url.protocol) ? candidate : "assets/preview.png";
    } catch (error) {
      return "assets/preview.png";
    }
  }

  function normalize(project, index) {
    const order = Number(project.sortOrder);
    return {
      id: value(project.id, value(project.slug, "project-" + index)),
      title: value(project.title, "Selected project"),
      category: value(project.category, "Selected work"),
      kicker: value(project.kicker, "Custom digital experience"),
      liveUrl: link(project.liveUrl),
      desktopImage: image(project.desktopImage),
      accent: accent(project.accent),
      sortOrder: Number.isFinite(order) ? order : 999 + index,
      published: project.published !== false,
      lang: value(project.lang, "")
    };
  }

  function domain(url) {
    try { return new URL(url).hostname.replace(/^www\./, ""); }
    catch (error) { return "project"; }
  }

  function makeProject(project, index, total) {
    const article = document.createElement("article");
    article.className = "home-work-row" + (index % 2 ? " is-reversed" : "");
    article.dataset.projectId = project.id;
    article.style.setProperty("--work-accent", project.accent);

    const sticky = document.createElement("div");
    sticky.className = "home-work-sticky";
    const copy = document.createElement("div");
    copy.className = "home-work-copy";

    const eyebrow = document.createElement("div");
    eyebrow.className = "home-work-eyebrow";
    const count = document.createElement("span");
    count.className = "home-work-count";
    count.textContent = String(index + 1).padStart(2, "0") + " / " + String(total).padStart(2, "0");
    const category = document.createElement("span");
    category.className = "home-work-category";
    category.textContent = project.category;
    eyebrow.append(count, category);

    const title = document.createElement("h2");
    title.className = "home-work-title";
    title.textContent = project.title;
    if (project.lang) title.lang = project.lang;

    const meta = document.createElement("div");
    meta.className = "home-work-meta";
    const kicker = document.createElement("span");
    kicker.textContent = project.kicker;
    const host = document.createElement("span");
    host.textContent = domain(project.liveUrl);
    meta.append(kicker, host);

    const open = document.createElement("a");
    open.className = "home-work-open";
    open.href = project.liveUrl;
    open.target = "_blank";
    open.rel = "noreferrer";
    open.textContent = "Open project ↗";
    open.setAttribute("aria-label", "Open " + project.title + " project");
    copy.append(eyebrow, title, meta, open);

    const mediaLink = document.createElement("a");
    mediaLink.className = "home-work-media";
    mediaLink.href = project.liveUrl;
    mediaLink.target = "_blank";
    mediaLink.rel = "noreferrer";
    mediaLink.setAttribute("aria-label", "Open " + project.title + " project");

    const frame = document.createElement("div");
    frame.className = "home-work-frame";
    const shot = document.createElement("img");
    shot.className = "home-work-image";
    shot.src = project.desktopImage;
    shot.alt = project.title + " website preview";
    shot.loading = index === 0 ? "eager" : "lazy";
    shot.decoding = "async";
    frame.appendChild(shot);

    const corner = document.createElement("span");
    corner.className = "home-work-corner";
    corner.textContent = "view / " + String(index + 1).padStart(2, "0");
    mediaLink.append(frame, corner);

    sticky.append(copy, mediaLink);
    article.appendChild(sticky);
    return article;
  }

  function activateMotion() {
    const rows = Array.from(section.querySelectorAll(".home-work-row"));
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced || !("IntersectionObserver" in window)) {
      rows.forEach(function (row) { row.classList.add("is-visible"); });
      return;
    }

    const visible = new Set();
    const observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          visible.add(entry.target);
        } else {
          visible.delete(entry.target);
        }
      });
    }, { rootMargin: "12% 0px", threshold: 0.08 });

    rows.forEach(function (row) { observer.observe(row); });

    let frame = 0;
    function update() {
      frame = 0;
      const viewport = window.innerHeight || 1;
      visible.forEach(function (row) {
        const rect = row.getBoundingClientRect();
        const center = rect.top + rect.height / 2;
        const progress = Math.max(-1, Math.min(1, (center - viewport / 2) / viewport));
        row.style.setProperty("--work-shift", (progress * -22).toFixed(2) + "px");
      });
    }
    function schedule() {
      if (!frame) frame = window.requestAnimationFrame(update);
    }
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule, { passive: true });
    schedule();
  }

  function render(projects) {
    const normalized = projects
      .map(normalize)
      .filter(function (project) { return project.published; })
      .sort(function (a, b) { return a.sortOrder - b.sortOrder; });

    list.replaceChildren();
    if (!normalized.length) {
      const empty = document.createElement("p");
      empty.className = "home-work-loading";
      empty.textContent = "Selected work is available in the full archive.";
      list.appendChild(empty);
      return;
    }
    normalized.forEach(function (project, index) {
      list.appendChild(makeProject(project, index, normalized.length));
    });
    activateMotion();
  }

  fetch("/api/portfolio", { headers: { Accept: "application/json" } })
    .then(function (response) {
      if (!response.ok) throw new Error("Portfolio API returned " + response.status);
      return response.json();
    })
    .then(function (payload) {
      if (!payload || !Array.isArray(payload.projects)) throw new Error("Invalid portfolio payload");
      render(payload.projects);
    })
    .catch(function (error) {
      console.warn("Homepage portfolio flow unavailable:", error);
      list.replaceChildren();
      const fallback = document.createElement("p");
      fallback.className = "home-work-loading";
      fallback.textContent = "Selected work is available in the full archive.";
      list.appendChild(fallback);
    });
})();
