/*
 * Oakley-style scroll experience layer for omeryigitler.com
 * v2 replaces the current main-branch service cards and device mockup with
 * a proper scrollytelling system: GSAP + ScrollTrigger when available,
 * IntersectionObserver fallback when scripts cannot load.
 */
(function () {
    const VERSION = 'oakley-scroll-experience-v2';

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
            if (!window.gsap) {
                await loadScript('https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/gsap.min.js');
            }
            if (!window.ScrollTrigger) {
                await loadScript('https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/ScrollTrigger.min.js');
            }
            if (window.gsap && window.ScrollTrigger) {
                window.gsap.registerPlugin(window.ScrollTrigger);
                return true;
            }
        } catch (error) {
            console.warn('[Oakley Scroll] GSAP unavailable, using fallback.', error);
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
                --oys-gold: #FFD700;
                --oys-obsidian: #050505;
                --oys-ink: #090909;
                --oys-text: rgba(255,255,255,0.92);
                --oys-muted: rgba(156,163,175,0.92);
                --oys-border: rgba(255,255,255,0.09);
                --oys-gold-border: rgba(255,215,0,0.26);
                --oys-gold-soft: rgba(255,215,0,0.12);
                --oys-blue: #38BDF8;
                --oys-green: #22C55E;
                --oys-violet: #A855F7;
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
                    radial-gradient(circle at var(--oys-cursor-x, 50%) var(--oys-cursor-y, 32%), rgba(255,215,0,0.09), transparent 24rem),
                    radial-gradient(circle at 72% 24%, rgba(56,189,248,0.075), transparent 26rem),
                    radial-gradient(circle at 24% 62%, rgba(168,85,247,0.07), transparent 24rem);
                transition: opacity 600ms ease;
            }

            body.oys-motion-engaged::before { opacity: 1; }

            .oys-hud {
                position: fixed;
                right: clamp(1rem, 3vw, 2rem);
                top: 50%;
                z-index: 45;
                display: none;
                transform: translateY(-50%);
                pointer-events: none;
            }

            .oys-hud__label {
                position: absolute;
                right: 1.05rem;
                top: -0.2rem;
                width: 9rem;
                color: rgba(255,215,0,0.72);
                font-family: 'Syncopate', sans-serif;
                font-size: 0.52rem;
                font-weight: 700;
                letter-spacing: 0.24em;
                text-align: right;
                text-transform: uppercase;
            }

            .oys-hud__rail {
                width: 1px;
                height: 230px;
                background: rgba(255,255,255,0.08);
                border-radius: 999px;
                overflow: hidden;
            }

            .oys-hud__progress {
                width: 100%;
                height: calc(var(--oys-progress, 0) * 100%);
                background: linear-gradient(to bottom, transparent, var(--oys-gold), transparent);
                box-shadow: 0 0 22px rgba(255,215,0,0.62);
            }

            @media (min-width: 1024px) { .oys-hud { display: block; } }

            .oys-stage {
                position: relative;
                isolation: isolate;
                transform-style: preserve-3d;
            }

            .oys-stage::before,
            .oys-stage::after {
                content: "";
                position: absolute;
                inset: auto;
                z-index: -1;
                pointer-events: none;
                border-radius: 999px;
                filter: blur(72px);
                opacity: 0.9;
            }

            .oys-stage::before {
                top: 6%;
                left: 50%;
                width: min(62vw, 620px);
                height: min(62vw, 620px);
                background: radial-gradient(circle, rgba(255,215,0,0.10), transparent 66%);
                transform: translateX(-50%);
            }

            .oys-stage::after {
                right: 4%;
                bottom: 7%;
                width: min(48vw, 520px);
                height: min(48vw, 520px);
                background: radial-gradient(circle, rgba(56,189,248,0.09), transparent 68%);
            }

            .oys-eyebrow {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                gap: 0.55rem;
                padding: 0.44rem 0.9rem;
                border: 1px solid rgba(255,215,0,0.24);
                border-radius: 999px;
                background: rgba(255,215,0,0.08);
                color: var(--oys-gold);
                font-family: 'Syncopate', sans-serif;
                font-size: 0.56rem;
                font-weight: 700;
                letter-spacing: 0.18em;
                text-transform: uppercase;
            }

            .oys-eyebrow::before {
                content: "";
                width: 0.4rem;
                height: 0.4rem;
                border-radius: 999px;
                background: var(--oys-gold);
                box-shadow: 0 0 18px rgba(255,215,0,0.72);
            }

            .oys-section-title {
                margin: 1.15rem auto 0;
                max-width: 920px;
                color: white;
                font-family: 'Syncopate', sans-serif;
                font-size: clamp(2.2rem, 6vw, 5.8rem);
                font-weight: 700;
                line-height: 0.92;
                letter-spacing: -0.055em;
                text-transform: uppercase;
            }

            .oys-section-title span {
                display: block;
                color: transparent;
                background: linear-gradient(180deg, #ffffff, #6b7280);
                -webkit-background-clip: text;
                background-clip: text;
            }

            .oys-section-copy {
                max-width: 720px;
                margin: 1.35rem auto 0;
                color: var(--oys-muted);
                font-size: clamp(0.86rem, 1.4vw, 1.02rem);
                line-height: 1.85;
            }

            .oys-services-stage {
                width: 100%;
                max-width: 1180px;
                margin-top: clamp(6rem, 10vw, 10rem);
                margin-bottom: clamp(8rem, 12vw, 12rem);
                scroll-margin-top: 8rem;
            }

            .oys-services-intro {
                text-align: center;
                margin-bottom: clamp(3rem, 7vw, 5rem);
            }

            .oys-services-pin {
                position: relative;
                display: grid;
                grid-template-columns: 1fr;
                gap: clamp(1.2rem, 3vw, 2rem);
                min-height: 720px;
                padding: clamp(1rem, 2.5vw, 1.4rem);
                border: 1px solid rgba(255,255,255,0.08);
                border-radius: 2.4rem;
                background:
                    linear-gradient(145deg, rgba(255,255,255,0.045), rgba(255,255,255,0.012)),
                    radial-gradient(circle at 20% 10%, rgba(255,215,0,0.10), transparent 24rem),
                    radial-gradient(circle at 78% 18%, rgba(56,189,248,0.09), transparent 24rem),
                    rgba(5,5,5,0.58);
                box-shadow:
                    0 60px 150px -90px rgba(0,0,0,1),
                    inset 0 1px 0 rgba(255,255,255,0.06);
                backdrop-filter: blur(24px);
                overflow: hidden;
            }

            @media (min-width: 980px) {
                .oys-services-pin {
                    grid-template-columns: minmax(280px, 0.88fr) minmax(520px, 1.32fr);
                    align-items: stretch;
                    min-height: 690px;
                }
            }

            .oys-services-pin::before {
                content: "";
                position: absolute;
                inset: 0;
                background-image:
                    linear-gradient(rgba(255,215,0,0.035) 1px, transparent 1px),
                    linear-gradient(90deg, rgba(255,215,0,0.028) 1px, transparent 1px);
                background-size: 44px 44px;
                mask-image: radial-gradient(circle at center, black, transparent 72%);
                opacity: 0.42;
                pointer-events: none;
            }

            .oys-services-copy,
            .oys-services-visual {
                position: relative;
                z-index: 2;
            }

            .oys-services-copy {
                display: flex;
                flex-direction: column;
                gap: 0.9rem;
                padding: clamp(0.2rem, 1vw, 0.6rem);
            }

            .oys-service-card {
                position: relative;
                min-height: 128px;
                padding: 1.15rem;
                border: 1px solid rgba(255,255,255,0.08);
                border-radius: 1.35rem;
                background: rgba(255,255,255,0.032);
                color: white;
                overflow: hidden;
                transition: border-color 350ms ease, background 350ms ease, transform 350ms ease, opacity 350ms ease;
            }

            .oys-service-card::before {
                content: "";
                position: absolute;
                inset: 0;
                opacity: 0;
                background: radial-gradient(circle at 0% 0%, var(--card-glow, rgba(255,215,0,0.16)), transparent 58%);
                transition: opacity 350ms ease;
            }

            .oys-service-card.is-active {
                border-color: var(--card-border, rgba(255,215,0,0.32));
                background: rgba(255,255,255,0.055);
                transform: translateX(0.45rem);
            }

            .oys-service-card.is-active::before { opacity: 1; }

            .oys-service-card__meta {
                position: relative;
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 1rem;
                margin-bottom: 0.9rem;
                z-index: 1;
            }

            .oys-service-card__num {
                color: var(--card-color, var(--oys-gold));
                font-family: 'Syncopate', sans-serif;
                font-size: 0.68rem;
                font-weight: 700;
                letter-spacing: 0.22em;
            }

            .oys-service-card__label {
                color: rgba(255,255,255,0.42);
                font-size: 0.62rem;
                font-weight: 800;
                letter-spacing: 0.16em;
                text-transform: uppercase;
            }

            .oys-service-card h3 {
                position: relative;
                margin: 0 0 0.6rem;
                z-index: 1;
                font-family: 'Syncopate', sans-serif;
                font-size: clamp(1rem, 1.7vw, 1.34rem);
                line-height: 1.08;
                letter-spacing: -0.03em;
                text-transform: uppercase;
            }

            .oys-service-card p {
                position: relative;
                z-index: 1;
                margin: 0;
                color: rgba(156,163,175,0.95);
                font-size: 0.82rem;
                line-height: 1.65;
            }

            .oys-services-visual {
                min-height: 540px;
                border: 1px solid rgba(255,255,255,0.08);
                border-radius: 1.8rem;
                background:
                    radial-gradient(circle at 50% 20%, rgba(255,255,255,0.055), transparent 18rem),
                    rgba(0,0,0,0.24);
                overflow: hidden;
            }

            .oys-service-orbit {
                position: absolute;
                inset: 5%;
                border-radius: 1.5rem;
                border: 1px solid rgba(255,255,255,0.07);
                transform-style: preserve-3d;
            }

            .oys-service-core {
                position: absolute;
                left: 50%;
                top: 50%;
                width: min(72%, 560px);
                aspect-ratio: 1.38;
                transform: translate(-50%, -50%) rotateX(56deg) rotateZ(-16deg);
                transform-style: preserve-3d;
                border: 1px solid rgba(255,255,255,0.12);
                border-radius: 1.2rem;
                background:
                    linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.018)),
                    rgba(0,0,0,0.42);
                box-shadow:
                    0 28px 70px rgba(0,0,0,0.6),
                    0 0 60px rgba(255,215,0,0.06);
            }

            .oys-service-core::before,
            .oys-service-core::after {
                content: "";
                position: absolute;
                inset: 13%;
                border: 1px solid rgba(255,255,255,0.12);
                border-radius: 0.9rem;
            }

            .oys-service-core::after {
                inset: 28%;
                border-color: rgba(255,215,0,0.20);
                box-shadow: 0 0 30px rgba(255,215,0,0.08) inset;
            }

            .oys-service-node {
                position: absolute;
                width: min(44vw, 220px);
                padding: 0.95rem;
                border: 1px solid var(--node-border, rgba(255,215,0,0.25));
                border-radius: 1.05rem;
                background: rgba(0,0,0,0.74);
                backdrop-filter: blur(18px);
                box-shadow: 0 24px 70px -42px var(--node-shadow, rgba(255,215,0,0.9));
            }

            .oys-service-node b {
                display: flex;
                align-items: center;
                gap: 0.45rem;
                color: var(--node-color, var(--oys-gold));
                font-size: 0.67rem;
                letter-spacing: 0.14em;
                text-transform: uppercase;
            }

            .oys-service-node b::before {
                content: "";
                width: 0.48rem;
                height: 0.48rem;
                border-radius: 999px;
                background: var(--node-color, var(--oys-gold));
                box-shadow: 0 0 16px currentColor;
            }

            .oys-service-node span {
                display: block;
                margin-top: 0.5rem;
                color: rgba(209,213,219,0.84);
                font-size: 0.78rem;
                line-height: 1.45;
            }

            .oys-node-a { left: 7%; top: 12%; --node-color: var(--oys-violet); --node-border: rgba(168,85,247,0.36); --node-shadow: rgba(168,85,247,0.9); transform: rotate(-6deg); }
            .oys-node-b { right: 5%; top: 18%; --node-color: var(--oys-gold); --node-border: rgba(255,215,0,0.34); --node-shadow: rgba(255,215,0,0.9); transform: rotate(0deg); }
            .oys-node-c { right: 15%; bottom: 12%; --node-color: var(--oys-green); --node-border: rgba(34,197,94,0.34); --node-shadow: rgba(34,197,94,0.8); transform: rotate(7deg); }
            .oys-node-d { left: 13%; bottom: 17%; --node-color: var(--oys-blue); --node-border: rgba(56,189,248,0.34); --node-shadow: rgba(56,189,248,0.8); transform: rotate(4deg); }

            .oys-service-readout {
                position: absolute;
                left: clamp(1rem, 3vw, 2rem);
                bottom: clamp(1rem, 3vw, 2rem);
                display: grid;
                grid-template-columns: repeat(3, minmax(0, 1fr));
                width: min(78%, 520px);
                border: 1px solid rgba(255,255,255,0.08);
                border-radius: 1rem;
                overflow: hidden;
                background: rgba(0,0,0,0.46);
            }

            .oys-service-readout div {
                padding: 0.8rem;
                border-right: 1px solid rgba(255,255,255,0.07);
            }

            .oys-service-readout div:last-child { border-right: 0; }
            .oys-service-readout b { display:block; color: white; font-size: 0.72rem; margin-bottom: 0.2rem; }
            .oys-service-readout span { color: rgba(156,163,175,0.85); font-size: 0.62rem; letter-spacing: 0.12em; text-transform: uppercase; }

            .oys-portfolio-stage {
                width: 100%;
                max-width: 1180px;
                margin-top: clamp(6rem, 12vw, 10rem);
                margin-bottom: clamp(8rem, 12vw, 12rem);
                scroll-margin-top: 8rem;
            }

            .oys-portfolio-shell {
                display: grid;
                grid-template-columns: 1fr;
                gap: clamp(1.4rem, 3vw, 2.2rem);
                min-height: 760px;
                padding: clamp(1rem, 2.5vw, 1.5rem);
                border: 1px solid rgba(255,255,255,0.08);
                border-radius: 2.4rem;
                background:
                    radial-gradient(circle at 70% 18%, rgba(56,189,248,0.10), transparent 23rem),
                    radial-gradient(circle at 22% 76%, rgba(255,215,0,0.10), transparent 22rem),
                    rgba(5,5,5,0.60);
                box-shadow: 0 60px 150px -90px rgba(0,0,0,1), inset 0 1px 0 rgba(255,255,255,0.06);
                backdrop-filter: blur(24px);
                overflow: hidden;
            }

            @media (min-width: 980px) {
                .oys-portfolio-shell {
                    grid-template-columns: minmax(320px, 0.85fr) minmax(560px, 1.25fr);
                    align-items: center;
                }
            }

            .oys-portfolio-copy {
                position: relative;
                z-index: 2;
                padding: clamp(1rem, 3vw, 2rem);
            }

            .oys-portfolio-copy h2 {
                margin: 1.1rem 0 1rem;
                color: white;
                font-family: 'Syncopate', sans-serif;
                font-size: clamp(2rem, 4.8vw, 4.4rem);
                line-height: 0.94;
                letter-spacing: -0.055em;
                text-transform: uppercase;
            }

            .oys-portfolio-copy h2 span {
                display:block;
                color: transparent;
                background: linear-gradient(180deg, #ffffff, #6b7280);
                -webkit-background-clip: text;
                background-clip: text;
            }

            .oys-portfolio-copy p {
                color: var(--oys-muted);
                font-size: 0.95rem;
                line-height: 1.85;
                max-width: 520px;
            }

            .oys-portfolio-specs {
                display: grid;
                grid-template-columns: repeat(2, minmax(0, 1fr));
                gap: 0.75rem;
                margin-top: 1.5rem;
            }

            .oys-portfolio-specs div {
                padding: 0.85rem;
                border: 1px solid rgba(255,255,255,0.08);
                border-radius: 1rem;
                background: rgba(255,255,255,0.026);
            }

            .oys-portfolio-specs b {
                display:block;
                color: var(--oys-gold);
                font-family: 'Syncopate', sans-serif;
                font-size: 0.62rem;
                letter-spacing: 0.16em;
                margin-bottom: 0.4rem;
            }

            .oys-portfolio-specs span {
                color: rgba(255,255,255,0.72);
                font-size: 0.78rem;
                line-height: 1.45;
            }

            .oys-device-lab {
                position: relative;
                z-index: 2;
                min-height: 580px;
                perspective: 1200px;
                transform-style: preserve-3d;
            }

            .oys-lab-grid {
                position: absolute;
                inset: 4%;
                border: 1px solid rgba(255,255,255,0.07);
                border-radius: 1.7rem;
                background-image:
                    linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px),
                    linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px);
                background-size: 40px 40px;
                mask-image: radial-gradient(circle, black, transparent 76%);
                transform: rotateX(62deg) rotateZ(-12deg) translateZ(-80px);
            }

            .oys-device {
                position: absolute;
                border: 1px solid rgba(255,255,255,0.14);
                background: linear-gradient(145deg, rgba(255,255,255,0.09), rgba(255,255,255,0.018));
                box-shadow: 0 34px 90px -50px rgba(0,0,0,1), inset 0 1px 0 rgba(255,255,255,0.08);
                transform-style: preserve-3d;
            }

            .oys-device::before {
                content: "";
                position: absolute;
                inset: 0.45rem;
                border-radius: inherit;
                background:
                    radial-gradient(circle at 20% 20%, rgba(255,215,0,0.16), transparent 28%),
                    linear-gradient(135deg, rgba(255,255,255,0.08), transparent),
                    rgba(0,0,0,0.72);
            }

            .oys-device::after {
                content: "";
                position: absolute;
                left: 12%;
                right: 12%;
                bottom: -0.7rem;
                height: 0.55rem;
                border-radius: 0 0 1rem 1rem;
                background: rgba(255,255,255,0.10);
                border: 1px solid rgba(255,255,255,0.08);
            }

            .oys-device--desktop {
                left: 19%;
                top: 24%;
                width: min(62%, 470px);
                aspect-ratio: 1.62;
                border-radius: 1.15rem;
                transform: rotateX(10deg) rotateY(-16deg) rotateZ(-1deg);
            }

            .oys-device--tablet {
                left: 6%;
                top: 38%;
                width: min(24%, 160px);
                aspect-ratio: 0.68;
                border-radius: 1.2rem;
                transform: rotateZ(-7deg) rotateY(22deg) translateZ(90px);
            }

            .oys-device--phone {
                right: 10%;
                bottom: 15%;
                width: min(18%, 120px);
                aspect-ratio: 0.52;
                border-radius: 1.4rem;
                transform: rotateZ(9deg) rotateY(-24deg) translateZ(130px);
            }

            .oys-screen-lines {
                position: absolute;
                inset: 15% 12%;
                z-index: 2;
                display: grid;
                gap: 0.45rem;
                opacity: 0.72;
            }

            .oys-screen-lines i {
                display: block;
                height: 0.46rem;
                border-radius: 999px;
                background: rgba(255,255,255,0.10);
            }

            .oys-screen-lines i:nth-child(1) { width: 42%; background: rgba(255,215,0,0.40); }
            .oys-screen-lines i:nth-child(2) { width: 76%; }
            .oys-screen-lines i:nth-child(3) { width: 62%; }
            .oys-screen-lines i:nth-child(4) { width: 88%; background: rgba(56,189,248,0.20); }

            .oys-lab-callout {
                position: absolute;
                z-index: 5;
                width: min(42vw, 220px);
                padding: 0.88rem;
                border-radius: 1rem;
                border: 1px solid var(--callout-border, rgba(255,215,0,0.30));
                background: rgba(0,0,0,0.76);
                backdrop-filter: blur(18px);
                box-shadow: 0 26px 74px -46px var(--callout-shadow, rgba(255,215,0,0.9));
            }

            .oys-lab-callout b {
                display: block;
                color: var(--callout-color, var(--oys-gold));
                font-size: 0.66rem;
                letter-spacing: 0.16em;
                text-transform: uppercase;
                margin-bottom: 0.45rem;
            }

            .oys-lab-callout span {
                display:block;
                color: rgba(209,213,219,0.86);
                font-size: 0.78rem;
                line-height: 1.45;
            }

            .oys-callout-a { left: 4%; top: 9%; --callout-color: var(--oys-violet); --callout-border: rgba(168,85,247,0.38); --callout-shadow: rgba(168,85,247,0.88); transform: rotate(-5deg); }
            .oys-callout-b { right: 1%; top: 14%; --callout-color: var(--oys-gold); --callout-border: rgba(255,215,0,0.36); --callout-shadow: rgba(255,215,0,0.9); }
            .oys-callout-c { right: 8%; bottom: 5%; --callout-color: var(--oys-green); --callout-border: rgba(34,197,94,0.36); --callout-shadow: rgba(34,197,94,0.82); transform: rotate(6deg); }

            .oys-orbit-ring {
                position: absolute;
                left: 50%;
                top: 50%;
                width: min(78%, 580px);
                aspect-ratio: 1;
                border-radius: 999px;
                border: 1px solid rgba(255,215,0,0.12);
                transform: translate(-50%, -50%) rotateX(68deg) rotateZ(-16deg);
                pointer-events: none;
            }

            .oys-orbit-ring::before {
                content: "";
                position: absolute;
                left: 50%;
                top: -0.35rem;
                width: 0.7rem;
                height: 0.7rem;
                border-radius: 999px;
                background: var(--oys-gold);
                box-shadow: 0 0 22px rgba(255,215,0,0.8);
            }

            .oys-cta-link {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                gap: 0.65rem;
                margin-top: 1.6rem;
                padding: 0.9rem 1.25rem;
                border: 1px solid rgba(255,215,0,0.34);
                border-radius: 999px;
                color: #050505;
                background: var(--oys-gold);
                font-size: 0.72rem;
                font-weight: 900;
                letter-spacing: 0.14em;
                text-transform: uppercase;
                box-shadow: 0 0 28px rgba(255,215,0,0.18);
                transition: transform 250ms ease, background 250ms ease, color 250ms ease;
            }

            .oys-cta-link:hover {
                transform: translateY(-2px);
                background: #ffffff;
                color: #050505;
            }

            .oys-fallback-reveal {
                opacity: 0;
                transform: translateY(32px);
                filter: blur(8px);
                transition: opacity 800ms cubic-bezier(.2,.8,.2,1), transform 800ms cubic-bezier(.2,.8,.2,1), filter 800ms cubic-bezier(.2,.8,.2,1);
            }

            .oys-fallback-reveal.is-visible {
                opacity: 1;
                transform: translateY(0);
                filter: blur(0);
            }

            @media (max-width: 979px) {
                .oys-services-pin,
                .oys-portfolio-shell { min-height: auto; }
                .oys-services-visual { min-height: 520px; }
                .oys-device-lab { min-height: 520px; }
                .oys-service-readout { width: calc(100% - 2rem); grid-template-columns: 1fr; }
                .oys-service-readout div { border-right: 0; border-bottom: 1px solid rgba(255,255,255,0.07); }
                .oys-service-readout div:last-child { border-bottom: 0; }
            }

            @media (max-width: 640px) {
                .oys-section-title { font-size: clamp(2rem, 13vw, 3.6rem); }
                .oys-services-stage, .oys-portfolio-stage { margin-top: 5rem; margin-bottom: 7rem; }
                .oys-service-node, .oys-lab-callout { width: min(74vw, 220px); }
                .oys-node-b { right: 3%; top: 7%; }
                .oys-node-a { left: 3%; top: 22%; }
                .oys-node-c { right: 3%; bottom: 18%; }
                .oys-node-d { left: 5%; bottom: 8%; }
                .oys-device--desktop { left: 8%; top: 28%; width: 78%; }
                .oys-device--tablet { left: 2%; top: 51%; width: 30%; }
                .oys-device--phone { right: 5%; bottom: 18%; width: 24%; }
                .oys-callout-a { left: 1%; top: 4%; }
                .oys-callout-b { right: 1%; top: 28%; }
                .oys-callout-c { right: 3%; bottom: 3%; }
            }

            @media (prefers-reduced-motion: reduce) {
                *, *::before, *::after {
                    animation-duration: 0.001ms !important;
                    animation-iteration-count: 1 !important;
                    scroll-behavior: auto !important;
                }
            }
        `;
        document.head.appendChild(style);
    }

    function buildHud() {
        if (document.querySelector('.oys-hud')) return;
        const hud = document.createElement('div');
        hud.className = 'oys-hud';
        hud.innerHTML = `
            <div class="oys-hud__label">Scroll System</div>
            <div class="oys-hud__rail"><div class="oys-hud__progress"></div></div>
        `;
        document.body.appendChild(hud);
    }

    function serviceSectionHTML() {
        return `
            <div class="oys-services-intro oys-fallback-reveal">
                <span class="oys-eyebrow">What I Do</span>
                <h2 class="oys-section-title">Complete Digital <span>Systems</span></h2>
                <p class="oys-section-copy">
                    Not three static cards anymore. This section now behaves like a premium product story:
                    strategy, interface, engineering and launch layers form as you scroll.
                </p>
            </div>

            <div class="oys-services-pin">
                <div class="oys-services-copy">
                    <article class="oys-service-card" data-service-card="0" style="--card-color:#FFD700; --card-border:rgba(255,215,0,.34); --card-glow:rgba(255,215,0,.16);">
                        <div class="oys-service-card__meta"><span class="oys-service-card__num">01</span><span class="oys-service-card__label">Foundation</span></div>
                        <h3>Strategy & Structure</h3>
                        <p>Clear sitemap, conversion path and content hierarchy before visual design begins.</p>
                    </article>
                    <article class="oys-service-card" data-service-card="1" style="--card-color:#A855F7; --card-border:rgba(168,85,247,.34); --card-glow:rgba(168,85,247,.16);">
                        <div class="oys-service-card__meta"><span class="oys-service-card__num">02</span><span class="oys-service-card__label">Interface</span></div>
                        <h3>UI/UX Design System</h3>
                        <p>Premium layouts, components, motion rules and mobile-first interaction patterns.</p>
                    </article>
                    <article class="oys-service-card" data-service-card="2" style="--card-color:#38BDF8; --card-border:rgba(56,189,248,.34); --card-glow:rgba(56,189,248,.16);">
                        <div class="oys-service-card__meta"><span class="oys-service-card__num">03</span><span class="oys-service-card__label">Build</span></div>
                        <h3>Frontend Engineering</h3>
                        <p>Clean responsive implementation, performance discipline and scalable architecture.</p>
                    </article>
                    <article class="oys-service-card" data-service-card="3" style="--card-color:#22C55E; --card-border:rgba(34,197,94,.34); --card-glow:rgba(34,197,94,.16);">
                        <div class="oys-service-card__meta"><span class="oys-service-card__num">04</span><span class="oys-service-card__label">Launch</span></div>
                        <h3>SEO & Optimization</h3>
                        <p>Technical SEO, analytics, speed checks and post-launch refinement for real business use.</p>
                    </article>
                </div>

                <div class="oys-services-visual" aria-label="Animated digital service system visual">
                    <div class="oys-service-orbit"></div>
                    <div class="oys-service-core"></div>
                    <div class="oys-service-node oys-node-a"><b>Design System</b><span>Reusable UI rules, spacing, type hierarchy and interaction states.</span></div>
                    <div class="oys-service-node oys-node-b"><b>Conversion Path</b><span>Every section has a business reason, not just decoration.</span></div>
                    <div class="oys-service-node oys-node-c"><b>Mobile First</b><span>Layouts are controlled from small screens upward.</span></div>
                    <div class="oys-service-node oys-node-d"><b>Clean Code</b><span>Fast, maintainable frontend structure with room to scale.</span></div>
                    <div class="oys-service-readout">
                        <div><b>95+</b><span>Performance Target</span></div>
                        <div><b>CMS</b><span>Optional Content Control</span></div>
                        <div><b>SEO</b><span>Launch Baseline</span></div>
                    </div>
                </div>
            </div>
        `;
    }

    function portfolioSectionHTML() {
        return `
            <div class="oys-portfolio-shell">
                <div class="oys-portfolio-copy oys-fallback-reveal">
                    <span class="oys-eyebrow">Portfolio Focus</span>
                    <h2>Responsive <span>Experience Lab</span></h2>
                    <p>
                        The old flat mockup is replaced by a scroll-controlled device scene. It gives the same premium
                        product-launch feeling without relying on random images or low-quality placeholders.
                    </p>
                    <div class="oys-portfolio-specs">
                        <div><b>Desktop</b><span>Large-screen composition, wide spacing and immersive hierarchy.</span></div>
                        <div><b>Tablet</b><span>Balanced mid-size layouts with no broken spacing.</span></div>
                        <div><b>Mobile</b><span>Touch-first flow, compact cards and clear CTAs.</span></div>
                        <div><b>Motion</b><span>Scroll-linked transitions with fallback for performance.</span></div>
                    </div>
                    <a class="oys-cta-link" href="projects.html">View Recent Projects</a>
                </div>

                <div class="oys-device-lab" aria-label="Scroll controlled responsive device composition">
                    <div class="oys-lab-grid"></div>
                    <div class="oys-orbit-ring"></div>
                    <div class="oys-device oys-device--desktop"><div class="oys-screen-lines"><i></i><i></i><i></i><i></i></div></div>
                    <div class="oys-device oys-device--tablet"><div class="oys-screen-lines"><i></i><i></i><i></i></div></div>
                    <div class="oys-device oys-device--phone"><div class="oys-screen-lines"><i></i><i></i><i></i></div></div>
                    <div class="oys-lab-callout oys-callout-a"><b>Tablet</b><span>Interface stays consistent between wide and compact states.</span></div>
                    <div class="oys-lab-callout oys-callout-b"><b>Web & Desktop</b><span>High-resolution layouts use space deliberately, not randomly.</span></div>
                    <div class="oys-lab-callout oys-callout-c"><b>Mobile First</b><span>CTA order, spacing and readability are controlled from the start.</span></div>
                </div>
            </div>
        `;
    }

    function replaceSections() {
        const expertise = document.getElementById('expertise');
        if (expertise) {
            expertise.className = 'oys-services-stage oys-stage';
            expertise.innerHTML = serviceSectionHTML();
        }

        const portfolio = document.getElementById('portfolio');
        if (portfolio) {
            portfolio.className = 'oys-portfolio-stage oys-stage';
            portfolio.innerHTML = portfolioSectionHTML();
        }
    }

    function setActiveService(index) {
        const cards = document.querySelectorAll('[data-service-card]');
        cards.forEach((card, cardIndex) => {
            card.classList.toggle('is-active', cardIndex === index);
        });
    }

    function initFallbackReveal() {
        const items = document.querySelectorAll('.oys-fallback-reveal, .oys-service-card, .oys-services-visual, .oys-device-lab, .oys-lab-callout, .oys-device');
        items.forEach((item) => item.classList.add('oys-fallback-reveal'));

        if (!('IntersectionObserver' in window)) {
            items.forEach((item) => item.classList.add('is-visible'));
            return;
        }

        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) entry.target.classList.add('is-visible');
            });
        }, { threshold: 0.18, rootMargin: '0px 0px -10% 0px' });

        items.forEach((item) => observer.observe(item));
    }

    function initGSAPMotion() {
        const gsap = window.gsap;
        const ScrollTrigger = window.ScrollTrigger;
        if (!gsap || !ScrollTrigger || prefersReducedMotion) {
            initFallbackReveal();
            setActiveService(0);
            return;
        }

        gsap.set('.oys-fallback-reveal, .oys-service-card, .oys-services-visual, .oys-device-lab', {
            autoAlpha: 1,
            filter: 'none',
            y: 0
        });

        gsap.from('.oys-services-intro > *', {
            y: 48,
            autoAlpha: 0,
            filter: 'blur(10px)',
            duration: 1,
            stagger: 0.12,
            ease: 'power3.out',
            scrollTrigger: {
                trigger: '.oys-services-stage',
                start: 'top 78%'
            }
        });

        const serviceTimeline = gsap.timeline({
            scrollTrigger: {
                trigger: '.oys-services-pin',
                start: 'top top+=96',
                end: '+=2100',
                pin: true,
                scrub: 0.85,
                anticipatePin: 1,
                onUpdate: (self) => {
                    const index = Math.min(3, Math.floor(self.progress * 4));
                    setActiveService(index);
                }
            }
        });

        serviceTimeline
            .from('.oys-service-card', { x: -90, y: 40, autoAlpha: 0, filter: 'blur(12px)', stagger: 0.12, duration: 0.9, ease: 'power3.out' }, 0)
            .from('.oys-services-visual', { x: 80, scale: 0.94, autoAlpha: 0, filter: 'blur(14px)', duration: 1, ease: 'power3.out' }, 0.05)
            .from('.oys-service-core', { rotateX: 72, rotateZ: -32, scale: 0.72, autoAlpha: 0, duration: 1.2, ease: 'power3.out' }, 0.25)
            .from('.oys-service-node', { y: 70, scale: 0.82, autoAlpha: 0, filter: 'blur(10px)', stagger: 0.16, duration: 1, ease: 'power3.out' }, 0.45)
            .to('.oys-service-core', { rotateZ: 12, rotateX: 48, scale: 1.07, duration: 2.6, ease: 'none' }, 1.1)
            .to('.oys-service-orbit', { rotate: 7, scale: 1.04, duration: 2.6, ease: 'none' }, 1.1)
            .to('.oys-node-a', { x: -20, y: -12, rotate: -11, duration: 2.6, ease: 'none' }, 1.1)
            .to('.oys-node-b', { x: 18, y: -18, rotate: 4, duration: 2.6, ease: 'none' }, 1.1)
            .to('.oys-node-c', { x: 28, y: 18, rotate: 10, duration: 2.6, ease: 'none' }, 1.1)
            .to('.oys-node-d', { x: -22, y: 20, rotate: 9, duration: 2.6, ease: 'none' }, 1.1)
            .from('.oys-service-readout div', { y: 34, autoAlpha: 0, stagger: 0.08, duration: 0.9, ease: 'power3.out' }, 2.2);

        gsap.from('.oys-portfolio-copy > *', {
            y: 44,
            autoAlpha: 0,
            filter: 'blur(10px)',
            duration: 1,
            stagger: 0.1,
            ease: 'power3.out',
            scrollTrigger: {
                trigger: '.oys-portfolio-stage',
                start: 'top 78%'
            }
        });

        const portfolioTimeline = gsap.timeline({
            scrollTrigger: {
                trigger: '.oys-portfolio-shell',
                start: 'top top+=96',
                end: '+=1900',
                pin: true,
                scrub: 0.85,
                anticipatePin: 1
            }
        });

        portfolioTimeline
            .from('.oys-lab-grid', { rotateX: 80, rotateZ: -28, scale: 0.72, autoAlpha: 0, duration: 1.1, ease: 'power3.out' }, 0)
            .from('.oys-device--desktop', { x: 120, y: 60, rotateY: -42, rotateX: 26, autoAlpha: 0, filter: 'blur(12px)', duration: 1.1, ease: 'power3.out' }, 0.18)
            .from('.oys-device--tablet', { x: -110, y: 80, rotateY: 48, autoAlpha: 0, filter: 'blur(12px)', duration: 1, ease: 'power3.out' }, 0.45)
            .from('.oys-device--phone', { x: 110, y: 110, rotateY: -52, autoAlpha: 0, filter: 'blur(12px)', duration: 1, ease: 'power3.out' }, 0.6)
            .from('.oys-lab-callout', { y: 52, scale: 0.86, autoAlpha: 0, filter: 'blur(10px)', stagger: 0.14, duration: 0.9, ease: 'power3.out' }, 0.8)
            .from('.oys-orbit-ring', { scale: 0.62, rotateZ: -40, autoAlpha: 0, duration: 1.15, ease: 'power3.out' }, 0.9)
            .to('.oys-device--desktop', { rotateY: 10, rotateX: 4, y: -22, duration: 2.4, ease: 'none' }, 1.2)
            .to('.oys-device--tablet', { x: 24, y: -28, rotateZ: -13, rotateY: 12, duration: 2.4, ease: 'none' }, 1.2)
            .to('.oys-device--phone', { x: -30, y: -34, rotateZ: 15, rotateY: -12, duration: 2.4, ease: 'none' }, 1.2)
            .to('.oys-orbit-ring', { rotateZ: 42, scale: 1.08, duration: 2.4, ease: 'none' }, 1.2)
            .to('.oys-callout-a', { x: -22, y: -12, rotate: -8, duration: 2.4, ease: 'none' }, 1.2)
            .to('.oys-callout-b', { x: 16, y: -20, rotate: 4, duration: 2.4, ease: 'none' }, 1.2)
            .to('.oys-callout-c', { x: 18, y: 18, rotate: 9, duration: 2.4, ease: 'none' }, 1.2);

        setActiveService(0);
        ScrollTrigger.refresh();
    }

    function bindScrollState() {
        const update = () => {
            const scrollTop = window.scrollY || document.documentElement.scrollTop || 0;
            const height = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
            const progress = Math.min(1, Math.max(0, scrollTop / height));
            document.documentElement.style.setProperty('--oys-progress', progress.toFixed(4));
            document.body.classList.toggle('oys-motion-engaged', scrollTop > 28);
        };

        update();
        window.addEventListener('scroll', update, { passive: true });
        window.addEventListener('resize', update, { passive: true });
    }

    function bindPointerGlow() {
        if (prefersReducedMotion) return;
        window.addEventListener('pointermove', (event) => {
            document.documentElement.style.setProperty('--oys-cursor-x', `${Math.round((event.clientX / window.innerWidth) * 100)}%`);
            document.documentElement.style.setProperty('--oys-cursor-y', `${Math.round((event.clientY / window.innerHeight) * 100)}%`);
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
        else initFallbackReveal();

        if (window.lucide && typeof window.lucide.createIcons === 'function') {
            window.lucide.createIcons();
        }
    });
})();
