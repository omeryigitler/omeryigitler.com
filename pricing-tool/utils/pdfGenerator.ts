
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { QuoteRequest, CostBreakdown, PricingRules, Country, Language, AddonService, DeliverySpeed } from '../types';

// Helper to format currency
const formatPrice = (amount: number, currencySymbol: string, language: Language) => {
    const locale = language === Language.TR ? 'tr-TR' : 'en-GB';
    return `${amount.toLocaleString(locale, { maximumFractionDigits: 0 })} ${currencySymbol}`;
};

export const generateQuotePDF = (
    request: QuoteRequest,
    breakdown: CostBreakdown,
    config: Record<Country, PricingRules>,
    addons: AddonService[],
    language: Language,
    download: boolean = true
): Blob | void => {
    const doc = new jsPDF();
    const rules = config[request.country];
    const currencySymbol = rules.currencySymbol;

    // -- HEADER --
    doc.setFontSize(22);
    doc.setTextColor(0, 0, 0);
    doc.text('AGENCY PRICE PROPOSAL', 14, 20);

    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 14, 28);
    doc.text(`Client: ${request.customerName || 'Valued Client'}`, 14, 33);
    doc.text(`Project Type: ${request.siteType}`, 14, 38);

    // -- RIGHT HEADER (Agency Info) --
    const pageWidth = doc.internal.pageSize.getWidth();
    doc.text('Ömer Yiğitler Agency', pageWidth - 14, 20, { align: 'right' });
    doc.text('www.omeryigitler.com', pageWidth - 14, 25, { align: 'right' });

    // -- TABLE DATA PREP --
    const tableRows = [];

    // 1. Base Project
    tableRows.push(['Base Development', formatPrice(breakdown.base, currencySymbol, language)]);
    tableRows.push([`Extra Pages (${request.pageCount})`, formatPrice(breakdown.pages, currencySymbol, language)]);

    // 2. Technical & Design Extras
    if (breakdown.design > 0) tableRows.push(['Custom Design', formatPrice(breakdown.design, currencySymbol, language)]);
    if (breakdown.seo > 0) tableRows.push(['Advanced SEO', formatPrice(breakdown.seo, currencySymbol, language)]);
    if (breakdown.multiLang > 0) tableRows.push(['Multi-Language Support', formatPrice(breakdown.multiLang, currencySymbol, language)]);
    if (breakdown.graphics > 0) tableRows.push(['Graphic Design Pack', formatPrice(breakdown.graphics, currencySymbol, language)]);
    if (breakdown.ux > 0) tableRows.push(['UX Optimization', formatPrice(breakdown.ux, currencySymbol, language)]);
    if (breakdown.crm > 0) tableRows.push(['CRM Integration', formatPrice(breakdown.crm, currencySymbol, language)]);

    // 3. Add-ons
    if (request.selectedAddons && request.selectedAddons.length > 0) {
        request.selectedAddons.forEach(id => {
            const addon = addons.find(a => a.id === id);
            if (addon) {
                const price = request.country === Country.TR ? addon.priceTR.value : addon.priceMT.value;
                tableRows.push([`Add-on: ${addon.label}`, formatPrice(price, currencySymbol, language)]);
            }
        });
    }

    // 4. Speed
    if (breakdown.speed > 0) {
        tableRows.push([`Priority Delivery (${request.deliverySpeed})`, formatPrice(breakdown.speed, currencySymbol, language)]);
    }

    // Subtotal
    tableRows.push([{ content: 'Subtotal', styles: { fontStyle: 'bold' } }, { content: formatPrice(breakdown.subtotal + breakdown.speed, currencySymbol, language), styles: { fontStyle: 'bold' } }]);


    // Discount
    if (breakdown.discountAmount > 0) {
        tableRows.push([{ content: 'Discount', styles: { textColor: [220, 38, 38] } }, { content: `-${formatPrice(breakdown.discountAmount, currencySymbol, language)}`, styles: { textColor: [220, 38, 38] } }]);
    }

    // Final Total
    tableRows.push([{ content: 'TOTAL PROJECT COST', styles: { fillColor: [255, 215, 0], textColor: [0, 0, 0], fontStyle: 'bold', fontSize: 12 } }, { content: formatPrice(breakdown.finalTotal, currencySymbol, language), styles: { fillColor: [255, 215, 0], textColor: [0, 0, 0], fontStyle: 'bold', fontSize: 12 } }]);

    // -- RENDER TABLE --
    // @ts-ignore
    autoTable(doc, {
        startY: 50,
        head: [['Description', 'Amount']],
        body: tableRows,
        theme: 'grid',
        headStyles: { fillColor: [20, 20, 20], textColor: [255, 255, 255] },
        columnStyles: {
            0: { cellWidth: 'auto' },
            1: { cellWidth: 50, halign: 'right' },
        }
    });

    // -- MONTHLY SECTION --
    let finalY = (doc as any).lastAutoTable.finalY + 15;

    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text('Recurring Costs', 14, finalY);

    // @ts-ignore
    autoTable(doc, {
        startY: finalY + 5,
        body: [
            ['Maintenance Level', request.maintenanceLevel],
            ['Monthly Cost', formatPrice(breakdown.totalMonthly, currencySymbol, language)]
        ],
        theme: 'plain',
        columnStyles: {
            0: { fontStyle: 'bold', cellWidth: 50 },
            1: { halign: 'left' }
        }
    });

    // Output
    if (download) {
        const fileName = `Quote_${request.customerName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
        doc.save(fileName);
    } else {
        return doc.output('blob');
    }
};


export const generateContractPDF = (
    request: QuoteRequest,
    breakdown: CostBreakdown,
    config: Record<Country, PricingRules>,
    language: Language,
    download: boolean = true
): Blob | void => {
    const doc = new jsPDF();
    const rules = config[request.country];
    const currencySymbol = rules.currencySymbol;

    // -- TITLE --
    doc.setFontSize(18);
    doc.text('WEB DEVELOPMENT SERVICE RESERVATION', 105, 20, { align: 'center' });

    doc.setFontSize(10);
    doc.text('This document confirms the preliminary pricing and scope reservation.', 105, 28, { align: 'center' });

    // -- INFO GRID --
    doc.setDrawColor(200, 200, 200);
    doc.rect(14, 40, 182, 35);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('SERVICE PROVIDER', 16, 46);
    doc.text('CLIENT', 110, 46);

    doc.setFont('helvetica', 'normal');
    doc.text('Ömer Yiğitler Agency', 16, 52);
    doc.text('Istanbul / Turkey', 16, 57);
    doc.text('contact@omeryigitler.com', 16, 62);

    doc.text(request.customerName || '__________________________', 110, 52);
    doc.text('Date: ' + new Date().toLocaleDateString(), 110, 57);

    // -- SCOPE --
    doc.setFont('helvetica', 'bold');
    doc.text('PROJECT SCOPE SUMMARY', 14, 85);

    const scopeText = `
  Project Type: ${request.siteType}
  Design: ${request.designType}
  Page Count: ${request.pageCount}
  Delivery: ${request.deliverySpeed} (${rules.speedMultipliers[request.deliverySpeed as DeliverySpeed]}x Multiplier)
  Maintenance: ${request.maintenanceLevel}
  Includes: ${request.hasSeo ? 'SEO, ' : ''}${request.isMultiLang ? 'Multi-Lang, ' : ''}${request.hasGraphics ? 'Graphics, ' : ''}${request.hasUx ? 'UX, ' : ''}${request.hasCrm ? 'CRM, ' : ''}
  `;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(scopeText, 14, 90);

    // -- FINANCIALS --
    doc.setFont('helvetica', 'bold');
    doc.text('AGREED PRICING', 14, 130);

    // @ts-ignore
    autoTable(doc, {
        startY: 135,
        head: [['Item', 'Amount']],
        body: [
            ['One-Time Project Cost', formatPrice(breakdown.finalTotal, currencySymbol, language)],
            ['Monthly Maintenance', formatPrice(breakdown.totalMonthly, currencySymbol, language)],
            ['Payment Terms', '50% Upfront, 50% Upon Completion']
        ],
        theme: 'grid',
        headStyles: { fillColor: [66, 66, 66] }
    });

    // -- SIGNATURES --
    const finalY = (doc as any).lastAutoTable.finalY + 30;

    doc.line(14, finalY, 80, finalY); // Left line
    doc.line(120, finalY, 186, finalY); // Right line

    doc.text('Agency Representative', 14, finalY + 5);
    doc.text('Client Representative', 120, finalY + 5);

    // Output
    if (download) {
        const fileName = `Contract_${request.customerName.replace(/\s+/g, '_')}.pdf`;
        doc.save(fileName);
    } else {
        return doc.output('blob');
    }
};
