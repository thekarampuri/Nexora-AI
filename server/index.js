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

// Priority Order as requested
const PRIMARY_MODELS = [
    "gemini-2.0-flash",
    "gemini-2.0-flash-lite",
    "gemini-flash-latest"
];

/**
 * Helper to generate content with automatic fallback
 */
async function generateWithFallback(contents, res) {
    let lastError = null;

    for (const modelName of PRIMARY_MODELS) {
        try {
            console.log(`[AI] Attempting connection to model: ${modelName}...`);

            // 15 Second Timeout Promise
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error("Request timed out after 15s")), 15000)
            );

            // AI Request Promise
            const aiPromise = client.models.generateContentStream({
                model: modelName,
                contents: contents,
                config: {
                    systemInstruction: SYSTEM_INSTRUCTION
                }
            });

            // Race against timeout
            const result = await Promise.race([aiPromise, timeoutPromise]);

            // If we get here, the request was accepted. Now verify stream integrity.
            // We need to write the first chunk to be sure we have a valid stream.

            let firstChunk = true;

            for await (const chunk of result.stream) {
                const chunkText = chunk.text();

                // If this is the first successful chunk, we commit to this model
                if (firstChunk) {
                    console.log(`[AI] Connection established with: ${modelName}`);

                    // Only set headers if not already sent
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
            lastError = error;
            // Continue to next model in loop logic is implicit here
            console.log(`[AI] Fallback to next model (if available)`);
        }
    }

    // If we exit the loop, all models failed
    console.error("[AI] All models failed. Falling back to MOCK response.");

    if (!res.headersSent) {
        // SIMULATE STREAMING MOCK RESPONSE
        res.setHeader('Content-Type', 'text/plain');
        res.setHeader('Transfer-Encoding', 'chunked');

        const mockResponse = "NOTICE: The AI Core is currently offline due to high traffic (Error 429). " +
            "I am operating in emergency fallback mode. " +
            "Please try again later when the connection stabilizes. " +
            "[SYSTEM_STATUS: STANDBY]";

        // Simulate typing delay
        const chunks = mockResponse.match(/.{1,5}/g) || [];
        for (const chunk of chunks) {
            res.write(chunk);
            await new Promise(r => setTimeout(r, 50)); // 50ms delay per chunk
        }
        res.end();
    } else {
        // If headers were already sent (e.g. partial stream), we can't send JSON.
        // We just end the response. Frontend will see a broken stream.
        res.end();
    }
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
        console.error("FATAL: Unexpected handler error.", error);
        if (!res.headersSent) {
            res.status(500).json({
                success: false,
                error: "INTERNAL_SERVER_ERROR",
                message: "An unexpected internal error occurred."
            });
        } else {
            res.end();
        }
    }
});

app.listen(port, () => {
    console.log(`NEXORA AI Core linked on port ${port}`);
});
