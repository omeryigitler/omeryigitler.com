
import React, { useState } from 'react';
import { Country, PricingRules, SiteType, MaintenanceLevel, DeliverySpeed, Language, PricingFactor, PricingFactorType, AddonService } from '../types';
import { Save, RotateCcw, Settings, Globe, Plus, Trash2, Percent, Zap, Package } from 'lucide-react';
import { TRANSLATIONS } from '../translations';

interface Props {
  config: Record<Country, PricingRules>;
  addons: AddonService[];
  onUpdateConfig: (newConfig: Record<Country, PricingRules>) => void;
  onUpdateAddons: (newAddons: AddonService[]) => void;
  onResetDefaults: () => void;
  language: Language;
}

const AdminSettings: React.FC<Props> = ({ config, addons, onUpdateConfig, onUpdateAddons, onResetDefaults, language }) => {
  const [activeTab, setActiveTab] = useState<Country>(Country.TR);
  // Local state for forms to prevent jittery updates, commit on save
  const [localConfig, setLocalConfig] = useState(config);
  const [localAddons, setLocalAddons] = useState(addons);

  const t = TRANSLATIONS[language].admin;
  const labels = TRANSLATIONS[language].labels;

  const handleSave = () => {
    onUpdateConfig(localConfig);
    onUpdateAddons(localAddons);
    alert(t.saveSuccess);
  };

  const handleReset = () => {
    if(confirm(t.resetConfirm)) {
      onResetDefaults();
      window.location.reload(); 
    }
  };

  const updatePrice = (country: Country, path: string[], value: any) => {
    const newConfig = { ...localConfig };
    let current: any = newConfig[country];
    
    for (let i = 0; i < path.length - 1; i++) {
      current = current[path[i]];
    }
    current[path[path.length - 1]] = value;
    setLocalConfig(newConfig);
  };

  const updateFactor = (country: Country, key: keyof PricingRules['factors'], field: keyof PricingFactor, value: any) => {
    const newConfig = { ...localConfig };
    newConfig[country].factors[key] = {
      ...newConfig[country].factors[key],
      [field]: value
    };
    setLocalConfig(newConfig);
  }

  const updateMaintenance = (country: Country, key: keyof PricingRules['maintenanceRates'], field: keyof PricingFactor, value: any) => {
    const newConfig = { ...localConfig };
    newConfig[country].maintenanceRates[key] = {
      ...newConfig[country].maintenanceRates[key],
      [field]: value
    };
    setLocalConfig(newConfig);
  };

  const updateAddon = (id: string, field: keyof AddonService, value: any) => {
    setLocalAddons(localAddons.map(a => a.id === id ? { ...a, [field]: value } : a));
  };
  
  const updateAddonPrice = (id: string, countryKey: 'priceTR' | 'priceMT', field: keyof PricingFactor, value: any) => {
    setLocalAddons(localAddons.map(a => {
        if (a.id === id) {
            return {
                ...a,
                [countryKey]: {
                    ...a[countryKey],
                    [field]: value
                }
            };
        }
        return a;
    }));
  };

  const rules = localConfig[activeTab];

  // --- UNIFIED INPUT COMPONENT ---
  const UniversalInputRow = ({ 
    label, 
    value, 
    type, 
    onValueChange, 
    onTypeChange,
    className = ""
  }: { 
    label?: string, 
    value: number, 
    type: PricingFactorType, 
    onValueChange: (val: number) => void,
    onTypeChange?: (type: PricingFactorType) => void,
    className?: string
  }) => {
    return (
      <div className={`flex justify-between items-center bg-black p-3 rounded-lg border border-zinc-800 hover:border-zinc-700 transition-colors ${className}`}>
         {label && <label className="text-zinc-400 text-sm font-medium mr-4 flex-grow">{label}</label>}
         <div className="flex items-center space-x-2 flex-shrink-0">
            <div className="flex bg-zinc-900 rounded-lg p-1 border border-zinc-700">
               <button 
                onClick={() => onTypeChange && onTypeChange(PricingFactorType.FIXED)}
                disabled={!onTypeChange}
                className={`w-7 h-7 rounded flex items-center justify-center transition-colors ${
                    type === PricingFactorType.FIXED 
                    ? 'bg-zinc-700 text-white shadow-sm' 
                    : 'text-zinc-500 hover:text-white'
                } ${!onTypeChange ? 'cursor-default opacity-80' : ''}`}
                title="Sabit Fiyat"
               >
                 <span className="text-xs font-bold">{rules.currencySymbol}</span>
               </button>
               <button 
                onClick={() => onTypeChange && onTypeChange(PricingFactorType.PERCENTAGE)}
                disabled={!onTypeChange}
                className={`w-7 h-7 rounded flex items-center justify-center transition-colors ${
                    type === PricingFactorType.PERCENTAGE 
                    ? 'bg-zinc-700 text-white shadow-sm' 
                    : 'text-zinc-500 hover:text-white'
                } ${!onTypeChange ? 'cursor-default opacity-50' : ''}`}
                title="Yüzde"
               >
                 <Percent className="w-3 h-3" />
               </button>
            </div>
            <input 
              type="number" 
              value={value} 
              onChange={(e) => onValueChange(parseFloat(e.target.value))}
              className="bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-white w-24 text-right focus:border-taurusGold outline-none text-sm font-bold"
            />
         </div>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white font-poppins">{t.title}</h1>
          <p className="text-zinc-500">{t.subtitle}</p>
        </div>
        <div className="flex space-x-3">
          <button onClick={handleReset} className="flex items-center px-4 py-2 border border-red-900 text-red-500 rounded-lg hover:bg-red-900/20 transition-colors">
            <RotateCcw className="w-4 h-4 mr-2" /> {t.reset}
          </button>
          <button onClick={handleSave} className="flex items-center px-6 py-2 bg-taurusGold text-black font-bold rounded-lg hover:bg-taurusGold transition-colors shadow-lg shadow-taurusGold/20">
            <Save className="w-4 h-4 mr-2" /> {t.save}
          </button>
        </div>
      </div>

      {/* Country Tabs */}
      <div className="flex space-x-1 mb-8 bg-zinc-900 p-1 rounded-xl w-fit border border-zinc-800">
        <button 
          onClick={() => setActiveTab(Country.TR)}
          className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === Country.TR ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-white'}`}
        >
          🇹🇷 {t.trSettings}
        </button>
        <button 
          onClick={() => setActiveTab(Country.MT)}
          className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === Country.MT ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-white'}`}
        >
          🇲🇹 {t.mtSettings}
        </button>
      </div>

      {/* Main Grid: Split logic to balance height */}
      {/* Left Column: Base Prices & Maintenance */}
      {/* Right Column: Unit Rates, Speed, Factors */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        
        {/* LEFT COLUMN */}
        <div className="space-y-8">
            {/* Base Prices */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
              <h2 className="text-xl font-bold text-white mb-6 flex items-center">
                <Globe className="w-5 h-5 mr-2 text-taurusGold" /> {t.basePrices} ({rules.currencySymbol})
              </h2>
              <div className="space-y-3">
                {Object.entries(rules.basePrices).map(([key, value]) => (
                  <UniversalInputRow 
                    key={key} 
                    label={labels.siteTypes[key as SiteType]} 
                    value={value}
                    type={PricingFactorType.FIXED} // Base Prices are strictly FIXED
                    onValueChange={(val) => updatePrice(activeTab, ['basePrices', key], val)} 
                  />
                ))}
              </div>
            </div>

            {/* Maintenance Rates */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
              <h2 className="text-xl font-bold text-white mb-6 flex items-center">
                 <RotateCcw className="w-5 h-5 mr-2 text-taurusGold" /> {t.maintenanceRates}
              </h2>
              <div className="space-y-3">
                {Object.entries(rules.maintenanceRates).map(([key, value]) => (
                  <UniversalInputRow 
                    key={key} 
                    label={labels.maintenance[key as MaintenanceLevel]} 
                    value={value.value}
                    type={value.type}
                    onValueChange={(val) => updateMaintenance(activeTab, key as MaintenanceLevel, 'value', val)}
                    onTypeChange={(t) => updateMaintenance(activeTab, key as MaintenanceLevel, 'type', t)}
                  />
                ))}
              </div>
            </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="space-y-8">
            {/* Unit Rates & Speed (Combined for better logical grouping of 'Rates') */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
              <h2 className="text-xl font-bold text-white mb-6 flex items-center">
                <Settings className="w-5 h-5 mr-2 text-taurusGold" /> {t.unitRates}
              </h2>
              <div className="space-y-3">
                 <UniversalInputRow 
                    label={t.pageRate} 
                    value={rules.pageRate} 
                    type={PricingFactorType.FIXED}
                    onValueChange={(val) => updatePrice(activeTab, ['pageRate'], val)} 
                 />
              </div>

               {/* Speed Multipliers moved here */}
               <div className="border-t border-zinc-800 mt-6 pt-6">
                  <h3 className="text-lg font-bold text-white mb-4 flex items-center">
                     <Zap className="w-5 h-5 mr-2 text-taurusGold" /> {t.speedMultipliers} (x)
                  </h3>
                  <div className="space-y-3">
                    {Object.entries(rules.speedMultipliers).map(([key, value]) => (
                      <div key={key} className="flex justify-between items-center bg-black p-3 rounded-lg border border-zinc-800 hover:border-zinc-700 transition-colors">
                        <label className="text-zinc-400 text-sm font-medium">{labels.speeds[key as DeliverySpeed]}</label>
                        <div className="relative">
                          <input 
                            type="number" 
                            step="0.1"
                            value={value} 
                            onChange={(e) => updatePrice(activeTab, ['speedMultipliers', key], parseFloat(e.target.value))}
                            className="bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-white w-24 text-right focus:border-taurusGold outline-none font-bold"
                          />
                          <span className="absolute right-8 top-1/2 -translate-y-1/2 text-zinc-600 text-xs pointer-events-none">x</span>
                        </div>
                      </div>
                    ))}
                  </div>
               </div>
            </div>

            {/* Flexible Factors */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
              <h2 className="text-xl font-bold text-white mb-4 flex items-center">
                 <Percent className="w-5 h-5 mr-2 text-taurusGold" /> {t.multipliers}
              </h2>
              <p className="text-xs text-zinc-500 mb-6">{t.multiplierDesc}</p>
              <div className="space-y-3">
                 <UniversalInputRow 
                   label={t.seoRate} 
                   value={rules.factors.seo.value}
                   type={rules.factors.seo.type}
                   onValueChange={(val) => updateFactor(activeTab, 'seo', 'value', val)}
                   onTypeChange={(t) => updateFactor(activeTab, 'seo', 'type', t)}
                 />
                 <UniversalInputRow 
                   label={t.designDiff} 
                   value={rules.factors.design.value}
                   type={rules.factors.design.type}
                   onValueChange={(val) => updateFactor(activeTab, 'design', 'value', val)}
                   onTypeChange={(t) => updateFactor(activeTab, 'design', 'type', t)}
                 />
                 <UniversalInputRow 
                   label={t.langDiff} 
                   value={rules.factors.multiLang.value}
                   type={rules.factors.multiLang.type}
                   onValueChange={(val) => updateFactor(activeTab, 'multiLang', 'value', val)}
                   onTypeChange={(t) => updateFactor(activeTab, 'multiLang', 'type', t)}
                 />
                 <UniversalInputRow 
                   label={t.graphicsDiff} 
                   value={rules.factors.graphics.value}
                   type={rules.factors.graphics.type}
                   onValueChange={(val) => updateFactor(activeTab, 'graphics', 'value', val)}
                   onTypeChange={(t) => updateFactor(activeTab, 'graphics', 'type', t)}
                 />
                 <UniversalInputRow 
                   label={t.uxDiff} 
                   value={rules.factors.ux.value}
                   type={rules.factors.ux.type}
                   onValueChange={(val) => updateFactor(activeTab, 'ux', 'value', val)}
                   onTypeChange={(t) => updateFactor(activeTab, 'ux', 'type', t)}
                 />
                 <UniversalInputRow 
                   label={t.crmDiff} 
                   value={rules.factors.crm.value}
                   type={rules.factors.crm.type}
                   onValueChange={(val) => updateFactor(activeTab, 'crm', 'value', val)}
                   onTypeChange={(t) => updateFactor(activeTab, 'crm', 'type', t)}
                 />
              </div>
            </div>
        </div>

      </div>

      {/* Addons Section - Full Width at Bottom */}
      <div className="mt-8 bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
        <div className="flex justify-between items-center mb-6">
           <h2 className="text-xl font-bold text-white flex items-center">
             <Package className="w-5 h-5 mr-2 text-taurusGold" /> {t.addonsTitle}
           </h2>
           <button 
             onClick={() => {
               const newId = `addon_${Date.now()}`;
               setLocalAddons([...localAddons, { 
                   id: newId, 
                   label: 'Yeni Hizmet', 
                   description: 'Açıklama giriniz', 
                   priceTR: { value: 1000, type: PricingFactorType.FIXED },
                   priceMT: { value: 100, type: PricingFactorType.FIXED } 
               }]);
             }}
             className="text-xs flex items-center bg-zinc-800 hover:bg-zinc-700 text-white px-3 py-2 rounded-lg transition-colors"
           >
             <Plus className="w-3 h-3 mr-1" /> {t.addNew}
           </button>
        </div>
        
        <div className="grid grid-cols-1 gap-4">
          {localAddons.map((addon) => {
             // Determine value and type based on active tab
             const currentPrice = activeTab === Country.TR ? addon.priceTR : addon.priceMT;
             const countryKey = activeTab === Country.TR ? 'priceTR' : 'priceMT';

             return (
                <div key={addon.id} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end bg-black p-4 rounded-xl border border-zinc-800 hover:border-zinc-700 transition-colors">
                   <div className="md:col-span-3">
                     <label className="text-xs text-zinc-500 block mb-1">{t.serviceName}</label>
                     <input 
                        type="text" 
                        value={addon.label}
                        onChange={(e) => updateAddon(addon.id, 'label', e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-white text-sm focus:border-taurusGold outline-none h-[42px]"
                     />
                   </div>
                   <div className="md:col-span-6">
                     <label className="text-xs text-zinc-500 block mb-1">{t.desc}</label>
                     <input 
                        type="text" 
                        value={addon.description}
                        onChange={(e) => updateAddon(addon.id, 'description', e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-zinc-300 text-sm focus:border-taurusGold outline-none h-[42px]"
                     />
                   </div>
                   
                   {/* Styled Price Input without nested 'UniversalInputRow' styling overkill */}
                   <div className="md:col-span-2">
                     <label className="text-xs text-zinc-500 block mb-1">
                       {activeTab === Country.TR ? t.priceTR : t.priceMT}
                     </label>
                     
                     <div className="flex items-center space-x-2 bg-zinc-900 border border-zinc-700 rounded px-2 h-[42px] focus-within:border-taurusGold transition-colors">
                        {/* Type Toggles */}
                        <div className="flex bg-zinc-800 rounded p-0.5 border border-zinc-600">
                           <button 
                            onClick={() => updateAddonPrice(addon.id, countryKey, 'type', PricingFactorType.FIXED)}
                            className={`w-6 h-6 rounded flex items-center justify-center transition-colors ${
                                currentPrice.type === PricingFactorType.FIXED 
                                ? 'bg-zinc-600 text-white' 
                                : 'text-zinc-500 hover:text-white'
                            }`}
                            title="Sabit"
                           >
                             <span className="text-[10px] font-bold">{rules.currencySymbol}</span>
                           </button>
                           <button 
                            onClick={() => updateAddonPrice(addon.id, countryKey, 'type', PricingFactorType.PERCENTAGE)}
                            className={`w-6 h-6 rounded flex items-center justify-center transition-colors ${
                                currentPrice.type === PricingFactorType.PERCENTAGE 
                                ? 'bg-zinc-600 text-white' 
                                : 'text-zinc-500 hover:text-white'
                            }`}
                            title="Yüzde"
                           >
                             <Percent className="w-3 h-3" />
                           </button>
                        </div>

                        <input 
                          type="number" 
                          value={currentPrice.value}
                          onChange={(e) => updateAddonPrice(addon.id, countryKey, 'value', parseFloat(e.target.value))}
                          className="bg-transparent text-white w-full text-right outline-none text-sm font-bold"
                        />
                     </div>
                   </div>

                   <div className="md:col-span-1 flex justify-end pb-1">
                      <button 
                        onClick={() => setLocalAddons(localAddons.filter(a => a.id !== addon.id))}
                        className="p-2 text-zinc-600 hover:text-red-500 transition-colors hover:bg-red-900/20 rounded-lg"
                       >
                         <Trash2 className="w-5 h-5" />
                       </button>
                   </div>
                </div>
             );
          })}
        </div>
      </div>
    </div>
  );
};

export default AdminSettings;
