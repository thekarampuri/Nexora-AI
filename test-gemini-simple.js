// Quick test for Gemini API
import { GoogleGenAI } from "@google/genai";
import dotenv from 'dotenv';
dotenv.config();

const API_KEY = process.env.VITE_GEMINI_API_KEY;

console.log("🧪 Testing Gemini API...\n");

if (!API_KEY) {
    console.error("❌ Error: VITE_GEMINI_API_KEY is missing in .env file.");
    process.exit(1);
}

const client = new GoogleGenAI({ apiKey: API_KEY });

async function run() {
    try {
        const result = await client.models.generateContent({
            model: "gemini-2.0-flash", // Trying flash first
            contents: [{ role: 'user', parts: [{ text: "Say 'NEXORA online' in a futuristic way" }] }]
        });

        console.log("✅ API Response:");
        console.log(result.text || result.response.text());
        console.log("\n✅ Gemini API is working correctly!");
    } catch (error) {
        console.error("❌ API Error:", error.message);
        if (error.message?.includes("API key")) {
            console.log("\n⚠️  API key issue detected. Please check your .env file.");
        } else if (error.message?.includes("503") || error.message?.includes("high demand") || error.message?.includes("quota")) {
            console.log("\n⚠️  Model quota or availability issue.");
        }
    }
}

run();
