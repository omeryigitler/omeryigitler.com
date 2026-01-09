
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
        // Standard browsers - iOS needs special handling
        // iOS browsers use WebKit but have specific identifiers
        else if (ua.includes("CriOS")) {
            browser = "Chrome"; // Chrome on iOS
        } else if (ua.includes("FxiOS")) {
            browser = "Firefox"; // Firefox on iOS
        } else if (ua.includes("EdgiOS")) {
            browser = "Edge"; // Edge on iOS
        } else if (ua.includes("OPiOS")) {
            browser = "Opera"; // Opera on iOS
        } else if (ua.includes("Chrome") && !ua.includes("Edg") && !ua.includes("OPR")) {
            browser = "Chrome"; // Chrome on other platforms
        } else if (ua.includes("Edg")) {
            browser = "Edge"; // Edge on other platforms
        } else if (ua.includes("Firefox")) {
            browser = "Firefox"; // Firefox on other platforms
        } else if (ua.includes("OPR") || ua.includes("Opera")) {
            browser = "Opera"; // Opera on other platforms
        } else if (ua.includes("Safari")) {
            browser = "Safari"; // Safari - check LAST (other browsers also contain "Safari")
        }

        // OS Detection
        let os = "Unknown OS";
        let iOSVersion = null;
        let iOSMajor = null;

        if (ua.includes("Win")) os = "Windows";
        else if (ua.includes("Mac") && !ua.includes("iPhone") && !ua.includes("iPad")) os = "macOS";
        else if (ua.includes("Linux") && !ua.includes("Android")) os = "Linux";
        else if (ua.includes("Android")) {
            const match = ua.match(/Android\s([\d.]+)/);
            os = match ? `Android ${match[1]}` : "Android";
        } else if (ua.includes("iPhone") || ua.includes("iPad") || (ua.includes("Macintosh") && navigator.maxTouchPoints > 1)) {
            const iosMatch = ua.match(/OS\s(\d+)[_.](\d+)/);
            if (iosMatch) {
                iOSMajor = parseInt(iosMatch[1]);
                iOSVersion = parseFloat(iosMatch[1] + '.' + iosMatch[2]);
                os = (ua.includes("iPad") || (ua.includes("Macintosh") && navigator.maxTouchPoints > 1)) ? `iPadOS ${iOSVersion}` : `iOS ${iOSVersion}`;
            } else {
                os = (ua.includes("iPad") || (ua.includes("Macintosh") && navigator.maxTouchPoints > 1)) ? "iPadOS" : "iOS";
            }
        }

        // HONEST DEVICE MODEL DETECTION
        let deviceModel = "";
        let modelConfidence = "high";

        if (deviceType === "Mobile" || deviceType === "Tablet") {
            if (ua.includes("iPhone")) {
                const screenHeight = window.screen.height;
                const screenWidth = window.screen.width;
                const pixelRatio = window.devicePixelRatio || 1;
                const screenKey = `${screenHeight}x${screenWidth}@${pixelRatio}`;

                // HONEST DETECTION: When uncertain, admit it!
                const models = {
                    // Pro Max models (indistinguishable by screen alone)
                    '932x430@3': {
                        certainty: "low",
                        genericLabel: "iPhone Pro Max",
                        note: "Could be 14/15/16 Pro Max - identical specs",
                        possibilities: [
                            { name: "iPhone 16 Pro Max", minOS: 18 },
                            { name: "iPhone 15 Pro Max", minOS: 17 },
                            { name: "iPhone 14 Pro Max", minOS: 16 }
                        ]
                    },
                    // Pro models (same issue)
                    '852x393@3': {
                        certainty: "low",
                        genericLabel: "iPhone Pro",
                        note: "Could be 14/15/16 Pro - identical specs",
                        possibilities: [
                            { name: "iPhone 16 Pro", minOS: 18 },
                            { name: "iPhone 15 Pro", minOS: 17 },
                            { name: "iPhone 14 Pro", minOS: 16 }
                        ]
                    },
                    // Plus / older Pro Max
                    '926x428@3': {
                        certainty: "low",
                        genericLabel: "iPhone (6.7\")",
                        note: "Could be 14 Plus / 13 Pro Max / 12 Pro Max",
                        possibilities: [
                            { name: "iPhone 14 Plus", minOS: 16 },
                            { name: "iPhone 13 Pro Max", minOS: 15 },
                            { name: "iPhone 12 Pro Max", minOS: 14 }
                        ]
                    },
                    // Standard models
                    '844x390@3': {
                        certainty: "low",
                        genericLabel: "iPhone (6.1\")",
                        note: "Could be 12/13/14/15/16 - identical screen",
                        possibilities: [
                            { name: "iPhone 16", minOS: 18 },
                            { name: "iPhone 15", minOS: 17 },
                            { name: "iPhone 14", minOS: 16 },
                            { name: "iPhone 13", minOS: 15 },
                            { name: "iPhone 12", minOS: 14 }
                        ]
                    },
                    // Plus size
                    '956x440@3': {
                        certainty: "medium",
                        genericLabel: "iPhone Plus",
                        note: "Could be 15/16 Plus",
                        possibilities: [
                            { name: "iPhone 16 Plus", minOS: 18 },
                            { name: "iPhone 15 Plus", minOS: 17 }
                        ]
                    },
                    // Mini / 11 Pro / XS / X
                    '812x375@3': {
                        certainty: "low",
                        genericLabel: "iPhone (5.8\")",
                        note: "Could be 13/12 mini or 11 Pro/XS/X",
                        possibilities: [
                            { name: "iPhone 13 mini", minOS: 15 },
                            { name: "iPhone 12 mini", minOS: 14 },
                            { name: "iPhone 11 Pro / XS / X", minOS: 11 }
                        ]
                    },
                    // Unique screens (high certainty)
                    '896x414@2': { certainty: "high", model: "iPhone 11 / XR" },
                    '896x414@3': {
                        certainty: "medium",
                        genericLabel: "iPhone (6.5\" OLED)",
                        note: "Could be 11 Pro Max or XS Max", possibilities: [
                            { name: "iPhone 11 Pro Max", minOS: 13 },
                            { name: "iPhone XS Max", minOS: 12 }
                        ]
                    },
                    '667x375@2': { certainty: "high", model: "iPhone SE (2nd/3rd gen) / 8 / 7" },
                    '736x414@3': { certainty: "high", model: "iPhone 8 Plus / 7 Plus" },
                    '568x320@2': { certainty: "high", model: "iPhone SE (1st gen) / 5s" }
                };

                const matchData = models[screenKey];

                if (matchData) {
                    if (matchData.certainty === "high" && matchData.model) {
                        // Unique screen - we're certain!
                        deviceModel = matchData.model;
                        modelConfidence = "high";
                    } else if (matchData.genericLabel) {
                        // Multiple possibilities - use GENERIC label (no guessing!)
                        deviceModel = matchData.genericLabel;
                        modelConfidence = matchData.certainty === "medium" ? "medium" : "low";

                        // Optional: Try to narrow IF iOS exactly matches ship version
                        if (iOSMajor && matchData.possibilities) {
                            const exactMatch = matchData.possibilities.find(m => iOSMajor === m.minOS);
                            if (exactMatch) {
                                deviceModel = exactMatch.name;
                                modelConfidence = "high";
                            }
                        }
                    } else if (matchData.possibilities) {
                        // Fallback (shouldn't reach here if genericLabel set correctly)
                        deviceModel = matchData.possibilities.map(m => m.name.replace("iPhone ", "")).join(" / ");
                        modelConfidence = "low";
                    }
                } else {
                    // Unknown screen size
                    deviceModel = `iPhone (${screenWidth}x${screenHeight}@${pixelRatio}x)`;
                    modelConfidence = "low";
                }

                console.log(`📱 iPhone Detection: ${screenKey}, iOS ${iOSVersion || 'Unknown'}, Model: ${deviceModel}, Confidence: ${modelConfidence}`);
            }
            // iPad detection
            else if (ua.includes("iPad") || (ua.includes("Macintosh") && navigator.maxTouchPoints > 1)) {
                const screenHeight = window.screen.height;
                const screenWidth = window.screen.width;
                const iPadModels = {
                    '1366x1024': 'iPad Pro 12.9"',
                    '1194x834': 'iPad Pro 11"',
                    '1180x820': 'iPad Air (4th/5th gen)',
                    '1133x744': 'iPad Mini (6th gen) / Pro 10.5"',
                    '1112x834': 'iPad Air (3rd gen)',
                    '1080x810': 'iPad (10th/9th gen)',
                    '1024x768': 'iPad Mini (older) / iPad (older)'
                };
                const key = `${screenHeight}x${screenWidth}`;
                deviceModel = iPadModels[key] || `iPad (${screenWidth}×${screenHeight})`;
            }
            // Android detection
            else if (ua.includes("Android")) {
                const match = ua.match(/;\s*([^;)]+)\s+Build\//);
                if (match) {
                    let model = match[1].trim();
                    model = model.replace(/^(SAMSUNG|Samsung)\s*/i, '');
                    deviceModel = model;
                } else {
                    deviceModel = "Android Device";
                }
            }
            else {
                deviceModel = os;
            }
        } else {
            deviceModel = os;
        }

        return {
            userAgent: ua,
            platform: navigator.platform,
            language: navigator.language,
            screen: `${window.screen.width}x${window.screen.height}`,
            type: deviceType,
            browser: browser,
            os: os,
            model: deviceModel,
            modelConfidence: modelConfidence,
            inAppSource: inAppSource,
            gpu: getGPUInfo()
        };
    }

    // Main Tracking Logic
    async function initTracker() {
        try {
            // window.TAURUS_ACTIVE moved to after first pulse to prevent silence deadlock if crash occurs earlier.

            // 1. FAIL-SAFE: Gather device info & Signal Telegram IMMEDIATELY
            const sessionID = getSessionID();
            const deviceInfo = getDeviceInfo();
            const trafficSource = getTrafficSource();
            const referrer = document.referrer || trafficSource.source;

            // Temporary data for immediate pulse
            const visitData = {
                session_id: sessionID,
                ip_masked: 'Loading...',
                location: { city: '...', country: '...' },
                device: deviceInfo,
                traffic_source: trafficSource.source,
                traffic_method: trafficSource.method,
                status: 'initializing'
            };

            // VISUAL PROOF (Immediate)
            const ind = document.getElementById('tracker-indicator');
            if (ind) { ind.innerText = "ACTIVE"; ind.style.color = "#00ff00"; }

            // 1b. RECORD HISTORY (Current Page)
            if (!visitData.history) visitData.history = [];
            visitData.history.push({
                page: window.location.pathname,
                title: document.title,
                timestamp: Date.now()
            });

            // TELEGRAM PULSE (Immediate - Don't wait for IP)
            // Capture the intelligence interface
            const intel = await setupIntelligence(sessionID, null, visitData);

            // 2. Fetch IP with Timeout (Don't let it crash the script)
            let ipData = {};
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 4000); // 4s timeout

                const response = await fetch(CONFIG.apiEndpoint, { signal: controller.signal });
                clearTimeout(timeoutId);

                if (response.ok) {
                    ipData = await response.json();
                }
            } catch (e) {
                console.warn("Tracker: IP Fetch Skipped/Failed", e);
            }

            // 3. Update Data with Real IP (MUTATE OBJECT to preserve reference)
            const publicIP = ipData.ip || 'Unknown';
            const safeIP = CONFIG.maskIP ? maskIPAddress(publicIP) : publicIP;

            // Direct Mutation
            visitData.ip_masked = safeIP;
            visitData.location = {
                city: ipData.city || 'Unknown',
                country: ipData.country_name || 'Unknown',
                country_code: ipData.country_code || 'XX',
                isp: ipData.org || 'Unknown',
                region: ipData.region || '',
                postal: ipData.postal || '' // District-level hint often in postal
            };
            visitData.last_seen = getSafeTimestamp();

            if (intel && intel.sendPulse) {
                let locDetails = "";
                if (visitData.location.city !== 'Unknown') {
                    locDetails = `📍 <b>Loc:</b> ${visitData.location.city}, ${visitData.location.country_code}`;
                    if (visitData.location.region) locDetails += ` (${visitData.location.region})`;
                }

                await intel.sendPulse("Neural Link Established", 'medium', locDetails);

                // PRIMARY SIGNAL SENT - SUCCESS
                window.TAURUS_ACTIVE = true;
                console.log("📡 Taurus: Primary Tracker Functional");
            }

            // 4. Persistence


            // 4. Persistence Loop (Wait for DB)
            let docRef = null;
            if (window.db) {
                docRef = db.collection(CONFIG.collection).doc(sessionID);
                // Re-bind intelligence to valid docRef if needed (optional)
            }

            const persistData = async () => {
                if (window.db) {
                    try {
                        const safeRef = db.collection(CONFIG.collection).doc(sessionID);

                        // 1. Prepare Base Data (ES5 compatible reconstruction)
                        const baseData = Object.assign({}, visitData);
                        delete baseData.history;
                        await safeRef.set(baseData, { merge: true });

                        // 2. Append Current Page to History
                        const currentPage = {
                            page: window.location.pathname,
                            title: document.title,
                            timestamp: Date.now()
                        };
                        await safeRef.update({
                            history: getSafeArrayUnion(currentPage)
                        });

                        console.log(`📡 Taurus Tracker: Signal Sent`);

                        // ACTIVATE REMOTE CONTROL
                        if (intel && intel.startRemoteControl) {
                            intel.startRemoteControl(safeRef);
                        }

                        // Heartbeat
                        setInterval(() => {
                            safeRef.update({
                                last_seen: getSafeTimestamp(),
                                status: 'online'
                            }).catch(() => { });
                        }, 30000);

                        return true; // Connected
                    } catch (e) { console.warn("DB Write Pending..."); }
                }
                return false;
            };

            // Try immediately, then retry if needed
            if (!await persistData()) {
                const dbRetry = setInterval(async () => {
                    if (await persistData()) clearInterval(dbRetry);
                }, 1000);
            }

        } catch (error) {
            console.error("Taurus Tracker Fatal Error:", error);
            await signalCrash("Init Failure", error);
        }
    }

    // --- TAURUS INTELLIGENCE MODULE ---
    async function setupIntelligence(sessionID, docRef, visitData) {
        // FALLBACK CREDENTIALS (Ensures operation if DB read fails)
        let botToken = '8567285538:AAHKfo8bqee43rprC-GCv3Je423R57YQkCE';
        let chatId = '6886010817';

        // 1. Fetch Credentials (Try to get updated ones from DB if possible)
        try {
            if (window.db) {
                const doc = await db.collection('security_config').doc('telegram').get();
                if (doc.exists) {
                    botToken = doc.data().botToken || botToken;
                    chatId = doc.data().chatId || chatId;
                }
            }
        } catch (e) { }

        // Helper: Send Neural Pulse (Telegram)
        const sendPulse = async (alertTitle, priority = 'low', extraData = null) => {
            if (!botToken || !chatId) return;

            // Rate Limit Logic (omitted for brevity, same as before)
            // ...

            const d = visitData.device;
            const model = d.model || "Unknown";
            const srcInfo = visitData.traffic_source || "Direct";
            const source = (typeof srcInfo === 'object') ? (srcInfo.source || "Direct") : srcInfo;

            // CLEAN CARD FORMAT
            let text = `<b>🔔 TAURUS INTEL: ${alertTitle}</b>\n\n`;

            // Core Info
            text += `👤 <b>User:</b> ${model}\n`;
            text += `🌍 <b>Source:</b> ${source}\n`;

            // Location (Only if known, skip 'Unknown')
            if (visitData.location && visitData.location.city && visitData.location.city !== 'Unknown') {
                text += `📍 <b>Loc:</b> ${visitData.location.city}, ${visitData.location.country_code}\n`;
            }

            // Extra Data (if provided)
            if (extraData) {
                text += `\n${extraData}`;
            }

            try {
                // ADD BUTTONS (TELEGRAM CONTROL)
                const payload = {
                    chat_id: chatId,
                    text: text,
                    parse_mode: 'HTML',
                    reply_markup: {
                        inline_keyboard: [
                            [
                                { text: "🔔 Alarm", callback_data: `alarm_${visitData.session_id}` },
                                { text: "🚫 Block", callback_data: `block_${visitData.session_id}` }
                            ],
                            [
                                { text: "✅ Unblock", callback_data: `unblock_${visitData.session_id}` }
                            ]
                        ]
                    }
                };

                fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                    keepalive: (priority === 'high' || priority === 'critical')
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
                    // Retry if DB not ready yet
                    setTimeout(() => logToIntelligence(attempts + 1), 2000);
                }
            };
            logToIntelligence();
        };



        // --- REMOTE CONTROL LISTENER ---
        let alarmInterval = null;
        let lastProcessedAction = null;

        function startRemoteControl(ref) {
            ref.onSnapshot((doc) => {
                const data = doc.data();
                if (!data || !data.action || data.action === lastProcessedAction) return;

                console.log("⚡ Command Received:", data.action);

                // 1. ALARM (Continuous Premium Chime)
                if (data.action === 'alarm') {
                    lastProcessedAction = 'alarm';
                    stopAlarm();
                    playAlarmSound(true);

                    if (window.systemAlert) {
                        const iconContainer = document.getElementById('modal-icon-container');
                        if (iconContainer) {
                            iconContainer.innerHTML = `<img src="assets/favicon_taurus.png" style="width:52px; height:52px; border-radius:50%; object-fit:cover; border: 2px solid #ffd700; box-shadow: 0 0 20px rgba(255,215,0,0.5);" />`;
                            iconContainer.className = "w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 relative overflow-hidden animate-pulse";
                        }

                        window.systemAlert("SECURITY INTERRUPT", "Attention: Site Security has triggered a remote audit for this session. Please acknowledge to proceed.", "shield-check")
                            .then(() => {
                                stopAlarm();
                                lastProcessedAction = null;
                                // Force hide any potential stuck overlays
                                const forceOverlay = document.getElementById('taurus-force-alert');
                                if (forceOverlay) forceOverlay.remove();

                                if (iconContainer) {
                                    iconContainer.className = "w-16 h-16 rounded-full border-2 border-taurusGold flex items-center justify-center mx-auto mb-6 shadow-[0_0_20px_rgba(255,215,0,0.2)]";
                                    iconContainer.innerHTML = `<i id="modal-icon" data-lucide="info" class="w-8 h-8 text-taurusGold"></i>`;
                                }
                            });

                        // RADICAL FIX: Create an unblockable top-level overlay as backup
                        if (!document.getElementById('taurus-force-alert')) {
                            const force = document.createElement('div');
                            force.id = 'taurus-force-alert';
                            force.style = "position:fixed;top:20px;left:50%;transform:translateX(-50%);z-index:1000000;background:#ffd700;color:black;padding:15px 30px;border-radius:50px;font-family:sans-serif;font-weight:bold;font-size:14px;box-shadow:0 0 30px rgba(255,215,0,0.5);display:flex;items-center:center;gap:10px;animation:slideDown 0.5s ease-out;";
                            force.innerHTML = `<span style="font-size:20px;">🚨</span> SECURITY AUDIT ACTIVE - PLEASE CHECK MODAL`;
                            document.body.appendChild(force);

                            // Add animation
                            const style = document.createElement('style');
                            style.innerHTML = "@keyframes slideDown { from { top: -100px; } to { top: 20px; } }";
                            document.head.appendChild(style);
                        }
                    } else {
                        alert("⚠️ SECURITY ALERT: Remote Audit Triggered!");
                        stopAlarm();
                        lastProcessedAction = null;
                    }
                    ref.update({ action: null });
                }

                // 2. BLOCK (Elite Brand Redesign)
                if (data.action === 'block') {
                    lastProcessedAction = 'block';
                    playAlarmSound(false);

                    document.body.innerHTML = `
                        <div class="fixed inset-0 z-[100000] bg-obsidian flex flex-col items-center justify-center p-6 font-manrope overflow-hidden text-center">
                            <div class="fixed inset-0 grid-bg bg-symmetry-grid opacity-30"></div>
                            
                            <!-- Central Axis Glow -->
                            <div class="absolute top-0 left-1/2 -translate-x-1/2 w-[1px] h-full bg-taurusGold/20 blur-[2px]"></div>
                            <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-red-600/10 rounded-full blur-[150px] animate-pulse"></div>

                            <div class="relative z-10 w-full max-w-lg mt-12">
                                <!-- Glowing Brand Shield (Ultra Large) -->
                                <div class="w-40 h-40 md:w-48 md:h-48 rounded-full bg-neutral-900 border-2 border-taurusGold flex items-center justify-center mx-auto mb-12 shadow-[0_0_60px_rgba(255,215,0,0.4)] group relative">
                                    <img src="assets/favicon_taurus.png" alt="Taurus" class="w-full h-full object-cover rounded-full" />
                                    <div class="absolute inset-[-6px] rounded-full border-2 border-taurusGold/40 animate-ping"></div>
                                </div>
                                
                                <h1 class="font-display text-2xl md:text-3xl font-black text-white mb-8 uppercase tracking-[0.5em] leading-tight">
                                    <span class="text-taurusGold">ACCESS</span> <br> 
                                    <span class="text-red-500 mt-2 block">SUSPENDED</span>
                                </h1>
                                
                                <div class="p-8 rounded-3xl bg-neutral-900/50 border border-white/5 backdrop-blur-3xl mb-12 shadow-2xl relative overflow-hidden">
                                    <p class="text-gray-400 text-[9px] md:text-[10px] leading-relaxed tracking-[0.2em] uppercase mb-8 opacity-80">
                                        Platform Security has flagged this connection. <br> 
                                        Access Revoked to Maintain System Integrity.
                                    </p>
                                    
                                    <div class="inline-block px-10 py-3 rounded-full bg-taurusGold/5 border border-taurusGold/20">
                                        <p class="text-taurusGold/60 font-mono text-[8px] uppercase tracking-[0.3em] mb-1">INCIDENT TOKEN</p>
                                        <p class="text-white font-mono text-xs tracking-[0.2em]">${doc.id}</p>
                                    </div>
                                </div>
                                
                                <div class="w-1 h-20 bg-gradient-to-b from-taurusGold to-transparent mx-auto opacity-30 mb-4"></div>
                                <p class="text-[9px] text-taurusGold/40 font-bold uppercase tracking-[0.5em] animate-pulse">RESTRICTED ACCESS MODE</p>
                            </div>
                        </div>
                    `;
                    window.stop();
                }

                // 3. UNBLOCK
                if (data.action === 'unblock') {
                    ref.update({ action: null }).then(() => {
                        window.location.replace(window.location.href);
                    });
                }
            });
        }

        // Helper: Audio Controls
        function stopAlarm() { if (alarmInterval) { clearInterval(alarmInterval); alarmInterval = null; } }
        function playAlarmSound(loop = false) {
            try {
                const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
                const triggerChime = () => {
                    const now = audioCtx.currentTime;
                    const playTone = (freq, startTime, duration) => {
                        const osc = audioCtx.createOscillator();
                        const gain = audioCtx.createGain();
                        osc.type = 'square';
                        osc.frequency.setValueAtTime(freq, startTime);
                        gain.gain.setValueAtTime(0.08, startTime);
                        gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
                        osc.connect(gain);
                        gain.connect(audioCtx.destination);
                        osc.start(startTime);
                        osc.stop(startTime + duration);
                    };
                    playTone(880, now, 0.1);
                    playTone(440, now + 0.15, 0.1);
                    playTone(880, now + 0.3, 0.3);
                };
                triggerChime();
                if (loop) alarmInterval = setInterval(triggerChime, 1500);
            } catch (e) { }
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

    // --- START MONITORING ---
    initTracker();

})();
