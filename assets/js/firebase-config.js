// Firebase Configuration
// Ömer Yiğitler - Web App
const firebaseConfig = {
    apiKey: "AIzaSyC0DAIT0cVPD4WFpfgqrn0lfb-kyFRsnWM",
    authDomain: "omeryigitler-5abfb.firebaseapp.com",
    projectId: "omeryigitler-5abfb",
    storageBucket: "omeryigitler-5abfb.firebasestorage.app",
    messagingSenderId: "1082547983896",
    appId: "1:1082547983896:web:ac493bc4092f6cdae7156d",
    measurementId: "G-FX3R67T7S7"
};

// Global Exposure
window.firebaseConfig = firebaseConfig;

(function ensureGatewayTelegramWebhook() {
    const pathname = window.location?.pathname || '';
    if (!/\/(?:gateway|start-gateway)\.html$/i.test(pathname)) return;

    window.taurusWebhookReady = fetch('/api/telegram-webhook-health', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
        cache: 'no-store',
        keepalive: true
    })
        .then(async (response) => {
            const data = await response.json().catch(() => ({}));
            if (!response.ok || data.ok !== true) {
                throw new Error(data.error || `Webhook health failed (${response.status})`);
            }
            console.log('✅ Telegram webhook ready');
            return true;
        })
        .catch((error) => {
            console.error('❌ Telegram webhook unavailable:', error);
            return false;
        });
})();

(function injectTaurusFreezeLayoutFix() {
    const styleId = 'taurus-freeze-layout-fix';

    function applyFix() {
        const existing = document.getElementById(styleId);
        if (existing) {
            existing.remove();
        }

        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            #taurus-overlay.mode-freeze #taurus-custom-msg {
                display: block !important;
                width: min(90vw, 520px) !important;
                max-width: min(90vw, 520px) !important;
                margin: 5.25rem auto 0 auto !important;
                text-align: center !important;
                transform: translateY(0.75rem);
                line-height: 1.25 !important;
            }

            @media (max-height: 760px) {
                #taurus-overlay.mode-freeze #taurus-custom-msg {
                    margin-top: 4rem !important;
                    transform: translateY(0.25rem);
                    font-size: 1.2rem !important;
                }
            }

            @media (max-width: 640px) {
                #taurus-overlay.mode-freeze #taurus-custom-msg {
                    margin-top: 4.5rem !important;
                    max-width: 86vw !important;
                    font-size: 1.1rem !important;
                    letter-spacing: 0.08em !important;
                }
            }
        `;
        document.head.appendChild(style);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', applyFix, { once: true });
    } else {
        applyFix();
    }

    window.addEventListener('load', () => setTimeout(applyFix, 250), { once: true });
})();

// AUTO-INITIALIZE
const shouldAutoInitializeFirebase =
    !(window.location && /\/admin\.html$/i.test(window.location.pathname));

if (typeof firebase !== 'undefined' && shouldAutoInitializeFirebase) {
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
        console.log("🔥 Firebase Initialized");
    }
    // Global DB Access
    if (typeof firebase.firestore === 'function') {
        window.db = firebase.firestore();
    }
    if (typeof firebase.auth === 'function') {
        window.auth = firebase.auth();
    }
    if (typeof firebase.storage === 'function') {
        window.storage = firebase.storage();
    }
    console.log("✅ Window.DB & Storage Exposed");
} else if (typeof firebase !== 'undefined') {
    console.log("Firebase auto-init skipped for admin-managed initialization.");
} else {
    console.error("❌ Firebase SDK not found!");
}
