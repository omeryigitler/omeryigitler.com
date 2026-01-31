import jsPDF from 'jspdf';
import { QuoteRequest, CostBreakdown, Country, DesignType, Language } from '../types';
import { TRANSLATIONS } from '../translations';

/**
 * Generates a native, data-driven PDF document (not a screenshot).
 * Ensures 100% clean output regardless of screen size or rendering state.
 */
export const generateNativePDF = async (request: QuoteRequest, breakdown: CostBreakdown, type: 'quote' | 'contract'): Promise<Blob> => {
    // 1. Initialize PDF
    const doc = new jsPDF();
    const currency = request.country === Country.TR ? '₺' : '€';
    const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
    const margin = 20;

    // Determine language from country
    const lang = request.country === Country.TR ? Language.TR : Language.EN;

    // 2. Header
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.text(type === 'quote' ? 'PRICE QUOTATION' : 'SERVICE CONTRACT', pageWidth / 2, 25, { align: 'center' });

    // 3. Client & Project Info
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(60);

    // Left Column
    doc.text(`Client:`, margin, 45);
    doc.text(`Email:`, margin, 50);
    doc.text(`Project Type:`, margin, 55);

    doc.setFont("helvetica", "bold");
    doc.setTextColor(0);
    doc.text(request.customerName || 'Valued Customer', margin + 25, 45);
    doc.text(request.customerEmail || 'N/A', margin + 25, 50);
    doc.text(request.siteType || 'Custom Project', margin + 25, 55);

    // Right Column
    doc.setFont("helvetica", "normal");
    doc.setTextColor(60);
    doc.text(`Date:`, pageWidth - margin - 30, 45, { align: 'right' });
    doc.text(`ID:`, pageWidth - margin - 30, 50, { align: 'right' });

    doc.setFont("helvetica", "bold");
    doc.setTextColor(0);
    doc.text(new Date().toLocaleDateString(), pageWidth - margin, 45, { align: 'right' });
    doc.text(Date.now().toString().slice(-6), pageWidth - margin, 50, { align: 'right' });

    // 4. Financial Breakdown Table
    let y = 75;

    // Table Header
    doc.setFillColor(240, 240, 240);
    doc.rect(margin, y - 5, pageWidth - (margin * 2), 8, 'F');
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Description", margin + 2, y);
    doc.text("Amount", pageWidth - margin - 2, y, { align: 'right' });

    y += 10;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);

    // Helper to add row
    const addRow = (label: string, value: number) => {
        if (value > 0) {
            doc.text(label, margin + 2, y);
            doc.text(`${currency}${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, pageWidth - margin - 2, y, { align: 'right' });

            // Dotted line
            doc.setDrawColor(200);
            doc.setLineDashPattern([1, 2], 0);
            const labelWidth = doc.getTextWidth(label);
            const priceWidth = doc.getTextWidth(`${currency}${value.toLocaleString()}`);
            // doc.line(margin + 5 + labelWidth, y, pageWidth - margin - 5 - priceWidth, y);
            doc.setLineDashPattern([], 0); // Reset

            y += 8;
        }
    };

    addRow("Base Development Cost", breakdown.base);
    addRow(`Additional Pages (${request.pageCount})`, breakdown.pages);
    addRow("UI/UX Design Customization", breakdown.design);
    addRow("SEO Optimization Suite", breakdown.seo);
    addRow("Multi-language Support", breakdown.multiLang);
    addRow("Custom Graphics & Assets", breakdown.graphics);
    addRow("CRM & Data Integration", breakdown.crm);
    addRow("Add-on Services", breakdown.addons);

    if (request.deliverySpeed !== 'STANDARD') {
        addRow(`Priority Delivery (${request.deliverySpeed})`, breakdown.speed);
    }

    // Separator line
    y += 5;
    doc.setDrawColor(0);
    doc.setLineWidth(0.5);
    doc.line(pageWidth / 2, y, pageWidth - margin, y);
    y += 10;

    // 5. Totals
    doc.setFont("helvetica", "bold");

    if (breakdown.discountAmount > 0) {
        doc.setTextColor(200, 0, 0); // Red
        doc.text(`Discount:`, pageWidth - margin - 40, y, { align: 'right' });
        doc.text(`-${currency}${breakdown.discountAmount.toLocaleString()}`, pageWidth - margin, y, { align: 'right' });
        y += 8;
        doc.setTextColor(0);
    }

    doc.setFontSize(14);
    doc.text(`TOTAL PROJECT VALUE:`, pageWidth - margin - 50, y, { align: 'right' });
    doc.text(`${currency}${breakdown.finalTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, pageWidth - margin, y, { align: 'right' });

    y += 15;

    // Monthly Costs if applicable
    if (breakdown.totalMonthly > 0) {
        doc.setFontSize(10);
        doc.setFont("helvetica", "italic");
        doc.setTextColor(100);
        doc.text(`* Monthly Maintenance & Hosting: ${currency}${breakdown.totalMonthly.toLocaleString()}/mo`, pageWidth - margin, y, { align: 'right' });
    }

    // Helper for formatted currency
    const fmt = (value: number) => {
        return `${currency}${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    // --- CONTRACT GENERATION ---
    if (type === 'contract') {
        doc.addPage(); // Start contract on a new page

        const t = TRANSLATIONS[lang].contract;
        const common = TRANSLATIONS[lang].common;
        const labels = TRANSLATIONS[lang].labels;

        let yPos = 40;
        const lineHeight = 7;

        // Helper to add section
        const addSection = (title: string, content: string) => {
            if (yPos > 250) { // Check if content will overflow page
                doc.addPage();
                yPos = 30;
            }
            doc.setFont("helvetica", "bold");
            doc.setFontSize(12);
            doc.text(title, margin, yPos);
            yPos += lineHeight;

            doc.setFont("helvetica", "normal");
            doc.setFontSize(10);

            const splitContent = doc.splitTextToSize(content, pageWidth - (margin * 2));
            doc.text(splitContent, margin, yPos);
            yPos += (splitContent.length * 5) + 5; // 5 is approx line height for 10pt font
        };

        // Resolve Localized Variables
        const deliveryLabel = labels.speeds[request.deliverySpeed] || request.deliverySpeed;
        const designLabel = request.designType === DesignType.CUSTOM ?
            (lang === Language.TR ? 'Özel Tasarım' : 'Custom Design') :
            (lang === Language.TR ? 'Hazır Tema' : 'Template Theme');

        const customerText = request.customerName || "................................................";

        // --- TURKISH CONTRACT CONTENT ---
        if (lang === Language.TR) {
            addSection(`1. ${t.parties}`,
                `Hizmet Veren (Ajans): Ömer Yiğitler (Bundan sonra "Ajans" olarak anılacaktır).\n` +
                `Hizmet Alan (Müşteri): ${customerText} (Bundan sonra "Müşteri" olarak anılacaktır).`
            );

            addSection(`2. ${t.serviceDef}`,
                `İşbu sözleşme, Ajans'ın Müşteri'ye ait web sitesinin tasarlanması, kodlanması, yayınlanması ve ilgili bakım hizmetlerini kapsar. ` +
                `Proje kapsamı, Müşteri tarafından onaylanan teklif formunda belirtilen detaylarla (Sayfa sayısı: ${request.pageCount}, Tasarım Tipi: ${designLabel}) sınırlıdır.`
            );

            addSection(`3. ${t.delivery}`,
                `Proje teslim süresi, tüm materyallerin (logo, metin, görsel vb.) Müşteri tarafından Ajans'a teslim edilmesinden itibaren başlar. ` +
                `Öngörülen süre: ${deliveryLabel} planına uygundur. Mücbir sebepler (doğal afet, yasal engeller vb.) saklıdır.`
            );

            addSection(`4. ${t.price}`,
                `Toplam hizmet bedeli teklif formunda belirtilen tutardır. Ödemeler aksi kararlaştırılmadıkça:\n` +
                `- %50 İş başlangıcında avans.\n` +
                `- %50 Proje onaylanıp yayına alınmadan önce.\n` +
                `Ödemeler ${request.country === 'TR' ? 'TL' : 'EUR'} cinsinden fatura karşılığı yapılacaktır. Ödeme gecikmelerinde T.C. Merkez Bankası ticari temerrüt faizi uygulanır.`
            );

            if (request.discountValue > 0) {
                addSection(`${t.discountClauseTitle}`,
                    `Taraflar, bu proje için toplam sözleşme bedelinin ${fmt(breakdown.totalOneTime)} olduğu ve indirim uygulanarak net fiyatın ${fmt(breakdown.finalTotal)} olarak belirlendiğini kabul eder.`
                );
            }

            addSection(`5. ${t.revision}`,
                `Müşteri, ana tasarım şablonu üzerinde onay verdikten sonra, içerik yerleşimi konusunda pakete dahil olarak 2 (iki) tur revizyon hakkına sahiptir. ` +
                `Tasarımın tamamen değiştirilmesi veya kodlama yapısı değişikliği gerektiren talepler ek ücretlendirilir.`
            );

            addSection(`6. ${t.ip}`,
                `5846 sayılı Fikir ve Sanat Eserleri Kanunu uyarınca; proje bedelinin tamamı ödendiğinde, web sitesinin tasarımı ve varsa özel yazılımın kullanım hakları Müşteri'ye devredilir. ` +
                `Ajans, projeyi kendi portfolyosunda referans olarak kullanma hakkını saklı tutar.`
            );

            addSection(`7. ${t.confidentiality}`,
                `Taraflar, proje sürecinde edindikleri birbirlerine ait ticari sırları, müşteri bilgilerini ve teknik verileri (KVKK kapsamındaki kişisel veriler dahil) yasal zorunluluklar dışında üçüncü şahıslarla paylaşmamayı taahhüt eder.`
            );

            addSection(`8. ${t.cancellation}`,
                `Müşteri projeyi tek taraflı iptal ederse, o ana kadar yapılan çalışmaların bedeli hesaplanır. Başlangıç avansı iade edilmez. ` +
                `Ajans taahhütlerini yerine getirmezse (mücbir sebepler hariç), avansı iade etmekle yükümlüdür.`
            );

            addSection(`9. ${t.warranty}`,
                `Teslimattan sonra 30 gün boyunca yazılımdan kaynaklı hatalar (bug) Ajans tarafından ücretsiz düzeltilir. ` +
                `Bu süre sonrasındaki bakım ve güncellemeler, seçilen Bakım Paketi (${request.maintenanceLevel}) kapsamında yürütülür.`
            );

            addSection(`10. ${t.dispute}`,
                `İşbu sözleşmeden doğacak ihtilaflarda İstanbul Mahkemeleri ve İcra Daireleri yetkilidir. Sözleşme Türk Hukuku'na tabidir.`
            );
        }

        // --- ENGLISH CONTRACT CONTENT ---
        else {
            addSection(`1. ${t.parties}`,
                `Service Provider: Ömer Yiğitler (hereinafter referred to as the "Agency").\n` +
                `Client: ${customerText} (hereinafter referred to as the "Client").`
            );

            addSection(`2. ${t.serviceDef}`,
                `This Agreement covers the design, development, deployment, and related maintenance services of the Client's website by the Agency. ` +
                `The scope is strictly limited to the details specified in the proposal form approved by the Client (Page Count: ${request.pageCount}, Design Type: ${designLabel}).`
            );

            addSection(`3. ${t.delivery}`,
                `The project delivery timeline commences once all necessary materials (logo, text, images, etc.) are provided by the Client to the Agency. ` +
                `The estimated duration aligns with the ${deliveryLabel} plan. Force Majeure events are excluded.`
            );

            addSection(`4. ${t.price}`,
                `The total service fee is the amount specified in the proposal. Unless agreed otherwise:\n` +
                `- 50% Upfront deposit upon commencement.\n` +
                `- 50% Final payment before the project goes live.\n` +
                `Payments shall be made in ${request.country === 'TR' ? 'TL' : 'EUR'}.`
            );

            if (request.discountValue > 0) {
                addSection(`${t.discountClauseTitle}`,
                    `The parties agree that the total contract amount is ${fmt(breakdown.totalOneTime)}, and a special discount has been applied resulting in a net price of ${fmt(breakdown.finalTotal)}.`
                );
            }

            addSection(`5. ${t.revision}`,
                `Upon approval of the main design template, the Client is entitled to 2 (two) rounds of revisions regarding content placement included in the package. ` +
                `Requests requiring a complete design overhaul or structural coding changes will incur additional fees.`
            );

            addSection(`6. ${t.ip}`,
                `Upon full payment of the project fees, the intellectual property rights for the website design and any custom code are transferred to the Client. ` +
                `The Agency retains the right to use the project as a reference in its portfolio. This transfer is subject to the provisions of the Copyright Act (Chapter 415 of the Laws of Malta).`
            );

            addSection(`7. ${t.confidentiality} & GDPR`,
                `Both parties agree to keep all commercial secrets, client data, and technical information confidential. ` +
                `The Agency agrees to process any personal data in accordance with the General Data Protection Regulation (GDPR) and the Data Protection Act of Malta.`
            );

            addSection(`8. ${t.cancellation}`,
                `If the Client cancels the project unilaterally, the fee for work completed up to that point shall be calculated. The initial deposit is non-refundable. ` +
                `If the Agency fails to fulfill its obligations (excluding Force Majeure), the deposit shall be refunded.`
            );

            addSection(`9. ${t.warranty}`,
                `Any software bugs identified within 30 days after delivery will be fixed by the Agency free of charge. ` +
                `Maintenance and updates after this period are subject to the selected Maintenance Package (${request.maintenanceLevel}).`
            );

            addSection(`10. ${t.dispute}`,
                `This Agreement shall be governed by and construed in accordance with the Laws of Malta. ` +
                `Any disputes arising out of or in connection with this Agreement shall be subject to the exclusive jurisdiction of the Courts of Malta.`
            );
        }

        // Signatures
        doc.addPage();
        yPos = 40;

        doc.setFont("helvetica", "bold");
        doc.text(common.agencySign, margin, yPos);
        doc.text(common.clientSign, pageWidth - margin - 50, yPos, { align: 'right' });

        doc.line(margin, yPos + 15, margin + 60, yPos + 15);
        doc.line(pageWidth - margin - 60, yPos + 15, pageWidth - margin, yPos + 15);
    }

    return doc.output('blob');
};

// Backwards compatibility wrapper (if needed, but we'll update App.tsx)
export const captureToPDF = async (elementId: string, fileName: string): Promise<Blob | null> => {
    console.warn("captureToPDF is deprecated. Use generateNativePDF.");
    return null;
};
