
// TAURUS INTELLIGENCE - VISITOR TRACKER v1.0
// Privacy-First Analytics Module

(function () {
    console.log("📡 Taurus Tracker Initializing...");

    const CONFIG = {
        collection: 'visitors_v1', // DB Collection Name
        maskIP: true,              // Privacy Setting (User Selected: Option B)
        apiEndpoint: 'https://ipapi.co/json/' // Free Tier (1000 req/day)
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
        if (!ip) return '0.0.0.0';
        const parts = ip.split('.');
        if (parts.length === 4) {
            return `${parts[0]}.${parts[1]}.${parts[2]}.***`; // IPv4 Masking
        }
        return ip.substr(0, ip.lastIndexOf(':')) + ':****'; // IPv6 Simple Masking
    }

    // Capture Device Info
    function getDeviceInfo() {
        const ua = navigator.userAgent;
        let deviceType = "Desktop";
        if (/Mobi|Android/i.test(ua)) deviceType = "Mobile";
        if (/iPad|Tablet/i.test(ua)) deviceType = "Tablet";

        return {
            userAgent: ua,
            platform: navigator.platform,
            language: navigator.language,
            screen: `${window.screen.width}x${window.screen.height}`,
            type: deviceType
        };
    }

    // Main Tracking Logic
    async function initTracker() {
        try {
            // 1. Get IP Data (Detailed Location)
            let ipData = {};
            try {
                const response = await fetch(CONFIG.apiEndpoint);
                if (response.ok) {
                    ipData = await response.json();
                }
            } catch (e) {
                console.warn("Tracker: API Limit or Error", e);
            }

            // 2. Prepare Data Payload
            const sessionID = getSessionID();
            const deviceInfo = getDeviceInfo();
            const currentPage = window.location.pathname;
            const referrer = document.referrer;

            // Apply Privacy Masking
            const publicIP = ipData.ip || 'Unknown';
            const safeIP = CONFIG.maskIP ? maskIPAddress(publicIP) : publicIP;

            const visitData = {
                session_id: sessionID,
                ip_masked: safeIP, // Storing MASKED IP
                location: {
                    city: ipData.city || 'Unknown',
                    country: ipData.country_name || 'Unknown',
                    country_code: ipData.country_code || 'XX',
                    isp: ipData.org || 'Unknown', // ISP / Organization
                    region: ipData.region || 'Unknown'
                },
                device: deviceInfo,
                last_seen: firebase.firestore.FieldValue.serverTimestamp(),
                // We utilize arrayUnion to append page visits to a history array
                history: firebase.firestore.FieldValue.arrayUnion({
                    page: currentPage,
                    title: document.title,
                    timestamp: Date.now(),
                    referrer: referrer || 'Direct'
                }),
                status: 'online' // Flag for real-time radar
            };

            // 3. Send to Firebase
            if (window.db) {
                const docRef = db.collection(CONFIG.collection).doc(sessionID);

                // Use set with merge to create or update
                docRef.set(visitData, { merge: true }).then(() => {
                    console.log("📡 Taurus Tracker: Signal Sent");
                }).catch(err => {
                    console.error("Tracker Error:", err);
                });

                // 4. Heatbeat (Optional: Update 'last_seen' every 30s to keep 'online' status valid)
                setInterval(() => {
                    docRef.update({
                        last_seen: firebase.firestore.FieldValue.serverTimestamp(),
                        status: 'online'
                    });
                }, 30000); // 30 seconds heartbeat

                // 5. Detect Tab Close (Set to offline)
                window.addEventListener('beforeunload', () => {
                    // This is best-effort. Cloud Functions usually handle offline cleanup better, 
                    // but client-side we can try setting a quick flag if connection allows.
                    // Navigator.sendBeacon is better here but for Firestore direct write we skip content.
                });
            } else {
                console.error("Firebase DB not initialized yet.");
            }

        } catch (error) {
            console.error("Taurus Tracker Fatal Error:", error);
        }
    }

    // Initialization: Wait for Firebase
    const checkFirebase = setInterval(() => {
        if (window.firebase && window.db) {
            clearInterval(checkFirebase);
            initTracker();
        }
    }, 500);

})();
