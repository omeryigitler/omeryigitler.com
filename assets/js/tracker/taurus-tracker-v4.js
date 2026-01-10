// TAURUS TRACKER v4.0 (Premium UI Refined)
/**
 * TAURUS TRACKER v4.0 (Final System)
 * ----------------------------------
 * - Database: Firestore (visitors_v4)
 * - History: Detailed event logging (ArrayUnion)
 * - Design: Custom "Access Detected" / "Access Denied" UI
 * - Notifications: Telegram for Entry/Alerts only.
 */

(function () {
    console.log("🐂 Taurus Tracker v4.0 Initializing...");

    // CONFIGURATION
    const CONFIG = {
        collection: 'visitors_v1',
        telegramBotToken: '8567285538:AAHKfo8bqee43rprC-GCv3Je423R57YQkCE',
        telegramChatID: '6886010817',
        ipApi: 'https://ipapi.co/json/'
    };

    // STATE
    let sessionID = localStorage.getItem('taurus_session_id');
    let sessionData = {};
    let localHistory = JSON.parse(localStorage.getItem('taurus_history_buffer') || "[]");
    let audioObj = null;

    // --- 1. VISUAL INTERFACE (THE DESIGN) ---

    // Inject CSS
    const css = `
        @import url('https://fonts.googleapis.com/css2?family=Syncopate:wght@400;700;900&display=swap');

        /* Overlay Base */
        #taurus-overlay {
            position: fixed;
            top: 0; left: 0; width: 100%; height: 100%;
            z-index: 99999;
            display: none;
            justify-content: center;
            align-items: center;
            flex-direction: column;
            font-family: 'Syncopate', sans-serif;
            background: #050505;
            user-select: none;
            overflow: hidden;
        }

        .taurus-grid-bg {
            position: absolute;
            inset: 0;
            background-size: 50px 50px;
            background-image:
                linear-gradient(to right, rgba(255, 255, 255, 0.03) 1px, transparent 1px),
                linear-gradient(to bottom, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
            opacity: 0.3;
            z-index: 0;
        }

        .taurus-glow-bg {
            position: absolute;
            top: 50%; left: 50%;
            transform: translate(-50%, -50%);
            width: 800px;
            height: 800px;
            background: radial-gradient(circle, rgba(255, 215, 0, 0.1) 0%, rgba(255, 0, 0, 0.05) 50%, transparent 100%);
            border-radius: 50%;
            filter: blur(100px);
            animation: taurus-pulse-glow 6s infinite alternate;
            z-index: 0;
        }

        @keyframes taurus-pulse-glow {
            from { opacity: 0.4; transform: translate(-50%, -50%) scale(0.9); }
            to { opacity: 0.8; transform: translate(-50%, -50%) scale(1.1); }
        }

        /* Logo Container */
        .taurus-logo-wrapper {
            position: relative;
            width: 160px;
            height: 160px;
            background: #0a0a0a;
            border: 2px solid #FFD700;
            border-radius: 50%;
            display: flex;
            justify-content: center;
            align-items: center;
            margin-bottom: 50px;
            box-shadow: 0 0 50px rgba(255, 215, 0, 0.4);
            z-index: 10;
        }

        .taurus-logo-ping {
            position: absolute;
            inset: -8px;
            border: 2px solid rgba(255, 215, 0, 0.3);
            border-radius: 50%;
            animation: taurus-ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;
        }

        @keyframes taurus-ping {
            75%, 100% { transform: scale(1.2); opacity: 0; }
        }

        .taurus-logo-img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            border-radius: 50%;
        }

        /* Text & Content Styling */
        .taurus-content {
            position: relative;
            z-index: 10;
            text-align: center;
            max-width: 500px;
            width: 90%;
            display: flex;
            flex-direction: column;
            align-items: center;
        }

        .taurus-text-top {
            font-size: 1.4rem;
            font-weight: 900;
            color: #FFD700; /* Yellow */
            border: 2px solid #FFD700;
            padding: 10px 35px;
            letter-spacing: 0.6em;
            text-indent: 0.6em; /* Direct compensation for centering */
            display: inline-block;
            margin-bottom: 25px;
            background: rgba(255, 215, 0, 0.05);
            box-shadow: 0 0 20px rgba(255, 215, 0, 0.2);
            font-family: 'Syncopate', sans-serif;
            text-transform: uppercase;
        }

        .taurus-text-bottom {
            font-size: 3.2rem;
            font-weight: 900;
            color: #FF0000; /* Red */
            text-shadow: 0 0 30px rgba(255, 0, 0, 0.6);
            letter-spacing: 0.2em;
            margin-right: -0.2em; /* Fix centering for letter-spacing */
            display: block;
            margin-bottom: 40px;
            animation: taurus-pulse-text 1.5s infinite alternate;
            font-family: 'Syncopate', sans-serif;
            text-transform: uppercase;
        }

        .taurus-detail-panel {
            background: rgba(10, 10, 10, 0.7);
            border: 1px solid rgba(255, 255, 255, 0.05);
            backdrop-filter: blur(20px);
            padding: 30px;
            border-radius: 20px;
            margin-bottom: 40px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.5);
            width: 100%;
        }

        .taurus-detail-text {
            color: rgba(255, 255, 255, 0.5);
            font-size: 10px;
            letter-spacing: 0.2em;
            text-transform: uppercase;
            line-height: 2;
            margin-bottom: 25px;
        }

        .taurus-token-box {
            display: inline-block;
            padding: 12px 25px;
            background: rgba(255, 215, 0, 0.05);
            border: 1px solid rgba(255, 215, 0, 0.2);
            border-radius: 50px;
        }

        .taurus-token-label {
            color: rgba(255, 215, 0, 0.5);
            font-size: 7px;
            letter-spacing: 0.3em;
            margin-bottom: 5px;
            text-transform: uppercase;
        }

        .taurus-token-value {
            color: white;
            font-family: monospace;
            font-size: 11px;
            letter-spacing: 0.1em;
        }

        .taurus-footer {
            opacity: 0.4;
            display: flex;
            flex-direction: column;
            align-items: center;
        }

        .taurus-line {
            width: 1px;
            height: 60px;
            background: linear-gradient(to bottom, #FFD700, transparent);
            margin-bottom: 20px;
        }

        .taurus-footer-text {
            color: #FFD700;
            font-size: 8px;
            font-weight: bold;
            letter-spacing: 0.5em;
            animation: taurus-pulse-opacity 2s infinite ease-in-out;
            text-transform: uppercase;
        }

        @keyframes taurus-pulse-text {
            from { transform: scale(1); opacity: 0.9; }
            to { transform: scale(1.05); opacity: 1; }
        }

        @keyframes taurus-pulse-opacity {
            0%, 100% { opacity: 0.3; }
            50% { opacity: 1; }
        }

        .taurus-btn-ack {
            margin-top: 25px;
            background: #FFD700;
            color: #000;
            border: none;
            padding: 12px 40px;
            border-radius: 50px;
            font-family: 'Syncopate', sans-serif;
            font-weight: 900;
            font-size: 0.65rem;
            letter-spacing: 0.25em;
            cursor: pointer;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            box-shadow: 0 0 20px rgba(255, 215, 0, 0.3);
            text-transform: uppercase;
            width: 100%;
        }

        .taurus-btn-ack:hover {
            transform: translateY(-2px);
            background: #fff;
            box-shadow: 0 5px 25px rgba(255, 215, 0, 0.5);
        }

        .mode-block #taurus-ack-btn {
            display: none;
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

        // Logo Content (using window.TAURUS_LOGO_DATA or fallback)
        const logoSrc = window.TAURUS_LOGO_DATA || 'assets/favicon_taurus.png';

        overlay.innerHTML = `
            <div class="taurus-grid-bg"></div>
            <div class="taurus-glow-bg"></div>
            
            <div class="taurus-content">
                <div class="taurus-logo-wrapper">
                    <img src="${logoSrc}" class="taurus-logo-img" alt="Taurus">
                    <div class="taurus-logo-ping"></div>
                </div>
                
                <div class="taurus-text-group">
                    <div class="taurus-text-top" id="taurus-msg-top">ACCESS</div>
                    <div class="taurus-text-bottom" id="taurus-msg-bottom">DETECTED</div>
                </div>

                <div class="taurus-detail-panel">
                    <p class="taurus-detail-text">
                        Platform Security has flagged this connection.<br>
                        Access protocols have been initiated to maintain system integrity.
                    </p>
                    <div class="taurus-token-box">
                        <div class="taurus-token-label">INCIDENT TOKEN</div>
                        <div class="taurus-token-value" id="taurus-token-val">T-8524-7X</div>
                    </div>
                    <button class="taurus-btn-ack" id="taurus-ack-btn">ACKNOWLEDGE</button>
                </div>

                <div class="taurus-footer">
                    <div class="taurus-line"></div>
                    <div class="taurus-footer-text">RESTRICTED ACCESS MODE</div>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);

        // Dynamic Token
        if (sessionID) document.getElementById('taurus-token-val').innerText = sessionID;

        // Acknowledge Logic
        const btn = document.getElementById('taurus-ack-btn');
        if (btn) {
            btn.onclick = () => {
                overlay.style.display = 'none';
                stopAlarmSound();

                // SECONDARY MESSAGE: systemAlert (Neutron UX)
                if (window.systemAlert) {
                    window.systemAlert(
                        "SECURITY ALERT",
                        "Unauthorized Access or Suspicious Activity Detected! Your session is being monitored.",
                        "shield-alert"
                    );
                }

                // Clear Command from Firestore
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
        try {
            const ipData = await fetch(CONFIG.ipApi).then(res => res.json());

            sessionData = {
                sessionID: sessionID,
                ip: ipData.ip,
                city: ipData.city,
                country: ipData.country_name,
                org: ipData.org,
                device: navigator.platform,
                browser: navigator.userAgent,
                startTime: new Date().toISOString(),
                status: 'online',
                history: [
                    { time: getTimestamp(), action: 'Entrance', detail: window.location.href }
                ]
            };

            // 1. Initialize Firestore Document
            if (window.db) {
                await window.db.collection(CONFIG.collection).doc(sessionID).set(sessionData);
                console.log("🔥 Firestore Session Created");
            }

            // 2. Send Telegram Notification (Only Once)
            const telegramMsg = `🎯 <b>Neural Link Established</b>\n\n` +
                `🆔 <b>ID:</b> <code>${sessionID}</code>\n` +
                `🌍 <b>Loc:</b> ${ipData.city}, ${ipData.country_name}\n` +
                `📡 <b>IP:</b> <code>${ipData.ip}</code>\n` +
                `🏢 <b>ISP:</b> ${ipData.org}\n` +
                `💻 <b>Sys:</b> ${navigator.platform}`;

            const buttons = {
                inline_keyboard: [
                    [
                        { text: "🚨 ALARM", callback_data: `alarm_${sessionID}` },
                        { text: "⛔ BLOCK", callback_data: `block_${sessionID}` }
                    ],
                    [
                        { text: "🟢 CLEAR", callback_data: `clear_${sessionID}` }
                    ]
                ]
            };

            fetch(`https://api.telegram.org/bot${CONFIG.telegramBotToken}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: CONFIG.telegramChatID,
                    text: telegramMsg,
                    parse_mode: 'HTML',
                    reply_markup: buttons
                }),
                keepalive: true
            });

            // Start Listening
            listenForCommands(sessionID);

        } catch (error) {
            console.error("Tracker Init Error:", error);
        }
    }

    function listenForCommands(sid) {
        if (!window.db) return;

        window.db.collection(CONFIG.collection).doc(sid)
            .onSnapshot((doc) => {
                if (doc.exists) {
                    const data = doc.data();
                    handleCommand(data.action);
                }
            });
    }

    function handleCommand(cmd) {
        if (!cmd) return;
        createOverlay();
        const overlay = document.getElementById('taurus-overlay');
        const topText = document.getElementById('taurus-msg-top');
        const botText = document.getElementById('taurus-msg-bottom');

        if (cmd === 'alarm') {
            overlay.style.display = 'flex';
            overlay.className = 'mode-alarm';
            topText.innerText = 'ACCESS';
            botText.innerText = 'DETECTED'; // User confirmed "DETECTED" for Alarm
            playAlarmSound();
        } else if (cmd === 'block') {
            overlay.style.display = 'flex';
            overlay.className = 'mode-block';
            topText.innerText = 'ACCESS';
            botText.innerText = 'DENIED';
            playAlarmSound();
            trapInput();
        } else if (cmd === 'clear') {
            overlay.style.display = 'none';
            stopAlarmSound();
            // Release Input
            document.onkeydown = null;
            document.oncontextmenu = null;
        }
    }

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
        const msg = `🔔 <b>${title}</b>\n` +
            `🆔 ID: <code>${sessionID}</code>\n` +
            `🌍 Loc: ${sessionData?.city || 'Unknown'}\n` +
            (extra ? `\n${extra}` : '');

        try {
            fetch(`https://api.telegram.org/bot${CONFIG.telegramBotToken}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: CONFIG.telegramChatID,
                    text: msg,
                    parse_mode: 'HTML'
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

                // EXIT REPORT: Session Report (Per Rich Data Guide v4)
                const endTime = new Date();
                const startTime = sessionData?.startTime ? new Date(sessionData.startTime) : new Date();
                const duration = Math.round((endTime - startTime) / 1000);

                // Build detailed log content
                const eventLog = localHistory.slice(-20).join('\n'); // Last 20 events
                const report = `⏱ <b>Duration:</b> ${duration}s\n` +
                    `📍 <b>Final Page:</b> ${window.location.pathname}\n\n` +
                    `📝 <b>EVENT LOG:</b>\n<code>${eventLog || 'No events recorded'}</code>`;

                sendPulse("Session Report", 'high', report);

                // Clear local buffer after report sent (assume exit)
                // We keep it in localStorage till next page load to be safe
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
