

import React from 'react';
import { CostBreakdown, QuoteRequest, PricingRules, Country, Language, PricingFactor, PricingFactorType, AddonService, DiscountType, DesignType } from '../types';
import { TRANSLATIONS } from '../translations';
import { Printer, ArrowLeft, CheckCircle, Calendar, Code, Rocket, PenTool } from 'lucide-react';

interface Props {
  config: Record<Country, PricingRules>;
  addons: AddonService[];
  request: QuoteRequest;
  breakdown: CostBreakdown | null;
  onBack: () => void;
  onNavigate: (view: string) => void;
  language: Language;
}

const ProposalView: React.FC<Props> = ({ config, addons, request, breakdown, onBack, onNavigate, language }) => {
  if (!breakdown) return null;
  const rules = config[request.country];
  // Format date based on locale
  const dateStr = new Date().toLocaleDateString(language === Language.TR ? 'tr-TR' : 'en-GB', { year: 'numeric', month: 'long', day: 'numeric' });

  const t = TRANSLATIONS[language].proposal;
  const t_calc = TRANSLATIONS[language].calc;
  const common = TRANSLATIONS[language].common;
  const labels = TRANSLATIONS[language].labels;
  const t_addons = TRANSLATIONS[language].addons as any;

  // STRICT TDK FORMATTING
  const formatCurrency = (val: number) => {
    if (request.country === Country.TR) {
      // TR: 10.000 ₺
      return `${Math.round(val).toLocaleString('tr-TR', { maximumFractionDigits: 0 })} ${rules.currencySymbol}`;
    } else {
      // MT: €1,000
      return `${rules.currencySymbol}${Math.round(val).toLocaleString('en-GB', { maximumFractionDigits: 0 })}`;
    }
  };

  // Helper to display factor (e.g., "+30%" or "+5000 ₺")
  const formatFactorDisplay = (factor: PricingFactor) => {
    if (factor.type === PricingFactorType.PERCENTAGE) {
      return `+${factor.value}%`;
    }
    return `+${formatCurrency(factor.value)}`;
  }

  // Calculate Discount Percentage for Display
  const getDiscountDisplay = () => {
    // If discount is fixed, do not show percentage as per request
    if (request.discountType === DiscountType.FIXED) return '';

    if (breakdown.discountAmount <= 0) return '';

    // Default to percentage display if type is PERCENTAGE
    let percentVal = request.discountValue;

    // Format: %20 for TR, 20% for EN
    if (language === Language.TR) {
      return `(%${percentVal.toLocaleString('tr-TR', { maximumFractionDigits: 1 })})`;
    } else {
      return `(${percentVal.toLocaleString('en-GB', { maximumFractionDigits: 1 })}%)`;
    }
  };

  // Timeline Logic
  const getTimelineWeeks = () => {
    if (request.deliverySpeed === 'URGENT') return 1;
    if (request.deliverySpeed === 'FAST') return 3;
    return 6;
  };
  const weeks = getTimelineWeeks();
  const phases = [
    { label: t.phase1, width: '30%', icon: PenTool, color: 'bg-zinc-800' },
    { label: t.phase2, width: '45%', icon: Code, color: 'bg-[#FFD700]' },
    { label: t.phase3, width: '25%', icon: Rocket, color: 'bg-zinc-800' },
  ];

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 proposal-wrap">
      {/* Action Bar */}
      <div className="mb-8 flex justify-between items-center no-print">
        <button onClick={onBack} className="flex items-center text-zinc-400 hover:text-white font-medium transition-colors">
          <ArrowLeft className="w-4 h-4 mr-2" />
          {common.back}
        </button>
        <div className="flex space-x-2">
          {/* Print / Download Button */}
          <button
            onClick={() => window.print()}
            className="flex items-center text-white bg-zinc-900 border border-zinc-700 px-6 py-3 rounded-xl font-bold hover:bg-zinc-800 transition-colors"
          >
            <Printer className="w-4 h-4 mr-2" />
            {common.print}
          </button>

          {/* Next Button */}
          <button
            onClick={() => onNavigate('contract')}
            className="flex items-center bg-[#FFD700] text-black px-6 py-3 rounded-xl font-bold hover:bg-[#FFD700] transition-colors shadow-lg shadow-taurusGold/20"
          >
            <span>{t.nextContract}</span>
            <ArrowLeft className="w-4 h-4 ml-2 rotate-180" />
          </button>
        </div>
      </div>

      {/* Proposal Paper - Keeping White for Print Logic */}
      <div className="bg-white shadow-2xl rounded-none sm:rounded-md p-16 print:shadow-none print:p-0" id="proposal-content">

        {/* Header */}
        <div className="flex justify-between items-start border-b-4 border-black pb-8 mb-12">
          <div>
            {/* Manually uppercased to avoid browser locale issues with 'i' vs 'I' */}
            <h1 className="text-5xl font-extrabold text-black tracking-tighter font-poppins leading-none">ÖMER<br />YİĞİTLER</h1>
            <p className="text-black mt-2 font-bold tracking-[0.2em] text-sm uppercase bg-[#FFD700] inline-block px-2 py-1">
              {t.agency}
            </p>
          </div>
          <div className="text-right">
            <h2 className="text-2xl font-bold text-black mb-1 font-poppins uppercase">{t.title}</h2>
            <p className="text-zinc-500 text-sm">{t.refNo}: #QT-{Math.floor(Math.random() * 10000)}</p>
            <p className="text-zinc-500 text-sm">{t.date}: {dateStr}</p>
          </div>
        </div>

        {/* Client Info */}
        <div className="mb-14 bg-zinc-50 p-10 rounded-2xl border border-zinc-100">
          <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-4">{t.dearClient}</h3>
          <p className="text-3xl font-bold text-black font-poppins mb-3">{request.customerName}</p>
          <p className="text-zinc-600 leading-relaxed max-w-2xl">
            {t.intro}
          </p>
        </div>

        {/* Project Details Grid */}
        <div className="grid grid-cols-2 gap-16 mb-16">
          <div>
            <h3 className="text-sm font-bold text-black uppercase tracking-widest mb-6 pb-2 border-b border-zinc-200">{t.scope}</h3>
            <ul className="space-y-5">
              <li className="flex justify-between items-center group">
                <span className="text-zinc-500 group-hover:text-black transition-colors">{t.siteType}</span>
                <span className="font-bold text-black text-lg">{labels.siteTypes[request.siteType]}</span>
              </li>
              <li className="flex justify-between items-center group">
                <span className="text-zinc-500 group-hover:text-black transition-colors">{t.pages}</span>
                <span className="font-bold text-black text-lg">{request.pageCount}</span>
              </li>
              <li className="flex justify-between items-center group">
                <span className="text-zinc-500 group-hover:text-black transition-colors">{t.design}</span>
                <span className="font-bold text-black text-lg">
                  {request.designType === DesignType.CUSTOM ? t_calc.custom : t_calc.template}
                </span>
              </li>
              <li className="flex justify-between items-center group">
                <span className="text-zinc-500 group-hover:text-black transition-colors">{t.delivery}</span>
                <span className="font-bold text-black text-lg">{labels.speeds[request.deliverySpeed]}</span>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-bold text-black uppercase tracking-widest mb-6 pb-2 border-b border-zinc-200">{t.extras}</h3>
            <ul className="space-y-5">
              <li className="flex items-center text-zinc-700">
                <CheckCircle className={`w-6 h-6 mr-4 ${request.isMultiLang ? 'text-[#FFD700]' : 'text-zinc-200'}`} />
                <span className={!request.isMultiLang ? 'text-zinc-300' : 'font-bold text-black'}>{t.langDiff}</span>
              </li>
              <li className="flex items-center text-zinc-700">
                <CheckCircle className={`w-6 h-6 mr-4 ${request.hasSeo ? 'text-[#FFD700]' : 'text-zinc-200'}`} />
                <span className={!request.hasSeo ? 'text-zinc-300' : 'font-bold text-black'}>{t.seoSetup}</span>
              </li>
              <li className="flex items-center text-zinc-700">
                <CheckCircle className={`w-6 h-6 mr-4 ${request.hasGraphics ? 'text-[#FFD700]' : 'text-zinc-200'}`} />
                <span className={!request.hasGraphics ? 'text-zinc-300' : 'font-bold text-black'}>{t.graphicsDiff}</span>
              </li>
              <li className="flex items-center text-zinc-700">
                <CheckCircle className={`w-6 h-6 mr-4 ${request.hasUx ? 'text-[#FFD700]' : 'text-zinc-200'}`} />
                <span className={!request.hasUx ? 'text-zinc-300' : 'font-bold text-black'}>{t.uxDiff}</span>
              </li>
              <li className="flex items-center text-zinc-700">
                <CheckCircle className={`w-6 h-6 mr-4 ${request.hasCrm ? 'text-[#FFD700]' : 'text-zinc-200'}`} />
                <span className={!request.hasCrm ? 'text-zinc-300' : 'font-bold text-black'}>{t.crmDiff}</span>
              </li>
              <li className="flex items-center text-zinc-700">
                <CheckCircle className={`w-6 h-6 mr-4 ${request.maintenanceLevel !== 'NONE' ? 'text-[#FFD700]' : 'text-zinc-200'}`} />
                <span className={request.maintenanceLevel === 'NONE' ? 'text-zinc-300' : 'font-bold text-black'}>
                  {labels.maintenance[request.maintenanceLevel]}
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Timeline Visualization (New Feature) */}
        <div className="mb-16">
          <h3 className="text-sm font-bold text-black uppercase tracking-widest mb-6 flex items-center">
            <Calendar className="w-4 h-4 mr-2 text-[#FFD700]" />
            {t.timeline} ({weeks} {t.week})
          </h3>
          <div className="relative pt-6 pb-2">
            <div className="flex h-12 rounded-xl overflow-hidden shadow-inner bg-zinc-100">
              {phases.map((phase, idx) => (
                <div key={idx} style={{ width: phase.width }} className={`relative flex items-center justify-center ${phase.color} ${idx < phases.length - 1 ? 'border-r border-white/20' : ''}`}>
                  <phase.icon className={`w-5 h-5 ${phase.color === 'bg-[#FFD700]' ? 'text-black' : 'text-white'}`} />
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-3 text-xs font-bold uppercase text-zinc-400 tracking-wider">
              <span className="w-[30%] text-center">{t.phase1}</span>
              <span className="w-[45%] text-center">{t.phase2}</span>
              <span className="w-[25%] text-center">{t.phase3}</span>
            </div>
          </div>
        </div>

        {/* Financial Breakdown Table */}
        <div className="mb-12">
          <h3 className="text-sm font-bold text-black uppercase tracking-widest mb-6">{t.pricingDetail}</h3>
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b-2 border-zinc-100">
                <th className="py-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">{t.serviceItem}</th>
                <th className="py-4 text-xs font-bold text-zinc-400 uppercase tracking-wider text-right">{t.amount}</th>
              </tr>
            </thead>
            <tbody className="text-zinc-700">
              <tr className="border-b border-zinc-50">
                <td className="py-4 font-medium">{t.basePrice}</td>
                <td className="py-4 text-right font-medium">{formatCurrency(breakdown.base)}</td>
              </tr>
              <tr className="border-b border-zinc-50">
                <td className="py-4 font-medium">{t.pagePrice} ({request.pageCount})</td>
                <td className="py-4 text-right font-medium">{formatCurrency(breakdown.pages)}</td>
              </tr>
              {request.designType === DesignType.CUSTOM && (
                <tr className="border-b border-zinc-50">
                  <td className="py-4 font-medium">{t.designDiff} ({formatFactorDisplay(rules.factors.design)})</td>
                  <td className="py-4 text-right font-medium">{formatCurrency(breakdown.design)}</td>
                </tr>
              )}
              {request.isMultiLang && (
                <tr className="border-b border-zinc-50">
                  <td className="py-4 font-medium">{t.langDiff} ({formatFactorDisplay(rules.factors.multiLang)})</td>
                  <td className="py-4 text-right font-medium">{formatCurrency(breakdown.multiLang)}</td>
                </tr>
              )}
              {request.hasSeo && (
                <tr className="border-b border-zinc-50">
                  <td className="py-4 font-medium">{t.seoSetup}</td>
                  <td className="py-4 text-right font-medium">{formatCurrency(breakdown.seo)}</td>
                </tr>
              )}
              {request.hasGraphics && (
                <tr className="border-b border-zinc-50">
                  <td className="py-4 font-medium">{t.graphicsDiff} ({formatFactorDisplay(rules.factors.graphics)})</td>
                  <td className="py-4 text-right font-medium">{formatCurrency(breakdown.graphics)}</td>
                </tr>
              )}
              {request.hasUx && (
                <tr className="border-b border-zinc-50">
                  <td className="py-4 font-medium">{t.uxDiff} ({formatFactorDisplay(rules.factors.ux)})</td>
                  <td className="py-4 text-right font-medium">{formatCurrency(breakdown.ux)}</td>
                </tr>
              )}
              {request.hasCrm && (
                <tr className="border-b border-zinc-50">
                  <td className="py-4 font-medium">{t.crmDiff} ({formatFactorDisplay(rules.factors.crm)})</td>
                  <td className="py-4 text-right font-medium">{formatCurrency(breakdown.crm)}</td>
                </tr>
              )}

              {/* Add-ons List in Table */}
              {request.selectedAddons && request.selectedAddons.length > 0 && (
                <>
                  {request.selectedAddons.map(id => {
                    const addon = addons.find(a => a.id === id);
                    if (!addon) return null;
                    const priceFactor = request.country === Country.TR ? addon.priceTR : addon.priceMT;
                    // Standardized Lookup: Try Translation -> Fallback to Database Object
                    const displayLabel = t_addons && t_addons[addon.id] ? t_addons[addon.id].label : addon.label;

                    return (
                      <tr key={id} className="border-b border-zinc-50 bg-indigo-50/50">
                        <td className="py-4 pl-4 font-medium text-indigo-900 flex items-center">
                          <CheckCircle className="w-3 h-3 mr-2 text-indigo-500" />
                          {displayLabel}
                          {priceFactor.type === PricingFactorType.PERCENTAGE && (
                            <span className="text-xs text-indigo-600 ml-1 font-bold">({priceFactor.value}%)</span>
                          )}
                        </td>
                        <td className="py-4 pr-4 text-right font-medium text-indigo-900">
                          {/* Addons Calculation: This component doesn't re-calculate, it uses passed down breakdown.addons. 
                               However, to show line-item detail, we ideally need line-item values. 
                               Since this view is static and just for proposal, we will rely on showing the factor type.
                               For exact amount per line item, Calculator needs to pass detail map. 
                               For now, we display the Factor Rate. */}
                          {formatFactorDisplay(priceFactor)}
                        </td>
                      </tr>
                    )
                  })}
                </>
              )}

              {request.deliverySpeed !== 'STANDARD' && (
                <tr className="border-b border-zinc-50 bg-yellow-50">
                  <td className="py-4 pl-4 text-black font-bold">{t.speedDiff} ({labels.speeds[request.deliverySpeed]})</td>
                  <td className="py-4 pr-4 text-right text-black font-bold">{formatCurrency(breakdown.speed)}</td>
                </tr>
              )}

              {/* Discount Logic */}
              {breakdown.discountAmount > 0 && (
                <tr className="border-b border-zinc-50">
                  <td className="py-4 font-medium text-red-600">
                    {t.discount} <span className="text-xs ml-1 font-bold">{getDiscountDisplay()}</span>
                  </td>
                  <td className="py-4 text-right font-medium text-red-600">-{formatCurrency(breakdown.discountAmount)}</td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr className="border-t-4 border-black">
                {breakdown.discountAmount > 0 ? (
                  <>
                    <td className="py-6 text-xl font-bold text-black">{t.netTotal}</td>
                    <td className="py-6 text-xl font-bold text-black text-right">{formatCurrency(breakdown.finalTotal)}</td>
                  </>
                ) : (
                  <>
                    <td className="py-6 text-xl font-bold text-black">{t.total}</td>
                    <td className="py-6 text-xl font-bold text-black text-right">{formatCurrency(breakdown.totalOneTime)}</td>
                  </>
                )}
              </tr>
            </tfoot>
          </table>

          {/* Maintenance Separate Box */}
          {request.maintenanceLevel !== 'NONE' && (
            <div className="mt-8 flex justify-between items-center bg-zinc-900 border border-black p-6 rounded-xl text-white">
              <div>
                <h4 className="font-bold text-[#FFD700]">{t.monthlyService}</h4>
                <p className="text-sm text-zinc-300">
                  {labels.maintenance[request.maintenanceLevel]}
                  {rules.maintenanceRates[request.maintenanceLevel].type === PricingFactorType.PERCENTAGE && (
                    ` (%${rules.maintenanceRates[request.maintenanceLevel].value})`
                  )}
                </p>
              </div>
              <div className="text-2xl font-bold text-white">
                {formatCurrency(breakdown.totalMonthly)} <span className="text-sm font-medium text-zinc-500">/mo</span>
              </div>
            </div>
          )}
        </div>

        {/* Terms Summary */}
        <div className="border-t border-zinc-200 pt-10">
          <div className="grid grid-cols-2 gap-12 text-sm text-zinc-600">
            <div>
              <h4 className="font-bold text-black mb-3 uppercase tracking-wide">{t.terms}</h4>
              <ul className="space-y-2">
                <li className="flex items-start"><span className="mr-2 text-[#FFD700] font-bold">•</span> {t.term1}</li>
                <li className="flex items-start"><span className="mr-2 text-[#FFD700] font-bold">•</span> {t.term2}</li>
                <li className="flex items-start"><span className="mr-2 text-[#FFD700] font-bold">•</span> {t.term3}</li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-black mb-3 uppercase tracking-wide">{t.validity}</h4>
              <p>{t.validityText}</p>
            </div>
          </div>
        </div>

        {/* Signature Area */}
        <div className="mt-20 grid grid-cols-2 gap-20">
          <div>
            <div className="border-b border-zinc-300 pb-2 mb-2"></div>
            {/* Removed uppercase class to fix Turkish I issues in EN mode */}
            <p className="font-bold text-black text-lg">ÖMER YİĞİTLER</p>
            <p className="text-zinc-500 text-xs mt-1">
              {t.signAgency}
            </p>
          </div>
          <div>
            <div className="border-b border-zinc-300 pb-2 mb-2"></div>
            <p className="font-bold text-black uppercase">{t.approval}</p>
            <p className="text-zinc-500 text-xs mt-1">{t.signClient}</p>
          </div>
        </div>

      </div>
    </div>
  );
};

export default ProposalView;
