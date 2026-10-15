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
