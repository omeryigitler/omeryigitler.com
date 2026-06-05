(function () {
  if (window.__OY_EXPERTISE_3D_PHILOSOPHY__) return;
  window.__OY_EXPERTISE_3D_PHILOSOPHY__ = 'v4';

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const lerp = (start, end, progress) => start + (end - start) * progress;
  const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
  const smoothstep = (edge0, edge1, x) => {
    const t = clamp((x - edge0) / Math.max(0.0001, edge1 - edge0), 0, 1);
    return t * t * (3 - 2 * t);
  };

  const style = document.createElement('style');
  style.id = 'expertise-3d-philosophy-style';
  style.textContent = `
    #expertise.oy-3d-expertise {
      transform-style: preserve-3d;
      isolation: isolate;
    }

    #expertise.oy-3d-expertise > .grid {
      perspective: 1200px;
      transform-style: preserve-3d;
      overflow: visible;
      perspective-origin: 50% 42%;
    }

    #expertise.oy-3d-expertise > .grid > div {
      position: relative;
      transform-style: preserve-3d;
      will-change: transform, opacity, filter;
      transition:
        transform 380ms cubic-bezier(.2,.8,.2,1),
        border-color 280ms ease,
        background 280ms ease,
        box-shadow 280ms ease,
        filter 280ms ease;
      backface-visibility: hidden;
    }

    #expertise.oy-3d-expertise.oy-scrolling > .grid > div:not(.oy-hovering) {
      transition:
        border-color 280ms ease,
        background 280ms ease,
        box-shadow 280ms ease,
        filter 280ms ease;
    }

    #expertise.oy-3d-expertise > .grid > div::before {
      content: "";
      position: absolute;
      inset: 0;
      opacity: 0;
      pointer-events: none;
      background: linear-gradient(110deg, transparent 0%, rgba(255,255,255,0.085) 45%, transparent 62%);
      transform: translateX(-120%);
      transition: opacity 300ms ease;
    }

    #expertise.oy-3d-expertise.oy-3d-active > .grid > div::before {
      opacity: 1;
      animation: oyExpertiseSweep 1.2s ease forwards;
      animation-delay: var(--oy-delay, 0ms);
    }

    #expertise.oy-3d-expertise > .grid > div.oy-hovering {
      border-color: rgba(255, 215, 0, 0.35) !important;
      background:
        radial-gradient(circle at 50% 0%, rgba(255, 215, 0, 0.10), transparent 60%),
        rgba(255, 255, 255, 0.058) !important;
      box-shadow:
        0 34px 100px -58px rgba(255, 215, 0, 0.72),
        inset 0 1px 0 rgba(255, 255, 255, 0.08) !important;
      filter: brightness(1.1);
      z-index: 5;
    }

    @keyframes oyExpertiseSweep {
      0% { transform: translateX(-120%); opacity: 0; }
      30% { opacity: 0.8; }
      100% { transform: translateX(120%); opacity: 0; }
    }

    .oy-philosophy-root {
      position: relative !important;
      min-height: 330vh !important;
      height: auto !important;
      display: block !important;
      padding: 0 !important;
      margin-top: clamp(5rem, 10vw, 9rem) !important;
      margin-bottom: 0 !important;
      isolation: isolate;
    }

    .oy-philosophy-sticky {
      position: sticky;
      top: 0;
      min-height: 100vh;
      width: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      transform: translate3d(0, var(--oy-stage-y, 0px), 0);
      opacity: var(--oy-stage-opacity, 1);
      will-change: transform, opacity;
    }

    .oy-philosophy-sticky::before {
      content: "";
      position: absolute;
      left: 50%;
      top: 8vh;
      bottom: 8vh;
      width: 1px;
      transform: translateX(-50%) scaleY(var(--oy-line-progress, 0));
      transform-origin: top;
      background: linear-gradient(180deg, transparent, rgba(255, 215, 0, 0.5), transparent);
      box-shadow: 0 0 26px rgba(255, 215, 0, 0.3);
      pointer-events: none;
      opacity: 0.78;
      z-index: 0;
    }

    .oy-philosophy-root .space-y-4,
    .oy-philosophy-root .md\:space-y-8 {
      position: relative;
      z-index: 2;
    }

    .oy-philosophy-root .space-y-4 > div:first-child,
    .oy-philosophy-root .md\:space-y-8 > div:first-child {
      transform: translate(-50%, -50%) !important;
      opacity: 1 !important;
      filter: none !important;
      z-index: -1 !important;
      pointer-events: none !important;
    }

    .oy-philosophy-line {
      position: relative;
      z-index: 2;
      margin: clamp(0.25rem, 1vh, 0.75rem) 0 !important;
      transition: color 220ms ease, text-shadow 220ms ease;
      will-change: transform, opacity, filter;
      transform-origin: center;
    }

    .oy-philosophy-over {
      transition: color 220ms ease, text-shadow 220ms ease;
    }

    .oy-philosophy-line.oy-philosophy-active .oy-philosophy-over,
    .oy-philosophy-line:hover .oy-philosophy-over {
      color: #FFD700 !important;
      text-shadow: 0 0 24px rgba(255, 215, 0, 0.68);
    }

    .oy-philosophy-line.oy-philosophy-active {
      z-index: 5;
    }

    .oy-philosophy-sticky > div:not(:first-child) {
      position: relative;
      z-index: 2;
    }

    .oy-philosophy-copy-active {
      opacity: var(--oy-copy-opacity, 1) !important;
      transform: translateY(var(--oy-copy-y, 0px));
      transition: opacity 180ms ease;
    }

    @media (max-width: 767px) {
      #expertise.oy-3d-expertise > .grid {
        perspective: none;
      }

      #expertise.oy-3d-expertise > .grid > div {
        transform: none !important;
        opacity: 1 !important;
      }

      .oy-philosophy-root {
        min-height: 300vh !important;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      #expertise.oy-3d-expertise > .grid > div,
      .oy-philosophy-line,
      .oy-philosophy-sticky {
        transform: none !important;
        opacity: 1 !important;
        filter: none !important;
        transition: none !important;
      }
    }
  `;
  document.head.appendChild(style);

  function initExpertise3D() {
    const section = document.getElementById('expertise');
    if (!section) return;

    const grid = section.querySelector(':scope > .grid');
    const cards = Array.from(section.querySelectorAll(':scope > .grid > div'));
    if (!grid || cards.length < 3) return;

    section.classList.add('oy-3d-expertise');
    cards.forEach((card, index) => {
      card.dataset.oyHover = 'false';
      card.style.setProperty('--oy-delay', `${index * 130}ms`);
      card.addEventListener('mouseenter', () => {
        card.dataset.oyHover = 'true';
        card.classList.add('oy-hovering');
        applyExpertiseTransforms();
      });
      card.addEventListener('mouseleave', () => {
        card.dataset.oyHover = 'false';
        card.classList.remove('oy-hovering');
        applyExpertiseTransforms();
      });
    });

    function scrollProgress() {
      const rect = grid.getBoundingClientRect();
      const viewport = window.innerHeight || 1;
      const start = viewport * 0.98;
      const end = viewport * 0.04;
      return clamp((start - rect.top) / (start - end), 0, 1);
    }

    function transformCard(card, values) {
      card.style.opacity = String(values.opacity);
      card.style.transform = `translateX(${values.x}px) translateY(${values.y}px) translateZ(${values.z}px) rotateY(${values.rotateY}deg) scale(${values.scale})`;
    }

    function applyExpertiseTransforms() {
      const raw = scrollProgress();
      const progress = easeOutCubic(raw);
      section.classList.toggle('oy-3d-active', raw > 0.08);
      section.classList.toggle('oy-scrolling', raw > 0.02 && raw < 0.98);

      const leftHover = cards[0].dataset.oyHover === 'true';
      const centerHover = cards[1].dataset.oyHover === 'true';
      const rightHover = cards[2].dataset.oyHover === 'true';

      const left = {
        x: lerp(-170, 0, progress),
        y: lerp(44, 0, progress),
        z: lerp(-360, -45, progress),
        rotateY: lerp(58, 14, progress),
        scale: lerp(0.82, 1, progress),
        opacity: lerp(0.16, 1, progress)
      };

      const center = {
        x: 0,
        y: lerp(138, 0, progress),
        z: lerp(-120, 58, progress),
        rotateY: 0,
        scale: lerp(0.72, 1.055, progress),
        opacity: lerp(0.18, 1, progress)
      };

      const right = {
        x: lerp(170, 0, progress),
        y: lerp(44, 0, progress),
        z: lerp(-360, -45, progress),
        rotateY: lerp(-58, -14, progress),
        scale: lerp(0.82, 1, progress),
        opacity: lerp(0.16, 1, progress)
      };

      if (leftHover) {
        left.z = 70;
        left.rotateY = 0;
        left.scale = 1.035;
        left.opacity = 1;
      }
      if (centerHover) {
        center.z = 110;
        center.scale = 1.09;
        center.opacity = 1;
      }
      if (rightHover) {
        right.z = 70;
        right.rotateY = 0;
        right.scale = 1.035;
        right.opacity = 1;
      }

      transformCard(cards[0], left);
      transformCard(cards[1], center);
      transformCard(cards[2], right);
    }

    let ticking = false;
    const requestUpdate = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        applyExpertiseTransforms();
        ticking = false;
      });
    };

    applyExpertiseTransforms();
    window.addEventListener('scroll', requestUpdate, { passive: true });
    window.addEventListener('resize', requestUpdate, { passive: true });
  }

  function initPhilosophyScroll() {
    const headings = Array.from(document.querySelectorAll('h2')).filter((heading) => {
      const text = (heading.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
      return text.includes('balance') || text.includes('symmetry') || text.includes('quality');
    });

    if (headings.length < 3) return;

    const lines = headings.slice(0, 3);
    const originalLineGroup = lines[0].parentElement;
    const root = originalLineGroup && originalLineGroup.parentElement ? originalLineGroup.parentElement : originalLineGroup;
    if (!root) return;

    root.classList.add('oy-philosophy-root');

    let sticky = root.querySelector(':scope > .oy-philosophy-sticky');
    if (!sticky) {
      sticky = document.createElement('div');
      sticky.className = 'oy-philosophy-sticky';
      const children = Array.from(root.childNodes);
      children.forEach((child) => sticky.appendChild(child));
      root.appendChild(sticky);
    }

    const lineGroup = sticky.contains(originalLineGroup) ? originalLineGroup : sticky.querySelector('div');
    const copyBlock = Array.from(sticky.children).find((child) => child !== lineGroup && child.querySelector && child.querySelector('p'));
    if (copyBlock) copyBlock.classList.add('oy-philosophy-copy-active');

    lines.forEach((line) => {
      line.classList.add('oy-philosophy-line');
      const spans = Array.from(line.querySelectorAll('span'));
      const overSpan = spans.find((span) => (span.textContent || '').trim().toLowerCase() === 'over');
      if (overSpan) overSpan.classList.add('oy-philosophy-over');
    });

    function progress() {
      const rect = root.getBoundingClientRect();
      const viewport = window.innerHeight || 1;
      return clamp(-rect.top / Math.max(1, rect.height - viewport), 0, 1);
    }

    function updateLines() {
      const p = progress();
      const exit = smoothstep(0.84, 0.98, p);
      const activePosition = clamp(p / 0.72, 0, 1) * 2;
      const copyProgress = smoothstep(0.56, 0.78, p) * (1 - exit);

      root.style.setProperty('--oy-line-progress', String(clamp(p * 1.12, 0, 1)));
      sticky.style.setProperty('--oy-stage-y', `${lerp(0, -85, exit)}px`);
      sticky.style.setProperty('--oy-stage-opacity', String(lerp(1, 0, exit)));
      sticky.style.setProperty('--oy-copy-opacity', String(copyProgress));
      sticky.style.setProperty('--oy-copy-y', `${lerp(22, 0, copyProgress)}px`);

      lines.forEach((line, index) => {
        const distance = Math.abs(activePosition - index);
        const strength = smoothstep(1.08, 0.05, distance) * (1 - exit);
        const y = (index - activePosition) * 96 - exit * 120;
        const scale = lerp(0.76, 1.08, strength);
        const opacity = lerp(0.10, 1, strength) * (1 - exit);
        const blur = lerp(3.2, 0, strength) + exit * 5;
        const brightness = lerp(0.55, 1.13, strength);
        const z = Math.round(lerp(-70, 120, strength));

        line.classList.toggle('oy-philosophy-active', strength > 0.62);
        line.style.opacity = String(opacity);
        line.style.transform = `translate3d(0, ${y}px, ${z}px) scale(${scale})`;
        line.style.letterSpacing = `${lerp(-0.075, -0.038, strength)}em`;
        line.style.filter = `blur(${blur}px) brightness(${brightness})`;
      });
    }

    let ticking = false;
    const requestUpdate = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        updateLines();
        ticking = false;
      });
    };

    updateLines();
    window.addEventListener('scroll', requestUpdate, { passive: true });
    window.addEventListener('resize', requestUpdate, { passive: true });
  }

  function boot() {
    initExpertise3D();
    initPhilosophyScroll();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();