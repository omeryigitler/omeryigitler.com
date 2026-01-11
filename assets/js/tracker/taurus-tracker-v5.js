// TAURUS TRACKER v5.0 (Shadow Mode / Backend Oriented)
/**
 * TAURUS TRACKER v5.0 (Final System)
 * ----------------------------------
 * - Altyapı: Backend Oriented (Engellenemez Gölge Modu)
 * - Güvenlik: Middleware IP Gating & Server-side Reporting
 * - Design: Radical UI v2 (Technical Precision)
 * - Kurallar: %100 Final Guide Compliance
 */

(function () {
    console.log("🐂 Taurus Tracker v5.0 (Shadow Mode) Initializing...");

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

        /* Signal Waves */
        @keyframes taurus-ping {
            0% { transform: scale(1); opacity: 0.8; }
            70%, 100% { transform: scale(2.2); opacity: 0; }
        }

        .taurus-signal-wave {
            position: absolute;
            inset: 0;
            border-radius: 50%;
            border: 4px solid rgba(255, 215, 0, 0.5);
            animation: taurus-ping 2.5s cubic-bezier(0, 0, 0.2, 1) infinite;
            pointer-events: none;
        }

        .taurus-signal-wave-delay {
            position: absolute;
            inset: 0;
            border-radius: 50%;
            border: 2px solid rgba(255, 215, 0, 0.3);
            animation: taurus-ping 2.5s cubic-bezier(0, 0, 0.2, 1) infinite 1.25s;
            pointer-events: none;
        }

        /* Content Blocks */
        .taurus-content {
            position: relative;
            z-index: 10;
            width: 100%;
            max-width: 500px;
            display: flex;
            flex-direction: column;
            align-items: center;
            padding-top: 2rem;
        }

        .taurus-logo-container {
            position: relative;
            width: 140px; height: 140px;
            margin-bottom: 2.5rem;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .taurus-logo-main {
            width: 100%; height: 100%;
            border-radius: 50%;
            background: #000;
            border: 2px solid rgba(255, 215, 0, 0.6);
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 0 70px rgba(255, 215, 0, 0.4);
            position: relative;
            z-index: 20;
            overflow: hidden;
        }

        .taurus-logo-main img {
            width: 75%; height: 75%;
            object-contain: cover;
        }

        .taurus-title {
            font-family: 'Syncopate', sans-serif;
            font-weight: 900;
            text-transform: uppercase;
            letter-spacing: 0.4em;
            line-height: 1.2;
            margin-bottom: 2.5rem;
        }

        .taurus-title span:first-child { color: #FFD700; font-size: 1.5rem; }
        .taurus-title span:last-child { color: #EF4444; font-size: 1.5rem; display: block; margin-top: 0.5rem; filter: drop-shadow(0 0 15px rgba(239, 68, 68, 0.6)); }

        .taurus-panel {
            background: rgba(10, 10, 10, 0.4);
            border: 1px solid rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(30px);
            padding: 2.5rem 2rem;
            border-radius: 2.5rem;
            width: 90%;
            max-width: 400px;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
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
            margin-top: 3.5rem;
            display: flex;
            flex-direction: column;
            align-items: center;
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

        .taurus-btn-ack {
            margin-top: 2rem;
            background: #FFD700;
            color: #000;
            border: none;
            padding: 10px 0;
            border-radius: 50px;
            font-family: 'Syncopate', sans-serif;
            font-weight: 700;
            font-size: 0.65rem;
            letter-spacing: 0.2em;
            cursor: pointer;
            width: 100%;
            transition: all 0.3s ease;
            text-transform: uppercase;
        }

        .taurus-btn-ack:hover { background: #fff; transform: translateY(-1px); }

        .mode-block #taurus-ack-btn {
            visibility: hidden;
            pointer-events: none;
        }

        @media (min-width: 768px) {
            .taurus-title span:first-child, .taurus-title span:last-child { font-size: 1.8rem; }
            .taurus-panel-text { font-size: 11px; }
            .taurus-stat-item p:last-child { font-size: 13px; }
            .taurus-stat-item p:last-child { font-size: 13px; }
        }

        /* Freeze Mode (Show Feature) */
        .mode-freeze .taurus-title,
        .mode-freeze .taurus-panel,
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

        .mode-freeze .taurus-signal-wave,
        .mode-freeze .taurus-signal-wave-delay {
            animation-duration: 4s; /* Slower, calmer pulse */
            border-color: rgba(255, 215, 0, 0.3);
        }

        /* Custom Message (Hacker Typewriter) */
        #taurus-custom-msg {
            display: none;
            margin-top: 2rem;
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

        .mode-freeze #taurus-custom-msg {
            display: block; /* Show in freeze mode if content exists */
        }
    `;

    const style = document.createElement('style');
    style.innerHTML = css;
    document.head.appendChild(style);

    // Create Overlay Elements
    function createOverlay() {
        if (document.getElementById('taurus-overlay')) return;

        const overlay = document.createElement('div');
        overlay.id = 'taurus-overlay';

        const logoSrc = window.TAURUS_LOGO_DATA || 'assets/favicon_taurus.png';
        const displayIP = sessionData?.ip || '0.0.0.0';
        const displayCity = sessionData?.city || 'Unknown';

        overlay.innerHTML = `
            <div class="taurus-grid-bg"></div>
            <div class="taurus-axis-glow"></div>
            <div class="taurus-radial-glow"></div>
            
            <div class="taurus-content">
                <div class="taurus-logo-container">
                    <div class="taurus-signal-wave"></div>
                    <div class="taurus-signal-wave-delay"></div>
                    <div class="taurus-logo-main">
                        <img src="${logoSrc}" alt="Taurus">
                    </div>
                </div>
                
                <div id="taurus-custom-msg"></div>

                <h1 class="taurus-title">
                    <span id="taurus-msg-top">ACCESS</span>
                    <span id="taurus-msg-bottom">DETECTED</span>
                </h1>

                <div class="taurus-panel">
                    <p class="taurus-panel-text" id="taurus-panel-info">
                        Platform Security has flagged this connection. <br>
                        Access protocols have been initiated.
                    </p>

                    <div class="taurus-stats-grid">
                        <div class="taurus-stat-item">
                            <p>Network Address</p>
                            <p id="taurus-stat-ip">${displayIP}</p>
                        </div>
                        <div class="taurus-stat-item">
                            <p>Geo-Location</p>
                            <p id="taurus-stat-city">${displayCity}</p>
                        </div>
                        <div class="taurus-stat-item col-span-2">
                            <p>Session Identifier</p>
                            <p id="taurus-token-val">Initializing...</p>
                        </div>
                    </div>

                    <button class="taurus-btn-ack" id="taurus-ack-btn">ACKNOWLEDGE</button>
                </div>

                <div class="taurus-footer">
                    <div class="taurus-footer-line"></div>
                    <p class="taurus-footer-text">RESTRICTED ACCESS MODE</p>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);

        // Update with real data
        if (sessionID) document.getElementById('taurus-token-val').innerText = sessionID;

        // Acknowledge Logic
        const btn = document.getElementById('taurus-ack-btn');
        if (btn) {
            btn.onclick = () => {
                overlay.style.display = 'none';
                document.body.style.overflow = ''; // Restore scroll
                stopAlarmSound();
                if (window.db) {
                    window.db.collection(CONFIG.collection).doc(sessionID).update({ action: null });
                }
            };
        }
    }

    // --- 2. LOGIC & DATABASE ---

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
            // Existing Session: Just Log Refresh
            logHistory('Refresh', window.location.pathname);
            listenForCommands(sessionID);
        }

        // Setup Listeners
        setupEventListeners();
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
                    device: navigator.platform,
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

    function handleCommand(payload) {
        if (!payload) return;

        // Support both old string format and new object format
        const cmd = (typeof payload === 'string' ? payload : payload.action);
        const msg = (typeof payload === 'object' ? payload.message : null);

        createOverlay();
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
            document.body.style.overflow = 'hidden'; // Lock scroll
            overlay.className = 'mode-freeze';

            // Handle Custom Message
            if (msgBox) {
                if (msg) {
                    msgBox.innerText = msg;
                    msgBox.style.display = 'block';
                } else {
                    msgBox.style.display = 'none';
                }
            }

            // No text updates needed, CSS hides them
            stopAlarmSound(); // Silence for dramatic effect
            trapInput();
        } else if (cmd === 'clear') {
            if (msgBox) msgBox.innerText = ''; // Reset message
            overlay.style.display = 'none';
            document.body.style.overflow = ''; // Restore scroll
            stopAlarmSound();
            document.onkeydown = null;
            document.oncontextmenu = null;
        }
    }
    window.handleCommand = handleCommand; // Expose for testing

    // --- 3. LOGGING & INTERACTION ---

    function logHistory(action, detail) {
        if (!window.db) return;
        const entry = { time: getTimestamp(), action: action, detail: detail };

        // 1. Sync to Firestore (Intelligence)
        window.db.collection(CONFIG.collection).doc(sessionID).update({
            history: firebase.firestore.FieldValue.arrayUnion(entry)
        }).catch(e => console.log("Log Error", e));

        // 2. Buffer to Local (Rich Data)
        localHistory.push(`[${entry.time}] ${action}: ${detail}`);
        localStorage.setItem('taurus_history_buffer', JSON.stringify(localHistory));

        console.log(`📝 Log: ${action} - ${detail}`);
    }

    async function sendPulse(title, priority = 'medium', extra = '') {
        // Build detailed log content
        const eventLog = localHistory.slice(-20).join('\n'); // Last 20 events
        const reportText = `⏱ <b>Duration:</b> ${extra.duration}s\n` +
            `📍 <b>Final Page:</b> ${window.location.pathname}\n\n` +
            `📝 <b>EVENT LOG:</b>\n<code>${eventLog || 'No events recorded'}</code>`;

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

        // Visibility (Tab Change & Exit Reporting)
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                logHistory('Tab', 'Hidden');

                // EXIT REPORT: Session Report (via Backend)
                const endTime = new Date();
                const startTime = sessionData?.startTime ? new Date(sessionData.startTime) : new Date();
                const duration = Math.round((endTime - startTime) / 1000);

                sendPulse("Session Report", 'high', { duration: duration });

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

    function trapInput() {
        document.onkeydown = (e) => { e.preventDefault(); return false; };
        document.oncontextmenu = (e) => { e.preventDefault(); return false; };
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
