// Simple Gemini API Test using the same package as server
import { GoogleGenAI } from "@google/genai";

const API_KEY = "AIzaSyBa9wo5V5xeS6V9fXmPeRnasaGudPZyEm8";

console.log("🧪 Testing NEXORA Gemini API Connection...\n");
console.log(`API Key: ${API_KEY.substring(0, 10)}...`);
console.log("Model: gemini-2.0-flash-exp\n");

const client = new GoogleGenAI({ apiKey: API_KEY });

try {
    console.log("⏳ Sending test request...");

    const result = await client.models.generateContent({
        model: "gemini-2.0-flash-exp",
        contents: [{
            role: 'user',
            parts: [{ text: "Say 'NEXORA VISION CORE ONLINE' in a futuristic cyberpunk style" }]
        }]
    });

    console.log("\n✅ SUCCESS! Gemini API is working!\n");
    console.log("Response:");
    console.log("─".repeat(60));
    console.log(result.text);
    console.log("─".repeat(60));
    console.log("\n✅ NEXORA chatbot is ready to use!");

} catch (error) {
    console.error("\n❌ API Error:", error.message);

    if (error.message?.includes("API key")) {
        console.log("\n⚠️  Issue: Invalid API key");
        console.log("Solution: Update VITE_GEMINI_API_KEY in .env file");
    } else if (error.message?.includes("503") || error.message?.includes("high demand")) {
        console.log("\n⚠️  Issue: Model experiencing high demand");
        console.log("Solution: Wait a moment and try again");
    } else if (error.message?.includes("quota")) {
        console.log("\n⚠️  Issue: API quota exceeded");
        console.log("Solution: Check your Google AI Studio quota");
    } else {
        console.log("\n⚠️  Unexpected error. Full details:");
        console.error(error);
    }
}
