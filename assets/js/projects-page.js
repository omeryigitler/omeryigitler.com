(() => {
  const messages = ["[SYSTEM INIT] LOADING CORE MODULES...","[STATUS] 200 OK","[NETWORK] SECURE CONNECTION ESTABLISHED","[DEPLOYMENT] SUCCESS","[PERFORMANCE] LCP 0.8s : FID 2ms : CLS 0.01","[OPTIMIZATION] ASSETS MINIFIED","[CACHE] HIT RATE 98%","[SEO] SCHEMA VALIDATED","[CRAWLER] INDEXING ENABLED","[SECURITY] SSL/TLS 1.3 ACTIVE","[ROUTING] GLOBAL CDN ENGAGED"];
  const track = document.getElementById("tickerTrack");
  if (track) {
    for (let copy = 0; copy < 2; copy += 1) messages.forEach((message) => {
      const item = document.createElement("span");
      item.className = "ticker-item";
      item.innerHTML = `<span class="msg">${message}</span><span class="sep">█</span>`;
      track.appendChild(item);
    });
    requestAnimationFrame(() => { track.style.animationDuration = `${Math.max(40, track.scrollWidth / 120)}s`; });
  }

  const logo = document.querySelector(".logo-container");
  if (logo) {
    let clicks = 0;
    let timer = 0;
    logo.addEventListener("click", (event) => {
      clicks += 1;
      if (clicks === 3) {
        event.preventDefault();
        if (window.taurus_set_internal) window.taurus_set_internal();
        window.location.href = "gateway.html";
        clicks = 0;
        return;
      }
      window.clearTimeout(timer);
      timer = window.setTimeout(() => { clicks = 0; }, 600);
    });
  }

  const target = document.querySelector(".type-target");
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (target) {
    const text = target.dataset.text || "loading selected work";
    if (reduced) target.textContent = text;
    else {
      let index = 0;
      let deleting = false;
      const step = () => {
        target.textContent = text.slice(0, index);
        if (!deleting && index < text.length) { index += 1; window.setTimeout(step, 52 + Math.random() * 46); }
        else if (!deleting) { deleting = true; window.setTimeout(step, 2600); }
        else if (index > 0) { index -= 1; window.setTimeout(step, 38); }
        else { deleting = false; window.setTimeout(step, 600); }
      };
      step();
    }
  }

  const footer = document.getElementById("site-footer");
  if (footer) {
    if (reduced || !("IntersectionObserver" in window)) footer.classList.add("in");
    else {
      const observer = new IntersectionObserver((entries) => entries.forEach((entry) => {
        if (entry.isIntersecting) { entry.target.classList.add("in"); observer.disconnect(); }
      }), { threshold: .12 });
      observer.observe(footer);
    }
  }
})();
