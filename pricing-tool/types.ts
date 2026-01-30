
export enum Country {
  TR = 'TR',
  MT = 'MT',
}

export enum Language {
  TR = 'TR',
  EN = 'EN',
}

export enum SiteType {
  LANDING = 'LANDING',
  PROMO = 'PROMO', // Tanıtım
  CORPORATE = 'CORPORATE', // Kurumsal
  ECOMMERCE = 'ECOMMERCE',
  PORTAL = 'PORTAL', // Özel Portal / Yazılım
}

export enum DesignType {
  TEMPLATE = 'TEMPLATE',
  CUSTOM = 'CUSTOM',
}

export enum DeliverySpeed {
  STANDARD = 'STANDARD',
  FAST = 'FAST',
  URGENT = 'URGENT',
}

export enum MaintenanceLevel {
  NONE = 'NONE',
  BASIC = 'BASIC',
  MID = 'MID',
  PREMIUM = 'PREMIUM',
}

export enum DiscountType {
  PERCENTAGE = 'PERCENTAGE',
  FIXED = 'FIXED',
}

export enum PricingFactorType {
  PERCENTAGE = 'PERCENTAGE',
  FIXED = 'FIXED',
}

export interface PricingFactor {
  value: number;
  type: PricingFactorType;
}

export interface PricingRules {
  currency: string;
  currencySymbol: string;
  basePrices: Record<SiteType, number>; // Base prices are always FIXED
  pageRate: number; // Page rate is always FIXED
  maintenanceRates: Record<MaintenanceLevel, PricingFactor>; // Now supports % or Fixed

  // Flexible Factors (Can be % or Fixed Amount)
  factors: {
    seo: PricingFactor;
    design: PricingFactor;
    multiLang: PricingFactor;
    ecommerce: PricingFactor;
    graphics: PricingFactor;
    ux: PricingFactor;
    crm: PricingFactor;
  };

  // Speed is always a multiplier of the total
  speedMultipliers: Record<DeliverySpeed, number>;
}

export interface AddonService {
  id: string;
  label: string;
  description: string;
  priceTR: PricingFactor; // Updated to support type
  priceMT: PricingFactor; // Updated to support type
}

export interface QuoteRequest {
  country: Country;
  siteType: SiteType;
  pageCount: number;
  designType: DesignType;
  isMultiLang: boolean;
  hasSeo: boolean;
  hasGraphics: boolean;
  hasUx: boolean;
  hasCrm: boolean;
  deliverySpeed: DeliverySpeed;
  maintenanceLevel: MaintenanceLevel;
  customerName: string;
  customerEmail?: string; // Added field
  selectedAddons: string[];
  discountType: DiscountType;
  discountValue: number;
}

export interface CostBreakdown {
  base: number;
  pages: number;
  design: number;
  seo: number;
  multiLang: number;
  graphics: number;
  ux: number;
  crm: number;
  addons: number;
  speed: number;
  subtotal: number;
  discountAmount: number;
  finalTotal: number;
  totalOneTime: number;
  totalMonthly: number;
}

// --- SEO Tracker Interfaces ---

export interface SeoTask {
  id: string;
  title: string;
  isCompleted: boolean;
  note: string;
}

export interface SeoCategory {
  id: string;
  title: string;
  tasks: SeoTask[];
}

export interface SeoProject {
  id: string;
  clientName: string;
  websiteUrl: string;
  createdAt: string;
  categories: SeoCategory[];
}
