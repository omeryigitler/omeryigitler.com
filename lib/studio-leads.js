const crypto = require('node:crypto');
const { pricingConfig } = require('./pricing');
const { failure, assertIsolatedPreview } = require('./studio-policy');
const clone = value => JSON.parse(JSON.stringify(value));
const text = (value, max = 200) => typeof value === 'string' ? value.trim().slice(0, max) : '';
const ADDON_LABELS = { logo_design: 'Logo design', content_writing: 'Content writing', social_media: 'Social media setup', google_maps: 'Google Maps listing' };
function defaultSettings() {
  const config = clone(pricingConfig.countries);
  for (const [country, rules] of Object.entries(config)) {
    rules.currencySymbol = country === 'MT' ? '€' : '₺';
    rules.factors.multiLang = rules.factors.multilang; delete rules.factors.multilang;
    rules.factors.ecommerce = { value: 0, type: 'FIXED' };
  }
  return { config, addons: Object.entries(pricingConfig.addons).map(([id, prices]) => ({ id, label: ADDON_LABELS[id] || id, description: '', priceTR: { value: prices.TR, type: 'FIXED' }, priceMT: { value: prices.MT, type: 'FIXED' } })) };
}
function amount(value, max = 10000000) {
  if (!Number.isFinite(value) || value < 0 || value > max) throw failure('invalid_pricing', 'Pricing values must be finite non-negative numbers within the supported limits.', 400);
  return value;
}
function factor(value) {
  if (!value || !['FIXED', 'PERCENTAGE'].includes(value.type)) throw failure('invalid_pricing', 'Invalid pricing factor.', 400);
  return { type: value.type, value: amount(value.value, value.type === 'PERCENTAGE' ? 100 : 10000000) };
}
function validateSettings(input) {
  if (!input?.config || !Array.isArray(input.addons) || input.addons.length > 50) throw failure('invalid_pricing', 'A pricing configuration and at most 50 add-ons are required.', 400);
  const config = defaultSettings().config;
  for (const country of ['TR', 'MT']) {
    const value = input.config[country], rules = config[country];
    if (!value) throw failure('invalid_pricing', 'Both market configurations are required.', 400);
    for (const key of Object.keys(rules.basePrices)) rules.basePrices[key] = amount(value.basePrices?.[key]);
    rules.pageRate = amount(value.pageRate);
    for (const key of Object.keys(rules.maintenanceRates)) rules.maintenanceRates[key] = factor(value.maintenanceRates?.[key]);
    for (const key of Object.keys(rules.factors)) rules.factors[key] = factor(value.factors?.[key]);
    for (const key of Object.keys(rules.speedMultipliers)) {
      const speed = value.speedMultipliers?.[key];
      if (!Number.isFinite(speed) || speed < 1 || speed > 10) throw failure('invalid_pricing', 'Delivery multipliers must be between 1 and 10.', 400);
      rules.speedMultipliers[key] = speed;
    }
  }
  const ids = new Set();
  const addons = input.addons.map(item => {
    if (!/^[a-zA-Z0-9_-]{1,64}$/.test(item?.id || '') || ids.has(item.id) || !text(item.label)) throw failure('invalid_pricing', 'Add-ons need unique identifiers and a label.', 400);
    ids.add(item.id);
    return { id: item.id, label: text(item.label), description: text(item.description, 500), priceTR: factor(item.priceTR), priceMT: factor(item.priceMT) };
  });
  return { config, addons };
}
function normalizeRequest(input = {}) {
  const nested = input.config || {};
  const merged = { ...input, ...nested };
  const enumValue = (value, values, fallback) => values.includes(value) ? value : fallback;
  const features = Array.isArray(merged.features) ? merged.features : [];
  return {
    customerName: text(input.customerName || input.clientName || input.name, 120), customerEmail: text(input.customerEmail || input.clientEmail || input.email, 160).toLowerCase(),
    country: merged.country === 'MT' ? 'MT' : 'TR',
    siteType: enumValue(merged.siteType || merged.projectType, ['LANDING','PROMO','CORPORATE','ECOMMERCE','PORTAL'], 'CORPORATE'),
    designType: enumValue(merged.designType, ['TEMPLATE','CUSTOM'], 'TEMPLATE'),
    pageCount: Math.max(1, Math.min(50, parseInt(merged.pageCount, 10) || 1)),
    deliverySpeed: enumValue(merged.deliverySpeed, ['STANDARD','FAST','URGENT'], 'STANDARD'),
    maintenanceLevel: enumValue(merged.maintenanceLevel, ['NONE','BASIC','MID','PREMIUM'], 'NONE'),
    hasSeo: merged.hasSeo === true || features.includes('seo'), isMultiLang: merged.isMultiLang === true || features.includes('multilang'),
    hasGraphics: merged.hasGraphics === true || features.includes('graphics'), hasUx: merged.hasUx === true || features.includes('ux'), hasCrm: merged.hasCrm === true || features.includes('crm'),
    selectedAddons: [...new Set((Array.isArray(merged.selectedAddons) ? merged.selectedAddons : Array.isArray(merged.addons) ? merged.addons : []).filter(id => typeof id === 'string'))].slice(0, 50),
    discountType: merged.discountType === 'PERCENTAGE' ? 'PERCENTAGE' : 'FIXED', discountValue: amount(Number(merged.discountValue || 0))
  };
}
function calculate(request, settings) {
  const rules = settings.config[request.country];
  const cost = (base, value) => value.type === 'PERCENTAGE' ? base * value.value / 100 : value.value;
  const base = rules.basePrices[request.siteType], pages = request.pageCount * rules.pageRate, scope = base + pages;
  const breakdown = { base, pages, design: request.designType === 'CUSTOM' ? cost(scope, rules.factors.design) : 0 };
  for (const [key, enabled] of [['seo',request.hasSeo],['multiLang',request.isMultiLang],['graphics',request.hasGraphics],['ux',request.hasUx],['crm',request.hasCrm]]) breakdown[key] = enabled ? cost(scope, rules.factors[key]) : 0;
  const beforeAddons = Object.values(breakdown).reduce((a,b) => a+b,0);
  breakdown.addons = settings.addons.filter(item => request.selectedAddons.includes(item.id)).reduce((total,item) => total + cost(beforeAddons, item[request.country === 'TR' ? 'priceTR' : 'priceMT']), 0);
  breakdown.subtotal = beforeAddons + breakdown.addons;
  breakdown.totalOneTime = breakdown.subtotal * rules.speedMultipliers[request.deliverySpeed];
  breakdown.speed = breakdown.totalOneTime - breakdown.subtotal;
  breakdown.discountAmount = Math.min(breakdown.totalOneTime, request.discountType === 'PERCENTAGE' ? breakdown.totalOneTime * Math.min(100, request.discountValue) / 100 : request.discountValue);
  breakdown.finalTotal = breakdown.totalOneTime - breakdown.discountAmount;
  breakdown.totalMonthly = cost(breakdown.totalOneTime, rules.maintenanceRates[request.maintenanceLevel]);
  return breakdown;
}
function pricingVersion(value) { return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex'); }
function createService(db, stamp = Date.now) {
  const configRef = db.collection('studio_config').doc('pricing');
  async function settings() { const doc = await configRef.get(); const value = doc.exists ? validateSettings(doc.data()) : defaultSettings(); return { ...value, version: pricingVersion(value) }; }
  async function saveSettings(input, actor) {
    assertIsolatedPreview();
    const value = validateSettings(input), batch = db.batch();
    batch.set(configRef, { ...value, updatedAt: stamp(), updatedBy: actor.id });
    batch.set(db.collection('studio_audit').doc(), { action: 'pricing_settings_saved', actorId: actor.id, at: stamp() });
    await batch.commit(); return { ...value, version: pricingVersion(value) };
  }
  async function save(body, actor = { id: 'contact_pipeline' }, automatic = false) {
    assertIsolatedPreview();
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw failure('invalid_request', 'A pricing request object is required.', 400);
    const requestId = text(body.requestId,100);
    if (!/^[a-zA-Z0-9_-]{8,100}$/.test(requestId)) throw failure('invalid_request_id', 'A stable request identifier is required.', 400);
    const messageId = text(body.messageId || body.request?.messageId, 100), requestedProject = text(body.projectId || body.request?.projectId,100);
    for (const id of [messageId,requestedProject]) if (id && !/^[a-zA-Z0-9_-]{1,100}$/.test(id)) throw failure('invalid_id','Invalid related record.',400);
    const msgRef = messageId ? db.collection('messages').doc(messageId) : null;
    return db.runTransaction(async tx => {
      const configDoc = await tx.get(configRef);
      const config = configDoc.exists ? validateSettings(configDoc.data()) : defaultSettings();
      if (!automatic && body.pricingVersion && body.pricingVersion !== pricingVersion(config)) throw failure('pricing_changed', 'Pricing rates changed. Retry the connection to refresh prices before saving.', 409);
      const msgDoc = msgRef ? await tx.get(msgRef) : null, message = msgDoc?.data() || {};
      if (msgRef && !msgDoc.exists) throw failure('source_message_missing','The source message is no longer available.',404);
      if (message.type === 'report' || message.email === 'tracker@taurus.sys') throw failure('not_a_lead','System messages cannot enter the sales pipeline.',400);
      if (automatic && message.quoteId && message.projectId) { tx.set(msgRef, { pipelineStatus: 'prepared', pipelineVersion: 1 }, { merge: true }); return { quoteId: message.quoteId, projectId: message.projectId, idempotent: true }; }
      const request = normalizeRequest(automatic ? message : body.request);
      if (!request.customerName || (request.customerEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(request.customerEmail))) throw failure('invalid_client','A client name is required. If provided, the email address must be valid.',400);
      const projectId = message.projectId || requestedProject || `studio_${requestId}`;
      const projectRef = db.collection('projects').doc(projectId), projectDoc = await tx.get(projectRef), existingProject = projectDoc.data() || {};
      if (requestedProject && !projectDoc.exists) throw failure('project_missing','The related project no longer exists.',404);
      if (existingProject.finalApproved) throw failure('project_finalized','A finalized project cannot be repriced.',409);
      const quoteId = message.quoteId || existingProject.quoteId || `studio_${requestId}`;
      const quoteRef = db.collection('quotes').doc(quoteId), quoteDoc = await tx.get(quoteRef), existingQuote = quoteDoc.data() || {};
      const email = request.customerEmail || `${requestId}@system.local`;
      const clientId = existingProject.clientId || Buffer.from(email).toString('base64').replace(/[^a-zA-Z0-9]/g,'_');
      const clientRef = db.collection('clients').doc(clientId), clientDoc = await tx.get(clientRef), existingClient = clientDoc.data() || {};
      const at = stamp(), year = new Date().getUTCFullYear(), code = crypto.createHash('sha256').update(requestId).digest('hex').slice(0,8).toUpperCase();
      const breakdown = calculate(request,config), currency = request.country === 'MT' ? 'EUR' : 'TRY';
      const ids = (key,id) => [...new Set([...(Array.isArray(existingClient[key]) ? existingClient[key] : []), ...(id ? [id] : [])])];
      const projects = ids('projectIds',projectId), quotes = ids('quoteIds',quoteId), messages = ids('messageIds',messageId);
      tx.set(clientRef, { name: request.customerName, email, createdAt: existingClient.createdAt || at, lastContactDate: at,
        projectIds:projects, quoteIds:quotes, messageIds:messages,
        totalProjects:Math.max(existingClient.totalProjects || 0,projects.length),totalQuotes:Math.max(existingClient.totalQuotes || 0,quotes.length),totalMessages:Math.max(existingClient.totalMessages || 0,messages.length) },{merge:true});
      tx.set(quoteRef, { ...request, quoteNumber:existingQuote.quoteNumber || `QA-${year}-${code}`, clientId,clientName:request.customerName,clientEmail:request.customerEmail,
        projectId,messageId:messageId || null,totalPrice:breakdown.finalTotal,currency,breakdown,status:existingQuote.status || 'draft',createdAt:existingQuote.createdAt || at,updatedAt:at,
        pricingVersion:'studio-pricing-v1',source:automatic?'contact_pipeline':'pricing_plugin',sentAt:existingQuote.sentAt || null },{merge:true});
      tx.set(projectRef, { ...request, projectNumber:existingProject.projectNumber || `PA-${year}-${code}`,projectName:existingProject.projectName || `Project for ${request.customerName}`,name:existingProject.name || `Project for ${request.customerName}`,
        clientId,clientName:request.customerName,clientEmail:request.customerEmail,quoteId,messageId:messageId || null,sourceMessageId:messageId || null,
        budget:breakdown.finalTotal,currency,breakdown,status:existingProject.status || 'active',workflowStage:existingProject.workflowStage || 'proposal',finalApproved:false,
        description:existingProject.description || text(message.message,4000),progress:existingProject.progress || 0,createdAt:existingProject.createdAt || at,lastUpdated:at,
        autoPipeline:automatic || !!existingProject.autoPipeline,documents:existingProject.documents || {},pipelineVersion:1 },{merge:true});
      if (msgRef) tx.set(msgRef,{projectId,quoteId,clientId,dossierCreated:true,pipelineStatus:'prepared',pipelineVersion:1,status:message.status === 'new' ? 'project-created' : message.status || 'project-created'},{merge:true});
      tx.set(db.collection('studio_audit').doc(),{action:automatic?'lead_prepared':'pricing_quote_saved',actorId:actor.id,targetId:projectId,quoteId,messageId:messageId || null,at});
      return {projectId,quoteId,quoteNumber:existingQuote.quoteNumber || `QA-${year}-${code}`,breakdown};
    });
  }
  async function prepare(messageId) { return save({messageId,requestId:`lead_${messageId}`},{id:'contact_pipeline'},true); }
  return { settings,saveSettings,save,prepare };
}
function service() { const {db,admin}=require('../api/_firebaseAdmin'); return createService(db,()=>admin.firestore.FieldValue.serverTimestamp()); }
module.exports={ defaultSettings,validateSettings,normalizeRequest,calculate,createService,service };
