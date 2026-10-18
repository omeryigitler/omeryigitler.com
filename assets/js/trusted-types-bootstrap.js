/*
 * Trusted Types compatibility policy.
 */
(function installTrustedTypesPolicy() {
  'use strict';

  if (!window.trustedTypes || window.trustedTypes.defaultPolicy) return;

  const allowedScriptOrigins = new Set([
    window.location.origin,
    'https://www.gstatic.com',
    'https://apis.google.com',
    'https://www.googletagmanager.com',
    'https://cdn-cookieyes.com',
    'https://challenges.cloudflare.com',
    'https://omeryigitler-5abfb.firebaseapp.com'
  ]);

  function createScriptURL(value) {
    const rawValue = String(value || '');
    const url = new URL(rawValue, window.location.href);

    if (url.protocol === 'blob:' && url.origin === window.location.origin) {
      return url.href;
    }

    if (url.protocol !== 'https:' && url.origin !== window.location.origin) {
      throw new TypeError('Blocked non-HTTPS script URL.');
    }

    if (!allowedScriptOrigins.has(url.origin)) {
      throw new TypeError(`Blocked unapproved script origin: ${url.origin}`);
    }

    return url.href;
  }

  try {
    window.trustedTypes.createPolicy('default', {
      createHTML: (value) => String(value),
      createScript: (value) => String(value),
      createScriptURL
    });
  } catch (error) {
    console.warn('[security] Trusted Types policy could not be installed.', error);
  }
})();

/* Keep the restored TAURUS composition on this branch. */
(function restorePhilosophyComposition() {
  'use strict';

  function apply() {
    const section = document.querySelector('#philosophy.philosophy');
    if (!section || section.querySelector('.philosophy-manifesto')) return;

    const mark = section.querySelector(':scope > .taurus-mark');
    const lines = Array.from(section.querySelectorAll(':scope > .phil-line')).slice(0, 3);
    if (!mark || lines.length !== 3) return;

    const manifesto = document.createElement('div');
    manifesto.className = 'philosophy-manifesto';
    section.insertBefore(manifesto, mark);
    manifesto.append(mark, ...lines);

    const style = document.createElement('style');
    style.id = 'philosophy-legacy-layer-fix';
    style.textContent = `
      @media (min-width: 900px) {
        #philosophy.philosophy { overflow: visible !important; }
        .philosophy-manifesto {
          position: relative;
          isolation: isolate;
          overflow: visible !important;
        }
        .philosophy-manifesto .taurus-mark {
          position: absolute !important;
          inset: auto !important;
          top: 50% !important;
          left: 50% !important;
          right: auto !important;
          bottom: auto !important;
          width: 100vw !important;
          max-width: none !important;
          height: auto !important;
          display: block !important;
          overflow: visible !important;
          transform: translate(-50%, -50%) !important;
          transform-origin: center !important;
          z-index: 0 !important;
          white-space: nowrap !important;
          text-align: center !important;
          clip-path: none !important;
          -webkit-mask-image: none !important;
          mask-image: none !important;
          font-family: "Syncopate", sans-serif !important;
          font-weight: 700 !important;
          font-size: clamp(160px, 15vw, 240px) !important;
          line-height: .9 !important;
          letter-spacing: .08em !important;
          color: rgba(255,255,255,.024) !important;
          opacity: 1 !important;
          text-shadow: none !important;
          pointer-events: none !important;
          user-select: none !important;
        }
        .philosophy-manifesto .phil-line {
          position: relative !important;
          z-index: 1 !important;
          font-size: clamp(30px, 5.6vw, 72px) !important;
          line-height: 1.12 !important;
          margin: 26px 0 !important;
          letter-spacing: -.03em !important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', apply, { once: true });
  } else {
    apply();
  }
})();

/*
 * Process section inspired by AppSignal's animated diagnostic-pipe typography,
 * translated into the site's conversion / business-performance language.
 */
(function installTechnicalSignalSection() {
  'use strict';

  function apply() {
    const section = document.getElementById('process');
    if (!section || section.dataset.technicalSignalReady === 'true') return;
    section.dataset.technicalSignalReady = 'true';

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const mobileViewport = window.matchMedia('(max-width:600px)');
    const style = document.createElement('style');
    style.id = 'oy-technical-signal-style';
    style.textContent = `
      #process { position:relative!important; width:min(1180px,calc(100% - 48px))!important; max-width:1180px!important; min-height:0!important; height:auto!important; margin:70px auto 86px!important; padding:0!important; overflow:visible!important; }
      #process > :not(.oy-signal-system) { display:none!important; }
      .oy-signal-system { container-type:inline-size; position:relative; color:#f3f4f6; }
      .oy-signal-label { display:flex; align-items:center; flex-wrap:wrap; gap:10px; margin:0 0 28px; color:#9ca3af; font:400 13px/1.6 var(--mono,"JetBrains Mono",monospace); }
      .oy-signal-label .prompt { color:#ffd700; font-weight:700; }
      .oy-signal-label .arrow { color:#6b7280; }
      .oy-signal-label strong { color:#d1d5db; font-weight:400; }
      .oy-signal-stage { position:relative; aspect-ratio:1180/600; overflow:hidden; border-block:1px solid #ffffff14; background:radial-gradient(ellipse at center,#ffd70006,transparent 70%); }
      .oy-signal-svg { position:absolute; inset:0; width:100%; height:100%; pointer-events:none; }
      .oy-signal-mobile { display:none; }
      .oy-pipe-edge,.oy-pipe-body { fill:none; stroke-linejoin:round; stroke-linecap:round; }
      .oy-pipe-edge { stroke:#ffd70026; stroke-width:46; }
      .oy-pipe-body { stroke:#282407; stroke-width:40; }
      .oy-signal-svg text { fill:#b6a129; font:500 12px var(--mono,"JetBrains Mono",monospace); letter-spacing:.45px; }
      .oy-signal-title { margin:0; font:700 5.6cqw/1.12 "Syncopate",sans-serif; letter-spacing:-.055em; text-transform:uppercase; }
      .oy-signal-title .word { position:absolute; display:block; white-space:nowrap; }
      .oy-signal-title .word:not(.oy-signal-ending) {
        background:linear-gradient(to right,#f3f4f6 30%,#6b7280);
        -webkit-background-clip:text;
        background-clip:text;
        color:transparent;
      }
      .oy-signal-looks { left:14%; top:9%; }
      .oy-signal-good { left:53%; top:9%; }
      .oy-signal-why { left:9%; top:37%; }
      .oy-signal-isnt { left:44%; top:37%; }
      .oy-signal-ending.typed-line { left:16%; top:68%; color:#ffd700; font-style:normal; margin:0; min-height:1.3em; font-family:var(--mono,"JetBrains Mono",monospace); font-weight:700; text-transform:lowercase; letter-spacing:-.01em; }
      .oy-signal-sub { max-width:650px; margin:28px auto 34px; text-align:center; color:#9ca3af; font:400 12px/1.9 var(--mono,"JetBrains Mono",monospace); }
      .oy-signal-status { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:24px; }
      .oy-signal-status div { border-top:1px solid #ffd70033; padding-top:14px; color:#9ca3af; font:400 10px/1.6 var(--mono,"JetBrains Mono",monospace); letter-spacing:.12em; }
      .oy-signal-status strong { display:block; margin-top:6px; color:#ffd700; font:700 clamp(10px,1.2cqw,14px)/1.5 "Syncopate",sans-serif; letter-spacing:0; }
      @media(max-width:600px) {
        #process { width:calc(100% - 32px)!important; margin:44px auto 60px!important; }
        .oy-signal-label { gap:7px; font-size:11px; margin-bottom:22px; }
        .oy-signal-stage { aspect-ratio:600/440; }
        .oy-signal-desktop { display:none; } .oy-signal-mobile { display:block; }
        .oy-signal-title { font-size:6cqw; }
        .oy-signal-looks { left:6%; top:10%; }
        .oy-signal-good { left:55%; top:16%; }
        .oy-signal-why { left:7%; top:41%; }
        .oy-signal-isnt { left:48%; top:42%; font-size:5.6cqw; }
        .oy-signal-ending.typed-line { left:18%; top:75%; font-size:7.2cqw; }
        .oy-signal-sub { margin:22px 0 26px; text-align:left; font-size:11px; }
        .oy-signal-status { gap:12px; }
        .oy-signal-status div { font-size:8px; letter-spacing:.05em; }
      }
      @media(prefers-reduced-motion:reduce) { .oy-signal-ending .cursor { animation:none; } }
    `;
    document.head.appendChild(style);

    function pipes(mobile) {
      const paths = mobile ? [
        'M 290 -40 V 95 Q 290 140 335 140 H 640',
        'M -40 120 H 170 Q 220 120 220 170 V 210 Q 220 260 270 260 H 490 Q 540 260 540 310 V 480',
        'M -40 260 H 80 Q 125 260 125 305 V 350 Q 125 400 175 400 H 640'
      ] : [
        'M 555 -40 V 120 Q 555 185 620 185 H 1230',
        'M -50 185 H 345 Q 410 185 410 250 V 280 Q 410 345 475 345 H 970 Q 1040 345 1040 415 V 650',
        'M -50 345 H 190 Q 250 345 250 405 V 470 Q 250 540 320 540 H 1230'
      ];
      if (!mobile) paths[2] = 'M -50 345 H 65 Q 125 345 125 405 V 470 Q 125 540 195 540 H 1230';

      const labels = [
        'INFORMATION ARCHITECTURE · OFFER CLARITY · VALUE PROPOSITION · TRUST SIGNALS · USER JOURNEY · CONTENT HIERARCHY · CTA ROUTING · ',
        'INTERACTION STATE · MOBILE FRICTION · RESPONSIVE SYSTEM · ACCESSIBILITY · PERFORMANCE BUDGET · SEO SIGNALS · ANALYTICS · ',
        'QA PIPELINE · DEPLOYMENT · MONITORING · HANDOVER · PRODUCTION · LIVE HEALTH · ERROR BUDGET · CONVERSION PATH · '
      ];
      const speeds = mobile ? [18, 13, 10] : [31, 21, 15];
      const prefix = mobile ? 'oyMobilePipe' : 'oyDesktopPipe';
      const streams = paths.map((_, i) => {
        const advance = labels[i].length * 6.65;
        const count = Math.ceil((mobile ? 1800 : 2600) / advance) + 4;
        const copies = Array.from({length:count}, () =>
          `<tspan textLength="${advance}" lengthAdjust="spacingAndGlyphs">${labels[i]}</tspan>`).join('');
        const duration = advance / speeds[i];
        const direction = i === 1 ? 1 : -1;
        const to = direction < 0 ? -advance : advance;
        return `<use href="#${prefix}${i}" class="oy-pipe-edge"/><use href="#${prefix}${i}" class="oy-pipe-body"/><text dy="4" xml:space="preserve" style="white-space:pre"><textPath href="#${prefix}${i}" startOffset="0">${copies}${reducedMotion.matches ? '' : `<animate attributeName="startOffset" from="0" to="${to}" dur="${duration}s" calcMode="linear" repeatCount="indefinite"/>`}</textPath></text>`;
      }).join('');
      return `<svg class="oy-signal-svg oy-signal-${mobile ? 'mobile' : 'desktop'}" viewBox="0 0 ${mobile ? '600 440' : '1180 600'}" aria-hidden="true"><defs>${paths.map((d,i) => `<path id="${prefix}${i}" d="${d}"/>`).join('')}</defs>${streams}</svg>`;
    }

    section.innerHTML = `
      <div class="oy-signal-system">
        <div class="oy-signal-label"><span class="prompt">$</span><strong>conversion system diagnostics</strong><span class="arrow" aria-hidden="true">→</span></div>
        <div class="oy-signal-stage">
          ${pipes(false)}${pipes(true)}
          <h3 class="oy-signal-title" aria-label="Looks good. Why isn't it converting, selling or growing?">
            <span class="word oy-signal-looks" aria-hidden="true">LOOKS</span>
            <span class="word oy-signal-good" aria-hidden="true">GOOD.</span>
            <span class="word oy-signal-why" aria-hidden="true">WHY</span>
            <span class="word oy-signal-isnt" aria-hidden="true">ISN'T IT</span>
            <em class="word oy-signal-ending typed-line" aria-hidden="true"><span class="highlight"><span data-signal-word>converting?</span><span class="cursor"></span></span></em>
          </h3>
        </div>
        <p class="oy-signal-sub">I trace the route from first impression to enquiry and isolate the friction that stops a good-looking site from driving business.</p>
        <div class="oy-signal-status"><div>INPUT<strong>VISITOR INTENT</strong></div><div>DIAGNOSIS<strong>ROOT CAUSE</strong></div><div>OUTPUT<strong>CONVERSION FIX</strong></div></div>
      </div>
    `;

    const word = section.querySelector('[data-signal-word]');
    const words = ['converting?', 'selling?', 'growing?'];
    let index = 0, length = words[0].length, deleting = true, timer;
    let visible = false;
    function tick() {
      if (!visible || document.hidden || reducedMotion.matches) return;
      length += deleting ? -1 : 1;
      word.textContent = words[index].slice(0, length);
      let delay = deleting ? 55 : 105;
      if (length === 0) { deleting = false; index = (index + 1) % words.length; delay = 240; }
      else if (length === words[index].length && !deleting) { deleting = true; delay = 2400; }
      timer = window.setTimeout(tick, delay);
    }
    function syncMotion() {
      clearTimeout(timer);
      section.querySelectorAll('svg').forEach(svg => {
        const activeLayout = svg.classList.contains('oy-signal-mobile') === mobileViewport.matches;
        if (reducedMotion.matches || !visible || document.hidden || !activeLayout) svg.pauseAnimations();
        else svg.unpauseAnimations();
      });
      if (reducedMotion.matches) { index=0; length=words[0].length; deleting=true; word.textContent=words[0]; }
      else if (visible && !document.hidden) timer=window.setTimeout(tick, 1400);
    }
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(entries => { visible=entries[0].isIntersecting; syncMotion(); }, {threshold:0.1});
      observer.observe(section);
    } else { visible=true; syncMotion(); }
    mobileViewport.addEventListener('change', syncMotion);
    reducedMotion.addEventListener('change', syncMotion);
    document.addEventListener('visibilitychange', syncMotion);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', apply, { once: true });
  } else {
    apply();
  }
})();

