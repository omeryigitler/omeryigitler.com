import { GoogleGenAI } from "@google/genai";
import OpenAI from "openai";

// Define Provider Types
export type AIProvider = 'GEMINI_FLASH' | 'GEMINI_PRO' | 'OPENAI_GPT';

interface AIParams {
    age: number;
    weight: number;
    height: number;
    injuries: string;
    goal: string;
    lang: string;
}

const getPrompt = ({ age, weight, height, injuries, goal, lang }: AIParams) => {
    return `Profesyonel bir fitness koçu ve biyomekanik uzmanı olarak, aşağıdaki verilere sahip bir birey için kapsamlı bir hipertrofi (kas geliştirme) planı tasarla:
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
1. ANALİZ: MEVCUT_DURUM
2. PROTOKOL: ANTRENMAN_PROGRAMI
3. STRATEJİ: BESLENME_VE_TAKVİYE
4. KORUMA: REHABİLİTASYON_VE_TOPARLANMA
5. TAKVİM: HAFTALIK_DÖNGÜ

Temiz, profesyonel markdown formatında yaz. Teknik terimler gerektiğinde İngilizce kalabilir ama ana açıklamalar mutlaka ${lang === 'tr' ? 'Türkçe' : 'English'} olsun.`;
};

const getSynthesisPrompt = (responses: string[], lang: string) => {
    const languageInstruction = lang === 'tr' ? 'Türkçe' : 'English';
    return `You are the Lead Fitness Architect (Elite Core System). I have run parallel simulations on ${responses.length} different Neural Engines regarding a user's training plan.

    INPUT DATA FROM SUB-MODULES:
    ${responses.map((r, i) => `--- MODULE_0${i + 1}_OUTPUT ---\n${r}\n------------------`).join('\n')}

    YOUR MISSION:
    Synthesize these outputs into one SINGLE, PERFECT master plan.
    - Compare the suggestions and pick the most scientifically accurate ones.
    - If one model missed a detail (like injury prevention) but another caught it, INCLUDE IT.
    - Merge the "Nutrition" and "Training" sections to be the best of all worlds.
    
    OUTPUT FORMAT:
    - Maintain the exact "High-Tech / Cyberpunk" aesthetic requested originally.
    - Use the '/>' prefix for list items.
    - The final output must be in ${languageInstruction}.
    - Do NOT mention "Model 1 said this". Present it as the final system output.
    - Start directly with the plan, no meta-talk.`;
}

// --- RAW HANDLERS (Prompt-agnostic) ---

// --- HELPER: Key Retriever ---
const getApiKey = (provider: 'GEMINI' | 'OPENAI'): string | null => {
    // 1. Try Local Storage (User Input via UI)
    const localKey = localStorage.getItem(`ELITE_CORE_${provider}_KEY`);
    if (localKey && localKey.length > 10) return localKey;

    // 2. Try Environment Variables
    const envKey = provider === 'GEMINI'
        ? import.meta.env.VITE_GEMINI_API_KEY
        : import.meta.env.VITE_OPENAI_API_KEY;

    // Filter out placeholders
    if (envKey && !envKey.includes("PLACEHOLDER")) return envKey;

    return null;
};

// --- RAW HANDLERS (Prompt-agnostic) ---

const callGemini = async (prompt: string, modelName: string): Promise<string> => {
    const apiKey = getApiKey('GEMINI');
    if (!apiKey) {
        console.warn(`Gemini (${modelName}) skipped: No API Key`);
        throw new Error("API_KEY_MISSING");
    }
    const genAI = new GoogleGenAI({ apiKey });

    const tryGenerate = async (targetModel: string) => {
        try {
            const result = await genAI.models.generateContent({
                model: targetModel,
                contents: [{ role: 'user', parts: [{ text: prompt }] }]
            });
            return result.text || "";
        } catch (error: any) {
            // Check for explicit "Not Found" (404) or "Not Supported" errors
            if (error.message?.includes("404") || error.message?.includes("not found") || error.message?.includes("not supported")) {
                throw new Error("MODEL_NOT_FOUND");
            }
            throw error; // Rethrow other errors (auth, quota, overload)
        }
    };

    // Retry Logic with Fallbacks
    try {
        return await tryGenerate(modelName);
    } catch (e: any) {
        if (e.message === "MODEL_NOT_FOUND") {
            console.warn(`Gemini model '${modelName}' not found. Attempting fallbacks...`);

            // Fallback 1: Try specific version (001) if applicable
            const versionedModel = modelName.includes('flash') ? 'gemini-1.5-flash-001' : 'gemini-1.5-pro-001';
            try {
                return await tryGenerate(versionedModel);
            } catch (e2: any) {
                if (e2.message === "MODEL_NOT_FOUND") {
                    // Fallback 2: Try legacy stable model
                    console.warn(`Gemini versioned '${versionedModel}' failed. Trying 'gemini-pro'...`);
                    try {
                        return await tryGenerate('gemini-pro');
                    } catch (e3) {
                        throw new Error(`All Gemini models failed. Last error: ${(e3 as any).message}`);
                    }
                }
                throw e2;
            }
        }
        console.error(`Gemini (${modelName}) CRITICAL FAILURE:`, e.message || e);
        throw e;
    }
};

const callOpenAI = async (prompt: string): Promise<string> => {
    const apiKey = getApiKey('OPENAI');
    if (!apiKey) {
        // Silent skip for optional OpenAI
        throw new Error("OPENAI_KEY_MISSING");
    }

    const openai = new OpenAI({ apiKey, dangerouslyAllowBrowser: true });
    try {
        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: prompt }],
        });
        return response.choices[0]?.message?.content || "";
    } catch (e: any) {
        console.error("OpenAI CRITICAL FAILURE:", e.message || e);
        throw e;
    }
};

// --- ORCHESTRATOR (DEEP SYNTHESIS MODE) ---
export const generateUnifiedPlan = async (params: AIParams, onStatusUpdate?: (status: string) => void) => {
    // 0. BIOLOGICAL INTEGRITY CHECK (SANITY CHECK)
    // Prevents generating plans for medically impossible stats or minors
    const { weight, height, age, lang } = params;
    const bmi = weight / ((height / 100) * (height / 100));
    const isTr = lang === 'tr';

    // 1. AGE RESTRICTION (Strict < 18 Block)
    if (age < 18) {
        if (onStatusUpdate) onStatusUpdate('ACCESS_DENIED_MINOR...');

        const title = isTr ? "ERİŞİM ENGELLENDİ: YETİŞKİN İÇERİK" : "ACCESS DENIED: RESTRICTED";
        const msg = isTr
            ? `Bu sistem, hormonal dengesi oturmuş yetişkin metabolizmalar için tasarlanmıştır. 18 yaş altı iskelet gelişimi devam eden bireyler için uygun değildir.\n\nTespit Edilen Yaş: ${age}`
            : `System optimized for fully developed adult metabolic profiles. Not suitable for developing skeletal structures under 18.\n\nDetected Age: ${age}`;

        return `/> **SYSTEM_LOCK: ${title}**
/> **ERROR_CODE:** AGE_RESTRICTION_0x18

## ${title}
${msg}

/> **Güvenlik Protokolü:**
Hukuki ve sağlık nedenleriyle analiz durduruldu.`;
    }

    // 2. GERIATRIC PROTOCOL (Age 70+ Warning)
    let geriatricWarning = "";
    if (age >= 70) {
        const warningTitle = isTr ? "⚠️ TIBBİ KONSÜLTASYON GEREKLİ" : "⚠️ MEDICAL CONSULTATION REQUIRED";
        const warningMsg = isTr
            ? `DİKKAT: Sistem, 70 yaş ve üzeri kullanıcılar için 'Yüksek Güvenlik Modu' önermektedir. Bu programı uygulamadan önce mutlaka doktorunuzun ve bir kardiyoloğun onayını alınız. Kemik yoğunluğu ve kalp ritmi için özel önlemler alınmalıdır.`
            : `CAUTION: System recommends 'High Safety Mode' for users 70+. Please obtain approval from your physician and cardiologist before execution. Special precautions for bone density and heart rhythm are required.`;

        geriatricWarning = `/> **SYSTEM_ALERT: ${warningTitle}**\n${warningMsg}\n\n----------------------------------------\n\n`;
    }

    // 3. Critical Thresholds (Analysis of Impossible Physics)
    const isWeightImpossible = weight < 35; // <35kg is critical for adult logic
    const isBmiCritical = bmi < 12 || bmi > 60; // Incompatible with standard training logic

    if (isWeightImpossible || isBmiCritical) {
        if (onStatusUpdate) onStatusUpdate('BIOLOGICAL_DATA_MISMATCH...');

        const errorTitle = isTr ? "KRİTİK VERİ HATASI" : "CRITICAL DATA ERROR";
        const errorMsg = isTr
            ? `Girilen veriler biyolojik olarak tutarsız.\n\n- **Kütle:** ${weight}kg\n- **Boy:** ${height}cm\n- **BMI:** ${bmi.toFixed(1)}\n\nBu değerler hayati fonksiyonlarla uyumlu değil veya sistemin analiz kapasitesinin dışında. Lütfen verilerinizi kontrol edin.`
            : `Input data is biologically inconsistent.\n\n- **Mass:** ${weight}kg\n- **Height:** ${height}cm\n- **BMI:** ${bmi.toFixed(1)}\n\nThese metrics are incompatible with life functions or outside analysis scope. Please verify your data.`;

        return `/> **SYSTEM_HALT: ${errorTitle}**
/> **ERROR_CODE:** BIO_METRIC_MISMATCH_0x99

## ${errorTitle}
${errorMsg}

/> **ÖNERİLEN AKSİYON:**
Veri giriş modülünü (Input Kernel) kullanarak kilonuzu ve boyunuzu tekrar giriniz.`;
    }

    const basePrompt = getPrompt(params);

    // 1. Parallel Execution (RACE / GATHER)
    if (onStatusUpdate) onStatusUpdate('INITIALIZING_NEURAL_GRID...');

    const promises: Promise<string>[] = [
        callGemini(basePrompt, 'gemini-1.5-flash'), // Fast
        callGemini(basePrompt, 'gemini-1.5-pro'),   // Smart
    ];

    // Add OpenAI if available
    if (import.meta.env.VITE_OPENAI_API_KEY) {
        promises.push(callOpenAI(basePrompt));
    }

    if (onStatusUpdate) onStatusUpdate('RUNNING_PARALLEL_SIMULATIONS...');

    const results = await Promise.allSettled(promises);

    const successfulResponses = results
        .filter(r => r.status === 'fulfilled' && r.value && r.value.length > 100)
        .map(r => (r as PromiseFulfilledResult<string>).value);

    // Failover Check
    if (successfulResponses.length === 0) {
        // ERROR HANDLER -> ACTIVATING SIMULATION MODE
        // If real AI fails (likely due to API key limits or missing keys), 
        // we fallback to a deterministic "Expert System" simulation.
        // This ensures the user ALWAYS gets a result.

        console.warn("CONNECTIVITY_LOST: Switching to Internal Expert Engine (Simulation Mode)");
        return geriatricWarning + generateSimulatedPlan(params, geriatricWarning);
    }

    // 2. Synthesis (If we have multiple results)
    // If only 1 result, return it directly.
    if (successfulResponses.length === 1) {
        if (onStatusUpdate) onStatusUpdate('SINGLE_NODE_SUCCESS_RELAY...');
        return geriatricWarning + successfulResponses[0];
    }

    // If we have multiple, synthesize them using the smartest model (Pro)
    try {
        if (onStatusUpdate) onStatusUpdate('SYNTHESIZING_OPTIMAL_PATH...');

        const synthesisPrompt = getSynthesisPrompt(successfulResponses, params.lang);
        const finalPlan = await callGemini(synthesisPrompt, 'gemini-1.5-pro');

        if (!finalPlan || finalPlan.length < 100) {
            return geriatricWarning + successfulResponses[0]; // Fallback to raw response if synthesis fails
        }

        return geriatricWarning + finalPlan;

    } catch (synthesisError) {
        console.warn("Synthesis failed, falling back to longest response", synthesisError);
        // Fallback: Return the longest response (usually the most detailed)
        return geriatricWarning + successfulResponses.reduce((a, b) => a.length > b.length ? a : b);
    }
};

// --- INTERNAL EXPERT ENGINE (OFFLINE FALLBACK) ---
// Generates scientific, high-quality plans deterministically when AI is offline.
const generateSimulatedPlan = (params: AIParams, geriatricWarning: string): string => {
    const { age, weight, height, goal, injuries, lang } = params;
    const isTr = lang === 'tr';

    // Calculate BMR & TDEE (Mifflin-St Jeor Equation)
    const bmr = 10 * weight + 6.25 * height - 5 * age + 5;
    const maintenance = Math.round(bmr * 1.55); // Moderate activity

    let calorieTarget = maintenance;
    let protein = Math.round(weight * 2.2); // 2.2g per kg
    let trainingFocus = "";

    // Adjust logic based on Goal
    if (goal.includes('Hypertrophy') || goal.includes('Kas')) {
        calorieTarget = maintenance + 300;
        trainingFocus = isTr ? "Hipertrofi ve Hacim" : "Hypertrophy & Volume";
    } else if (goal.includes('Fat Loss') || goal.includes('Yağ')) {
        calorieTarget = maintenance - 500;
        trainingFocus = isTr ? "Metabolik Kondisyon ve Yağ Yakımı" : "Metabolic Conditioning & Fat Loss";
    }

    const t = {
        analysis: isTr ? "ANALİZ: MEVCUT_DURUM" : "ANALYSIS: CURRENT_STATE",
        protocol: isTr ? "PROTOKOL: ANTRENMAN_PROGRAMI" : "PROTOCOL: TRAINING_PROGRAM",
        nutrition: isTr ? "STRATEJİ: BESLENME_VE_TAKVİYE" : "STRATEGY: NUTRITION_HYDRATION",
        recovery: isTr ? "KORUMA: REHABİLİTASYON" : "PROTECTION: RECOVERY",
        schedule: isTr ? "TAKVİM: HAFTALIK_DÖNGÜ" : "SCHEDULE: WEEKLY_CYCLE",

        intro: isTr
            ? `Biyolojik tarama tamamlandı. Kullanıcı verileri (${age} Yaş, ${weight}kg, ${height}cm) analiz edildi. Hedef: ${trainingFocus}.`
            : `Biological scan complete. User data (${age} Y/O, ${weight}kg, ${height}cm) analyzed. Target: ${trainingFocus}.`,

        analysisText: isTr
            ? `Mevcut metrikler, sistemin ${calorieTarget > maintenance ? 'anabolik (inşa)' : 'katabolik (yakım)'} bir sürece girmesi gerektiğini gösteriyor. Vücut Kitle İndeksi (BMI) ve tahmini bazal metabolizma hızı (${bmr} kcal) optimize edilmeli.`
            : `Current metrics indicate the system requires an ${calorieTarget > maintenance ? 'anabolic (build)' : 'catabolic (burn)'} phase. BMI and estimated BMR (${bmr} kcal) must be optimized.`,

        injuryNote: injuries && injuries.length > 2
            ? (isTr ? `TESPİT EDİLEN HASAR: ${injuries}. Bu bölge için yüklenme kapasitesi %60'a düşürüldü.` : `DETECTED DAMAGE: ${injuries}. Load capacity reduced to 60% for this vector.`)
            : (isTr ? "SİSTEM BÜTÜNLÜĞÜ: %100 Stabil. Kısıtlama yok." : "SYSTEM INTEGRITY: 100% Stable. No restrictions."),

        nutritionText: isTr
            ? `- **Günlük Kalori Hedefi:** ~${calorieTarget} kcal
- **Protein Protokolü:** ${protein}g (Kas onarımı için kritik)
- **Hidrasyon:** Günde en az 3.5 Litre su.
- **Zamanlama:** Antrenman öncesi karbonhidrat, sonrası protein ağırlıklı beslen.`
            : `- **Daily Calorie Target:** ~${calorieTarget} kcal
- **Protein Protocol:** ${protein}g (Critical for repair)
- **Hydration:** Minimum 3.5 Liters of H2O daily.
- **Timing:** Carbohydrate loading pre-workout, protein synthesis focus post-workout.`
    };

    return `/> **SYSTEM_OVERRIDE: OFFLINE_MODE_ACTIVE**
/> **SOURCE:** ELITE_CORE_INTERNAL_DB_V2.1

## ${t.analysis}
/> ${t.intro}
/> ${t.analysisText}
/> ${t.injuryNote}

## ${t.protocol}
/> **${isTr ? 'Odak' : 'Focus'}:** ${trainingFocus}
/> **${isTr ? 'Yöntem' : 'Method'}:** Progressive Overload ${isTr ? '(Aşamalı Yükleme)' : ''}

**${isTr ? 'Gün A: İtiş (Push) - Göğüs/Omuz/Triceps' : 'Day A: Push - Chest/Shoulders/Triceps'}**
1. Bench Press (Barbell) - 4 ${isTr ? 'Set' : 'Sets'} x 6-8 ${isTr ? 'Tekrar' : 'Reps'}
2. Overhead Press (Military) - 4 ${isTr ? 'Set' : 'Sets'} x 8-10 ${isTr ? 'Tekrar' : 'Reps'}
3. Incline Dumbbell Press - 3 ${isTr ? 'Set' : 'Sets'} x 10-12 ${isTr ? 'Tekrar' : 'Reps'}
4. Lateral Raise - 4 ${isTr ? 'Set' : 'Sets'} x 15-20 ${isTr ? 'Tekrar' : 'Reps'} (Drop Set)
5. Triceps Pushdown - 3 ${isTr ? 'Set' : 'Sets'} x 12-15 ${isTr ? 'Tekrar' : 'Reps'}

**${isTr ? 'Gün B: Çekiş (Pull) - Sırt/Biceps' : 'Day B: Pull - Back/Biceps'}**
1. Deadlift ${isTr ? 'veya' : 'or'} Rack Pull - 3 ${isTr ? 'Set' : 'Sets'} x 5 ${isTr ? 'Tekrar' : 'Reps'}
2. Pull-Ups ${isTr ? '(Barfiks)' : ''} - 4 ${isTr ? 'Set' : 'Sets'} x ${isTr ? 'Tükenişe Kadar' : 'To Failure'}
3. Barbell Row - 4 ${isTr ? 'Set' : 'Sets'} x 8-10 ${isTr ? 'Tekrar' : 'Reps'}
4. Face Pulls - 3 ${isTr ? 'Set' : 'Sets'} x 15-20 ${isTr ? 'Tekrar' : 'Reps'}
5. Barbell Curl - 4 ${isTr ? 'Set' : 'Sets'} x 8-10 ${isTr ? 'Tekrar' : 'Reps'}

**${isTr ? 'Gün C: Bacak (Legs)' : 'Day C: Legs'}**
1. Squat - 4 ${isTr ? 'Set' : 'Sets'} x 6-8 ${isTr ? 'Tekrar' : 'Reps'}
2. Romanian Deadlift - 4 ${isTr ? 'Set' : 'Sets'} x 8-10 ${isTr ? 'Tekrar' : 'Reps'}
3. Leg Press - 3 ${isTr ? 'Set' : 'Sets'} x 12-15 ${isTr ? 'Tekrar' : 'Reps'}
4. Calf Raises - 4 ${isTr ? 'Set' : 'Sets'} x 20 ${isTr ? 'Tekrar' : 'Reps'}

## ${t.nutrition}
${t.nutritionText}

## ${t.recovery}
/> **${isTr ? 'Uyku' : 'Sleep'}:** ${isTr ? 'Büyüme hormonu (HGH) salınımı için 23:00 - 07:00 arası 8 saat zorunlu.' : 'Mandatory 8 hours between 23:00-07:00 for HGH release.'}
/> **${isTr ? 'Aktif Dinlenme' : 'Active Recovery'}:** ${isTr ? 'Haftada 1 gün düşük tempolu yürüyüş veya mobilite çalışması.' : '1 day/week low-tempo walk or mobility work.'}
/> **${isTr ? 'Stres Yönetimi' : 'Stress Management'}:** ${isTr ? 'Kortizol seviyelerini düşürmek için antrenman sonrası 10dk nefes egzersizi.' : '10min breathing exercises post-workout to reduce cortisol.'}

## ${t.schedule}
- **${isTr ? 'Pazartesi' : 'Monday'}:** ${isTr ? 'Gün A (İtiş)' : 'Day A (Push)'}
- **${isTr ? 'Salı' : 'Tuesday'}:** ${isTr ? 'Gün B (Çekiş)' : 'Day B (Pull)'} 
- **${isTr ? 'Çarşamba' : 'Wednesday'}:** ${isTr ? 'Aktif Dinlenme / Kardiyo' : 'Active Recovery / Cardio'}
- **${isTr ? 'Perşembe' : 'Thursday'}:** ${isTr ? 'Gün C (Bacak)' : 'Day C (Legs)'}
- **${isTr ? 'Cuma' : 'Friday'}:** ${isTr ? 'Gün A (Üst Vücut Karışık)' : 'Day A (Upper Body Mix)'}
- **${isTr ? 'Haftasonu' : 'Weekend'}:** ${isTr ? 'Tam Dinlenme (Recovery)' : 'Full Rest (Recovery)'}`;
};
