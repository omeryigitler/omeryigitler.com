/*
 * Oakley-style scroll experience layer for omeryigitler.com
 * v3 focuses on clarity first: readable premium sections, controlled GSAP motion,
 * no oversized cropped headings, no messy overlay composition.
 */
(function () {
    const VERSION = 'oakley-scroll-experience-v3';

    if (window.__OAKLEY_SCROLL_EXPERIENCE__ === VERSION) return;
    window.__OAKLEY_SCROLL_EXPERIENCE__ = VERSION;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function onReady(callback) {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', callback, { once: true });
        } else {
            callback();
        }
    }

    function loadScript(src) {
        return new Promise((resolve, reject) => {
            const existing = document.querySelector(`script[src="${src}"]`);
            if (existing) {
                existing.addEventListener('load', resolve, { once: true });
                existing.addEventListener('error', reject, { once: true });
                if (existing.dataset.loaded === 'true') resolve();
                return;
            }

            const script = document.createElement('script');
            script.src = src;
            script.defer = true;
            script.onload = () => {
                script.dataset.loaded = 'true';
                resolve();
            };
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    async function loadMotionStack() {
        if (prefersReducedMotion) return false;
        try {
            if (!window.gsap) await loadScript('https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/gsap.min.js');
            if (!window.ScrollTrigger) await loadScript('https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/ScrollTrigger.min.js');
            if (window.gsap && window.ScrollTrigger) {
                window.gsap.registerPlugin(window.ScrollTrigger);
                return true;
            }
        } catch (error) {
            console.warn('[Oakley Scroll] GSAP unavailable, using CSS fallback.', error);
        }
        return false;
    }

    function injectStyles() {
        const old = document.getElementById('oakley-scroll-experience-styles');
        if (old) old.remove();

        const style = document.createElement('style');
        style.id = 'oakley-scroll-experience-styles';
        style.textContent = `
            :root {
                --oy3-gold: #FFD700;
                --oy3-bg: #050505;
                --oy3-panel: rgba(12, 12, 12, 0.72);
                --oy3-border: rgba(255, 255, 255, 0.10);
                --oy3-text: rgba(255, 255, 255, 0.92);
                --oy3-muted: rgba(156, 163, 175, 0.94);
                --oy3-blue: #38BDF8;
                --oy3-green: #22C55E;
                --oy3-violet: #A855F7;
            }

            html { scroll-behavior: smooth; }

            body::before {
                content: "";
                position: fixed;
                inset: 0;
                z-index: -9;
                pointer-events: none;
                opacity: 0;
                background:
                    radial-gradient(circle at var(--oy3-cursor-x, 50%) var(--oy3-cursor-y, 35%), rgba(255, 215, 0, 0.07), transparent 24rem),
                    radial-gradient(circle at 70% 24%, rgba(56, 189, 248, 0.06), transparent 24rem);
                transition: opacity 600ms ease;
            }

            body.oy3-motion-on::before { opacity: 1; }

            .oy3-hud {
                position: fixed;
                right: clamp(1rem, 2.5vw, 2rem);
                top: 50%;
                z-index: 45;
                display: none;
                transform: translateY(-50%);
                pointer-events: none;
            }
            .oy3-hud__label {
                position: absolute;
                right: 1rem;
                top: -0.25rem;
                width: 8.5rem;
                color: rgba(255, 215, 0, 0.72);
                font-family: 'Syncopate', sans-serif;
                font-size: 0.52rem;
                font-weight: 700;
                letter-spacing: 0.22em;
                text-align: right;
                text-transform: uppercase;
            }
            .oy3-hud__rail {
                width: 1px;
                height: 220px;
                background: rgba(255, 255, 255, 0.08);
                border-radius: 999px;
                overflow: hidden;
            }
            .oy3-hud__progress {
                width: 100%;
                height: calc(var(--oy3-progress, 0) * 100%);
                background: linear-gradient(to bottom, transparent, var(--oy3-gold), transparent);
                box-shadow: 0 0 22px rgba(255, 215, 0, 0.55);
            }
            @media (min-width: 1180px) { .oy3-hud { display: block; } }

            .oy3-section {
                width: 100%;
                max-width: 1180px;
                margin: clamp(6rem, 10vw, 9rem) auto clamp(6rem, 10vw, 9rem);
                scroll-margin-top: 8rem;
                position: relative;
                isolation: isolate;
            }

            .oy3-section::before {
                content: "";
                position: absolute;
                left: 50%;
                top: 2rem;
                z-index: -1;
                width: min(70vw, 680px);
                height: min(70vw, 680px);
                border-radius: 999px;
                background: radial-gradient(circle, rgba(255, 215, 0, 0.08), transparent 64%);
                transform: translateX(-50%);
                filter: blur(68px);
                pointer-events: none;
            }

            .oy3-kicker {
                display: inline-flex;
                align-items: center;
                gap: 0.55rem;
                padding: 0.42rem 0.9rem;
                border: 1px solid rgba(255, 215, 0, 0.26);
                border-radius: 999px;
                background: rgba(255, 215, 0, 0.075);
                color: var(--oy3-gold);
                font-family: 'Syncopate', sans-serif;
                font-size: 0.56rem;
                font-weight: 700;
                letter-spacing: 0.18em;
                text-transform: uppercase;
            }
            .oy3-kicker::before {
                content: "";
                width: 0.42rem;
                height: 0.42rem;
                border-radius: 999px;
                background: var(--oy3-gold);
                box-shadow: 0 0 18px rgba(255, 215, 0, 0.72);
            }

            .oy3-title {
                margin: 1.1rem 0 0;
                color: white;
                font-family: 'Syncopate', sans-serif;
                font-size: clamp(2rem, 4.8vw, 4.4rem);
                font-weight: 700;
                line-height: 0.98;
                letter-spacing: -0.055em;
                text-transform: uppercase;
            }
            .oy3-title span {
                display: block;
                color: transparent;
                background: linear-gradient(180deg, #ffffff, #6b7280);
                -webkit-background-clip: text;
                background-clip: text;
            }
            .oy3-copy {
                max-width: 620px;
                margin: 1.15rem 0 0;
                color: var(--oy3-muted);
                font-size: clamp(0.9rem, 1.2vw, 1.02rem);
                line-height: 1.8;
            }

            .oy3-shell {
                border: 1px solid var(--oy3-border);
                border-radius: 2.1rem;
                background:
                    linear-gradient(145deg, rgba(255, 255, 255, 0.045), rgba(255, 255, 255, 0.012)),
                    radial-gradient(circle at 20% 12%, rgba(255, 215, 0, 0.085), transparent 22rem),
                    radial-gradient(circle at 80% 12%, rgba(56, 189, 248, 0.07), transparent 22rem),
                    rgba(5, 5, 5, 0.68);
                box-shadow: 0 55px 140px -90px rgba(0, 0, 0, 1), inset 0 1px 0 rgba(255,255,255,0.065);
                backdrop-filter: blur(22px);
                overflow: hidden;
            }

            .oy3-services-head {
                text-align: center;
                max-width: 820px;
                margin: 0 auto clamp(2rem, 5vw, 3.5rem);
            }
            .oy3-services-head .oy3-copy { margin-left: auto; margin-right: auto; }

            .oy3-services-grid {
                display: grid;
                grid-template-columns: 1fr;
                gap: clamp(1rem, 2vw, 1.4rem);
                padding: clamp(1rem, 2.5vw, 1.5rem);
            }
            @media (min-width: 980px) {
                .oy3-services-grid {
                    grid-template-columns: minmax(320px, 0.9fr) minmax(540px, 1.2fr);
                    align-items: stretch;
                }
            }

            .oy3-service-list {
                display: grid;
                gap: 0.8rem;
            }
            .oy3-service-card {
                position: relative;
                display: grid;
                grid-template-columns: auto 1fr;
                gap: 1rem;
                min-height: 116px;
                padding: 1.1rem;
                border: 1px solid rgba(255,255,255,0.08);
                border-radius: 1.15rem;
                background: rgba(255,255,255,0.028);
                overflow: hidden;
                transition: border-color 300ms ease, background 300ms ease, transform 300ms ease;
            }
            .oy3-service-card::before {
                content: "";
                position: absolute;
                inset: 0;
                opacity: 0;
                background: radial-gradient(circle at 0% 0%, var(--card-glow, rgba(255,215,0,0.14)), transparent 60%);
                transition: opacity 300ms ease;
            }
            .oy3-service-card.is-active {
                border-color: var(--card-border, rgba(255,215,0,0.34));
                background: rgba(255,255,255,0.05);
                transform: translateX(0.25rem);
            }
            .oy3-service-card.is-active::before { opacity: 1; }
            .oy3-service-num {
                position: relative;
                z-index: 1;
                width: 2.5rem;
                height: 2.5rem;
                display: grid;
                place-items: center;
                border: 1px solid var(--card-border, rgba(255,215,0,0.34));
                border-radius: 0.85rem;
                color: var(--card-color, var(--oy3-gold));
                background: rgba(0,0,0,0.28);
                font-family: 'Syncopate', sans-serif;
                font-size: 0.62rem;
                font-weight: 700;
            }
            .oy3-service-card h3 {
                position: relative;
                z-index: 1;
                margin: 0 0 0.45rem;
                color: white;
                font-family: 'Syncopate', sans-serif;
                font-size: clamp(0.98rem, 1.45vw, 1.25rem);
                line-height: 1.12;
                letter-spacing: -0.02em;
                text-transform: uppercase;
            }
            .oy3-service-card p {
                position: relative;
                z-index: 1;
                margin: 0;
                color: rgba(156,163,175,0.95);
                font-size: 0.84rem;
                line-height: 1.6;
            }

            .oy3-system-board {
                position: relative;
                min-height: 560px;
                border: 1px solid rgba(255,255,255,0.08);
                border-radius: 1.45rem;
                background:
                    linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.012)),
                    rgba(0,0,0,0.30);
                overflow: hidden;
            }
            .oy3-system-board::before {
                content: "";
                position: absolute;
                inset: 0;
                background-image:
                    linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px),
                    linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px);
                background-size: 42px 42px;
                mask-image: radial-gradient(circle at center, black, transparent 74%);
                opacity: 0.55;
                pointer-events: none;
            }
            .oy3-board-topbar {
                position: relative;
                z-index: 2;
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 1rem;
                padding: 1rem 1.05rem;
                border-bottom: 1px solid rgba(255,255,255,0.08);
                color: rgba(255,255,255,0.72);
                font-size: 0.68rem;
                font-weight: 800;
                letter-spacing: 0.14em;
                text-transform: uppercase;
            }
            .oy3-board-status { color: var(--oy3-gold); }
            .oy3-board-layout {
                position: relative;
                z-index: 2;
                display: grid;
                grid-template-columns: 1fr;
                gap: 1rem;
                padding: clamp(1rem, 2.2vw, 1.5rem);
            }
            @media (min-width: 700px) {
                .oy3-board-layout { grid-template-columns: 1fr 1fr; }
            }
            .oy3-board-card {
                min-height: 132px;
                padding: 1rem;
                border: 1px solid rgba(255,255,255,0.08);
                border-radius: 1.05rem;
                background: rgba(0,0,0,0.34);
            }
            .oy3-board-card strong {
                display: block;
                color: var(--board-color, var(--oy3-gold));
                font-size: 0.72rem;
                letter-spacing: 0.15em;
                text-transform: uppercase;
                margin-bottom: 0.7rem;
            }
            .oy3-board-card span {
                display: block;
                color: rgba(229,231,235,0.82);
                font-size: 0.84rem;
                line-height: 1.55;
            }
            .oy3-board-center {
                grid-column: 1 / -1;
                min-height: 155px;
                display: grid;
                place-items: center;
                text-align: center;
                border-color: rgba(255,215,0,0.20);
                background: radial-gradient(circle at center, rgba(255,215,0,0.10), rgba(0,0,0,0.38));
            }
            .oy3-board-center b {
                display:block;
                color:white;
                font-family:'Syncopate',sans-serif;
                font-size:clamp(1.1rem, 2.2vw, 1.7rem);
                letter-spacing:-0.04em;
                text-transform:uppercase;
            }
            .oy3-board-center small {
                display:block;
                margin-top:0.6rem;
                color:rgba(255,215,0,0.82);
                font-size:0.68rem;
                letter-spacing:0.18em;
                text-transform:uppercase;
            }

            .oy3-portfolio-shell {
                display: grid;
                grid-template-columns: 1fr;
                gap: clamp(1rem, 2.4vw, 1.6rem);
                padding: clamp(1rem, 2.5vw, 1.5rem);
            }
            @media (min-width: 980px) {
                .oy3-portfolio-shell {
                    grid-template-columns: minmax(320px, 0.88fr) minmax(540px, 1.18fr);
                    align-items: center;
                }
            }
            .oy3-portfolio-copy { padding: clamp(0.4rem, 1.6vw, 1.2rem); }
            .oy3-spec-grid {
                display: grid;
                grid-template-columns: repeat(2, minmax(0, 1fr));
                gap: 0.75rem;
                margin-top: 1.4rem;
            }
            .oy3-spec {
                padding: 0.95rem;
                border: 1px solid rgba(255,255,255,0.08);
                border-radius: 1rem;
                background: rgba(255,255,255,0.026);
            }
            .oy3-spec b {
                display: block;
                color: var(--oy3-gold);
                font-family: 'Syncopate', sans-serif;
                font-size: 0.62rem;
                letter-spacing: 0.14em;
                margin-bottom: 0.5rem;
                text-transform: uppercase;
            }
            .oy3-spec span {
                color: rgba(229,231,235,0.82);
                font-size: 0.82rem;
                line-height: 1.5;
            }
            .oy3-cta {
                display: inline-flex;
                align-items: center;
                gap: 0.65rem;
                margin-top: 1.5rem;
                padding: 0.9rem 1.25rem;
                border-radius: 999px;
                background: var(--oy3-gold);
                color: black;
                font-size: 0.72rem;
                font-weight: 900;
                letter-spacing: 0.14em;
                text-transform: uppercase;
                transition: transform 250ms ease, background 250ms ease;
            }
            .oy3-cta:hover { transform: translateY(-2px); background: white; }

            .oy3-device-board {
                position: relative;
                min-height: 560px;
                border: 1px solid rgba(255,255,255,0.08);
                border-radius: 1.45rem;
                background:
                    radial-gradient(circle at 62% 22%, rgba(56,189,248,0.10), transparent 18rem),
                    radial-gradient(circle at 22% 80%, rgba(255,215,0,0.09), transparent 18rem),
                    rgba(0,0,0,0.30);
                overflow: hidden;
                perspective: 1100px;
            }
            .oy3-device-board::before {
                content:"";
                position:absolute;
                inset:0;
                background-image:
                    linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px),
                    linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px);
                background-size: 44px 44px;
                mask-image: radial-gradient(circle at center, black, transparent 78%);
                opacity:0.48;
            }
            .oy3-device-scene {
                position:absolute;
                inset:8% 6%;
                transform-style:preserve-3d;
            }
            .oy3-device {
                position:absolute;
                border:1px solid rgba(255,255,255,0.14);
                background:linear-gradient(145deg, rgba(255,255,255,0.09), rgba(255,255,255,0.018));
                box-shadow:0 34px 90px -52px rgba(0,0,0,1), inset 0 1px 0 rgba(255,255,255,0.08);
                overflow:hidden;
            }
            .oy3-device::before {
                content:"";
                position:absolute;
                inset:0.5rem;
                border-radius:inherit;
                background:
                    linear-gradient(135deg, rgba(255,215,0,0.13), transparent 32%),
                    rgba(0,0,0,0.72);
            }
            .oy3-desktop {
                left:18%; top:18%; width:64%; aspect-ratio:1.62; border-radius:1.1rem;
                transform:rotateX(8deg) rotateY(-12deg);
            }
            .oy3-tablet {
                left:4%; top:42%; width:25%; aspect-ratio:0.72; border-radius:1.2rem;
                transform:rotateZ(-7deg) rotateY(18deg);
            }
            .oy3-phone {
                right:7%; top:47%; width:18%; aspect-ratio:0.52; border-radius:1.35rem;
                transform:rotateZ(8deg) rotateY(-18deg);
            }
            .oy3-lines {
                position:absolute;
                inset:18% 13%;
                z-index:2;
                display:grid;
                gap:0.55rem;
            }
            .oy3-lines i {
                display:block;
                height:0.46rem;
                border-radius:999px;
                background:rgba(255,255,255,0.10);
            }
            .oy3-lines i:nth-child(1) { width:42%; background:rgba(255,215,0,0.50); }
            .oy3-lines i:nth-child(2) { width:82%; }
            .oy3-lines i:nth-child(3) { width:66%; background:rgba(56,189,248,0.28); }
            .oy3-lines i:nth-child(4) { width:74%; }
            .oy3-device-labels {
                position:absolute;
                left:1rem; right:1rem; bottom:1rem;
                display:grid;
                grid-template-columns:repeat(3, minmax(0, 1fr));
                gap:0.7rem;
                z-index:3;
            }
            .oy3-device-label {
                padding:0.85rem;
                border:1px solid rgba(255,255,255,0.08);
                border-radius:0.9rem;
                background:rgba(0,0,0,0.55);
                backdrop-filter:blur(14px);
            }
            .oy3-device-label b {
                display:block;
                color:var(--label-color, var(--oy3-gold));
                font-size:0.64rem;
                letter-spacing:0.14em;
                text-transform:uppercase;
                margin-bottom:0.35rem;
            }
            .oy3-device-label span {
                display:block;
                color:rgba(229,231,235,0.82);
                font-size:0.78rem;
                line-height:1.4;
            }

            .oy3-reveal {
                opacity: 0;
                transform: translateY(28px);
                filter: blur(8px);
                transition: opacity 750ms cubic-bezier(.2,.8,.2,1), transform 750ms cubic-bezier(.2,.8,.2,1), filter 750ms cubic-bezier(.2,.8,.2,1);
            }
            .oy3-reveal.is-visible {
                opacity: 1;
                transform: translateY(0);
                filter: blur(0);
            }

            @media (max-width: 979px) {
                .oy3-section { margin-top: 5rem; margin-bottom: 6rem; }
                .oy3-system-board, .oy3-device-board { min-height: 520px; }
            }
            @media (max-width: 640px) {
                .oy3-section { margin-top: 4.5rem; margin-bottom: 5.5rem; }
                .oy3-title { font-size: clamp(2rem, 10vw, 3.1rem); line-height: 1.02; }
                .oy3-services-grid, .oy3-portfolio-shell { padding: 0.85rem; }
                .oy3-service-card { grid-template-columns: 1fr; min-height: auto; }
                .oy3-system-board, .oy3-device-board { min-height: 560px; }
                .oy3-board-layout { grid-template-columns: 1fr; }
                .oy3-device-labels { grid-template-columns: 1fr; }
                .oy3-tablet { left: 2%; top: 48%; width: 31%; }
                .oy3-phone { right: 4%; top: 50%; width: 25%; }
                .oy3-desktop { left: 9%; top: 18%; width: 80%; }
            }
            @media (prefers-reduced-motion: reduce) {
                *, *::before, *::after { animation-duration: 0.001ms !important; animation-iteration-count: 1 !important; scroll-behavior: auto !important; }
                .oy3-reveal { opacity: 1; transform: none; filter: none; }
            }
        `;
        document.head.appendChild(style);
    }

    function servicesHTML() {
        return `
            <div class="oy3-services-head oy3-reveal">
                <span class="oy3-kicker">What I Do</span>
                <h2 class="oy3-title">Complete Digital <span>Systems</span></h2>
                <p class="oy3-copy">A clear service system for small businesses: strategy, interface, engineering and launch support. Each layer is readable, intentional and connected.</p>
            </div>
            <div class="oy3-shell oy3-services-grid">
                <div class="oy3-service-list">
                    <article class="oy3-service-card" data-service-card="0" style="--card-color:#FFD700;--card-border:rgba(255,215,0,.34);--card-glow:rgba(255,215,0,.15);">
                        <span class="oy3-service-num">01</span><div><h3>Strategy & Structure</h3><p>Sitemap, conversion path and content hierarchy before visual design begins.</p></div>
                    </article>
                    <article class="oy3-service-card" data-service-card="1" style="--card-color:#A855F7;--card-border:rgba(168,85,247,.34);--card-glow:rgba(168,85,247,.15);">
                        <span class="oy3-service-num">02</span><div><h3>UI/UX Design System</h3><p>Premium layouts, reusable components and mobile-first interaction states.</p></div>
                    </article>
                    <article class="oy3-service-card" data-service-card="2" style="--card-color:#38BDF8;--card-border:rgba(56,189,248,.34);--card-glow:rgba(56,189,248,.15);">
                        <span class="oy3-service-num">03</span><div><h3>Frontend Engineering</h3><p>Clean responsive implementation, performance discipline and scalable code.</p></div>
                    </article>
                    <article class="oy3-service-card" data-service-card="3" style="--card-color:#22C55E;--card-border:rgba(34,197,94,.34);--card-glow:rgba(34,197,94,.15);">
                        <span class="oy3-service-num">04</span><div><h3>SEO & Optimization</h3><p>Technical SEO, analytics setup and post-launch performance refinement.</p></div>
                    </article>
                </div>
                <div class="oy3-system-board oy3-reveal">
                    <div class="oy3-board-topbar"><span>Design Build System</span><span class="oy3-board-status">Live Structure</span></div>
                    <div class="oy3-board-layout">
                        <div class="oy3-board-card" style="--board-color:#FFD700"><strong>Strategy</strong><span>Clear pages, user flow, offer positioning and project priorities.</span></div>
                        <div class="oy3-board-card" style="--board-color:#A855F7"><strong>Interface</strong><span>Visual language, spacing, typography and component states.</span></div>
                        <div class="oy3-board-card oy3-board-center"><div><b>Website System</b><small>Designed to convert, built to last</small></div></div>
                        <div class="oy3-board-card" style="--board-color:#38BDF8"><strong>Code</strong><span>Responsive frontend, clean sections and maintainable structure.</span></div>
                        <div class="oy3-board-card" style="--board-color:#22C55E"><strong>Launch</strong><span>Performance, SEO checks, analytics and live-site support.</span></div>
                    </div>
                </div>
            </div>
        `;
    }

    function portfolioHTML() {
        return `
            <div class="oy3-shell oy3-portfolio-shell">
                <div class="oy3-portfolio-copy oy3-reveal">
                    <span class="oy3-kicker">Portfolio Focus</span>
                    <h2 class="oy3-title">Responsive <span>Build Preview</span></h2>
                    <p class="oy3-copy">A clearer device presentation: desktop, tablet and mobile are shown as a controlled build system instead of a crowded abstract image.</p>
                    <div class="oy3-spec-grid">
                        <div class="oy3-spec"><b>Desktop</b><span>Large-screen hierarchy and premium spacing.</span></div>
                        <div class="oy3-spec"><b>Tablet</b><span>Balanced layouts for medium screens.</span></div>
                        <div class="oy3-spec"><b>Mobile</b><span>Touch-first order, readable CTAs.</span></div>
                        <div class="oy3-spec"><b>Motion</b><span>Subtle scroll-linked depth, not visual noise.</span></div>
                    </div>
                    <a class="oy3-cta" href="projects.html">View Recent Projects</a>
                </div>
                <div class="oy3-device-board oy3-reveal">
                    <div class="oy3-device-scene">
                        <div class="oy3-device oy3-desktop"><div class="oy3-lines"><i></i><i></i><i></i><i></i></div></div>
                        <div class="oy3-device oy3-tablet"><div class="oy3-lines"><i></i><i></i><i></i></div></div>
                        <div class="oy3-device oy3-phone"><div class="oy3-lines"><i></i><i></i><i></i></div></div>
                    </div>
                    <div class="oy3-device-labels">
                        <div class="oy3-device-label" style="--label-color:#FFD700"><b>Desktop</b><span>Immersive layout without wasting space.</span></div>
                        <div class="oy3-device-label" style="--label-color:#A855F7"><b>Tablet</b><span>Consistent structure across breakpoints.</span></div>
                        <div class="oy3-device-label" style="--label-color:#22C55E"><b>Mobile</b><span>Clean order, spacing and call-to-action flow.</span></div>
                    </div>
                </div>
            </div>
        `;
    }

    function buildHud() {
        if (document.querySelector('.oy3-hud')) return;
        const hud = document.createElement('div');
        hud.className = 'oy3-hud';
        hud.innerHTML = '<div class="oy3-hud__label">Scroll System</div><div class="oy3-hud__rail"><div class="oy3-hud__progress"></div></div>';
        document.body.appendChild(hud);
    }

    function replaceSections() {
        const expertise = document.getElementById('expertise');
        if (expertise) {
            expertise.className = 'oy3-section';
            expertise.innerHTML = servicesHTML();
        }

        const portfolio = document.getElementById('portfolio');
        if (portfolio) {
            portfolio.className = 'oy3-section';
            portfolio.innerHTML = portfolioHTML();
        }
    }

    function setActiveService(index) {
        document.querySelectorAll('[data-service-card]').forEach((card, cardIndex) => {
            card.classList.toggle('is-active', cardIndex === index);
        });
    }

    function fallbackReveal() {
        const items = document.querySelectorAll('.oy3-reveal, .oy3-service-card, .oy3-spec, .oy3-board-card, .oy3-device');
        items.forEach((item) => item.classList.add('oy3-reveal'));

        if (!('IntersectionObserver' in window)) {
            items.forEach((item) => item.classList.add('is-visible'));
            return;
        }

        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) entry.target.classList.add('is-visible');
            });
        }, { threshold: 0.16, rootMargin: '0px 0px -8% 0px' });

        items.forEach((item) => observer.observe(item));
    }

    function initGSAPMotion() {
        const gsap = window.gsap;
        const ScrollTrigger = window.ScrollTrigger;
        if (!gsap || !ScrollTrigger || prefersReducedMotion) {
            fallbackReveal();
            setActiveService(0);
            return;
        }

        gsap.set('.oy3-reveal, .oy3-service-card, .oy3-spec, .oy3-board-card, .oy3-device', {
            autoAlpha: 1,
            y: 0,
            filter: 'none'
        });

        gsap.from('.oy3-services-head > *', {
            y: 34,
            autoAlpha: 0,
            filter: 'blur(8px)',
            duration: 0.9,
            stagger: 0.1,
            ease: 'power3.out',
            scrollTrigger: { trigger: '#expertise', start: 'top 76%' }
        });

        gsap.from('.oy3-service-card', {
            x: -36,
            autoAlpha: 0,
            filter: 'blur(8px)',
            duration: 0.85,
            stagger: 0.1,
            ease: 'power3.out',
            scrollTrigger: { trigger: '.oy3-services-grid', start: 'top 72%' }
        });

        gsap.from('.oy3-system-board', {
            x: 42,
            autoAlpha: 0,
            filter: 'blur(8px)',
            duration: 0.95,
            ease: 'power3.out',
            scrollTrigger: { trigger: '.oy3-services-grid', start: 'top 72%' }
        });

        gsap.from('.oy3-board-card', {
            y: 24,
            autoAlpha: 0,
            duration: 0.7,
            stagger: 0.08,
            ease: 'power3.out',
            scrollTrigger: { trigger: '.oy3-system-board', start: 'top 70%' }
        });

        document.querySelectorAll('[data-service-card]').forEach((card, index) => {
            ScrollTrigger.create({
                trigger: card,
                start: 'top 62%',
                end: 'bottom 42%',
                onEnter: () => setActiveService(index),
                onEnterBack: () => setActiveService(index)
            });
        });

        gsap.to('.oy3-system-board', {
            y: -18,
            ease: 'none',
            scrollTrigger: { trigger: '#expertise', start: 'top bottom', end: 'bottom top', scrub: true }
        });

        gsap.from('.oy3-portfolio-copy > *', {
            y: 32,
            autoAlpha: 0,
            filter: 'blur(8px)',
            duration: 0.85,
            stagger: 0.08,
            ease: 'power3.out',
            scrollTrigger: { trigger: '#portfolio', start: 'top 76%' }
        });

        gsap.from('.oy3-device-board', {
            x: 44,
            autoAlpha: 0,
            filter: 'blur(8px)',
            duration: 0.95,
            ease: 'power3.out',
            scrollTrigger: { trigger: '#portfolio', start: 'top 74%' }
        });

        gsap.from('.oy3-device', {
            y: 34,
            autoAlpha: 0,
            rotateY: 0,
            duration: 0.9,
            stagger: 0.12,
            ease: 'power3.out',
            scrollTrigger: { trigger: '.oy3-device-board', start: 'top 68%' }
        });

        gsap.to('.oy3-desktop', {
            rotateY: 7,
            y: -16,
            ease: 'none',
            scrollTrigger: { trigger: '#portfolio', start: 'top bottom', end: 'bottom top', scrub: true }
        });
        gsap.to('.oy3-tablet', {
            x: 18,
            y: -10,
            ease: 'none',
            scrollTrigger: { trigger: '#portfolio', start: 'top bottom', end: 'bottom top', scrub: true }
        });
        gsap.to('.oy3-phone', {
            x: -14,
            y: -12,
            ease: 'none',
            scrollTrigger: { trigger: '#portfolio', start: 'top bottom', end: 'bottom top', scrub: true }
        });

        setActiveService(0);
        ScrollTrigger.refresh();
    }

    function bindScrollState() {
        const update = () => {
            const scrollTop = window.scrollY || document.documentElement.scrollTop || 0;
            const height = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
            const progress = Math.min(1, Math.max(0, scrollTop / height));
            document.documentElement.style.setProperty('--oy3-progress', progress.toFixed(4));
            document.body.classList.toggle('oy3-motion-on', scrollTop > 28);
        };
        update();
        window.addEventListener('scroll', update, { passive: true });
        window.addEventListener('resize', update, { passive: true });
    }

    function bindPointerGlow() {
        if (prefersReducedMotion) return;
        window.addEventListener('pointermove', (event) => {
            document.documentElement.style.setProperty('--oy3-cursor-x', `${Math.round((event.clientX / window.innerWidth) * 100)}%`);
            document.documentElement.style.setProperty('--oy3-cursor-y', `${Math.round((event.clientY / window.innerHeight) * 100)}%`);
        }, { passive: true });
    }

    onReady(async () => {
        injectStyles();
        buildHud();
        replaceSections();
        bindScrollState();
        bindPointerGlow();

        const hasMotionStack = await loadMotionStack();
        if (hasMotionStack) initGSAPMotion();
        else fallbackReveal();

        if (window.lucide && typeof window.lucide.createIcons === 'function') {
            window.lucide.createIcons();
        }
    });
})();
