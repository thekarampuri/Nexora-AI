import { GoogleGenAI } from "@google/genai";
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure .env is loaded
dotenv.config({ path: path.join(__dirname, '.env') });

const API_KEY = process.env.VITE_GEMINI_API_KEY;

console.log("🔍 Diagnostic Tool: Gemini API Availability");
console.log("==========================================");

if (!API_KEY) {
    console.error("❌ CRITICAL: VITE_GEMINI_API_KEY is missing in .env");
    process.exit(1);
}

// Security: Print only first/last 4 chars to verify key update without leaking
const keyPreview = `${API_KEY.substring(0, 4)}...${API_KEY.substring(API_KEY.length - 4)}`;
console.log(`🔑 Active API Key: ${keyPreview}`);

const modelsToTest = [
    "gemini-2.0-flash",
    "gemini-pro",
    "gemini-1.5-flash-latest",
    "gemini-1.5-pro-latest"
];

const client = new GoogleGenAI({ apiKey: API_KEY });

async function testModel(modelName) {
    process.stdout.write(`👉 Testing ${modelName.padEnd(25)} `);
    try {
        const result = await client.models.generateContent({
            model: modelName,
            contents: [{ role: 'user', parts: [{ text: "Hello" }] }]
        });
        console.log("✅ SUCCESS");
        return true;
    } catch (error) {
        if (error.message.includes("429")) {
            console.log("⚠️  QUOTA EXCEEDED (429)");
        } else if (error.message.includes("404")) {
            console.log("❌ NOT FOUND (404)");
        } else {
            console.log(`❌ ERROR: ${error.message.split('\n')[0]}`);
        }
        return false;
    }
}

async function runDiagnostics() {
    console.log("\nStarting connectivity checks...");
    let successCount = 0;

    for (const model of modelsToTest) {
        const success = await testModel(model);
        if (success) successCount++;
    }

    console.log("\n==========================================");
    if (successCount === 0) {
        console.log("❌ DIAGNOSIS: Total Outage.");
        console.log("   Possible causes:");
        console.log("   1. IP Address is rate-limited (try a VPN/Mobile Hotspot).");
        console.log("   2. API Key is invalid or has no billing account linked (if required).");
        console.log("   3. Google's free tier is globally overloaded right now.");
    } else {
        console.log(`✅ DIAGNOSIS: Partial Success (${successCount}/${modelsToTest.length} models working).`);
        console.log("   Update your server/index.js to use the working models first.");
    }
}

runDiagnostics();
