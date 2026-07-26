const fs = require('node:fs');
const path = require('node:path');

const root = process.cwd();
const adminPath = path.join(root, 'admin.html');
const gatewayPath = path.join(root, 'gateway.html');
const runtimePath = path.join(root, 'assets/js/system-modals.js');

let html = fs.readFileSync(adminPath, 'utf8');
let gateway = fs.readFileSync(gatewayPath, 'utf8');
let runtime = fs.readFileSync(runtimePath, 'utf8');

function replaceOne(source, pattern, replacement, label) {
  let count = 0;
  const output = source.replace(pattern, (...args) => {
    count += 1;
    return typeof replacement === 'function' ? replacement(...args) : replacement;
  });
  if (count !== 1) {
    throw new Error(`[admin-hardening] ${label}: expected one match, found ${count}`);
  }
  return output;
}

if (!html.includes('style="visibility:hidden"')) {
  html = replaceOne(
    html,
    /<body class="bg-obsidian text-white font-body h-screen flex overflow-hidden">/,
    '<body class="bg-obsidian text-white font-body h-screen flex overflow-hidden" style="visibility:hidden">',
    'body visibility guard',
  );
}

html = replaceOne(
  html,
  /\s*<!--AUTH GUARD-->\s*<script>\s*if \(sessionStorage\.getItem\('authToken'\).*?<\/script>\s*/s,
  '\n    <!-- Authentication is verified with fresh Firebase admin claims below. -->\n',
  'legacy localStorage auth guard',
);

const verifiedAuthBlock = `        document.addEventListener('DOMContentLoaded', async () => {
            const overlay = document.createElement('div');
            overlay.id = 'taurus-auth-verification';
            overlay.setAttribute('role', 'status');
            overlay.innerHTML = \
                '<div style="width:86px;height:86px;border:1px solid rgba(255,215,0,.65);border-radius:50%;display:grid;place-items:center;box-shadow:0 0 36px rgba(255,215,0,.18);margin-bottom:24px">' +
                '<div style="width:14px;height:14px;border-radius:50%;background:#FFD700;box-shadow:0 0 20px #FFD700;animation:taurusAuthPulse 1.2s ease-in-out infinite"></div></div>' +
                '<strong style="font-family:JetBrains Mono,monospace;font-size:12px;letter-spacing:.22em;color:#FFD700">VERIFYING SECURE SESSION</strong>' +
                '<span id="taurus-auth-detail" style="font-family:JetBrains Mono,monospace;font-size:10px;letter-spacing:.12em;color:#777;margin-top:12px">FIREBASE ADMIN CLAIM CHECK</span>';
            overlay.style.cssText = 'position:fixed;inset:0;z-index:2147483647;background:#050505;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center';
            const style = document.createElement('style');
            style.textContent = '@keyframes taurusAuthPulse{0%,100%{opacity:.35;transform:scale(.78)}50%{opacity:1;transform:scale(1.12)}}';
            document.head.appendChild(style);
            document.body.appendChild(overlay);
            document.body.style.visibility = 'visible';

            const detail = () => document.getElementById('taurus-auth-detail');
            const rejectAdminSession = async (message = 'SESSION INVALID — RETURNING TO GATEWAY') => {
                const detailEl = detail();
                if (detailEl) {
                    detailEl.textContent = message;
                    detailEl.style.color = '#ef4444';
                }
                try { if (window.firebase && firebase.auth) await firebase.auth().signOut(); } catch (_) {}
                try {
                    sessionStorage.removeItem('authToken');
                    localStorage.removeItem('authToken');
                } catch (_) {}
                window.setTimeout(() => window.location.replace('gateway.html'), 700);
            };

            const waitForUser = (auth, timeoutMs = 8000) => new Promise((resolve) => {
                if (auth.currentUser) return resolve(auth.currentUser);
                let settled = false;
                const timer = window.setTimeout(() => {
                    if (settled) return;
                    settled = true;
                    unsubscribe();
                    resolve(null);
                }, timeoutMs);
                const unsubscribe = auth.onAuthStateChanged((user) => {
                    if (settled) return;
                    settled = true;
                    window.clearTimeout(timer);
                    unsubscribe();
                    resolve(user || null);
                });
            });

            try {
                if (!window.firebaseConfig || window.firebaseConfig.apiKey === 'BURAYA_API_KEY_GELECEK') {
                    throw new Error('Firebase configuration unavailable');
                }
                if (!firebase.apps.length) firebase.initializeApp(window.firebaseConfig);
                const auth = firebase.auth();
                const user = await waitForUser(auth);
                if (!user || user.isAnonymous) return rejectAdminSession('NO VERIFIED ADMIN SESSION');

                let tokenResult = await user.getIdTokenResult(false);
                let claims = tokenResult.claims || {};
                if (claims.admin !== true || claims.role !== 'admin') {
                    tokenResult = await user.getIdTokenResult(true);
                    claims = tokenResult.claims || {};
                }
                if (claims.admin !== true || claims.role !== 'admin') {
                    return rejectAdminSession('ADMIN CLAIM NOT PRESENT');
                }

                db = firebase.firestore();
                window.db = db;
                window.auth = auth;
                if (firebase.storage) window.storage = firebase.storage();
                overlay.remove();

                if (!window.__taurusAdminInitialized) {
                    window.__taurusAdminInitialized = true;
                    setupRealtimeListeners();
                    loadTrafficChart();
                    startAutoPipelineListener();
                    setInterval(() => {
                        const ping = Math.floor(Math.random() * 15) + 12;
                        const metaEl = document.getElementById('live-metadata');
                        if (metaEl) metaEl.innerText = \\`MS-Pulse: \\${ping}ms\\`;
                    }, 3000);
                }
            } catch (error) {
                console.error('Admin authentication initialization failed:', error);
                return rejectAdminSession('SESSION VERIFICATION FAILED');
            }
        });

        // POST MESSAGE LISTENER - Pricing Tool Integration`;

html = replaceOne(
  html,
  /\s{8}document\.addEventListener\('DOMContentLoaded', \(\) => \{.*?\n\s{8}\}\);\n\n\s*\/\/ POST MESSAGE LISTENER - Pricing Tool Integration/s,
  `\n${verifiedAuthBlock}`,
  'Firebase admin-claim guard',
);

const safeHighlightBlock = `        function escapeHtml(value) {
            return String(value ?? '')
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;');
        }

        function escapeRegExp(value) {
            return String(value).replace(/[.*+?^\${}()|[\\]\\\\]/g, '\\\\$&');
        }

        function highlightMatch(value, query) {
            const safeValue = escapeHtml(value);
            if (!query) return safeValue;
            try {
                const safeQuery = escapeRegExp(escapeHtml(query));
                return safeValue.replace(new RegExp(\\`(\\${safeQuery})\\`, 'gi'), '<span class="search-highlight">$1</span>');
            } catch (_) {
                return safeValue;
            }
        }

        function filterMessages`;

html = replaceOne(
  html,
  /\s{8}function highlightMatch\(text, query\) \{.*?\n\s{8}\}\n\n\s{8}function filterMessages/s,
  `\n${safeHighlightBlock}`,
  'message output encoding',
);

for (const [unsafeValue, safeValue] of [
  ["${data.name || 'Anonymous'}", "${escapeHtml(data.name || 'Anonymous')}"],
  ["${data.email || ''}", "${escapeHtml(data.email || '')}"],
  ["${data.message || ''}", "${escapeHtml(data.message || '')}"],
]) {
  html = html.split(unsafeValue).join(safeValue);
}

html = replaceOne(
  html,
  "        window.addEventListener('message', async (event) => {\n",
  `        window.addEventListener('message', async (event) => {
            const pricingFrame = document.getElementById('pricing-iframe');
            if (event.origin !== window.location.origin || !pricingFrame || event.source !== pricingFrame.contentWindow) return;
 `,
  'postMessage origin validation',
);
html = html.split("}, '*');").join("}, window.location.origin);");

const managedTelegramBlock = `            async function saveTelegramInitial() {
                if (teleTokenInput) {
                    teleTokenInput.value = '';
                    teleTokenInput.disabled = true;
                    teleTokenInput.placeholder = 'Managed securely in Vercel environment variables';
                }
                if (teleChatIdInput) {
                    teleChatIdInput.value = '';
                    teleChatIdInput.disabled = true;
                    teleChatIdInput.placeholder = 'Managed securely in Vercel environment variables';
                }
            }

            if (teleTokenInput) saveTelegramInitial();

            document.getElementById('save-telegram-btn')?.addEventListener('click', async () => {
                await systemAlert(
                    'SERVER-MANAGED SECURITY',
                    'Telegram credentials are stored only in Vercel environment variables and cannot be viewed or changed in the browser.',
                    'shield-check'
                );
            });

            securitySettingsInitialized = true;`;

html = replaceOne(
  html,
  /\s{12}async function saveTelegramInitial\(\) \{.*?\s{12}securitySettingsInitialized = true;/s,
  `\n${managedTelegramBlock}`,
  'browser-side Telegram secret removal',
);

const oldGrantAccess = /\s{12}try \{\s*await firebase\.auth\(\)\.signInWithCustomToken\(customToken\);\s*\} catch \(error\) \{.*?window\.location\.href = 'admin\.html';/s;
const newGrantAccess = `            try {
                const auth = firebase.auth();
                await auth.setPersistence(firebase.auth.Auth.Persistence.SESSION);
                const credential = await auth.signInWithCustomToken(customToken);
                const tokenResult = await credential.user.getIdTokenResult(true);
                const claims = tokenResult.claims || {};
                if (claims.admin !== true || claims.role !== 'admin') {
                    throw new Error('Verified token does not contain admin claims');
                }
            } catch (error) {
                console.error('Firebase custom token sign-in failed:', error);
                failAuth('Secure session failed');
                return;
            }

            sessionStorage.setItem('authToken', 'valid');
            localStorage.removeItem('authToken');
            localStorage.removeItem('authLockout');
            if (window.taurus_set_internal) window.taurus_set_internal();
            window.location.replace('admin.html?session=' + Date.now());`;

gateway = replaceOne(gateway, oldGrantAccess, newGrantAccess, 'gateway session persistence');

runtime = runtime.replace(
  "    // Prevent protected UI from flashing before a signed Firebase admin claim is verified.\n    document.documentElement.style.visibility = 'hidden';\n",
  "    // The generated admin guard owns authentication and the verification overlay.\n",
);
runtime = replaceOne(
  runtime,
  /\s{8}\/\/ The inline admin script initializes Firebase\. Validate its resulting user with fresh claims\..*?\n\s{8}\}, 100\);/s,
  "\n        // Authentication is handled once by the generated admin guard.\n",
  'duplicate runtime auth guard removal',
);

if (/\b\d{8,12}:[A-Za-z0-9_-]{30,}\b/.test(html)) {
  throw new Error('[admin-hardening] Telegram bot credential remains in generated admin.html');
}

fs.writeFileSync(adminPath, html, 'utf8');
fs.writeFileSync(gatewayPath, gateway, 'utf8');
fs.writeFileSync(runtimePath, runtime, 'utf8');
console.log('[admin-hardening] Admin claim gate, gateway session handoff and runtime checks passed.');
