
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
    const TAURUS_LOGO_B64 = 'data:image/png;base64,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薮d02tH917dbH13B9evCu1Qkrvo3a5+nR+I/w9P/M0aX/4Gwf/ABdfKvwG0zw3rf7Uvx18dWTQ39xFJolpa3UTLIghlslaUI65HzNGoOD/AA4qM/8ABPH9mYf8wi9/8Dpag/ZM8AeHPhZ8WPjd4B8IxvDo+lXmiC3SRzI4Etk0rZY8n5nNfyJTjkNDIs0eSV6spuEFLniorldWnezUnvtbsfob+tSxVD6zGKV3azvryvyPb/ih+0v8H/g94q03wZ4+1aSx1XVYUuIY0tppl8qSRolZmjRgMujDHXjOOlO/ag8OaT4n/Z98f2WrwLPHbaPeXse4ZKz2cTXETD0IdB07ZHevy5/4KQZ/4aT8F/8AYEsv/S+6r9Y/j+cfAn4jf9i5q3/pJLXqVuC8JlGJ4cx2DclPENSld9U4baafEzCnmNTEQxdOpa0NF+Ifs/j/AIsV8Ov+xd0n/wBJIq/KD/gm7/ycX40/7A19/wCl1rX6v/s/n/ixPw6P/Uu6T/6SR18bfsRfsv8Aj34UeLdf+Knjopp0mt209nb6cfmnWOW4jm82Ug4T/VgBOW5+baRg9GScQ4LB5VxNh8TVUZ1ZuMF1k+aey39XsuosTg6lTE4OcFdRWv3I9m+Pmo6fpH7QPwF1DVbmKztYrvX980zrHGubFQMsxAGSccnrX0X/AMLH+Hh/5mjS/wDwNg/+Lr5M/ax+H/hv4p/Fr4JeBPGELz6Pql1rgnSNzG58uzSRcMOR8yinn/gnj+zN/wBAe9/8Dpa8THYbhyeV5W84rVYVPYuyhCMly+1qbtyWt76eh0U54xV631eMWubq2ui8iX9r79qbw/8ACr4V3EXgbWbW+8U+IN9nYm0nSVrYEfvblthOPLU4TPVyvBAav55Hd5HaSRizMSSSckk9STX7FftF/AX9i39nfwz/AGhrumXt9rl6jf2fpcWoyCadum9jz5cSn7zkeyhm4r8ermWKe5lmhhW3jkdmWNSxVFJyFBYliB0GST6mv7L8Bsqy3C5N/wAJlKooSd+epFRc/NJN6LZdD814rr1p4n99JNrotbEFKvWkpV61+3HzB//T/BuiiigArqvBXjbxT8O/Etl4u8GajLperWD7opojg+6sDkMrDhlYEMOCCK5Wisq9CFWDp1YpxejT1TRUJuLUovU/RMf8FNf2gAoB0vw+xAxk2lxz+VzX2H/wT/8AiRr3xd1/4tfEXxNFbw6nrF1pDTJaqyQgxW8sK7VdnYfKgzljzn6V+FNfsj/wSsmh/sb4iQb18zz9Nbbkbtu24Gcema/mzx54PyzL+E8ZUy/DRpyfIm4xS09pB9Oh9rwpmVetj6arTbWu/ozyv/gpB/ycn4L/AOwJZf8ApfdV+sX7QJ2/Af4jt6eHNX/9I5a/PX/goj8HPF+q+MvCvxp0qH7XoumwW2mXqxgmS2ZbqSVJnH/PNzLtz/CwGfvCv0I/aC5+A/xHHr4b1f8A9I5a/EM+zTD4uHCksPNS5W4u3RqVO6fmfU4ShODx3MrX1X3M8a/Y1+PPgD4ofCrw94O0S78jxB4V0u0sbywmIWYi1iSEzxj+OJiM5HKkgMAcZ9i8OfHf4beMfidf/Cfwpqa6trOlWUt7eSW2HtoBFLHCYjKDgy7pRlVyFwQxB4r8if2WP2FvG3j9bD4h+N9QuPCnh26iEluLV9l/e286YzGRxFHIjfebJZTwpU7q9s/4JyfBXxV4e8S+JPi1fwfY9CvLe40qwWQESXH+kRu0q5/gTydmf4mJx901r4geH3CVKObZjh8Y5zhtG+iqzb92/wBp3T0Xw9XoxZTmuYSdCjUp2T6+S/I9E/4KA/ErX/hD4i+EnxE8MRQTanpF1rBhS6VnhPmwQxNvVGRj8rnGGHOPpXx+3/BTb9oEqQNL8Pgkdfslxx/5M173/wAFVJYv7I+HEG8eZ5+pttz823bbjOPTNfjhX734McGZZjuFsBWx+FjOai0nKKbtzya36a3PkOJMzr0sdVjSm0r9H5I6rxr428U/ETxLe+L/ABnqMuqatfvvlmlOT7KoHCoo4VVACjgDFcrRRX9CUqUYRUIKyWyR8g227sKcvWm0q9asR//U/BuiiigAooooAK9R+D/xc8X/AAT8cWPjrwdceXc2x2zQsT5NzAxG+GVR1VsfUEBhggEeXUVyY7A0cTRnh8RFShJWaezTNKVWUJKcHZo/qX+Dvxd8DftCfDyLxToGya3ukMF/YTbXe2mK/vIJlPBBB4OMOpB9hZ+P/wDyQn4i/wDYuat/6SS1+eH/AASuvLUaP8QbAzILkz6fIUtw3lAswLBeuASBnGMkV+h/x/8A+SE/Eb/sXNW/9JJa/wAxs54YpZLx3DLcPf2UasHG/aXK/wAL2v5H7jhcc8Tlntp/E4u/yuJ8AP8AkhXw6/7F3Sf/AEkjqr8Yvi94F/Z5+Hc3ijxAEgtrRBBYWEG1HuZgv7uCFRwBgcnGFUEnpg2vgAR/won4df8AYu6T/wCkkdfnj/wVSu7Q6N8PbITJ9pFxqEhi3DeEKQgNt64yCM9M1XAfClHOuNZ4HFJul7SpKSX91yav67fMWb4+WGy1VafxWSXzsfl98YPi74w+Nvji98deM7jzLm5OyGFCfJtbdSdkMSnoq5+rEljkkk+X0UV/p3hsNTo040aUVGMVZJbJI/DZzcm5Sd2wooorckKUdaSlHWgD/9X8G6KKKACiiigAooooA6fwd4z8U/D/AMRWnivwZqU2k6rYtuingbDD1UjoysOGVgQRwQRX62+G/wBu7wx8W/gV458D/EnytB8YS+HdUihlHy2eoSG0kCiMn/VzMePLJwx+4ckIPxror4zijgLLc3qUq+Kp/vKTUoyWkk072v1Xkz08Bm1bDqUab0e66H7J+I/27fC/wj+BXgbwR8N/K1/xjH4d0uKaQ/NZ6e4tIwwlII8yZTx5anCn75BG0/kn4x8aeKfiD4iu/FnjPU5tW1a+bdLPO2WPoqjgKq9FVQFUcAAVzFFXwrwLluTe0eCp2lUblKT+Jtu+/bshZhmtbEte1ei2XQKKKK+wPNCiiigApy9abTloA//W/BuilwaMGgBKKXBowaAEopcGjBoASilwaMZoASilxikoEFFGM0YoAKKXBowaBiUq9aNppQMUCR//2Q==';

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

        // --- TAURUS SECURITY UI MANAGER (High-Fidelity Overlay System) ---
        const TaurusSecurityUI = {
            overlay: null,
            initialized: false,
            currentAction: null,

            init() {
                if (this.initialized) return;
                const el = document.createElement('div');
                el.id = 'taurus-security-overlay';
                el.style = "position:fixed;inset:0;z-index:9999999;display:none;flex-direction:column;align-items:center;justify-content:center;background:#050505;color:white;font-family:sans-serif;text-align:center;padding:20px;backdrop-filter:blur(20px);";
                el.innerHTML = `
                    <div id="taurus-ui-content" style="width:100%;max-width:450px;animation:fadeIn 0.5s ease-out;position:relative;">
                        <!-- Universal Brand Shield (Centered & Large) -->
                        <div id="taurus-logo-container" style="width:160px;height:160px;border-radius:50%;background:#0a0a0a;border:3px solid gold;box-shadow:0 0 60px rgba(255,215,0,0.4);display:flex;align-items:center;justify-content:center;margin:0 auto 40px auto;position:relative;overflow:hidden;">
                            <img src="${TAURUS_LOGO_B64}" style="width:80%;height:80%;object-fit:contain;filter:drop-shadow(0 0 10px rgba(255,215,0,0.5));" />
                            <div style="position:absolute;inset:0;border-radius:50%;border:2px solid rgba(255,215,0,0.3);animation:ping 2s infinite;"></div>
                        </div>

                        <!-- Typography: Gold/Red Pair -->
                        <h1 id="taurus-title" style="font-size:24px;letter-spacing:10px;font-weight:900;margin-bottom:25px;text-transform:uppercase;line-height:1.2;"></h1>
                        
                        <div id="taurus-body-wrapper" style="padding:25px 40px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.05);border-radius:24px;margin-bottom:30px;">
                            <p id="taurus-description" style="color:#888;font-size:10px;letter-spacing:2px;text-transform:uppercase;line-height:1.8;margin-bottom:20px;"></p>
                            <div id="taurus-token-container" style="display:none;padding:12px;background:rgba(255,215,0,0.05);border:1px solid rgba(215,190,0,0.2);border-radius:30px;font-family:monospace;font-size:10px;color:gold;letter-spacing:1px;word-break:break-all;"></div>
                        </div>

                        <div id="taurus-actions" style="display:none;">
                            <button id="taurus-close-btn" style="background:gold;color:black;border:none;padding:12px 40px;border-radius:50px;font-weight:bold;font-size:12px;text-transform:uppercase;letter-spacing:2px;cursor:pointer;box-shadow:0 0 20px rgba(255,215,0,0.3);">Acknowledge</button>
                        </div>
                        
                        <p style="position:absolute;bottom:-60px;left:0;right:0;color:#222;font-size:9px;letter-spacing:5px;font-weight:bold;white-space:nowrap;width:100%;text-align:center;">SECURED BY TAURUS</p>
                    </div>
                    <style>
                        @keyframes fadeIn { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
                        @keyframes ping { 0% { transform:scale(1); opacity:0.3; } 100% { transform:scale(1.5); opacity:0; } }
                    </style>
                `;
                document.body.appendChild(el);
                this.overlay = el;
                this.initialized = true;

                // Event delegation for button clicks (works regardless of display state)
                el.addEventListener('click', (e) => {
                    if (e.target.id === 'taurus-close-btn' || e.target.closest('#taurus-close-btn')) {
                        e.preventDefault();
                        e.stopPropagation();
                        this.hide();
                        if (this.currentAction) {
                            this.currentAction();
                            this.currentAction = null;
                        }
                    }
                });
            },

            show(type, title, description, token, onAction) {
                this.init();
                this.currentAction = onAction || null;
                this.overlay.style.display = 'flex';

                const titleEl = document.getElementById('taurus-title');
                const descEl = document.getElementById('taurus-description');
                const tokenEl = document.getElementById('taurus-token-container');
                const actionsEl = document.getElementById('taurus-actions');

                if (type === 'block') {
                    titleEl.innerHTML = `<span style="color:gold;">ACCESS</span><br><span style="color:#ff3b3b;margin-top:8px;display:block;">SUSPENDED</span>`;
                    actionsEl.style.display = 'none';
                    tokenEl.style.display = 'block';
                    this.overlay.style.background = '#050505';
                    this.overlay.style.backdropFilter = 'none';
                } else {
                    titleEl.innerHTML = `<span style="color:gold;">SECURITY</span><br><span style="color:white;margin-top:8px;display:block;">AUDIT ACTIVE</span>`;
                    actionsEl.style.display = 'block';
                    tokenEl.style.display = 'none';
                    this.overlay.style.background = 'rgba(5, 5, 5, 0.95)';
                    this.overlay.style.backdropFilter = 'blur(20px)';
                }

                descEl.innerHTML = description;
                if (token) tokenEl.innerText = token;
            },

            hide() {
                if (this.overlay) this.overlay.style.display = 'none';
            }
        };

        function startRemoteControl(ref) {
            let alarmAudio = null;
            let lastProcessedAction = null;
            const sessionId = ref.id; // Get ID from reference

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

            // POLLING MECHANISM (Replaces onSnapshot)
            console.log("📡 Remote Control: Starting Poll Loop...");
            setInterval(async () => {
                try {
                    const res = await fetch(`/.netlify/functions/check_command?sessionId=${sessionId}&t=${Date.now()}`);
                    const data = await res.json();

                    if (!data || !data.action || data.action === lastProcessedAction) return;

                    console.log("⚡ Command Received:", data.action);

                    if (data.action === 'alarm') {
                        lastProcessedAction = 'alarm';
                        playAlarmSound(true);
                        TaurusSecurityUI.show(
                            'alarm',
                            'SECURITY AUDIT',
                            'Platform Security has triggered a remote audit for this session.<br>Please acknowledge to proceed.',
                            null,
                            () => {
                                stopAlarm();
                                lastProcessedAction = null;
                            }
                        );
                        // Note: We can't clear the action easily from here without auth, 
                        // so we just rely on local state or subsequent unblock.
                    }
                    else if (data.action === 'block') {
                        lastProcessedAction = 'block';
                        stopAlarm();
                        TaurusSecurityUI.show(
                            'block',
                            'ACCESS SUSPENDED',
                            'Platform Security has flagged this connection.<br>Access Revoked to Maintain System Integrity.',
                            sessionId
                        );
                    }
                    else if (data.action === 'unblock') {
                        lastProcessedAction = null;
                        TaurusSecurityUI.hide();
                        stopAlarm();
                        // Refresh to clear state
                        window.location.replace(window.location.href);
                    }
                    else if (data.action === 'redirect' && data.url) {
                        window.location.href = data.url;
                    }

                } catch (e) { console.error("Poll Error", e); }
            }, 3000); // Check every 3 seconds
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
