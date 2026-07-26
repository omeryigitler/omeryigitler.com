// Lucide is visual-only. Never allow a blocked CDN to stop authentication.
if (!window.lucide || typeof window.lucide.createIcons !== 'function') {
    window.lucide = {
        createIcons() {
            // Intentionally empty fallback. Authentication must remain functional.
        }
    };
}

/**
 * System Modal Service
 * Replaces native alert() and confirm() with premium styled modals.
 */
window.systemAlert = (title, message, icon = 'info') => {
    return new Promise((resolve) => {
        const modal = document.getElementById('system-modal');
        const content = document.getElementById('system-modal-content');
        if (!modal || !content) {
            alert(message);
            resolve();
            return;
        }

        modal.classList.add('hidden');
        modal.classList.remove('flex');
        content.classList.remove('scale-100', 'opacity-100');
        content.classList.add('scale-95', 'opacity-0');

        document.getElementById('modal-title').innerText = title || "SYSTEM ALERT";
        document.getElementById('modal-message').innerText = message || "";

        const iconEl = document.getElementById('modal-icon');
        iconEl.setAttribute('data-lucide', icon);

        if (icon.includes('loader') || icon.includes('upload') || icon.includes('refresh')) {
            iconEl.classList.add('animate-spin');
            document.getElementById('modal-confirm-btn').classList.add('hidden');
        } else {
            iconEl.classList.remove('animate-spin');
            document.getElementById('modal-confirm-btn').classList.remove('hidden');
        }

        document.getElementById('modal-cancel-btn').classList.add('hidden');
        document.getElementById('modal-confirm-btn').innerText = 'OK';
        modal.classList.remove('hidden');
        modal.classList.add('flex');

        requestAnimationFrame(() => {
            setTimeout(() => {
                content.classList.remove('scale-95', 'opacity-0');
                content.classList.add('scale-100', 'opacity-100');
            }, 10);
        });

        if (window.lucide) lucide.createIcons();

        const btn = document.getElementById('modal-confirm-btn');
        btn.onclick = () => {
            content.classList.remove('scale-100', 'opacity-100');
            content.classList.add('scale-95', 'opacity-0');
            setTimeout(() => {
                modal.classList.add('hidden');
                modal.classList.remove('flex');
                resolve();
            }, 300);
        };
    });
};

window.systemConfirm = (title, message, icon = 'help-circle') => {
    return new Promise((resolve) => {
        const modal = document.getElementById('system-modal');
        const content = document.getElementById('system-modal-content');
        if (!modal || !content) {
            const res = confirm(message);
            resolve(res);
            return;
        }

        modal.classList.add('hidden');
        modal.classList.remove('flex');
        content.classList.remove('scale-100', 'opacity-100');
        content.classList.add('scale-95', 'opacity-0');

        document.getElementById('modal-title').innerText = title || "CONFIRMATION REQUIRED";
        document.getElementById('modal-message').innerText = message || "";

        const iconEl = document.getElementById('modal-icon');
        iconEl.setAttribute('data-lucide', icon);

        document.getElementById('modal-cancel-btn').classList.remove('hidden');
        document.getElementById('modal-confirm-btn').innerText = 'Confirm';
        modal.classList.remove('hidden');
        modal.classList.add('flex');

        requestAnimationFrame(() => {
            setTimeout(() => {
                content.classList.remove('scale-95', 'opacity-0');
                content.classList.add('scale-100', 'opacity-100');
            }, 10);
        });

        if (window.lucide) lucide.createIcons();

        document.getElementById('modal-confirm-btn').onclick = () => {
            content.classList.remove('scale-100', 'opacity-100');
            content.classList.add('scale-95', 'opacity-0');
            setTimeout(() => {
                modal.classList.add('hidden');
                modal.classList.remove('flex');
                resolve(true);
            }, 300);
        };

        document.getElementById('modal-cancel-btn').onclick = () => {
            content.classList.remove('scale-100', 'opacity-100');
            content.classList.add('scale-95', 'opacity-0');
            setTimeout(() => {
                modal.classList.add('hidden');
                modal.classList.remove('flex');
                resolve(false);
            }, 300);
        };
    });
};

(function hardenAdminRuntime() {
    if (!/\/admin\.html$/i.test(window.location.pathname)) return;

    // Prevent protected UI from flashing before a signed Firebase admin claim is verified.
    document.documentElement.style.visibility = 'hidden';

    const encodeText = (value) => String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

    const sanitizeValue = (value, seen = new WeakSet()) => {
        if (typeof value === 'string') return encodeText(value);
        if (!value || typeof value !== 'object') return value;
        if (value instanceof Date) return value;
        if (seen.has(value)) return value;
        seen.add(value);
        if (Array.isArray(value)) return value.map((item) => sanitizeValue(item, seen));

        const constructorName = value.constructor && value.constructor.name;
        if (['Timestamp', 'GeoPoint', 'DocumentReference', 'FieldValue'].includes(constructorName)) {
            return value;
        }

        const output = {};
        Object.keys(value).forEach((key) => {
            output[key] = sanitizeValue(value[key], seen);
        });
        return output;
    };

    const patchSnapshotData = () => {
        if (!window.firebase || !firebase.firestore) return false;
        const constructors = [
            firebase.firestore.DocumentSnapshot,
            firebase.firestore.QueryDocumentSnapshot,
        ].filter(Boolean);

        constructors.forEach((Ctor) => {
            const prototype = Ctor && Ctor.prototype;
            if (!prototype || prototype.__taurusSanitized || typeof prototype.data !== 'function') return;
            const originalData = prototype.data;
            Object.defineProperty(prototype, '__taurusSanitized', { value: true });
            prototype.data = function taurusSafeSnapshotData(...args) {
                return sanitizeValue(originalData.apply(this, args));
            };
        });
        return true;
    };

    // Reject cross-origin and wrong-frame pricing messages before legacy handlers receive them.
    window.addEventListener('message', (event) => {
        const pricingFrame = document.getElementById('pricing-iframe');
        const trusted = event.origin === window.location.origin &&
            (!pricingFrame || event.source === pricingFrame.contentWindow);
        if (!trusted) {
            event.stopImmediatePropagation();
            event.preventDefault();
        }
    }, true);

    const redirectToGateway = async () => {
        try {
            if (window.firebase && firebase.auth) await firebase.auth().signOut();
        } catch (_) {}
        try {
            sessionStorage.removeItem('authToken');
            localStorage.removeItem('authToken');
        } catch (_) {}
        window.location.replace('gateway.html');
    };

    const lockBrowserSecretInputs = () => {
        const tokenInput = document.getElementById('tele-token');
        const chatInput = document.getElementById('tele-chat-id');
        const saveButton = document.getElementById('save-telegram-btn');
        [tokenInput, chatInput].forEach((input) => {
            if (!input) return;
            input.value = '';
            input.disabled = true;
            input.autocomplete = 'off';
            input.placeholder = 'Managed in Vercel environment variables';
        });
        if (saveButton) {
            saveButton.disabled = true;
            saveButton.textContent = 'SERVER-MANAGED CONFIGURATION';
        }
    };

    document.addEventListener('DOMContentLoaded', () => {
        patchSnapshotData();
        lockBrowserSecretInputs();

        // Override the legacy search highlighter with output encoding.
        setTimeout(() => {
            window.highlightMatch = (value, query) => {
                const safeValue = encodeText(value);
                if (!query) return safeValue;
                const escapedQuery = encodeText(query).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                try {
                    return safeValue.replace(
                        new RegExp(`(${escapedQuery})`, 'gi'),
                        '<span class="search-highlight">$1</span>',
                    );
                } catch (_) {
                    return safeValue;
                }
            };
        }, 0);

        // The inline admin script initializes Firebase. Validate its resulting user with fresh claims.
        let attempts = 0;
        const waitForAuth = window.setInterval(() => {
            attempts += 1;
            patchSnapshotData();
            lockBrowserSecretInputs();

            if (!window.firebase || !firebase.apps || !firebase.apps.length || !firebase.auth) {
                if (attempts > 80) {
                    clearInterval(waitForAuth);
                    redirectToGateway();
                }
                return;
            }

            clearInterval(waitForAuth);
            firebase.auth().onAuthStateChanged(async (user) => {
                if (!user || user.isAnonymous) return redirectToGateway();
                try {
                    const tokenResult = await user.getIdTokenResult(true);
                    const claims = tokenResult.claims || {};
                    if (claims.admin !== true || claims.role !== 'admin') {
                        return redirectToGateway();
                    }
                    document.documentElement.style.visibility = '';
                } catch (error) {
                    console.error('Taurus admin claim verification failed:', error);
                    return redirectToGateway();
                }
            });
        }, 100);

        // Prevent later tab initialization from exposing or enabling browser-side credentials.
        const observer = new MutationObserver(lockBrowserSecretInputs);
        observer.observe(document.documentElement, { subtree: true, childList: true });
    }, { once: true });
})();

(function loadAdminAgentBridge() {
    if (!/admin\.html$/.test(window.location.pathname)) return;
    function load() {
        if (document.querySelector('script[data-admin-agent]')) return;
        var script = document.createElement('script');
        script.src = 'assets/js/admin-agent.js?v=V3';
        script.dataset.adminAgent = 'true';
        document.body.appendChild(script);
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', load, { once: true });
    } else {
        load();
    }
})();

(function loadPortfolioManagerBridge() {
    if (!/admin\.html$/.test(window.location.pathname)) return;
    function load() {
        if (document.querySelector('script[data-admin-portfolio]')) return;
        var script = document.createElement('script');
        script.src = 'assets/js/admin-portfolio.js?v=V2';
        script.dataset.adminPortfolio = 'true';
        document.body.appendChild(script);
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', load, { once: true });
    } else {
        load();
    }
})();
