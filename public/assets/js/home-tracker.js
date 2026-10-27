
    (function () {
        var TRACKER_STACK = [
            "https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js",
            "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth-compat.js",
            "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore-compat.js",
            "assets/js/firebase-config.js",
            "assets/js/tracker/taurus-tracker.js?v=V46"
        ];
        var started = false;

        function loadNext(index) {
            if (index >= TRACKER_STACK.length) return;
            var script = document.createElement("script");
            script.src = TRACKER_STACK[index];
            script.async = true;
            script.onload = function () { loadNext(index + 1); };
            script.onerror = function () { console.warn("Tracker stack failed at", TRACKER_STACK[index]); };
            document.head.appendChild(script);
        }

        function start() {
            if (started) return;
            started = true;
            loadNext(0);
        }

        function scheduleAfterLoad() {
            if ("requestIdleCallback" in window) {
                requestIdleCallback(start, { timeout: 3000 });
            } else {
                setTimeout(start, 1500);
            }
        }

        if (document.readyState === "complete") {
            scheduleAfterLoad();
        } else {
            window.addEventListener("load", scheduleAfterLoad, { once: true });
        }
        // Never lose the entry record on very short visits.
        setTimeout(start, 6000);
    })();
