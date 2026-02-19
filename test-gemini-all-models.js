import { GoogleGenAI } from "@google/genai";
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

const API_KEY = process.env.VITE_GEMINI_API_KEY;
const logFile = path.join(__dirname, 'test_log.txt');
fs.writeFileSync(logFile, "Starting Test...\n");

function log(msg) {
    fs.appendFileSync(logFile, msg + "\n");
    console.log(msg);
}

if (!API_KEY) {
    log("❌ CRITICAL: VITE_GEMINI_API_KEY is missing in .env");
    process.exit(1);
}

const client = new GoogleGenAI({ apiKey: API_KEY });
const modelsToTest = [
    "gemini-2.0-flash",
    "gemini-2.0-flash-lite",
    "gemini-flash-latest"
];

async function run() {
    log(`Key: ${API_KEY.substring(0, 5)}...`);
    for (const model of modelsToTest) {
        log(`Testing ${model}...`);
        try {
            await client.models.generateContent({
                model: model,
                contents: [{ role: 'user', parts: [{ text: "Hi" }] }]
            });
            log(`✅ ${model} SUCCESS`);
        } catch (e) {
            log(`❌ ${model} FAILED: ${e.message}`);
        }
    }
}
run();
