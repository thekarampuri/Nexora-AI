
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

const API_KEY = process.env.OPENROUTER_API_KEY;
const modelsToTest = [
    "google/gemini-2.0-flash-001",
    "google/gemini-flash-1.5",
    "openai/gpt-3.5-turbo"
];

console.log("Starting OpenRouter API Test...");

if (!API_KEY) {
    console.error("❌ CRITICAL: OPENROUTER_API_KEY is missing in .env");
    process.exit(1);
}

async function testModel(model) {
    console.log(`Testing ${model}...`);
    try {
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${API_KEY}`,
                "Content-Type": "application/json",
                "HTTP-Referer": "http://localhost:3000",
                "X-Title": "Nexora AI Test"
            },
            body: JSON.stringify({
                model: model,
                messages: [
                    { role: "user", content: "Say 'Success'" }
                ]
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        const data = await response.json();
        const content = data.choices[0]?.message?.content;
        console.log(`✅ ${model} SUCCESS: "${content}"`);
    } catch (e) {
        console.error(`❌ ${model} FAILED: ${e.message}`);
    }
}

async function run() {
    for (const model of modelsToTest) {
        await testModel(model);
    }
}

run();
