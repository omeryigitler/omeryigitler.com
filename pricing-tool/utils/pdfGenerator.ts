import jsPDF from 'jspdf';
import { QuoteRequest, CostBreakdown, Country, DesignType, Language } from '../types';
import { TRANSLATIONS } from '../translations';

// Helper to load image as base64
const loadImage = (url: string): Promise<string> => {
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.src = url;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.drawImage(img, 0, 0);
                resolve(canvas.toDataURL('image/png'));
            } else {
                resolve('');
            }
        };
        img.onerror = () => {
            console.warn("Logo failed to load from:", url);
            resolve(''); // Fail silently
        };
    });
};

/**
 * Generates a native, data-driven PDF document (Premium Design).
 */
export const generateNativePDF = async (request: QuoteRequest, breakdown: CostBreakdown, type: 'quote' | 'contract'): Promise<Blob> => {
    // 1. Initialize PDF
    const doc = new jsPDF();
    const currency = request.country === Country.TR ? '₺' : '€';
    const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;

    // Determine language
    const lang = request.country === Country.TR ? Language.TR : Language.EN;
    const t = TRANSLATIONS[lang]; // General Translations

    // Load Logo (Try root relative path first as we are likely in an iframe)
    const logoUrl = '/assets/favicon_taurus.png';
    const logoBase64 = await loadImage(logoUrl);

    // --- STYLING CONSTANTS ---
    const COLOR_BLACK = '#000000';
    const COLOR_GOLD = '#D4AF37'; // Taurus Gold
    const COLOR_DARK_GRAY = '#333333';
    const COLOR_LIGHT_GRAY = '#F5F5F5';

    // --- REUSABLE COMPONENTS ---

    // Header (Black Bar + Gold Text)
    doc.setFillColor(COLOR_BLACK);
    doc.rect(0, 0, pageWidth, 40, 'F');

    // Logo
    if (logoBase64) {
        doc.addImage(logoBase64, 'PNG', margin, 10, 20, 20); // 20x20 logo
    }

    // Main Title
    doc.setFont("helvetica", "bold");
    doc.setTextColor(COLOR_GOLD);
    doc.setFontSize(24);
    const titleText = type === 'quote' ? (lang === Language.TR ? 'FİYAT TEKLİFİ' : 'PRICE QUOTATION') : (lang === Language.TR ? 'HİZMET SÖZLEŞMESİ' : 'SERVICE AGREEMENT');
    doc.text(titleText, pageWidth - margin, 28, { align: 'right' });

    // --- CONTENT: QUOTE ---
    if (type === 'quote') {
        let y = 60;

        // Client Info Section
        doc.setTextColor(COLOR_BLACK);
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text(lang === Language.TR ? "MÜŞTERİ BİLGİLERİ" : "CLIENT DETAILS", margin, y);

        doc.setDrawColor(200);
        doc.line(margin, y + 2, pageWidth - margin, y + 2);
        y += 15;

        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.setTextColor(COLOR_DARK_GRAY);

        // Info Grid
        const col1 = margin;
        const col2 = pageWidth / 2 + 10;

        doc.text(`${lang === Language.TR ? 'Müşteri' : 'Client'}:`, col1, y);
        doc.setFont("helvetica", "bold");
        doc.text(request.customerName || 'N/A', col1 + 30, y);
        doc.setFont("helvetica", "normal");

        doc.text(`${lang === Language.TR ? 'Tarih' : 'Date'}:`, col2, y);
        doc.setFont("helvetica", "bold");
        doc.text(new Date().toLocaleDateString(), col2 + 20, y);
        doc.setFont("helvetica", "normal");

        y += 8;

        doc.text(`Email:`, col1, y);
        doc.text(request.customerEmail || 'N/A', col1 + 30, y);

        doc.text(`ID:`, col2, y);
        doc.text(Date.now().toString().slice(-6), col2 + 20, y);

        y += 8;
        doc.text(`${lang === Language.TR ? 'Proje' : 'Project'}:`, col1, y);
        doc.text((request.siteType || '').toUpperCase(), col1 + 30, y);

        y += 25;

        // FINANCIAL BREAKDOWN TABLE
        // Table Header
        doc.setFillColor(COLOR_BLACK);
        doc.setTextColor(COLOR_GOLD);
        doc.rect(margin, y, pageWidth - (margin * 2), 10, 'F');
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);

        doc.text(lang === Language.TR ? "HİZMET KALEMİ" : "DESCRIPTION", margin + 5, y + 7);
        doc.text(lang === Language.TR ? "TUTAR" : "AMOUNT", pageWidth - margin - 5, y + 7, { align: 'right' });

        y += 10;
        doc.setTextColor(COLOR_BLACK);
        doc.setFont("helvetica", "normal");

        // Rows
        const addRow = (label: string, value: number, isBold = false) => {
            if (value <= 0) return;
            y += 10;

            if (isBold) doc.setFont("helvetica", "bold");
            else doc.setFont("helvetica", "normal");

            doc.text(label, margin + 5, y);
            doc.text(`${currency}${value.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, pageWidth - margin - 5, y, { align: 'right' });

            // Bottom border
            doc.setDrawColor(240);
            doc.line(margin, y + 3, pageWidth - margin, y + 3);
        };

        const c = t.proposal; // Use proposal translations

        // Items
        addRow(c.basePrice, breakdown.base);
        addRow(`${c.pagePrice} (${request.pageCount})`, breakdown.pages);
        if (breakdown.design > 0) addRow(c.designDiff, breakdown.design);
        if (breakdown.multiLang > 0) addRow(c.langDiff, breakdown.multiLang);
        if (breakdown.seo > 0) addRow(c.seoSetup, breakdown.seo);
        if (breakdown.graphics > 0) addRow(c.graphicsDiff, breakdown.graphics);
        if (breakdown.ux > 0) addRow(c.uxDiff, breakdown.ux);
        if (breakdown.crm > 0) addRow(c.crmDiff, breakdown.crm);
        if (breakdown.speed > 0) addRow(c.speedDiff, breakdown.speed);
        if (breakdown.addons > 0) addRow(c.extras, breakdown.addons);

        y += 15;

        // TOTAL SECTION
        doc.setDrawColor(0); // Black line
        doc.setLineWidth(0.5);
        doc.line(margin, y, pageWidth - margin, y);
        y += 10;

        // Discount
        if (breakdown.discountAmount > 0) {
            doc.setTextColor(200, 0, 0); // Red
            doc.setFont("helvetica", "normal");
            doc.text(`${c.discount}:`, pageWidth - margin - 50, y, { align: 'right' });
            doc.text(`-${currency}${breakdown.discountAmount.toLocaleString()}`, pageWidth - margin - 5, y, { align: 'right' });
            y += 8;
        }

        // Final Total
        doc.setFillColor(COLOR_GOLD);
        doc.rect(pageWidth - margin - 80, y - 6, 80, 12, 'F');
        doc.setTextColor(COLOR_BLACK);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.text(lang === Language.TR ? "NET TOPLAM:" : "TOTAL VALUE:", pageWidth - margin - 55, y + 2, { align: 'right' });
        doc.text(`${currency}${breakdown.finalTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, pageWidth - margin - 5, y + 2, { align: 'right' });

        y += 20;

        // Monthly Costs
        if (breakdown.totalMonthly > 0) {
            doc.setFontSize(10);
            doc.setTextColor(COLOR_DARK_GRAY);
            doc.setFont("helvetica", "italic");
            doc.text(`* ${c.monthlyService}: ${currency}${breakdown.totalMonthly.toLocaleString()}/${lang === Language.TR ? 'ay' : 'mo'}.`, margin, y);
        }

        // Footer (Quote Validity)
        const footerY = pageHeight - 20;
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(c.validityText, pageWidth / 2, footerY, { align: 'center' });
    }

    // --- CONTENT: CONTRACT ---
    if (type === 'contract') {
        const ct = t.contract;
        const common = t.common;
        const labels = t.labels;

        let yPos = 60;
        const lineHeight = 6;

        // Helper to add section
        const addSection = (title: string, content: string) => {
            if (yPos > pageHeight - 40) {
                doc.addPage();
                // Add header to new pages too
                doc.setFillColor(COLOR_BLACK);
                doc.rect(0, 0, pageWidth, 40, 'F');
                doc.setFont("helvetica", "bold");
                doc.setTextColor(COLOR_GOLD);
                doc.setFontSize(24);
                doc.text(titleText, pageWidth - margin, 28, { align: 'right' });
                yPos = 50;
            }

            // Section Title (Gold)
            doc.setFont("helvetica", "bold");
            doc.setFontSize(11);
            doc.setTextColor(COLOR_BLACK); // Or Gold
            doc.text(title, margin, yPos);
            yPos += lineHeight;

            // Section Content
            doc.setFont("helvetica", "normal");
            doc.setFontSize(9);
            doc.setTextColor(COLOR_DARK_GRAY);

            const splitContent = doc.splitTextToSize(content, pageWidth - (margin * 2));
            doc.text(splitContent, margin, yPos);
            yPos += (splitContent.length * 4.5) + 8; // Spacing
        };

        // Resolve Localized Variables
        const deliveryLabel = labels.speeds[request.deliverySpeed] || request.deliverySpeed;
        const designLabel = request.designType === DesignType.CUSTOM ?
            (lang === Language.TR ? 'Özel Tasarım' : 'Custom Design') :
            (lang === Language.TR ? 'Hazır Tema' : 'Template Theme');

        const customerText = request.customerName || "................................................";
        const fmt = (val: number) => `${currency}${val.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

        // --- TURKISH CONTRACT CONTENT ---
        if (lang === Language.TR) {
            addSection(`1. ${ct.parties}`,
                `Hizmet Veren (Ajans): Ömer Yiğitler (Bundan sonra "Ajans" olarak anılacaktır).\n` +
                `Hizmet Alan (Müşteri): ${customerText} (Bundan sonra "Müşteri" olarak anılacaktır).`
            );

            addSection(`2. ${ct.serviceDef}`,
                `İşbu sözleşme, Ajans'ın Müşteri'ye ait web sitesinin tasarlanması, kodlanması, yayınlanması ve ilgili bakım hizmetlerini kapsar. ` +
                `Proje kapsamı, Müşteri tarafından onaylanan teklif formunda belirtilen detaylarla (Sayfa sayısı: ${request.pageCount}, Tasarım Tipi: ${designLabel}) sınırlıdır.`
            );

            addSection(`3. ${ct.delivery}`,
                `Proje teslim süresi, tüm materyallerin (logo, metin, görsel vb.) Müşteri tarafından Ajans'a teslim edilmesinden itibaren başlar. ` +
                `Öngörülen süre: ${deliveryLabel} planına uygundur. Mücbir sebepler (doğal afet, yasal engeller vb.) saklıdır.`
            );

            addSection(`4. ${ct.price}`,
                `Toplam hizmet bedeli teklif formunda belirtilen tutardır. Ödemeler aksi kararlaştırılmadıkça:\n` +
                `- %50 İş başlangıcında avans.\n` +
                `- %50 Proje onaylanıp yayına alınmadan önce.\n` +
                `Ödemeler ${request.country === 'TR' ? 'TL' : 'EUR'} cinsinden fatura karşılığı yapılacaktır. Ödeme gecikmelerinde T.C. Merkez Bankası ticari temerrüt faizi uygulanır.`
            );

            if (request.discountValue > 0) {
                addSection(`${ct.discountClauseTitle}`,
                    `Taraflar, bu proje için toplam sözleşme bedelinin ${fmt(breakdown.totalOneTime)} olduğu ve indirim uygulanarak net fiyatın ${fmt(breakdown.finalTotal)} olarak belirlendiğini kabul eder.`
                );
            }

            addSection(`5. ${ct.revision}`,
                `Müşteri, ana tasarım şablonu üzerinde onay verdikten sonra, içerik yerleşimi konusunda pakete dahil olarak 2 (iki) tur revizyon hakkına sahiptir. ` +
                `Tasarımın tamamen değiştirilmesi veya kodlama yapısı değişikliği gerektiren talepler ek ücretlendirilir.`
            );

            addSection(`6. ${ct.ip}`,
                `5846 sayılı Fikir ve Sanat Eserleri Kanunu uyarınca; proje bedelinin tamamı ödendiğinde, web sitesinin tasarımı ve varsa özel yazılımın kullanım hakları Müşteri'ye devredilir. ` +
                `Ajans, projeyi kendi portfolyosunda referans olarak kullanma hakkını saklı tutar.`
            );

            addSection(`7. ${ct.confidentiality}`,
                `Taraflar, proje sürecinde edindikleri birbirlerine ait ticari sırları, müşteri bilgilerini ve teknik verileri (KVKK kapsamındaki kişisel veriler dahil) yasal zorunluluklar dışında üçüncü şahıslarla paylaşmamayı taahhüt eder.`
            );

            addSection(`8. ${ct.cancellation}`,
                `Müşteri projeyi tek taraflı iptal ederse, o ana kadar yapılan çalışmaların bedeli hesaplanır. Başlangıç avansı iade edilmez. ` +
                `Ajans taahhütlerini yerine getirmezse (mücbir sebepler hariç), avansı iade etmekle yükümlüdür.`
            );

            addSection(`9. ${ct.warranty}`,
                `Teslimattan sonra 30 gün boyunca yazılımdan kaynaklı hatalar (bug) Ajans tarafından ücretsiz düzeltilir. ` +
                `Bu süre sonrasındaki bakım ve güncellemeler, seçilen Bakım Paketi (${request.maintenanceLevel}) kapsamında yürütülür.`
            );

            addSection(`10. ${ct.dispute}`,
                `İşbu sözleşmeden doğacak ihtilaflarda İstanbul Mahkemeleri ve İcra Daireleri yetkilidir. Sözleşme Türk Hukuku'na tabidir.`
            );

            // Signature Area (Turkish)
            if (yPos > pageHeight - 60) { doc.addPage(); yPos = 40; }
            yPos += 20;

            doc.setFont("helvetica", "bold");
            doc.setFontSize(10);
            doc.setTextColor(COLOR_BLACK);
            const signY = yPos;

            // Agency
            doc.text(common.agencySign, margin, signY);
            doc.line(margin, signY + 15, margin + 60, signY + 15);

            // Client
            doc.text(common.clientSign, pageWidth - margin - 60, signY);
            doc.line(pageWidth - margin - 60, signY + 15, pageWidth - margin, signY + 15);
        }

        // --- ENGLISH CONTRACT CONTENT ---
        else {
            addSection(`1. ${ct.parties}`,
                `Service Provider: Ömer Yiğitler (hereinafter referred to as the "Agency").\n` +
                `Client: ${customerText} (hereinafter referred to as the "Client").`
            );

            addSection(`2. ${ct.serviceDef}`,
                `This Agreement covers the design, development, deployment, and related maintenance services of the Client's website by the Agency. ` +
                `The scope is strictly limited to the details specified in the proposal form approved by the Client (Page Count: ${request.pageCount}, Design Type: ${designLabel}).`
            );

            addSection(`3. ${ct.delivery}`,
                `The project delivery timeline commences once all necessary materials (logo, text, images, etc.) are provided by the Client to the Agency. ` +
                `The estimated duration aligns with the ${deliveryLabel} plan. Force Majeure events are excluded.`
            );

            addSection(`4. ${ct.price}`,
                `The total service fee is the amount specified in the proposal. Unless agreed otherwise:\n` +
                `- 50% Upfront deposit upon commencement.\n` +
                `- 50% Final payment before the project goes live.\n` +
                `Payments shall be made in ${request.country === 'TR' ? 'TL' : 'EUR'}.`
            );

            if (request.discountValue > 0) {
                addSection(`${ct.discountClauseTitle}`,
                    `The parties agree that the total contract amount is ${fmt(breakdown.totalOneTime)}, and a special discount has been applied resulting in a net price of ${fmt(breakdown.finalTotal)}.`
                );
            }

            addSection(`5. ${ct.revision}`,
                `Upon approval of the main design template, the Client is entitled to 2 (two) rounds of revisions regarding content placement included in the package. ` +
                `Requests requiring a complete design overhaul or structural coding changes will incur additional fees.`
            );

            addSection(`6. ${ct.ip}`,
                `Upon full payment of the project fees, the intellectual property rights for the website design and any custom code are transferred to the Client. ` +
                `The Agency retains the right to use the project as a reference in its portfolio.`
            );

            addSection(`7. ${ct.confidentiality} & GDPR`,
                `Both parties agree to keep all commercial secrets, client data, and technical information confidential. ` +
                `The Agency agrees to process any personal data in accordance with the General Data Protection Regulation (GDPR).`
            );

            addSection(`8. ${ct.cancellation}`,
                `If the Client cancels the project unilaterally, the fee for work completed up to that point shall be calculated. The initial deposit is non-refundable. ` +
                `If the Agency fails to fulfill its obligations (excluding Force Majeure), the deposit shall be refunded.`
            );

            addSection(`9. ${ct.warranty}`,
                `Any software bugs identified within 30 days after delivery will be fixed by the Agency free of charge. ` +
                `Maintenance and updates after this period are subject to the selected Maintenance Package (${request.maintenanceLevel}).`
            );

            addSection(`10. ${ct.dispute}`,
                `This Agreement shall be governed by and construed in accordance with the Laws of Malta. ` +
                `Any disputes arising out of or in connection with this Agreement shall be subject to the exclusive jurisdiction of the Courts of Malta.`
            );

            // Signature Area (English)
            if (yPos > pageHeight - 60) { doc.addPage(); yPos = 40; }
            yPos += 20;

            doc.setFont("helvetica", "bold");
            doc.setFontSize(10);
            doc.setTextColor(COLOR_BLACK);
            const signY = yPos;

            // Agency
            doc.text(common.agencySign, margin, signY);
            doc.line(margin, signY + 15, margin + 60, signY + 15);

            // Client
            doc.text(common.clientSign, pageWidth - margin - 60, signY);
            doc.line(pageWidth - margin - 60, signY + 15, pageWidth - margin, signY + 15);
        }
    }

    return doc.output('blob');
};

// Backwards compatibility wrapper
export const captureToPDF = async (elementId: string, fileName: string): Promise<Blob | null> => {
    console.warn("captureToPDF is deprecated. Use generateNativePDF.");
    return null;
};
