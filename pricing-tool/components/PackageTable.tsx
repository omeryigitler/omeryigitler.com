import React, { useState, useEffect } from 'react';
import { Country, Language } from '../types';
import { TRANSLATIONS } from '../translations';
import { Check, X } from 'lucide-react';

interface Props {
  language: Language;
}

const PackageTable: React.FC<Props> = ({ language }) => {
  const [activeCountry, setActiveCountry] = useState<Country>(Country.TR);
  
  // Sync currency view with language initially, but allow toggle
  useEffect(() => {
    setActiveCountry(language === Language.TR ? Country.TR : Country.MT);
  }, [language]);

  const t = TRANSLATIONS[language].packages;

  // Features logic: true = Check, false = X. 
  // Updated prices to follow strict rules:
  // TR: 10.000 ₺ (Space before symbol)
  // MT: €1,000 (Symbol first, comma separator)
  const packageMeta = [
    { key: 'starter', priceTR: '10.000 ₺', priceMT: '€1,000', color: 'border-zinc-800 bg-zinc-900', btnColor: 'bg-zinc-800 text-white hover:bg-zinc-700', checks: [true, true, false, true, true, false, true] },
    { key: 'business', priceTR: '25.000 ₺', priceMT: '€2,500', color: 'border-taurusGold/50 bg-zinc-900 shadow-[0_0_30px_rgba(255,215,0,0.1)] scale-105 z-10', btnColor: 'bg-taurusGold text-black hover:bg-taurusGold font-bold', checks: [true, true, true, true, true, true, true] },
    { key: 'premium', priceTR: '50.000 ₺', priceMT: '€5,000', color: 'border-zinc-800 bg-zinc-900', btnColor: 'bg-zinc-800 text-white hover:bg-zinc-700', checks: [true, true, true, true, true, true, true] },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-24">
      <div className="text-center mb-20">
        <h2 className="text-4xl font-extrabold text-white font-poppins">{t.title}</h2>
        <p className="mt-4 text-zinc-400 max-w-2xl mx-auto text-lg">{t.subtitle}</p>
        
        <div className="mt-8 inline-flex bg-zinc-900 rounded-xl p-1.5 border border-zinc-800">
          <button 
            onClick={() => setActiveCountry(Country.TR)}
            className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${activeCountry === Country.TR ? 'bg-taurusGold shadow-sm text-black' : 'text-zinc-500 hover:text-white'}`}
          >
            Türkiye (₺)
          </button>
          <button 
             onClick={() => setActiveCountry(Country.MT)}
             className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${activeCountry === Country.MT ? 'bg-taurusGold shadow-sm text-black' : 'text-zinc-500 hover:text-white'}`}
          >
            Malta (€)
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
        {packageMeta.map((pkg: any) => {
            // Access translation dynamically based on key ('starter', 'business', 'premium')
            const pkgTrans = (t as any)[pkg.key];
            return (
              <div key={pkg.key} className={`relative rounded-3xl p-10 transition-transform border ${pkg.color}`}>
                {pkgTrans.badge && (
                  <span className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-taurusGold text-black text-xs font-bold px-4 py-1.5 rounded-full uppercase tracking-wide shadow-lg">
                    {pkgTrans.badge}
                  </span>
                )}
                <h3 className="text-2xl font-bold text-white font-poppins">{pkgTrans.name}</h3>
                <p className="text-zinc-400 text-sm mt-2 font-medium">{pkgTrans.desc}</p>
                <div className="my-8">
                  <span className="text-5xl font-extrabold text-white tracking-tighter">
                    {activeCountry === Country.TR ? pkg.priceTR : pkg.priceMT}
                  </span>
                </div>
                
                <ul className="space-y-4 mb-10">
                  {pkgTrans.features.map((featureName: string, idx: number) => (
                    <li key={idx} className="flex items-start">
                      {pkg.checks[idx] ? (
                        <Check className="w-5 h-5 text-taurusGold mr-3 flex-shrink-0" strokeWidth={3} />
                      ) : (
                        <X className="w-5 h-5 text-zinc-700 mr-3 flex-shrink-0" />
                      )}
                      <span className={`text-sm ${pkg.checks[idx] ? 'text-zinc-300 font-medium' : 'text-zinc-600 line-through'}`}>
                        {featureName}
                      </span>
                    </li>
                  ))}
                </ul>

                <button className={`w-full py-4 px-4 rounded-xl font-bold transition-all shadow-xl ${pkg.btnColor}`}>
                  {t.selectBtn}
                </button>
              </div>
            );
        })}
      </div>
    </div>
  );
};

export default PackageTable;