
import React, { useState, useEffect, useRef, useCallback } from 'react';
import Navbar from './components/Navbar';
import { isAgencyPlugin, isHostEvent, moduleApi, saveProposal, saveSettings, sendHost } from './host';
import Dashboard from './components/Dashboard';
import PricingCalculator from './components/PricingCalculator';
import ProposalView from './components/ProposalView';
import ContractView from './components/ContractView';
import SeoTracker from './components/SeoTracker';
import AdminSettings from './components/AdminSettings';
import {
  Country, SiteType, DesignType, DeliverySpeed, MaintenanceLevel, QuoteRequest, CostBreakdown, PricingRules, Language, DiscountType, AddonService
} from './types';
// removed unused imports
import { DEFAULT_PRICING_CONFIG, DEFAULT_AVAILABLE_ADDONS } from './constants';
import { TRANSLATIONS } from './translations';

type ToastType = 'success' | 'error' | 'info';

declare global {
  interface Window {
    __TAURUS_TOAST__?: (type: ToastType, message: string) => void;
    __TAURUS_PRICING_SAVE__?: (payload: unknown) => Promise<void>;
    taurusConfirm: (message: string) => Promise<boolean>;
    taurusPrompt: (message: string, value?: string) => Promise<string | null>;
    __TAURUS_PDF_GENERATOR__?: (...args: any[]) => Promise<Blob>;
  }
}

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState(isAgencyPlugin() ? 'calculator' : 'dashboard');
  const [language, setLanguage] = useState<Language>(Language.EN);
  const [toast, setToast] = useState<{ type: ToastType; message: string } | null>(null);
  const toastTimerRef = useRef<number | null>(null);
  const moduleReady = useRef(!isAgencyPlugin());
  const [connectionError, setConnectionError] = useState('');

  const showToast = useCallback((type: ToastType, message: string) => {
    setToast({ type, message });
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToast(null), 2500);
  }, []);

  useEffect(() => {
    window.__TAURUS_TOAST__ = showToast;
    return () => {
      if (window.__TAURUS_TOAST__ === showToast) delete window.__TAURUS_TOAST__;
    };
  }, [showToast]);

  // Expose native PDF generator for server-side rendering (Vercel)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('pdf') === '1') {
      import('./utils/pdfGenerator').then(({ generateNativePDF }) => {
        (window as any).__TAURUS_PDF_GENERATOR__ = generateNativePDF;
      }).catch((e) => {
        console.error('Failed to expose PDF generator', e);
      });
    }
  }, []);

  // -- Dynamic Configuration State --
  const [pricingConfig, setPricingConfig] = useState<Record<Country, PricingRules>>(DEFAULT_PRICING_CONFIG);
  const [availableAddons, setAvailableAddons] = useState<AddonService[]>(DEFAULT_AVAILABLE_ADDONS);

  // Load configuration from local storage on startup
  useEffect(() => {
    document.body.classList.toggle('plugin-agency', isAgencyPlugin());
    const savedConfig = localStorage.getItem('pricing_config');
    if (savedConfig && !isAgencyPlugin()) {
      try { setPricingConfig(JSON.parse(savedConfig)); } catch {}
    }
    const savedAddons = localStorage.getItem('addon_config');
    if (savedAddons && !isAgencyPlugin()) {
      try { setAvailableAddons(JSON.parse(savedAddons)); } catch {}
    }

    // --- NEW: Handle Redirection from Admin Panel ---
    const params = new URLSearchParams(window.location.search);
    const requestedView = params.get('view');
    const payload = params.get('payload');

    if ((requestedView === 'proposal' || requestedView === 'contract') && payload) {
      try {
        const jsonString = decodeURIComponent(atob(payload));
        const data = JSON.parse(jsonString);


        setQuoteRequest(prev => ({
          ...prev,
          customerName: data.customerName || '',
          customerEmail: data.customerEmail || '',
          country: (data.country as Country) || Country.TR,
          siteType: (data.siteType as SiteType) || SiteType.CORPORATE,
          pageCount: data.pageCount || 10,
          designType: (data.designType as DesignType) || DesignType.TEMPLATE,
          deliverySpeed: (data.deliverySpeed as DeliverySpeed) || DeliverySpeed.STANDARD,
          maintenanceLevel: (data.maintenanceLevel as MaintenanceLevel) || MaintenanceLevel.NONE,
          selectedAddons: data.selectedAddons || [],
          discountType: DiscountType.FIXED,
          discountValue: data.breakdown?.discountAmount || 0,
        }));

        if (data.breakdown) {
          setLastBreakdown(data.breakdown);
        }

        // Force Language to Turkish if Country is TR
        if (!isAgencyPlugin() && data.country === 'TR') {
          setLanguage(Language.TR);
        }

        setCurrentView(requestedView);

      } catch (e) {
        console.error("Failed to parse pricing payload:", e);
      }
    }
  }, []);

  // Notify parent when pricing tool is ready (iframe handshake)
  useEffect(() => {
    if (window.parent && window.parent !== window) {
      sendHost({ type: 'PRICING_TOOL_READY', version: 1 });
    }
  }, []);

  // -- NEW: Admin Panel Integration (Iframe Mode) --
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (!isHostEvent(event) || !event.data || !event.data.type) return;

      if (event.data.type === 'QUOTE_SAVED') {
        if (event.data.success) {
          showToast('success', language === Language.TR ? 'Teklif kaydedildi.' : 'Proposal saved.');
        } else {
          showToast('error', language === Language.TR ? 'Kayıt başarısız.' : 'Save failed.');
        }
        return;
      }

      if (event.data.type === 'PING_PRICING_TOOL') {
        sendHost({ type: 'PRICING_TOOL_PONG' });
        return;
      }

      if (event.data.type === 'PRE_FILL_CLIENT') {
        const {
          clientName,
          clientEmail,
          country,
          projectId,
          messageId,
          siteType,
          designType,
          pageCount,
          deliverySpeed,
          maintenanceLevel,
          selectedAddons, hasSeo, isMultiLang, hasGraphics, hasUx, hasCrm
        } = event.data.data;

        setQuoteRequest(prev => ({
          ...prev,
          customerName: clientName || prev.customerName,
          customerEmail: clientEmail || prev.customerEmail,
          country: (country as Country) || prev.country,
          projectId: projectId || prev.projectId,
          messageId: messageId || prev.messageId,

          // Map Technical Specs
          siteType: (siteType as SiteType) || prev.siteType,
          designType: (designType as DesignType) || prev.designType,
          pageCount: pageCount ? Number(pageCount) : prev.pageCount,
          deliverySpeed: (deliverySpeed as DeliverySpeed) || prev.deliverySpeed,
          maintenanceLevel: (maintenanceLevel as MaintenanceLevel) || prev.maintenanceLevel,
          hasSeo: Boolean(hasSeo), isMultiLang: Boolean(isMultiLang), hasGraphics: Boolean(hasGraphics), hasUx: Boolean(hasUx), hasCrm: Boolean(hasCrm),
          selectedAddons: Array.isArray(selectedAddons) ? selectedAddons : prev.selectedAddons
        }));

        if (!isAgencyPlugin() && country === 'TR') {
          setLanguage(Language.TR);
        } else if (!isAgencyPlugin() && country === 'MT') {
          setLanguage(Language.EN);
        }

        // Auto-switch to calculator if we have data
        setCurrentView('calculator');
      }

      // NEW: Remote PDF Generation (Client-side only, no cloud)
      if (event.data.type === 'GENERATE_QUOTE_PDF') {
        console.log("📄 Generating Quote PDF via Remote Command");
        const { request, breakdown } = event.data.payload;

        // Update state with provided data
        setQuoteRequest(prev => ({
          ...prev,
          ...request,
          customerName: request.customerName || request.clientName,
          customerEmail: request.customerEmail || request.clientEmail
        }));
        setLastBreakdown(breakdown);
        setCurrentView('proposal');

        // Generate NATIVE PDF (No Screenshot)
        (async () => {
          try {
            const { generateNativePDF } = await import('./utils/pdfGenerator');
            const blob = await generateNativePDF(
              { ...quoteRequest, ...request },
              breakdown,
              'quote'
            );

            if (blob) {
              const reader = new FileReader();
              reader.onloadend = () => {
                sendHost({
                  type: 'PDF_GENERATED',
                  payload: { quotePdf: reader.result as string, fileName: 'Quote.pdf' }
                });
              };
              reader.readAsDataURL(blob);
            }
          } catch (error) {
            console.error("PDF Generation Error:", error);
            sendHost({ type: 'PDF_GENERATED', payload: null });
          }
        })();
      }

      if (event.data.type === 'GENERATE_CONTRACT_PDF') {
        console.log("📜 Generating Contract PDF via Remote Command");
        const { request, breakdown } = event.data.payload;

        setQuoteRequest(prev => ({
          ...prev,
          ...request,
          customerName: request.customerName || request.clientName,
          customerEmail: request.customerEmail || request.clientEmail
        }));
        setLastBreakdown(breakdown);
        setCurrentView('contract');

        // Generate NATIVE PDF (No Screenshot)
        (async () => {
          try {
            const { generateNativePDF } = await import('./utils/pdfGenerator');
            const blob = await generateNativePDF(
              { ...quoteRequest, ...request },
              breakdown,
              'contract'
            );

            if (blob) {
              const reader = new FileReader();
              reader.onloadend = () => {
                sendHost({
                  type: 'PDF_GENERATED',
                  payload: { contractPdf: reader.result as string, fileName: 'Contract.pdf' }
                });
              };
              reader.readAsDataURL(blob);
            }
          } catch (error) {
            console.error("PDF Generation Error:", error);
            sendHost({ type: 'PDF_GENERATED', payload: null });
          }
        })();
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [pricingConfig, availableAddons, language, showToast]);

  useEffect(() => {
    if (!isAgencyPlugin()) return;
    moduleApi('pricing-config').then(value => { setPricingConfig(value.config); setAvailableAddons(value.addons); moduleReady.current = true; setConnectionError(''); }).catch(error => setConnectionError(error.message));
    window.__TAURUS_PRICING_SAVE__ = async payload => {
      try { if (!moduleReady.current) throw new Error('Reconnect to the pricing service before saving. Your inputs are still available.'); await saveProposal(payload); showToast('success', 'Proposal and project saved. Final approval remains manual.'); }
      catch (error) { const message = error instanceof Error ? error.message : 'Save failed.'; setConnectionError(message); showToast('error', message); }
    };
    return () => { delete window.__TAURUS_PRICING_SAVE__; };
  }, [showToast]);

  // Handlers for Admin Updates
  const updateConfig = (newConfig: Record<Country, PricingRules>) => {
    setPricingConfig(newConfig);
    localStorage.setItem('pricing_config', JSON.stringify(newConfig));
  };

  const updateAddons = (newAddons: AddonService[]) => {
    setAvailableAddons(newAddons);
    localStorage.setItem('addon_config', JSON.stringify(newAddons));
  };

  const resetDefaults = () => {
    setPricingConfig(DEFAULT_PRICING_CONFIG);
    setAvailableAddons(DEFAULT_AVAILABLE_ADDONS);
    localStorage.removeItem('pricing_config');
    localStorage.removeItem('addon_config');
  };

  // Central State for the Proposal
  const [quoteRequest, setQuoteRequest] = useState<QuoteRequest>({
    country: Country.TR,
    siteType: SiteType.CORPORATE,
    pageCount: 10,
    designType: DesignType.TEMPLATE,
    isMultiLang: false,
    hasSeo: false,
    hasGraphics: false, // New
    hasUx: false, // New
    hasCrm: false, // New
    deliverySpeed: DeliverySpeed.STANDARD,
    maintenanceLevel: MaintenanceLevel.NONE,
    customerName: '',
    customerEmail: '',
    selectedAddons: [],
    discountType: DiscountType.FIXED, // Default
    discountValue: 0,
  });

  // Sync Quote Request Country with Language if user changes lang
  useEffect(() => {
    // Update HTML lang attribute to ensure CSS text-transform works correctly (i -> I vs i -> İ)
    document.documentElement.lang = language === Language.TR ? 'tr' : 'en';

    if (!isAgencyPlugin() && language === Language.TR) {
      setQuoteRequest(prev => ({ ...prev, country: Country.TR }));
    } else if (!isAgencyPlugin()) {
      setQuoteRequest(prev => ({ ...prev, country: Country.MT }));
    }
  }, [language]);

  const [lastBreakdown, setLastBreakdown] = useState<CostBreakdown | null>(null);

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard onNavigate={setCurrentView} language={language} onRequestUpdate={setQuoteRequest} />;
      case 'calculator':
        return (
          <PricingCalculator
            config={pricingConfig}
            addons={availableAddons}
            initialRequest={quoteRequest}
            onRequestUpdate={setQuoteRequest}
            onBreakdownUpdate={setLastBreakdown}
            onNavigate={setCurrentView}
            language={language}
          />
        );
      case 'proposal':
        if (!lastBreakdown) {
          return <PricingCalculator
            config={pricingConfig}
            addons={availableAddons}
            initialRequest={quoteRequest}
            onRequestUpdate={setQuoteRequest}
            onBreakdownUpdate={setLastBreakdown}
            onNavigate={setCurrentView}
            language={language}
          />
        }
        return (
          <ProposalView
            config={pricingConfig}
            addons={availableAddons}
            request={quoteRequest}
            breakdown={lastBreakdown}
            onBack={() => setCurrentView('calculator')}
            onNavigate={setCurrentView}
            language={language}
          />
        );
      case 'seo':
        return <SeoTracker language={language} initialClientName={quoteRequest.customerName} />;
      case 'contract':
        return (
          <ContractView
            config={pricingConfig}
            addons={availableAddons}
            request={quoteRequest}
            breakdown={lastBreakdown}
            onBack={() => setCurrentView('calculator')}
            language={language}
          />
        );
      case 'admin':
        return (
          <AdminSettings
            config={pricingConfig}
            addons={availableAddons}
            onUpdateConfig={updateConfig}
            onUpdateAddons={updateAddons}
            onResetDefaults={resetDefaults}
            language={language}
            onPersist={isAgencyPlugin() ? saveSettings : undefined}
          />
        );
      default:
        return <Dashboard onNavigate={setCurrentView} language={language} onRequestUpdate={setQuoteRequest} />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col font-sans bg-black">
      <Navbar currentView={currentView} setView={setCurrentView} language={language} setLanguage={setLanguage} />
      {connectionError && <div role="status" className="border-b border-[#FFD700]/20 bg-[#FFD700]/5 px-6 py-3 text-xs text-[#d7c87a] flex flex-wrap items-center gap-4">
        <span>{connectionError}</span>
        <button type="button" onClick={() => moduleApi('pricing-config').then(value => { setPricingConfig(value.config); setAvailableAddons(value.addons); moduleReady.current = true; setConnectionError(''); }).catch(error => setConnectionError(error.message))}>Retry connection</button>
        <a href="https://omeryigitler.com/start-gateway.html?return=https%3A%2F%2Fstart.omeryigitler.com%2F%23agency%2Fpricing" target="_top">Renew Gateway session</a>
      </div>}
      <main className="flex-grow">
        {renderView()}
      </main>
      {/* Footer removed for admin-embedded usage */}

      {toast && (
        <div className="fixed bottom-6 right-6 z-[60]">
          <div
            className={`px-4 py-3 rounded-xl border text-sm font-bold shadow-2xl backdrop-blur-md ${
              toast.type === 'success'
                ? 'bg-[#FFD700] text-black border-[#FFD700]/50'
                : toast.type === 'error'
                ? 'bg-red-500/90 text-white border-red-500/50'
                : 'bg-white/10 text-white border-white/20'
            }`}
          >
            {toast.message}
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
