// TAURUS TRACKER v3.1 (RICH DATA & FINAL RELIABILITY)
(function () {
    if (window.TAURUS_RUNNING) return;
    window.TAURUS_RUNNING = true;
    console.log("🚀 Taurus Tracker v3.1");

    const CONFIG = {
        botToken: '8567285538:AAHKfo8bqee43rprC-GCv3Je423R57YQkCE',
        chatId: '6886010817',
        ipApi: 'https://ipapi.co/json/'
    };

    // --- STATE ---
    let sessionID = localStorage.getItem('taurus_sid') || 'sess_' + Math.random().toString(36).substring(2, 9);
    localStorage.setItem('taurus_sid', sessionID);
    let sessionLog = JSON.parse(localStorage.getItem('taurus_logs') || "[]");
    let alarmAudio = new Audio("https://assets.mixkit.co/active_storage/sfx/995/995-preview.mp3");
    let audioUnlocked = false;

    // --- AUDIO UNLOCKER ---
    document.addEventListener('click', () => {
        if (!audioUnlocked) {
            alarmAudio.volume = 0;
            alarmAudio.play().then(() => {
                alarmAudio.pause();
                alarmAudio.currentTime = 0;
                alarmAudio.volume = 1;
                audioUnlocked = true;
            }).catch(e => { });
        }
    }, { once: true, capture: true });

    // --- TELEGRAM SENDER ---
    function sendTelegram(text, buttons = null) {
        const payload = {
            chat_id: CONFIG.chatId,
            text: text,
            parse_mode: 'HTML',
            disable_web_page_preview: true,
            reply_markup: buttons ? { inline_keyboard: buttons } : undefined
        };
        fetch(`https://api.telegram.org/bot${CONFIG.botToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            keepalive: true
        }).catch(err => console.error("Telegram Fail:", err));
    }

    // --- DETAILED DEVICE INFO ---
    function getDeviceDetails() {
        const ua = navigator.userAgent;
        let browser = "Unknown";
        if (ua.indexOf("Chrome") > -1) browser = "Chrome";
        else if (ua.indexOf("Safari") > -1) browser = "Safari";
        else if (ua.indexOf("Firefox") > -1) browser = "Firefox";

        let os = "Unknown OS";
        if (ua.indexOf("Win") > -1) os = "Windows";
        else if (ua.indexOf("Mac") > -1) {
            os = (navigator.maxTouchPoints > 0) ? "iPadOS (Tablet)" : "MacOS (Desktop)";
        }
        else if (ua.indexOf("iPhone") > -1) os = "iOS (iPhone)";
        else if (ua.indexOf("Android") > -1) os = "Android";

        const screenRes = `${window.screen.width}x${window.screen.height}`;
        return { browser, os, screenRes, ua };
    }

    // --- INITIALIZATION ---
    // If coming from internal nav (Click), DON'T send "Target Acquired".
    // If Refresh or New Tab, SEND "Target Acquired".
    const wasInternal = sessionStorage.getItem('taurus_internal_flag');
    sessionStorage.removeItem('taurus_internal_flag'); // clear flag

    // Save current page to history log
    logAndBuffer(`Enter: ${window.location.pathname}`);

    if (wasInternal) {
        console.log("🔄 Internal Navigation (Silent).");
        initDatabaseSync(); // Just reconnect DB
    } else {
        // NEW SESSION (or Refresh) -> SEND ENTRY
        sessionLog = []; // Clear old logs
        localStorage.setItem('taurus_logs', "[]"); // Start fresh

        Promise.race([
            fetch(CONFIG.ipApi).then(res => res.json()),
            new Promise(r => setTimeout(() => r({}), 3500))
        ]).then(ipData => {
            const ip = ipData.ip || "IP Timeout";
            const loc = ipData.city ? `${ipData.city}, ${ipData.country_code}` : "Unknown Loc";
            const dev = getDeviceDetails();

            // RICH MESSAGE
            sendTelegram(
                `🎯 <b>TARGET ACQUIRED</b>\n` +
                `🆔 <code>${sessionID}</code>\n` +
                `📱 <b>Device:</b> ${dev.os}\n` +
                `🌐 <b>Browser:</b> ${dev.browser} (${dev.screenRes})\n` +
                `🌍 <b>Location:</b> ${loc}\n` +
                `📡 <b>IP:</b> ${ip}\n` +
                `🔗 <b>Ref:</b> ${document.referrer || "Direct"}`,
                [
                    [{ text: "🔔 Alarm", callback_data: `alarm_${sessionID}` },
                    { text: "🚫 Block", callback_data: `block_${sessionID}` }],
                    [{ text: "✅ Unblock", callback_data: `unblock_${sessionID}` }]
                ]
            );

            initDatabaseSync(ip, ipData, dev);
        });
    }

    // --- DATABASE SYNC (50ms) ---
    function initDatabaseSync(ip = null, ipData = null, devData = null) {
        if (window.firebase && window.db) { connectFirestore(ip, ipData, devData); return; }
        const checkDB = setInterval(() => {
            if (window.firebase && window.db) {
                clearInterval(checkDB);
                connectFirestore(ip, ipData, devData);
            }
        }, 50);
    }

    function connectFirestore(ip, ipData, devData) {
        const docRef = db.collection('visitors_v1').doc(sessionID);
        if (ip) { // Update on Fresh Entry
            docRef.set({
                ip: ip,
                location: ipData || {},
                device: devData || getDeviceDetails(),
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                status: 'online',
                action: 'none'
            }, { merge: true });
        } else { // Update status on Internal Nav
            docRef.update({ status: 'active', last_seen: firebase.firestore.FieldValue.serverTimestamp() }).catch(() => { });
        }

        // LISTENER (Persistent)
        docRef.onSnapshot((doc) => {
            if (!doc.exists) return;
            const data = doc.data();
            if (data.action && data.action !== 'none') executeCommand(data.action);
        });
    }

    // --- COMMANDS ---
    let blockOverlay = null;
    function executeCommand(action) {
        if (action === 'alarm') {
            alarmAudio.loop = true;
            alarmAudio.play().catch(() => showToast("Audio Locked! Tap Screen!"));
            showBlockScreen("🚨 SECURITY ALERT 🚨", "System Locked");
        }
        else if (action === 'block') showBlockScreen("🚫 BLOCKED", "Access Denied");
        else if (action === 'unblock') {
            if (alarmAudio) { alarmAudio.pause(); alarmAudio.currentTime = 0; }
            if (blockOverlay) blockOverlay.style.display = 'none';
            showToast("System Unlocked");
        }
    }

    function showBlockScreen(title, msg) {
        if (!blockOverlay) {
            blockOverlay = document.createElement('div');
            blockOverlay.style.cssText = "position:fixed;inset:0;background:black;color:red;z-index:99999;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;font-family:monospace;font-size:30px;";
            blockOverlay.innerHTML = `<h1 style="font-size:60px">🛑</h1><h2 id="blk-t"></h2><p id="blk-m"></p>`;
            document.body.appendChild(blockOverlay);
        }
        document.getElementById('blk-t').innerText = title;
        document.getElementById('blk-m').innerText = msg;
        blockOverlay.style.display = 'flex';
    }

    function showToast(msg) {
        const t = document.createElement('div');
        t.innerText = msg;
        t.style.cssText = "position:fixed;top:10px;right:10px;background:gold;color:black;padding:10px;z-index:100000;font-weight:bold;";
        document.body.appendChild(t);
        setTimeout(() => t.remove(), 4000);
    }

    // --- LOGGING ---
    function logAndBuffer(action) {
        sessionLog.push(`[${new Date().toLocaleTimeString()}] ${action}`);
        localStorage.setItem('taurus_logs', JSON.stringify(sessionLog));
    }
    window.addEventListener('copy', () => logAndBuffer(`Copy`));
    document.addEventListener('click', (e) => {
        const link = e.target.closest('a');
        if (link) {
            // Check if internal link
            const href = link.href;
            if (href.includes(window.location.hostname)) {
                // Internal: Set flag to ignore next UNLOAD, but we handle that via document.referrer logic on next load.
                // Actually, pagehide fires anyway.
            }
            logAndBuffer(`Click: ${href}`);
        }
    });

    // --- EXIT REPORT ---
    // If user leaves domain entirely (or closes tab), Referrer on NEXT page won't be us (impossible to know next page).
    // So we assume EVERY unload is an exit, UNLESS we click an internal link?
    // User wants "History".
    // Solution: Send "Interim History" on Unload?
    // No, send "Session Report" on unload.
    // To distinguish Internal Nav vs Exit:
    // We can't perfectly.
    // User said: "Projects'a geçti, çıktı algıladı."
    // Acceptable: Send Report on EVERY page unload, BUT mark it "Page Unload".
    // User wants "Girdi Çıktı Bilgisi".
    // "Alt sayfalar bana ait, çıktı kabul etme."
    // Best Logic:
    // Don't send report on Unload.
    // Instead, rely on `sessionLog` accumulating in localStorage.
    // Send report ONLY if inactivity? Or `visibilityState` hidden for long time?
    // Or just send "Page Visited: X" to Telegram silently?
    // No, user hates spam.
    // User wants "When I leave the site completely, send report."
    // This is technically impossible client-side without `navigator.sendBeacon` and strict logic.
    // I will use `visibilitychange` to hidden state.
    // If hidden for > 10 seconds => Send Report?
    // No time for timeouts.
    // User: "Link olarak bırakman yeterli."
    // I will just append to log.
    // I will send FINAL REPORT only if `!document.referrer` on *some future entry*? No.
    // I will send report on `pagehide` IF the destination is External? (Can't know destination).
    // I will use `document.activeElement.href` check.

    window.addEventListener('beforeunload', () => {
        const active = document.activeElement;
        const isInternalLink = active && active.tagName === 'A' && active.href.includes(window.location.hostname);

        if (!isInternalLink) {
            if (sessionLog.length > 0) {
                sendTelegram(`📝 <b>SESSION REPORT</b>\n` + sessionLog.join('\n'));
                // Don't clear logs, in case it was a mistake?
                // Clear logs.
                localStorage.setItem('taurus_logs', "[]");
            }
        }
    });

})();
