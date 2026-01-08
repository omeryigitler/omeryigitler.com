import React, { useState, useEffect } from 'react';

import { Language, translations } from '../translations';

interface LoadingTransitionProps {
    lang: Language;
}

const LoadingTransition: React.FC<LoadingTransitionProps> = ({ lang }) => {
    const t = translations[lang].loading;
    const [showBios, setShowBios] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => setShowBios(false), 1200);
        return () => clearTimeout(timer);
    }, []);

    if (showBios) {
        return (
            <div className="fixed inset-0 z-[9999] bg-black p-8 mono-font text-white text-xs md:text-sm">
                <p>{t.bios}, An Energy Star Ally</p>
                <p>Copyright (C) 2025, Elite Transformation Industries</p>
                <br />
                <p>{t.checkCpu}</p>
                <p>{t.checkRam}</p>
                <br />
                <p>Detecting Primary Master ... BIOMETRIC DATA FOUND</p>
                <p>Detecting Primary Slave  ... LEGACY HABITS DETECTED</p>
                <br />
                <p>Searching for Boot Record from IDE-0 .. OK</p>
                <p className="animate-pulse">Loading {t.upgradeMsg}</p>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-[9999] bg-black flex flex-col items-center justify-center p-6 pixel-font select-none">
            <div className="w-full max-w-2xl bg-[#c0c0c0] p-1 retro-border shadow-2xl">
                {/* Title Bar */}
                <div className="bg-gradient-to-r from-blue-900 to-blue-600 text-white p-2 flex justify-between items-center mb-1">
                    <span className="text-[10px] drop-shadow-md font-bold">UPGRADE.EXE - 56k Modem Connection</span>
                    <div className="flex gap-1">
                        <button className="w-4 h-4 bg-[#c0c0c0] border-2 border-white text-black text-[8px] flex items-center justify-center font-bold shadow-sm">_</button>
                        <button className="w-4 h-4 bg-[#c0c0c0] border-2 border-white text-black text-[8px] flex items-center justify-center font-bold shadow-sm">X</button>
                    </div>
                </div>

                <div className="p-6 bg-[#c0c0c0] border border-gray-400 space-y-6">
                    <div className="text-sm text-black uppercase tracking-tight font-bold">
                        {t.modernizing}
                    </div>

                    <div className="space-y-2">
                        <div className="flex justify-between text-[10px] text-gray-800 font-bold">
                            <span>Transferring: NEW_LIFE.DAT</span>
                            <span className="animate-pulse">CARRIER_SIGNAL_STABLE</span>
                        </div>

                        {/* Progress Bar Container - Reduced segments for performance */}
                        <div className="h-10 w-full bg-white border-b-2 border-r-2 border-white border-t-2 border-l-2 border-gray-600 p-1 flex gap-1 shadow-[inset_2px_2px_4px_rgba(0,0,0,0.5)]">
                            {[...Array(12)].map((_, i) => (
                                <div
                                    key={i}
                                    className="h-full bg-blue-700 flex-1 opacity-0"
                                    style={{
                                        animation: `retroFill 0.05s forwards`,
                                        animationDelay: `${i * 0.15}s`
                                    }}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Scrolling System Logs - Optimized */}
                    <div className="bg-black p-3 text-[#00ff00] text-[9px] leading-relaxed mono-font h-40 overflow-hidden border-2 border-gray-500 shadow-inner">
                        <div className="animate-[scrollUp_8s_linear_infinite] will-change-transform">
                            <p>&gt; {t.glitch}</p>
                            <p>&gt; Connection stable: 56k</p>
                            <p>&gt; Recompiling Muscle_Memory.dll...</p>
                            <p>&gt; Accessing Mitochondrial_Bank...</p>
                            <p>&gt; Deleting outdated_laziness.temp...</p>
                            <p>&gt; Loading Modern_UI_Engine_v2.0...</p>
                            <p>&gt; {t.ready}</p>
                        </div>
                    </div>

                    <div className="flex flex-col items-center gap-2 pt-4">
                        <div className="text-[9px] text-blue-900 font-bold animate-pulse">
                            ESTIMATED REMAINING: 00:01 SECONDS
                        </div>
                        <div className="text-[8px] text-red-600 font-bold uppercase text-center">
                            {t.modernizing}
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
        @keyframes retroFill {
          from { opacity: 0; transform: scaleX(0.5); }
          to { opacity: 1; transform: scaleX(1); }
        }
        @keyframes scrollUp {
          0% { transform: translateY(0); }
          100% { transform: translateY(-50%); }
        }
      `}</style>
        </div>
    );
};

export default LoadingTransition;

