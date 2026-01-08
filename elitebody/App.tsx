
import React, { useState, useCallback, useEffect } from 'react';
import RetroLayout from './components/RetroLayout';
import ModernLayout from './components/ModernLayout';
import LoadingTransition from './components/LoadingTransition';

import { Language } from './translations';

const App: React.FC = () => {
  const [isModern, setIsModern] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [lang, setLang] = useState<Language>('tr');

  const handleExecute = useCallback(() => {
    setIsTransitioning(true);
    setTimeout(() => {
      setIsModern(true);
      setIsTransitioning(false);
    }, 3500);
  }, []);

  return (
    <div className={`min-h-screen ${!isModern ? 'crt-overlay bg-[#c0c0c0]' : 'bg-[#050505]'}`}>
      {isTransitioning && <LoadingTransition lang={lang} />}

      {!isModern ? (
        <RetroLayout onExecute={handleExecute} lang={lang} setLang={setLang} />
      ) : (
        <ModernLayout lang={lang} setLang={setLang} />
      )}
    </div>
  );
};

export default App;
