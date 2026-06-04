/*
 * Oakley-style scroll experience layer for omeryigitler.com
 * Keeps the current main-branch layout intact and adds progressive reveal,
 * Taurus/cyber premium motion language, and scroll-driven interface details.
 */
(function () {
    const VERSION = 'oakley-scroll-experience-v1';

    if (window.__OAKLEY_SCROLL_EXPERIENCE__) return;
    window.__OAKLEY_SCROLL_EXPERIENCE__ = VERSION;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function onReady(callback) {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', callback, { once: true });
        } else {
            callback();
        }
    }

    function injectStyles() {
        if (document.getElementById('oakley-scroll-experience-styles')) return;

        const style = document.createElement('style');
        style.id = 'oakley-scroll-experience-styles';
        style.textContent = `
            :root {
                --oys-gold: #FFD700;
                --oys-obsidian: #050505;
                --oys-panel: rgba(10, 10, 10, 0.58);
                --oys-border: rgba(255, 255, 255, 0.09);
                --oys-gold-soft: rgba(255, 215, 0, 0.18);
                --oys-blue-soft: rgba(56, 189, 248, 0.14);
                --oys-green-soft: rgba(16, 185, 129, 0.12);
            }

            html {
                scroll-behavior: smooth;
            }

            body::before {
                content: "";
                position: fixed;
                inset: 0;
                z-index: -9;
                pointer-events: none;
                opacity: 0;
                background:
                    radial-gradient(circle at 50% var(--oys-cursor-y, 36%), rgba(255, 215, 0, 0.08), transparent 26rem),
                    radial-gradient(circle at var(--oys-cursor-x, 50%) 30%, rgba(59, 130, 246, 0.08), transparent 22rem),
                    linear-gradient(180deg, rgba(255,255,255,0.018), transparent 32%, rgba(255,215,0,0.018));
                transition: opacity 700ms ease;
            }

            body.oakley-engaged::before {
                opacity: 1;
            }

            .oakley-hud {
                position: fixed;
                right: clamp(1rem, 3vw, 2rem);
                top: 50%;
                z-index: 45;
                display: none;
                transform: translateY(-50%);
                pointer-events: none;
            }

            .oakley-hud__rail {
                width: 1px;
                height: 210px;
                background: rgba(255, 255, 255, 0.08);
                overflow: hidden;
                border-radius: 999px;
            }

            .oakley-hud__progress {
                width: 100%;
                height: calc(var(--oakley-progress, 0) * 100%);
                background: linear-gradient(to bottom, transparent, var(--oys-gold), transparent);
                box-shadow: 0 0 20px rgba(255, 215, 0, 0.55);
                transition: height 120ms linear;
            }

            .oakley-hud__label {
                position: absolute;
                right: 1rem;
                top: -0.2rem;
                width: 9rem;
                color: rgba(255, 215, 0, 0.7);
                font-family: 'Syncopate', sans-serif;
                font-size: 0.52rem;
                letter-spacing: 0.26em;
                text-align: right;
                text-transform: uppercase;
                opacity: 0;
                transform: translateX(0.5rem);
                transition: opacity 450ms ease, transform 450ms ease;
            }

            body.oakley-engaged .oakley-hud__label {
                opacity: 1;
                transform: translateX(0);
            }

            @media (min-width: 1024px) {
                .oakley-hud { display: block; }
            }

            .oakley-stage {
                isolation: isolate;
                transform-style: preserve-3d;
                perspective: 1200px;
            }

            .oakley-stage::before,
            .oakley-stage::after {
                content: "";
                position: absolute;
                inset: auto;
                z-index: -1;
                pointer-events: none;
                border-radius: 999px;
                filter: blur(70px);
                opacity: 0;
                transition: opacity 900ms ease, transform 1200ms cubic-bezier(.2,.8,.2,1);
            }

            .oakley-stage::before {
                top: 8%;
                left: 50%;
                width: min(55vw, 520px);
                height: min(55vw, 520px);
                transform: translate3d(-50%, 2rem, 0) scale(0.82);
                background: radial-gradient(circle, rgba(255, 215, 0, 0.13), transparent 62%);
            }

            .oakley-stage::after {
                right: 6%;
                bottom: 8%;
                width: min(45vw, 430px);
                height: min(45vw, 430px);
                transform: translate3d(1.5rem, 1.5rem, 0) scale(0.86);
                background: radial-gradient(circle, rgba(56, 189, 248, 0.12), transparent 64%);
            }

            .oakley-stage.is-active::before,
            .oakley-stage.is-active::after {
                opacity: 1;
                transform: translate3d(-50%, 0, 0) scale(1);
            }

            .oakley-stage.is-active::after {
                transform: translate3d(0, 0, 0) scale(1);
            }

            .oakley-reveal {
                opacity: 0;
                transform: translate3d(0, 42px, 0) scale(0.985);
                filter: blur(10px);
                transition:
                    opacity 850ms cubic-bezier(.2,.8,.2,1),
                    transform 850ms cubic-bezier(.2,.8,.2,1),
                    filter 850ms cubic-bezier(.2,.8,.2,1);
                transition-delay: var(--oakley-delay, 0ms);
                will-change: opacity, transform, filter;
            }

            .oakley-stage.is-active .oakley-reveal,
            .oakley-reveal.is-active {
                opacity: 1;
                transform: translate3d(0, 0, 0) scale(1);
                filter: blur(0);
            }

            #expertise.oakley-stage > .text-center {
                position: sticky;
                top: 7.5rem;
                z-index: 1;
            }

            #expertise.oakley-stage > .grid > div {
                min-height: 18rem;
                background:
                    linear-gradient(145deg, rgba(255,255,255,0.055), rgba(255,255,255,0.018)),
                    radial-gradient(circle at 50% 0%, rgba(255, 215, 0, 0.045), transparent 55%),
                    rgba(10,10,10,0.52) !important;
                border-color: rgba(255,255,255,0.10) !important;
                box-shadow:
                    0 35px 90px -55px rgba(0,0,0,0.95),
                    inset 0 1px 0 rgba(255,255,255,0.055);
                transform-origin: center bottom;
            }

            #expertise.oakley-stage > .grid > div:nth-child(2) {
                background:
                    linear-gradient(145deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02)),
                    radial-gradient(circle at 50% 0%, rgba(59, 130, 246, 0.11), transparent 55%),
                    rgba(10,10,10,0.62) !important;
            }

            #expertise.oakley-stage > .grid > div:nth-child(3) {
                background:
                    linear-gradient(145deg, rgba(255,255,255,0.055), rgba(255,255,255,0.018)),
                    radial-gradient(circle at 50% 0%, rgba(16, 185, 129, 0.09), transparent 55%),
                    rgba(10,10,10,0.52) !important;
            }

            #expertise.oakley-stage > .grid > div::after {
                content: "";
                position: absolute;
                inset: 0;
                pointer-events: none;
                opacity: 0;
                background: linear-gradient(110deg, transparent 0%, rgba(255,255,255,0.08) 45%, transparent 62%);
                transform: translateX(-120%);
                transition: opacity 600ms ease, transform 1200ms cubic-bezier(.2,.8,.2,1);
            }

            #expertise.oakley-stage.is-active > .grid > div::after {
                opacity: 1;
                transform: translateX(120%);
            }

            #portfolio.oakley-stage {
                min-height: min(1100px, 120vh);
                justify-content: center;
            }

            #portfolio.oakley-stage > .flex {
                position: sticky;
                top: 7.5rem;
            }

            .oakley-device-stage {
                transform-origin: center;
                box-shadow:
                    0 55px 120px -70px rgba(0,0,0,1),
                    0 0 0 1px rgba(255,255,255,0.04),
                    inset 0 1px 0 rgba(255,255,255,0.08) !important;
            }

            .oakley-device-stage::before {
                content: "";
                position: absolute;
                inset: 0;
                z-index: 1;
                pointer-events: none;
                background:
                    linear-gradient(90deg, transparent, rgba(255,215,0,0.10), transparent),
                    radial-gradient(circle at 18% 10%, rgba(255,215,0,0.22), transparent 1.2rem);
                opacity: 0;
                transform: translateX(-30%);
                transition: opacity 900ms ease, transform 1300ms cubic-bezier(.2,.8,.2,1);
            }

            #portfolio.oakley-stage.is-active .oakley-device-stage::before {
                opacity: 1;
                transform: translateX(30%);
            }

            .oakley-device-stage .absolute[class*="rounded-xl"] {
                transition:
                    opacity 900ms cubic-bezier(.2,.8,.2,1),
                    transform 900ms cubic-bezier(.2,.8,.2,1),
                    box-shadow 700ms ease;
            }

            #portfolio.oakley-stage:not(.is-active) .oakley-device-stage .absolute[class*="rounded-xl"] {
                opacity: 0;
                transform: translate3d(0, 1.5rem, 0) rotate(0deg) scale(0.92) !important;
            }

            #portfolio.oakley-stage.is-active .oakley-device-stage .absolute[class*="rounded-xl"] {
                opacity: 1;
            }

            .oakley-taurus-panel {
                width: min(100%, 1120px);
                margin: clamp(6rem, 12vw, 10rem) auto 0;
                padding: clamp(1.2rem, 3vw, 2.4rem);
                border: 1px solid rgba(255,255,255,0.08);
                border-radius: 2rem;
                background:
                    radial-gradient(circle at 18% 18%, rgba(255, 215, 0, 0.09), transparent 22rem),
                    radial-gradient(circle at 82% 42%, rgba(56, 189, 248, 0.09), transparent 18rem),
                    rgba(5,5,5,0.62);
                box-shadow: 0 50px 140px -80px rgba(0,0,0,1), inset 0 1px 0 rgba(255,255,255,0.06);
                backdrop-filter: blur(22px);
                overflow: hidden;
            }

            .oakley-taurus-panel__grid {
                display: grid;
                grid-template-columns: 1fr;
                gap: 1rem;
            }

            @media (min-width: 768px) {
                .oakley-taurus-panel__grid {
                    grid-template-columns: 1.1fr 0.9fr;
                    align-items: center;
                }
            }

            .oakley-taurus-panel__eyebrow {
                display: inline-flex;
                align-items: center;
                gap: 0.5rem;
                margin-bottom: 1rem;
                color: rgba(255,215,0,0.85);
                font-family: 'Syncopate', sans-serif;
                font-size: 0.58rem;
                font-weight: 700;
                letter-spacing: 0.22em;
                text-transform: uppercase;
            }

            .oakley-taurus-panel__eyebrow::before {
                content: "";
                width: 0.45rem;
                height: 0.45rem;
                border-radius: 999px;
                background: var(--oys-gold);
                box-shadow: 0 0 20px rgba(255,215,0,0.75);
            }

            .oakley-taurus-panel h3 {
                max-width: 720px;
                font-family: 'Syncopate', sans-serif;
                font-size: clamp(1.65rem, 4vw, 3.7rem);
                line-height: 0.96;
                letter-spacing: -0.04em;
                text-transform: uppercase;
            }

            .oakley-taurus-panel p {
                max-width: 620px;
                margin-top: 1.2rem;
                color: rgba(156, 163, 175, 0.98);
                font-size: clamp(0.86rem, 1.5vw, 1rem);
                line-height: 1.8;
            }

            .oakley-taurus-orb {
                position: relative;
                width: min(70vw, 310px);
                aspect-ratio: 1;
                margin: 2rem auto 0;
                border-radius: 999px;
                border: 1px solid rgba(255,215,0,0.22);
                background:
                    radial-gradient(circle, rgba(255,215,0,0.18), rgba(255,215,0,0.03) 32%, transparent 68%),
                    linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0));
                box-shadow: 0 0 80px rgba(255,215,0,0.10), inset 0 0 80px rgba(255,215,0,0.05);
            }

            .oakley-taurus-orb::before,
            .oakley-taurus-orb::after {
                content: "";
                position: absolute;
                inset: 12%;
                border: 1px solid rgba(255,215,0,0.22);
                border-radius: 999px;
                animation: oakleyPulse 3.6s infinite ease-out;
            }

            .oakley-taurus-orb::after {
                inset: 26%;
                animation-delay: 1.2s;
                border-color: rgba(255,255,255,0.14);
            }

            .oakley-taurus-orb span {
                position: absolute;
                inset: 50% auto auto 50%;
                transform: translate(-50%, -50%);
                color: var(--oys-gold);
                font-family: 'Syncopate', sans-serif;
                font-weight: 700;
                font-size: clamp(2rem, 7vw, 4rem);
                letter-spacing: -0.08em;
                text-shadow: 0 0 30px rgba(255,215,0,0.45);
            }

            @keyframes oakleyPulse {
                0% { transform: scale(0.72); opacity: 0.85; }
                100% { transform: scale(1.38); opacity: 0; }
            }

            .oakley-process {
                display: grid;
                grid-template-columns: 1fr;
                gap: 0.75rem;
                margin-top: clamp(2rem, 5vw, 4rem);
            }

            @media (min-width: 768px) {
                .oakley-process {
                    grid-template-columns: repeat(4, 1fr);
                }
            }

            .oakley-process__item {
                padding: 1.1rem;
                border: 1px solid rgba(255,255,255,0.08);
                border-radius: 1.15rem;
                background: rgba(255,255,255,0.026);
            }

            .oakley-process__item b {
                display: block;
                color: rgba(255,215,0,0.85);
                font-family: 'Syncopate', sans-serif;
                font-size: 0.66rem;
                letter-spacing: 0.18em;
                margin-bottom: 0.65rem;
            }

            .oakley-process__item span {
                color: rgba(255,255,255,0.86);
                font-size: 0.84rem;
                line-height: 1.55;
            }

            @media (max-width: 767px) {
                #expertise.oakley-stage > .text-center,
                #portfolio.oakley-stage > .flex {
                    position: relative;
                    top: auto;
                }

                #portfolio.oakley-stage {
                    min-height: auto;
                }
            }

            @media (prefers-reduced-motion: reduce) {
                .oakley-reveal,
                .oakley-stage::before,
                .oakley-stage::after,
                .oakley-device-stage::before,
                .oakley-taurus-orb::before,
                .oakley-taurus-orb::after {
                    transition: none !important;
                    animation: none !important;
                    transform: none !important;
                    filter: none !important;
                    opacity: 1 !important;
                }
            }
        `;
        document.head.appendChild(style);
    }

    function buildHud() {
        if (document.querySelector('.oakley-hud')) return;
        const hud = document.createElement('div');
        hud.className = 'oakley-hud';
        hud.innerHTML = `
            <div class="oakley-hud__label">Scroll System</div>
            <div class="oakley-hud__rail"><div class="oakley-hud__progress"></div></div>
        `;
        document.body.appendChild(hud);
    }

    function addRevealClass(elements) {
        elements.forEach((el, index) => {
            if (!el || el.classList.contains('oakley-reveal')) return;
            el.classList.add('oakley-reveal');
            el.style.setProperty('--oakley-delay', `${index * 120}ms`);
        });
    }

    function prepareExistingSections() {
        const expertise = document.getElementById('expertise');
        if (expertise) {
            expertise.classList.add('oakley-stage');
            addRevealClass([
                expertise.querySelector('.text-center'),
                ...expertise.querySelectorAll(':scope > .grid > div')
            ].filter(Boolean));
        }

        const portfolio = document.getElementById('portfolio');
        if (portfolio) {
            portfolio.classList.add('oakley-stage');
            const deviceStage = portfolio.querySelector('.relative.w-full.aspect-square, .relative.w-full.aspect-\[4\/5\], .relative.w-full.aspect-\[4\/3\]');
            if (deviceStage) deviceStage.classList.add('oakley-device-stage');
            addRevealClass([
                portfolio.querySelector(':scope > .flex > div:first-child'),
                portfolio.querySelector(':scope > .flex > div:last-child')
            ].filter(Boolean));
        }

        const manifesto = Array.from(document.querySelectorAll('h2')).find((h2) => h2.textContent && h2.textContent.includes('Balance'))?.closest('div.w-full');
        if (manifesto) {
            manifesto.classList.add('oakley-stage');
            addRevealClass(Array.from(manifesto.querySelectorAll('h2, p')));
        }
    }

    function insertTaurusExperiencePanel() {
        if (document.querySelector('.oakley-taurus-panel')) return;
        const portfolio = document.getElementById('portfolio');
        if (!portfolio) return;

        const panel = document.createElement('section');
        panel.className = 'oakley-taurus-panel oakley-stage oakley-reveal';
        panel.innerHTML = `
            <div class="oakley-taurus-panel__grid">
                <div>
                    <div class="oakley-taurus-panel__eyebrow">Taurus Interface Layer</div>
                    <h3>Premium motion. Controlled like a system.</h3>
                    <p>
                        The main layout stays clean, but after the first scroll the site gains a cinematic interface layer:
                        scan motion, gold signal details, staged portfolio reveals, and a more product-launch feeling without losing speed.
                    </p>
                </div>
                <div class="oakley-taurus-orb" aria-hidden="true"><span>ÖY</span></div>
            </div>
            <div class="oakley-process">
                <div class="oakley-process__item"><b>01 / Reveal</b><span>Sections form on scroll instead of appearing flat.</span></div>
                <div class="oakley-process__item"><b>02 / Depth</b><span>Cards, devices, and insight labels move in separate layers.</span></div>
                <div class="oakley-process__item"><b>03 / Signal</b><span>Taurus gold scan details stay active while browsing.</span></div>
                <div class="oakley-process__item"><b>04 / Speed</b><span>Native CSS and light JavaScript keep the current build stable.</span></div>
            </div>
        `;

        portfolio.insertAdjacentElement('afterend', panel);
        addRevealClass(Array.from(panel.querySelectorAll('.oakley-taurus-panel__eyebrow, h3, p, .oakley-taurus-orb, .oakley-process__item')));
    }

    function observeStages() {
        const stages = Array.from(document.querySelectorAll('.oakley-stage, .oakley-reveal'));

        if (prefersReducedMotion || !('IntersectionObserver' in window)) {
            stages.forEach((el) => el.classList.add('is-active'));
            return;
        }

        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-active');
                }
            });
        }, {
            threshold: 0.18,
            rootMargin: '0px 0px -12% 0px'
        });

        stages.forEach((el) => observer.observe(el));
    }

    function bindScrollState() {
        const update = () => {
            const scrollTop = window.scrollY || document.documentElement.scrollTop || 0;
            const height = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
            const progress = Math.min(1, Math.max(0, scrollTop / height));
            document.documentElement.style.setProperty('--oakley-progress', progress.toFixed(4));

            if (scrollTop > 24) {
                document.body.classList.add('oakley-engaged');
            } else {
                document.body.classList.remove('oakley-engaged');
            }
        };

        update();
        window.addEventListener('scroll', update, { passive: true });
        window.addEventListener('resize', update, { passive: true });
    }

    function bindPointerGlow() {
        if (prefersReducedMotion) return;
        window.addEventListener('pointermove', (event) => {
            const x = `${Math.round((event.clientX / window.innerWidth) * 100)}%`;
            const y = `${Math.round((event.clientY / window.innerHeight) * 100)}%`;
            document.documentElement.style.setProperty('--oys-cursor-x', x);
            document.documentElement.style.setProperty('--oys-cursor-y', y);
        }, { passive: true });
    }

    onReady(() => {
        injectStyles();
        buildHud();
        prepareExistingSections();
        insertTaurusExperiencePanel();
        observeStages();
        bindScrollState();
        bindPointerGlow();

        if (window.lucide && typeof window.lucide.createIcons === 'function') {
            window.lucide.createIcons();
        }
    });
})();
