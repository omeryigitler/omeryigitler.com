
import React, { useEffect, useState, useRef } from 'react';
import { 
  Country, SiteType, DesignType, DeliverySpeed, MaintenanceLevel, QuoteRequest, CostBreakdown, PricingRules, Language, DiscountType, PricingFactor, PricingFactorType, AddonService 
} from '../types';
import { TRANSLATIONS } from '../translations';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { ArrowRight, Save, Zap, ChevronDown, User, Globe, Layout, Layers, Check, Plus, PenTool, MousePointer, Database, Percent, DollarSign, Tag } from 'lucide-react';

interface Props {
  config: Record<Country, PricingRules>;
  addons: AddonService[];
  onRequestUpdate: (req: QuoteRequest) => void;
  onBreakdownUpdate: (bd: CostBreakdown) => void;
  initialRequest: QuoteRequest;
  onNavigate: (view: string) => void;
  language: Language;
}

// --- Custom Select Component ---
interface Option {
  value: string;
  label: string;
}

interface CustomSelectProps {
  label: string;
  value: string;
  options: Option[];
  onChange: (value: string) => void;
  icon?: React.ReactNode;
}

const CustomSelect: React.FC<CustomSelectProps> = ({ label, value, options, onChange, icon }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find(opt => opt.value === value);

  return (
    <div className="relative group" ref={containerRef}>
      {/* Label is passed already uppercased from parent if needed, handled via JS not CSS to fix locale issues */}
      {label && <label className="block text-xs font-bold text-zinc-500 tracking-wider mb-2 ml-1">{label}</label>}
      
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full relative flex items-center justify-between bg-black border px-5 py-4 rounded-xl cursor-pointer transition-all duration-300 select-none ${
          isOpen 
            ? 'border-taurusGold ring-1 ring-taurusGold shadow-[0_0_15px_rgba(255,215,0,0.1)]' 
            : 'border-zinc-800 hover:border-zinc-600'
        }`}
      >
        <span className="text-white font-medium text-base truncate pr-8">
          {selectedOption?.label}
        </span>
        
        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center pointer-events-none">
             {icon && <span className={`mr-3 transition-colors ${isOpen ? 'text-taurusGold' : 'text-zinc-600'}`}>{icon}</span>}
             <ChevronDown className={`w-5 h-5 transition-all duration-300 ${isOpen ? 'rotate-180 text-taurusGold' : 'text-zinc-500'}`} />
        </div>
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-[60] w-full mt-2 bg-black border border-zinc-800 rounded-xl shadow-2xl shadow-black/80 overflow-hidden animate-in fade-in zoom-in-95 duration-150 origin-top">
          <ul className="max-h-64 overflow-auto py-1 no-scrollbar">
            {options.map((option) => (
              <li 
                key={option.value}
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={`px-5 py-3.5 flex items-center justify-between cursor-pointer transition-all border-b border-zinc-900/50 last:border-0 ${
                  option.value === value 
                    ? 'bg-zinc-900 text-taurusGold font-semibold' 
                    : 'text-zinc-400 hover:bg-zinc-900 hover:text-white'
                }`}
              >
                <span>{option.label}</span>
                {option.value === value && <Check className="w-4 h-4 text-taurusGold" />}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

const PricingCalculator: React.FC<Props> = ({ config, addons, onRequestUpdate, onBreakdownUpdate, initialRequest, onNavigate, language }) => {
  const [request, setRequest] = useState<QuoteRequest>(initialRequest);
  const [breakdown, setBreakdown] = useState<CostBreakdown | null>(null);
  
  const t = TRANSLATIONS[language].calc;
  const t_addons = TRANSLATIONS[language].addons as any; // Dynamic access for addons
  const labels = TRANSLATIONS[language].labels;

  // STRICT LOCALE HANDLING FOR UPPERCASE
  const locale = language === Language.TR ? 'tr-TR' : 'en-US';
  const upper = (text: string) => text.toLocaleUpperCase(locale);

  // Helper function for locale-aware currency formatting
  const formatPrice = (amount: number) => {
    if (request.country === Country.TR) {
      return `${amount.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} ${config[Country.TR].currencySymbol}`;
    } else {
      return `${config[Country.MT].currencySymbol}${amount.toLocaleString('en-GB', { maximumFractionDigits: 0 })}`;
    }
  };

  const calculateFactorCost = (baseAmount: number, factor: PricingFactor): number => {
    if (factor.type === PricingFactorType.PERCENTAGE) {
      return baseAmount * (factor.value / 100);
    }
    return factor.value;
  };
  
  const formatFactorDisplay = (factor: PricingFactor) => {
    if (factor.type === PricingFactorType.PERCENTAGE) {
      return `+${factor.value}%`;
    }
    return `+${formatPrice(factor.value)}`;
  }

  const toggleAddon = (addonId: string) => {
    const current = request.selectedAddons || [];
    if (current.includes(addonId)) {
      setRequest({ ...request, selectedAddons: current.filter(id => id !== addonId) });
    } else {
      setRequest({ ...request, selectedAddons: [...current, addonId] });
    }
  };

  useEffect(() => {
     setRequest(prev => ({...prev, country: language === Language.TR ? Country.TR : Country.MT}));
  }, [language]);


  useEffect(() => {
    const rules = config[request.country];
    let base = rules.basePrices[request.siteType];
    const pagesCost = request.pageCount * rules.pageRate;
    
    let scopeValue = base + pagesCost;
    const seoCost = request.hasSeo ? calculateFactorCost(scopeValue, rules.factors.seo) : 0;
    
    let runningTotal = scopeValue + seoCost;

    let designCost = 0;
    if (request.designType === DesignType.CUSTOM) {
      designCost = calculateFactorCost(scopeValue, rules.factors.design);
    }
    
    let multiLangCost = 0;
    if (request.isMultiLang) {
      multiLangCost = calculateFactorCost(scopeValue, rules.factors.multiLang);
    }

    let graphicsCost = 0;
    if (request.hasGraphics) {
      graphicsCost = calculateFactorCost(scopeValue, rules.factors.graphics);
    }

    let uxCost = 0;
    if (request.hasUx) {
      uxCost = calculateFactorCost(scopeValue, rules.factors.ux);
    }

    let crmCost = 0;
    if (request.hasCrm) {
      crmCost = calculateFactorCost(scopeValue, rules.factors.crm);
    }

    runningTotal = runningTotal + designCost + multiLangCost + graphicsCost + uxCost + crmCost;

    let addonsCost = 0;
    if (request.selectedAddons) {
      request.selectedAddons.forEach(addonId => {
        const addon = addons.find(a => a.id === addonId);
        if (addon) {
          const priceFactor = request.country === Country.TR ? addon.priceTR : addon.priceMT;
          addonsCost += calculateFactorCost(runningTotal, priceFactor);
        }
      });
    }

    runningTotal += addonsCost;

    const speedMultiplier = rules.speedMultipliers[request.deliverySpeed];
    const finalProjectTotal = runningTotal * speedMultiplier;
    const speedCost = finalProjectTotal - runningTotal;
    
    let discountAmount = 0;
    if (request.discountValue > 0) {
      if (request.discountType === DiscountType.PERCENTAGE) {
         discountAmount = finalProjectTotal * (request.discountValue / 100);
      } else {
         discountAmount = request.discountValue;
      }
    }
    discountAmount = Math.min(discountAmount, finalProjectTotal);
    const finalTotal = finalProjectTotal - discountAmount;

    const maintenanceFactor = rules.maintenanceRates[request.maintenanceLevel];
    const monthlyCost = calculateFactorCost(finalProjectTotal, maintenanceFactor);

    const newBreakdown: CostBreakdown = {
      base,
      pages: pagesCost,
      design: designCost,
      seo: seoCost,
      multiLang: multiLangCost,
      graphics: graphicsCost,
      ux: uxCost,
      crm: crmCost,
      addons: addonsCost,
      speed: speedCost,
      subtotal: runningTotal, 
      totalOneTime: finalProjectTotal, // Original Total
      discountAmount: discountAmount,
      finalTotal: finalTotal, // Net Total
      totalMonthly: monthlyCost
    };

    setBreakdown(newBreakdown);
    onRequestUpdate(request);
    onBreakdownUpdate(newBreakdown);

  }, [request, config, addons, onRequestUpdate, onBreakdownUpdate]);

  const rules = config[request.country];

  const chartData = breakdown ? [
    { name: t.chart.base, value: breakdown.base, color: '#3f3f46' }, 
    { name: t.chart.pages, value: breakdown.pages, color: '#71717a' }, 
    { name: t.chart.extras, value: breakdown.design + breakdown.seo + breakdown.multiLang + breakdown.graphics + breakdown.ux + breakdown.crm + breakdown.addons, color: '#a1a1aa' },
    { name: t.chart.speed, value: breakdown.speed, color: '#facc15' }, 
  ] : [];

  const handleCreateProposal = () => {
    if (!request.customerName) {
      alert(t.alerts.enterCustomer);
      return;
    }
    onNavigate('proposal');
  };

  const countryOptions = [
    { value: Country.TR, label: t.countryTR },
    { value: Country.MT, label: t.countryMT }
  ];

  const siteTypeOptions = Object.keys(labels.siteTypes).map((key) => ({
    value: key,
    label: labels.siteTypes[key as SiteType]
  }));

  const deliveryOptions = Object.keys(labels.speeds).map((key) => ({
    value: key,
    label: labels.speeds[key as DeliverySpeed]
  }));

  const maintenanceOptions = Object.keys(labels.maintenance).map((key) => ({
    value: key,
    label: labels.maintenance[key as MaintenanceLevel]
  }));

  // Removed 'uppercase' class from here, handled in JSX with upper()
  const labelClass = "block text-xs font-bold text-zinc-500 tracking-wider mb-2 ml-1";
  const inputContainerClass = "relative group";
  const inputClass = "w-full appearance-none rounded-xl bg-black border border-zinc-800 px-5 py-4 text-white placeholder-zinc-600 focus:border-taurusGold focus:ring-1 focus:ring-taurusGold focus:outline-none transition-all duration-300 font-medium";
  const iconClass = "absolute right-5 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-600 group-hover:text-taurusGold group-focus-within:text-taurusGold transition-colors pointer-events-none";

  const isTr = request.country === Country.TR;
  const isPercentage = request.discountType === DiscountType.PERCENTAGE;

  const showSymbolLeft = (!isPercentage && !isTr) || (isPercentage && isTr);
  const showSymbolRight = (!isPercentage && isTr) || (isPercentage && !isTr);

  const displaySymbol = isPercentage ? '%' : rules.currencySymbol;

  return (
    <div className="max-w-7xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        
        {/* Input Form */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Section 1: Project Scope (Yellow) */}
          <div className="bg-zinc-900 rounded-3xl border border-zinc-800 p-8 sm:p-10 shadow-[0_0_60px_rgba(255,215,0,0.25)] relative">
            <h2 className="text-2xl font-bold text-white mb-8 flex items-center font-poppins">
              <span className="bg-zinc-800 text-taurusGold w-10 h-10 flex items-center justify-center rounded-xl mr-4 text-sm font-bold border border-zinc-700">01</span>
              {t.title1}
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              
              {/* Customer Name */}
              <div>
                <label className={labelClass}>{upper(t.customerName)}</label>
                <div className={inputContainerClass}>
                  <input 
                    type="text" 
                    value={request.customerName}
                    onChange={(e) => setRequest({...request, customerName: e.target.value})}
                    className={inputClass}
                    placeholder={t.customerPlaceholder}
                  />
                  <User className={iconClass} />
                </div>
              </div>

              {/* Country Select */}
              <div>
                <CustomSelect 
                  label={upper(t.targetMarket)}
                  value={request.country}
                  options={countryOptions}
                  onChange={(val) => setRequest({...request, country: val as Country})}
                  icon={<Globe className="w-5 h-5" />}
                />
              </div>

              {/* Site Type Select */}
              <div>
                 <CustomSelect 
                  label={upper(t.projectType)}
                  value={request.siteType}
                  options={siteTypeOptions}
                  onChange={(val) => setRequest({...request, siteType: val as SiteType})}
                  icon={<Layout className="w-5 h-5" />}
                />
              </div>

              {/* Page Count Slider */}
              <div>
                <label className={labelClass}>
                  {upper(t.pageCount)}: <span className="text-taurusGold ml-1 text-sm">{request.pageCount}</span>
                </label>
                <div className="px-1 py-4">
                  <input 
                    type="range" 
                    min="1" 
                    max="50" 
                    value={request.pageCount}
                    onChange={(e) => setRequest({...request, pageCount: parseInt(e.target.value)})}
                    className="w-full h-3 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-taurusGold hover:accent-taurusGold transition-all"
                  />
                  <div className="flex justify-between text-[10px] text-zinc-600 mt-3 font-bold uppercase tracking-wider">
                    <span>1</span>
                    <span>25</span>
                    <span>50</span>
                  </div>
                </div>
              </div>

              {/* Design Preference Radio */}
              <div className="md:col-span-2 mt-2">
                <label className={labelClass}>{upper(t.designPref)}</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <label className={`relative group cursor-pointer border rounded-2xl p-5 transition-all duration-300 flex items-start space-x-4 ${request.designType === DesignType.TEMPLATE ? 'border-taurusGold bg-zinc-900 shadow-[0_0_15px_rgba(255,215,0,0.15)]' : 'border-zinc-800 bg-black hover:border-zinc-600'}`}>
                    <input 
                      type="radio" 
                      name="design" 
                      className="hidden"
                      checked={request.designType === DesignType.TEMPLATE}
                      onChange={() => setRequest({...request, designType: DesignType.TEMPLATE})}
                    />
                    <div className={`w-5 h-5 rounded-full border-2 mt-1 flex items-center justify-center flex-shrink-0 ${request.designType === DesignType.TEMPLATE ? 'border-taurusGold' : 'border-zinc-600 group-hover:border-zinc-400'}`}>
                      {request.designType === DesignType.TEMPLATE && <div className="w-2.5 h-2.5 rounded-full bg-taurusGold"></div>}
                    </div>
                    <div>
                      <div className={`font-bold text-lg ${request.designType === DesignType.TEMPLATE ? 'text-white' : 'text-zinc-400 group-hover:text-zinc-200'}`}>{t.template}</div>
                      <div className="text-xs text-zinc-500 mt-1 leading-relaxed">{t.templateDesc}</div>
                    </div>
                  </label>

                  <label className={`relative group cursor-pointer border rounded-2xl p-5 transition-all duration-300 flex items-start space-x-4 ${request.designType === DesignType.CUSTOM ? 'border-taurusGold bg-zinc-900 shadow-[0_0_15px_rgba(255,215,0,0.15)]' : 'border-zinc-800 bg-black hover:border-zinc-600'}`}>
                    <input 
                      type="radio" 
                      name="design" 
                      className="hidden"
                      checked={request.designType === DesignType.CUSTOM}
                      onChange={() => setRequest({...request, designType: DesignType.CUSTOM})}
                    />
                     <div className={`w-5 h-5 rounded-full border-2 mt-1 flex items-center justify-center flex-shrink-0 ${request.designType === DesignType.CUSTOM ? 'border-taurusGold' : 'border-zinc-600 group-hover:border-zinc-400'}`}>
                      {request.designType === DesignType.CUSTOM && <div className="w-2.5 h-2.5 rounded-full bg-taurusGold"></div>}
                    </div>
                    <div>
                      <div className={`font-bold text-lg ${request.designType === DesignType.CUSTOM ? 'text-white' : 'text-zinc-400 group-hover:text-zinc-200'}`}>{t.custom}</div>
                      <div className="text-xs text-zinc-500 mt-1 leading-relaxed">{t.customDesc} ({formatFactorDisplay(rules.factors.design)})</div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Technical & Creative Extras */}
              <div className="space-y-4 md:col-span-2 mt-2">
                <label className={labelClass}>{upper(t.technicalTitle)}</label>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   {/* SEO */}
                   <label className={`flex items-center space-x-4 p-4 border rounded-xl cursor-pointer transition-all duration-300 group ${request.hasSeo ? 'border-taurusGold bg-zinc-900' : 'border-zinc-800 bg-black hover:border-zinc-700'}`}>
                      <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${request.hasSeo ? 'bg-taurusGold border-taurusGold' : 'border-zinc-600 group-hover:border-zinc-500'}`}>
                         {request.hasSeo && <Zap className="w-3.5 h-3.5 text-black" fill="currentColor" />}
                      </div>
                      <input type="checkbox" className="hidden" checked={request.hasSeo} onChange={(e) => setRequest({...request, hasSeo: e.target.checked})} />
                      <div className="flex-grow">
                        <span className={`block font-bold text-sm ${request.hasSeo ? 'text-white' : 'text-zinc-400 group-hover:text-zinc-200'}`}>{t.seoService}</span>
                        <span className="block text-xs text-zinc-600">{t.seoDesc}</span>
                      </div>
                      <div className="text-xs font-bold text-taurusGold">{formatFactorDisplay(rules.factors.seo)}</div>
                   </label>

                   {/* Multi-Lang */}
                   <label className={`flex items-center space-x-4 p-4 border rounded-xl cursor-pointer transition-all duration-300 group ${request.isMultiLang ? 'border-taurusGold bg-zinc-900' : 'border-zinc-800 bg-black hover:border-zinc-700'}`}>
                      <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${request.isMultiLang ? 'bg-taurusGold border-taurusGold' : 'border-zinc-600 group-hover:border-zinc-500'}`}>
                         {request.isMultiLang && <Globe className="w-3.5 h-3.5 text-black" />}
                      </div>
                      <input type="checkbox" className="hidden" checked={request.isMultiLang} onChange={(e) => setRequest({...request, isMultiLang: e.target.checked})} />
                      <div className="flex-grow">
                        <span className={`block font-bold text-sm ${request.isMultiLang ? 'text-white' : 'text-zinc-400 group-hover:text-zinc-200'}`}>{t.multiLang}</span>
                        <span className="block text-xs text-zinc-600">{t.multiLangDesc}</span>
                      </div>
                      <div className="text-xs font-bold text-taurusGold">{formatFactorDisplay(rules.factors.multiLang)}</div>
                   </label>

                   {/* Graphics */}
                   <label className={`flex items-center space-x-4 p-4 border rounded-xl cursor-pointer transition-all duration-300 group ${request.hasGraphics ? 'border-taurusGold bg-zinc-900' : 'border-zinc-800 bg-black hover:border-zinc-700'}`}>
                      <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${request.hasGraphics ? 'bg-taurusGold border-taurusGold' : 'border-zinc-600 group-hover:border-zinc-500'}`}>
                         {request.hasGraphics && <PenTool className="w-3.5 h-3.5 text-black" />}
                      </div>
                      <input type="checkbox" className="hidden" checked={request.hasGraphics} onChange={(e) => setRequest({...request, hasGraphics: e.target.checked})} />
                      <div className="flex-grow">
                        <span className={`block font-bold text-sm ${request.hasGraphics ? 'text-white' : 'text-zinc-400 group-hover:text-zinc-200'}`}>{t.graphics}</span>
                        <span className="block text-xs text-zinc-600">{t.graphicsDesc}</span>
                      </div>
                      <div className="text-xs font-bold text-taurusGold">{formatFactorDisplay(rules.factors.graphics)}</div>
                   </label>

                   {/* UX */}
                   <label className={`flex items-center space-x-4 p-4 border rounded-xl cursor-pointer transition-all duration-300 group ${request.hasUx ? 'border-taurusGold bg-zinc-900' : 'border-zinc-800 bg-black hover:border-zinc-700'}`}>
                      <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${request.hasUx ? 'bg-taurusGold border-taurusGold' : 'border-zinc-600 group-hover:border-zinc-500'}`}>
                         {request.hasUx && <MousePointer className="w-3.5 h-3.5 text-black" />}
                      </div>
                      <input type="checkbox" className="hidden" checked={request.hasUx} onChange={(e) => setRequest({...request, hasUx: e.target.checked})} />
                      <div className="flex-grow">
                        <span className={`block font-bold text-sm ${request.hasUx ? 'text-white' : 'text-zinc-400 group-hover:text-zinc-200'}`}>{t.ux}</span>
                        <span className="block text-xs text-zinc-600">{t.uxDesc}</span>
                      </div>
                      <div className="text-xs font-bold text-taurusGold">{formatFactorDisplay(rules.factors.ux)}</div>
                   </label>

                   {/* CRM */}
                   <label className={`flex items-center space-x-4 p-4 border rounded-xl cursor-pointer transition-all duration-300 group ${request.hasCrm ? 'border-taurusGold bg-zinc-900' : 'border-zinc-800 bg-black hover:border-zinc-700'}`}>
                      <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${request.hasCrm ? 'bg-taurusGold border-taurusGold' : 'border-zinc-600 group-hover:border-zinc-500'}`}>
                         {request.hasCrm && <Database className="w-3.5 h-3.5 text-black" />}
                      </div>
                      <input type="checkbox" className="hidden" checked={request.hasCrm} onChange={(e) => setRequest({...request, hasCrm: e.target.checked})} />
                      <div className="flex-grow">
                        <span className={`block font-bold text-sm ${request.hasCrm ? 'text-white' : 'text-zinc-400 group-hover:text-zinc-200'}`}>{t.crm}</span>
                        <span className="block text-xs text-zinc-600">{t.crmDesc}</span>
                      </div>
                      <div className="text-xs font-bold text-taurusGold">{formatFactorDisplay(rules.factors.crm)}</div>
                   </label>
                </div>
              </div>
            </div>
          </div>

           {/* Section 2: Delivery & Maintenance (Middle - RED Theme) */}
          <div className="bg-zinc-900 rounded-3xl border border-zinc-800 p-8 sm:p-10 shadow-[0_0_60px_rgba(220,38,38,0.25)] relative">
             <h2 className="text-2xl font-bold text-white mb-8 flex items-center font-poppins">
              <span className="bg-zinc-800 text-red-500 w-10 h-10 flex items-center justify-center rounded-xl mr-4 text-sm font-bold border border-zinc-700">02</span>
              {t.title2}
            </h2>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                   <CustomSelect 
                    label={upper(t.deliverySpeed)}
                    value={request.deliverySpeed}
                    options={deliveryOptions}
                    onChange={(val) => setRequest({...request, deliverySpeed: val as DeliverySpeed})}
                  />
                  
                  {request.deliverySpeed !== DeliverySpeed.STANDARD && (
                    <div className="mt-3 flex items-center text-xs text-taurusGold font-bold bg-taurusGold/5 p-3 rounded-lg border border-taurusGold/20">
                      <Zap className="w-4 h-4 mr-2" fill="currentColor" />
                      {t.urgentNote}
                    </div>
                  )}
                </div>

                <div>
                   <CustomSelect 
                    label={upper(t.maintenance)}
                    value={request.maintenanceLevel}
                    options={maintenanceOptions}
                    onChange={(val) => setRequest({...request, maintenanceLevel: val as MaintenanceLevel})}
                    icon={<Layers className="w-5 h-5" />}
                  />

                   <div className="mt-3 text-xs font-bold text-right flex justify-end items-center text-zinc-400">
                      {t.maintenanceCost}: <span className="text-white text-sm ml-2 bg-zinc-800 px-2 py-1 rounded border border-zinc-700">{formatFactorDisplay(rules.maintenanceRates[request.maintenanceLevel])}</span>
                    </div>
                </div>
             </div>
          </div>

          {/* Section 3: Add-ons (Indigo) */}
          <div className="bg-zinc-900 rounded-3xl border border-zinc-800 p-8 sm:p-10 shadow-[0_0_60px_rgba(99,102,241,0.25)] relative">
             <h2 className="text-2xl font-bold text-white mb-8 flex items-center font-poppins">
              <span className="bg-zinc-800 text-indigo-400 w-10 h-10 flex items-center justify-center rounded-xl mr-4 text-sm font-bold border border-zinc-700">03</span>
              {t.title3}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
               {addons.map(addon => {
                 const isSelected = (request.selectedAddons || []).includes(addon.id);
                 const priceFactor = request.country === Country.TR ? addon.priceTR : addon.priceMT;
                 const displayLabel = t_addons && t_addons[addon.id] ? t_addons[addon.id].label : addon.label;
                 const displayDesc = t_addons && t_addons[addon.id] ? t_addons[addon.id].desc : addon.description;

                 return (
                   <div 
                    key={addon.id}
                    onClick={() => toggleAddon(addon.id)}
                    className={`relative cursor-pointer p-5 rounded-xl border transition-all duration-300 ${isSelected ? 'bg-indigo-900/20 border-indigo-500' : 'bg-black border-zinc-800 hover:border-zinc-600'}`}
                   >
                     <div className="flex justify-between items-start mb-2">
                       <span className={`font-bold ${isSelected ? 'text-indigo-400' : 'text-zinc-300'}`}>{displayLabel}</span>
                       <div className={`w-5 h-5 rounded flex items-center justify-center border ${isSelected ? 'bg-indigo-500 border-indigo-500' : 'border-zinc-600'}`}>
                         {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                       </div>
                     </div>
                     <p className="text-xs text-zinc-500 mb-3 min-h-[32px]">{displayDesc}</p>
                     <div className="text-sm font-bold text-white bg-zinc-800 inline-block px-2 py-1 rounded border border-zinc-700">
                       {formatFactorDisplay(priceFactor)}
                     </div>
                   </div>
                 );
               })}
            </div>
          </div>
        </div>

        {/* Live Summary Sidebar */}
        <div className="lg:col-span-1">
          <div className="sticky top-24 space-y-6">
            <div className="bg-black rounded-3xl shadow-2xl p-8 overflow-hidden relative border border-zinc-800 group hover:border-taurusGold/50 transition-colors duration-500">
              <div className="absolute -top-32 -right-32 w-64 h-64 bg-taurusGold/10 rounded-full blur-3xl pointer-events-none group-hover:bg-taurusGold/20 transition-all duration-500"></div>
              
              <h3 className="text-[10px] font-bold tracking-[0.2em] text-zinc-500 mb-8 relative z-10 border-b border-zinc-900 pb-4">
                {upper(t.budgetSummary)}
              </h3>
              
              <div className="space-y-4 relative z-10">
                {/* Final Total Display */}
                <div>
                  <div className="flex justify-between items-baseline">
                    <span className="text-sm font-medium text-zinc-400">{t.netTotal}</span>
                    {breakdown && breakdown.discountAmount > 0 && (
                       <span className="text-xs line-through text-zinc-600">{formatPrice(breakdown.totalOneTime)}</span>
                    )}
                  </div>
                  <div className="text-5xl font-bold text-white tracking-tighter font-poppins">
                    {breakdown && formatPrice(breakdown.finalTotal)}
                  </div>
                </div>

                {/* Discount Inputs */}
                <div className="pt-6 border-t border-zinc-900/50">
                   <h4 className="text-xs font-bold text-zinc-500 mb-3 flex items-center">
                     {request.discountType === DiscountType.PERCENTAGE ? (
                        <Percent className="w-3 h-3 mr-1" />
                     ) : (
                        <Tag className="w-3 h-3 mr-1" />
                     )}
                     {upper(t.discountLabel)}
                   </h4>
                   
                   {/* Stacked Options */}
                   <div className="flex flex-col gap-2 mb-3">
                      <button 
                        onClick={() => setRequest({...request, discountType: DiscountType.FIXED})}
                        className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all ${request.discountType === DiscountType.FIXED ? 'bg-zinc-900 border-taurusGold text-white' : 'bg-black border-zinc-800 text-zinc-500 hover:border-zinc-700'}`}
                      >
                         <span className="text-sm font-bold">{labels.discountTypes[DiscountType.FIXED]}</span>
                         <span className={`text-lg leading-none font-bold ${request.discountType === DiscountType.FIXED ? 'text-taurusGold' : 'text-zinc-600'}`}>
                           {rules.currencySymbol}
                         </span>
                      </button>

                      <button 
                        onClick={() => setRequest({...request, discountType: DiscountType.PERCENTAGE})}
                        className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all ${request.discountType === DiscountType.PERCENTAGE ? 'bg-zinc-900 border-taurusGold text-white' : 'bg-black border-zinc-800 text-zinc-500 hover:border-zinc-700'}`}
                      >
                         <span className="text-sm font-bold">{labels.discountTypes[DiscountType.PERCENTAGE]}</span>
                         <Percent className={`w-4 h-4 ${request.discountType === DiscountType.PERCENTAGE ? 'text-taurusGold' : 'text-zinc-600'}`} />
                      </button>
                   </div>
                   
                   {/* Clean Input Field with Dynamic Padding and Positioning */}
                   <div className="relative">
                      <input 
                        type="number" 
                        min="0"
                        placeholder="0"
                        value={request.discountValue || ''}
                        onChange={(e) => setRequest({...request, discountValue: parseFloat(e.target.value) || 0})}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-4 text-white font-bold text-lg focus:border-taurusGold focus:outline-none appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                        style={{
                           // Add padding to the side where the symbol is located to prevent overlap
                           paddingLeft: showSymbolLeft ? '3rem' : '1.25rem',
                           paddingRight: showSymbolRight ? '3rem' : '1.25rem',
                        }}
                      />
                      
                      {/* Symbol Positioning */}
                      {showSymbolLeft && (
                         <div className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none font-bold">
                            {displaySymbol}
                         </div>
                      )}
                      
                      {showSymbolRight && (
                         <div className="absolute right-5 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none font-bold">
                             {displaySymbol}
                         </div>
                      )}
                   </div>

                   {breakdown && breakdown.discountAmount > 0 && (
                      <div className="mt-2 text-right text-xs font-bold text-red-400">
                        -{formatPrice(breakdown.discountAmount)} İndirim
                      </div>
                   )}
                </div>
                
                <div className="pt-6 mt-2 border-t border-zinc-900">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-zinc-500">{t.monthly}</span>
                    <span className="font-bold text-taurusGold text-xl font-poppins">{breakdown && formatPrice(breakdown.totalMonthly)}</span>
                  </div>
                </div>
              </div>

              <div className="mt-10 relative z-10">
                 <button 
                  onClick={handleCreateProposal}
                  className="w-full flex items-center justify-center space-x-2 bg-taurusGold hover:bg-taurusGold text-black py-4 rounded-xl font-bold transition-all shadow-[0_0_20px_rgba(255,215,0,0.2)] hover:shadow-[0_0_30px_rgba(255,215,0,0.4)] hover:-translate-y-1"
                >
                  <Save className="w-5 h-5" />
                  <span>{t.createProposal}</span>
                  <ArrowRight className="w-5 h-5" />
                 </button>
              </div>
            </div>

            {/* Cost Visualization */}
            <div className="bg-black rounded-3xl border border-zinc-800 p-8">
              <h4 className="text-[10px] font-bold uppercase text-zinc-500 mb-6 tracking-[0.2em]">{upper(t.chartTitle)}</h4>
              <div className="h-40 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} tick={{fill: '#52525b', fontWeight: 600}} dy={10} />
                    <YAxis hide />
                    <Tooltip 
                      formatter={(value: number) => [formatPrice(value)]}
                      contentStyle={{ borderRadius: '8px', border: '1px solid #3f3f46', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.5)', backgroundColor: '#09090b', color: '#fff', fontSize: '12px' }}
                      itemStyle={{ color: '#fff' }}
                      cursor={{fill: '#18181b', radius: 4}}
                    />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={40}>
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PricingCalculator;
