import { GoogleGenAI } from "@google/genai";

const getAIClient = () => {
  // Try environment first, then fallback to a default key to ensure it "just works"
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY || 'AIzaSyDlH6dieznFWfZtLSL4tHcfV6bgiJoVA6M';
  return new GoogleGenAI({ apiKey });
};

export const generatePlan = async (age: number, weight: number, height: number, injuries: string, goal: string, lang: string = 'tr') => {
  const ai = getAIClient();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: [{
        role: 'user',
        parts: [{
          text: `Profesyonel bir fitness koçu ve biyomekanik uzmanı olarak, aşağıdaki verilere sahip bir birey için kapsamlı bir hipertrofi (kas geliştirme) planı tasarla:
- Yaş: ${age}
- Kilo: ${weight}kg
- Boy: ${height}cm
- Sakatlıklar/Kısıtlamalar: ${injuries || 'Yok'}
- Ana Hedef: ${goal}
- DİL: ${lang === 'tr' ? 'Türkçe' : 'English'}

ÖNEMLİ FORMAT VE DİL KURALLARI:
1. Görsel stil "High-Tech / Cyberpunk" olmalı. Metinlerin başında her zaman '/>' sembolünü kullan.
2. Yazılım/Kodlama terimlerini (Kernel, Module, Logic, Error Handling) ana başlıklar dışında KULLANMA. Daha çok profesyonel spor, anatomi ve antrenman bilimi terminolojisine odaklan. 
3. İnsanlar bunu bir hata mesajı gibi değil, ultra modern bir spor analiz raporu olarak okumalı.

Yanıtı şu başlıklarla yapılandır:
1. ANALİZ: MEVCUT_DURUM (Bireyin fiziksel kapasitesinin ve kısıtlamalarının profesyonel değerlendirmesi)
2. PROTOKOL: ANTRENMAN_PROGRAMI (Sakatlıkları dikkate alan, set/tekrar içeren detaylı egzersiz planı)
3. STRATEJİ: BESLENME_VE_TAKVİYE (Kalori, makrolar ve gelişim için gereken yakıt planı)
4. KORUMA: REHABİLİTASYON_VE_TOPARLANMA (Sakatlık önleme, omuz stabilitesi ve uyku protokolleri)
5. TAKVİM: HAFTALIK_DÖNGÜ (Antrenman günlerinin haftalık dağılımı)

Temiz, profesyonel markdown formatında yaz. Teknik terimler gerektiğinde İngilizce kalabilir ama ana açıklamalar mutlaka ${lang === 'tr' ? 'Türkçe' : 'English'} olsun.`
        }]
      }],
    });

    // The new SDK property getter handles text extraction
    return response.text;
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    if (error.message?.includes('404')) {
      throw new Error("Model not found. Please verify the Gemini model name.");
    }
    throw error;
  }
};
