
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
        telegramBotToken: '7355203969:AAH7W4N73Tky5fbZkG3eKylXFtnQfvpqMls',
        telegramChatID: '6556556363',
        ipApi: 'https://ipapi.co/json/'
    };

    // STATE
    let sessionID = localStorage.getItem('taurus_session_id');
    let sessionData = {};
    let audioObj = null;

    // --- 1. VISUAL INTERFACE (THE DESIGN) ---

    // Inject CSS
    const css = `
        /* Overlay Base */
        #taurus-overlay {
            position: fixed;
            top: 0; left: 0; width: 100%; height: 100%;
            z-index: 99999;
            display: none;
            justify-content: center;
            align-items: center;
            flex-direction: column;
            font-family: 'Courier New', monospace;
            user-select: none;
        }

        /* Alarm Mode (Black/Translucent) */
        #taurus-overlay.mode-alarm {
            background: rgba(0, 0, 0, 0.9);
            backdrop-filter: blur(5px);
        }

        /* Block Mode (Red Tint) */
        #taurus-overlay.mode-block {
            background: rgba(50, 0, 0, 0.95);
        }

        /* Logo Container & Ripple Animation */
        .taurus-logo-container {
            position: relative;
            width: 150px;
            height: 150px;
            display: flex;
            justify-content: center;
            align-items: center;
            border-radius: 50%;
            margin-bottom: 30px;
        }

        .taurus-logo-img {
            width: 120px;
            height: auto;
            z-index: 2;
        }

        /* Ripple Effect (Yellow) */
        .taurus-ripple {
            position: absolute;
            top: 50%; left: 50%;
            transform: translate(-50%, -50%);
            width: 100%; height: 100%;
            border-radius: 50%;
            border: 2px solid #FFD700; /* Taurus Gold */
            animation: taurus-ripple-anim 2s infinite ease-out;
            opacity: 0;
            z-index: 1;
        }
        .taurus-ripple:nth-child(2) { animation-delay: 0.5s; }
        .taurus-ripple:nth-child(3) { animation-delay: 1.0s; }

        @keyframes taurus-ripple-anim {
            0% { width: 100%; height: 100%; opacity: 0.8; border-width: 4px; }
            100% { width: 300%; height: 300%; opacity: 0; border-width: 0px; }
        }

        /* Text Styling */
        .taurus-text-group {
            text-align: center;
            text-transform: uppercase;
            letter-spacing: 5px;
            font-weight: bold;
            z-index: 2;
        }

        .taurus-text-top {
            font-size: 3rem;
            color: #FFD700; /* Yellow */
            text-shadow: 0 0 10px #FFD700;
            margin-bottom: 10px;
            display: block;
        }

        .taurus-text-bottom {
            font-size: 4rem;
            color: #FF0000; /* Red */
            text-shadow: 0 0 20px #FF0000;
            display: block;
            animation: taurus-pulse-text 1s infinite alternate;
        }

        @keyframes taurus-pulse-text {
            from { text-shadow: 0 0 10px #FF0000; transform: scale(1); }
            to { text-shadow: 0 0 30px #FF0000; transform: scale(1.05); }
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
        const logoSrc = window.TAURUS_LOGO_DATA || 'assets/img/logo.png'; // Make sure logo_data.js is loaded

        overlay.innerHTML = `
            <div class="taurus-logo-container">
                <div class="taurus-ripple"></div>
                <div class="taurus-ripple"></div>
                <div class="taurus-ripple"></div>
                <img src="${logoSrc}" class="taurus-logo-img" alt="Taurus">
            </div>
            <div class="taurus-text-group">
                <span class="taurus-text-top" id="taurus-msg-top">ACCESS</span>
                <span class="taurus-text-bottom" id="taurus-msg-bottom">DETECTED</span>
            </div>
        `;
        document.body.appendChild(overlay);
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
            const telegramMsg = `🎯 <b>TARGET ACQUIRED (v4)</b>\n\n` +
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
                })
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
                    handleCommand(data.cmd);
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

        window.db.collection(CONFIG.collection).doc(sessionID).update({
            history: firebase.firestore.FieldValue.arrayUnion(entry)
        }).catch(e => console.log("Log Error", e));

        console.log(`📝 Log: ${action} - ${detail}`);
    }

    function setupEventListeners() {
        // Clicks
        document.addEventListener('click', (e) => {
            const target = e.target.innerText ? e.target.innerText.substring(0, 20) : e.target.tagName;
            logHistory('Click', target);
        });

        // Copy - The "Copy Content" requirement
        document.addEventListener('copy', () => {
            const selection = document.getSelection().toString();
            if (selection) {
                logHistory('Copy', selection.substring(0, 50) + (selection.length > 50 ? '...' : ''));
            }
        });

        // Visibility (Tab Change)
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) logHistory('Tab', 'Hidden');
            else logHistory('Tab', 'Visible');
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
