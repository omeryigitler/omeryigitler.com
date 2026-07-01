const pricingConfig = require("../config/pricing.json");

const SITE_TYPES = new Set(["LANDING", "PROMO", "CORPORATE", "ECOMMERCE", "PORTAL"]);
const DESIGN_TYPES = new Set(["TEMPLATE", "CUSTOM"]);
const SPEEDS = new Set(["STANDARD", "FAST", "URGENT"]);
const MAINTENANCE = new Set(["NONE", "BASIC", "MID", "PREMIUM"]);
const FEATURES = new Set(["seo", "multilang", "graphics", "ux", "crm"]);
const ADDONS = new Set(Object.keys(pricingConfig.addons));

function enumValue(value, allowed, fallback) {
  const normalized = String(value || "").trim().toUpperCase();
  return allowed.has(normalized) ? normalized : fallback;
}

function boundedInteger(value, fallback, min, max) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function normalizeFeature(value) {
  return String(value || "").trim().toLowerCase().replace(/[\s_-]/g, "");
}

function normalizeScope(input = {}) {
  const nested = input.config && typeof input.config === "object" ? input.config : {};
  const source = { ...input, ...nested };
  const country = String(source.country || input.country || "TR").toUpperCase() === "MT" ? "MT" : "TR";
  const rawFeatures = Array.isArray(source.features) ? source.features : [];
  const features = new Set(rawFeatures.map(normalizeFeature).filter((value) => FEATURES.has(value)));

  if (source.hasSeo) features.add("seo");
  if (source.isMultiLang) features.add("multilang");
  if (source.hasGraphics) features.add("graphics");
  if (source.hasUx) features.add("ux");
  if (source.hasCrm) features.add("crm");

  const rawAddons = Array.isArray(source.addons)
    ? source.addons
    : Array.isArray(source.selectedAddons)
      ? source.selectedAddons
      : [];

  return {
    country,
    siteType: enumValue(source.siteType || source.projectType, SITE_TYPES, "CORPORATE"),
    designType: enumValue(source.designType, DESIGN_TYPES, "TEMPLATE"),
    pageCount: boundedInteger(source.pageCount, 10, 1, 50),
    features: [...features],
    addons: [...new Set(rawAddons.map((value) => String(value || "").trim()).filter((value) => ADDONS.has(value)))],
    deliverySpeed: enumValue(source.deliverySpeed, SPEEDS, "STANDARD"),
    maintenanceLevel: enumValue(source.maintenanceLevel, MAINTENANCE, "NONE")
  };
}

function factorAmount(base, factor) {
  if (!factor) return 0;
  const raw = factor.type === "PERCENTAGE" ? base * (factor.value / 100) : factor.value;
  return Math.round(raw || 0);
}

function calculateBreakdown(scope) {
  const rules = pricingConfig.countries[scope.country] || pricingConfig.countries.TR;
  const base = rules.basePrices[scope.siteType];
  const pages = scope.pageCount * rules.pageRate;
  const scopeTotal = base + pages;
  const seo = scope.features.includes("seo") ? factorAmount(scopeTotal, rules.factors.seo) : 0;
  const design = scope.designType === "CUSTOM" ? factorAmount(scopeTotal, rules.factors.design) : 0;
  const multilang = scope.features.includes("multilang") ? factorAmount(scopeTotal, rules.factors.multilang) : 0;
  const graphics = scope.features.includes("graphics") ? factorAmount(scopeTotal, rules.factors.graphics) : 0;
  const ux = scope.features.includes("ux") ? factorAmount(scopeTotal, rules.factors.ux) : 0;
  const crm = scope.features.includes("crm") ? factorAmount(scopeTotal, rules.factors.crm) : 0;
  const subtotalBeforeAddons = scopeTotal + seo + design + multilang + graphics + ux + crm;
  const addons = scope.addons.reduce((sum, addonId) => sum + (pricingConfig.addons[addonId]?.[scope.country] || 0), 0);
  const subtotal = subtotalBeforeAddons + addons;
  const multiplier = rules.speedMultipliers[scope.deliverySpeed] || 1;
  const totalOneTime = Math.round(subtotal * multiplier);
  const speed = totalOneTime - subtotal;
  const totalMonthly = factorAmount(totalOneTime, rules.maintenanceRates[scope.maintenanceLevel]);

  return {
    base,
    pages,
    design,
    seo,
    multiLang: multilang,
    graphics,
    ux,
    crm,
    addons,
    speed,
    subtotal,
    totalOneTime,
    discountAmount: 0,
    finalTotal: totalOneTime,
    totalMonthly
  };
}

function buildPricedProposal(input = {}) {
  const scope = normalizeScope(input);
  const rules = pricingConfig.countries[scope.country] || pricingConfig.countries.TR;
  const breakdown = calculateBreakdown(scope);

  return {
    country: scope.country,
    currency: rules.currency,
    siteType: scope.siteType,
    designType: scope.designType,
    pageCount: scope.pageCount,
    features: scope.features,
    selectedAddons: scope.addons,
    deliverySpeed: scope.deliverySpeed,
    maintenanceLevel: scope.maintenanceLevel,
    totalPrice: breakdown.finalTotal,
    breakdown,
    pricingVersion: pricingConfig.version
  };
}

module.exports = {
  buildPricedProposal,
  calculateBreakdown,
  normalizeScope,
  pricingConfig
};
