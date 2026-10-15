/*
 * Trusted Types compatibility policy.
 *
 * The site still contains legacy innerHTML-based UI builders. The default policy
 * keeps those existing templates working while enforcing a strict allowlist for
 * dynamically assigned script URLs. This lets `require-trusted-types-for 'script'`
 * run in production without breaking the current design or third-party services.
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
      // Existing UI templates are authored locally and dynamic values are escaped
      // before interpolation. Script URL sinks receive the stricter check above.
      createHTML: (value) => String(value),
      createScript: (value) => String(value),
      createScriptURL
    });
  } catch (error) {
    // A duplicated policy should not prevent the rest of the page from loading.
    console.warn('[security] Trusted Types policy could not be installed.', error);
  }
})();

/*
 * Philosophy composition repair.
 *
 * The section's legacy `overflow: hidden` clips the TAURUS watermark exactly at
 * the shared 1180px section boundary. The watermark is intentionally wider than
 * that content column, so it must live on a viewport-wide visual layer while the
 * manifesto copy stays in the normal section column.
 */
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
        #philosophy.philosophy {
          overflow: visible !important;
        }

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
 * Process / build system — static launch panel with flowing typography only.
 *
 * The previous branch version mixed scroll-driven panels, tunnel nodes, pulses and
 * multiple depth effects. Keep the content completely fixed and let the lettering
 * be the only moving element. The paths stay structural and quiet behind the card.
 */
(function installStaticProcessFlow() {
  'use strict';

  function apply() {
    const section = document.getElementById('process');
    if (!section || section.dataset.staticFlowReady === 'true') return;
    section.dataset.staticFlowReady = 'true';

    const style = document.createElement('style');
    style.id = 'oy-process-static-flow-style';
    style.textContent = `
      #process {
        position: relative !important;
        width: min(1130px, calc(100% - 48px)) !important;
        max-width: 1130px !important;
        height: auto !important;
        min-height: 0 !important;
        margin: 56px auto 72px !important;
        padding: 0 !important;
        overflow: visible !important;
      }

      #process > :not(.oyp-static) { display: none !important; }

      .oyp-static {
        position: relative;
        width: 100%;
        height: 720px;
        overflow: hidden;
        border: 1px solid rgba(255,255,255,.09);
        border-radius: 27px;
        background:
          radial-gradient(circle at 53% 48%, rgba(255,215,0,.055), transparent 33%),
          linear-gradient(rgba(255,215,0,.028) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255,215,0,.028) 1px, transparent 1px),
          #050505;
        background-size: 100% 100%, 48px 48px, 48px 48px, auto;
        isolation: isolate;
        box-shadow: 0 24px 70px rgba(0,0,0,.24), inset 0 0 0 1px rgba(255,215,0,.025);
      }

      .oyp-static::after {
        content: '';
        position: absolute;
        left: 0;
        right: 0;
        bottom: 0;
        height: 3px;
        z-index: 8;
        background: #ffd700;
        box-shadow: 0 0 18px rgba(255,215,0,.52);
      }

      .oyp-head {
        position: absolute;
        left: 0;
        right: 0;
        top: 0;
        height: 64px;
        z-index: 10;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0 28px;
        border-bottom: 1px solid rgba(255,255,255,.07);
        background: rgba(4,4,4,.58);
        font-family: var(--mono, "JetBrains Mono", monospace);
        font-size: 9px;
        font-weight: 700;
        letter-spacing: .17em;
        text-transform: uppercase;
        color: #747a84;
      }

      .oyp-head-left::before {
        content: '$';
        margin-right: 12px;
        color: #ffd700;
      }

      .oyp-head-right b { color: #ffd700; }
      .oyp-head-right span { margin-left: 11px; color: #70757e; }

      .oyp-guide {
        position: absolute;
        left: 44px;
        right: 44px;
        top: 108px;
        height: 1px;
        z-index: 2;
        background: rgba(255,215,0,.16);
      }

      .oyp-flow {
        position: absolute;
        inset: 64px 0 0;
        width: 100%;
        height: calc(100% - 64px);
        z-index: 2;
        overflow: visible;
        pointer-events: none;
      }

      .oyp-pipe-shadow,
      .oyp-pipe-edge,
      .oyp-pipe-core {
        fill: none;
        stroke-linecap: round;
        stroke-linejoin: round;
      }

      .oyp-pipe-shadow { stroke: rgba(255,215,0,.038); stroke-width: 34; }
      .oyp-pipe-edge { stroke: rgba(255,215,0,.11); stroke-width: 30; }
      .oyp-pipe-core { stroke: rgba(255,215,0,.055); stroke-width: 10; }

      .oyp-flow text {
        fill: rgba(255,215,0,.58);
        font-family: var(--mono, "JetBrains Mono", monospace);
        font-size: 10px;
        font-weight: 700;
        letter-spacing: .18em;
        text-transform: uppercase;
      }

      .oyp-flow text.oyp-flow-soft { fill: rgba(255,215,0,.42); }

      .oyp-card {
        position: absolute;
        z-index: 5;
        left: 68px;
        right: 68px;
        top: 176px;
        bottom: 124px;
        overflow: hidden;
        border: 1px solid rgba(255,215,0,.78);
        background:
          linear-gradient(90deg, rgba(5,5,5,.985) 0%, rgba(5,5,5,.985) 65%, rgba(7,7,5,.94) 100%);
        box-shadow: 0 0 64px rgba(255,215,0,.08), inset 0 0 0 1px rgba(255,215,0,.035);
      }

      .oyp-card::before {
        content: '';
        position: absolute;
        inset: 0;
        pointer-events: none;
        background:
          linear-gradient(rgba(255,215,0,.025) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255,215,0,.025) 1px, transparent 1px);
        background-size: 48px 48px;
        opacity: .72;
      }

      .oyp-content {
        position: relative;
        z-index: 3;
        width: 68%;
        padding: 45px 54px;
      }

      .oyp-kicker {
        margin-bottom: 20px;
        color: #ffd700;
        font-family: var(--mono, "JetBrains Mono", monospace);
        font-size: 10px;
        font-weight: 700;
        letter-spacing: .22em;
        text-transform: uppercase;
      }

      .oyp-title {
        margin: 0 0 24px;
        color: #f4f4f1;
        font-family: "Syncopate", sans-serif;
        font-size: clamp(31px, 3.35vw, 48px);
        font-weight: 700;
        line-height: 1.05;
        letter-spacing: -.025em;
        text-transform: uppercase;
      }

      .oyp-copy {
        max-width: 670px;
        margin: 0;
        color: #8b9099;
        font-family: var(--mono, "JetBrains Mono", monospace);
        font-size: 12px;
        font-weight: 500;
        line-height: 1.72;
      }

      .oyp-separator {
        width: 100%;
        height: 1px;
        margin: 25px 0 18px;
        background: rgba(255,255,255,.09);
      }

      .oyp-output {
        display: grid;
        grid-template-columns: 88px 1fr;
        gap: 16px;
        align-items: center;
        font-family: var(--mono, "JetBrains Mono", monospace);
        font-size: 9px;
        font-weight: 700;
        letter-spacing: .1em;
        text-transform: uppercase;
      }

      .oyp-output span { color: #565c65; }
      .oyp-output b { color: #bfc2c7; }

      .oyp-pills {
        display: flex;
        flex-wrap: wrap;
        gap: 9px;
        margin-top: 19px;
      }

      .oyp-pill {
        padding: 8px 14px;
        border: 1px solid rgba(255,215,0,.52);
        border-radius: 999px;
        background: rgba(255,215,0,.025);
        color: #ffd700;
        font-family: var(--mono, "JetBrains Mono", monospace);
        font-size: 8px;
        font-weight: 700;
        letter-spacing: .11em;
        text-transform: uppercase;
      }

      .oyp-number {
        position: absolute;
        z-index: 1;
        right: 42px;
        bottom: -18px;
        color: rgba(255,255,255,.052);
        font-family: "Manrope", sans-serif;
        font-size: clamp(190px, 22vw, 325px);
        font-weight: 800;
        line-height: .82;
        letter-spacing: -.085em;
        user-select: none;
      }

      @media (max-width: 899px) {
        #process {
          width: min(100% - 24px, 720px) !important;
          margin-top: 32px !important;
        }

        .oyp-static { height: 650px; border-radius: 22px; }
        .oyp-head { padding: 0 18px; font-size: 8px; }
        .oyp-guide { left: 18px; right: 18px; top: 94px; }
        .oyp-card { left: 18px; right: 18px; top: 152px; bottom: 82px; }
        .oyp-content { width: 100%; padding: 32px 26px; }
        .oyp-title { font-size: clamp(28px, 7vw, 42px); }
        .oyp-copy { font-size: 11px; }
        .oyp-number { right: 16px; bottom: -5px; font-size: 160px; }
        .oyp-flow { opacity: .62; }
        .oyp-pipe-shadow { stroke-width: 25; }
        .oyp-pipe-edge { stroke-width: 21; }
        .oyp-pipe-core { stroke-width: 7; }
        .oyp-flow text { font-size: 8px; }
      }

      @media (max-width: 560px) {
        .oyp-static { height: 620px; }
        .oyp-head-right span { display: none; }
        .oyp-card { top: 142px; bottom: 70px; }
        .oyp-content { padding: 28px 22px; }
        .oyp-output { grid-template-columns: 1fr; gap: 7px; }
        .oyp-number { font-size: 132px; }
      }

      @media (prefers-reduced-motion: reduce) {
        .oyp-flow animate { display: none; }
      }
    `;
    document.head.appendChild(style);

    section.innerHTML = `
      <div class="oyp-static">
        <div class="oyp-head">
          <div class="oyp-head-left">PROCESS / BUILD SYSTEM</div>
          <div class="oyp-head-right"><b>04 / 04</b><span>— LAUNCH</span></div>
        </div>
        <div class="oyp-guide"></div>

        <svg class="oyp-flow" viewBox="0 0 1130 656" preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <path id="oypPathTop" d="M -120 105 H 660 Q 735 105 735 165 H 1130" />
            <path id="oypPathRight" d="M 960 -60 V 80 Q 960 135 1015 135 H 1055 Q 1110 135 1110 190 V 455 Q 1110 515 1050 515 H 815 Q 760 515 760 570 V 720" />
            <path id="oypPathLower" d="M 1190 405 H 1030 Q 960 405 960 475 Q 960 535 900 535 H 690" />
          </defs>

          <use href="#oypPathTop" class="oyp-pipe-shadow" />
          <use href="#oypPathRight" class="oyp-pipe-shadow" />
          <use href="#oypPathLower" class="oyp-pipe-shadow" />
          <use href="#oypPathTop" class="oyp-pipe-edge" />
          <use href="#oypPathRight" class="oyp-pipe-edge" />
          <use href="#oypPathLower" class="oyp-pipe-edge" />
          <use href="#oypPathTop" class="oyp-pipe-core" />
          <use href="#oypPathRight" class="oyp-pipe-core" />
          <use href="#oypPathLower" class="oyp-pipe-core" />

          <text>
            <textPath href="#oypPathTop" startOffset="-100%">QA · DOMAIN · MONITORING · HANDOVER · LIVE PROOF · SUPPORT · QA · DOMAIN · MONITORING · HANDOVER · LIVE PROOF · SUPPORT ·
              <animate attributeName="startOffset" from="-100%" to="0%" dur="22s" repeatCount="indefinite" />
            </textPath>
          </text>
          <text class="oyp-flow-soft">
            <textPath href="#oypPathRight" startOffset="-100%">INTERFACE · PROOF · PERFORMANCE · LAUNCH READY · RESPONSIVE QA · USER FLOW · INTERFACE · PROOF · PERFORMANCE · LAUNCH READY ·
              <animate attributeName="startOffset" from="-100%" to="0%" dur="25s" repeatCount="indefinite" />
            </textPath>
          </text>
          <text>
            <textPath href="#oypPathLower" startOffset="100%">DESKTOP QA · MOBILE QA · FINAL CHECK · DEPLOYMENT · DESKTOP QA · MOBILE QA · FINAL CHECK · DEPLOYMENT ·
              <animate attributeName="startOffset" from="100%" to="0%" dur="19s" repeatCount="indefinite" />
            </textPath>
          </text>
        </svg>

        <div class="oyp-card">
          <div class="oyp-content">
            <div class="oyp-kicker">04 / LAUNCH</div>
            <h3 class="oyp-title">LIVE PROJECT PROOF</h3>
            <p class="oyp-copy">The system finishes as real work: tested on desktop and phone, connected to the domain, monitored, and prepared for handover.</p>
            <div class="oyp-separator"></div>
            <div class="oyp-output"><span>OUTPUT</span><b>QA · DOMAIN · MONITORING · HANDOVER</b></div>
            <div class="oyp-pills">
              <span class="oyp-pill">DESKTOP QA</span>
              <span class="oyp-pill">MOBILE QA</span>
              <span class="oyp-pill">LIVE LAUNCH</span>
            </div>
          </div>
          <div class="oyp-number" aria-hidden="true">04</div>
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
