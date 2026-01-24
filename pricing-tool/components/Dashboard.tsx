import React from 'react';
import { PlusCircle, FileText, ArrowRight } from 'lucide-react';
import { Language } from '../types';
import { TRANSLATIONS } from '../translations';

interface Props {
  onNavigate: (view: string) => void;
  language: Language;
}

const Dashboard: React.FC<Props> = ({ onNavigate, language }) => {
  const t = TRANSLATIONS[language].home;
  const locale = language === Language.TR ? 'tr-TR' : 'en-US';

  return (
    <div className="max-w-7xl mx-auto px-4 py-24 sm:px-6 lg:px-8">
      <div className="text-center mb-24">
        {/* Removed 'uppercase' class and used toLocaleUpperCase(locale) for correct i/I handling */}
        <h1 className="text-5xl font-extrabold text-white sm:text-6xl sm:tracking-tight lg:text-7xl font-poppins mb-6">
          {t.heroTitlePrefix.toLocaleUpperCase(locale)} <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FFD700] to-[#FFD700] drop-shadow-[0_0_10px_rgba(255,215,0,0.3)]">{t.heroTitleHighlight.toLocaleUpperCase(locale)}</span>
        </h1>
        <p className="max-w-2xl mx-auto text-xl text-zinc-400 font-light leading-relaxed">
          {t.heroSubtitle}
        </p>
        
        <div className="mt-10">
          <button 
            onClick={() => onNavigate('calculator')}
            className="px-8 py-4 bg-[#FFD700] hover:bg-[#FFD700] text-black font-bold rounded-full transition-all transform hover:scale-105 shadow-[0_0_20px_rgba(255,215,0,0.4)] flex items-center mx-auto"
          >
            {t.startProject}
            <ArrowRight className="ml-2 w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 max-w-5xl mx-auto">
        {/* Card 1 */}
        <div 
          onClick={() => onNavigate('calculator')}
          className="group relative bg-zinc-900/50 backdrop-blur-sm p-10 rounded-3xl border border-zinc-800 hover:border-[#FFD700]/50 transition-all duration-300 cursor-pointer overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-[#FFD700]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <div className="absolute top-0 right-0 p-6 opacity-50 group-hover:opacity-100 transition-opacity">
            <ArrowRight className="w-6 h-6 text-[#FFD700] -rotate-45 group-hover:rotate-0 transition-transform duration-300" />
          </div>
          <div className="mb-8 relative z-10">
            <span className="inline-flex p-4 bg-zinc-800 text-[#FFD700] rounded-2xl ring-1 ring-zinc-700 group-hover:bg-[#FFD700] group-hover:text-black transition-colors duration-300">
              <PlusCircle className="h-8 w-8" aria-hidden="true" />
            </span>
          </div>
          <div className="relative z-10">
            <h3 className="text-2xl font-bold text-white font-poppins mb-3">
              {t.card1Title}
            </h3>
            <p className="text-zinc-400 leading-relaxed group-hover:text-zinc-300 transition-colors">
              {t.card1Desc}
            </p>
          </div>
        </div>

        {/* Card 2 */}
        <div 
          onClick={() => onNavigate('proposal')}
          className="group relative bg-zinc-900/50 backdrop-blur-sm p-10 rounded-3xl border border-zinc-800 hover:border-[#FFD700]/50 transition-all duration-300 cursor-pointer overflow-hidden"
        >
           <div className="absolute inset-0 bg-gradient-to-br from-[#FFD700]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
           <div className="absolute top-0 right-0 p-6 opacity-50 group-hover:opacity-100 transition-opacity">
            <ArrowRight className="w-6 h-6 text-[#FFD700] -rotate-45 group-hover:rotate-0 transition-transform duration-300" />
          </div>
          <div className="mb-8 relative z-10">
            <span className="inline-flex p-4 bg-zinc-800 text-[#FFD700] rounded-2xl ring-1 ring-zinc-700 group-hover:bg-[#FFD700] group-hover:text-black transition-colors duration-300">
              <FileText className="h-8 w-8" aria-hidden="true" />
            </span>
          </div>
          <div className="relative z-10">
            <h3 className="text-2xl font-bold text-white font-poppins mb-3">
              {t.card2Title}
            </h3>
            <p className="text-zinc-400 leading-relaxed group-hover:text-zinc-300 transition-colors">
              {t.card2Desc}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;