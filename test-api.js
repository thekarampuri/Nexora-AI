import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from 'dotenv';
dotenv.config();

const API_KEY = process.env.VITE_GEMINI_API_KEY;

async function testKey() {
    console.log("--- NEXORA AI KEY VALIDATOR ---");
    if (!API_KEY) {
        console.error("FAILED: No VITE_GEMINI_API_KEY found in .env");
        process.exit(1);
    }

    console.log(`Checking key: ${API_KEY.substring(0, 5)}...${API_KEY.substring(API_KEY.length - 5)}`);

    const genAI = new GoogleGenerativeAI(API_KEY);
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent("Say 'NEXORA ONLINE'");
        console.log("SUCCESS: API linked!");
        console.log("Response:", result.response.text());
    } catch (error) {
        console.error("FAILED: Authentication error.");
        console.error("Root Cause:", error.message);
        if (error.message.includes("API key not valid")) {
            console.error("Suggestion: The API key provided is invalid. Please double-check it in AI Studio.");
        }
    }
}

testKey();
