

import { Language, SiteType, DeliverySpeed, MaintenanceLevel, DiscountType } from './types';

export const TRANSLATIONS = {
  [Language.TR]: {
    nav: {
      dashboard: 'Panel',
      calculator: 'Fiyat Hesapla',
      proposal: 'Teklif Oluştur',
      seo: 'SEO Takip',
      contract: 'Sözleşme',
      admin: 'Ayarlar',
      subtitle: 'WEB TASARIM HİZMETLERİ'
    },
    common: {
      footerText: 'Özel & Mobil Uyumlu Web Tasarım Hizmetleri.',
      back: 'Düzenlemeye Dön', // Standardized for both views
      print: 'Yazdır / PDF', // Standardized action label
      agencySign: 'AJANS (İmza/Kaşe)',
      clientSign: 'MÜŞTERİ (İmza/Kaşe)'
    },
    home: {
      heroTitlePrefix: 'Dijital',
      heroTitleHighlight: 'Fiyatlandırma',
      heroSubtitle: 'Premium web projeleri için özelleştirilmiş, hızlı ve profesyonel teklif yönetim sistemi.',
      startProject: 'PROJEYE BAŞLA',
      card1Title: 'Fiyat Hesapla',
      card1Desc: 'Proje özelliklerini belirleyerek saniyeler içinde tahmini bütçe oluşturun.',
      card2Title: 'Teklif & Sözleşme',
      card2Desc: 'Profesyonel PDF tekliflerini ve sözleşmelerini otomatik oluşturun.'
    },
    labels: {
      siteTypes: {
        [SiteType.LANDING]: 'Landing Page',
        [SiteType.PROMO]: 'Tanıtım Sitesi',
        [SiteType.CORPORATE]: 'Kurumsal Web Sitesi',
        [SiteType.ECOMMERCE]: 'E-Ticaret Sitesi',
        [SiteType.PORTAL]: 'Özel Portal / Yazılım',
      },
      speeds: {
        [DeliverySpeed.STANDARD]: 'Standart (4-6 Hafta)',
        [DeliverySpeed.FAST]: 'Hızlı (2-3 Hafta)',
        [DeliverySpeed.URGENT]: 'Acil (1 Hafta)',
      },
      maintenance: {
        [MaintenanceLevel.NONE]: 'Yok',
        [MaintenanceLevel.BASIC]: 'Başlangıç (Hosting + SSL)',
        [MaintenanceLevel.MID]: 'Orta (Yedekleme + Güncelleme)',
        [MaintenanceLevel.PREMIUM]: 'Premium (7/24 Destek + İçerik)',
      },
      discountTypes: {
        [DiscountType.PERCENTAGE]: 'Yüzde (%) İndirim',
        [DiscountType.FIXED]: 'Sabit Tutar İndirimi',
      }
    },
    calc: {
      title1: 'Proje Detayları',
      title2: 'Teslimat ve Bakım',
      title3: 'Ek Hizmetler',
      sectionClient: 'Müşteri Kimliği',
      sectionMarket: 'Pazar & Kapsam',
      customerName: 'Müşteri / Firma Adı',
      customerPlaceholder: 'Örn: Global Tech A.Ş.',
      customerEmail: 'E-posta (Opsiyonel)',
      customerEmailPlaceholder: 'ornek@firma.com',
      targetMarket: 'Hedef Pazar',
      countryTR: 'Türkiye (₺)',
      countryMT: 'Malta (€)',
      projectType: 'Proje Türü',
      pageCount: 'Sayfa Sayısı',
      designPref: 'Tasarım Tercihi',
      template: 'Hazır Tema',
      templateDesc: 'Ekonomik, hızlı ve standartlara uygun yapı.',
      custom: 'Özel Tasarım',
      customDesc: 'Markaya özel UI/UX çalışması ve özgün arayüz.',
      technicalTitle: 'Teknik & Kreatif', // Added translation
      seoService: 'SEO Hizmeti',
      seoDesc: 'Google Search Console, Sitemap, Meta Optimizasyonu',
      multiLang: 'Çoklu Dil Desteği',
      multiLangDesc: 'TR/EN Altyapısı ve Çeviri Paneli',
      graphics: 'Grafik & Animasyon',
      graphicsDesc: 'Lottie animasyonları, özel ikonlar ve görsel düzenlemeler',
      ux: 'UX & Wireframe',
      uxDesc: 'Kullanıcı deneyimi analizi ve prototip çizimi',
      crm: 'CRM / API Entegrasyonu',
      crmDesc: '3. parti yazılım bağlantıları ve veri entegrasyonu',
      deliverySpeed: 'Teslimat Hızı',
      urgentNote: 'Aciliyet katsayısı projeye yansıtılır.',
      maintenance: 'Aylık Bakım & Destek',
      maintenanceCost: 'Aylık Ücret',
      budgetSummary: 'Tahmini Bütçe Özeti',
      oneTime: 'Ara Toplam',
      discount: 'Özel İndirim',
      netTotal: 'Net Toplam',
      discountLabel: 'İndirim Uygula',
      monthly: 'Aylık Bakım',
      createProposal: 'TEKLİF OLUŞTUR',
      chartTitle: 'Maliyet Analizi',
      chart: {
        base: 'Baz',
        pages: 'Sayfa',
        extras: 'Ekstra',
        speed: 'Aciliyet'
      },
      alerts: {
        enterCustomer: 'Lütfen önce bir müşteri adı girin.'
      }
    },
    addons: {
      logo_design: {
        label: 'Logo Tasarımı',
        desc: '3 farklı konsept ve revizyon hakkı'
      },
      content_writing: {
        label: 'İçerik Yazarlığı',
        desc: 'SEO uyumlu sayfa metinleri (Max 10 sayfa)'
      },
      social_media: {
        label: 'Sosyal Medya Kurulumu',
        desc: 'Hesap açılışı, kapak tasarımları ve entegrasyon'
      },
      google_maps: {
        label: 'Google Harita Kaydı',
        desc: 'İşletme doğrulama ve optimizasyon'
      }
    },
    proposal: {
      title: 'Proje Teklifi',
      date: 'Tarih',
      refNo: 'Ref No',
      dearClient: 'Sayın Müşteri',
      intro: 'Dijital dünyadaki varlığınızı güçlendirmek ve markanızı en doğru şekilde yansıtmak adına hazırladığımız web tasarım ve yazılım projesi detayları aşağıdadır.',
      scope: 'Proje Kapsamı',
      extras: 'Ek Hizmetler',
      siteType: 'Site Türü',
      pages: 'Sayfa Adedi',
      design: 'Tasarım',
      delivery: 'Teslimat',
      timeline: 'Proje Süreç Takvimi',
      week: 'Hafta',
      phase1: 'Analiz & Tasarım',
      phase2: 'Geliştirme',
      phase3: 'Yayın',
      pricingDetail: 'Fiyatlandırma Detayı',
      serviceItem: 'Hizmet Kalemi',
      amount: 'Tutar',
      basePrice: 'Baz Tasarım ve Yazılım Ücreti',
      pagePrice: 'İçerik Girişi ve Sayfa Oluşturma',
      designDiff: 'Özel UI/UX Tasarım Farkı',
      langDiff: 'Çoklu Dil Modülü',
      seoSetup: 'SEO Hizmeti (Kurulum)',
      graphicsDiff: 'Grafik & Animasyon İşleri',
      uxDiff: 'UX Analiz & Wireframe',
      crmDiff: 'CRM & API Entegrasyonları',
      speedDiff: 'Acil Teslimat Farkı',
      subtotal: 'ARA TOPLAM',
      discount: 'ÖZEL İNDİRİM',
      netTotal: 'NET PROJE BEDELİ',
      total: 'TOPLAM', // Fallback
      monthlyService: 'Aylık Bakım Hizmeti',
      terms: 'Ödeme Koşulları',
      validity: 'Geçerlilik',
      validityText: 'Bu teklif oluşturulduğu tarihten itibaren 15 gün süreyle geçerlidir.',
      term1: '%50 İş başlangıcında peşinat',
      term2: '%50 Proje tesliminde',
      term3: 'Fiyatlara KDV dahil değildir.',
      agency: 'DİJİTAL TASARIM STÜDYOSU',
      signAgency: 'İmza / Kaşe',
      signClient: 'İmza / Tarih',
      approval: 'Müşteri Onayı',
      nextContract: 'İlerle: Sözleşme'
    },
    contract: {
      title: 'Web Tasarım Hizmet Sözleşmesi',
      parties: 'Taraflar',
      serviceDef: 'Hizmetin Tanımı',
      delivery: 'Teslim Süresi',
      price: 'Fiyat ve Ödeme',
      discountClauseTitle: 'Özel İndirim',
      discountClauseText: 'Taraflar, bu proje için toplam sözleşme bedelinin [{ORIGINAL}] olduğu ve {DISCOUNT_PHRASE} özel indirim uygulanarak net fiyatın [{NET}] olarak belirlendiğini kabul eder. Bu indirim yalnızca bu sözleşme kapsamındaki hizmetler için geçerlidir.',
      revision: 'Revizyon Hakları',
      ip: 'Fikri Mülkiyet',
      confidentiality: 'Gizlilik',
      cancellation: 'İptal ve Fesih',
      warranty: 'Garanti ve Bakım',
      dispute: 'Uyuşmazlık'
    },
    seo: {
      myProjects: 'Projelerim',
      newProject: 'Yeni Proje Oluştur',
      noProjects: 'Henüz kayıtlı proje yok.',
      progress: 'İlerleme',
      deleteConfirm: 'Bu projeyi ve tüm verilerini silmek istediğinize emin misiniz?',
      totalSuccess: 'Genel İlerleme',
      hideCompleted: 'Tamamlananları Gizle',
      addTask: 'Görev Ekle',
      newTaskTitle: 'Yeni görev başlığı:',
      addNote: 'Bu görev için not ekleyin...',
      trackerTitle: 'SEO Görev Takipçisi',
      trackerDesc: 'Sol menüden bir proje seçin veya yeni bir müşteri projesi oluşturarak SEO süreçlerini yönetmeye başlayın.',
      startNow: 'Hemen Başla',
      modalTitle: 'Yeni SEO Projesi',
      clientName: 'Müşteri Adı',
      website: 'Web Sitesi',
      createBtn: 'Projeyi Oluştur',
      urlPlaceholder: 'Örn: www.ornek.com'
    },
    admin: {
      title: 'Yönetici Ayarları',
      subtitle: 'Fiyatlandırma motorunu ve hizmet bedellerini yapılandırın.',
      reset: 'Varsayılanlara Dön',
      save: 'Kaydet',
      trSettings: '₺ Ayarları',
      mtSettings: '€ Ayarları',
      basePrices: 'Baz Fiyatlar',
      unitRates: 'Birim Ücretler',
      pageRate: 'Sayfa Başına Ücret',
      seoRate: 'SEO Hizmeti (Sabit)',
      maintenanceRates: 'Aylık Bakım Ücretleri',
      multipliers: 'Katsayılar & Çarpanlar',
      multiplierDesc: 'Örn: 0.30 değeri %30 artış anlamına gelir. 1.5 değeri x1.5 katı demektir.',
      designDiff: 'Özel Tasarım Farkı',
      langDiff: 'Çoklu Dil Farkı',
      graphicsDiff: 'Grafik/Animasyon Farkı',
      uxDiff: 'UX/Wireframe Farkı',
      crmDiff: 'CRM/API Farkı',
      speedMultipliers: 'Aciliyet Çarpanları',
      addonsTitle: 'Ek Hizmetler (Add-ons)',
      addNew: 'Yeni Ekle',
      serviceName: 'Hizmet Adı',
      desc: 'Açıklama',
      priceTR: 'Fiyat (TR)',
      priceMT: 'Fiyat (MT)',
      saveSuccess: 'Ayarlar başarıyla kaydedildi.',
      resetConfirm: 'Tüm fiyatları varsayılan ayarlara döndürmek istediğinize emin misiniz?'
    },
    packages: {
      title: 'Package Pricing',
      subtitle: 'Choose the best solution for your project',
      selectBtn: 'Select Package',
      starter: {
        name: 'Starter',
        desc: 'For small businesses and personal sites',
        badge: '',
        features: [
          'Mobile Responsive',
          'Admin Panel',
          'Multi-Language Support',
          'Basic SEO Setup',
          'Hosting & SSL',
          'Custom Design',
          'Technical Support'
        ]
      },
      business: {
        name: 'Professional',
        desc: 'Comprehensive solution for growing businesses',
        badge: 'MOST POPULAR',
        features: [
          'Mobile Responsive',
          'Admin Panel',
          'Multi-Language Support',
          'Basic SEO Setup',
          'Hosting & SSL',
          'Custom Design',
          'Technical Support'
        ]
      },
      premium: {
        name: 'Premium',
        desc: 'For corporate and e-commerce projects',
        badge: '',
        features: [
          'Mobile Responsive',
          'Admin Panel',
          'Multi-Language Support',
          'Basic SEO Setup',
          'Hosting & SSL',
          'Custom Design',
          'Technical Support'
        ]
      }
    }
  },
  [Language.EN]: {
    nav: {
      dashboard: 'Dashboard',
      calculator: 'Calculator',
      proposal: 'Proposal',
      seo: 'SEO Tracker',
      contract: 'Contract',
      admin: 'Settings',
      subtitle: 'WEB DESIGN SERVICES'
    },
    common: {
      footerText: 'Custom & Responsive Web Design Services.',
      back: 'Back to Edit', // Standardized
      print: 'Print / PDF', // Standardized
      agencySign: 'AGENCY (Sign/Stamp)',
      clientSign: 'CLIENT (Sign/Stamp)'
    },
    home: {
      heroTitlePrefix: 'Digital',
      heroTitleHighlight: 'Pricing',
      heroSubtitle: 'Customized, fast, and professional proposal management system for premium web projects.',
      startProject: 'START PROJECT',
      card1Title: 'Calculate Price',
      card1Desc: 'Create an estimated budget in seconds by defining project specifications.',
      card2Title: 'Proposal & Contract',
      card2Desc: 'Automatically generate professional PDF proposals and agreements.'
    },
    labels: {
      siteTypes: {
        [SiteType.LANDING]: 'Landing Page',
        [SiteType.PROMO]: 'Promotional Website',
        [SiteType.CORPORATE]: 'Corporate Website',
        [SiteType.ECOMMERCE]: 'E-Commerce Site',
        [SiteType.PORTAL]: 'Custom Portal / Software',
      },
      speeds: {
        [DeliverySpeed.STANDARD]: 'Standard (4-6 Weeks)',
        [DeliverySpeed.FAST]: 'Fast (2-3 Weeks)',
        [DeliverySpeed.URGENT]: 'Urgent (1 Week)',
      },
      maintenance: {
        [MaintenanceLevel.NONE]: 'None',
        [MaintenanceLevel.BASIC]: 'Basic (Hosting + SSL)',
        [MaintenanceLevel.MID]: 'Mid (Backups + Updates)',
        [MaintenanceLevel.PREMIUM]: 'Premium (24/7 Support + Content)',
      },
      discountTypes: {
        [DiscountType.PERCENTAGE]: 'Percentage (%) Discount',
        [DiscountType.FIXED]: 'Fixed Amount Discount',
      }
    },
    calc: {
      title1: 'Project Details',
      title2: 'Delivery & Maintenance',
      title3: 'Additional Services',
      sectionClient: 'Client Identity',
      sectionMarket: 'Market & Scope',
      customerName: 'Client / Company Name',
      customerPlaceholder: 'Ex: Global Tech Ltd.',
      customerEmail: 'Email (Optional)',
      customerEmailPlaceholder: 'client@example.com',
      targetMarket: 'Target Market',
      countryTR: 'Turkey (₺)',
      countryMT: 'Malta (€)',
      projectType: 'Project Type',
      pageCount: 'Page Count',
      designPref: 'Design Preference',
      template: 'Template Theme',
      templateDesc: 'Economical, fast, and standards-compliant.',
      custom: 'Custom Design',
      customDesc: 'Brand-specific UI/UX work and unique interface.',
      technicalTitle: 'Technical & Creative', // Added translation
      seoService: 'SEO Service',
      seoDesc: 'Google Search Console, Sitemap, Meta Optimization',
      multiLang: 'Multi-Language Support',
      multiLangDesc: 'Multi-language infrastructure and translation panel',
      graphics: 'Graphics & Animation',
      graphicsDesc: 'Lottie animations, custom icons, and visual editing',
      ux: 'UX & Wireframing',
      uxDesc: 'User experience analysis and prototype sketching',
      crm: 'CRM / API Integration',
      crmDesc: '3rd party software connections and data integration',
      deliverySpeed: 'Delivery Speed',
      urgentNote: 'Urgency multiplier is applied to the project.',
      maintenance: 'Monthly Maintenance & Support',
      maintenanceCost: 'Monthly Fee',
      budgetSummary: 'Estimated Budget Summary',
      oneTime: 'Subtotal',
      discount: 'Special Discount',
      netTotal: 'Net Total',
      discountLabel: 'Apply Discount',
      monthly: 'Monthly Maintenance',
      createProposal: 'CREATE PROPOSAL',
      chartTitle: 'Cost Analysis',
      chart: {
        base: 'Base',
        pages: 'Pages',
        extras: 'Extras',
        speed: 'Urgency'
      },
      alerts: {
        enterCustomer: 'Please enter a customer name first.'
      }
    },
    addons: {
      logo_design: {
        label: 'Logo Design',
        desc: '3 different concepts and revision rights'
      },
      content_writing: {
        label: 'Content Writing',
        desc: 'SEO-friendly page content (Max 10 pages)'
      },
      social_media: {
        label: 'Social Media Setup',
        desc: 'Account opening, cover designs, and integration'
      },
      google_maps: {
        label: 'Google Maps Registration',
        desc: 'Business verification and optimization'
      }
    },
    proposal: {
      title: 'Project Proposal',
      date: 'Date',
      refNo: 'Ref',
      dearClient: 'Dear Client',
      intro: 'Below are the details of the web design and development project we have prepared to strengthen your digital presence and accurately reflect your brand identity.',
      scope: 'Project Scope',
      extras: 'Additional Services',
      siteType: 'Site Type',
      pages: 'Page Count',
      design: 'Design',
      delivery: 'Delivery',
      timeline: 'Project Timeline',
      week: 'Weeks',
      phase1: 'Analysis & Design',
      phase2: 'Development',
      phase3: 'Launch',
      pricingDetail: 'Pricing Breakdown',
      serviceItem: 'Service Item',
      amount: 'Amount',
      basePrice: 'Base Design & Development Fee',
      pagePrice: 'Content Entry & Page Creation',
      designDiff: 'Custom UI/UX Design Fee',
      langDiff: 'Multi-Language Module',
      seoSetup: 'SEO Service (Setup)',
      graphicsDiff: 'Graphics & Animation',
      uxDiff: 'UX Analysis & Wireframing',
      crmDiff: 'CRM & API Integrations',
      speedDiff: 'Urgent Delivery Surcharge',
      subtotal: 'SUBTOTAL',
      discount: 'SPECIAL DISCOUNT',
      netTotal: 'NET PROJECT COST',
      total: 'TOTAL', // Fallback
      monthlyService: 'Monthly Maintenance Service',
      terms: 'Payment Terms',
      validity: 'Validity',
      validityText: 'This proposal is valid for 15 days from the date of creation.',
      term1: '50% Deposit upon commencement',
      term2: '50% Upon project delivery',
      term3: 'Prices exclude VAT.',
      agency: 'DIGITAL DESIGN STUDIO',
      signAgency: 'Signature / Stamp',
      signClient: 'Sign / Date',
      approval: 'Customer Approval',
      nextContract: 'Next: Contract'
    },
    contract: {
      title: 'Web Design Service Agreement',
      parties: 'Parties',
      serviceDef: 'Description of Services',
      delivery: 'Delivery Time',
      price: 'Price and Payment',
      discountClauseTitle: 'Special Discount',
      discountClauseText: 'The parties agree that the total contract amount for this project is [{ORIGINAL}], and a special discount of {DISCOUNT_PHRASE} has been applied resulting in a net price of [{NET}]. This discount applies only to the services specified in this contract.',
      revision: 'Revision Rights',
      ip: 'Intellectual Property',
      confidentiality: 'Confidentiality',
      cancellation: 'Cancellation and Termination',
      warranty: 'Warranty and Maintenance',
      dispute: 'Dispute Resolution'
    },
    seo: {
      myProjects: 'My Projects',
      newProject: 'Create New Project',
      noProjects: 'No projects found.',
      progress: 'Progress',
      deleteConfirm: 'Are you sure you want to delete this project and all its data?',
      totalSuccess: 'Total Progress',
      hideCompleted: 'Hide Completed',
      addTask: 'Add Task',
      newTaskTitle: 'New task title:',
      addNote: 'Add a note for this task...',
      trackerTitle: 'SEO Task Tracker',
      trackerDesc: 'Select a project from the left menu or create a new client project to start managing SEO processes.',
      startNow: 'Start Now',
      modalTitle: 'New SEO Project',
      clientName: 'Client Name',
      website: 'Website',
      createBtn: 'Create Project',
      urlPlaceholder: 'Ex: www.example.com'
    },
    admin: {
      title: 'Admin Settings',
      subtitle: 'Configure the pricing engine and service fees.',
      reset: 'Reset to Defaults',
      save: 'Save Changes',
      trSettings: '₺ Settings',
      mtSettings: '€ Settings',
      basePrices: 'Base Prices',
      unitRates: 'Unit Rates',
      pageRate: 'Price Per Page',
      seoRate: 'SEO Service (Flat)',
      maintenanceRates: 'Monthly Maintenance Fees',
      multipliers: 'Multipliers & Factors',
      multiplierDesc: 'Ex: 0.30 means 30% increase. 1.5 means x1.5 multiplier.',
      designDiff: 'Custom Design Fee',
      langDiff: 'Multi-Language Fee',
      graphicsDiff: 'Graphics/Anim Fee',
      uxDiff: 'UX/Wireframe Fee',
      crmDiff: 'CRM/API Fee',
      speedMultipliers: 'Urgency Multipliers',
      addonsTitle: 'Additional Services (Add-ons)',
      addNew: 'Add New',
      serviceName: 'Service Name',
      desc: 'Description',
      priceTR: 'Price (TR)',
      priceMT: 'Price (MT)',
      saveSuccess: 'Settings saved successfully.',
      resetConfirm: 'Are you sure you want to reset all prices to defaults?'
    },
    packages: {
      title: 'Package Pricing',
      subtitle: 'Choose the best solution for your project',
      selectBtn: 'Select Package',
      starter: {
        name: 'Starter',
        desc: 'For small businesses and personal sites',
        badge: '',
        features: [
          'Mobile Responsive',
          'Admin Panel',
          'Multi-Language Support',
          'Basic SEO Setup',
          'Hosting & SSL',
          'Custom Design',
          'Technical Support'
        ]
      },
      business: {
        name: 'Professional',
        desc: 'Comprehensive solution for growing businesses',
        badge: 'MOST POPULAR',
        features: [
          'Mobile Responsive',
          'Admin Panel',
          'Multi-Language Support',
          'Basic SEO Setup',
          'Hosting & SSL',
          'Custom Design',
          'Technical Support'
        ]
      },
      premium: {
        name: 'Premium',
        desc: 'For corporate and e-commerce projects',
        badge: '',
        features: [
          'Mobile Responsive',
          'Admin Panel',
          'Multi-Language Support',
          'Basic SEO Setup',
          'Hosting & SSL',
          'Custom Design',
          'Technical Support'
        ]
      }
    }
  }
};
