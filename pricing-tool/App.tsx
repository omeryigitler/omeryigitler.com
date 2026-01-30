
import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Dashboard from './components/Dashboard';
import PricingCalculator from './components/PricingCalculator';
import ProposalView from './components/ProposalView';
import ContractView from './components/ContractView';
import SeoTracker from './components/SeoTracker';
import AdminSettings from './components/AdminSettings';
import {
  Country, SiteType, DesignType, DeliverySpeed, MaintenanceLevel, QuoteRequest, CostBreakdown, PricingRules, Language, DiscountType, AddonService
} from './types';
import { DEFAULT_PRICING_CONFIG, DEFAULT_AVAILABLE_ADDONS } from './constants';
import { TRANSLATIONS } from './translations';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState('dashboard');
  const [language, setLanguage] = useState<Language>(Language.EN);

  // -- Dynamic Configuration State --
  const [pricingConfig, setPricingConfig] = useState<Record<Country, PricingRules>>(DEFAULT_PRICING_CONFIG);
  const [availableAddons, setAvailableAddons] = useState<AddonService[]>(DEFAULT_AVAILABLE_ADDONS);

  // Load configuration from local storage on startup
  useEffect(() => {
    const savedConfig = localStorage.getItem('pricing_config');
    if (savedConfig) {
      setPricingConfig(JSON.parse(savedConfig));
    }
    const savedAddons = localStorage.getItem('addon_config');
    if (savedAddons) {
      setAvailableAddons(JSON.parse(savedAddons));
    }
  }, []);

  // -- NEW: Admin Panel Integration (Iframe Mode) --
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Validate origin if needed, or check message structure
      if (!event.data || !event.data.type) return;

      if (event.data.type === 'PRE_FILL_CLIENT') {
        const {
          clientName,
          clientEmail,
          siteType,
          designType,
          pageCount,
          deliverySpeed,
          maintenanceLevel,
          selectedAddons
        } = event.data.data;

        setQuoteRequest(prev => ({
          ...prev,
          customerName: clientName || prev.customerName,
          // We don't have an email field in the state shown, but if we did:
          // email: clientEmail || prev.email, 

          // Map Technical Specs
          siteType: (siteType as SiteType) || prev.siteType,
          designType: (designType as DesignType) || prev.designType,
          pageCount: pageCount ? Number(pageCount) : prev.pageCount,
          deliverySpeed: (deliverySpeed as DeliverySpeed) || prev.deliverySpeed,
          maintenanceLevel: (maintenanceLevel as MaintenanceLevel) || prev.maintenanceLevel,
          selectedAddons: Array.isArray(selectedAddons) ? selectedAddons : prev.selectedAddons
        }));

        // Auto-switch to calculator if we have data
        setCurrentView('calculator');
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

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
    selectedAddons: [],
    discountType: DiscountType.FIXED, // Default
    discountValue: 0,
  });

  // Sync Quote Request Country with Language if user changes lang
  useEffect(() => {
    // Update HTML lang attribute to ensure CSS text-transform works correctly (i -> I vs i -> İ)
    document.documentElement.lang = language === Language.TR ? 'tr' : 'en';

    if (language === Language.TR) {
      setQuoteRequest(prev => ({ ...prev, country: Country.TR }));
    } else {
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
          />
        );
      default:
        return <Dashboard onNavigate={setCurrentView} language={language} />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col font-sans bg-black">
      <Navbar currentView={currentView} setView={setCurrentView} language={language} setLanguage={setLanguage} />
      <main className="flex-grow">
        {renderView()}
      </main>
      {currentView !== 'seo' && (
        <footer className="border-t border-zinc-800 py-8 mt-auto no-print">
          <div className="max-w-7xl mx-auto px-4 text-center text-zinc-500 text-sm font-medium">
            &copy; {new Date().getFullYear()} Ömer Yiğitler. {TRANSLATIONS[language].common.footerText}
          </div>
        </footer>
      )}
    </div>
  );
};

export default App;
