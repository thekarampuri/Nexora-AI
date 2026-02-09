// Quick test for Gemini API
import { GoogleGenAI } from "@google/genai";

const API_KEY = "AIzaSyBa9wo5V5xeS6V9fXmPeRnasaGudPZyEm8";

console.log("🧪 Testing Gemini API...\n");

const client = new GoogleGenAI({ apiKey: API_KEY });

try {
    const result = await client.models.generateContent({
        model: "gemini-2.0-flash-exp",
        contents: [{ role: 'user', parts: [{ text: "Say 'NEXORA online' in a futuristic way" }] }]
    });

    console.log("✅ API Response:");
    console.log(result.text);
    console.log("\n✅ Gemini API is working correctly!");
} catch (error) {
    console.error("❌ API Error:", error.message);
    if (error.message?.includes("API key")) {
        console.log("\n⚠️  API key issue detected. Please check your .env file.");
    } else if (error.message?.includes("503") || error.message?.includes("high demand")) {
        console.log("\n⚠️  Model experiencing high demand. Try again in a moment.");
    }
}
