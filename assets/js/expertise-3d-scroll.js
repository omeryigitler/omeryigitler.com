(() => {
  const section = document.getElementById('expertise');
  if (!section) return;

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const cards = Array.from(section.querySelectorAll('.expertise-3d-card'));
  if (!cards.length) return;

  const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
  const mix = (from, to, progress) => from + (to - from) * progress;

  const states = {
    left: {
      from: { x: -100, y: 0, z: -200, rotateY: 45, scale: 1 },
      to: { x: 0, y: 0, z: -50, rotateY: 15, scale: 1 },
      hover: { x: 0, y: -8, z: 20, rotateY: 0, scale: 1.04 }
    },
    center: {
      from: { x: 0, y: 100, z: -50, rotateY: 0, scale: 0.8 },
      to: { x: 0, y: 0, z: 50, rotateY: 0, scale: 1.05 },
      hover: { x: 0, y: -12, z: 90, rotateY: 0, scale: 1.1 }
    },
    right: {
      from: { x: 100, y: 0, z: -200, rotateY: -45, scale: 1 },
      to: { x: 0, y: 0, z: -50, rotateY: -15, scale: 1 },
      hover: { x: 0, y: -8, z: 20, rotateY: 0, scale: 1.04 }
    }
  };

  let progress = 0;
  let ticking = false;
  let hoveredCard = null;

  const getProgress = () => {
    const rect = section.getBoundingClientRect();
    const viewport = window.innerHeight || document.documentElement.clientHeight;
    return clamp((viewport * 0.82 - rect.top) / (rect.height + viewport * 0.15), 0, 1);
  };

  const buildTransform = (state) => (
    `translate3d(${state.x}px, ${state.y}px, ${state.z}px) rotateY(${state.rotateY}deg) scale(${state.scale})`
  );

  const applyCardState = (card) => {
    const type = card.dataset.expertiseCard;
    const config = states[type];
    if (!config) return;

    const target = card === hoveredCard ? config.hover : {
      x: mix(config.from.x, config.to.x, progress),
      y: mix(config.from.y, config.to.y, progress),
      z: mix(config.from.z, config.to.z, progress),
      rotateY: mix(config.from.rotateY, config.to.rotateY, progress),
      scale: mix(config.from.scale, config.to.scale, progress)
    };

    card.style.transform = buildTransform(target);
  };

  const render = () => {
    progress = prefersReducedMotion ? 1 : getProgress();
    cards.forEach(applyCardState);
    ticking = false;
  };

  const requestRender = () => {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(render);
  };

  cards.forEach((card) => {
    card.addEventListener('mouseenter', () => {
      if (window.innerWidth < 768) return;
      hoveredCard = card;
      requestRender();
    });

    card.addEventListener('mouseleave', () => {
      hoveredCard = null;
      requestRender();
    });
  });

  window.addEventListener('scroll', requestRender, { passive: true });
  window.addEventListener('resize', requestRender);
  render();
})();
