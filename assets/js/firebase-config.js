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

(function installHardenedDirectGatewayRouter() {
    if (!window.location || !/\/gateway\.html$/i.test(window.location.pathname)) return;
    if (window.top !== window.self) return;

    const START_ORIGIN = 'https://start.omeryigitler.com';
    let handoffInFlight = false;

    function base64Url(bytes) {
        let binary = '';
        bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
        return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
    }

    function randomVerifier() {
        const bytes = new Uint8Array(32);
        crypto.getRandomValues(bytes);
        return base64Url(bytes);
    }

    async function verifierHash(verifier) {
        const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
        return base64Url(new Uint8Array(digest));
    }

    function decodeProvider(customToken) {
        try {
            const encoded = customToken.split('.')[1] || '';
            const normalized = encoded.replace(/-/g, '+').replace(/_/g, '/');
            const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
            const payload = JSON.parse(atob(padded));
            return String(payload?.claims?.provider || payload?.provider || '');
        } catch (_) {
            return '';
        }
    }

    function postStartpageTicket(handoffToken, verifier) {
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = `${START_ORIGIN}/api/gateway/session`;
        form.style.display = 'none';

        const ticketInput = document.createElement('input');
        ticketInput.type = 'hidden';
        ticketInput.name = 'handoffToken';
        ticketInput.value = handoffToken;

        const verifierInput = document.createElement('input');
        verifierInput.type = 'hidden';
        verifierInput.name = 'verifier';
        verifierInput.value = verifier;

        const returnInput = document.createElement('input');
        returnInput.type = 'hidden';
        returnInput.name = 'return';
        returnInput.value = `${START_ORIGIN}/`;

        form.append(ticketInput, verifierInput, returnInput);
        document.body.appendChild(form);
        form.submit();
    }

    async function issueTicket(customToken, target, verifierHashValue) {
        const response = await fetch('/api/csp-report?action=handoff_issue', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            cache: 'no-store',
            body: JSON.stringify({
                customToken,
                target,
                verifierHash: verifierHashValue
            })
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok || !data.handoffToken) {
            throw new Error(data.error || 'Secure ticket issue failed');
        }
        return data.handoffToken;
    }

    async function openStartpage(customToken) {
        const verifier = randomVerifier();
        const hash = await verifierHash(verifier);
        const ticket = await issueTicket(customToken, 'startpage', hash);
        postStartpageTicket(ticket, verifier);
    }

    async function openAdmin(customToken) {
        const verifier = randomVerifier();
        const hash = await verifierHash(verifier);
        const ticket = await issueTicket(customToken, 'admin', hash);

        const redeemResponse = await fetch('/api/csp-report?action=handoff_redeem', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            cache: 'no-store',
            body: JSON.stringify({
                handoffToken: ticket,
                verifier,
                target: 'admin'
            })
        });
        const redeemed = await redeemResponse.json().catch(() => ({}));
        if (!redeemResponse.ok || !redeemed.verified) {
            throw new Error(redeemed.error || 'Secure ticket redemption failed');
        }
        if (redeemed.provider !== 'passkey' || redeemed.scope !== 'full' || !redeemed.adminCustomToken) {
            throw new Error('Admin requires a registered passkey');
        }

        await firebase.auth().setPersistence(firebase.auth.Auth.Persistence.SESSION);
        await firebase.auth().signInWithCustomToken(redeemed.adminCustomToken);
        sessionStorage.setItem('authToken', 'valid');
        localStorage.removeItem('authToken');
        localStorage.removeItem('authLockout');
        if (window.taurus_set_internal) window.taurus_set_internal();
        window.location.href = 'admin.html';
    }

    async function hardenedGrantAccess(customToken) {
        if (!customToken || handoffInFlight) return;
        handoffInFlight = true;

        try {
            if (typeof pollingInterval !== 'undefined' && pollingInterval) {
                clearInterval(pollingInterval);
            }

            const provider = decodeProvider(customToken);
            if (provider === 'telegram') {
                await openStartpage(customToken);
                return;
            }
            if (provider === 'passkey') {
                await openAdmin(customToken);
                return;
            }
            throw new Error('Unknown gateway provider');
        } catch (error) {
            console.error('Hardened gateway routing failed:', error);
            handoffInFlight = false;
            if (typeof failAuth === 'function') {
                failAuth('Secure gateway failed. Retry connection.');
            }
        }
    }

    window.grantAccess = hardenedGrantAccess;
    const installer = window.setInterval(() => {
        if (window.grantAccess !== hardenedGrantAccess) {
            window.grantAccess = hardenedGrantAccess;
        }
    }, 100);

    window.setTimeout(() => window.clearInterval(installer), 30000);
})();
