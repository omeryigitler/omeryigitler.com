
import { Country, DeliverySpeed, MaintenanceLevel, PricingRules, SiteType, SeoCategory, PricingFactorType, AddonService } from './types';

export const APP_NAME = "Ömer Yiğitler";

export const DEFAULT_PRICING_CONFIG: Record<Country, PricingRules> = {
  [Country.TR]: {
    currency: 'TRY',
    currencySymbol: '₺',
    basePrices: {
      [SiteType.LANDING]: 8000,
      [SiteType.PROMO]: 8000,
      [SiteType.CORPORATE]: 15000,
      [SiteType.ECOMMERCE]: 40000,
      [SiteType.PORTAL]: 50000,
    },
    pageRate: 1000,
    maintenanceRates: {
      [MaintenanceLevel.NONE]: { value: 0, type: PricingFactorType.FIXED },
      [MaintenanceLevel.BASIC]: { value: 2000, type: PricingFactorType.FIXED },
      [MaintenanceLevel.MID]: { value: 5000, type: PricingFactorType.FIXED },
      [MaintenanceLevel.PREMIUM]: { value: 10000, type: PricingFactorType.FIXED },
    },
    factors: {
      seo: { value: 5000, type: PricingFactorType.FIXED },
      design: { value: 30, type: PricingFactorType.PERCENTAGE },
      multiLang: { value: 20, type: PricingFactorType.PERCENTAGE },
      ecommerce: { value: 50, type: PricingFactorType.PERCENTAGE },
      graphics: { value: 10, type: PricingFactorType.PERCENTAGE },
      ux: { value: 10, type: PricingFactorType.PERCENTAGE },
      crm: { value: 20, type: PricingFactorType.PERCENTAGE },
    },
    speedMultipliers: {
      [DeliverySpeed.STANDARD]: 1,
      [DeliverySpeed.FAST]: 1.5,
      [DeliverySpeed.URGENT]: 2.0,
    },
  },
  [Country.MT]: {
    currency: 'EUR',
    currencySymbol: '€',
    basePrices: {
      [SiteType.LANDING]: 800,
      [SiteType.PROMO]: 800,
      [SiteType.CORPORATE]: 1500,
      [SiteType.ECOMMERCE]: 4000,
      [SiteType.PORTAL]: 5000,
    },
    pageRate: 100,
    maintenanceRates: {
      [MaintenanceLevel.NONE]: { value: 0, type: PricingFactorType.FIXED },
      [MaintenanceLevel.BASIC]: { value: 200, type: PricingFactorType.FIXED },
      [MaintenanceLevel.MID]: { value: 500, type: PricingFactorType.FIXED },
      [MaintenanceLevel.PREMIUM]: { value: 1000, type: PricingFactorType.FIXED },
    },
    factors: {
      seo: { value: 500, type: PricingFactorType.FIXED },
      design: { value: 30, type: PricingFactorType.PERCENTAGE },
      multiLang: { value: 20, type: PricingFactorType.PERCENTAGE },
      ecommerce: { value: 50, type: PricingFactorType.PERCENTAGE },
      graphics: { value: 10, type: PricingFactorType.PERCENTAGE },
      ux: { value: 10, type: PricingFactorType.PERCENTAGE },
      crm: { value: 20, type: PricingFactorType.PERCENTAGE },
    },
    speedMultipliers: {
      [DeliverySpeed.STANDARD]: 1,
      [DeliverySpeed.FAST]: 1.5,
      [DeliverySpeed.URGENT]: 2.0,
    },
  },
};

export const DEFAULT_AVAILABLE_ADDONS: AddonService[] = [
  {
    id: 'logo_design',
    label: 'Logo Tasarımı',
    description: '3 farklı konsept',
    priceTR: { value: 5000, type: PricingFactorType.FIXED },
    priceMT: { value: 500, type: PricingFactorType.FIXED }
  },
  {
    id: 'content_writing',
    label: 'İçerik Yazarlığı',
    description: 'SEO uyumlu metinler',
    priceTR: { value: 7500, type: PricingFactorType.FIXED },
    priceMT: { value: 750, type: PricingFactorType.FIXED }
  },
  {
    id: 'social_media',
    label: 'Sosyal Medya',
    description: 'Hesap kurulumu',
    priceTR: { value: 3000, type: PricingFactorType.FIXED },
    priceMT: { value: 300, type: PricingFactorType.FIXED }
  },
  {
    id: 'google_maps',
    label: 'Google Harita',
    description: 'Harita kaydı',
    priceTR: { value: 1500, type: PricingFactorType.FIXED },
    priceMT: { value: 150, type: PricingFactorType.FIXED }
  }
];

export const DEFAULT_SEO_TEMPLATE: SeoCategory[] = [
  {
    id: 'technical',
    title: 'Teknik SEO',
    tasks: [
      { id: 't1', title: 'Site hızı optimizasyonu (Core Web Vitals)', isCompleted: false, note: '' },
      { id: 't2', title: 'Mobil uyumluluk (Responsive) kontrolü', isCompleted: false, note: '' },
      { id: 't3', title: 'URL yapısının düzenlenmesi (SEO Friendly URLs)', isCompleted: false, note: '' },
      { id: 't4', title: 'SSL Sertifikası (HTTPS) kontrolü', isCompleted: false, note: '' },
      { id: 't5', title: 'XML Sitemap oluşturma ve gönderme', isCompleted: false, note: '' },
      { id: 't6', title: 'Robots.txt dosyası yapılandırması', isCompleted: false, note: '' },
      { id: 't7', title: 'Schema Markup (Yapısal Veri) ekleme', isCompleted: false, note: '' },
      { id: 't8', title: '404 hataları ve 301 yönlendirmeleri', isCompleted: false, note: '' },
    ]
  },
  {
    id: 'content',
    title: 'İçerik SEO (On-Page)',
    tasks: [
      { id: 'c1', title: 'Anahtar kelime araştırması ve analizi', isCompleted: false, note: '' },
      { id: 'c2', title: 'Başlık (H1, H2, H3) etiketlerinin optimizasyonu', isCompleted: false, note: '' },
      { id: 'c3', title: 'Meta Title ve Description yazımı', isCompleted: false, note: '' },
      { id: 'c4', title: 'Görsel optimizasyonu (Alt etiketler & Boyut)', isCompleted: false, note: '' },
      { id: 'c5', title: 'İç linkleme stratejisi kurgusu', isCompleted: false, note: '' },
      { id: 'c6', title: 'Duplicate content (kopya içerik) kontrolü', isCompleted: false, note: '' },
    ]
  },
  {
    id: 'offpage',
    title: 'Off-Page SEO',
    tasks: [
      { id: 'o1', title: 'Google My Business (Harita) kaydı', isCompleted: false, note: '' },
      { id: 'o2', title: 'Sosyal medya hesaplarının entegrasyonu', isCompleted: false, note: '' },
      { id: 'o3', title: 'Backlink analizi ve stratejisi', isCompleted: false, note: '' },
      { id: 'o4', title: 'Rakip analizi', isCompleted: false, note: '' },
    ]
  },
  {
    id: 'monitoring',
    title: 'İzleme & Raporlama',
    tasks: [
      { id: 'm1', title: 'Google Analytics 4 kurulumu', isCompleted: false, note: '' },
      { id: 'm2', title: 'Google Search Console kurulumu', isCompleted: false, note: '' },
      { id: 'm3', title: 'Aylık performans raporu şablonu', isCompleted: false, note: '' },
    ]
  }
];
