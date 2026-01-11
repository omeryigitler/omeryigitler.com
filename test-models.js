const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

async function listModels() {
    try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        // We can't list models directly with the library easily without some versions, 
        // but we can try to initialize one and see if it fails early or check available models via fetch if we had to.
        // Actually, let's just try the 3 most likely models.
        const modelsToTry = ["gemini-1.5-flash", "gemini-1.5-flash-latest", "gemini-1.5-flash-8b", "gemini-1.0-pro"];

        for (const m of modelsToTry) {
            try {
                const model = genAI.getGenerativeModel({ model: m });
                console.log(`Checking ${m}...`);
                // Just a tiny test
                await model.generateContent("test");
                console.log(`✅ ${m} is working!`);
            } catch (e) {
                console.log(`❌ ${m} failed: ${e.message}`);
            }
        }
    } catch (e) {
        console.error("General Error:", e);
    }
}

listModels();
