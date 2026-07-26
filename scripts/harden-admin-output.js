const fs = require('node:fs');
const path = require('node:path');

const adminPath = path.join(process.cwd(), 'admin.html');
let html = fs.readFileSync(adminPath, 'utf8');

function replaceOne(pattern, replacement, label) {
  let count = 0;
  html = html.replace(pattern, (...args) => {
    count += 1;
    return typeof replacement === 'function' ? replacement(...args) : replacement;
  });
  if (count !== 1) {
    throw new Error(`[admin-hardening] ${label}: expected one match, found ${count}`);
  }
}

if (!html.includes('style="visibility:hidden"')) {
  replaceOne(
    /<body class="bg-obsidian text-white font-body h-screen flex overflow-hidden">/,
    '<body class="bg-obsidian text-white font-body h-screen flex overflow-hidden" style="visibility:hidden">',
    'body visibility guard',
  );
}

replaceOne(
  /\s*<!--AUTH GUARD-->\s*<script>\s*if \(sessionStorage\.getItem\('authToken'\).*?<\/script>\s*/s,
  '\n    <!-- Authentication is verified with fresh Firebase admin claims below. -->\n',
  'legacy localStorage auth guard',
);

const verifiedAuthBlock = `        document.addEventListener('DOMContentLoaded', async () => {
            const rejectAdminSession = async () => {
                try { if (window.firebase && firebase.auth) await firebase.auth().signOut(); } catch (_) {}
                try {
                    sessionStorage.removeItem('authToken');
                    localStorage.removeItem('authToken');
                } catch (_) {}
                window.location.replace('gateway.html');
            };

            try {
                if (!window.firebaseConfig || window.firebaseConfig.apiKey === "BURAYA_API_KEY_GELECEK") {
                    throw new Error('Firebase configuration unavailable');
                }
                if (!firebase.apps.length) firebase.initializeApp(window.firebaseConfig);
                const auth = firebase.auth();
                await auth.setPersistence(firebase.auth.Auth.Persistence.SESSION);

                auth.onAuthStateChanged(async (user) => {
                    if (!user || user.isAnonymous) return rejectAdminSession();
                    try {
                        const tokenResult = await user.getIdTokenResult(true);
                        const claims = tokenResult.claims || {};
                        if (claims.admin !== true || claims.role !== 'admin') return rejectAdminSession();

                        db = firebase.firestore();
                        window.db = db;
                        window.auth = auth;
                        if (firebase.storage) window.storage = firebase.storage();
                        document.body.style.visibility = 'visible';

                        setupRealtimeListeners();
                        loadTrafficChart();
                        startAutoPipelineListener();
                        setInterval(() => {
                            const ping = Math.floor(Math.random() * 15) + 12;
                            const metaEl = document.getElementById('live-metadata');
                            if (metaEl) metaEl.innerText = \`MS-Pulse: \${ping}ms\`;
                        }, 3000);
                    } catch (error) {
                        console.error('Admin claim verification failed:', error);
                        return rejectAdminSession();
                    }
                });
            } catch (error) {
                console.error('Admin authentication initialization failed:', error);
                return rejectAdminSession();
            }
        });

        // POST MESSAGE LISTENER - Pricing Tool Integration`;

replaceOne(
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
                return safeValue.replace(new RegExp(\`(\${safeQuery})\`, 'gi'), '<span class="search-highlight">$1</span>');
            } catch (_) {
                return safeValue;
            }
        }

        function filterMessages`;

replaceOne(
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

replaceOne(
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

replaceOne(
  /\s{12}async function saveTelegramInitial\(\) \{.*?\s{12}securitySettingsInitialized = true;/s,
  `\n${managedTelegramBlock}`,
  'browser-side Telegram secret removal',
);

// Fail closed if a Telegram bot credential would still be shipped in static HTML.
if (/\b\d{8,12}:[A-Za-z0-9_-]{30,}\b/.test(html)) {
  throw new Error('[admin-hardening] Telegram bot credential remains in generated admin.html');
}

fs.writeFileSync(adminPath, html, 'utf8');
console.log('[admin-hardening] Generated admin.html passed authentication, secret and XSS checks.');
