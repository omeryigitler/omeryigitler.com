import React, { useState, useEffect } from 'react';
import { Language, translations } from '../translations';

interface RetroLayoutProps {
  onExecute: () => void;
  lang: Language;
  setLang: (lang: Language) => void;
}

const RetroLayout: React.FC<RetroLayoutProps> = ({ onExecute, lang, setLang }) => {
  const t = translations[lang].retro;
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen text-black pixel-font flex flex-col items-center justify-center p-2 md:p-10 relative overflow-hidden bg-[#008080]">
      {/* Desktop Icons - Hidden on Mobile/Tablet */}
      <div className="hidden md:grid absolute top-6 left-6 grid-flow-row gap-8 z-10">
        <div className="flex flex-col items-center gap-1 group cursor-pointer">
          <div className="w-10 h-10 bg-gray-400 group-hover:bg-blue-200 retro-border flex items-center justify-center relative">
            <div className="w-6 h-6 bg-blue-600"></div>
          </div>
          <span className="text-[9px] text-white bg-blue-900 group-hover:bg-blue-700 px-1 py-0.5">My_Body.exe</span>
        </div>

        <div className="flex flex-col items-center gap-1 group cursor-pointer">
          <div className="w-10 h-10 bg-gray-400 group-hover:bg-blue-200 retro-border flex items-center justify-center">
            <div className="w-6 h-6 bg-yellow-500 rounded-sm"></div>
          </div>
          <span className="text-[9px] text-white bg-blue-900 px-1 py-0.5">Legacy_Logs</span>
        </div>

        <div className="flex flex-col items-center gap-1 group cursor-pointer">
          <div className="w-10 h-10 bg-gray-400 group-hover:bg-blue-200 retro-border flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-gray-600 rounded-full"></div>
          </div>
          <span className="text-[9px] text-white bg-blue-900 px-1 py-0.5">{t.desktop.recycleBin}</span>
        </div>
      </div>



      {/* Main Window */}
      <div className="w-full max-w-5xl bg-[#c0c0c0] retro-border shadow-[8px_8px_0px_rgba(0,0,0,0.5)] flex flex-col relative z-10 mb-12">
        {/* Title Bar */}
        <div className="bg-gradient-to-r from-blue-900 to-blue-600 text-white p-1 flex justify-between items-center select-none font-bold">
          <div className="flex items-center gap-2 ml-1">
            <div className="w-4 h-4 flex items-center justify-center bg-gray-300 retro-border-small text-black text-[8px]">⚙️</div>
            <span className="text-[10px] md:text-xs">{t.title}</span>
          </div>
          <div className="flex gap-1 pr-1">
            <button className="w-5 h-5 bg-[#c0c0c0] retro-border-small text-black text-[10px] flex items-center justify-center hover:bg-gray-200">_</button>
            <button className="w-5 h-5 bg-[#c0c0c0] retro-border-small text-black text-[10px] flex items-center justify-center hover:bg-gray-200">□</button>
            <button className="w-5 h-5 bg-[#c0c0c0] retro-border-small text-black text-[10px] flex items-center justify-center hover:bg-red-400">X</button>
          </div>
        </div>

        {/* Menu Bar with Language Switcher */}
        <div className="flex justify-between items-center px-2 py-1 border-b border-gray-600 bg-[#c0c0c0]">
          <div className="flex gap-4 text-[10px] md:text-xs">
            <span className="cursor-pointer hover:bg-blue-800 hover:text-white px-1">File</span>
            <span className="cursor-pointer hover:bg-blue-800 hover:text-white px-1">Edit</span>
            <span className="cursor-pointer hover:bg-blue-800 hover:text-white px-1">Search</span>
            <span className="cursor-pointer hover:bg-blue-800 hover:text-white px-1">Tools</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setLang('tr')}
              className={`px-2 py-0.5 text-[10px] retro-border-small ${lang === 'tr' ? 'bg-blue-800 text-white' : 'bg-gray-300 text-black'}`}
            >
              TR
            </button>
            <button
              onClick={() => setLang('en')}
              className={`px-2 py-0.5 text-[10px] retro-border-small ${lang === 'en' ? 'bg-blue-800 text-white' : 'bg-gray-300 text-black'}`}
            >
              EN
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="p-4 md:p-8 space-y-8">
          <div className="text-center space-y-4">
            <h1 className="text-xl md:text-5xl font-bold tracking-tight text-blue-900 drop-shadow-sm uppercase italic">
              Legacy Core 1.0
            </h1>
            <div className="h-0.5 bg-gray-600 w-full opacity-30"></div>
            <div className="bg-black text-green-500 p-2 overflow-hidden text-[10px] md:text-sm border-2 border-gray-500">
              <div className="marquee-container">
                <span className="marquee-text inline-block whitespace-nowrap animate-[marquee_20s_linear_infinite]">
                  [CRITICAL] CURRENT_FORM: OUTDATED ::: [ACTION] RECOMPILE_MUSCLE ::: [STATUS] FAT_STORAGE_OVERFLOW ::: [READY] EXECUTE_TRANSFORMATION.EXE ::: [CRITICAL]
                </span>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div className="space-y-4">
              <div className="retro-inset p-4 bg-black border-2 border-gray-500">
                <div className="space-y-1 mono-font text-[10px] md:text-xs text-green-500 leading-tight">
                  <p>&gt; INITIALIZING CORE DUMP...</p>
                  <p>&gt; SCANNING SKELETAL STRUCTURE: STABLE</p>
                  <p>&gt; ANALYZING METABOLIC KERNEL: INACTIVE</p>
                  <p>&gt; DETECTING PERFORMANCE BOTTLENECKS...</p>
                  <p className="text-yellow-500">&gt; WARNING: ENERGY_LEAK_DETECTED</p>
                  <p className="text-red-500">&gt; ERROR: LEGACY_HABITS_FOUND</p>
                  <p>&gt; RECOMMENDATION: FULL_SYSTEM_UPGRADE</p>
                </div>
              </div>

              <div className="text-[9px] text-gray-700 leading-relaxed border-l-4 border-blue-800 pl-4 py-2 bg-gray-100 italic">
                {lang === 'tr'
                  ? '"Vücudunu bir kod bloğu gibi düşün. Hataları ayıkla, mimariyi güçlendir ve en yüksek performansa ulaştır."'
                  : '"Think of your body as a block of code. Debug the errors, strengthen architecture, and reach peak performance."'}
              </div>
            </div>

            <div className="flex flex-col gap-6 text-center">
              <div className="relative group">
                <div className="absolute inset-0 bg-red-900 translate-x-1 translate-y-1"></div>
                <button
                  onClick={onExecute}
                  className="relative w-full bg-red-600 hover:bg-red-500 text-white p-6 md:p-10 retro-border text-lg md:text-2xl font-black transition-transform active:translate-x-1 active:translate-y-1"
                >
                  {t.upgradeBtn}
                </button>
              </div>

              <div className="flex items-center justify-center gap-4">
                <span className="text-[8px] md:text-[9px] blink text-red-700 font-bold tracking-widest uppercase">
                  Caution: Permanent Hardware Modifications
                </span>
              </div>
            </div>
          </div>

          {/* Progress Bar Footer */}
          <div className="bg-gray-300 p-2 retro-border-small flex flex-col md:flex-row justify-between items-center gap-4 text-[9px]">
            <div className="flex gap-2 items-center">
              <span>SYSTEM_HEALTH:</span>
              <div className="w-32 h-4 bg-gray-100 retro-inset flex overflow-hidden border border-gray-600">
                <div className="w-1/4 h-full bg-green-600"></div>
                <div className="w-1/4 h-full bg-yellow-500 border-l border-gray-400"></div>
              </div>
              <span className="text-yellow-700 font-bold">UNSTABLE_FAIR</span>
            </div>
            <div className="flex gap-4 opacity-70">
              <span className="text-blue-800">Uptime: 10,942 Days</span>
              <span className="text-black">Memory: 16.0 GB RAM</span>
            </div>
          </div>
        </div>
      </div>

      {/* Windows 98 Taskbar */}
      <div className="taskbar">
        <button className="start-button">
          <div className="w-4 h-4 flex items-center justify-center mr-1 text-xs">💪</div>
          <span>{t.taskbar.start}</span>
        </button>
        <div className="flex gap-1 ml-1 h-full py-1">
          <div className="w-32 h-full bg-gray-200 retro-inset-small px-2 flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-600"></div>
            <span className="text-[9px] truncate">Transformation_Engine</span>
          </div>
        </div>
        <div className="system-tray">
          {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>

      <style>{`
        .retro-border-small {
          border: 1px solid;
          border-top-color: #fff;
          border-left-color: #fff;
          border-right-color: #808080;
          border-bottom-color: #808080;
        }
        .retro-inset-small {
          border: 1px solid;
          border-top-color: #808080;
          border-left-color: #808080;
          border-right-color: #fff;
          border-bottom-color: #fff;
          background-color: white;
        }
        @keyframes marquee {
          0% { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }
        .blink {
          animation: blink 1s step-end infinite;
        }
        @keyframes blink {
          50% { opacity: 0; }
        }
      `}</style>
    </div>
  );
};

export default RetroLayout;

