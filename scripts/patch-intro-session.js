const fs = require("node:fs");
const path = require("node:path");

const indexPath = path.resolve(__dirname, "..", "index.html");
let html = fs.readFileSync(indexPath, "utf8");

const PATCH_MARKER = "Taurus stable browser-session intro guard";
if (html.includes(PATCH_MARKER)) {
  console.log("Stable intro session guard is already patched");
  process.exit(0);
}

const previousBlock = `            var INTRO_SESSION_KEY = "taurus-intro-seen-v5";
            var shouldShowIntro = true;

            try {
                shouldShowIntro = window.sessionStorage.getItem(INTRO_SESSION_KEY) !== "1";
                if (shouldShowIntro) window.sessionStorage.setItem(INTRO_SESSION_KEY, "1");
            } catch (error) {
                // Private browsing or strict storage policies must never block the site.
            }`;

const stableBlock = `            /* ${PATCH_MARKER} */
            var INTRO_SESSION_KEY = "taurus-intro-seen";
            var INTRO_COOKIE_NAME = "taurus_intro_seen";
            var LEGACY_INTRO_KEYS = [
                "taurus-intro-seen-v3",
                "taurus-intro-seen-v4",
                "taurus-intro-seen-v5"
            ];
            var shouldShowIntro = true;

            // Normalize the legacy document URL without causing another navigation.
            // The server redirect remains the primary canonicalization layer.
            if (window.location.pathname === "/index.html") {
                try {
                    window.history.replaceState(
                        window.history.state,
                        "",
                        "/" + window.location.search + window.location.hash
                    );
                } catch (error) {
                    // URL normalization is best-effort and must never block the page.
                }
            }

            function hasIntroSessionCookie() {
                return document.cookie.split(";").some(function (part) {
                    return part.trim() === INTRO_COOKIE_NAME + "=1";
                });
            }

            function setIntroSessionCookie() {
                document.cookie = INTRO_COOKIE_NAME + "=1; Path=/; SameSite=Lax; Secure";
            }

            try {
                var seenInSession = window.sessionStorage.getItem(INTRO_SESSION_KEY) === "1";
                var seenInLegacySession = LEGACY_INTRO_KEYS.some(function (key) {
                    return window.sessionStorage.getItem(key) === "1";
                });
                var seenInCookie = hasIntroSessionCookie();

                shouldShowIntro = !(seenInSession || seenInLegacySession || seenInCookie);

                // Migrate all older versioned session keys into one permanent key.
                // The session cookie shares the same state across /, /index.html and tabs.
                window.sessionStorage.setItem(INTRO_SESSION_KEY, "1");
                setIntroSessionCookie();
            } catch (error) {
                // First-party session cookies remain the fallback when storage access fails.
                shouldShowIntro = !hasIntroSessionCookie();
                setIntroSessionCookie();
            }`;

if (!html.includes(previousBlock)) {
  throw new Error("Could not find the v5 intro session block in index.html");
}

html = html.replace(previousBlock, stableBlock);
fs.writeFileSync(indexPath, html, "utf8");
console.log("Patched stable cross-path and cross-tab intro session guard");
