
import React, { useState } from 'react';
import { generateUnifiedPlan } from '../services/aiCoordinator';

import ReactMarkdown from 'react-markdown';

import { Language, translations } from '../translations';

interface ModernLayoutProps {
  lang: Language;
  setLang: (lang: Language) => void;
}

const ModernLayout: React.FC<ModernLayoutProps> = ({ lang, setLang }) => {
  const t = translations[lang].modern;
  const [loading, setLoading] = useState(false);
  const [output, setOutput] = useState<string | null>(null);
  const [activeEngine, setActiveEngine] = useState<string>('IDLE');
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [tempApiKey, setTempApiKey] = useState('');
  const [stats, setStats] = useState({
    age: 30,
    weight: 80,
    height: 180,
    injuries: '',
    goal: lang === 'tr' ? 'Hypertrophy' : 'Hypertrophy'
  });

  const analyzeArchitecture = async () => {
    setLoading(true);
    setOutput(null);
    setActiveEngine('INITIALIZING...');

    try {
      const result = await generateUnifiedPlan(
        { ...stats, lang },
        (engineName) => setActiveEngine(engineName)
      );
      setOutput(result || "ANALİZ_HATASI: Yanıt alınamadı.");
    } catch (error: any) {
      console.error(error);
      const errorMessage = error.message || "Unknown Error";

      if (errorMessage.includes("API_KEY_MISSING")) {
        setOutput("SİSTEM_HATASI: Google Gemini API Anahtarı eksik veya hatalı. Lütfen kontrol edin.");
      } else if (errorMessage.includes("ALL_ENGINES_OFFLINE")) {
        setOutput(`SİSTEM_KRİTİK_HATA: Tüm yapay zeka motorları devre dışı.\nDETAY: ${errorMessage.replace('ALL_ENGINES_OFFLINE:', '')}`);
      } else {
        setOutput(`SİSTEM_KRİTİK_HATA: Bağlantı sorunu.\nDEBUG: ${errorMessage}`);
      }
    } finally {
      setLoading(false);
      setActiveEngine('STANDBY');
    }
  };

  return (
    <div className="modern-font selection:bg-blue-500/30 min-h-screen text-white mesh-gradient relative pb-20 overflow-x-hidden postural-grid">
      {/* Dynamic Background Elements - High-End Ambient Glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600/20 rounded-full blur-[120px] animate-pulse-slow"></div>
        <div className="absolute bottom-[10%] right-[-10%] w-[40%] h-[60%] bg-cyan-600/15 rounded-full blur-[100px] animate-float"></div>
        <div className="absolute top-[20%] right-[10%] w-[30%] h-[30%] bg-purple-600/10 rounded-full blur-[80px] animate-pulse-slow" style={{ animationDelay: '-2s' }}></div>
      </div>

      <nav className="relative z-10 flex justify-between items-center p-6 md:px-12 max-w-[1400px] mx-auto">
        <div className="flex items-center gap-4 group cursor-pointer">
          <div className="w-12 h-12 blue-gradient rounded-2xl flex items-center justify-center shadow-[0_0_30px_rgba(0,242,255,0.4)] rotate-3 group-hover:rotate-0 transition-all duration-500">
            <span className="font-black italic text-black text-xl">V2</span>
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-black tracking-tighter uppercase leading-none group-hover:text-blue-400 transition-colors">Elite_Core</span>
            <span className="text-[10px] text-blue-400/60 font-bold uppercase tracking-[0.3em] group-hover:text-blue-400 transition-colors">Modern OS</span>
          </div>
        </div>

        <div className="flex items-center gap-8">
          <div className="hidden md:flex gap-4 text-[10px] font-black tracking-[0.2em] uppercase">
            {[t.nav.modules, t.nav.fuel, t.nav.grid].map((item) => (
              <a
                key={item}
                href="#"
                className="px-4 py-2 rounded-xl bg-white/5 border border-white/5 hover:border-blue-500/50 hover:bg-blue-500/10 hover:text-blue-400 transition-all text-neutral-400"
              >
                {item}
              </a>
            ))}
          </div>

          <div className="flex gap-2 bg-black/40 p-1.5 rounded-2xl border border-white/10 shadow-inner">
            <button
              onClick={() => setLang('tr')}
              className={`px-4 py-1.5 rounded-xl text-[10px] font-black transition-all ${lang === 'tr' ? 'bg-blue-500 text-black shadow-[0_0_15px_rgba(59,130,246,0.5)]' : 'text-neutral-500 hover:text-white'}`}
            >
              TR
            </button>
            <button
              onClick={() => setLang('en')}
              className={`px-4 py-1.5 rounded-xl text-[10px] font-black transition-all ${lang === 'en' ? 'bg-blue-500 text-black shadow-[0_0_15px_rgba(59,130,246,0.5)]' : 'text-neutral-500 hover:text-white'}`}
            >
              EN
            </button>
          </div>

          <button className="hidden md:block bg-blue-500/10 border border-blue-500/20 px-6 py-2 rounded-xl hover:bg-blue-500 hover:text-black transition-all text-blue-400 text-[10px] font-black tracking-widest uppercase">
            {t.nav.root}
          </button>
        </div>
      </nav>

      <main className="relative z-10 max-w-[1400px] mx-auto px-6 md:px-12 py-10 md:py-16">
        {/* Top Section - Hero */}
        <div className="mb-16 space-y-6 text-center md:text-left">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-black uppercase tracking-widest mx-auto md:mx-0">
            <span className="w-2 h-2 bg-blue-400 rounded-full animate-ping"></span>
            {t.hero.subtitle}
          </div>
          <h1 className="text-6xl md:text-[5.5rem] font-black leading-[0.85] tracking-tighter uppercase italic">
            {t.hero.title1} <br />
            <span className="text-gradient">{t.hero.title2}</span>
          </h1>
          <p className="text-lg text-neutral-400 max-w-2xl font-light leading-relaxed mx-auto md:mx-0">
            {t.hero.desc}
          </p>
        </div>

        {/* Main Grid - Stats & Terminal */}
        <div className="grid lg:grid-cols-[1fr,1.3fr] gap-12 items-start mb-16">
          {/* Left - Stats Form */}
          <div className="modern-card glow-card p-8 md:p-10 space-y-8 relative overflow-hidden group border-blue-500/20 h-full">
            <div className="absolute top-0 right-0 w-48 h-48 bg-blue-500/5 blur-[60px] -mr-24 -mt-24 group-hover:bg-blue-500/10 transition-colors pointer-events-none"></div>

            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-2 h-8 bg-blue-500 rounded-full shadow-[0_0_15px_rgba(59,130,246,0.5)]"></div>
                <h3 className="text-2xl font-black italic tracking-tight uppercase">{t.form.title}</h3>
              </div>
              <span className="mono-font text-[9px] text-neutral-500 uppercase font-black tracking-widest">Kernel_Input</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="space-y-4 flex flex-col items-center">
                <label className="text-[10px] uppercase text-neutral-400/60 font-black tracking-[0.2em] group-focus-within:text-blue-400 transition-colors">{t.form.labelMass}</label>
                <div className="w-full flex items-center justify-between bg-white/[0.03] border border-white/10 p-1 rounded-2xl hover:border-blue-500/30 transition-all">
                  <button
                    type="button"
                    onClick={() => setStats(s => ({ ...s, weight: Math.max(0, s.weight - 1) }))}
                    className="w-10 h-10 flex items-center justify-center text-xl font-light hover:text-red-400 transition-colors cursor-pointer"
                  >
                    −
                  </button>
                  <div className="flex flex-col items-center">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={stats.weight}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9]/g, '');
                        setStats(s => ({ ...s, weight: val === '' ? 0 : parseInt(val) }));
                      }}
                      className="w-16 bg-transparent border-none focus:outline-none text-center text-2xl font-black text-white"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setStats(s => ({ ...s, weight: s.weight + 1 }))}
                    className="w-10 h-10 flex items-center justify-center text-xl font-light hover:text-blue-400 transition-colors cursor-pointer"
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="space-y-4 flex flex-col items-center">
                <label className="text-[10px] uppercase text-neutral-400/60 font-black tracking-[0.2em] group-focus-within:text-blue-400 transition-colors">{t.form.labelHeight}</label>
                <div className="w-full flex items-center justify-between bg-white/[0.03] border border-white/10 p-1 rounded-2xl hover:border-blue-500/30 transition-all">
                  <button
                    type="button"
                    onClick={() => setStats(s => ({ ...s, height: Math.max(0, s.height - 1) }))}
                    className="w-10 h-10 flex items-center justify-center text-xl font-light hover:text-red-400 transition-colors cursor-pointer"
                  >
                    −
                  </button>
                  <div className="flex flex-col items-center">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={stats.height}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9]/g, '');
                        setStats(s => ({ ...s, height: val === '' ? 0 : parseInt(val) }));
                      }}
                      className="w-16 bg-transparent border-none focus:outline-none text-center text-2xl font-black text-white"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setStats(s => ({ ...s, height: s.height + 1 }))}
                    className="w-10 h-10 flex items-center justify-center text-xl font-light hover:text-blue-400 transition-colors cursor-pointer"
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="space-y-4 flex flex-col items-center">
                <label className="text-[10px] uppercase text-neutral-400/60 font-black tracking-[0.2em] group-focus-within:text-blue-400 transition-colors">{t.form.labelAge}</label>
                <div className="w-full flex items-center justify-between bg-white/[0.03] border border-white/10 p-1 rounded-2xl hover:border-blue-500/30 transition-all">
                  <button
                    type="button"
                    onClick={() => setStats(s => ({ ...s, age: Math.max(0, s.age - 1) }))}
                    className="w-10 h-10 flex items-center justify-center text-xl font-light hover:text-red-400 transition-colors cursor-pointer"
                  >
                    −
                  </button>
                  <div className="flex flex-col items-center">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={stats.age}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9]/g, '');
                        setStats(s => ({ ...s, age: val === '' ? 0 : parseInt(val) }));
                      }}
                      className="w-16 bg-transparent border-none focus:outline-none text-center text-2xl font-black text-white"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setStats(s => ({ ...s, age: s.age + 1 }))}
                    className="w-10 h-10 flex items-center justify-center text-xl font-light hover:text-blue-400 transition-colors cursor-pointer"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-[10px] uppercase text-neutral-500 font-black tracking-widest ml-1">{t.form.labelInjuries}</label>
              <textarea
                value={stats.injuries}
                onChange={(e) => setStats({ ...stats, injuries: e.target.value })}
                className="w-full bg-white/5 border border-white/10 p-5 rounded-3xl focus:outline-none focus:border-blue-500 focus:bg-white/10 focus:shadow-[0_0_30px_rgba(59,130,246,0.2)] transition-all text-lg font-medium placeholder-white/10 min-h-[120px] resize-none"
                placeholder={t.form.placeholderInjuries}
              />
            </div>

            <div className="space-y-4">
              <label className="text-[10px] uppercase text-neutral-500 font-black tracking-widest ml-1">{t.form.labelGoal}</label>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                  { id: 'Hypertrophy', label: t.form.goals.hypertrophy },
                  { id: 'Fat Loss', label: t.form.goals.fatloss },
                  { id: 'Powerlifting', label: t.form.goals.powerlifting },
                  { id: 'Longevity', label: t.form.goals.longevity }
                ].map((option) => (
                  <button
                    key={option.id}
                    onClick={() => setStats({ ...stats, goal: option.id })}
                    className={`p-3 rounded-2xl text-[10px] font-black text-center transition-all border-2 flex flex-col items-center justify-center gap-2 ${stats.goal === option.id
                      ? 'bg-blue-500/10 border-blue-500 text-blue-400 shadow-[0_0_25px_rgba(59,130,246,0.3)]'
                      : 'bg-white/5 border-white/5 text-neutral-500 hover:border-white/10 hover:bg-white/10'
                      }`}
                  >
                    <span className={`w-1 h-1 rounded-full ${stats.goal === option.id ? 'bg-blue-400' : 'bg-transparent'}`}></span>
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={analyzeArchitecture}
              disabled={loading}
              className="relative w-full py-6 blue-gradient rounded-3xl text-black font-black text-lg uppercase italic tracking-tighter transition-all hover:scale-[1.01] active:scale-98 disabled:opacity-50 disabled:grayscale flex items-center justify-center gap-4 overflow-hidden shadow-[0_25px_50px_-12px_rgba(0,102,255,0.4)]"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-[3px] border-black/20 border-t-black rounded-full animate-spin"></div>
                  <span>{t.form.submitting}</span>
                </>
              ) : (
                <>
                  <span>{t.form.submitBtn}</span>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </>
              )}
            </button>
          </div>

          {/* Right - Terminal Output */}
          <div className="lg:sticky lg:top-8 h-full">
            <div className="modern-card min-h-[750px] lg:h-full flex flex-col overflow-hidden border-blue-500/10 shadow-[0_50px_100px_-20px_rgba(0,0,0,1)] cyber-border">
              <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
                <div className="flex gap-2.5">
                  <div className="w-2.5 h-2.5 bg-red-500/40 rounded-full border border-red-500/50 hover:bg-red-500 transition-colors cursor-pointer"></div>
                  <div className="w-2.5 h-2.5 bg-yellow-500/40 rounded-full border border-yellow-500/50 hover:bg-yellow-500 transition-colors cursor-pointer"></div>
                  <div className="w-2.5 h-2.5 bg-green-500/40 rounded-full border border-green-500/50 hover:bg-green-500 transition-colors cursor-pointer"></div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex flex-col items-end">
                    <span className="mono-font text-[7px] text-blue-500/50 uppercase tracking-[0.2em]">Active_Engine</span>
                    <span className="mono-font text-[9px] text-blue-400 font-black uppercase tracking-[0.2em]">{loading ? activeEngine : t.output.header}</span>
                  </div>
                  <div className={`w-1.5 h-1.5 rounded-full ${loading ? 'bg-cyan-400 animate-pulse' : 'bg-blue-500 animate-ping'}`}></div>
                </div>
              </div>

              <div className="flex-1 p-8 overflow-y-auto modern-scrollbar leading-relaxed">
                {output ? (
                  <div className="space-y-6">
                    <ReactMarkdown
                      components={{
                        h1: ({ node, ...props }) => <h1 className="text-2xl font-black uppercase italic text-blue-400 mt-8 mb-4 tracking-tight border-b border-blue-500/20 pb-2 flex items-center gap-4" {...props} />,
                        h2: ({ node, ...props }) => <h2 className="text-xl font-black uppercase italic text-cyan-400 mt-6 mb-3 tracking-tight" {...props} />,
                        h3: ({ node, ...props }) => <h3 className="text-lg font-black uppercase text-white/90 mt-4 mb-2" {...props} />,
                        p: ({ node, ...props }) => <p className="text-neutral-400 font-light leading-relaxed mb-4 text-base" {...props} />,
                        ul: ({ node, ...props }) => <ul className="space-y-3 mb-6" {...props} />,
                        li: ({ node, ...props }) => (
                          <li className="flex gap-3 text-neutral-300 items-start">
                            <span className="text-blue-500 font-black mt-1">/&gt;</span>
                            <span className="text-base" {...props} />
                          </li>
                        ),
                        code: ({ node, ...props }) => (
                          <code className="mono-font text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-lg border border-cyan-500/20 text-[13px]" {...props} />
                        ),
                        blockquote: ({ node, ...props }) => (
                          <blockquote className="border-l-4 border-blue-500 pl-4 italic text-neutral-400 my-6 py-1 bg-blue-500/5 rounded-r-xl" {...props} />
                        )
                      }}
                    >
                      {output}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center space-y-6">
                    <div className="relative">
                      <div className="absolute inset-0 bg-blue-500 blur-[80px] opacity-20"></div>
                      <div className="w-32 h-32 border border-white/5 rounded-full flex items-center justify-center">
                        <div className="w-24 h-24 border border-blue-500/10 rounded-full flex items-center justify-center">
                          <svg className="w-12 h-12 text-blue-500/50 relative" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={0.5} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={0.5} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
                          </svg>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-3 max-w-sm">
                      <p className="font-black text-white uppercase tracking-[0.4em] text-xs">{t.output.standbyTitle}</p>
                      <div className="flex justify-center gap-1">
                        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce"></div>
                      </div>
                      <p className="text-[10px] text-neutral-500 leading-relaxed mx-auto font-medium">{t.output.standbyDesc}</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-6 bg-black/40 border-t border-white/5 flex flex-col md:flex-row justify-between items-center backdrop-blur-sm gap-4">
                <span className="text-[9px] text-neutral-600 font-black uppercase tracking-[0.3em] flex items-center gap-2">
                  <span className="w-1 h-1 bg-green-500 rounded-full"></span>
                  {t.output.footerModule}
                </span>
                <div className="flex gap-6 items-center">
                  <span className="text-[9px] text-blue-500 font-black uppercase tracking-[0.3em]">System_Nominal</span>
                  <span className="text-[9px] text-neutral-700 font-black uppercase tracking-[0.3em]">© 2025 Elite OS</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Section - Full Width Insights */}
        <div className="space-y-12">
          {/* Why Elite Core? */}
          <div className="modern-card glow-card p-8 md:p-12 space-y-10 border-cyan-500/20 bg-cyan-500/5 hover:border-cyan-500/40 transition-all duration-500 group">
            <div className="flex items-center gap-3">
              <div className="w-2 h-8 bg-cyan-500 rounded-full shadow-[0_0_15px_rgba(6,182,212,0.5)]"></div>
              <h2 className="text-3xl font-black italic tracking-tight uppercase group-hover:text-cyan-400 transition-colors">{t.why.title}</h2>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {[
                { title: t.why.injury.title, desc: t.why.injury.desc, icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z', color: 'cyan' },
                { title: t.why.logic.title, desc: t.why.logic.desc, icon: 'M13 10V3L4 14h7v7l9-11h-7z', color: 'blue' },
                { title: t.why.modularity.title, desc: t.why.modularity.desc, icon: 'M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 011-1h1a2 2 0 100-4H7a1 1 0 01-1-1V7a1 1 0 011-1h3a1 1 0 001-1V4z', color: 'purple' }
              ].map((item) => (
                <div key={item.title} className="flex flex-col gap-4 p-6 rounded-3xl hover:bg-white/5 transition-all border border-white/5 hover:border-white/10 cursor-default">
                  <div className={`w-12 h-12 rounded-2xl bg-${item.color}-500/10 flex items-center justify-center shrink-0 border border-${item.color}-500/20 text-${item.color}-400 shadow-[0_0_20px_rgba(0,0,0,0.3)]`}>
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d={item.icon} /></svg>
                  </div>
                  <div>
                    <h3 className={`font-black uppercase text-base tracking-widest text-${item.color}-400 mb-2`}>{item.title}</h3>
                    <p className="text-sm text-neutral-400 font-light leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Live Kernel Feed */}
          <div className="modern-card p-10 bg-black/40 border-blue-500/10 overflow-hidden relative">
            <div className="flex justify-between items-center mb-8">
              <span className="text-xs font-black uppercase tracking-[0.3em] text-blue-400 flex items-center gap-3">
                <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
                {t.log.title}
              </span>
              <span className="text-[10px] text-neutral-600 font-mono">ID: 0x82F4_ALPHA</span>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 font-mono text-[11px] text-neutral-500">
              <div className="flex items-center gap-3 bg-white/5 p-4 rounded-2xl border border-white/5">
                <span className="text-blue-500/50">[11:42:01]</span>
                <span className="text-neutral-400">{t.log.sync}</span>
                <span className="text-green-500/50 ml-auto">DONE</span>
              </div>
              <div className="flex items-center gap-3 bg-white/5 p-4 rounded-2xl border border-white/5">
                <span className="text-blue-500/50">[11:42:05]</span>
                <span className="text-neutral-400">{t.log.modules}</span>
                <span className="text-green-500/50 ml-auto">READY</span>
              </div>
              <div className="flex items-center gap-3 bg-white/5 p-4 rounded-2xl border border-white/5">
                <span className="text-blue-500/50">[11:42:12]</span>
                <span className="text-neutral-400">{t.log.memory}</span>
                <span className="text-blue-400/50 ml-auto italic">ACTIVE</span>
              </div>
              <div className="flex items-center gap-3 bg-white/5 p-4 rounded-2xl border border-white/5 opacity-50">
                <span className="text-blue-500/50">[11:42:15]</span>
                <span className="text-neutral-400 italic">{t.log.waiting}</span>
              </div>
            </div>
            <div className="absolute -bottom-8 -right-8 w-40 h-40 bg-blue-500/5 blur-3xl rounded-full"></div>
          </div>
        </div>
      </main>

      <footer className="max-w-[1400px] mx-auto p-12 mt-20 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-8 opacity-40 hover:opacity-100 transition-all">
        <div className="flex flex-col gap-2">
          <p className="text-xs max-w-sm text-center md:text-left font-light leading-relaxed">
            Bu programın sonunda biyolojik donanımın, bu yazılımın geçirdiği değişim kadar devasa bir evrim geçirmiş olacak.
          </p>
        </div>
        <div className="flex gap-10 text-[10px] font-black uppercase tracking-[0.2em]">
          <button onClick={() => setShowApiKeyModal(true)} className="hover:text-blue-400 transition-colors">Neural_Keys</button>
          <a href="#" className="hover:text-blue-400 transition-colors">Neural_Privacy</a>
          <a href="#" className="hover:text-blue-400 transition-colors">Root_Access</a>
        </div>
      </footer>

      {/* API KEY MANAGER MODAL */}
      {showApiKeyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-md">
          <div className="modern-card p-8 max-w-lg w-full bg-[#050510] border border-blue-500/30 shadow-[0_0_50px_rgba(59,130,246,0.3)]">
            <h3 className="text-xl font-black text-blue-400 uppercase tracking-widest mb-6 flex items-center gap-3">
              <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
              Neural Link Configuration
            </h3>

            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Google Gemini API Key</label>
                <input
                  type="password"
                  placeholder="AIzaSy..."
                  className="w-full bg-white/5 border border-white/10 p-3 rounded-xl text-white font-mono text-sm focus:border-blue-500/50 outline-none transition-all"
                  onChange={(e) => localStorage.setItem('ELITE_CORE_GEMINI_KEY', e.target.value)}
                  defaultValue={localStorage.getItem('ELITE_CORE_GEMINI_KEY') || ''}
                />
                <p className="text-[10px] text-neutral-600">Required for primary analysis logic.</p>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest">OpenAI / Copilot API Key (Optional)</label>
                <input
                  type="password"
                  placeholder="sk-..."
                  className="w-full bg-white/5 border border-white/10 p-3 rounded-xl text-white font-mono text-sm focus:border-purple-500/50 outline-none transition-all"
                  onChange={(e) => localStorage.setItem('ELITE_CORE_OPENAI_KEY', e.target.value)}
                  defaultValue={localStorage.getItem('ELITE_CORE_OPENAI_KEY') || ''}
                />
                <p className="text-[10px] text-neutral-600">Enable for advanced synthesis & backup.</p>
              </div>

              <div className="pt-4 flex gap-4">
                <button
                  onClick={() => { setShowApiKeyModal(false); window.location.reload(); }}
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl uppercase tracking-widest text-xs transition-colors"
                >
                  Save & Reboot System
                </button>
                <button
                  onClick={() => setShowApiKeyModal(false)}
                  className="py-3 px-6 border border-white/10 hover:bg-white/5 text-neutral-400 font-bold rounded-xl uppercase tracking-widest text-xs transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .animate-spin-slow {
          animation: spin 12s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-float {
          animation: float 10s ease-in-out infinite;
        }
        @keyframes float {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-30px) scale(1.05); }
        }
      `}</style>
    </div>
  );
};

export default ModernLayout;
