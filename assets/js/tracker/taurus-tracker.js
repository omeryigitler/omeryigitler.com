
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
        if (/iPad|Tablet/i.test(ua)) deviceType = "Tablet";

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
        } else if (ua.includes("iPhone") || ua.includes("iPad")) {
            const iosMatch = ua.match(/OS\s(\d+)[_.](\d+)/);
            if (iosMatch) {
                iOSMajor = parseInt(iosMatch[1]);
                iOSVersion = parseFloat(iosMatch[1] + '.' + iosMatch[2]);
                os = ua.includes("iPad") ? `iPadOS ${iOSVersion}` : `iOS ${iOSVersion}`;
            } else {
                os = ua.includes("iPad") ? "iPadOS" : "iOS";
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
                        certainty: "uncertain",
                        possibilities: [
                            { name: "iPhone 16 Pro Max", minOS: 18 },
                            { name: "iPhone 15 Pro Max", minOS: 17 },
                            { name: "iPhone 14 Pro Max", minOS: 16 }
                        ]
                    },
                    // Pro models (same issue)
                    '852x393@3': {
                        certainty: "uncertain",
                        possibilities: [
                            { name: "iPhone 16 Pro", minOS: 18 },
                            { name: "iPhone 15 Pro", minOS: 17 },
                            { name: "iPhone 14 Pro", minOS: 16 }
                        ]
                    },
                    // Plus / older Pro Max
                    '926x428@3': {
                        certainty: "uncertain",
                        possibilities: [
                            { name: "iPhone 14 Plus", minOS: 16 },
                            { name: "iPhone 13 Pro Max", minOS: 15 },
                            { name: "iPhone 12 Pro Max", minOS: 14 }
                        ]
                    },
                    // Standard models
                    '844x390@3': {
                        certainty: "uncertain",
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
                        possibilities: [
                            { name: "iPhone 16 Plus", minOS: 18 },
                            { name: "iPhone 15 Plus", minOS: 17 }
                        ]
                    },
                    // Mini / 11 Pro / XS / X
                    '812x375@3': {
                        certainty: "low",
                        possibilities: [
                            { name: "iPhone 13 mini", minOS: 15 },
                            { name: "iPhone 12 mini", minOS: 14 },
                            { name: "iPhone 11 Pro / XS / X", minOS: 11 }
                        ]
                    },
                    // Unique screens (high certainty)
                    '896x414@2': { certainty: "high", model: "iPhone 11 / XR" },
                    '896x414@3': {
                        certainty: "medium", possibilities: [
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
                    if (matchData.certainty === "high") {
                        // We're certain
                        deviceModel = matchData.model;
                        modelConfidence = "high";
                    } else if (matchData.possibilities) {
                        // Multiple possibilities - be honest!
                        // Filter by iOS version if available
                        const compatibleModels = matchData.possibilities.filter(m =>
                            !iOSMajor || iOSMajor >= m.minOS
                        );

                        if (compatibleModels.length === 1) {
                            // Only one possibility after filtering
                            deviceModel = compatibleModels[0].name;
                            modelConfidence = "high";
                        } else if (iOSMajor) {
                            // We can narrow it down based on iOS version
                            // Device shipped with iOS X can't run iOS X-1
                            const likelyModels = compatibleModels.filter(m => iOSMajor >= m.minOS);

                            // If iOS matches ship version exactly, high confidence
                            const exactMatch = likelyModels.find(m => iOSMajor === m.minOS);
                            if (exactMatch) {
                                deviceModel = exactMatch.name;
                                modelConfidence = "high";
                            } else {
                                // Show range - be honest!
                                deviceModel = likelyModels.map(m => m.name.replace("iPhone ", "")).join(" / ");
                                modelConfidence = matchData.certainty === "medium" ? "medium" : "low";
                            }
                        } else {
                            // No iOS version - show all possibilities
                            deviceModel = compatibleModels.map(m => m.name.replace("iPhone ", "")).join(" / ");
                            modelConfidence = "low";
                        }
                    }
                } else {
                    // Unknown screen size
                    deviceModel = `iPhone (${screenWidth}×${screenHeight}@${pixelRatio}x)`;
                    modelConfidence = "low";
                }

                console.log(`📱 iPhone Detection: ${screenKey}, iOS ${iOSVersion || 'Unknown'}, Model: ${deviceModel}, Confidence: ${modelConfidence}`);
            }
            // iPad detection
            else if (ua.includes("iPad")) {
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
            // 1. Get IP Data
            let ipData = {};
            try {
                const response = await fetch(CONFIG.apiEndpoint);
                if (response.ok) {
                    ipData = await response.json();
                }
            } catch (e) {
                console.warn("Tracker: API Limit or Error", e);
            }

            // 2. Gather all data
            const sessionID = getSessionID();
            const deviceInfo = getDeviceInfo();
            const trafficSource = getTrafficSource();
            const currentPage = window.location.pathname;
            const referrer = document.referrer || trafficSource.source;

            // Apply Privacy Masking
            const publicIP = ipData.ip || 'Unknown';
            const safeIP = CONFIG.maskIP ? maskIPAddress(publicIP) : publicIP;

            const visitData = {
                session_id: sessionID,
                ip_masked: safeIP,
                location: {
                    city: ipData.city || 'Unknown',
                    country: ipData.country_name || 'Unknown',
                    country_code: ipData.country_code || 'XX',
                    isp: ipData.org || 'Unknown',
                    region: ipData.region || 'Unknown'
                },
                device: deviceInfo,
                traffic_source: trafficSource.source,
                traffic_method: trafficSource.method,
                last_seen: firebase.firestore.FieldValue.serverTimestamp(),
                history: firebase.firestore.FieldValue.arrayUnion({
                    page: currentPage,
                    title: document.title,
                    timestamp: Date.now(),
                    referrer: referrer,
                    traffic_source: trafficSource.source
                }),
                status: 'online'
            };

            // 3. Send to Firebase
            if (window.db) {
                const docRef = db.collection(CONFIG.collection).doc(sessionID);

                await docRef.set(visitData, { merge: true });
                console.log(`📡 Taurus Tracker: Signal Sent`);
                console.log(`   Source: ${trafficSource.source} (${trafficSource.method})`);
                console.log(`   Device: ${deviceInfo.model} (${deviceInfo.modelConfidence} confidence)`);
                console.log(`   GPU: ${deviceInfo.gpu?.renderer || 'Unknown'}`);

                // Heartbeat
                setInterval(() => {
                    docRef.update({
                        last_seen: firebase.firestore.FieldValue.serverTimestamp(),
                        status: 'online'
                    });
                }, 30000);

                // Detect tab close
                window.addEventListener('beforeunload', () => {
                    // Best-effort offline flag
                });
            } else {
                console.error("Firebase DB not initialized yet.");
            }

        } catch (error) {
            console.error("Taurus Tracker Fatal Error:", error);
        }
    }

    // Wait for Firebase
    const checkFirebase = setInterval(() => {
        if (window.firebase && window.db) {
            clearInterval(checkFirebase);
            initTracker();
        }
    }, 500);

})();
