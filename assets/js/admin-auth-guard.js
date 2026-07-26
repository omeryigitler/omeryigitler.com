(() => {
    'use strict';

    const OVERLAY_ID = 'taurus-auth-verification';
    const MAX_WAIT_MS = 10000;

    function overlay() {
        return document.getElementById(OVERLAY_ID);
    }

    function setStatus(message, isError = false) {
        const detail = document.getElementById('taurus-auth-detail');
        if (!detail) return;
        detail.textContent = message;
        detail.style.color = isError ? '#ef4444' : '#777';
    }

    async function rejectSession(message) {
        setStatus(message || 'SESSION INVALID — RETURNING TO GATEWAY', true);
        try {
            if (window.firebase?.auth) await window.firebase.auth().signOut();
        } catch (_) {}
        try {
            sessionStorage.removeItem('authToken');
            localStorage.removeItem('authToken');
        } catch (_) {}
        window.setTimeout(() => window.location.replace('gateway.html'), 900);
    }

    function waitForFirebase(timeoutMs = MAX_WAIT_MS) {
        const startedAt = Date.now();
        return new Promise((resolve) => {
            const timer = window.setInterval(() => {
                const ready = Boolean(
                    window.firebase &&
                    window.firebaseConfig &&
                    window.firebase.auth
                );
                if (ready) {
                    window.clearInterval(timer);
                    resolve(true);
                    return;
                }
                if (Date.now() - startedAt >= timeoutMs) {
                    window.clearInterval(timer);
                    resolve(false);
                }
            }, 100);
        });
    }

    function waitForUser(auth, timeoutMs = 8000) {
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

    async function verifyAdmin() {
        setStatus('INITIALIZING FIREBASE AUTH');
        const firebaseReady = await waitForFirebase();
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
            const user = await waitForUser(auth);
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
            overlay()?.remove();
            document.documentElement.classList.add('taurus-admin-verified');
        } catch (error) {
            console.error('Taurus admin verification failed:', error);
            await rejectSession('SESSION VERIFICATION FAILED');
        }
    }

    function boot() {
        const guard = overlay();
        if (!guard) {
            console.error('Taurus admin verification overlay is missing.');
            window.location.replace('gateway.html');
            return;
        }
        verifyAdmin();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot, { once: true });
    } else {
        boot();
    }
})();
