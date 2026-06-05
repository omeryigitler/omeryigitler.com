(function () {
  if (window.__OY_SAFE_MOTION__) return;
  window.__OY_SAFE_MOTION__ = 'v3';

  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = (t) => {
    t = clamp(t, 0, 1);
    return t * t * (3 - 2 * t);
  };

  const style = document.createElement('style');
  style.id = 'oy-safe-motion-style';
  style.textContent = `
    #expertise.oy-expertise-3d { isolation: isolate; }
    #expertise.oy-expertise-3d > .grid {
      perspective: 1500px;
      perspective-origin: 50% 46%;
      transform-style: preserve-3d;
      overflow: visible;
    }
    #expertise.oy-expertise-3d > .grid > div {
      position: relative;
      transform-style: preserve-3d;
      backface-visibility: hidden;
      will-change: transform, opacity, filter;
      transform-origin: center center;
      cursor: pointer;
      transition: border-color 220ms ease, background 220ms ease, box-shadow 220ms ease, filter 220ms ease;
    }
    #expertise.oy-expertise-3d > .grid > div.oy-hovering,
    #expertise.oy-expertise-3d > .grid > div:hover {
      border-color: rgba(255,215,0,.46) !important;
      background: radial-gradient(circle at 50% 0%, rgba(255,215,0,.14), transparent 62%), rgba(255,255,255,.07) !important;
      box-shadow: 0 42px 120px -58px rgba(255,215,0,.85), inset 0 1px 0 rgba(255,255,255,.12) !important;
      z-index: 20;
    }
    #expertise.oy-expertise-3d > .grid > div.oy-hovering h3,
    #expertise.oy-expertise-3d > .grid > div:hover h3 {
      color: #fff !important;
      text-shadow: 0 0 18px rgba(255,255,255,.18);
    }
    #expertise.oy-expertise-3d > .grid > div.oy-hovering i,
    #expertise.oy-expertise-3d > .grid > div:hover i {
      filter: drop-shadow(0 0 14px rgba(255,215,0,.55));
    }
    #expertise.oy-expertise-3d > .grid > div::after {
      content: "";
      position: absolute;
      inset: 0;
      pointer-events: none;
      opacity: var(--oy-card-sheen, 0);
      background: linear-gradient(105deg, transparent 0%, rgba(255,255,255,.11) 45%, transparent 62%);
      transform: translateX(var(--oy-card-sheen-x, -120%));
    }
    .oy-philosophy-safe {
      position: relative;
      isolation: isolate;
      padding-top: clamp(4rem, 8vw, 7rem) !important;
      padding-bottom: clamp(4rem, 8vw, 7rem) !important;
    }
    .oy-philosophy-safe .oy-philosophy-line {
      position: relative;
      z-index: 3;
      will-change: transform, opacity, filter;
      transform-origin: center center;
      transition: text-shadow 180ms ease;
    }
    .oy-philosophy-safe .oy-philosophy-over {
      transition: color 180ms ease, text-shadow 180ms ease;
    }
    .oy-philosophy-safe .oy-philosophy-line.oy-active .oy-philosophy-over,
    .oy-philosophy-safe .oy-philosophy-line:hover .oy-philosophy-over {
      color: #FFD700 !important;
      text-shadow: 0 0 22px rgba(255,215,0,.65);
    }
    .oy-philosophy-safe .oy-taurus-backdrop {
      transform: translate(-50%, -50%) !important;
      filter: none !important;
      opacity: .34 !important;
      pointer-events: none !important;
      z-index: 0 !important;
    }
    .oy-philosophy-safe::after {
      content: "";
      position: absolute;
      left: 50%;
      top: 14%;
      bottom: 14%;
      width: 1px;
      transform: translateX(-50%);
      background: linear-gradient(180deg, transparent, rgba(255,215,0,.28), transparent);
      box-shadow: 0 0 28px rgba(255,215,0,.15);
      pointer-events: none;
      z-index: 1;
    }
    @media (max-width: 767px), (prefers-reduced-motion: reduce) {
      #expertise.oy-expertise-3d > .grid > div,
      .oy-philosophy-safe .oy-philosophy-line {
        transform: none !important;
        opacity: 1 !important;
        filter: none !important;
      }
    }
  `;
  document.head.appendChild(style);

  function makeRafUpdater(callback) {
    let ticking = false;
    return () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        callback();
        ticking = false;
      });
    };
  }

  function initExpertise3D() {
    const section = document.getElementById('expertise');
    if (!section) return;

    const grid = section.querySelector(':scope > .grid');
    const cards = Array.from(section.querySelectorAll(':scope > .grid > div')).slice(0, 3);
    if (!grid || cards.length !== 3) return;

    section.classList.add('oy-expertise-3d');

    cards.forEach((card, index) => {
      card.dataset.hover = 'false';
      const enter = () => {
        card.dataset.hover = 'true';
        card.classList.add('oy-hovering');
        update();
      };
      const leave = () => {
        card.dataset.hover = 'false';
        card.classList.remove('oy-hovering');
        update();
      };
      card.addEventListener('mouseenter', enter);
      card.addEventListener('mouseleave', leave);
      card.addEventListener('pointerenter', enter);
      card.addEventListener('pointerleave', leave);
      card.style.setProperty('--oy-card-sheen', '0');
      card.style.setProperty('--oy-card-sheen-x', '-120%');
    });

    function progress() {
      const rect = grid.getBoundingClientRect();
      const viewport = window.innerHeight || 1;
      const start = viewport * 1.02;
      const end = viewport * 0.34;
      return clamp((start - rect.top) / (start - end), 0, 1);
    }

    function apply(card, values) {
      card.style.opacity = values.opacity.toFixed(3);
      card.style.transform = [
        `translate3d(${values.x.toFixed(1)}px, ${values.y.toFixed(1)}px, ${values.z.toFixed(1)}px)`,
        `rotateY(${values.ry.toFixed(1)}deg)`,
        `rotateX(${values.rx.toFixed(1)}deg)`,
        `scale(${values.scale.toFixed(3)})`
      ].join(' ');
      card.style.filter = `brightness(${values.brightness.toFixed(3)}) blur(${values.blur.toFixed(2)}px)`;
    }

    function update() {
      const raw = progress();
      const p = smooth(raw);
      const sheen = raw > 0.12 && raw < 0.82 ? 1 : 0;
      const sheenX = `${lerp(-120, 120, raw)}%`;

      const values = [
        {
          x: lerp(-300, -22, p),
          y: lerp(72, 0, p),
          z: lerp(-620, -95, p),
          ry: lerp(78, 16, p),
          rx: lerp(6, 0, p),
          scale: lerp(0.72, 0.985, p),
          opacity: lerp(0.04, 1, p),
          brightness: lerp(0.6, 1, p),
          blur: lerp(4.5, 0, p)
        },
        {
          x: 0,
          y: lerp(158, 0, p),
          z: lerp(-200, 90, p),
          ry: 0,
          rx: lerp(-5, 0, p),
          scale: lerp(0.7, 1.055, p),
          opacity: lerp(0.08, 1, p),
          brightness: lerp(0.7, 1.04, p),
          blur: lerp(3.5, 0, p)
        },
        {
          x: lerp(300, 22, p),
          y: lerp(72, 0, p),
          z: lerp(-620, -95, p),
          ry: lerp(-78, -16, p),
          rx: lerp(6, 0, p),
          scale: lerp(0.72, 0.985, p),
          opacity: lerp(0.04, 1, p),
          brightness: lerp(0.6, 1, p),
          blur: lerp(4.5, 0, p)
        }
      ];

      cards.forEach((card, index) => {
        card.style.setProperty('--oy-card-sheen', String(sheen));
        card.style.setProperty('--oy-card-sheen-x', sheenX);
        const hovered = card.dataset.hover === 'true' || card.matches(':hover');
        const v = values[index];
        if (hovered) {
          v.x = index === 0 ? -4 : index === 2 ? 4 : 0;
          v.y = -18;
          v.z = index === 1 ? 190 : 170;
          v.ry = 0;
          v.rx = -1;
          v.scale = index === 1 ? 1.105 : 1.065;
          v.opacity = 1;
          v.brightness = 1.18;
          v.blur = 0;
        }
        apply(card, v);
      });
    }

    const onUpdate = makeRafUpdater(update);
    update();
    window.addEventListener('scroll', onUpdate, { passive: true });
    window.addEventListener('resize', onUpdate, { passive: true });
  }

  function initPhilosophySafe() {
    const allHeadings = Array.from(document.querySelectorAll('h2'));
    const lines = allHeadings.filter((heading) => {
      const text = (heading.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
      return text.includes('balance') || text.includes('symmetry') || text.includes('quality');
    }).slice(0, 3);

    if (lines.length !== 3) return;

    const lineGroup = lines[0].parentElement;
    const root = lineGroup && lineGroup.parentElement;
    if (!lineGroup || !root) return;

    root.classList.add('oy-philosophy-safe');

    const taurus = Array.from(lineGroup.children).find((el) => (el.textContent || '').trim() === 'TAURUS');
    if (taurus) taurus.classList.add('oy-taurus-backdrop');

    lines.forEach((line) => {
      line.classList.add('oy-philosophy-line');
      const over = Array.from(line.querySelectorAll('span')).find((span) => (span.textContent || '').trim().toLowerCase() === 'over');
      if (over) over.classList.add('oy-philosophy-over');
    });

    const copyBlock = Array.from(root.children).find((el) => el !== lineGroup && el.querySelector && el.querySelector('p'));

    function progress() {
      const rect = root.getBoundingClientRect();
      const viewport = window.innerHeight || 1;
      const start = viewport * 1.0;
      const end = viewport * 0.16;
      return clamp((start - rect.top) / (start - end), 0, 1);
    }

    function update() {
      const p = progress();
      const active = p * 2;

      lines.forEach((line, index) => {
        const dist = Math.abs(active - index);
        const strength = smooth(1 - clamp(dist / 0.72, 0, 1));
        const y = (index - active) * 36;
        const opacity = lerp(0.14, 1, strength);
        const scale = lerp(0.82, 1.03, strength);
        const blur = lerp(1.1, 0, strength);
        const brightness = lerp(0.62, 1.12, strength);

        line.classList.toggle('oy-active', strength > 0.6);
        line.style.opacity = opacity.toFixed(3);
        line.style.transform = `translate3d(0, ${y.toFixed(1)}px, 0) scale(${scale.toFixed(3)})`;
        line.style.filter = `blur(${blur.toFixed(2)}px) brightness(${brightness.toFixed(3)})`;
      });

      if (copyBlock) {
        const showCopy = smooth((p - 0.68) / 0.22);
        copyBlock.style.opacity = showCopy.toFixed(3);
        copyBlock.style.transform = `translateY(${lerp(14, 0, showCopy).toFixed(1)}px)`;
      }
    }

    const onUpdate = makeRafUpdater(update);
    update();
    window.addEventListener('scroll', onUpdate, { passive: true });
    window.addEventListener('resize', onUpdate, { passive: true });
  }

  function boot() {
    initExpertise3D();
    initPhilosophySafe();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();