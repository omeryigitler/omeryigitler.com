const fs = require("node:fs");
const path = require("node:path");

const indexPath = path.resolve(__dirname, "..", "index.html");
let html = fs.readFileSync(indexPath, "utf8");

const PATCH_MARKER = "Taurus intro session + adaptive HQ texture bootstrap v5";
if (html.includes(PATCH_MARKER)) {
  console.log("HQ one-time globe intro is already patched");
  process.exit(0);
}

function replaceRequired(search, replacement, label) {
  if (!html.includes(search)) {
    throw new Error(`Could not patch ${label}: expected source block was not found`);
  }
  html = html.replace(search, replacement);
}

const oldHeadBootstrap = `    <script>
        /* Hide CookieYes during the globe intro; safety-remove after 12s in case the intro never reveals */
        document.documentElement.classList.add("intro-active");
        setTimeout(function () { document.documentElement.classList.remove("intro-active"); }, 12000);
    </script>`;

const newHeadBootstrap = `    <script>
        /* ${PATCH_MARKER} */
        (function () {
            var INTRO_SESSION_KEY = "taurus-intro-seen-v5";
            var shouldShowIntro = true;

            try {
                shouldShowIntro = window.sessionStorage.getItem(INTRO_SESSION_KEY) !== "1";
                if (shouldShowIntro) window.sessionStorage.setItem(INTRO_SESSION_KEY, "1");
            } catch (error) {
                // Private browsing or strict storage policies must never block the site.
            }

            window.__TAURUS_SHOULD_SHOW_INTRO__ = shouldShowIntro;
            window.__TAURUS_INTRO_SESSION_KEY__ = INTRO_SESSION_KEY;

            if (!shouldShowIntro) {
                document.documentElement.classList.add("intro-skip");
                return;
            }

            document.documentElement.classList.add("intro-active");
            setTimeout(function () { document.documentElement.classList.remove("intro-active"); }, 14000);

            var isMobile = window.matchMedia("(max-width: 767px)").matches;
            var maxTextureSize = 0;

            try {
                var probeCanvas = document.createElement("canvas");
                var probeGl = probeCanvas.getContext("webgl2", { powerPreference: "high-performance" })
                    || probeCanvas.getContext("webgl", { powerPreference: "high-performance" });
                if (probeGl) {
                    maxTextureSize = Number(probeGl.getParameter(probeGl.MAX_TEXTURE_SIZE)) || 0;
                    var loseContext = probeGl.getExtension("WEBGL_lose_context");
                    if (loseContext) loseContext.loseContext();
                }
                probeCanvas.width = 1;
                probeCanvas.height = 1;
            } catch (error) {
                maxTextureSize = 0;
            }

            var memoryKnown = "deviceMemory" in navigator
                && Number.isFinite(Number(navigator.deviceMemory));
            var memoryGb = memoryKnown ? Number(navigator.deviceMemory) : null;
            var connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection || null;
            var saveData = Boolean(connection && connection.saveData);
            var effectiveType = connection && connection.effectiveType
                ? String(connection.effectiveType).toLowerCase()
                : "unknown";
            var slowConnection = /^(slow-)?2g$/.test(effectiveType);

            // Safari/Firefox mobile do not expose deviceMemory. Their safe fallback is 4K.
            // Desktop needs only a verified 8192px texture limit; capable Chromium mobile
            // additionally needs at least 8 GB reported memory.
            var canUse8K = maxTextureSize >= 8192
                && !saveData
                && !slowConnection
                && (!isMobile || (memoryKnown && memoryGb >= 8));

            var texture8K = "assets/globe/earth-black-marble-8k-hq-v3.jpg";
            var texture4K = "assets/globe/earth-black-marble-4k.webp";
            var selectedTexture = canUse8K ? texture8K : texture4K;

            window.__TAURUS_GLOBE_TEXTURE__ = selectedTexture;
            window.__TAURUS_GLOBE_FALLBACK_TEXTURE__ = texture4K;
            window.__TAURUS_GLOBE_PROFILE__ = {
                isMobile: isMobile,
                maxTextureSize: maxTextureSize,
                memoryKnown: memoryKnown,
                memoryGb: memoryGb,
                saveData: saveData,
                effectiveType: effectiveType,
                selectedTexture: selectedTexture
            };

            [selectedTexture, "assets/globe/earth-topology-2k.webp"].forEach(function (href) {
                var preload = document.createElement("link");
                preload.rel = "preload";
                preload.as = "image";
                preload.href = href;
                preload.setAttribute("fetchpriority", "high");
                document.head.appendChild(preload);
            });
        })();
    </script>`;
replaceRequired(oldHeadBootstrap, newHeadBootstrap, "early intro bootstrap");

const oldStaticPreloads = `    <!-- Globe/Three.js are self-hosted and loaded dynamically by the intro script
         after first paint, so they never block rendering. Preload only the texture
         that matches the viewport. -->
    <link rel="preload" as="image" href="assets/globe/earth-black-marble-4k.webp" media="(max-width: 767px)">
    <link rel="preload" as="image" href="assets/globe/earth-black-marble-8k.webp" media="(min-width: 768px)">`;
const newStaticPreloads = `    <!-- Globe libraries remain self-hosted. Texture preloads are injected only
         when the first intro of this tab will actually run. -->`;
replaceRequired(oldStaticPreloads, newStaticPreloads, "conditional texture preloads");

replaceRequired(
  `        #intro-modal {`,
  `        html.intro-skip #intro-modal { display: none !important; }\n\n        #intro-modal {`,
  "no-flash intro skip CSS"
);

const oldTextureConstants = `  // Device-tiered textures: full 8K detail on desktop (WebP, ~810KB vs the old
  // 3.26MB JPG), 4K on mobile where GPU memory is the constraint.
  const IS_MOBILE = window.matchMedia("(max-width: 767px)").matches;
  const EARTH_NIGHT = IS_MOBILE
    ? "assets/globe/earth-black-marble-4k.webp"
    : "assets/globe/earth-black-marble-8k.webp";
  const EARTH_BUMP = "assets/globe/earth-topology-2k.webp";`;
const newTextureConstants = `  // The head bootstrap selects 8K only after a WebGL capability probe. Mobile
  // Safari/Firefox safely remain on 4K because navigator.deviceMemory is absent.
  const IS_MOBILE = window.matchMedia("(max-width: 767px)").matches;
  const FALLBACK_EARTH_NIGHT = window.__TAURUS_GLOBE_FALLBACK_TEXTURE__
    || "assets/globe/earth-black-marble-4k.webp";
  let earthNightUrl = window.__TAURUS_GLOBE_TEXTURE__ || FALLBACK_EARTH_NIGHT;
  const EARTH_BUMP = "assets/globe/earth-topology-2k.webp";`;
replaceRequired(oldTextureConstants, newTextureConstants, "adaptive texture constants");

const oldIntroGuard = `  if (!introModal || !globeContainer || !signalOverlay) return;

  // Top status line — type the value like the site's "$ status → ..." prompts`;
const newIntroGuard = `  if (!introModal || !globeContainer || !signalOverlay) return;

  if (window.__TAURUS_SHOULD_SHOW_INTRO__ === false) {
    introModal.remove();
    document.documentElement.classList.remove("intro-skip");
    return;
  }

  // Top status line — type the value like the site's "$ status → ..." prompts`;
replaceRequired(oldIntroGuard, newIntroGuard, "one-time intro guard");

const oldScrollLock = `  // Phase 1: Initialization (0ms) - lock scrolling before the globe sequence starts.
  document.body.style.overflow = "hidden";

  function loadScript(src) {`;
const newScrollLock = `  // Phase 1: Initialization (0ms) - lock scrolling before the globe sequence starts.
  document.body.style.overflow = "hidden";

  function decodeImage(url, timeoutMs) {
    return new Promise(function (resolve, reject) {
      const image = new Image();
      let settled = false;
      const timeoutId = window.setTimeout(function () {
        if (settled) return;
        settled = true;
        reject(new Error("Texture decode timed out: " + url));
      }, timeoutMs);

      function finish(callback, value) {
        if (settled) return;
        settled = true;
        window.clearTimeout(timeoutId);
        callback(value);
      }

      image.decoding = "async";
      image.onload = function () {
        const decoded = typeof image.decode === "function"
          ? image.decode().catch(function () { return undefined; })
          : Promise.resolve();
        decoded.then(function () { finish(resolve, url); });
      };
      image.onerror = function () {
        finish(reject, new Error("Texture failed to load: " + url));
      };
      image.src = url;
    });
  }

  async function prepareEarthTexture() {
    const primary = earthNightUrl;
    const primaryTimeout = IS_MOBILE ? 5500 : 7000;

    try {
      await decodeImage(primary, primaryTimeout);
      return primary;
    } catch (primaryError) {
      if (primary !== FALLBACK_EARTH_NIGHT) {
        console.warn("[globe-preloader] 8K texture fallback", primaryError);
        earthNightUrl = FALLBACK_EARTH_NIGHT;
        try {
          await decodeImage(FALLBACK_EARTH_NIGHT, 4000);
        } catch (fallbackError) {
          console.warn("[globe-preloader] 4K texture decode fallback", fallbackError);
        }
      }
      return earthNightUrl;
    }
  }

  function loadScript(src) {`;
replaceRequired(oldScrollLock, newScrollLock, "texture decode preparation");

const oldPixelRatio = `    if (typeof renderer.setPixelRatio === "function") {
      // Cap the render resolution at 2x: crisp on retina screens without the
      // 3x-DPR cost the old code forced on every phone.
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    }`;
const newPixelRatio = `    if (typeof renderer.setPixelRatio === "function") {
      const deviceRatio = window.devicePixelRatio || 1;
      let targetRatio = IS_MOBILE
        ? Math.min(deviceRatio, 1.5)
        : Math.max(1.5, Math.min(deviceRatio, 2));

      // Do not request a drawing buffer larger than the GPU can allocate. This
      // keeps native 8K monitors at a safe 1x while still supersampling DPR-1 desktops.
      try {
        const gl = typeof renderer.getContext === "function" ? renderer.getContext() : null;
        const maxRenderbuffer = gl
          ? Number(gl.getParameter(gl.MAX_RENDERBUFFER_SIZE)) || 0
          : 0;
        const maxTexture = renderer.capabilities && renderer.capabilities.maxTextureSize
          ? Number(renderer.capabilities.maxTextureSize)
          : 0;
        const maxBuffer = Math.min(
          maxRenderbuffer || Number.POSITIVE_INFINITY,
          maxTexture || Number.POSITIVE_INFINITY
        );
        const viewportEdge = Math.max(window.innerWidth, window.innerHeight, 1);
        if (Number.isFinite(maxBuffer)) targetRatio = Math.min(targetRatio, maxBuffer / viewportEdge);
      } catch (error) {
        // Renderer capability probing is best-effort; the conservative ratio remains valid.
      }

      renderer.setPixelRatio(Math.max(1, targetRatio));
    }`;
replaceRequired(oldPixelRatio, newPixelRatio, "adaptive render pixel ratio");

const materialFunctionEnd = `    material.needsUpdate = true;
  }

  function tuneGlobeLights() {`;
const prewarmFunction = `    material.needsUpdate = true;
  }

  function prewarmGlobeTexturesAndRevealPoster() {
    const poster = document.getElementById("globe-poster");
    if (!world) {
      if (poster) poster.classList.add("is-hidden");
      return;
    }

    try {
      const renderer = typeof world.renderer === "function" ? world.renderer() : null;
      const material = typeof world.globeMaterial === "function" ? world.globeMaterial() : null;
      if (renderer && material) {
        [material.map, material.bumpMap, material.specularMap].forEach(function (texture) {
          if (texture && typeof renderer.initTexture === "function") renderer.initTexture(texture);
        });
        if (typeof renderer.compile === "function"
            && typeof world.scene === "function"
            && typeof world.camera === "function") {
          renderer.compile(world.scene(), world.camera());
        }
      }
    } catch (error) {
      console.warn("[globe-preloader] texture prewarm fallback", error);
    }

    // Keep the CSS globe visible while decode, GPU upload and shader compilation
    // finish. Two frames ensure a completed WebGL render is ready underneath it.
    window.requestAnimationFrame(function () {
      window.requestAnimationFrame(function () {
        if (poster) poster.classList.add("is-hidden");
      });
    });
  }

  function tuneGlobeLights() {`;
replaceRequired(materialFunctionEnd, prewarmFunction, "GPU texture prewarm");

replaceRequired(
  `.globeImageUrl(EARTH_NIGHT)`,
  `.globeImageUrl(earthNightUrl)`,
  "selected earth texture"
);

const oldReadyHandler = `      .onGlobeReady(function () {
        tuneGlobeMaterial();
        const poster = document.getElementById("globe-poster");
        if (poster) poster.classList.add("is-hidden");
      });`;
const newReadyHandler = `      .onGlobeReady(function () {
        tuneGlobeMaterial();
        prewarmGlobeTexturesAndRevealPoster();
      });`;
replaceRequired(oldReadyHandler, newReadyHandler, "first-frame poster reveal");

const oldSignalStart = `      geoPromise = fetchUserLocation();
      await globeLibsPromise;
      if (hasRevealedSite) return;
      initGlobe();`;
const newSignalStart = `      geoPromise = fetchUserLocation();
      const prepared = await Promise.all([globeLibsPromise, prepareEarthTexture()]);
      earthNightUrl = prepared[1];
      if (hasRevealedSite) return;
      initGlobe();`;
replaceRequired(oldSignalStart, newSignalStart, "parallel library and texture preparation");

fs.writeFileSync(indexPath, html, "utf8");
console.log("Patched one-time adaptive 8K/4K globe intro without changing visual color settings");
