
// TAURUS TRACKER v2.0 (EMERGENCY SIMPLE MODE)
// Flat Architecture - No Async Complications
(function () {
    console.log("🚀 Taurus Tracker v2.0 Started");

    // --- CONFIGURATION ---
    const CONFIG = {
        botToken: '8567285538:AAHKfo8bqee43rprC-GCv3Je423R57YQkCE', // Verified
        chatId: '6886010817', // Verified
        ipApi: 'https://ipapi.co/json/'
    };

    // --- STATE ---
    let sessionLog = [];
    let sessionID = localStorage.getItem('taurus_sid') || 'sess_' + Math.floor(Math.random() * 1000000);
    localStorage.setItem('taurus_sid', sessionID);
    let deviceData = getSimpleDevice();

    // --- TELEGRAM SENDER (Robust) ---
    function sendTelegram(text, buttons = null) {
        // Log to console for user verify
        console.log("📨 Sending Telegram:", text);

        const payload = {
            chat_id: CONFIG.chatId,
            text: text,
            parse_mode: 'HTML',
            reply_markup: buttons ? { inline_keyboard: buttons } : undefined
        };

        // Use keepalive for reliability
        fetch(`https://api.telegram.org/bot${CONFIG.botToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            keepalive: true
        }).catch(err => console.error("Telegram Fail:", err));
    }

    // --- DEVICE DETECTION (Fixed for IPad/Mac) ---
    function getSimpleDevice() {
        const ua = navigator.userAgent;
        let platform = navigator.platform;
        let type = "Desktop";

        // iPad Detection (Modern)
        if (ua.includes("Mac") && navigator.maxTouchPoints > 2) {
            type = "Tablet (iPad)";
            platform = "iPadOS";
        } else if (/Mobi|Android/i.test(ua)) {
            type = "Mobile";
        }

        return { type, platform, ua };
    }

    // --- 1. IMMEDIATE ENTRY SIGNAL (Alive Check) ---
    // Sends IMMEDIATELY, does not wait for IP or DB.
    sendTelegram(
        `🔔 <b>ENTRY DETECTED (v2.0)</b>\n` +
        `🆔 <code>${sessionID}</code>\n` +
        `💻 ${deviceData.type} (${deviceData.platform})\n` +
        `⏳ Loading IP...`
    );

    // --- 2. ENRICH WITH IP (Async) ---
    fetch(CONFIG.ipApi)
        .then(res => res.json())
        .then(data => {
            const loc = `${data.city}, ${data.country_code}`;
            const ip = data.ip; // No mask for Admin to see truth
            const org = data.org;

            // Send Detailed Alert with Buttons
            const text = `📍 <b>VISITOR IDENTIFIED</b>\n` +
                `🆔 <code>${sessionID}</code>\n` +
                `🌍 ${loc}\n` +
                `🏢 ${org}\n` +
                `📡 ${ip}`;

            const buttons = [
                [{ text: "🔔 Alarm", callback_data: `alarm_${sessionID}` },
                { text: "🚫 Block", callback_data: `block_${sessionID}` }]
            ];

            sendTelegram(text, buttons);

            // SYNC TO FIREBASE (If available)
            if (window.firebase && window.db) {
                db.collection('visitors_v1').doc(sessionID).set({
                    ip: ip,
                    location: data,
                    device: deviceData,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                    status: 'online'
                }).catch(e => console.error("DB Error", e));
            }
        })
        .catch(e => sendTelegram(`⚠️ IP Fetch Failed: ${e.message}`));

    // --- 3. ACTIVITY LOGGING ---
    function logActivity(action, details) {
        const time = new Date().toLocaleTimeString();
        const entry = `[${time}] ${action}: ${details}`;
        sessionLog.push(entry);
        console.log("📝 Logged:", entry);

        // Auto-send if log gets too big (Prevent data loss)
        if (sessionLog.length >= 10) flushExitReport("Buffer Full");
    }

    // Event Listeners
    window.addEventListener('copy', () => logActivity("Copy", document.getSelection().toString().substring(0, 20)));
    document.addEventListener('click', (e) => {
        const a = e.target.closest('a');
        if (a) logActivity("Click", a.href);
    });

    // Scroll Depth
    let scrolled = false;
    window.addEventListener('scroll', () => {
        if (!scrolled && (window.innerHeight + window.scrollY) >= document.body.offsetHeight) {
            scrolled = true;
            logActivity("Scroll", "100% Depth");
        }
    });

    // --- 4. EXIT REPORT ---
    function flushExitReport(reason = "Exit") {
        if (sessionLog.length === 0) return;

        let report = `📝 <b>SESSION REPORT (${reason})</b>\n` +
            `🆔 <code>${sessionID}</code>\n` +
            `logs:\n` + sessionLog.join('\n');

        sendTelegram(report);
        sessionLog = []; // clear
    }

    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') flushExitReport("Hidden");
    });

    // Also try on beforeunload
    window.addEventListener('beforeunload', () => flushExitReport("Unload"));

    // Expose for remote control if needed
    window.sendPulse = logActivity;

})();
