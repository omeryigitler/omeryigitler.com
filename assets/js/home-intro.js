
/* 3D Globe Preloader Intro */
(function () {
  const INTRO_DELAY_MS = 500;
  const GEO_TIMEOUT_MS = 2000;
  const GEO_PROVIDER_TIMEOUT_MS = 900;
  const FLY_TO_DURATION_MS = 2500;
  const SIGNAL_HOLD_MS = 1500;
  const FADE_DURATION_MS = 500;
  const ACCENT_COLOR = "#FFD700";
  const SPACE_COLOR = "#0a0a0a";
  // The head bootstrap selects 8K only after a WebGL capability probe. Mobile
  // Safari/Firefox safely remain on 4K because navigator.deviceMemory is absent.
  const IS_MOBILE = window.matchMedia("(max-width: 767px)").matches;
  const FALLBACK_EARTH_NIGHT = window.__TAURUS_GLOBE_FALLBACK_TEXTURE__
    || "assets/globe/earth-black-marble-4k.webp";
  let earthNightUrl = window.__TAURUS_GLOBE_TEXTURE__ || FALLBACK_EARTH_NIGHT;
  const EARTH_BUMP = "assets/globe/earth-topology-2k.webp";
  const GLOBE_LIBS = ["assets/vendor/three.min.js", "assets/vendor/globe.gl.min.js"];
  const LIB_LOAD_TIMEOUT_MS = 9000;
  const INITIAL_ALTITUDE = 3.2;
  const STANDARD_FOCUS_ALTITUDE = 1.35;
  // Malta occupies only a tiny area on an 8K equirectangular texture.
  // Keep the camera at a regional distance so the globe stays crisp instead of over-magnifying a few pixels.
  const MALTA_FOCUS_ALTITUDE = 0.80;
  const GEO_CACHE_KEY = "taurus-globe-geo-v1";
  const GEO_CACHE_TTL_MS = 6 * 60 * 60 * 1000;
  const DEFAULT_LOCATION = {
    lat: 35.8997,
    lng: 14.5146,
    city: "UNKNOWN NODE",
    provider: "fallback"
  };
  const NETWORK_NODES = [
    { name: "MALTA CORE", lat: 35.8997, lng: 14.5146 },
    { name: "ISTANBUL RELAY", lat: 41.0082, lng: 28.9784 },
    { name: "LONDON NODE", lat: 51.5072, lng: -0.1276 },
    { name: "NEW YORK GRID", lat: 40.7128, lng: -74.006 },
    { name: "SINGAPORE HUB", lat: 1.3521, lng: 103.8198 },
    { name: "TOKYO SIGNAL", lat: 35.6762, lng: 139.6503 }
  ];

  const introModal = document.getElementById("intro-modal");
  const globeContainer = document.getElementById("globe-container");
  const signalOverlay = document.getElementById("signal-overlay");

  if (!introModal || !globeContainer || !signalOverlay) return;

  if (window.__TAURUS_SHOULD_SHOW_INTRO__ === false) {
    introModal.remove();
    document.documentElement.classList.remove("intro-skip");
    return;
  }

  // Top status line — type the value like the site's "$ status → ..." prompts
  (function () {
    const val = document.getElementById("introStatusVal");
    if (!val) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const phrases = ["scanning orbital nodes", "triangulating signal", "locking position"];
    let pi = 0, i = 0, deleting = false;
    val.textContent = "";

    (function step() {
      const text = phrases[pi];
      val.textContent = text.slice(0, i);
      if (!deleting) {
        if (i < text.length) { i += 1; setTimeout(step, 45 + Math.random() * 40); }
        else { deleting = true; setTimeout(step, 1600); }
      } else {
        if (i > 0) { i -= 1; setTimeout(step, 28); }
        else { deleting = false; pi = (pi + 1) % phrases.length; setTimeout(step, 400); }
      }
    })();
  })();

  const previousBodyOverflow = document.body.style.overflow;
  let world = null;
  let hasRevealedSite = false;
  let resizeObserver = null;
  let detachResizeHandler = null;
  let detachVisibilityHandler = null;

  // Phase 1: Initialization (0ms) - lock scrolling before the globe sequence starts.
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

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      const script = document.createElement("script");
      script.src = src;
      script.async = true;
      script.onload = resolve;
      script.onerror = function () { reject(new Error("Failed to load " + src)); };
      document.head.appendChild(script);
    });
  }

  // three.min.js must be evaluated before globe.gl.min.js (global THREE dependency),
  // so the libs load sequentially — but off the critical path, with a hard timeout.
  const globeLibsPromise = (function () {
    let chain = Promise.resolve();
    GLOBE_LIBS.forEach(function (src) {
      chain = chain.then(function () { return loadScript(src); });
    });
    const timeout = new Promise(function (_, reject) {
      window.setTimeout(function () { reject(new Error("Globe libraries timed out")); }, LIB_LOAD_TIMEOUT_MS);
    });
    return Promise.race([chain, timeout]);
  })();

  // Frees GPU memory once the intro is gone: stop the render loop, dispose every
  // geometry/material/texture and drop the WebGL context.
  function destroyGlobe() {
    if (!world) return;
    const dyingWorld = world;
    world = null;

    try {
      if (typeof dyingWorld.pauseAnimation === "function") dyingWorld.pauseAnimation();

      const scene = typeof dyingWorld.scene === "function" ? dyingWorld.scene() : null;
      if (scene && typeof scene.traverse === "function") {
        scene.traverse(function (object) {
          if (object.geometry && typeof object.geometry.dispose === "function") object.geometry.dispose();
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          materials.forEach(function (material) {
            if (!material) return;
            ["map", "bumpMap", "specularMap", "emissiveMap", "alphaMap"].forEach(function (key) {
              if (material[key] && typeof material[key].dispose === "function") material[key].dispose();
            });
            if (typeof material.dispose === "function") material.dispose();
          });
        });
      }

      const renderer = typeof dyingWorld.renderer === "function" ? dyingWorld.renderer() : null;
      if (renderer) {
        if (typeof renderer.dispose === "function") renderer.dispose();
        if (typeof renderer.forceContextLoss === "function") renderer.forceContextLoss();
      }
    } catch (error) {
      // Cleanup is best-effort; a failed dispose must never block the reveal.
    }
  }

  function revealSite(immediate) {
    if (hasRevealedSite) return;
    hasRevealedSite = true;

    if (world) {
      world.controls().autoRotate = false;
    }

    if (resizeObserver) {
      resizeObserver.disconnect();
    }

    if (detachResizeHandler) {
      detachResizeHandler();
    }

    if (detachVisibilityHandler) {
      detachVisibilityHandler();
    }

    signalOverlay.classList.remove("is-visible");
    signalOverlay.classList.remove("is-low-focus");
    globeContainer.classList.add("is-fading");
    introModal.classList.add("is-fading");
    document.documentElement.classList.remove("intro-active");

    window.setTimeout(function () {
      destroyGlobe();
      introModal.remove();
      document.body.style.overflow = previousBodyOverflow;
    }, immediate ? 0 : FADE_DURATION_MS);
  }

  function normalizeLocation(latValue, lngValue, cityValue, providerName) {
    const lat = Number(latValue);
    const lng = Number(lngValue);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      throw new Error("Invalid geolocation payload");
    }

    return {
      lat: lat,
      lng: lng,
      city: cityValue || "UNKNOWN NODE",
      provider: providerName
    };
  }

  function isMaltaLocation(location) {
    return Boolean(location)
      && location.lat >= 35.75
      && location.lat <= 36.15
      && location.lng >= 14.1
      && location.lng <= 14.65;
  }

  function getFocusAltitude(location) {
    return isMaltaLocation(location) ? MALTA_FOCUS_ALTITUDE : STANDARD_FOCUS_ALTITUDE;
  }

  function readCachedLocation() {
    try {
      const cached = window.localStorage.getItem(GEO_CACHE_KEY);
      if (!cached) return null;

      const parsed = JSON.parse(cached);
      if (!parsed || Date.now() - parsed.cachedAt > GEO_CACHE_TTL_MS) {
        window.localStorage.removeItem(GEO_CACHE_KEY);
        return null;
      }

      return normalizeLocation(parsed.lat, parsed.lng, parsed.city, parsed.provider || "cache");
    } catch (error) {
      return null;
    }
  }

  function cacheLocation(location) {
    if (!location || location.provider === "fallback") return;

    try {
      window.localStorage.setItem(GEO_CACHE_KEY, JSON.stringify({
        lat: location.lat,
        lng: location.lng,
        city: location.city,
        provider: location.provider,
        cachedAt: Date.now()
      }));
    } catch (error) {
      // Storage can be disabled in private browsing; the intro should still run.
    }
  }

  const GEO_PROVIDERS = [
    {
      name: "geojs",
      url: "https://get.geojs.io/v1/ip/geo.json",
      normalize: function (payload) {
        return normalizeLocation(payload.latitude, payload.longitude, payload.city, "geojs");
      }
    },
    {
      name: "ipwhois",
      url: "https://ipwho.is/",
      normalize: function (payload) {
        if (payload && payload.success === false) {
          throw new Error("ipwhois failed");
        }

        return normalizeLocation(payload.latitude, payload.longitude, payload.city, "ipwhois");
      }
    },
    {
      name: "geolocation-db",
      url: "https://geolocation-db.com/json/",
      normalize: function (payload) {
        return normalizeLocation(payload.latitude, payload.longitude, payload.city, "geolocation-db");
      }
    }
  ];

  function getBaseNetworkPoints() {
    return NETWORK_NODES.map(function (node) {
      return {
        lat: node.lat,
        lng: node.lng,
        altitude: 0.012,
        radius: 0.055,
        color: "rgba(255, 215, 0, 0.72)"
      };
    });
  }

  function buildSignalArcs(userLocation) {
    return NETWORK_NODES.map(function (node, index) {
      return {
        startLat: node.lat,
        startLng: node.lng,
        endLat: userLocation.lat,
        endLng: userLocation.lng,
        altitude: 0.18 + (index % 3) * 0.045,
        stroke: window.innerWidth < 640 ? 0.34 : 0.5,
        order: index
      };
    });
  }

  function tuneGlobeRenderer() {
    if (!world || typeof world.renderer !== "function") return;

    const renderer = world.renderer();
    if (!renderer) return;

    if (typeof renderer.setPixelRatio === "function") {
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
    }

    if (typeof renderer.setClearColor === "function") {
      renderer.setClearColor(SPACE_COLOR, 1);
    }

    if (window.THREE) {
      if (THREE.SRGBColorSpace) {
        renderer.outputColorSpace = THREE.SRGBColorSpace;
      }

      if (THREE.ACESFilmicToneMapping) {
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.08;
      }
    }
  }

  function tuneGlobeMaterial() {
    if (!world || !window.THREE || typeof world.globeMaterial !== "function") return;

    const material = world.globeMaterial();
    const renderer = typeof world.renderer === "function" ? world.renderer() : null;
    const maxAnisotropy = renderer && renderer.capabilities
      ? renderer.capabilities.getMaxAnisotropy()
      : 1;

    if (!material) return;

    material.bumpScale = 1.6;
    material.shininess = 8;

    if (material.specular) {
      material.specular = new THREE.Color("#8a6f1a");
    }

    if (material.emissive) {
      material.emissive = new THREE.Color("#080600");
      material.emissiveIntensity = 0.08;
    }

    [material.map, material.bumpMap, material.specularMap].forEach(function (texture) {
      if (!texture) return;
      texture.anisotropy = Math.min(maxAnisotropy, 16);
      if (texture === material.map && THREE.SRGBColorSpace) {
        texture.colorSpace = THREE.SRGBColorSpace;
      }
      if (THREE.LinearMipmapLinearFilter) {
        texture.minFilter = THREE.LinearMipmapLinearFilter;
      }
      if (THREE.LinearFilter) {
        texture.magFilter = THREE.LinearFilter;
      }
      texture.generateMipmaps = true;
      texture.needsUpdate = true;
    });

    material.needsUpdate = true;
  }

  function prewarmGlobeTexturesAndReveal() {
    if (!world || hasRevealedSite) return;

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

    // Keep the real globe hidden until texture upload and shader compilation
    // finish, then wait two frames before revealing the rendered canvas.
    window.requestAnimationFrame(function () {
      window.requestAnimationFrame(function () {
        if (!hasRevealedSite) globeContainer.classList.add("is-ready");
      });
    });
  }

  function tuneGlobeLights() {
    if (!world || typeof world.lights !== "function" || !window.THREE) return;

    world.lights().forEach(function (light) {
      if (light.type === "AmbientLight") {
        light.intensity = 1.55;
      }

      if (light.type === "DirectionalLight") {
        light.color.set("#fff1a8");
        light.intensity = 0.75;
        light.position.set(-1.2, 0.85, 1.25);
      }
    });
  }

  async function fetchLocationFromProvider(provider, timeoutMs) {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(function () {
      controller.abort();
    }, timeoutMs);

    try {
      const response = await fetch(provider.url, {
        signal: controller.signal,
        cache: "no-store"
      });

      if (!response.ok) {
        throw new Error(provider.name + " geolocation failed: " + response.status);
      }

      return provider.normalize(await response.json());
    } finally {
      window.clearTimeout(timeoutId);
    }
  }

  async function fetchUserLocation() {
    const cachedLocation = readCachedLocation();
    if (cachedLocation) return cachedLocation;

    const startedAt = Date.now();
    let lastError = null;

    for (let i = 0; i < GEO_PROVIDERS.length; i += 1) {
      const elapsedMs = Date.now() - startedAt;
      const remainingMs = GEO_TIMEOUT_MS - elapsedMs;
      if (remainingMs <= 0) break;

      try {
        const location = await fetchLocationFromProvider(
          GEO_PROVIDERS[i],
          Math.min(GEO_PROVIDER_TIMEOUT_MS, remainingMs)
        );
        cacheLocation(location);
        return location;
      } catch (error) {
        lastError = error;
      }
    }

    console.warn("[globe-preloader] geolocation fallback", lastError || new Error("All geolocation providers failed"));
    return DEFAULT_LOCATION;
  }

  function initGlobe() {
    if (typeof Globe !== "function") {
      throw new Error("Globe.gl library is unavailable");
    }

    world = Globe({ rendererConfig: { antialias: !IS_MOBILE, alpha: false, powerPreference: "high-performance" } })(globeContainer)
      .backgroundColor(SPACE_COLOR)
      .globeImageUrl(earthNightUrl)
      .bumpImageUrl(EARTH_BUMP)
      .showAtmosphere(true)
      .atmosphereColor(ACCENT_COLOR)
      .atmosphereAltitude(0.08)
      .pointOfView({ lat: 0, lng: 0, altitude: INITIAL_ALTITUDE }, 0)
      .pointsData(getBaseNetworkPoints())
      .pointLat("lat")
      .pointLng("lng")
      .pointAltitude("altitude")
      .pointRadius("radius")
      .pointResolution(IS_MOBILE ? 16 : 28)
      .pointColor("color")
      .arcsData([])
      .arcStartLat("startLat")
      .arcStartLng("startLng")
      .arcEndLat("endLat")
      .arcEndLng("endLng")
      .arcAltitude("altitude")
      .arcStroke("stroke")
      .arcCurveResolution(IS_MOBILE ? 48 : 96)
      .arcCircularResolution(IS_MOBILE ? 6 : 8)
      .arcColor(function () {
        return [
          "rgba(255, 215, 0, 0)",
          "rgba(255, 215, 0, 0.92)",
          "rgba(240, 192, 64, 0)"
        ];
      })
      .arcDashLength(0.26)
      .arcDashGap(0.86)
      .arcDashInitialGap(function (arc) { return arc.order * 0.16; })
      .arcDashAnimateTime(1200)
      .arcsTransitionDuration(850)
      .ringsData([])
      .ringColor(function () { return ACCENT_COLOR; })
      .ringMaxRadius(3)
      .ringPropagationSpeed(3)
      .ringRepeatPeriod(700)
      .onGlobeReady(function () {
        tuneGlobeMaterial();
        prewarmGlobeTexturesAndReveal();
      });

    if (typeof world.globeCurvatureResolution === "function") {
      world.globeCurvatureResolution(2);
    }

    tuneGlobeRenderer();
    tuneGlobeMaterial();
    tuneGlobeLights();

    const controls = world.controls();
    controls.enableZoom = false;
    controls.enablePan = false;
    controls.enableRotate = false;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.45;

    function syncGlobeSize() {
      if (!world || hasRevealedSite) return;
      world.width(window.innerWidth);
      world.height(window.innerHeight);
    }

    syncGlobeSize();
    window.addEventListener("resize", syncGlobeSize, { passive: true });
    detachResizeHandler = function () {
      window.removeEventListener("resize", syncGlobeSize);
    };

    if (typeof ResizeObserver === "function") {
      resizeObserver = new ResizeObserver(syncGlobeSize);
      resizeObserver.observe(globeContainer);
    }

    // A backgrounded tab must not keep burning frames on the WebGL loop.
    function handleVisibility() {
      if (!world) return;
      if (document.hidden) {
        if (typeof world.pauseAnimation === "function") world.pauseAnimation();
      } else if (typeof world.resumeAnimation === "function") {
        world.resumeAnimation();
      }
    }
    document.addEventListener("visibilitychange", handleVisibility);
    detachVisibilityHandler = function () {
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }

  async function runSignalSequence() {
    let geoPromise;

    try {
      // Geolocation races the library download; the CSS poster keeps the intro
      // visually complete until WebGL takes over.
      geoPromise = fetchUserLocation();
      const prepared = await Promise.all([globeLibsPromise, prepareEarthTexture()]);
      earthNightUrl = prepared[1];
      if (hasRevealedSite) return;
      initGlobe();
    } catch (error) {
      console.warn("[globe-preloader]", error);
      revealSite(false);
      return;
    }

    geoPromise.catch(function (error) {
      console.warn("[globe-preloader]", error);
      revealSite(false);
    });

    try {
      await new Promise(function (resolve) {
        window.setTimeout(resolve, INTRO_DELAY_MS);
      });

      const userLocation = await geoPromise;
      if (hasRevealedSite) return;
      const isMaltaFocus = isMaltaLocation(userLocation);

      // Phase 2: Fly-To Sequence - stop rotation and fly for exactly 2500ms.
      world.controls().autoRotate = false;
      if (typeof world.atmosphereAltitude === "function") {
        world.atmosphereAltitude(isMaltaFocus ? 0.055 : 0.08);
      }
      world.pointOfView({
        lat: userLocation.lat,
        lng: userLocation.lng,
        altitude: getFocusAltitude(userLocation)
      }, FLY_TO_DURATION_MS);

      window.setTimeout(function () {
        if (hasRevealedSite) return;

        // Phase 3: Signal Acquired - pulse the exact user coordinates and show the city.
        const signalPoint = {
          lat: userLocation.lat,
          lng: userLocation.lng,
          altitude: 0.026,
          radius: isMaltaFocus ? 0.09 : 0.19,
          color: ACCENT_COLOR
        };
        world
          .pointsData(getBaseNetworkPoints().concat(signalPoint))
          .arcsData(buildSignalArcs(userLocation))
          .ringMaxRadius(isMaltaFocus ? 1.15 : 3)
          .ringPropagationSpeed(isMaltaFocus ? 1.2 : 3)
          .ringsData([signalPoint]);
        signalOverlay.textContent = "[ SIGNAL ACQUIRED: " + String(userLocation.city).toUpperCase() + " ]";
        signalOverlay.classList.toggle("is-low-focus", isMaltaFocus);
        signalOverlay.classList.add("is-visible");

        // Phase 4: Fade Out & Reveal Site - fade the full intro layer with the globe.
        // This prevents a black gap on mobile after the WebGL canvas has disappeared.
        window.setTimeout(function () {
          revealSite(false);
        }, SIGNAL_HOLD_MS);
      }, FLY_TO_DURATION_MS);
    } catch (error) {
      if (!hasRevealedSite) {
        console.warn("[globe-preloader]", error);
        revealSite(false);
      }
    }
  }

  runSignalSequence();
})();
