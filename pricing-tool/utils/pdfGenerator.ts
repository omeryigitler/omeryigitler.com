import jsPDF from 'jspdf';
import { QuoteRequest, CostBreakdown, Country } from '../types';

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

    // 6. Contract Terms (Only for Contracts)
    if (type === 'contract') {
        doc.addPage();

        doc.setFont("helvetica", "bold");
        doc.setFontSize(16);
        doc.text("SERVICE AGREEMENT TERMS", pageWidth / 2, 25, { align: 'center' });

        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);

        const terms = `
1. AUTHORIZATION
The Client ensures that they have the right to use all materials (text, images, media) provided for the project.

2. PROJECT SCOPE
The services provided are strictly limited to the items listed in the "Financial Breakdown". Any additional work will require a separate quotation.

3. PAYMENT AND TERMS
A 50% non-refundable deposit is required to commence work. The remaining balance is due upon project completion, prior to final deployment.

4. INTELLECTUAL PROPERTY
Upon full payment, the Client gets full ownership of the developed website code and design. Third-party licenses (fonts, plugins) remain under their respective licenses.

5. REVIEW AND TESTING
There will be a review phase where the Client can request minor revisions. Major structural changes after approval may incur additional costs.

6. CONFIDENTIALITY
Both parties agree to keep all proprietary information confidential and not to disclose it to third parties without prior consent.

7. WARRANTY
We provide a 30-day warranty period after deployment to fix any bugs or issues related to the scope of work.
        `;

        const splitTerms = doc.splitTextToSize(terms, pageWidth - (margin * 2));
        doc.text(splitTerms, margin, 45);

        // Signatures
        const signY = 240;
        doc.line(margin, signY, margin + 70, signY);
        doc.text("Authorized Signature", margin, signY + 5);
        doc.text(new Date().toLocaleDateString(), margin, signY + 10);

        doc.line(pageWidth - margin - 70, signY, pageWidth - margin, signY);
        doc.text("Client Signature", pageWidth - margin - 70, signY + 5);
        doc.text(request.customerName || '', pageWidth - margin - 70, signY + 10);
    }

    return doc.output('blob');
};

// Backwards compatibility wrapper (if needed, but we'll update App.tsx)
export const captureToPDF = async (elementId: string, fileName: string): Promise<Blob | null> => {
    console.warn("captureToPDF is deprecated. Use generateNativePDF.");
    return null;
};
