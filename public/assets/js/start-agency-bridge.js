/* The Startpage shell controls navigation only. Credentials never cross this bridge. */
(() => {
    'use strict';
    const ORIGIN = 'https://start.omeryigitler.com';
    const views = new Set(['dashboard', 'messages', 'pricing', 'quotes', 'clients', 'projects', 'intelligence']);
    if (parent === window) {
        const requested = new URLSearchParams(location.search).get('view');
        const section = requested === 'intelligence' ? 'world' : views.has(requested) && requested !== 'dashboard' ? requested : 'overview';
        location.replace(`${ORIGIN}/#agency/${section}`);
        return;
    }
    if (new URLSearchParams(location.search).get('embed') !== 'agency') return;
    try { if (new URL(document.referrer).origin !== ORIGIN) return; } catch (_) { return; }

    document.documentElement.classList.add('start-agency-embed');
    const requested = new URLSearchParams(location.search).get('view');
    let currentView = views.has(requested) ? requested : 'dashboard';
    let authenticated = false;
    function navigate(view) {
        if (!views.has(view)) return;
        currentView = view;
        if (authenticated) switchTab(view);
    }
    window.openStartPricing = context => {
        if (!authenticated) return;
        parent.postMessage({ type: 'taurus:agency:open-pricing', context: context || {} }, ORIGIN);
    };
    const originalSwitchTab = switchTab;
    window.switchTab = view => {
        if (view === 'pricing') { window.openStartPricing({}); return; }
        originalSwitchTab(view);
    };
    window.addEventListener('message', event => {
        if (event.origin !== ORIGIN || event.source !== parent) return;
        if (event.data?.type === 'taurus:agency:navigate') navigate(event.data.view);
    });
    window.addEventListener('taurus:admin-ready', () => {
        authenticated = true;
        navigate(currentView);
        parent.postMessage({ type: 'taurus:agency:ready' }, ORIGIN);
    }, { once: true });
})();
