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
 * Process section inspired by AppSignal's animated pipe typography,
 * translated into the Taurus engineering / conversion language.
 */
(function installTechnicalSignalSection() {
  'use strict';

  function apply() {
    const section = document.getElementById('process');
    if (!section || section.dataset.technicalSignalReady === 'true') return;
    section.dataset.technicalSignalReady = 'true';

    const style = document.createElement('style');
    style.id = 'oy-technical-signal-style';
    style.textContent = `
      #process {
        position: relative !important;
        width: min(1180px, calc(100% - 48px)) !important;
        max-width: 1180px !important;
        min-height: 0 !important;
        height: auto !important;
        margin: 54px auto 86px !important;
        padding: 0 !important;
        overflow: visible !important;
      }

      #process > :not(.oy-signal-system) { display: none !important; }

      .oy-signal-system {
        position: relative;
        width: 100%;
        height: 620px;
        overflow: hidden;
        border: 1px solid rgba(255,255,255,.08);
        border-radius: 26px;
        background:
          radial-gradient(circle at 50% 44%, rgba(255,215,0,.07), transparent 28%),
          linear-gradient(rgba(255,215,0,.025) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255,215,0,.025) 1px, transparent 1px),
          #050505;
        background-size: 100% 100%, 48px 48px, 48px 48px, auto;
        isolation: isolate;
        box-shadow: inset 0 0 0 1px rgba(255,215,0,.025);
      }

      .oy-signal-system::after {
        content: '';
        position: absolute;
        inset: 0;
        z-index: 1;
        pointer-events: none;
        background:
          linear-gradient(90deg, rgba(5,5,5,.88), transparent 14%, transparent 86%, rgba(5,5,5,.88)),
          linear-gradient(180deg, rgba(5,5,5,.7), transparent 12%, transparent 88%, rgba(5,5,5,.7));
      }

      .oy-signal-svg {
        position: absolute;
        inset: 0;
        z-index: 2;
        width: 100%;
        height: 100%;
        overflow: visible;
        pointer-events: none;
      }

      .oy-pipe-shadow,
      .oy-pipe-body,
      .oy-pipe-core {
        fill: none;
        stroke-linecap: round;
        stroke-linejoin: round;
      }

      .oy-pipe-shadow { stroke: rgba(255,215,0,.055); stroke-width: 46; }
      .oy-pipe-body { stroke: rgba(255,215,0,.19); stroke-width: 38; }
      .oy-pipe-core { stroke: rgba(255,215,0,.075); stroke-width: 13; }

      .oy-signal-svg text {
        fill: rgba(255,215,0,.92);
        font-family: var(--mono, "JetBrains Mono", monospace);
        font-size: 11px;
        font-weight: 700;
        letter-spacing: .16em;
        text-transform: uppercase;
        text-shadow: 0 0 12px rgba(255,215,0,.3);
      }

      .oy-signal-svg text.oy-dim { fill: rgba(255,215,0,.62); }

      .oy-signal-dot {
        fill: #ffd700;
        filter: drop-shadow(0 0 8px rgba(255,215,0,.9));
      }

      .oy-signal-copy {
        position: absolute;
        z-index: 5;
        left: 50%;
        top: 49%;
        width: min(720px, calc(100% - 180px));
        transform: translate(-50%, -50%);
        text-align: center;
      }

      .oy-signal-label {
        margin-bottom: 16px;
        color: #8e939b;
        font-family: var(--mono, "JetBrains Mono", monospace);
        font-size: 10px;
        font-weight: 700;
        letter-spacing: .2em;
        text-transform: uppercase;
      }

      .oy-signal-label::before {
        content: '$';
        margin-right: 10px;
        color: #ffd700;
      }

      .oy-signal-title {
        margin: 0;
        color: #f3f3ef;
        font-family: "Syncopate", sans-serif;
        font-size: clamp(34px, 5.3vw, 66px);
        font-weight: 700;
        line-height: .98;
        letter-spacing: -.045em;
        text-transform: uppercase;
      }

      .oy-signal-title em {
        color: #ffd700;
        font-style: normal;
      }

      .oy-signal-sub {
        max-width: 620px;
        margin: 22px auto 0;
        color: #8f949c;
        font-family: var(--mono, "JetBrains Mono", monospace);
        font-size: 11px;
        line-height: 1.7;
      }

      .oy-signal-status {
        position: absolute;
        z-index: 5;
        left: 30px;
        right: 30px;
        bottom: 24px;
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 24px;
      }

      .oy-signal-status div {
        padding-top: 13px;
        border-top: 1px solid rgba(255,215,0,.2);
        color: #858a92;
        font-family: var(--mono, "JetBrains Mono", monospace);
        font-size: 9px;
        font-weight: 700;
        letter-spacing: .15em;
        text-transform: uppercase;
      }

      .oy-signal-status strong {
        display: block;
        margin-top: 6px;
        color: #ffd700;
        font-family: "Syncopate", sans-serif;
        font-size: 13px;
        letter-spacing: .04em;
      }

      @media (max-width: 899px) {
        #process {
          width: min(100% - 24px, 720px) !important;
          margin: 36px auto 60px !important;
        }
        .oy-signal-system { height: 590px; border-radius: 22px; }
        .oy-signal-copy { width: calc(100% - 72px); }
        .oy-signal-title { font-size: clamp(30px, 8vw, 48px); }
        .oy-pipe-shadow { stroke-width: 35; }
        .oy-pipe-body { stroke-width: 29; }
        .oy-pipe-core { stroke-width: 10; }
        .oy-signal-svg text { font-size: 9px; }
      }

      @media (max-width: 560px) {
        .oy-signal-system { height: 560px; }
        .oy-signal-copy { width: calc(100% - 44px); top: 46%; }
        .oy-signal-title { font-size: 31px; }
        .oy-signal-sub { font-size: 10px; }
        .oy-signal-status {
          left: 18px;
          right: 18px;
          bottom: 17px;
          gap: 10px;
        }
        .oy-signal-status div { font-size: 7px; letter-spacing: .1em; }
        .oy-signal-status strong { font-size: 9px; }
      }

      @media (prefers-reduced-motion: reduce) {
        .oy-signal-svg animate,
        .oy-signal-svg animateMotion { display: none; }
      }
    `;
    document.head.appendChild(style);

    section.innerHTML = `
      <div class="oy-signal-system" aria-label="Technical conversion signal system">
        <svg class="oy-signal-svg" viewBox="0 0 1180 620" preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <path id="oyTechA" d="M -90 150 H 210 Q 280 150 280 82 Q 280 38 330 38 H 650 Q 708 38 708 96 V 132 Q 708 192 770 192 H 1260" />
            <path id="oyTechB" d="M 60 410 H 300 Q 365 410 365 350 V 300 Q 365 240 425 240 H 520 Q 580 240 580 300 V 390 Q 580 452 642 452 H 838 Q 900 452 900 390 V 340 Q 900 280 960 280 H 1240" />
            <path id="oyTechC" d="M 1005 -40 V 130 Q 1005 186 1060 186 H 1092 Q 1148 186 1148 242 V 458 Q 1148 514 1092 514 H 980 Q 924 514 924 570 V 680" />
          </defs>

          <use href="#oyTechA" class="oy-pipe-shadow" />
          <use href="#oyTechB" class="oy-pipe-shadow" />
          <use href="#oyTechC" class="oy-pipe-shadow" />
          <use href="#oyTechA" class="oy-pipe-body" />
          <use href="#oyTechB" class="oy-pipe-body" />
          <use href="#oyTechC" class="oy-pipe-body" />
          <use href="#oyTechA" class="oy-pipe-core" />
          <use href="#oyTechB" class="oy-pipe-core" />
          <use href="#oyTechC" class="oy-pipe-core" />

          <text>
            <textPath href="#oyTechA" startOffset="-100%">INFORMATION ARCHITECTURE · OFFER CLARITY · TRUST SIGNALS · CTA ROUTING · CONTENT HIERARCHY ·
              <animate attributeName="startOffset" from="-100%" to="0%" dur="18s" repeatCount="indefinite" />
            </textPath>
          </text>

          <text class="oy-dim">
            <textPath href="#oyTechB" startOffset="0%">MOBILE FRICTION · RESPONSIVE STATE · ACCESSIBILITY · PERFORMANCE BUDGET · SEO SIGNALS · ANALYTICS ·
              <animate attributeName="startOffset" from="0%" to="-100%" dur="22s" repeatCount="indefinite" />
            </textPath>
          </text>

          <text>
            <textPath href="#oyTechC" startOffset="-100%">QA PIPELINE · DOMAIN · DEPLOYMENT · MONITORING · HANDOVER · PRODUCTION ·
              <animate attributeName="startOffset" from="-100%" to="0%" dur="16s" repeatCount="indefinite" />
            </textPath>
          </text>

          <circle class="oy-signal-dot" r="4.5">
            <animateMotion dur="7.5s" repeatCount="indefinite"><mpath href="#oyTechA" /></animateMotion>
          </circle>
          <circle class="oy-signal-dot" r="4.5">
            <animateMotion dur="9s" repeatCount="indefinite"><mpath href="#oyTechB" /></animateMotion>
          </circle>
          <circle class="oy-signal-dot" r="4.5">
            <animateMotion dur="8s" repeatCount="indefinite"><mpath href="#oyTechC" /></animateMotion>
          </circle>
        </svg>

        <div class="oy-signal-copy">
          <div class="oy-signal-label">conversion system diagnostics</div>
          <h3 class="oy-signal-title">WHERE DOES THE<br><em>SIGNAL BREAK?</em></h3>
          <p class="oy-signal-sub">I trace the path from first impression to enquiry: structure, trust, interaction, performance and the final contact route.</p>
        </div>

        <div class="oy-signal-status">
          <div>INPUT<strong>SIGNAL LOSS</strong></div>
          <div>DIAGNOSIS<strong>ROOT CAUSE</strong></div>
          <div>OUTPUT<strong>SYSTEM FIX</strong></div>
        </div>
      </div>
    `;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', apply, { once: true });
  } else {
    apply();
  }
})();
