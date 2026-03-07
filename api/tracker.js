// TAURUS TRACKER v5.6 (Shadow Mode / Backend Oriented)

/**
 * TAURUS TRACKER v5.6 (Final System - Unified Reporting V36)
 * ----------------------------------
 * - Altyapı: Backend Oriented (Engellenemez Gölge Modu)
 * - Güvenlik: Middleware IP Gating & Server-side Reporting
 * - Design: Radical UI v2 (Technical Precision)
 * - v5.6 Fixes: Hardcoded credentials removed, Firestore-only config,
 *               session init logic hardened, silent fail on missing config
 */

/* Taurus Tracker v5.6 - Mobile Optimized */
(function () {
    console.log("🐂 Taurus Tracker v5.6 (Shadow Mode) Initializing...");
    window.taurus_set_internal = () => { window.isInternalNav = true; console.log("🐂 Manual Internal Signal Set"); };

    // CONFIGURATION (All sensitive tokens are stored in Firestore security_config/telegram)
    const CONFIG = {
        collection: 'visitors_v1',
        ipApi: 'https://ipapi.co/json/',
        api: {
            tracker: '/api/tracker',
            report: '/api/report'
        }
    };

    // STATE
    let sessionID = localStorage.getItem('taurus_session_id');
    let sessionStartTime = new Date();

    if (!sessionID) {
        sessionID = 'sess_' + Math.random().toString(36).substr(2, 9).toUpperCase();
        localStorage.setItem('taurus_session_id', sessionID);
        // Clear init flag for new sessions
        localStorage.removeItem('taurus_session_init_done');
    }

    const currentPageLoadTime = Date.now();
    sessionStorage.setItem('taurus_page_load_time', currentPageLoadTime);
    console.log('📍 Page loaded at:', currentPageLoadTime);

    let sessionData = {};
    let localHistory = [];
    try {
        localHistory = JSON.parse(localStorage.getItem('taurus_history_buffer') || "[]");
    } catch (e) {
        console.warn("🐂 LocalStorage history corrupted, clearing buffer...", e);
        localStorage.removeItem('taurus_history_buffer');
    }
    let audioObj = null;
    window.isInternalNav = false;

    // ─── HELPERS ─────────────────────────────────────────────────────────────

    function escapeHTML(str) {
        if (!str) return '';
        return str.toString()
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    /**
     * Fetches Telegram config from Firestore security_config/telegram.
     * NEVER falls back to hardcoded values — if config is missing, returns null.
     * Caller is responsible for checking null before sending.
     */
    async function getTelegramConfig() {
        // Return cached version if already fetched this session
        if (window.cachedTelegramConfig?.botToken && window.cachedTelegramConfig?.chatId) {
            return window.cachedTelegramConfig;
        }

        if (!window.db) {
            console.warn("⚠️ Telegram config unavailable: Firestore not ready");
            return null;
        }

        try {
            const doc = await window.db.collection('security_config').doc('telegram').get();
            if (doc.exists && doc.data().botToken && doc.data().chatId) {
                window.cachedTelegramConfig = doc.data();
                console.log("⚡ Telegram Config Fetched & Cached");
                return window.cachedTelegramConfig;
            }
            console.warn("⚠️ Telegram config document missing or incomplete");
            return null;
        } catch (e) {
            console.warn("⚠️ Telegram config fetch failed:", e.message);
            return null;
        }
    }

    // ─── EXIT NOTIFICATION ───────────────────────────────────────────────────

    async function fireTelegramExit(message) {
        // Always fetch config fresh — never use hardcoded fallback
        const config = await getTelegramConfig();
        if (!config) {
            console.warn("🛑 Exit report skipped: No Telegram config available");
            return;
        }

        const { botToken, chatId } = config;
        const encodedMsg = encodeURIComponent(message);
        const getUrl = `https://api.telegram.org/bot${botToken}/sendMessage?chat_id=${chatId}&text=${encodedMsg}&parse_mode=HTML`;

        // URL length check (GET limit ~2048 chars)
        if (getUrl.length > 2000) {
            console.warn('⚠️ URL too long (' + getUrl.length + ' chars), sending simplified version');

            const sessionMatch  = message.match(/SESSION:<\/b> <code>(.+?)<\/code>/);
            const durationMatch = message.match(/DURATION:<\/b> <code>(.+?)<\/code>/);
            const locationMatch = message.match(/LOCATION:<\/b> <code>(.+?)<\/code>/);
            const deviceMatch   = message.match(/DEVICE:<\/b> <code>(.+?)<\/code>/);

            const shortMsg =
                `🛑 <b>EXIT REPORT (Simplified)</b>\n` +
                `🆔 ${sessionMatch?.[1]  || 'Unknown'}\n` +
                `⏱ ${durationMatch?.[1] || '0s'}\n` +
                `🌍 ${locationMatch?.[1] || 'Unknown'}\n` +
                `💻 ${deviceMatch?.[1]   || 'Unknown'}`;

            const shortUrl = `https://api.telegram.org/bot${botToken}/sendMessage?chat_id=${chatId}&text=${encodeURIComponent(shortMsg)}&parse_mode=HTML`;
            new Image().src = shortUrl;
            return;
        }

        // Image Beacon — fires even if page is closing
        new Image().src = getUrl;
    }

    function sendExitMessage() {
        const exitKey = 'taurus_exit_sent_' + currentPageLoadTime;

        if (window[exitKey]) return;
        window[exitKey] = true;

        if (window.isInternalNav) return;

        const duration = Math.round((Date.now() - currentPageLoadTime) / 1000);
        console.log(`⏱️ Exit triggered - Duration: ${duration}s`);

        // Block suspiciously short sessions (likely refreshes)
        if (duration < 3) {
            console.log(`❌ BLOCKED: Too short (${duration}s < 3s)`);
            return;
        }

        console.log(`✅ SENDING exit report - Duration: ${duration}s`);

        const clipboardEntries = localHistory.filter(e => e.includes('Copy:')).join('\n').substring(0, 600);
        const rawLog           = localHistory.slice(-15).join('\n').substring(0, 600);
        const separator        = `━━━━━━━━━━━━━━━━━━━━━`;
        const sendID           = Math.random().toString(36).substr(2, 5).toUpperCase();

        const clipboardDisplay = clipboardEntries ? `<pre>${escapeHTML(clipboardEntries)}</pre>` : 'None';
        const logDisplay       = rawLog           ? `<pre>${escapeHTML(rawLog)}</pre>`           : 'No events';

        const tgMsg =
            `🛑 <b>TAURUS EXIT REPORT</b> [${sendID}]\n` +
            `${separator}\n` +
            `🆔 <b>SESSION:</b> <code>${escapeHTML(sessionID)}</code>\n` +
            `⏱ <b>DURATION:</b> <code>${duration}s</code>\n` +
            `📍 <b>EXIT PAGE:</b> <code>${escapeHTML(window.location.pathname)}</code>\n` +
            `🌍 <b>LOCATION:</b> <code>${escapeHTML(sessionData?.city || 'Unknown')}, ${escapeHTML(sessionData?.country_name || '')}</code>\n` +
            `💻 <b>DEVICE:</b> <code>${escapeHTML(sessionData?.device?.model || 'Unknown')} (${escapeHTML(sessionData?.device?.os || 'Unknown')})</code>\n\n` +
            `📋 <b>CLIPBOARD:</b>\n${clipboardDisplay}\n` +
            `📝 <b>EVENT LOG:</b>\n${logDisplay}\n` +
            `${separator}`;

        // Fire Telegram (async — won't block beacon)
        fireTelegramExit(tgMsg);
        console.log('📤 [DEBUG] fireTelegramExit called');

        // Also send to backend for Firestore logging
        const payload = {
            sessionID:  sessionID || 'unknown',
            duration:   duration,
            exitPage:   window.location.pathname,
            location:   `${sessionData?.city || 'Unknown'}, ${sessionData?.country_name || ''}`,
            deviceInfo: `${sessionData?.device?.model || 'Unknown'} (${sessionData?.device?.os || 'Unknown'})`,
            clipboard:  escapeHTML(clipboardEntries) || 'None',
            eventLog:   escapeHTML(rawLog) || 'No events recorded'
        };

        const blob = new Blob([JSON.stringify(payload)], { type: 'text/plain' });

        if (navigator.sendBeacon) {
            navigator.sendBeacon(CONFIG.api.report, blob);
        } else {
            fetch(CONFIG.api.report, {
                method: 'POST',
                body: JSON.stringify(payload),
                keepalive: true,
                mode: 'no-cors'
            }).catch(() => {});
        }
    }

    // Register exit listeners once
    window.addEventListener('pagehide', sendExitMessage);
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') sendExitMessage();
    });
    console.log('✅ Exit listeners registered (pagehide + visibilitychange)');

    // ─── CSS & FONTS ─────────────────────────────────────────────────────────

    const fonts = document.createElement('link');
    fonts.rel = 'stylesheet';
    fonts.href = 'https://fonts.googleapis.com/css2?family=Manrope:wght@200;400;700;900&family=Syncopate:wght@400;700&display=swap';
    document.head.appendChild(fonts);

    const css = `
        #taurus-overlay {
            position: fixed;
            inset: 0;
            height: 100dvh;
            z-index: 9999999;
            background: #050505;
            display: none;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            font-family: 'Manrope', sans-serif;
            text-align: center;
            overflow: hidden;
            user-select: none;
            touch-action: none;
        }

        .taurus-grid-bg {
            position: absolute;
            inset: 0;
            background-image: 
                linear-gradient(rgba(255, 215, 0, 0.05) 1px, transparent 0),
                linear-gradient(90deg, rgba(255, 215, 0, 0.05) 1px, transparent 0);
            background-size: 35px 35px;
            background-position: center center;
            opacity: 0.4;
            pointer-events: none;
            z-index: 0;
        }

        .mode-freeze .taurus-grid-bg {
            background-image: url('assets/taurus-tracker-globe.jpg'); 
            background-size: 80% auto;
            background-repeat: no-repeat;
            background-position: center center;
            filter: brightness(1.2) contrast(1.1);
            opacity: 0.5;
            animation: none;
            mask-image: radial-gradient(circle at center, black 0%, rgba(0,0,0,0.6) 35%, transparent 70%);
            -webkit-mask-image: radial-gradient(circle at center, black 0%, rgba(0,0,0,0.6) 35%, transparent 70%);
        }

        .mode-freeze #taurus-custom-msg {
            display: block !important;
            margin-top: 2rem !important; 
            z-index: 99999999 !important; 
            position: relative;
            color: #FFD700;
            text-shadow: 0 0 20px #FFD700;
        }

        .mode-freeze .taurus-axis-glow,
        .mode-freeze .taurus-radial-glow {
            display: none !important;
        }

        @keyframes taurus-pulse-glow {
            0%, 100% { opacity: 0.2; transform: translate(-50%, -50%) scale(1); }
            50% { opacity: 0.4; transform: translate(-50%, -50%) scale(1.1); }
        }

        @keyframes taurus-ripple {
            0% { transform: scale(1); opacity: 0.8; box-shadow: 0 0 10px #FFD700; }
            100% { transform: scale(1.6); opacity: 0; box-shadow: 0 0 30px #FFEebb; }
        }

        @keyframes taurus-pulse-text {
            0%, 100% { opacity: 0.8; }
            50% { opacity: 1; text-shadow: 0 0 10px #FFD700; }
        }

        .taurus-content {
            position: relative;
            z-index: 10;
            width: 100%;
            max-width: 550px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding-left: 1rem;
            padding-right: 1rem;
        }

        .taurus-logo-container {
            position: relative;
            width: 100px;
            height: 100px;
            margin: 40px auto 45px auto;
            display: flex; 
            justify-content: center; 
            align-items: center;
            transition: transform 1s ease;
        }

        .taurus-ripple-1 {
            position: absolute; 
            inset: -15px;
            border: 2px solid #FFD700; 
            border-radius: 50%; 
            animation: taurus-ripple 2.5s infinite;
        }

        .taurus-ripple-2 {
            position: absolute; 
            inset: -5px; 
            border: 1px solid rgba(255, 215, 0, 0.5); 
            border-radius: 50%; 
            animation: taurus-ripple 2.5s infinite 0.8s;
        }

        .mode-live .taurus-logo-container,
        .mode-freeze .taurus-logo-container {
            transform: scale(2.0); 
            margin-bottom: 0; 
        }
        
        .mode-live .taurus-title {
            display: block !important;
            margin-top: 8.5rem;
        }

        .mode-freeze .taurus-title {
            display: none !important;
        }
        
        .mode-live .taurus-panel,
        .mode-freeze .taurus-panel {
            display: none !important;
        }

        .mode-freeze #taurus-custom-msg {
            display: block; 
            width: 100%;
            text-align: center;
            margin: 18rem auto 0 auto;
        }

        .taurus-logo-main {
            width: 100%; 
            height: 100%;
            border-radius: 50%;
            object-fit: cover;
            border: 3px solid #FFD700;
            box-shadow: 0 0 40px rgba(255, 215, 0, 0.4);
            z-index: 10;
            position: relative;
            transition: all 1s ease;
        }

        .taurus-title {
            font-family: 'Syncopate', sans-serif;
            font-weight: 900;
            text-transform: uppercase;
            text-align: center;
            letter-spacing: 0.4em;
            line-height: 1.2;
            margin-bottom: 1rem;
            transition: margin 0.5s ease;
            width: 100%;
        }

        .taurus-title span:first-child { color: #FFD700; font-size: 1.5rem; }
        .taurus-title span:last-child { color: #EF4444; font-size: 1.5rem; display: block; margin-top: 0.2rem; filter: drop-shadow(0 0 15px rgba(239, 68, 68, 0.6)); }

        .taurus-master-panel {
            background: rgba(10, 10, 10, 0.4);
            border: 1px solid rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(30px);
            width: 90%;
            max-width: 400px;
            height: 750px !important;
            max-height: 85vh; 
            border-radius: 2.5rem;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: flex-start;
            overflow: hidden;
            padding-top: 5rem;
            padding-bottom: 2rem;
            padding-left: 2rem;
            padding-right: 2rem;
            transition: all 0.5s ease;
        }

        @media (min-width: 768px) {
            .taurus-master-panel { padding: 2.5rem; padding-top: 5rem; }
        }

        .taurus-panel-text {
            color: rgba(255, 255, 255, 0.6);
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 0.2em;
            line-height: 1.6;
            margin-bottom: 2.5rem;
            border-bottom: 1px solid rgba(255, 255, 255, 0.05);
            padding-bottom: 1.5rem;
        }

        .taurus-stats-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 1.5rem;
            text-align: left;
        }

        .taurus-stat-item p:first-child { color: rgba(255, 215, 0, 0.6); font-size: 7px; text-transform: uppercase; letter-spacing: 0.3em; margin-bottom: 0.25rem; }
        .taurus-stat-item p:last-child { color: #fff; font-family: monospace; font-size: 11px; letter-spacing: 0.1em; font-weight: bold; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

        .taurus-footer {
            position: absolute;
            bottom: 30px;
            left: 0;
            width: 100%;
            margin-top: 0;
            display: flex;
            flex-direction: column;
            align-items: center;
            z-index: 20;
            pointer-events: none;
        }

        .taurus-footer-line {
            width: 1px; height: 1.5rem;
            background: linear-gradient(to bottom, #FFD700, transparent);
            opacity: 0.4;
            margin-bottom: 0.75rem;
        }

        .taurus-footer-text {
            color: rgba(255, 215, 0, 0.5);
            font-size: 8px;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 0.6em;
            animation: taurus-pulse-opacity 2s infinite ease-in-out;
        }

        @keyframes taurus-pulse-opacity {
            0%, 100% { opacity: 0.3; }
            50% { opacity: 1; }
        }

        .taurus-btn-container {
            width: 100%;
            padding: 0 1rem;
            background: #FFD700;
            color: #000;
            border-radius: 0.75rem; 
            font-weight: 800;
            font-size: 1rem;
            letter-spacing: 0.15em;
            text-align: center;
            font-family: 'Syncopate', sans-serif;
            margin-top: auto;
            display: flex;
            align-items: center;
            justify-content: center;
            height: 50px;
            box-shadow: 0 0 20px rgba(255, 215, 0, 0.4);
            cursor: pointer;
            transition: all 0.3s ease;
            border: none;
            text-transform: uppercase;
        }

        .taurus-code-box {
            height: 70px !important;
            font-size: 2.5rem !important;
            font-weight: 900 !important;
            letter-spacing: 0.1em;
        }

        .taurus-btn-container:hover {
            transform: scale(1.02);
            box-shadow: 0 0 30px rgba(255, 215, 0, 0.6);
            background: #fff; 
        }

        @media (min-width: 768px) {
            .taurus-title span:first-child, .taurus-title span:last-child { font-size: 1.8rem; }
            .taurus-panel-text { font-size: 11px; }
            .taurus-stat-item p:last-child { font-size: 13px; }
        }

        .mode-freeze .taurus-footer { display: none !important; }

        .mode-freeze .taurus-logo-container {
            transform: scale(2);
            transition: transform 1s ease;
        }
        
        .mode-freeze .taurus-logo-main {
            border-color: rgba(255, 215, 0, 0.8);
            box-shadow: 0 0 100px rgba(255, 215, 0, 0.6);
            transition: all 1s ease;
        }

        .mode-freeze .taurus-ripple-1,
        .mode-freeze .taurus-ripple-2 {
            animation-duration: 4s;
            border-color: rgba(255, 215, 0, 0.3);
        }

        #taurus-custom-msg {
            display: none;
            margin-top: 12rem;
            color: #FFD700;
            font-family: 'Courier New', monospace;
            font-size: 1.5rem;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 0.1em;
            text-align: center;
            max-width: 80%;
            line-height: 1.4;
            text-shadow: 0 0 10px rgba(255, 215, 0, 0.8);
            position: relative;
            z-index: 30;
        }
    `;

    const style = document.createElement('style');
    style.innerHTML = css;
    document.head.appendChild(style);

    // ─── OVERLAY ─────────────────────────────────────────────────────────────

    function createOverlay(mode = 'alarm') {
        let overlay = document.getElementById('taurus-overlay');

        if (overlay) {
            overlay.className = '';
        } else {
            overlay = document.createElement('div');
            overlay.id = 'taurus-overlay';
            document.body.appendChild(overlay);
        }

        overlay.classList.add(`mode-${mode}`);

        const logoSrc    = window.TAURUS_LOGO_DATA || 'assets/favicon_taurus.png';
        const displayIP  = sessionData?.ip   || '0.0.0.0';
        const displayCity = sessionData?.city || 'Unknown';

        let panelContentHTML = '';

        const commonLogoHTML = `
            <div style="position: relative; width: 140px; height: 140px; margin: 0 auto 2.5rem auto; display: flex; justify-content: center; align-items: center; flex-shrink: 0;">
                <div style="position: absolute; inset: 0; border: 2px solid #FFD700; border-radius: 50%; animation: taurus-ripple 2.5s infinite;"></div>
                <div style="position: absolute; inset: 10px; border: 1px solid rgba(255, 215, 0, 0.5); border-radius: 50%; animation: taurus-ripple 2.5s infinite 0.8s;"></div>
                <img src="${logoSrc}" style="width: 100px; height: 100px; border-radius: 50%; object-fit: cover; border: 3px solid #FFD700; box-shadow: 0 0 40px rgba(255, 215, 0, 0.4); z-index: 10;">
            </div>
        `;

        const commonFooterHTML = `
            <div style="margin-top:auto; padding-top: 2rem; width:100%; text-align:center;">
                <p style="font-family: 'Courier New', monospace; font-size: 9px; color: rgba(255, 215, 0, 0.4); text-transform: uppercase; letter-spacing: 0.2em;">Restricted Access Mode</p>
            </div>
        `;

        if (mode === 'gateway') {
            const gateCode = Math.floor(10 + Math.random() * 90);
            panelContentHTML = `
                ${commonLogoHTML}
                <h2 style="animation: taurus-pulse-text 2s infinite ease-in-out; margin-bottom: 2rem; color: #FFD700; font-family: 'Syncopate', sans-serif; font-size: 1.5rem; font-weight: bold; letter-spacing: 0.2em; text-align: center;">
                    TAURUS GATEWAY
                </h2>
                <p class="taurus-panel-text" style="margin-bottom: 2rem; color:#FFD700; text-align: center;">
                    VERIFICATION REQUEST SENT
                </p>
                <div style="display: flex; flex-direction: column; gap: 1rem; width: 100%; align-items: center; flex: 1; justify-content: center;">
                    <i data-lucide="shield-check" style="color: rgba(255,215,0,0.5); width: 48px; height: 48px;"></i>
                    <div style="text-align: center;">
                        <p style="font-size: 0.7rem; color: rgba(255,255,255,0.5); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px;">Awaiting Verification</p>
                        <p style="font-size:9px; color:#FFD700; font-family: monospace;">SESSION ID: ${escapeHTML(sessionID?.substring(0, 8) || 'Init')}</p>
                    </div>
                </div>
                <div style="width: 100%; padding: 0 1rem; background: #FFD700; color: #000; border-radius: 0.75rem; font-weight: 900; font-size: 2rem; letter-spacing: 0.1em; text-align: center; font-family: 'Syncopate', sans-serif; margin-top: auto; display: flex; align-items: center; justify-content: center; height: 50px; box-shadow: 0 0 20px rgba(255, 215, 0, 0.4);">
                    ${gateCode}
                </div>
            `;
        } else {
            const buttonHTML = mode === 'block'
                ? '<button class="taurus-btn-container" disabled style="cursor: not-allowed; opacity: 0.8;">BLOCKED</button>'
                : '<button class="taurus-btn-container" id="taurus-ack-btn">ACKNOWLEDGE</button>';

            panelContentHTML = `
                ${commonLogoHTML}
                <h2 style="animation: taurus-pulse-text 2s infinite ease-in-out; margin-bottom: 1.5rem; margin-top: 1rem; line-height: 1.4; font-family: 'Syncopate', sans-serif; font-size: 1.5rem; font-weight: bold; text-align: center;">
                    <span style="color: #FFD700;">ACCESS</span><br>
                    <span style="color: #FFD700;">${mode === 'block' ? 'DENIED' : 'DETECTED'}</span>
                </h2>
                <div style="display: flex; flex-direction: column; gap: 1.5rem; width: 100%; align-items: center; margin-bottom: auto;">
                    <div style="text-align: center;">
                        <p style="font-size: 0.7rem; color: rgba(255,255,255,0.5); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px;">Network Address</p>
                        <p id="taurus-stat-ip" style="font-family: 'Courier New', monospace; font-size: 1.1rem; color: #fff; font-weight: bold; letter-spacing: 1px;">${escapeHTML(displayIP)}</p>
                    </div>
                    <div style="text-align: center;">
                        <p style="font-size: 0.7rem; color: rgba(255,255,255,0.5); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px;">Geo-Location</p>
                        <p id="taurus-stat-city" style="font-family: 'Courier New', monospace; font-size: 1.1rem; color: #fff; font-weight: bold; letter-spacing: 1px;">${escapeHTML(displayCity)}</p>
                    </div>
                    <div style="text-align: center;">
                        <p style="font-size: 0.7rem; color: rgba(255,255,255,0.5); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px;">Session Identifier</p>
                        <p style="font-family: 'Courier New', monospace; font-size: 0.9rem; color: #aaa; letter-spacing: 1px;">${escapeHTML(sessionID?.substring(0, 12))}</p>
                    </div>
                </div>
                ${buttonHTML}
                ${commonFooterHTML}
            `;
        }

        let innerHTMLContent = '';

        if (mode === 'live' || mode === 'freeze') {
            innerHTMLContent = `
                <div class="taurus-logo-container">
                    <div class="taurus-ripple-1"></div>
                    <div class="taurus-ripple-2"></div>
                    <img src="${logoSrc}" class="taurus-logo-main" alt="Taurus">
                </div>
                <h1 class="taurus-title">
                    <span id="taurus-msg-top">ACCESS</span>
                    <span id="taurus-msg-bottom">DETECTED</span>
                </h1>
                <div class="taurus-panel"></div>
            `;
        } else {
            innerHTMLContent = `
                <div class="taurus-master-panel">
                    ${panelContentHTML}
                </div>
            `;
        }

        overlay.innerHTML = `
            <div class="taurus-grid-bg"></div>
            <div class="taurus-axis-glow"></div>
            <div class="taurus-radial-glow"></div>
            <div class="taurus-content">
                ${innerHTMLContent}
                <div id="taurus-custom-msg"></div>
            </div>
        `;

        const btn = document.getElementById('taurus-ack-btn');
        if (btn) {
            btn.onclick = () => {
                overlay.style.display = 'none';
                document.body.style.overflow = '';
                stopAlarmSound();
                if (window.db) {
                    window.db.collection(CONFIG.collection).doc(sessionID).update({ action: null });
                }
            };
        }

        if (window.lucide) window.lucide.createIcons();
    }

    // ─── LOGIC & DATABASE ─────────────────────────────────────────────────────

    function getTimestamp() {
        return new Date().toLocaleTimeString('tr-TR');
    }

    async function initTracker() {
        // Pre-fetch and cache Telegram config early (no hardcoded fallback)
        getTelegramConfig();

        // Ensure Firebase Auth
        if (window.auth && !window.auth.currentUser) {
            try {
                await window.auth.signInAnonymously();
                console.log("🔐 Authenticated anonymously");
            } catch (e) {
                console.error("Auth Failed:", e);
            }
        }

        // Populate device data immediately
        sessionData.device = getDeviceData();

        // Determine if this is a brand new session or a resumed one
        const isNewSession = localStorage.getItem('taurus_session_init_done') !== 'true';

        if (isNewSession) {
            localStorage.setItem('taurus_session_init_done', 'true');
            await gatherAndNotify();
        } else {
            console.log("🐂 Resuming Session:", sessionID);
            syncSessionData(sessionID);
            logHistory('Refresh', window.location.pathname);
            listenForCommands(sessionID);
        }

        setupEventListeners();
    }

    // ─── DEVICE FINGERPRINTING ────────────────────────────────────────────────

    function getGPURenderer() {
        try {
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
            if (gl) {
                const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
                if (debugInfo) return gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
            }
            return null;
        } catch (e) { return null; }
    }

    function getAdvancedDeviceModel(os, type) {
        const width      = window.screen.width;
        const height     = window.screen.height;
        const pixelRatio = window.devicePixelRatio || 1;
        const renderer   = getGPURenderer() || '';
        let model        = type;

        if (os === 'iOS' || os === 'Mac OS X') {
            const res = `${width}x${height}`;
            if      (res === '430x932' && pixelRatio === 3) model = 'iPhone 14/15/16 Pro Max';
            else if (res === '393x852' && pixelRatio === 3) model = 'iPhone 14/15/16 Pro';
            else if (res === '428x926' && pixelRatio === 3) model = 'iPhone 12/13/14 Plus';
            else if (res === '390x844' && pixelRatio === 3) model = 'iPhone 12/13/14';
            else if (res === '375x812' && pixelRatio === 3) model = 'iPhone 12/13 mini / 11 Pro / X';
            else if (res === '414x896' && pixelRatio === 2) model = 'iPhone 11 / XR';
            else if (res === '414x896' && pixelRatio === 3) model = 'iPhone XS Max';
            else if (width === 1024 && height === 1366)     model = 'iPad Pro 12.9"';
            else if (width === 834  && height === 1194)     model = 'iPad Pro 11"';
            else if (width === 820  && height === 1180)     model = 'iPad Air (4th/5th Gen)';
            else if (width === 810  && height === 1080)     model = 'iPad (7th/8th/9th Gen)';
            if (renderer.includes('Apple A') && !model.includes('iPhone') && !model.includes('iPad')) {
                model = 'Apple Device (New)';
            }
        }

        return model;
    }

    function getDeviceData() {
        const ua       = navigator.userAgent;
        const platform = navigator.platform;

        let type = 'Monitor';
        if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) {
            type = 'Mobile';
        } else if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
            type = 'Tablet';
        }

        let os = 'Unknown OS';
        if      (/iPhone|iPad|iPod/.test(ua))                     os = 'iOS';
        else if (/Win/.test(platform) || /Windows/.test(ua))      os = 'Windows';
        else if (/Mac/.test(platform) || /Macintosh/.test(ua))    os = 'Mac OS X';
        else if (/Linux/.test(platform) || /Linux/.test(ua))      os = 'Linux';
        else if (/Android/.test(ua))                               os = 'Android';

        if (/Windows NT 10.0/.test(ua))      os = 'Windows 10/11';
        if (/Mac OS X 10[._]\d+/.test(ua))   os = 'Mac OS X';

        let browser = 'Unknown Browser';
        if      (/Firefox/.test(ua))        browser = 'Firefox';
        else if (/SamsungBrowser/.test(ua)) browser = 'Samsung Internet';
        else if (/Opera|OPR/.test(ua))      browser = 'Opera';
        else if (/Trident/.test(ua))        browser = 'Internet Explorer';
        else if (/Edge/.test(ua))           browser = 'Edge';
        else if (/Chrome/.test(ua))         browser = 'Chrome';
        else if (/Safari/.test(ua))         browser = 'Safari';

        let model = getAdvancedDeviceModel(os, type);

        if (model === type) {
            if (os === 'Mac OS X')    model = 'MacBook / iMac';
            if (os === 'Windows')     model = 'PC';
            if (/Android/.test(ua)) {
                const match = ua.match(/Android\s([0-9.]+);\s([^;]+)/);
                if (match?.[2]) model = match[2];
            }
        }

        // iPadOS 13+ Desktop Mode Fix
        if (os === 'Mac OS X' && navigator.maxTouchPoints > 1) {
            if (model === 'MacBook / iMac') {
                model = getAdvancedDeviceModel('iOS', 'Tablet');
                if (model === 'Tablet') model = 'iPad Pro (Desktop Mode)';
            }
            type = 'Tablet';
            os   = 'iOS (iPadOS)';
        }

        return {
            type:      os.includes('Windows') || os.includes('Mac') ? 'Monitor' : type,
            model,
            os,
            browser,
            platform,
            userAgent: ua,
            screen:    `${window.screen.width}x${window.screen.height}`,
            language:  navigator.language,
            gpu:       getGPURenderer() || 'Unknown GPU'
        };
    }

    // ─── GEO FETCH ───────────────────────────────────────────────────────────

    async function gatherAndNotify() {
        let ipData = { ip: '0.0.0.0', city: 'Unknown', country_name: 'Unknown', org: 'Unknown ISP' };

        const fetchWithTimeout = async (url, duration = 1500) => {
            const controller = new AbortController();
            const id = setTimeout(() => controller.abort(), duration);
            try {
                const res = await fetch(url, { signal: controller.signal });
                clearTimeout(id);
                return res;
            } catch (e) {
                clearTimeout(id);
                throw e;
            }
        };

        try {
            const res = await fetchWithTimeout('https://ipapi.co/json/', 1500);
            if (res.ok) {
                const data = await res.json();
                if (data.ip) ipData = data;
            } else throw new Error("Primary API Failed");
        } catch {
            console.warn("🐂 Primary Geo-Fetch blocked, trying fallback...");
            try {
                const dbRes = await fetchWithTimeout('https://api.db-ip.com/v2/free/self', 1500);
                if (dbRes.ok) {
                    const dbData = await dbRes.json();
                    ipData.ip           = dbData.ipAddress;
                    ipData.city         = dbData.city;
                    ipData.country_name = dbData.countryName;
                    ipData.org          = dbData.isp + ' (DB-IP)';
                } else throw new Error("DB-IP Failed");
            } catch {
                try {
                    const res = await fetchWithTimeout('https://wttr.in/?format=j1', 1500);
                    if (res.ok) {
                        const data = await res.json();
                        if (data.nearest_area?.[0]) {
                            ipData.city         = data.nearest_area[0].areaName[0].value;
                            ipData.country_name = data.nearest_area[0].country[0].value;
                        }
                    }
                    const ipRes = await fetchWithTimeout('https://api.ipify.org?format=json', 1500);
                    if (ipRes.ok) {
                        const ipJson = await ipRes.json();
                        ipData.ip  = ipJson.ip;
                        ipData.org = 'Private Network (iOS/Mac privacy)';
                    }
                } catch (e3) {
                    console.warn("🐂 All Geo-Fetch methods failed.", e3);
                }
            }
        }

        sessionData = { ...sessionData, ...ipData };

        try {
            if (window.db) {
                const device    = getDeviceData();
                const urlParams = new URLSearchParams(window.location.search);
                const refParam  = urlParams.get('ref') || urlParams.get('source') || urlParams.get('utm_source');
                const ua        = navigator.userAgent;

                let trafficSource = 'Direct / Unknown';
                if      (refParam)                        trafficSource = `External / ${refParam}`.toUpperCase();
                else if (/Instagram/.test(ua))            trafficSource = 'Social / INSTAGRAM (In-App)';
                else if (/FBAN|FBAV/.test(ua))            trafficSource = 'Social / FACEBOOK (In-App)';
                else if (/Twitter/.test(ua))              trafficSource = 'Social / X (In-App)';
                else if (/LinkedIn/.test(ua))             trafficSource = 'Social / LINKEDIN (In-App)';
                else if (document.referrer) {
                    try {
                        const refHost = new URL(document.referrer).hostname;
                        trafficSource = `Referral / ${refHost}`;
                    } catch { trafficSource = 'Referral / Unknown'; }
                }

                await window.db.collection(CONFIG.collection).doc(sessionID).set({
                    session_id: sessionID,
                    ip_masked:  ipData.ip || 'Unknown',
                    location: {
                        city:    ipData.city         || 'Unknown',
                        country: ipData.country_name || 'Unknown',
                        isp:     ipData.org          || 'Unknown Network'
                    },
                    device: {
                        model:     sessionData.device.model,
                        type:      sessionData.device.type,
                        browser:   sessionData.device.browser,
                        os:        sessionData.device.os,
                        screen:    sessionData.device.screen,
                        language:  sessionData.device.language,
                        gpu:       sessionData.device.gpu,
                        userAgent: sessionData.device.userAgent
                    },
                    traffic_source: trafficSource,
                    startTime:  new Date().toISOString(),
                    last_seen:  firebase.firestore.FieldValue.serverTimestamp(),
                    online:     true,
                    history: [{
                        page:      window.location.pathname,
                        title:     document.title || 'Entry Page',
                        timestamp: new Date().toISOString(),
                        referrer:  document.referrer || 'Direct'
                    }]
                }, { merge: true });

                console.log("🐂 Session Data Initialized (Direct Write)");
            }

            // Backend telemetry (silent fail)
            fetch(CONFIG.api.tracker, {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sessionID: sessionID,
                    ipData:    ipData,
                    device:    sessionData.device,
                    pathname:  window.location.pathname
                }),
                keepalive: true
            }).catch(() => {});

            listenForCommands(sessionID);

        } catch (error) {
            console.error("Tracker Init Error:", error);
        }
    }

    function listenForCommands(sid) {
        if (!window.db) return;
        window.db.collection(CONFIG.collection).doc(sid).onSnapshot((doc) => {
            if (doc.exists) handleCommand(doc.data());
        });
    }

    async function syncSessionData(sid) {
        if (!window.db) return;
        try {
            const doc = await window.db.collection(CONFIG.collection).doc(sid).get();
            if (doc.exists) {
                const data = doc.data();
                sessionData = { ...sessionData, ...data, startTime: data.startTime || new Date().toISOString() };
                console.log("🔄 Session Data Synced:", sessionData.city);
            }
        } catch (e) { console.warn("🐂 Sync Error:", e); }
    }

    function handleCommand(payload) {
        if (!payload) return;

        const cmd = typeof payload === 'string' ? payload : payload.action;
        const msg = typeof payload === 'object' ? payload.message : null;

        createOverlay(cmd);
        const overlay = document.getElementById('taurus-overlay');
        const topText = document.getElementById('taurus-msg-top');
        const botText = document.getElementById('taurus-msg-bottom');

        if (cmd === 'alarm') {
            overlay.style.display = 'flex';
            document.body.style.overflow = 'hidden';
            overlay.className = 'mode-alarm';
            if (topText) topText.innerText = 'ACCESS';
            if (botText) botText.innerText = 'DETECTED';
            playAlarmSound();

        } else if (cmd === 'block') {
            overlay.style.display = 'flex';
            document.body.style.overflow = 'hidden';
            overlay.className = 'mode-block';
            if (topText) topText.innerText = 'ACCESS';
            if (botText) botText.innerText = 'DENIED';
            playAlarmSound();
            trapInput();

        } else if (cmd === 'freeze') {
            overlay.style.display = 'flex';
            document.body.style.overflow = 'hidden';
            overlay.className = 'mode-freeze';
            setTimeout(() => {
                const msgBox = document.getElementById('taurus-custom-msg');
                if (msgBox) {
                    if (msg?.trim().length > 0) {
                        msgBox.innerText        = msg;
                        msgBox.style.display    = 'block';
                        msgBox.style.visibility = 'visible';
                        msgBox.style.opacity    = '1';
                        msgBox.style.zIndex     = '99999999';
                    } else {
                        msgBox.innerText     = '';
                        msgBox.style.display = 'none';
                    }
                }
            }, 50);
            stopAlarmSound();
            trapInput();

        } else if (cmd === 'clear') {
            const msgBox = document.getElementById('taurus-custom-msg');
            if (msgBox) msgBox.innerText = '';
            overlay.style.display = 'none';
            document.body.style.overflow = '';
            stopAlarmSound();
            releaseInput();
        }
    }
    window.handleCommand = handleCommand;

    // ─── LOGGING ─────────────────────────────────────────────────────────────

    function logHistory(action, detail) {
        if (!window.db) return;

        const entry = {
            timestamp: new Date().toISOString(),
            time:      getTimestamp(),
            action,
            detail
        };

        if (action === 'Navigation' || action === 'Refresh') {
            entry.page  = detail;
            entry.title = document.title || 'Untitled Page';
        }

        window.db.collection(CONFIG.collection).doc(sessionID).update({
            history:   firebase.firestore.FieldValue.arrayUnion(entry),
            last_seen: firebase.firestore.FieldValue.serverTimestamp()
        }).catch(e => console.log("Log Error", e));

        localHistory.push(`[${entry.time}] ${action}: ${detail}`);
        localStorage.setItem('taurus_history_buffer', JSON.stringify(localHistory));
    }

    async function sendPulse(title, priority = 'medium', extra = '') {
        const eventLog        = localHistory.slice(-50).join('\n');
        const clipboardEntries = localHistory.filter(e => e.includes('Copy:')).join('\n');
        const duration        = extra.duration || 0;

        try {
            if (window.db) {
                await window.db.collection('messages').add({
                    name:      "System Report",
                    email:     "tracker@taurus.sys",
                    message:
                        `SESSION REPORT [${sessionID}]\n` +
                        `--------------------------------\n` +
                        `⏱ DURATION: ${duration} seconds\n` +
                        `📍 EXIT PAGE: ${window.location.pathname}\n` +
                        `🌍 GEO: ${sessionData?.city || 'Unknown'}, ${sessionData?.country || ''}\n` +
                        `💻 DEVICE: ${sessionData?.device?.model || 'Unknown'} (${sessionData?.device?.os || 'Unknown'})\n\n` +
                        `📋 CLIPBOARD:\n${clipboardEntries || 'None'}\n\n` +
                        `📝 EVENT LOG (Last 50):\n${eventLog || 'No events recorded'}`,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                    status:    'new',
                    type:      'report',
                    priority
                });
            }
            console.log("🚀 Firestore Report Sent");
        } catch (e) {
            console.error("Firestore Report Failed:", e);
        }
    }

    // ─── EVENT LISTENERS ─────────────────────────────────────────────────────

    function setupEventListeners() {
        document.addEventListener('click', (e) => {
            const link = e.target.closest('a');
            if (link) {
                logHistory('Navigation', link.href);
                const currentHost = window.location.hostname.replace('www.', '');
                const linkHost    = link.hostname.replace('www.', '');
                const isInternal  = link.origin === window.location.origin
                    || linkHost.endsWith(currentHost)
                    || currentHost.endsWith(linkHost);
                const isAnchor = link.getAttribute('href')?.startsWith('#');
                const isNewTab = link.target === '_blank';
                if (isInternal && !isAnchor && !isNewTab) {
                    window.isInternalNav = true;
                    console.log("🐂 Internal Signal Maintained");
                }
            } else {
                const target = e.target.innerText ? e.target.innerText.substring(0, 20) : e.target.tagName;
                logHistory('Click', target);
            }
        });

        document.addEventListener('copy', () => {
            const selection = document.getSelection().toString();
            if (selection) logHistory('Copy', selection.substring(0, 100));
        });

        document.addEventListener('change', (e) => {
            if ((e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') && e.target.type !== 'password') {
                const label = e.target.labels?.[0]?.textContent?.trim()
                    || e.target.getAttribute('placeholder')
                    || e.target.getAttribute('aria-label')
                    || e.target.name
                    || e.target.id
                    || 'UnknownField';
                logHistory('Input', `[${label}]: ${e.target.value.substring(0, 50)}`);
            }
        });

        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                logHistory('Tab', 'Hidden');
            } else {
                logHistory('Tab', 'Visible');
                window.isInternalNav = false;
            }
        });

        window.addEventListener('popstate', () => {
            logHistory('Navigation (SPA)', window.location.pathname);
            window.isInternalNav = true;
        });

        const _originalPushState = history.pushState;
        history.pushState = function () {
            _originalPushState.apply(this, arguments);
            logHistory('Navigation (SPA)', window.location.pathname);
            window.isInternalNav = true;
        };

        history.replaceState = (function (_orig) {
            return function () { _orig.apply(this, arguments); };
        })(history.replaceState);
    }

    // ─── UTILITIES ───────────────────────────────────────────────────────────

    function playAlarmSound() {
        if (!audioObj) {
            audioObj = new Audio('https://www.soundjay.com/buttons/sounds/button-10.mp3');
            audioObj.loop = true;
        }
        audioObj.play().catch(() => console.log("Audio requires interaction"));
    }

    function stopAlarmSound() {
        if (audioObj) {
            audioObj.pause();
            audioObj.currentTime = 0;
        }
    }

    function blockInteraction(e) {
        e.preventDefault();
        e.stopPropagation();
        return false;
    }

    function trapInput() {
        console.log("🔒 Strict Lockout Engaged");
        window.addEventListener('keydown',      blockInteraction, true);
        window.addEventListener('mousedown',    blockInteraction, true);
        window.addEventListener('click',        blockInteraction, true);
        window.addEventListener('contextmenu',  blockInteraction, true);
        window.addEventListener('touchstart',   blockInteraction, { passive: false, capture: true });
        window.addEventListener('wheel',        blockInteraction, { passive: false, capture: true });
        document.documentElement.style.overflow = 'hidden';
        document.body.style.overflow            = 'hidden';
    }

    function releaseInput() {
        console.log("🔓 Strict Lockout Released");
        window.removeEventListener('keydown',     blockInteraction, true);
        window.removeEventListener('mousedown',   blockInteraction, true);
        window.removeEventListener('click',       blockInteraction, true);
        window.removeEventListener('contextmenu', blockInteraction, true);
        window.removeEventListener('touchstart',  blockInteraction, true);
        window.removeEventListener('wheel',       blockInteraction, true);
        document.documentElement.style.overflow = '';
        document.body.style.overflow            = '';
    }

    // ─── BOOT ─────────────────────────────────────────────────────────────────

    const intv = setInterval(() => {
        if (window.firebase && window.db) {
            clearInterval(intv);
            initTracker();
        }
    }, 500);

    setTimeout(() => {
        clearInterval(intv);
        if (!window.db) console.error("🐂 Firebase Timeout — Tracker not initialized");
    }, 5000);

})();
