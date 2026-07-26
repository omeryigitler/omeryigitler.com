(() => {
    'use strict';

    if (!/\/admin\.html$/i.test(window.location.pathname)) return;

    const OVERLAY_ID = 'taurus-admin-recovery';
    const MAX_FIREBASE_WAIT_MS = 10000;
    const MAX_USER_WAIT_MS = 8000;

    function ensureOverlay() {
        let overlay = document.getElementById(OVERLAY_ID);
        if (overlay) return overlay;

        overlay = document.createElement('div');
        overlay.id = OVERLAY_ID;
        overlay.setAttribute('role', 'status');
        overlay.setAttribute('aria-live', 'polite');
        overlay.style.cssText = [
            'position:fixed',
            'inset:0',
            'z-index:2147483647',
            'background:#050505',
            'display:flex',
            'flex-direction:column',
            'align-items:center',
            'justify-content:center',
            'text-align:center',
            'color:#fff'
        ].join(';');
        overlay.innerHTML = [
            '<style>@keyframes taurusRecoveryPulse{0%,100%{opacity:.35;transform:scale(.78)}50%{opacity:1;transform:scale(1.12)}}</style>',
            '<div style="width:86px;height:86px;border:1px solid rgba(255,215,0,.65);border-radius:50%;display:grid;place-items:center;box-shadow:0 0 36px rgba(255,215,0,.18);margin-bottom:24px">',
            '<div style="width:14px;height:14px;border-radius:50%;background:#FFD700;box-shadow:0 0 20px #FFD700;animation:taurusRecoveryPulse 1.2s ease-in-out infinite"></div>',
            '</div>',
            '<strong style="font-family:JetBrains Mono,monospace;font-size:12px;letter-spacing:.22em;color:#FFD700">VERIFYING SECURE SESSION</strong>',
            '<span id="taurus-admin-recovery-detail" style="font-family:JetBrains Mono,monospace;font-size:10px;letter-spacing:.12em;color:#777;margin-top:12px">RESTORING ADMIN AUTH</span>'
        ].join('');
        document.body.appendChild(overlay);
        return overlay;
    }

    function setStatus(message, error = false) {
        const detail = document.getElementById('taurus-admin-recovery-detail');
        if (!detail) return;
        detail.textContent = message;
        detail.style.color = error ? '#ef4444' : '#777';
    }

    function waitForFirebase(timeoutMs) {
        const startedAt = Date.now();
        return new Promise((resolve) => {
            const timer = window.setInterval(() => {
                const ready = Boolean(
                    window.firebase &&
                    window.firebaseConfig &&
                    window.firebase.auth
                );
                if (ready || Date.now() - startedAt >= timeoutMs) {
                    window.clearInterval(timer);
                    resolve(ready);
                }
            }, 100);
        });
    }

    function waitForUser(auth, timeoutMs) {
        return new Promise((resolve) => {
            if (auth.currentUser) {
                resolve(auth.currentUser);
                return;
            }

            let settled = false;
            let unsubscribe = () => {};
            const timer = window.setTimeout(() => {
                if (settled) return;
                settled = true;
                unsubscribe();
                resolve(null);
            }, timeoutMs);

            unsubscribe = auth.onAuthStateChanged((user) => {
                if (settled) return;
                settled = true;
                window.clearTimeout(timer);
                unsubscribe();
                resolve(user || null);
            });
        });
    }

    async function rejectSession(message) {
        setStatus(message, true);
        try {
            if (window.firebase?.auth) await window.firebase.auth().signOut();
        } catch (_) {}
        try {
            sessionStorage.removeItem('authToken');
            localStorage.removeItem('authToken');
        } catch (_) {}
        window.setTimeout(() => window.location.replace('gateway.html'), 900);
    }

    async function recover() {
        ensureOverlay();
        document.documentElement.style.visibility = '';
        document.body.style.visibility = 'visible';
        document.getElementById('taurus-overlay')?.remove();

        setStatus('INITIALIZING FIREBASE AUTH');
        const firebaseReady = await waitForFirebase(MAX_FIREBASE_WAIT_MS);
        if (!firebaseReady) {
            await rejectSession('FIREBASE AUTH UNAVAILABLE');
            return;
        }

        try {
            if (!window.firebase.apps.length) {
                window.firebase.initializeApp(window.firebaseConfig);
            }

            const auth = window.firebase.auth();
            setStatus('RESTORING VERIFIED SESSION');
            const user = await waitForUser(auth, MAX_USER_WAIT_MS);
            if (!user || user.isAnonymous) {
                await rejectSession('NO VERIFIED ADMIN SESSION');
                return;
            }

            setStatus('VERIFYING ADMIN CLAIMS');
            let tokenResult = await user.getIdTokenResult(false);
            let claims = tokenResult.claims || {};
            if (claims.admin !== true || claims.role !== 'admin') {
                tokenResult = await user.getIdTokenResult(true);
                claims = tokenResult.claims || {};
            }

            if (claims.admin !== true || claims.role !== 'admin') {
                await rejectSession('ADMIN CLAIM NOT PRESENT');
                return;
            }

            window.__taurusAdminVerified = true;
            document.getElementById('taurus-auth-verification')?.remove();
            document.getElementById(OVERLAY_ID)?.remove();
            document.getElementById('taurus-overlay')?.remove();
        } catch (error) {
            console.error('Taurus admin recovery failed:', error);
            await rejectSession('SESSION VERIFICATION FAILED');
        }
    }

    function boot() {
        ensureOverlay();
        recover();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot, { once: true });
    } else {
        boot();
    }
})();
