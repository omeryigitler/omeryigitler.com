

import React from 'react';
import { QuoteRequest, PricingRules, Country, Language, DiscountType, PricingFactorType, PricingFactor, CostBreakdown, DesignType, AddonService } from '../types';
import { TRANSLATIONS } from '../translations';
import { ArrowLeft, Printer } from 'lucide-react';
import { generateContractPDF, generateQuotePDF } from '../utils/pdfGenerator';

interface Props {
  config: Record<Country, PricingRules>;
  request: QuoteRequest;
  onBack: () => void;
  language: Language;
  breakdown: CostBreakdown | null;
  addons: AddonService[];
}

const ContractView: React.FC<Props> = ({ config, request, onBack, language, breakdown, addons }) => {
  const rules = config[request.country];
  const t = TRANSLATIONS[language].contract;
  const common = TRANSLATIONS[language].common;
  const t_calc = TRANSLATIONS[language].calc;
  const labels = TRANSLATIONS[language].labels;

  // STRICT TDK FORMATTING HELPER
  const fmt = (val: number) => {
    if (request.country === Country.TR) {
      // TR: 10.000 ₺
      return `${Math.round(val).toLocaleString('tr-TR', { maximumFractionDigits: 0 })} ${rules.currencySymbol}`;
    } else {
      // MT: €1,000
      return `${rules.currencySymbol}${Math.round(val).toLocaleString('en-GB', { maximumFractionDigits: 0 })}`;
    }
  };

  // Helper to calculate flexible costs
  const calcFactor = (base: number, factor: PricingFactor) => {
    return factor.type === PricingFactorType.PERCENTAGE ? base * (factor.value / 100) : factor.value;
  };

  // Calculate percentage or fixed amount string for contract clause
  const getDiscountPhrase = () => {
    // PERCENTAGE
    if (request.discountType === DiscountType.PERCENTAGE) {
      let percentVal = request.discountValue;
      if (language === Language.TR) {
        return `%${percentVal.toLocaleString('tr-TR', { maximumFractionDigits: 1 })} oranında`;
      } else {
        return `${percentVal.toLocaleString('en-GB', { maximumFractionDigits: 1 })}%`;
      }
    }
    // FIXED
    else {
      // Show the formatted fixed amount
      const amount = fmt(request.discountValue);
      if (language === Language.TR) {
        return `${amount} tutarında`;
      } else {
        return `${amount}`;
      }
    }
  };

  // Resolve localized labels for enums
  const designLabel = request.designType === DesignType.CUSTOM ? t_calc.custom : t_calc.template;
  const deliveryLabel = labels.speeds[request.deliverySpeed];

  const renderTurkishContract = () => (
    <div className="space-y-6">
      <section>
        <h3 className="font-bold text-lg mb-2 font-poppins text-black">1. {t.parties}</h3>
        <p>
          <strong>Hizmet Veren (Ajans):</strong> Ömer Yiğitler (Bundan sonra "Ajans" olarak anılacaktır).<br />
          <strong>Hizmet Alan (Müşteri):</strong> {request.customerName || "................................................"} (Bundan sonra "Müşteri" olarak anılacaktır).
        </p>
      </section>

      <section>
        <h3 className="font-bold text-lg mb-2 font-poppins text-black">2. {t.serviceDef}</h3>
        <p>
          İşbu sözleşme, Ajans'ın Müşteri'ye ait web sitesinin tasarlanması, kodlanması, yayınlanması ve ilgili bakım hizmetlerini kapsar. Proje kapsamı, Müşteri tarafından onaylanan teklif formunda belirtilen detaylarla (Sayfa sayısı: {request.pageCount}, Tasarım Tipi: {designLabel}) sınırlıdır.
        </p>
      </section>

      <section>
        <h3 className="font-bold text-lg mb-2 font-poppins text-black">3. {t.delivery}</h3>
        <p>
          Proje teslim süresi, tüm materyallerin (logo, metin, görsel vb.) Müşteri tarafından Ajans'a teslim edilmesinden itibaren başlar.
          Öngörülen süre: <strong>{deliveryLabel}</strong> planına uygundur. Mücbir sebepler (doğal afet, yasal engeller vb.) saklıdır.
        </p>
      </section>

      <section>
        <h3 className="font-bold text-lg mb-2 font-poppins text-black">4. {t.price}</h3>
        <p>
          Toplam hizmet bedeli teklif formunda belirtilen tutardır. Ödemeler aksi kararlaştırılmadıkça:
          <br />- %50 İş başlangıcında avans.
          <br />- %50 Proje onaylanıp yayına alınmadan önce.
          <br />Ödemeler {rules.currency} cinsinden fatura karşılığı yapılacaktır. Ödeme gecikmelerinde T.C. Merkez Bankası ticari temerrüt faizi uygulanır.
        </p>

        {/* SPECIAL DISCOUNT CLAUSE - TR */}
        {request.discountValue > 0 && breakdown && (
          <div className="mt-4 p-4 bg-zinc-100 border-l-4 border-black rounded-r-lg">
            <h4 className="font-bold text-black mb-1">{t.discountClauseTitle}</h4>
            <p className="text-zinc-700 italic">
              {t.discountClauseText
                .replace('{ORIGINAL}', fmt(breakdown.totalOneTime))
                .replace('{NET}', fmt(breakdown.finalTotal))
                .replace('{DISCOUNT_PHRASE}', getDiscountPhrase())
              }
            </p>
          </div>
        )}
      </section>

      <section>
        <h3 className="font-bold text-lg mb-2 font-poppins text-black">5. {t.revision}</h3>
        <p>
          Müşteri, ana tasarım şablonu üzerinde onay verdikten sonra, içerik yerleşimi konusunda pakete dahil olarak 2 (iki) tur revizyon hakkına sahiptir. Tasarımın tamamen değiştirilmesi veya kodlama yapısı değişikliği gerektiren talepler ek ücretlendirilir.
        </p>
      </section>

      <section>
        <h3 className="font-bold text-lg mb-2 font-poppins text-black">6. {t.ip}</h3>
        <p>
          5846 sayılı Fikir ve Sanat Eserleri Kanunu uyarınca; proje bedelinin tamamı ödendiğinde, web sitesinin tasarımı ve varsa özel yazılımın kullanım hakları Müşteri'ye devredilir. Ajans, projeyi kendi portfolyosunda referans olarak kullanma hakkını saklı tutar.
        </p>
      </section>

      <section>
        <h3 className="font-bold text-lg mb-2 font-poppins text-black">7. {t.confidentiality}</h3>
        <p>
          Taraflar, proje sürecinde edindikleri birbirlerine ait ticari sırları, müşteri bilgilerini ve teknik verileri (KVKK kapsamındaki kişisel veriler dahil) yasal zorunluluklar dışında üçüncü şahıslarla paylaşmamayı taahhüt eder.
        </p>
      </section>

      <section>
        <h3 className="font-bold text-lg mb-2 font-poppins text-black">8. {t.cancellation}</h3>
        <p>
          Müşteri projeyi tek taraflı iptal ederse, o ana kadar yapılan çalışmaların bedeli hesaplanır. Başlangıç avansı iade edilmez. Ajans taahhütlerini yerine getirmezse (mücbir sebepler hariç), avansı iade etmekle yükümlüdür.
        </p>
      </section>

      <section>
        <h3 className="font-bold text-lg mb-2 font-poppins text-black">9. {t.warranty}</h3>
        <p>
          Teslimattan sonra 30 gün boyunca yazılımdan kaynaklı hatalar (bug) Ajans tarafından ücretsiz düzeltilir. Bu süre sonrasındaki bakım ve güncellemeler, seçilen Bakım Paketi ({request.maintenanceLevel}) kapsamında yürütülür.
        </p>
      </section>

      <section>
        <h3 className="font-bold text-lg mb-2 font-poppins text-black">10. {t.dispute}</h3>
        <p>
          İşbu sözleşmeden doğacak ihtilaflarda <strong>İstanbul Mahkemeleri ve İcra Daireleri</strong> yetkilidir. Sözleşme Türk Hukuku'na tabidir.
        </p>
      </section>
    </div>
  );

  const renderEnglishContract = () => (
    <div className="space-y-6">
      <section>
        <h3 className="font-bold text-lg mb-2 font-poppins text-black">1. {t.parties}</h3>
        <p>
          <strong>Service Provider:</strong> Ömer Yiğitler (hereinafter referred to as the "Agency").<br />
          <strong>Client:</strong> {request.customerName || "................................................"} (hereinafter referred to as the "Client").
        </p>
      </section>

      <section>
        <h3 className="font-bold text-lg mb-2 font-poppins text-black">2. {t.serviceDef}</h3>
        <p>
          This Agreement covers the design, development, deployment, and related maintenance services of the Client's website by the Agency. The scope is strictly limited to the details specified in the proposal form approved by the Client (Page Count: {request.pageCount}, Design Type: {designLabel}).
        </p>
      </section>

      <section>
        <h3 className="font-bold text-lg mb-2 font-poppins text-black">3. {t.delivery}</h3>
        <p>
          The project delivery timeline commences once all necessary materials (logo, text, images, etc.) are provided by the Client to the Agency.
          The estimated duration aligns with the <strong>{deliveryLabel}</strong> plan. Force Majeure events are excluded.
        </p>
      </section>

      <section>
        <h3 className="font-bold text-lg mb-2 font-poppins text-black">4. {t.price}</h3>
        <p>
          The total service fee is the amount specified in the proposal. Unless agreed otherwise:
          <br />- 50% Upfront deposit upon commencement.
          <br />- 50% Final payment before the project goes live.
          <br />Payments shall be made in {rules.currency}.
        </p>

        {/* SPECIAL DISCOUNT CLAUSE - EN */}
        {request.discountValue > 0 && breakdown && (
          <div className="mt-4 p-4 bg-zinc-100 border-l-4 border-black rounded-r-lg">
            <h4 className="font-bold text-black mb-1">{t.discountClauseTitle}</h4>
            <p className="text-zinc-700 italic">
              {t.discountClauseText
                .replace('{ORIGINAL}', fmt(breakdown.totalOneTime))
                .replace('{NET}', fmt(breakdown.finalTotal))
                .replace('{DISCOUNT_PHRASE}', getDiscountPhrase())
              }
            </p>
          </div>
        )}
      </section>

      <section>
        <h3 className="font-bold text-lg mb-2 font-poppins text-black">5. {t.revision}</h3>
        <p>
          Upon approval of the main design template, the Client is entitled to 2 (two) rounds of revisions regarding content placement included in the package. Requests requiring a complete design overhaul or structural coding changes will incur additional fees.
        </p>
      </section>

      <section>
        <h3 className="font-bold text-lg mb-2 font-poppins text-black">6. {t.ip}</h3>
        <p>
          Upon full payment of the project fees, the intellectual property rights for the website design and any custom code are transferred to the Client. The Agency retains the right to use the project as a reference in its portfolio. This transfer is subject to the provisions of the <strong>Copyright Act (Chapter 415 of the Laws of Malta)</strong>.
        </p>
      </section>

      <section>
        <h3 className="font-bold text-lg mb-2 font-poppins text-black">7. {t.confidentiality} & GDPR</h3>
        <p>
          Both parties agree to keep all commercial secrets, client data, and technical information confidential. The Agency agrees to process any personal data in accordance with the <strong>General Data Protection Regulation (GDPR)</strong> and the Data Protection Act of Malta.
        </p>
      </section>

      <section>
        <h3 className="font-bold text-lg mb-2 font-poppins text-black">8. {t.cancellation}</h3>
        <p>
          If the Client cancels the project unilaterally, the fee for work completed up to that point shall be calculated. The initial deposit is non-refundable. If the Agency fails to fulfill its obligations (excluding Force Majeure), the deposit shall be refunded.
        </p>
      </section>

      <section>
        <h3 className="font-bold text-lg mb-2 font-poppins text-black">9. {t.warranty}</h3>
        <p>
          Any software bugs identified within 30 days after delivery will be fixed by the Agency free of charge. Maintenance and updates after this period are subject to the selected Maintenance Package ({request.maintenanceLevel}).
        </p>
      </section>

      <section>
        <h3 className="font-bold text-lg mb-2 font-poppins text-black">10. {t.dispute}</h3>
        <p>
          This Agreement shall be governed by and construed in accordance with the <strong>Laws of Malta</strong>. Any disputes arising out of or in connection with this Agreement shall be subject to the exclusive jurisdiction of the <strong>Courts of Malta</strong>.
        </p>
      </section>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="mb-6 flex justify-between items-center no-print">
        <button onClick={onBack} className="flex items-center text-zinc-400 hover:text-white font-medium transition-colors">
          <ArrowLeft className="w-4 h-4 mr-2" />
          {common.back}
        </button>
        <div className="flex space-x-3">
          <button
            onClick={() => window.print()}
            className="flex items-center bg-zinc-800 text-white border border-zinc-700 px-6 py-3 rounded-xl font-bold hover:bg-zinc-700 transition-colors"
          >
            <Printer className="w-4 h-4 mr-2" />
            {common.print}
          </button>

          <button
            onClick={async () => {
              // Send final payload to Admin Panel
              if (breakdown) {
                // Generate PDFs as Blobs
                const quoteBlob = generateQuotePDF(request, breakdown, config, addons, language, false) as Blob;
                const contractBlob = generateContractPDF(request, breakdown, config, language, false) as Blob;

                // Async helper to read blob
                const blobToBase64 = (blob: Blob): Promise<string> => {
                  return new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result as string);
                    reader.onerror = reject;
                    reader.readAsDataURL(blob);
                  });
                };

                try {
                  const [quoteBase64, contractBase64] = await Promise.all([
                    blobToBase64(quoteBlob),
                    blobToBase64(contractBlob)
                  ]);

                  window.parent.postMessage({
                    type: 'SAVE_QUOTE_FULL',
                    payload: {
                      request: request,
                      breakdown: breakdown,
                      total: breakdown.finalTotal,
                      status: 'contract_generated',
                      quotePdf: quoteBase64,
                      contractPdf: contractBase64
                    }
                  }, '*');

                  // Optional visual feedback
                  alert(language === Language.TR ? 'Proje kaydedildi ve PDF dosyaları oluşturuldu!' : 'Project saved and PDFs generated!');
                } catch (e) {
                  console.error("PDF Generation Error", e);
                  alert("Error generating PDF files");
                }
              }
            }}
            className="flex items-center bg-[#FFD700] text-black px-6 py-3 rounded-xl font-bold hover:bg-[#FFD700] transition-colors shadow-lg shadow-taurusGold/20"
          >
            {language === Language.TR ? 'Projeyi Kaydet & Bitir' : 'Save & Finalize Project'}
          </button>
        </div>
      </div>

      <div className="bg-white shadow-xl p-12 text-justify leading-relaxed text-zinc-800 text-sm sm:text-base print:shadow-none print:p-0">
        <h1 className="text-2xl font-bold text-center mb-8 uppercase font-poppins text-black">{t.title}</h1>

        {language === Language.TR ? renderTurkishContract() : renderEnglishContract()}

        <div className="mt-16 grid grid-cols-2 gap-16">
          <div>
            <p className="font-bold mb-8 text-black">{common.agencySign}</p>
            <div className="h-0 border-b border-zinc-900 w-3/4"></div>
          </div>
          <div>
            <p className="font-bold mb-8 text-black">{common.clientSign}</p>
            <div className="h-0 border-b border-zinc-900 w-3/4"></div>
          </div>
        </div>
      </div>
      <div className="mt-8 text-center text-zinc-500 text-xs no-print">
        {language === Language.TR
          ? "* 'Projeyi Kaydet & Bitir' butonuna tıkladığınızda tüm müşteri ve fiyat bilgileri ana yönetim paneline aktarılacaktır."
          : "* Clicking 'Save & Finalize Project' will transfer all client and pricing data to the main admin panel."}
      </div>
    </div>
  );
};

export default ContractView;
