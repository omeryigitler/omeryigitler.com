const test=require('node:test');
const assert=require('node:assert/strict');
const {createService,defaultSettings,normalizeRequest,calculate,validateSettings}=require('../lib/studio-leads');
function database(seed={}) {
 const data=new Map(Object.entries(seed));let sequence=0,queue=Promise.resolve();
 const snap=ref=>({exists:data.has(ref.key),data:()=>data.get(ref.key)});
 return {data,collection:name=>({doc:(id=`audit-${++sequence}`)=>({key:`${name}/${id}`,id,get:async()=>snap({key:`${name}/${id}`})})}),
  runTransaction(fn){const work=queue.then(async()=>{let writing=false;const writes=[];const result=await fn({get:async ref=>{assert.equal(writing,false,'Firestore reads must precede writes');return snap(ref);},set:(ref,value,options)=>{writing=true;writes.push(()=>data.set(ref.key,options?.merge?{...data.get(ref.key),...value}:value));}});writes.forEach(fn=>fn());return result;});queue=work.catch(()=>{});return work;},
  batch(){const writes=[];return {set:(ref,value)=>writes.push(()=>data.set(ref.key,value)),commit:async()=>writes.forEach(fn=>fn())};}
 };
}
const message={name:'Example Client',email:'client@example.test',message:'A project brief',status:'new',config:{country:'MT',siteType:'CORPORATE',designType:'CUSTOM',pageCount:3,features:['seo','multilang'],addons:['google_maps'],deliverySpeed:'FAST',maintenanceLevel:'BASIC'}};
test('incoming lead creates linked client, draft quote and project without a browser',async()=>{
 const db=database({'messages/message-1':message}),service=createService(db,()=>1);
 const result=await service.prepare('message-1');
 const project=db.data.get('projects/'+result.projectId),quote=db.data.get('quotes/'+result.quoteId),lead=db.data.get('messages/message-1');
 assert.equal(lead.pipelineStatus,'prepared');assert.equal(lead.dossierCreated,true);assert.equal(quote.status,'draft');assert.equal(project.finalApproved,false);assert.equal(project.workflowStage,'proposal');
 assert.equal(project.hasSeo,true);assert.equal(project.isMultiLang,true);assert.equal(quote.currency,'EUR');assert.equal(quote.breakdown.finalTotal,5025);assert.ok(db.data.has('clients/'+project.clientId));
});
test('concurrent duplicate preparation never duplicates linked records or overwrites an operator stage',async()=>{
 const db=database({'messages/message-1':message}),service=createService(db,()=>1);
 const [one,two]=await Promise.all([service.prepare('message-1'),service.prepare('message-1')]);assert.equal(one.projectId,two.projectId);assert.equal(two.idempotent,true);
 const project=db.data.get('projects/'+one.projectId);project.workflowStage='review';await service.prepare('message-1');assert.equal(project.workflowStage,'review');
 for(const name of ['clients','projects','quotes'])assert.equal([...db.data.keys()].filter(key=>key.startsWith(name+'/')).length,1);
});
test('manual pricing saves recompute totals and ignore a forged browser breakdown',async()=>{
 const db=database(),service=createService(db,()=>1);const input={requestId:'manual-example',request:{customerName:'Example',customerEmail:'example@example.test',country:'MT',siteType:'LANDING',pageCount:2,discountValue:100},breakdown:{finalTotal:0}};
 const one=await service.save(input,{id:'admin'}),two=await service.save(input,{id:'admin'});assert.equal(one.projectId,two.projectId);assert.equal(one.breakdown.finalTotal,900);assert.equal(db.data.get('quotes/'+one.quoteId).totalPrice,900);
});
test('finalized projects and non-lead system records cannot be modified by pricing',async()=>{
 const db=database({'messages/system-record':{...message,type:'report'}}),service=createService(db,()=>1);
 await assert.rejects(service.prepare('system-record'),{code:'not_a_lead'});
 const one=await service.save({requestId:'manual-example',request:{customerName:'Example'}},{id:'admin'});db.data.get('projects/'+one.projectId).finalApproved=true;
 await assert.rejects(service.save({requestId:'manual-example',request:{customerName:'Example',projectId:one.projectId}},{id:'admin'}),{code:'project_finalized'});
});
test('pricing settings validate factors and never accept secret-bearing extra fields',()=>{
 const input={...defaultSettings(),apiKey:'test-only-value'},value=validateSettings(input);assert.equal(value.apiKey,undefined);
 input.config.TR.pageRate=-1;assert.throws(()=>validateSettings(input),{code:'invalid_pricing'});
});
test('country is independent of English UI language and all requested features affect server pricing',()=>{
 const settings=defaultSettings(),tr=normalizeRequest({country:'TR',features:['seo','multilang'],pageCount:3});
 assert.equal(tr.country,'TR');assert.ok(calculate(tr,settings).seo>0);assert.ok(calculate(tr,settings).multiLang>0);
 assert.throws(()=>normalizeRequest({discountValue:Infinity}),{code:'invalid_pricing'});
});

test('a stale pricing configuration cannot silently save a different total',async()=>{
 const db=database(),service=createService(db,()=>1),before=await service.settings();
 const changed=defaultSettings();changed.config.MT.pageRate=120;await service.saveSettings(changed,{id:'admin'});
 await assert.rejects(service.save({requestId:'manual-version-test',pricingVersion:before.version,request:{customerName:'Example',country:'MT'}},{id:'admin'}),{code:'pricing_changed'});
 assert.equal([...db.data.keys()].filter(key=>key.startsWith('quotes/')).length,0);
});

test('contact-derived names and literal search text are escaped before HTML rendering',()=>{
 const vm=require('node:vm'),fs=require('node:fs'),context={};
 vm.runInNewContext(fs.readFileSync('src/admin/search.js','utf8'),context);
 const value='<img src=x onerror=alert(1)> & \"quoted\"';
 assert.equal(context.highlightMatch(value,''),'&lt;img src=x onerror=alert(1)&gt; &amp; &quot;quoted&quot;');
 assert.equal(context.highlightMatch('A [literal] company','[literal]'),'A <span class="search-highlight">[literal]</span> company');
 assert.ok(!context.highlightMatch(value,'img').includes('<img'));
});
