import React from 'react';
import { Calculator, FileText, LayoutDashboard, PenTool, ShieldCheck, ListTodo, Settings, Languages } from 'lucide-react';
import { Language } from '../types';
import { TRANSLATIONS } from '../translations';

interface NavbarProps {
  currentView: string;
  setView: (view: string) => void;
  language: Language;
  setLanguage: (lang: Language) => void;
}

const Navbar: React.FC<NavbarProps> = ({ currentView, setView, language, setLanguage }) => {
  const t = TRANSLATIONS[language].nav;

  const navItems = [
    { id: 'dashboard', label: t.dashboard, icon: LayoutDashboard },
    { id: 'calculator', label: t.calculator, icon: Calculator },
    { id: 'proposal', label: t.proposal, icon: FileText },
    { id: 'seo', label: t.seo, icon: ListTodo },
    { id: 'contract', label: t.contract, icon: ShieldCheck },
    { id: 'admin', label: t.admin, icon: Settings },
  ];

  return (
    <nav className="bg-black/80 backdrop-blur-lg border-b border-zinc-800 sticky top-0 z-50 no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-20">
          <div className="flex items-center group cursor-pointer" onClick={() => setView('dashboard')}>
            <div className="relative">
              <div className="absolute -inset-1 bg-yellow-400 rounded-full opacity-25 group-hover:opacity-50 blur transition duration-200"></div>
              <div className="relative bg-zinc-900 border border-zinc-700 text-yellow-400 w-10 h-10 flex items-center justify-center rounded-lg mr-3">
                 <span className="font-bold font-poppins text-lg tracking-tighter">ÖY</span>
              </div>
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-extrabold text-white tracking-tight font-poppins leading-none group-hover:text-yellow-400 transition-colors">ÖMER YİĞİTLER</span>
              <span className="text-[10px] font-bold tracking-[0.2em] text-zinc-500 mt-1">{t.subtitle}</span>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
             {/* Language Toggle */}
            <div className="hidden md:flex bg-zinc-900 rounded-lg p-1 border border-zinc-700">
               <button 
                onClick={() => setLanguage(Language.TR)}
                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${language === Language.TR ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:text-white'}`}
               >
                 TR
               </button>
               <button 
                onClick={() => setLanguage(Language.EN)}
                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${language === Language.EN ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:text-white'}`}
               >
                 EN
               </button>
            </div>

            <div className="hidden md:flex space-x-1 items-center">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setView(item.id)}
                  className={`flex items-center px-4 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${
                    currentView === item.id
                      ? 'bg-yellow-400 text-black shadow-[0_0_15px_rgba(250,204,21,0.3)]'
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
                  }`}
                >
                  <item.icon className={`w-4 h-4 mr-2 ${currentView === item.id ? 'text-black' : 'text-zinc-500 group-hover:text-white'}`} />
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;