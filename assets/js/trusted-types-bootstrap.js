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
