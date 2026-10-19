const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
const html = read('index.html');
function eventTarget() {
  const events = {};
  return {addEventListener(name, fn) { (events[name] ||= []).push(fn); },
    dispatch(name, properties = {}) { const event = {preventDefault(){this.prevented=true;},stopPropagation(){},...properties}; (events[name]||[]).forEach(fn=>fn(event)); return event; }};
}
function typeHarness(reduce = false) {
  const media = Object.assign(eventTarget(), {matches:reduce});
  const document = Object.assign(eventTarget(), {hidden:false});
  const timers = new Map(); let id=0, visibility;
  const context = {window:{}, document, matchMedia:()=>media, Math:{random:()=>.5},
    setTimeout(fn, delay){timers.set(++id,{fn,delay});return id;},clearTimeout(id){timers.delete(id);}};
  context.IntersectionObserver = class { constructor(fn){visibility=fn;} observe(){} };
  context.window.IntersectionObserver = context.IntersectionObserver;
  const source=read('assets/js/trusted-types-bootstrap.js');
  vm.runInNewContext(source.slice(source.indexOf('window.oyTypewriter ='),source.indexOf('/* Keep the restored')),context);
  const element={textContent:'',closest(){return this;}};
  context.window.oyTypewriter(element,['abc','xy']);
  return {element,media,document,timers,visible(value){visibility([{isIntersecting:value}]);},
    next(){assert.equal(timers.size,1);const [key,timer]=timers.entries().next().value;timers.delete(key);timer.fn();return timer.delay;}};
}
test('shared headline engine deletes, changes phrase, types and holds with hero timing',()=>{
  const h=typeHarness();h.visible(true);
  assert.equal(h.next(),3200);assert.equal(h.element.textContent,'ab');
  assert.equal(h.next(),38);assert.equal(h.next(),38);assert.equal(h.element.textContent,'');
  assert.equal(h.next(),420);assert.equal(h.element.textContent,'x');
  assert.equal(h.next(),99);assert.equal(h.element.textContent,'xy');
  assert.equal(h.next(),3600);assert.equal(h.element.textContent,'x');
  h.visible(false);assert.equal(h.timers.size,0);
});
test('reduced motion and hidden tabs stop timers and safely resume',()=>{
  const h=typeHarness(true);h.visible(true);assert.equal(h.timers.size,0);
  h.media.matches=false;h.media.dispatch('change');assert.equal(h.timers.size,1);
  h.next();h.document.hidden=true;h.document.dispatch('visibilitychange');assert.equal(h.timers.size,0);
  h.document.hidden=false;h.document.dispatch('visibilitychange');assert.equal(h.timers.size,1);
  h.media.matches=true;h.media.dispatch('change');assert.equal(h.timers.size,0);assert.equal(h.element.textContent,'abc');
});
function element(document) {
  const attrs={},classes=new Set();
  return Object.assign(eventTarget(),{attrs,tabIndex:0,disabled:false,
    classList:{add(x){classes.add(x);},remove(x){classes.delete(x);},contains(x){return classes.has(x);},toggle(x,on){if(on===undefined)on=!classes.has(x);on?classes.add(x):classes.delete(x);return on;}},
    setAttribute(k,v){attrs[k]=String(v);},getClientRects(){return [1];},
    focus(){document.activeElement=this;},click(){this.dispatch('click');}});
}
test('modal traps forward/backward Tab and restores its opening control',()=>{
  const document=Object.assign(eventTarget(),{});document.body={style:{},classList:{add(){},remove(){}}};
  const origin=element(document);document.activeElement=origin;
  const first=element(document),last=element(document),panel=element(document),cfg=element(document),ok=element(document);
  cfg.querySelectorAll=()=>[first,last];cfg.querySelector=()=>panel;cfg.contains=el=>[first,last,panel].includes(el);
  const context={document,cfg,ok,ensureTurnstile(){},WeakMap};vm.createContext(context);
  vm.runInContext(html.slice(html.indexOf('            const modalOrigins'),html.indexOf('            // type the section labels')),context);
  context.openModal(cfg);assert.equal(document.activeElement,first);assert.equal(cfg.attrs['aria-hidden'],'false');
  document.dispatch('keydown',{key:'Tab',shiftKey:true});assert.equal(document.activeElement,last);
  document.dispatch('keydown',{key:'Tab',shiftKey:false});assert.equal(document.activeElement,first);
  context.closeModal(cfg);assert.equal(document.activeElement,origin);assert.equal(cfg.attrs['aria-hidden'],'true');
});
test('custom dropdown supports arrow navigation, selection, Escape and ARIA state',()=>{
  const document={};const trigger=element(document),a=element(document),b=element(document),dd=element(document),cfg=element(document);
  a.dataset={value:'standard'};a.textContent='Standard';b.dataset={value:'fast'};b.textContent='Fast';
  const label={textContent:'Standard'},menu=element(document);menu.querySelectorAll=()=>[a,b];
  dd.dataset={group:'deliverySpeed'};dd.querySelector=s=>({'.dd-trigger':trigger,'.dd-label':label,'.dd-menu':menu}[s]);dd.contains=el=>[a,b,trigger].includes(el);
  cfg.querySelectorAll=()=>[dd];const config={deliverySpeed:'standard'};
  const context={document,cfg,config};
  vm.runInNewContext(html.slice(html.indexOf('            // Custom listboxes'),html.indexOf('            // close controls')),context);
  trigger.click();assert.equal(trigger.attrs['aria-expanded'],'true');assert.equal(document.activeElement,a);
  dd.dispatch('keydown',{key:'ArrowDown'});assert.equal(document.activeElement,b);
  dd.dispatch('keydown',{key:'Enter'});assert.equal(config.deliverySpeed,'fast');assert.equal(b.attrs['aria-selected'],'true');assert.equal(trigger.attrs['aria-expanded'],'false');assert.equal(document.activeElement,trigger);
  trigger.click();dd.dispatch('keydown',{key:'Escape'});assert.equal(trigger.attrs['aria-expanded'],'false');assert.equal(document.activeElement,trigger);
});
test('build wiring keeps a single versioned script and identical footers on both pages',()=>{
  const root=path.resolve(__dirname,'..'), writes=new Map();
  const virtualFS={readFileSync(file,encoding){return writes.has(file)?writes.get(file):fs.readFileSync(file,encoding);},writeFileSync(file,value){writes.set(file,value);}};
  const source=read('scripts/wire-instagram.js').split('// Remove the legacy browser read')[0];
  const run=()=>vm.runInNewContext(source,{require(name){return name==='fs'?virtualFS:require(name);},process:{cwd:()=>root}});
  run();const first=writes.get(path.join(root,'index.html'));run();
  const home=writes.get(path.join(root,'index.html')),archive=writes.get(path.join(root,'projects.html'));
  assert.equal(home,first,'build wiring must be idempotent');
  assert.equal([...home.matchAll(/<script[^>]+src="[^\"]*instagram-feed\.js/g)].length,1);
  assert.equal([...home.matchAll(/<script[^>]+src="[^\"]*trusted-types-bootstrap\.js/g)].length,1);
  const footer=text=>text.match(/<footer class="signal-footer"[\s\S]*?<\/footer>/)[0];
  assert.equal(footer(archive),footer(home).replaceAll('href="#contact"','href="/#contact"'));
});
