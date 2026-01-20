import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, './.env') });

async function testGemini3() {
    const API_KEY = process.env.VITE_GEMINI_API_KEY;
    console.log("--- GEMINI 3 CORE VALIDATOR ---");
    console.log(`Checking key: ${API_KEY.substring(0, 5)}...`);

    const genAI = new GoogleGenerativeAI(API_KEY);
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });
        const result = await model.generateContent("Say 'NEXORA CORE GENERATION 3 ONLINE'");
        console.log("SUCCESS: Gemini 3 Link Stable!");
        console.log("Response:", result.response.text());
    } catch (error) {
        console.error("FAILED: Gemini 3 Handshake Error.");
        console.error("Message:", error.message);
    }
}

testGemini3();
