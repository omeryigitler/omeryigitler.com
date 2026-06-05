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
      card.classList.add('expertise-3d-card', `expertise-card-${index}`);
      card.dataset.expertiseCard = cardTypes[index];
    });

    const style = document.createElement('style');
    style.id = 'expertise-3d-scroll-styles';
    style.textContent = `
      #expertise .expertise-3d-stage {
        perspective: 1200px;
        perspective-origin: 50% 42%;
        transform-style: preserve-3d;
        align-items: stretch;
        overflow: visible;
      }

      #expertise .expertise-3d-card {
        position: relative;
        transform-style: preserve-3d;
        will-change: transform, opacity;
        backface-visibility: hidden;
        z-index: 1;
        cursor: default;
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
          opacity: 1 !important;
        }
      }
    `;
    document.head.appendChild(style);

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
    const lerp = (from, to, progress) => from + (to - from) * progress;
    const easeOut3 = (t) => 1 - Math.pow(1 - t, 3);

    let rawProgress = 0;
    let hoveredCard = null;
    let ticking = false;

    const getRawProgress = () => {
      const rect = section.getBoundingClientRect();
      const viewport = window.innerHeight || document.documentElement.clientHeight;

      // Same feel as the uploaded React sample: reveal over roughly 78% of viewport height.
      return clamp((viewport * 0.9 - rect.top) / (viewport * 0.78), 0, 1);
    };

    const getCardState = (card) => {
      const type = card.dataset.expertiseCard;
      const p = prefersReducedMotion ? 1 : easeOut3(rawProgress);
      const isHovered = hoveredCard === card;

      let rotateY = 0;
      let translateX = 0;
      let translateY = 0;
      let translateZ = 0;
      let scale = 1;
      let opacity = lerp(0.08, 1, p);

      if (window.innerWidth < 768) {
        return {
          opacity: lerp(0.05, 1, p),
          transform: `translateY(${lerp(28, 0, p)}px)`,
          transition: 'transform 0.05s linear, opacity 0.05s linear'
        };
      }

      if (type === 'left') {
        if (isHovered) {
          // Uploaded sample logic: side card flattens, comes forward, and grows.
          translateZ = 22;
          scale = 1.045;
        } else {
          rotateY = lerp(44, 14, p);
          translateX = lerp(-72, 0, p);
          translateZ = lerp(-200, -50, p);
          scale = lerp(0.86, 1, p);
        }
      }

      if (type === 'center') {
        if (isHovered) {
          translateY = -10;
          translateZ = 68;
          scale = 1.08;
        } else {
          translateY = lerp(80, -32, p);
          translateZ = lerp(-50, 52, p);
          scale = lerp(0.8, 1.05, p);
        }
      }

      if (type === 'right') {
        if (isHovered) {
          // Uploaded sample logic: side card flattens, comes forward, and grows.
          translateZ = 22;
          scale = 1.045;
        } else {
          rotateY = lerp(-44, -14, p);
          translateX = lerp(72, 0, p);
          translateZ = lerp(-200, -50, p);
          scale = lerp(0.86, 1, p);
        }
      }

      return {
        opacity,
        transform: `translateX(${translateX}px) translateY(${translateY}px) translateZ(${translateZ}px) rotateY(${rotateY}deg) scale(${scale})`,
        transition: isHovered
          ? 'transform 0.38s cubic-bezier(0.23, 1, 0.32, 1), opacity 0.2s ease'
          : 'transform 0.05s linear, opacity 0.05s linear'
      };
    };

    const applyCardState = (card) => {
      const state = getCardState(card);
      card.style.opacity = state.opacity;
      card.style.transform = state.transform;
      card.style.transition = state.transition;
    };

    const render = () => {
      rawProgress = getRawProgress();
      cards.forEach(applyCardState);
      ticking = false;
    };

    const requestRender = () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(render);
    };

    cards.forEach((card) => {
      card.addEventListener('pointerenter', () => {
        if (window.innerWidth < 768) return;
        hoveredCard = card;
        cards.forEach((item) => item.classList.toggle('is-expertise-hovered', item === card));
        requestRender();
      });

      card.addEventListener('pointerleave', () => {
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
