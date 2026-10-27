
        lucide.createIcons();

        // --- GLOBAL STATE ---
        let db;
        let messagesMap = {};
        let intelDataMap = {}; // Global store for visitor data
        let currentOpenedMessageId = null;
        let isGeneratingBackgroundPDF = false; // Track background generation
        let autoPipelineUnsubscribe = null;
        let messagesUnsubscribe = null;
        let quotesUnsubscribe = null;
        let clientsUnsubscribe = null;
        let projectsUnsubscribe = null;
        let messagesListenerInitialized = false;
        const seenMessageIds = new Set();
        let pricingToolReady = false;
        let pricingToolLastPing = 0;
        let pricingToolPingTimer = null;
        let pricingContextProjectId = null;
        let pricingContextMessageId = null;
        let pendingPdfTimeout = null;
        const selectedQuotes = new Set();
        const selectedClients = new Set();
        const selectedVisitors = new Set();
        const selectedMessages = new Set();
        let visibleMessageIds = [];
        let visibleQuoteIds = [];
        let visibleClientIds = [];
        let visibleVisitorIds = [];

        function isSystemMessage(data) {
            return data?.type === 'report' || data?.email === 'tracker@taurus.sys';
        }

        function ensureTaurusGlobe() {
            if (!window.TaurusGlobe) return;
            window.TaurusGlobe.init('taurus-globe');
            window.TaurusGlobe.resize();
        }

        // --- AUTO PIPELINE CONFIG ---
        const AUTO_PIPELINE_ENABLED = true; // Full auto; only final approval is manual
        const autoPipelineLocks = new Set();

        // --- PDF CONFIG ---
        const USE_SERVER_PDF = true; // Vercel PDF generation (recommended)
        const PDF_SERVER_ENDPOINT = '/api/pdf';
        const PDF_TIMEOUT_MS = 25000;

        // --- WORKFLOW STAGES ---
        const WORKFLOW_STAGES = [
            'lead',
            'proposal',
            'active',
            'review',
            'approved'
        ];

        // --- PRICING DEFAULTS (Fallback if localStorage is empty) ---
        const DEFAULT_PRICING_CONFIG = {
            TR: {
                currency: 'TRY',
                currencySymbol: '₺',
                basePrices: {
                    LANDING: 8000,
                    PROMO: 8000,
                    CORPORATE: 15000,
                    ECOMMERCE: 40000,
                    PORTAL: 50000
                },
                pageRate: 1000,
                maintenanceRates: {
                    NONE: { value: 0, type: 'FIXED' },
                    BASIC: { value: 2000, type: 'FIXED' },
                    MID: { value: 5000, type: 'FIXED' },
                    PREMIUM: { value: 10000, type: 'FIXED' }
                },
                factors: {
                    seo: { value: 5000, type: 'FIXED' },
                    design: { value: 30, type: 'PERCENTAGE' },
                    multiLang: { value: 20, type: 'PERCENTAGE' },
                    graphics: { value: 10, type: 'PERCENTAGE' },
                    ux: { value: 10, type: 'PERCENTAGE' },
                    crm: { value: 20, type: 'PERCENTAGE' }
                },
                speedMultipliers: {
                    STANDARD: 1,
                    FAST: 1.5,
                    URGENT: 2.0
                }
            },
            MT: {
                currency: 'EUR',
                currencySymbol: '€',
                basePrices: {
                    LANDING: 800,
                    PROMO: 800,
                    CORPORATE: 1500,
                    ECOMMERCE: 4000,
                    PORTAL: 5000
                },
                pageRate: 100,
                maintenanceRates: {
                    NONE: { value: 0, type: 'FIXED' },
                    BASIC: { value: 200, type: 'FIXED' },
                    MID: { value: 500, type: 'FIXED' },
                    PREMIUM: { value: 1000, type: 'FIXED' }
                },
                factors: {
                    seo: { value: 500, type: 'FIXED' },
                    design: { value: 30, type: 'PERCENTAGE' },
                    multiLang: { value: 20, type: 'PERCENTAGE' },
                    graphics: { value: 10, type: 'PERCENTAGE' },
                    ux: { value: 10, type: 'PERCENTAGE' },
                    crm: { value: 20, type: 'PERCENTAGE' }
                },
                speedMultipliers: {
                    STANDARD: 1,
                    FAST: 1.5,
                    URGENT: 2.0
                }
            }
        };

        const DEFAULT_AVAILABLE_ADDONS = [
            {
                id: 'logo_design',
                label: 'Logo Tasarımı',
                description: '3 farklı konsept',
                priceTR: { value: 5000, type: 'FIXED' },
                priceMT: { value: 500, type: 'FIXED' }
            },
            {
                id: 'content_writing',
                label: 'İçerik Yazarlığı',
                description: 'SEO uyumlu metinler',
                priceTR: { value: 7500, type: 'FIXED' },
                priceMT: { value: 750, type: 'FIXED' }
            },
            {
                id: 'social_media',
                label: 'Sosyal Medya',
                description: 'Hesap kurulumu',
                priceTR: { value: 3000, type: 'FIXED' },
                priceMT: { value: 300, type: 'FIXED' }
            },
            {
                id: 'google_maps',
                label: 'Google Harita',
                description: 'Harita kaydı',
                priceTR: { value: 1500, type: 'FIXED' },
                priceMT: { value: 150, type: 'FIXED' }
            }
        ];

        function getPricingConfig() {
            try {
                const stored = localStorage.getItem('pricing_config');
                if (stored) return JSON.parse(stored);
            } catch (e) { }
            return DEFAULT_PRICING_CONFIG;
        }

        function getAddonConfig() {
            try {
                const stored = localStorage.getItem('addon_config');
                if (stored) return JSON.parse(stored);
            } catch (e) { }
            return DEFAULT_AVAILABLE_ADDONS;
        }

        function calculateFactorCost(baseAmount, factor) {
            if (!factor) return 0;
            if (factor.type === 'PERCENTAGE') return baseAmount * (factor.value / 100);
            return factor.value || 0;
        }

        function formatAdminMoney(value, currency = 'TRY') {
            const isEuro = currency === 'EUR';
            const symbol = isEuro ? '€' : '₺';
            const locale = isEuro ? 'en-GB' : 'tr-TR';
            return symbol + Number(value || 0).toLocaleString(locale, { maximumFractionDigits: 0 });
        }

        function calculateBreakdownFromRequest(request, pricingConfig, addons) {
            const rules = pricingConfig[request.country] || pricingConfig.TR;
            const base = (rules.basePrices && rules.basePrices[request.siteType]) || 0;
            const pagesCost = (Number(request.pageCount) || 0) * (rules.pageRate || 0);
            let scopeValue = base + pagesCost;

            const seoCost = request.hasSeo ? calculateFactorCost(scopeValue, rules.factors.seo) : 0;
            let runningTotal = scopeValue + seoCost;

            let designCost = 0;
            if (request.designType === 'CUSTOM') {
                designCost = calculateFactorCost(scopeValue, rules.factors.design);
            }

            let multiLangCost = 0;
            if (request.isMultiLang) {
                multiLangCost = calculateFactorCost(scopeValue, rules.factors.multiLang);
            }

            let graphicsCost = 0;
            if (request.hasGraphics) {
                graphicsCost = calculateFactorCost(scopeValue, rules.factors.graphics);
            }

            let uxCost = 0;
            if (request.hasUx) {
                uxCost = calculateFactorCost(scopeValue, rules.factors.ux);
            }

            let crmCost = 0;
            if (request.hasCrm) {
                crmCost = calculateFactorCost(scopeValue, rules.factors.crm);
            }

            runningTotal = runningTotal + designCost + multiLangCost + graphicsCost + uxCost + crmCost;

            let addonsCost = 0;
            if (Array.isArray(request.selectedAddons)) {
                request.selectedAddons.forEach(addonId => {
                    const addon = (addons || []).find(a => a.id === addonId);
                    if (addon) {
                        const priceFactor = request.country === 'TR' ? addon.priceTR : addon.priceMT;
                        addonsCost += calculateFactorCost(runningTotal, priceFactor);
                    }
                });
            }
            runningTotal += addonsCost;

            const speedMultiplier = (rules.speedMultipliers && rules.speedMultipliers[request.deliverySpeed]) || 1;
            const finalProjectTotal = runningTotal * speedMultiplier;
            const speedCost = finalProjectTotal - runningTotal;

            let discountAmount = 0;
            if (request.discountValue > 0) {
                if (request.discountType === 'PERCENTAGE') discountAmount = finalProjectTotal * (request.discountValue / 100);
                else discountAmount = request.discountValue;
            }
            discountAmount = Math.min(discountAmount, finalProjectTotal);
            const finalTotal = finalProjectTotal - discountAmount;

            const maintenanceFactor = rules.maintenanceRates[request.maintenanceLevel] || { value: 0, type: 'FIXED' };
            const monthlyCost = calculateFactorCost(finalProjectTotal, maintenanceFactor);

            return {
                base,
                pages: pagesCost,
                design: designCost,
                seo: seoCost,
                multiLang: multiLangCost,
                graphics: graphicsCost,
                ux: uxCost,
                crm: crmCost,
                addons: addonsCost,
                speed: speedCost,
                subtotal: runningTotal,
                totalOneTime: finalProjectTotal,
                discountAmount,
                finalTotal,
                totalMonthly: monthlyCost
            };
        }

        function buildQuoteRequestFromMessage(message) {
            return {
                customerName: message.name || 'Unknown',
                customerEmail: message.email || '',
                country: message.country || 'TR',
                siteType: message.siteType || message.projectType || 'CORPORATE',
                pageCount: Number(message.pageCount || 10),
                designType: message.designType || 'TEMPLATE',
                isMultiLang: !!message.isMultiLang,
                hasSeo: !!message.hasSeo,
                hasGraphics: !!message.hasGraphics,
                hasUx: !!message.hasUx,
                hasCrm: !!message.hasCrm,
                deliverySpeed: message.deliverySpeed || 'STANDARD',
                maintenanceLevel: message.maintenanceLevel || 'NONE',
                selectedAddons: Array.isArray(message.selectedAddons) ? message.selectedAddons : [],
                discountType: 'FIXED',
                discountValue: 0
            };
        }

        // Helper: Format Referrer Source
        function getReferrerInfo(ref) {
            if (!ref || ref === 'Direct') return { label: 'Direct Entry', icon: 'zap' };

            const url = ref.toLowerCase();
            if (url.includes('instagram.com')) return { label: 'Instagram', icon: 'instagram' };
            if (url.includes('facebook.com') || url.includes('fb.com')) return { label: 'Facebook', icon: 'facebook' };
            if (url.includes('t.co') || url.includes('twitter.com') || url.includes('x.com')) return { label: 'X (Twitter)', icon: 'twitter' };
            if (url.includes('linkedin.com')) return { label: 'LinkedIn', icon: 'linkedin' };
            if (url.includes('youtube.com') || url.includes('youtu.be')) return { label: 'YouTube', icon: 'youtube' };
            if (url.includes('google.')) return { label: 'Google Search', icon: 'search' };
            if (url.includes('tiktok.com')) return { label: 'TikTok', icon: 'music-2' };
            if (url.includes('reddit.com')) return { label: 'Reddit', icon: 'message-square' };
            if (url.includes('whatsapp.com') || url.includes('wa.me')) return { label: 'WhatsApp', icon: 'phone' };
            if (url.includes('mail.') || url.includes('outlook') || url.includes('gmail')) return { label: 'Email', icon: 'mail' };
            if (url.includes('github.com')) return { label: 'GitHub', icon: 'github' };

            try {
                const domain = new URL(ref).hostname.replace('www.', '');
                return { label: domain, icon: 'external-link' };
            } catch (e) {
                return { label: 'External Link', icon: 'link' };
            }
        }

        document.addEventListener('DOMContentLoaded', () => {
            if (window.firebaseConfig && window.firebaseConfig.apiKey !== "BURAYA_API_KEY_GELECEK") {
                firebase.initializeApp(window.firebaseConfig);
                db = firebase.firestore();

                // SECURITY: Check authentication state
                firebase.auth().onAuthStateChanged((user) => {
                    if (user) {
                        // User is authenticated - grant access
                        console.log("✅ Authenticated access verified:", user.uid, "IsAnon:", user.isAnonymous);
                        console.log("Intelligence System Initialized");

                        // Explicit Global DB assignment
                        window.db = firebase.firestore();

                        setupRealtimeListeners();
                        loadTrafficChart();
                        startAutoPipelineListener();

                        // Live Metadata Update
                        setInterval(() => {
                            const ping = Math.floor(Math.random() * 15) + 12;
                            const metaEl = document.getElementById('live-metadata');
                            if (metaEl) metaEl.innerText = `MS-Pulse: ${ping}ms`;
                        }, 3000);
                    } else {
                        // User is NOT authenticated - redirect to gateway
                        console.warn("⛔ Unauthorized access attempt - redirecting to gateway");
                        if (window.taurus_set_internal) window.taurus_set_internal();
                        window.location.href = 'gateway.html';
                    }
                });
            }
        });
