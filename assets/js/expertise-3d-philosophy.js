(function () {
  if (window.__OY_EXPERTISE_3D_PHILOSOPHY__) return;
  window.__OY_EXPERTISE_3D_PHILOSOPHY__ = 'v1';

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const lerp = (start, end, progress) => start + (end - start) * progress;

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
    }

    #expertise.oy-3d-expertise > .grid > div {
      position: relative;
      transform-style: preserve-3d;
      will-change: transform, opacity, filter;
      transition:
        border-color 280ms ease,
        background 280ms ease,
        box-shadow 280ms ease,
        filter 280ms ease;
      backface-visibility: hidden;
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

    #expertise.oy-3d-expertise > .grid > div:hover {
      border-color: rgba(255, 215, 0, 0.35) !important;
      background:
        radial-gradient(circle at 50% 0%, rgba(255, 215, 0, 0.09), transparent 60%),
        rgba(255, 255, 255, 0.055) !important;
      box-shadow:
        0 28px 90px -60px rgba(255, 215, 0, 0.65),
        inset 0 1px 0 rgba(255, 255, 255, 0.08) !important;
      filter: brightness(1.08);
    }

    @keyframes oyExpertiseSweep {
      0% { transform: translateX(-120%); opacity: 0; }
      30% { opacity: 0.8; }
      100% { transform: translateX(120%); opacity: 0; }
    }

    .oy-philosophy-scroll {
      position: relative;
      transform-style: preserve-3d;
      isolation: isolate;
    }

    .oy-philosophy-scroll::before {
      content: "";
      position: absolute;
      left: 50%;
      top: -3rem;
      bottom: -3rem;
      width: 1px;
      transform: translateX(-50%) scaleY(var(--oy-line-progress, 0));
      transform-origin: top;
      background: linear-gradient(180deg, transparent, rgba(255, 215, 0, 0.45), transparent);
      box-shadow: 0 0 24px rgba(255, 215, 0, 0.28);
      pointer-events: none;
      opacity: 0.72;
    }

    .oy-philosophy-line {
      transition:
        transform 260ms ease,
        opacity 260ms ease,
        letter-spacing 260ms ease,
        filter 260ms ease;
      will-change: transform, opacity, filter;
    }

    .oy-philosophy-over {
      transition: color 220ms ease, text-shadow 220ms ease;
    }

    .oy-philosophy-line.oy-philosophy-active .oy-philosophy-over,
    .oy-philosophy-line:hover .oy-philosophy-over {
      color: #FFD700 !important;
      text-shadow: 0 0 22px rgba(255, 215, 0, 0.58);
    }

    @media (max-width: 767px) {
      #expertise.oy-3d-expertise > .grid {
        perspective: none;
      }

      #expertise.oy-3d-expertise > .grid > div {
        transform: none !important;
        opacity: 1 !important;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      #expertise.oy-3d-expertise > .grid > div,
      .oy-philosophy-line {
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

    const cards = Array.from(section.querySelectorAll(':scope > .grid > div'));
    if (cards.length < 3) return;

    section.classList.add('oy-3d-expertise');
    cards.forEach((card, index) => {
      card.dataset.oyHover = 'false';
      card.style.setProperty('--oy-delay', `${index * 130}ms`);
      card.addEventListener('mouseenter', () => {
        card.dataset.oyHover = 'true';
        applyExpertiseTransforms(true);
      });
      card.addEventListener('mouseleave', () => {
        card.dataset.oyHover = 'false';
        applyExpertiseTransforms(true);
      });
    });

    function sectionProgress() {
      const rect = section.getBoundingClientRect();
      const viewport = window.innerHeight || 1;
      return clamp((viewport - rect.top) / (viewport * 0.72 + rect.height * 0.35), 0, 1);
    }

    function transformCard(card, values) {
      card.style.opacity = String(values.opacity);
      card.style.transform = `translate3d(${values.x}px, ${values.y}px, ${values.z}px) rotateY(${values.rotateY}deg) scale(${values.scale})`;
    }

    function applyExpertiseTransforms(force) {
      const progress = sectionProgress();
      if (progress > 0.16) section.classList.add('oy-3d-active');

      const leftHover = cards[0].dataset.oyHover === 'true';
      const centerHover = cards[1].dataset.oyHover === 'true';
      const rightHover = cards[2].dataset.oyHover === 'true';

      const left = {
        x: lerp(-100, 0, progress),
        y: lerp(28, 0, progress),
        z: lerp(-200, -50, progress),
        rotateY: lerp(45, 15, progress),
        scale: lerp(0.92, 1, progress),
        opacity: lerp(0.35, 1, progress)
      };

      const center = {
        x: 0,
        y: lerp(100, 0, progress),
        z: lerp(-50, 50, progress),
        rotateY: 0,
        scale: lerp(0.8, 1.05, progress),
        opacity: lerp(0.35, 1, progress)
      };

      const right = {
        x: lerp(100, 0, progress),
        y: lerp(28, 0, progress),
        z: lerp(-200, -50, progress),
        rotateY: lerp(-45, -15, progress),
        scale: lerp(0.92, 1, progress),
        opacity: lerp(0.35, 1, progress)
      };

      if (leftHover) {
        left.z = 20;
        left.rotateY = 0;
        left.scale = 1.02;
      }
      if (centerHover) {
        center.z = 80;
        center.scale = 1.08;
      }
      if (rightHover) {
        right.z = 20;
        right.rotateY = 0;
        right.scale = 1.02;
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
        applyExpertiseTransforms(false);
        ticking = false;
      });
    };

    applyExpertiseTransforms(true);
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
    const section = lines[0].parentElement;
    if (!section) return;

    section.classList.add('oy-philosophy-scroll');
    lines.forEach((line) => {
      line.classList.add('oy-philosophy-line');
      const spans = Array.from(line.querySelectorAll('span'));
      const overSpan = spans.find((span) => (span.textContent || '').trim().toLowerCase() === 'over');
      if (overSpan) overSpan.classList.add('oy-philosophy-over');
    });

    function progress() {
      const rect = section.getBoundingClientRect();
      const viewport = window.innerHeight || 1;
      return clamp((viewport * 0.75 - rect.top) / (rect.height + viewport * 0.5), 0, 1);
    }

    function updateLines() {
      const p = progress();
      section.style.setProperty('--oy-line-progress', String(p));
      const total = lines.length;
      const slice = 1 / total;

      lines.forEach((line, index) => {
        const start = index * slice;
        const peak = start + slice / 2;
        const distance = Math.abs(p - peak);
        const active = distance < 0.18;
        const strength = clamp(1 - distance / 0.26, 0, 1);
        const scale = lerp(0.9, 1.05, strength);
        const opacity = lerp(0.3, 1, strength);
        const letterSpacing = lerp(-0.055, -0.035, strength);

        line.classList.toggle('oy-philosophy-active', active);
        line.style.opacity = String(opacity);
        line.style.transform = `scale(${scale}) translate3d(0, ${lerp(12, 0, strength)}px, 0)`;
        line.style.letterSpacing = `${letterSpacing}em`;
        line.style.filter = strength > 0.45 ? 'brightness(1.08)' : 'brightness(0.92)';
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