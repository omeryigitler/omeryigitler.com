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
 * Process section: flowing typography only.
 * No 01/02/03/04 state, no launch card, no pills, no nodes, no numbered panel.
 */
(function installProcessFlowOnly() {
  'use strict';

  function apply() {
    const section = document.getElementById('process');
    if (!section || section.dataset.flowOnlyReady === 'true') return;
    section.dataset.flowOnlyReady = 'true';

    const style = document.createElement('style');
    style.id = 'oy-process-flow-only-style';
    style.textContent = `
      #process {
        position: relative !important;
        width: min(1180px, calc(100% - 48px)) !important;
        max-width: 1180px !important;
        min-height: 0 !important;
        height: auto !important;
        margin: 48px auto 80px !important;
        padding: 0 !important;
        overflow: visible !important;
      }

      #process > :not(.oy-process-flow-only) { display: none !important; }

      .oy-process-flow-only {
        position: relative;
        width: 100%;
        height: 500px;
        overflow: hidden;
        border-top: 1px solid rgba(255,255,255,.08);
        border-bottom: 1px solid rgba(255,255,255,.08);
        background:
          radial-gradient(circle at 50% 50%, rgba(255,215,0,.045), transparent 38%),
          linear-gradient(rgba(255,215,0,.025) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255,215,0,.025) 1px, transparent 1px),
          #050505;
        background-size: 100% 100%, 48px 48px, 48px 48px, auto;
        isolation: isolate;
      }

      .oy-process-flow-only::before,
      .oy-process-flow-only::after {
        content: '';
        position: absolute;
        top: 0;
        bottom: 0;
        width: 150px;
        z-index: 3;
        pointer-events: none;
      }

      .oy-process-flow-only::before {
        left: 0;
        background: linear-gradient(90deg, #050505 0%, rgba(5,5,5,.82) 35%, transparent 100%);
      }

      .oy-process-flow-only::after {
        right: 0;
        background: linear-gradient(270deg, #050505 0%, rgba(5,5,5,.82) 35%, transparent 100%);
      }

      .oy-flow-svg {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        overflow: visible;
      }

      .oy-flow-guide {
        fill: none;
        stroke: rgba(255,215,0,.07);
        stroke-width: 1.25;
      }

      .oy-flow-svg text {
        fill: #ffd700;
        font-family: var(--mono, "JetBrains Mono", monospace);
        font-size: 12px;
        font-weight: 700;
        letter-spacing: .2em;
        text-transform: uppercase;
        text-shadow: 0 0 14px rgba(255,215,0,.26);
      }

      .oy-flow-svg text.flow-dim { fill: rgba(255,215,0,.66); }
      .oy-flow-svg text.flow-soft { fill: rgba(255,215,0,.42); }

      @media (max-width: 899px) {
        #process {
          width: min(100% - 24px, 720px) !important;
          margin: 32px auto 56px !important;
        }
        .oy-process-flow-only { height: 420px; }
        .oy-process-flow-only::before,
        .oy-process-flow-only::after { width: 56px; }
        .oy-flow-svg text { font-size: 10px; letter-spacing: .16em; }
      }

      @media (max-width: 560px) {
        .oy-process-flow-only { height: 360px; }
        .oy-flow-svg text { font-size: 9px; }
      }

      @media (prefers-reduced-motion: reduce) {
        .oy-flow-svg animate { display: none; }
      }
    `;
    document.head.appendChild(style);

    section.innerHTML = `
      <div class="oy-process-flow-only" aria-label="Build system signal flow">
        <svg class="oy-flow-svg" viewBox="0 0 1180 500" preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <path id="oyFlowA" d="M -260 105 C 40 105 170 105 360 105 S 720 105 930 105 S 1190 105 1440 105" />
            <path id="oyFlowB" d="M -220 220 C 80 220 190 220 330 220 C 500 220 500 300 675 300 C 850 300 850 220 1020 220 C 1140 220 1250 220 1400 220" />
            <path id="oyFlowC" d="M -220 385 C 20 385 150 385 310 385 C 470 385 500 330 650 330 C 790 330 850 385 1020 385 C 1160 385 1260 385 1420 385" />
            <path id="oyFlowD" d="M 980 -140 C 980 30 980 90 980 150 C 980 245 1065 245 1065 340 C 1065 405 1065 470 1065 620" />
          </defs>

          <use href="#oyFlowA" class="oy-flow-guide" />
          <use href="#oyFlowB" class="oy-flow-guide" />
          <use href="#oyFlowC" class="oy-flow-guide" />
          <use href="#oyFlowD" class="oy-flow-guide" />

          <text>
            <textPath href="#oyFlowA" startOffset="-100%">STRATEGY · OFFER CLARITY · USER JOURNEY · TRUST SIGNALS · STRATEGY · OFFER CLARITY · USER JOURNEY · TRUST SIGNALS ·
              <animate attributeName="startOffset" from="-100%" to="0%" dur="20s" repeatCount="indefinite" />
            </textPath>
          </text>

          <text class="flow-dim">
            <textPath href="#oyFlowB" startOffset="0%">INTERFACE · PROOF · RESPONSIVE · ACCESSIBILITY · INTERFACE · PROOF · RESPONSIVE · ACCESSIBILITY ·
              <animate attributeName="startOffset" from="0%" to="-100%" dur="24s" repeatCount="indefinite" />
            </textPath>
          </text>

          <text>
            <textPath href="#oyFlowC" startOffset="-100%">DEVELOPMENT · PERFORMANCE · SEO · ANALYTICS · DEVELOPMENT · PERFORMANCE · SEO · ANALYTICS ·
              <animate attributeName="startOffset" from="-100%" to="0%" dur="18s" repeatCount="indefinite" />
            </textPath>
          </text>

          <text class="flow-soft">
            <textPath href="#oyFlowD" startOffset="-100%">QA · DOMAIN · MONITORING · HANDOVER · LIVE · QA · DOMAIN · MONITORING · HANDOVER · LIVE ·
              <animate attributeName="startOffset" from="-100%" to="0%" dur="22s" repeatCount="indefinite" />
            </textPath>
          </text>
        </svg>
      </div>
    `;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', apply, { once: true });
  } else {
    apply();
  }
})();
