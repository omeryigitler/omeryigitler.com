import React, { useState } from 'react';
import { PlusCircle, FileText, ArrowRight, ArrowUpRight, Save } from 'lucide-react';
import { Language, QuoteRequest } from '../types';
import { TRANSLATIONS } from '../translations';

interface Props {
  onNavigate: (view: string) => void;
  language: Language;
  onRequestUpdate: (val: any) => void; // Using any to avoid complex type check here, or better import QuoteRequest updater type
}

const Dashboard: React.FC<Props> = ({ onNavigate, language, onRequestUpdate }) => {
  const t = TRANSLATIONS[language].home;
  const locale = language === Language.TR ? 'tr-TR' : 'en-US';

  // Client info for quote saving - Local state only for the input fields
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');

  const handleSaveQuote = () => {
    const notify = (type: 'success' | 'error' | 'info', message: string) => {
      if (window.__TAURUS_TOAST__) {
        window.__TAURUS_TOAST__(type, message);
      } else {
        alert(message);
      }
    };

    if (!clientName.trim() || !clientEmail.trim()) {
      notify('error', language === Language.TR ? 'Lütfen müşteri bilgilerini girin' : 'Please enter client information');
      return;
    }

    // Send to parent window (admin panel)
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({
        type: 'SAVE_QUOTE',
        data: {
          clientName: clientName.trim(),
          clientEmail: clientEmail.trim(),
          country: language === Language.TR ? 'TR' : 'MT',
          siteType: 'Corporate',
          pageCount: 10,
          totalPrice: 0,
          breakdown: {}
        }
      }, '*');

      notify('info', language === Language.TR ? 'Teklif kaydediliyor...' : 'Saving proposal...');
      setClientName('');
      setClientEmail('');
    } else {
      notify('error', language === Language.TR
        ? 'Not: Bu özellik sadece admin panelden çalışır'
        : 'Note: This feature only works from admin panel');
    }
  };

  // Listen for messages from parent (admin panel) to pre-fill client data
  React.useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'PRE_FILL_CLIENT') {
        const { clientName, clientEmail } = event.data.data;

        // Update local state
        if (clientName) setClientName(clientName);
        if (clientEmail) setClientEmail(clientEmail);

        // UPDATE GLOBAL STATE so it persists to calculator
        onRequestUpdate((prev: QuoteRequest) => ({
          ...prev,
          customerName: clientName || prev.customerName,
          // We don't have email in QuoteRequest type yet, but customerName is key
        }));
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

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

        {/* Client Information Form */}
        <div className="max-w-md mx-auto mt-12 space-y-4">
          <input
            type="text"
            placeholder={language === Language.TR ? "Müşteri Adı" : "Client Name"}
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-lg text-white placeholder-gray-500 focus:border-[#FFD700] focus:outline-none transition-colors"
          />
          <input
            type="email"
            placeholder={language === Language.TR ? "Müşteri Email" : "Client Email"}
            value={clientEmail}
            onChange={(e) => setClientEmail(e.target.value)}
            className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-lg text-white placeholder-gray-500 focus:border-[#FFD700] focus:outline-none transition-colors"
          />
        </div>

        <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center items-center">
          <button
            onClick={() => onNavigate('calculator')}
            className="px-8 py-4 bg-[#FFD700] hover:bg-[#FFD700] text-black font-bold rounded-full transition-all transform hover:scale-105 shadow-[0_0_20px_rgba(255,215,0,0.4)] flex items-center"
          >
            {t.startProject}
            <ArrowUpRight className="ml-2 w-5 h-5" />
          </button>

          <button
            onClick={handleSaveQuote}
            className="px-8 py-4 bg-zinc-900 hover:bg-zinc-800 text-[#FFD700] font-bold rounded-full transition-all border border-[#FFD700]/30 flex items-center"
          >
            <Save className="mr-2 w-5 h-5" />
            {language === Language.TR ? 'Teklifi Kaydet' : 'Save Proposal'}
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
            <h3 className="text-2xl font-bold text-white mb-4 uppercase">{t.card1Title}</h3>
            <p className="text-zinc-400 leading-relaxed">
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
            <h3 className="text-2xl font-bold text-white mb-4 uppercase">{t.card2Title}</h3>
            <p className="text-zinc-400 leading-relaxed">
              {t.card2Desc}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
