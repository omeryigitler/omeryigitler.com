(function () {
  if (!window.gsap || !window.ScrollTrigger) return;
  gsap.registerPlugin(ScrollTrigger);
  if (window.lucide) window.lucide.createIcons();

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  // 1) Expertise cards — isolated GSAP scroll + CSS hover
  function initExpertiseCards() {
    const section = $('#expertise-lab');
    const stage = $('.expertise-stage');
    const left = $('[data-card="left"]');
    const center = $('[data-card="center"]');
    const right = $('[data-card="right"]');
    if (!section || !stage || !left || !center || !right) return;

    gsap.set(stage, { transformStyle: 'preserve-3d' });
    gsap.set(left, { x: -160, y: 45, z: -260, rotateY: 48, rotateX: 4, scale: .84, opacity: .3, filter: 'blur(3px) brightness(.72)' });
    gsap.set(center, { y: 130, z: -80, rotateX: -4, scale: .78, opacity: .35, filter: 'blur(2px) brightness(.78)' });
    gsap.set(right, { x: 160, y: 45, z: -260, rotateY: -48, rotateX: 4, scale: .84, opacity: .3, filter: 'blur(3px) brightness(.72)' });

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: stage,
        start: 'top 82%',
        end: 'center 45%',
        scrub: .65,
        onEnter: () => $$('.expertise-card').forEach((c, i) => setTimeout(() => c.classList.add('is-sweeping'), i * 120)),
        onLeaveBack: () => $$('.expertise-card').forEach(c => c.classList.remove('is-sweeping'))
      }
    });

    tl.to(left, { x: -10, y: 0, z: -55, rotateY: 14, rotateX: 0, scale: 1, opacity: 1, filter: 'blur(0px) brightness(1)', ease: 'power2.out' }, 0)
      .to(center, { y: 0, z: 70, rotateX: 0, scale: 1.055, opacity: 1, filter: 'blur(0px) brightness(1.04)', ease: 'power2.out' }, 0)
      .to(right, { x: 10, y: 0, z: -55, rotateY: -14, rotateX: 0, scale: 1, opacity: 1, filter: 'blur(0px) brightness(1)', ease: 'power2.out' }, 0);

    const hoverMap = new Map([
      [left, { x: -4, y: -14, z: 145, rotateY: 0, rotateX: -1, scale: 1.055, filter: 'blur(0px) brightness(1.13)' }],
      [center, { x: 0, y: -16, z: 175, rotateY: 0, rotateX: -1, scale: 1.095, filter: 'blur(0px) brightness(1.16)' }],
      [right, { x: 4, y: -14, z: 145, rotateY: 0, rotateX: -1, scale: 1.055, filter: 'blur(0px) brightness(1.13)' }]
    ]);

    $$('.expertise-card').forEach(card => {
      card.addEventListener('mouseenter', () => gsap.to(card, { ...hoverMap.get(card), duration: .34, ease: 'power3.out', overwrite: 'auto' }));
      card.addEventListener('mouseleave', () => ScrollTrigger.refresh(true));
    });
  }

  // 2) Philosophy — pinned readable sequence
  function initPhilosophy() {
    const wrap = $('.philosophy-wrap');
    const pin = $('.philosophy-pin');
    const taurus = $('.taurus-bg');
    const lines = $$('.philosophy-line');
    const copy = $('.philosophy-copy');
    if (!wrap || !pin || lines.length !== 3 || !copy) return;

    gsap.set(lines, { opacity: .16, y: 90, scale: .78, filter: 'blur(2.5px) brightness(.6)' });
    gsap.set(lines[0], { opacity: 1, y: 0, scale: 1.04, filter: 'blur(0px) brightness(1.08)' });
    gsap.set(copy, { autoAlpha: 0, y: 26 });
    gsap.set(taurus, { opacity: .36, scale: 1 });

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: wrap,
        start: 'top top',
        end: '+=2600',
        pin: pin,
        scrub: .7,
        anticipatePin: 1
      }
    });

    function activeLine(index, at) {
      lines.forEach((line, i) => {
        tl.to(line, {
          opacity: i === index ? 1 : .13,
          y: (i - index) * 92,
          scale: i === index ? 1.04 : .78,
          filter: i === index ? 'blur(0px) brightness(1.1)' : 'blur(2.8px) brightness(.55)',
          duration: .55,
          ease: 'power2.inOut'
        }, at);
        tl.to($('.over', line), {
          color: i === index ? '#FFD700' : 'rgba(255,255,255,.34)',
          textShadow: i === index ? '0 0 24px rgba(255,215,0,.65)' : '0 0 0 rgba(0,0,0,0)',
          duration: .3,
          ease: 'none'
        }, at);
      });
    }

    activeLine(0, 0);
    activeLine(1, .9);
    activeLine(2, 1.8);
    tl.to(copy, { autoAlpha: 1, y: 0, duration: .5, ease: 'power2.out' }, 2.45)
      .to(taurus, { opacity: .22, scale: 1.04, duration: .6, ease: 'power2.out' }, 2.45)
      .to(lines, { y: '-=70', opacity: .08, filter: 'blur(4px) brightness(.5)', duration: .6, ease: 'power2.inOut' }, 3.05)
      .to(copy, { y: -18, autoAlpha: 1, duration: .4 }, 3.05);
  }

  // 3) DBS — based on user's GSAP pin/scrub idea
  function initDBS() {
    const pin = $('.dbs-pin');
    if (!pin) return;

    function setStep(i) {
      const data = [
        ['01 / Strategy', 'Structure before pixels', 'Sitemap, user flow and conversion path are defined before the design starts.'],
        ['02 / Interface', 'Design system appears', 'The wireframe becomes a clean visual system with hierarchy, components and rhythm.'],
        ['03 / Development', 'Frontend comes alive', 'Code, performance targets and technical structure connect behind the interface.'],
        ['04 / Launch', 'Responsive release', 'Desktop, tablet and mobile split out from the same system and become launch ready.']
      ];

      $('.dbs-count').textContent = data[i][0];
      $('.dbs-step-text h3').textContent = data[i][1];
      $('.dbs-step-text p').textContent = data[i][2];
      $$('.dbs-tab').forEach((x, n) => x.classList.toggle('on', n === i));
      $$('.dbs-layer').forEach(x => x.classList.remove('on'));
      if (i === 0) $('.layer-wire').classList.add('on');
      if (i === 1) $('.layer-ui').classList.add('on');
      if (i === 2) $('.layer-code').classList.add('on');
      if (i === 3) $('.layer-ui').classList.add('on');
    }

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: '.dbs-pin',
        start: 'top top+=88',
        end: '+=2600',
        pin: true,
        scrub: .75,
        anticipatePin: 1,
        onUpdate: self => {
          const p = self.progress;
          document.documentElement.style.setProperty('--p', p.toFixed(3));
          setStep(Math.min(3, Math.floor(p * 4)));
        }
      }
    });

    tl.from('.dbs-browser', { scale: .78, rotateY: -28, autoAlpha: 0, duration: .9, ease: 'power3.out' }, 0)
      .from('.wire-node', { scale: .6, autoAlpha: 0, stagger: .1, duration: .6 }, .2)
      .from('.wire-line', { scaleX: 0, transformOrigin: 'center', duration: .5 }, .45)
      .to('.layer-wire', { autoAlpha: 0, duration: .25 }, .95)
      .fromTo('.layer-ui', { autoAlpha: 0, y: 30 }, { autoAlpha: 1, y: 0, duration: .45 }, 1.05)
      .from('.ui-card', { y: 30, autoAlpha: 0, stagger: .08, duration: .45 }, 1.2)
      .to('.layer-ui', { autoAlpha: 0, duration: .25 }, 1.9)
      .fromTo('.layer-code', { autoAlpha: 0, x: 30 }, { autoAlpha: 1, x: 0, duration: .45 }, 2.0)
      .from('.code-line', { x: -40, autoAlpha: 0, stagger: .04, duration: .45 }, 2.15)
      .to('.dbs-browser', { left: '16%', top: '9%', width: '64%', height: '48%', rotateY: 0, rotateX: 0, duration: .7 }, 2.75)
      .fromTo('.dbs-tablet', { autoAlpha: 0, x: -80, y: 60 }, { autoAlpha: 1, x: 0, y: 0, duration: .55 }, 2.9)
      .fromTo('.dbs-phone', { autoAlpha: 0, x: 80, y: 60 }, { autoAlpha: 1, x: 0, y: 0, duration: .55 }, 3.02)
      .fromTo('.dbs-badge', { autoAlpha: 0, y: 30 }, { autoAlpha: 1, y: 0, duration: .4 }, 3.18);
  }

  initExpertiseCards();
  initPhilosophy();
  initDBS();
})();
