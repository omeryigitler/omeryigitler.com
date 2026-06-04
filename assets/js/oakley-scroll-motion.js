(function(){
  if(window.__OY_MOTION_LAYER__) return;
  window.__OY_MOTION_LAYER__='v1';

  const style=document.createElement('style');
  style.id='oyx-motion-style';
  style.textContent=`
    .oyx-shell{transform-style:preserve-3d}.oyx-shell:before{content:"";position:absolute;inset:0;z-index:1;pointer-events:none;background:linear-gradient(110deg,transparent 0%,rgba(255,255,255,.08) 42%,transparent 58%);transform:translateX(-120%);animation:oyxSweep 6s ease-in-out infinite}.oyx-console,.oyx-dev{position:relative;transform:translate3d(0,var(--oyx-y,0),0)}.oyx-console:before,.oyx-dev:before{content:"";position:absolute;left:0;right:0;top:0;height:1px;background:linear-gradient(90deg,transparent,rgba(255,215,0,.75),transparent);transform:translateX(var(--scan-x,-100%));opacity:.8;z-index:9}.oyx-console:after,.oyx-dev:after{content:"";position:absolute;inset:0;pointer-events:none;background:radial-gradient(circle at var(--mx,50%) var(--my,40%),rgba(255,215,0,.08),transparent 16rem);opacity:.9}.oyx-step.active{box-shadow:0 18px 70px -55px var(--t), inset 0 1px 0 rgba(255,255,255,.07)}.oyx-step.active .oyx-num{animation:oyxPulse 1.9s ease-in-out infinite}.oyx-main-device,.oyx-tablet,.oyx-phone,.oyx-window{will-change:transform}.oyx-main-device{animation:oyxFloatMain 5.5s ease-in-out infinite}.oyx-tablet{animation:oyxFloatTablet 6.2s ease-in-out infinite}.oyx-phone{animation:oyxFloatPhone 5.8s ease-in-out infinite}.oyx-row.gold,.oyx-row.blue{position:relative;overflow:hidden}.oyx-row.gold:after,.oyx-row.blue:after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,transparent,rgba(255,255,255,.55),transparent);transform:translateX(-110%);animation:oyxLine 2.8s ease-in-out infinite}.oyx-metric strong{animation:oyxGlowText 2.5s ease-in-out infinite}.oyx-label,.oyx-card,.oyx-spec{transition:transform .25s ease,border-color .25s ease,background .25s ease}.oyx-label:hover,.oyx-card:hover,.oyx-spec:hover{transform:translateY(-3px);border-color:rgba(255,215,0,.26);background:rgba(255,255,255,.045)}
    @keyframes oyxSweep{0%,55%{transform:translateX(-120%);opacity:0}65%{opacity:.75}100%{transform:translateX(120%);opacity:0}}
    @keyframes oyxPulse{0%,100%{box-shadow:0 0 0 rgba(255,215,0,0)}50%{box-shadow:0 0 22px currentColor}}
    @keyframes oyxFloatMain{0%,100%{transform:rotateY(-8deg) rotateX(4deg) translateY(0)}50%{transform:rotateY(-5deg) rotateX(4deg) translateY(-10px)}}
    @keyframes oyxFloatTablet{0%,100%{transform:rotateZ(-6deg) rotateY(14deg) translateY(0)}50%{transform:rotateZ(-8deg) rotateY(10deg) translateY(-8px)}}
    @keyframes oyxFloatPhone{0%,100%{transform:rotateZ(7deg) rotateY(-14deg) translateY(0)}50%{transform:rotateZ(9deg) rotateY(-10deg) translateY(-9px)}}
    @keyframes oyxLine{0%,45%{transform:translateX(-110%)}100%{transform:translateX(110%)}}
    @keyframes oyxGlowText{0%,100%{text-shadow:none}50%{text-shadow:0 0 16px rgba(255,215,0,.5)}}
    @media(max-width:640px){.oyx-main-device{animation:none}.oyx-tablet{animation:none}.oyx-phone{animation:none}}
    @media(prefers-reduced-motion:reduce){.oyx-shell:before,.oyx-main-device,.oyx-tablet,.oyx-phone,.oyx-row:after,.oyx-step.active .oyx-num,.oyx-metric strong{animation:none!important}}
  `;
  document.head.appendChild(style);

  function clamp(n,min,max){return Math.max(min,Math.min(max,n))}
  function tick(){
    const vh=window.innerHeight||1;
    document.querySelectorAll('.oyx-section').forEach(section=>{
      const r=section.getBoundingClientRect();
      const p=clamp((vh-r.top)/(vh+r.height),0,1);
      section.style.setProperty('--scan-x',`${-100+p*200}%`);
      const panel=section.querySelector('.oyx-console,.oyx-dev');
      if(panel) panel.style.setProperty('--oyx-y',`${(0.5-p)*28}px`);
      const main=section.querySelector('.oyx-main-device');
      const tab=section.querySelector('.oyx-tablet');
      const phone=section.querySelector('.oyx-phone');
      if(main) main.style.setProperty('filter',`drop-shadow(0 0 ${8+p*18}px rgba(255,215,0,.12))`);
      if(tab) tab.style.marginLeft=`${(p-.5)*18}px`;
      if(phone) phone.style.marginRight=`${(p-.5)*-18}px`;
    });
    requestAnimationFrame(tick);
  }

  window.addEventListener('pointermove',e=>{
    document.querySelectorAll('.oyx-console,.oyx-dev').forEach(el=>{
      const r=el.getBoundingClientRect();
      const x=((e.clientX-r.left)/r.width)*100;
      const y=((e.clientY-r.top)/r.height)*100;
      if(x>=0&&x<=100&&y>=0&&y<=100){el.style.setProperty('--mx',x+'%');el.style.setProperty('--my',y+'%')}
    })
  },{passive:true});

  requestAnimationFrame(tick);
})();
