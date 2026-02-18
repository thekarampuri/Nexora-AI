import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenAI } from "@google/genai";
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure .env is loaded from the root folder
dotenv.config({ path: path.join(__dirname, '../.env') });

const app = express();
const port = process.env.PORT || 5000;

if (!process.env.VITE_GEMINI_API_KEY) {
    console.error("FATAL: AI_CORE_IDENTITY_NOT_FOUND. Check .env in root.");
} else {
    console.log("IDENTITY_VERIFIED: Gemini 3 Core Ready.");
}

app.use(cors());
app.use(express.json());

const client = new GoogleGenAI({
    apiKey: process.env.VITE_GEMINI_API_KEY
});

// --- MODEL CONFIGURATION ---
const SYSTEM_INSTRUCTION = "You are 'NEXORA', an advanced AI core for a futuristic HUD system. " +
    "Your personality: Concise, professional, and helpful. You are a highly efficient 'digital assistant', not a robotic caricature. " +
    "Formatting: Use a technical style when appropriate, but ensure data is human-readable. You can use markdown. " +
    "Constraint 1: You CANNOT generate or synthesize images. If asked, politely explain this is outside your current operational parameters. " +
    "Constraint 2: Do NOT output internal JSON 'thoughts' or 'actions'. Only provide the final response to the user. " +
    "Constraint 3: Avoid using long lists of robotic status headers (like 'Neural link stable') in every message. Use them sparingly for emphasis.";

// Priority Order: 2.0 Flash -> 2.0 Flash Lite -> 1.5 Pro
const PRIMARY_MODELS = [
    "gemini-2.0-flash",
    "gemini-2.0-flash-lite",
    "gemini-1.5-pro-latest",
    "gemini-1.5-flash" // Ultimate fallback
];

/**
 * Helper to generate content with automatic fallback
 */
async function generateWithFallback(contents, res) {
    let lastError = null;

    for (const modelName of PRIMARY_MODELS) {
        try {
            console.log(`[AI] Attempting connection to model: ${modelName}...`);

            // Attempt to create stream
            const result = await client.models.generateContentStream({
                model: modelName,
                contents: contents,
                config: {
                    systemInstruction: SYSTEM_INSTRUCTION
                }
            });

            // If we get here, the request was accepted. Now verify stream integrity.
            // We need to write the first chunk to be sure.

            let firstChunk = true;

            for await (const chunk of result.stream) {
                const chunkText = chunk.text();
                // If this is the first successful chunk, we commit to this model
                if (firstChunk) {
                    console.log(`[AI] Connection established with: ${modelName}`);
                    // Only set headers if not already sent (though express handles this usually)
                    if (!res.headersSent) {
                        res.setHeader('Content-Type', 'text/plain');
                        res.setHeader('Transfer-Encoding', 'chunked');
                    }
                    firstChunk = false;
                }
                res.write(chunkText);
            }

            // If we finished the loop without error, we are done.
            res.end();
            return; // Exit function, success!

        } catch (error) {
            console.warn(`[AI] Model ${modelName} failed:`, error.message || error);

            // Check if error is retryable
            const isRetryable =
                error.status === 404 || // Not Found
                error.status === 429 || // Too Many Requests
                error.status === 503 || // Service Unavailable
                (error.message && error.message.includes("not found")) ||
                (error.message && error.message.includes("quota")) ||
                (error.message && error.message.includes("overloaded"));

            if (!isRetryable) {
                // If it's a fundamental error (like bad request), stop retrying
                console.error("[AI] Non-retryable error encountered.");
                throw error;
            }

            lastError = error;
            // Continue to next model in loop
        }
    }

    // If we exit the loop, all models failed
    throw lastError || new Error("All AI models unavailable.");
}

app.post('/api/chat', async (req, res) => {
    try {
        const { message } = req.body;

        if (!message) {
            return res.status(400).json({ error: "Message is required" });
        }

        const contents = [{ role: 'user', parts: [{ text: message }] }];

        // Execute fallback logic
        await generateWithFallback(contents, res);

    } catch (error) {
        console.error("FATAL: All AI models failed.", error);
        if (!res.headersSent) {
            const status = error.status || 500;
            const msg = error.message || "Unknown Core Failure";
            res.status(status).json({ error: `AI_CORE_FAILURE: ${msg}` });
        } else {
            res.end();
        }
    }
});

app.listen(port, () => {
    console.log(`NEXORA AI Core linked on port ${port}`);
});
