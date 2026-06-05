(() => {
  const initExpertise3D = () => {
    const section = document.getElementById('expertise');
    if (!section || section.dataset.expertise3dReady === 'true') return;

    const grid = section.querySelector('.grid.grid-cols-1.md\\:grid-cols-3');
    if (!grid) return;

    const cards = Array.from(grid.children).slice(0, 3);
    if (cards.length !== 3) return;

    section.dataset.expertise3dReady = 'true';
    grid.classList.add('expertise-3d-stage');

    const cardTypes = ['left', 'center', 'right'];
    cards.forEach((card, index) => {
      card.classList.add('expertise-3d-card');
      card.dataset.expertiseCard = cardTypes[index];
    });

    const style = document.createElement('style');
    style.id = 'expertise-3d-scroll-styles';
    style.textContent = `
      #expertise .expertise-3d-stage {
        perspective: 1200px;
        transform-style: preserve-3d;
        align-items: stretch;
        overflow: visible;
      }

      #expertise .expertise-3d-card {
        position: relative;
        transform-style: preserve-3d;
        will-change: transform;
        transition: transform 260ms ease, border-color 300ms ease, background-color 300ms ease, box-shadow 300ms ease;
        backface-visibility: hidden;
        z-index: 1;
      }

      #expertise .expertise-3d-card[data-expertise-card="center"] {
        z-index: 2;
        box-shadow: 0 28px 80px rgba(0, 0, 0, 0.32);
      }

      #expertise .expertise-3d-card.is-expertise-hovered {
        z-index: 20 !important;
        box-shadow: 0 34px 90px rgba(255, 215, 0, 0.16), 0 18px 50px rgba(0, 0, 0, 0.48);
      }

      @media (max-width: 767px) {
        #expertise .expertise-3d-stage {
          perspective: none;
        }

        #expertise .expertise-3d-card {
          transform: none !important;
        }
      }
    `;
    document.head.appendChild(style);

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
    const mix = (from, to, progress) => from + (to - from) * progress;

    const states = {
      left: {
        from: { x: -100, y: 0, z: -200, rotateY: 45, scale: 1 },
        to: { x: 0, y: 0, z: -50, rotateY: 15, scale: 1 },
        hover: { x: 12, y: -10, z: 110, rotateY: -12, scale: 1.07 }
      },
      center: {
        from: { x: 0, y: 100, z: -50, rotateY: 0, scale: 0.8 },
        to: { x: 0, y: 0, z: 50, rotateY: 0, scale: 1.05 },
        hover: { x: 0, y: -12, z: 130, rotateY: 0, scale: 1.1 }
      },
      right: {
        from: { x: 100, y: 0, z: -200, rotateY: -45, scale: 1 },
        to: { x: 0, y: 0, z: -50, rotateY: -15, scale: 1 },
        hover: { x: -12, y: -10, z: 110, rotateY: 12, scale: 1.07 }
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
        cards.forEach((item) => item.classList.toggle('is-expertise-hovered', item === card));
        requestRender();
      });

      card.addEventListener('mouseleave', () => {
        hoveredCard = null;
        cards.forEach((item) => item.classList.remove('is-expertise-hovered'));
        requestRender();
      });
    });

    window.addEventListener('scroll', requestRender, { passive: true });
    window.addEventListener('resize', requestRender);
    render();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initExpertise3D, { once: true });
  } else {
    initExpertise3D();
  }
})();
