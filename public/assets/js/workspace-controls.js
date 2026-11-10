/* Custom, keyboard-accessible controls shared by the private workspace and pricing module. */
(() => {
  if (window.TaurusControls) return;
  const selects = new Map();
  let opened = null;
  function close() { if (opened) { opened.menu.hidden = true; opened.trigger.setAttribute('aria-expanded','false'); opened = null; } }
  function labelFor(input) { return input.getAttribute('aria-label') || input.labels?.[0]?.textContent?.trim() || input.name || input.id || 'Choose an option'; }
  function upgrade(select) {
    if (selects.has(select)) return;
    const root = document.createElement('div'); root.className = 'taurus-select';
    const trigger = document.createElement('button'); trigger.type = 'button'; trigger.className = 'taurus-select-trigger';
    trigger.setAttribute('role','combobox'); trigger.setAttribute('aria-expanded','false'); trigger.setAttribute('aria-label',labelFor(select));
    const menu = document.createElement('div'); menu.className = 'taurus-select-menu'; menu.setAttribute('role','listbox'); menu.id = `taurus-select-${selects.size}`; menu.hidden = true;
    trigger.setAttribute('aria-controls',menu.id);
    select.before(root); root.append(select,trigger,menu); select.classList.add('taurus-source-select'); select.tabIndex = -1;
    const item = {select,root,trigger,menu}; selects.set(select,item);
    const sync = () => { trigger.textContent = select.selectedOptions[0]?.textContent || 'Choose an option'; trigger.disabled = select.disabled; };
    function open() {
      close(); sync(); menu.replaceChildren();
      Array.from(select.options).forEach((option,index) => {
        const button = document.createElement('button'); button.type = 'button'; button.setAttribute('role','option'); button.setAttribute('aria-selected',String(option.selected)); button.textContent = option.textContent; button.disabled = option.disabled;
        button.addEventListener('click', () => { select.value=option.value; select.dispatchEvent(new Event('input',{bubbles:true})); select.dispatchEvent(new Event('change',{bubbles:true})); sync(); close(); trigger.focus(); });
        button.addEventListener('keydown', event => {
          const options = Array.from(menu.querySelectorAll('button:not(:disabled)')), at = options.indexOf(button);
          if (['ArrowDown','ArrowUp','Home','End'].includes(event.key)) { event.preventDefault(); options[event.key==='Home'?0:event.key==='End'?options.length-1:(at+(event.key==='ArrowDown'?1:-1)+options.length)%options.length]?.focus(); }
          if (event.key==='Escape') { event.preventDefault(); event.stopPropagation(); close(); trigger.focus(); }
          if (event.key==='Tab') close();
        });
        menu.append(button);
      });
      menu.hidden=false; opened=item; trigger.setAttribute('aria-expanded','true');
      (menu.querySelector('[aria-selected="true"]') || menu.querySelector('button'))?.focus();
    }
    trigger.addEventListener('click',()=> opened===item ? close() : open());
    trigger.addEventListener('keydown',event=>{if(event.key==='ArrowDown'||event.key==='ArrowUp'){event.preventDefault();open();}});
    select.addEventListener('change',sync); item.sync=sync; sync();
  }
  function scan(root = document) { root.querySelectorAll('select').forEach(upgrade); }
  const observer = new MutationObserver(records => { if (records.some(record=>record.addedNodes.length)) scan(); });
  function init() { scan(); observer.observe(document.body,{subtree:true,childList:true}); }
  if (document.readyState==='loading') document.addEventListener('DOMContentLoaded',init,{once:true}); else init();
  document.addEventListener('pointerdown',event=>{if(opened&&!opened.root.contains(event.target))close();});
  setInterval(()=>{for(const [select,item] of selects){if(!select.isConnected)selects.delete(select);else item.sync();}},500);
  let dialogOpen = false;
  async function dialog({title='Taurus',message='',kind='alert',value=''} = {}) {
    if (dialogOpen) return kind==='confirm'?false:null;
    dialogOpen=true; close();
    const previous=document.activeElement, overlay=document.createElement('div'); overlay.className='taurus-dialog-backdrop';
    const form=document.createElement('form'); form.className='taurus-dialog'; form.setAttribute('role','dialog'); form.setAttribute('aria-modal','true'); form.setAttribute('aria-label',title);
    const heading=document.createElement('h2'); heading.textContent=title;
    const copy=document.createElement('p'); copy.textContent=message; form.append(heading,copy);
    let input;
    if(kind==='prompt'){input=document.createElement('input');input.type='text';input.value=value;input.setAttribute('aria-label',message);form.append(input);}
    const actions=document.createElement('div');actions.className='taurus-dialog-actions';
    const cancel=document.createElement('button');cancel.type='button';cancel.textContent='Cancel';
    const ok=document.createElement('button');ok.type='submit';ok.textContent=kind==='confirm'?'Confirm':kind==='prompt'?'Save':'OK';ok.className='taurus-dialog-primary';
    if(kind!=='alert')actions.append(cancel);actions.append(ok);form.append(actions);overlay.append(form);document.body.append(overlay);
    return new Promise(resolve=>{
      function finish(value){document.removeEventListener('keydown',key,true);overlay.remove();dialogOpen=false;previous?.focus();resolve(value);}
      function key(event){if(event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();finish(kind==='confirm'?false:null);}if(event.key==='Tab'){const items=Array.from(form.querySelectorAll('input,button')),first=items[0],last=items[items.length-1];if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}}}
      cancel.onclick=()=>finish(kind==='confirm'?false:null);form.onsubmit=event=>{event.preventDefault();finish(kind==='prompt'?input.value:true);};document.addEventListener('keydown',key,true);(input||ok).focus();
    });
  }
  window.TaurusControls={dialog};
  window.taurusConfirm=message=>dialog({title:'Confirm action',message,kind:'confirm'});
  window.taurusPrompt=(message,value='')=>dialog({title:'Workspace input',message,kind:'prompt',value});
  window.alert=message=>{void dialog({title:'Workspace notice',message:String(message)});};
})();
