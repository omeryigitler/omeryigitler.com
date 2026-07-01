const test = require("node:test");
const assert = require("node:assert/strict");
const { buildPricedProposal, normalizeScope } = require("../lib/pricing");

test("uses the configured landing-page base instead of the corporate base", () => {
  const proposal = buildPricedProposal({
    country: "TR",
    config: { siteType: "LANDING", designType: "TEMPLATE", pageCount: 10 }
  });

  assert.equal(proposal.breakdown.base, 8000);
  assert.equal(proposal.breakdown.pages, 10000);
  assert.equal(proposal.totalPrice, 18000);
  assert.equal(proposal.pricingVersion, "2026-07-01");
});

test("calculates configured features, add-ons, speed and maintenance", () => {
  const proposal = buildPricedProposal({
    country: "MT",
    siteType: "CORPORATE",
    designType: "CUSTOM",
    pageCount: 10,
    features: ["seo", "multilang"],
    selectedAddons: ["logo_design"],
    deliverySpeed: "FAST",
    maintenanceLevel: "BASIC"
  });

  assert.deepEqual(proposal.features, ["seo", "multilang"]);
  assert.equal(proposal.breakdown.base, 1500);
  assert.equal(proposal.breakdown.pages, 1000);
  assert.equal(proposal.breakdown.design, 750);
  assert.equal(proposal.breakdown.seo, 500);
  assert.equal(proposal.breakdown.multiLang, 500);
  assert.equal(proposal.breakdown.addons, 500);
  assert.equal(proposal.totalPrice, 7125);
  assert.equal(proposal.breakdown.totalMonthly, 200);
});

test("normalizes untrusted scope values", () => {
  const scope = normalizeScope({
    country: "XX",
    siteType: "DROP_TABLE",
    pageCount: 1000,
    features: ["seo", "unknown"],
    addons: ["logo_design", "unknown"]
  });

  assert.equal(scope.country, "TR");
  assert.equal(scope.siteType, "CORPORATE");
  assert.equal(scope.pageCount, 50);
  assert.deepEqual(scope.features, ["seo"]);
  assert.deepEqual(scope.addons, ["logo_design"]);
});

test("deduplicates repeated add-ons before pricing", () => {
  const proposal = buildPricedProposal({
    country: "TR",
    siteType: "LANDING",
    pageCount: 1,
    addons: ["logo_design", "logo_design"]
  });
  assert.deepEqual(proposal.selectedAddons, ["logo_design"]);
  assert.equal(proposal.breakdown.addons, 5000);
});
