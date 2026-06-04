(function(){
  if(window.__OY_EXPERTISE_OPTIONS__) return;
  window.__OY_EXPERTISE_OPTIONS__='v1';

  const style=document.createElement('style');
  style.id='expertise-options-style';
  style.textContent=`
    #expertise{position:relative}
    #expertise:before{content:'OPTION A / PAGE SECTION';position:absolute;top:-2.2rem;left:50%;transform:translateX(-50%);padding:.35rem .7rem;border:1px solid rgba(255,215,0,.22);border-radius:999px;color:#FFD700;background:rgba(255,215,0,.06);font-size:.56rem;font-weight:800;letter-spacing:.16em;white-space:nowrap}
    .oy-exp-fab{position:fixed;right:1.2rem;bottom:1.2rem;z-index:80;display:flex;align-items:center;gap:.55rem;padding:.85rem 1rem;border:1px solid rgba(255,215,0,.34);border-radius:999px;background:rgba(5,5,5,.82);backdrop-filter:blur(18px);color:#FFD700;font-size:.68rem;font-weight:900;letter-spacing:.12em;text-transform:uppercase;box-shadow:0 20px 60px -35px #000;cursor:pointer;transition:.25s}.oy-exp-fab:hover{background:#FFD700;color:#050505;transform:translateY(-2px)}
    .oy-exp-overlay{position:fixed;inset:0;z-index:90;display:flex;align-items:center;justify-content:center;padding:1.2rem;background:rgba(0,0,0,.82);backdrop-filter:blur(14px);opacity:0;visibility:hidden;transition:opacity .35s ease,visibility .35s ease}.oy-exp-overlay.open{opacity:1;visibility:visible}.oy-exp-box{position:relative;width:min(92vw,1120px);max-height:86vh;overflow:auto;padding:clamp(1.2rem,3vw,3rem);border:1px solid rgba(255,255,255,.11);border-radius:1.8rem;background:radial-gradient(circle at 80% 0%,rgba(255,215,0,.08),transparent 22rem),#0a0a0a;box-shadow:0 0 100px rgba(0,0,0,.8);transform:scale(.96);transition:transform .35s ease}.oy-exp-overlay.open .oy-exp-box{transform:scale(1)}.oy-exp-close{position:absolute;right:1rem;top:1rem;width:2.4rem;height:2.4rem;border:1px solid rgba(255,255,255,.1);border-radius:999px;color:white;background:rgba(255,255,255,.04);font-size:1.1rem}.oy-exp-label{display:inline-flex;margin-bottom:1rem;padding:.4rem .75rem;border:1px solid rgba(255,215,0,.25);border-radius:999px;background:rgba(255,215,0,.07);color:#FFD700;font-size:.58rem;font-weight:900;letter-spacing:.16em;text-transform:uppercase}.oy-exp-grid{display:grid;grid-template-columns:1fr;gap:1.6rem}.oy-exp-title{margin:0 0 1.2rem;color:white;font-family:Syncopate,sans-serif;font-size:clamp(1.8rem,4vw,3.6rem);line-height:1;letter-spacing:-.05em;text-transform:uppercase}.oy-exp-title span{display:block;color:transparent;background:linear-gradient(180deg,#fff,#7a808c);-webkit-background-clip:text;background-clip:text}.oy-exp-left{border-right:0;padding-right:0}.oy-tech-grid{display:grid;grid-template-columns:1fr 1fr;gap:.75rem}.oy-tech{display:flex;align-items:center;gap:.7rem;padding:.85rem;border:1px solid rgba(255,255,255,.08);border-radius:.8rem;background:rgba(255,255,255,.045);color:#d1d5db;font-size:.78rem;font-weight:800}.oy-tech i{width:1.05rem;height:1.05rem;color:#FFD700}.oy-quote{margin-top:1.2rem;padding-left:1rem;border-left:2px solid rgba(255,215,0,.35);color:#8b919e;font-size:.72rem;line-height:1.6;font-style:italic}.oy-process{position:relative;padding-left:1rem}.oy-process:before{content:'';position:absolute;left:.22rem;top:.6rem;bottom:.8rem;width:1px;background:linear-gradient(#FFD700,rgba(255,215,0,.25),transparent)}.oy-step{position:relative;display:flex;gap:.9rem;margin-bottom:.85rem}.oy-step-dot{width:.55rem;height:.55rem;margin-top:.45rem;border-radius:999px;background:#2b2f38;box-shadow:0 0 0 5px rgba(255,255,255,.04)}.oy-step:first-child .oy-step-dot{background:#FFD700;box-shadow:0 0 0 5px rgba(255,215,0,.12)}.oy-step-card{flex:1;padding:.85rem;border:1px solid rgba(255,255,255,.08);border-radius:.85rem;background:rgba(255,255,255,.045)}.oy-step-card h5{margin:0 0 .25rem;color:white;font-size:.72rem;font-weight:900;letter-spacing:.11em;text-transform:uppercase}.oy-step:first-child h5{color:#FFD700}.oy-step-card p{margin:0;color:#9ca3af;font-size:.72rem;line-height:1.45}@media(min-width:760px){.oy-exp-grid{grid-template-columns:2fr 3fr}.oy-exp-left{border-right:1px solid rgba(255,255,255,.07);padding-right:2rem}}
  `;
  document.head.appendChild(style);

  const btn=document.createElement('button');
  btn.className='oy-exp-fab';
  btn.type='button';
  btn.textContent='Option B / Expertise Overlay';
  document.body.appendChild(btn);

  const overlay=document.createElement('div');
  overlay.className='oy-exp-overlay';
  overlay.innerHTML=`
    <div class="oy-exp-box" role="dialog" aria-modal="true" aria-label="Expertise overlay option">
      <button class="oy-exp-close" type="button" aria-label="Close">×</button>
      <span class="oy-exp-label">Option B / Full Screen Mega Menu</span>
      <h2 class="oy-exp-title">Expertise <span>System</span></h2>
      <div class="oy-exp-grid">
        <div class="oy-exp-left">
          <h4 class="text-white font-display text-sm mb-6 flex items-center gap-2"><i data-lucide="cpu" class="w-4 h-4 text-taurusGold"></i> Tech Stack</h4>
          <div class="oy-tech-grid">
            <div class="oy-tech"><i data-lucide="atom"></i><span>React / Next.js</span></div>
            <div class="oy-tech"><i data-lucide="wind"></i><span>Tailwind CSS</span></div>
            <div class="oy-tech"><i data-lucide="triangle"></i><span>Vercel</span></div>
            <div class="oy-tech"><i data-lucide="database"></i><span>Headless CMS</span></div>
          </div>
          <blockquote class="oy-quote">I choose tools based on performance, scalability and business goals — not trends.</blockquote>
        </div>
        <div>
          <h4 class="text-white font-display text-sm mb-6 flex items-center gap-2"><i data-lucide="workflow" class="w-4 h-4 text-taurusGold"></i> Process Timeline</h4>
          <div class="oy-process">
            <div class="oy-step"><span class="oy-step-dot"></span><div class="oy-step-card"><h5>1. Discovery</h5><p>Business goals, target audience and competitors.</p></div></div>
            <div class="oy-step"><span class="oy-step-dot"></span><div class="oy-step-card"><h5>2. Design</h5><p>UX-focused, brand-aligned, mobile-first layouts.</p></div></div>
            <div class="oy-step"><span class="oy-step-dot"></span><div class="oy-step-card"><h5>3. Development</h5><p>Clean code, responsive build and performance optimization.</p></div></div>
            <div class="oy-step"><span class="oy-step-dot"></span><div class="oy-step-card"><h5>4. Launch</h5><p>Deploy, monitor, SEO base and support after launch.</p></div></div>
          </div>
        </div>
      </div>
    </div>`;
  document.body.appendChild(overlay);

  const open=()=>{overlay.classList.add('open'); if(window.lucide) window.lucide.createIcons();};
  const close=()=>overlay.classList.remove('open');
  btn.addEventListener('click',open);
  overlay.querySelector('.oy-exp-close').addEventListener('click',close);
  overlay.addEventListener('click',e=>{if(e.target===overlay)close();});
  window.addEventListener('keydown',e=>{if(e.key==='Escape')close();});
  if(window.lucide) window.lucide.createIcons();
})();