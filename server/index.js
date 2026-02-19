import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import OpenAI from 'openai';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure .env is loaded from the root folder
dotenv.config({ path: path.join(__dirname, '../.env') });

const app = express();
const port = process.env.PORT || 5000;

if (!process.env.OPENROUTER_API_KEY) {
    console.error("FATAL: AI_CORE_IDENTITY_NOT_FOUND. Check .env in root for OPENROUTER_API_KEY.");
} else {
    console.log("IDENTITY_VERIFIED: OpenRouter AI Core Ready.");
}

import featureRouter from './features/router.js';

app.use(cors());
app.use(express.json());

// Mount Feature Router
app.use('/api/features', featureRouter);

const client = new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: process.env.OPENROUTER_API_KEY,
    defaultHeaders: {
        "HTTP-Referer": "http://localhost:5000", // Optional, for including your app on openrouter.ai rankings.
        "X-Title": "Nexora AI", // Optional. Shows in rankings on openrouter.ai.
    }
});

// --- MODEL CONFIGURATION ---
const SYSTEM_INSTRUCTION = "You are 'NEXORA', an advanced, multifunctional AI core for a futuristic HUD system.\n" +
    "Identity: Futuristic, highly intelligent, and helpful.\n" +
    "Objective: Provide detailed, comprehensive, and well-explained answers. Do NOT be concise. Expand on topics to provide maximum value.\n" +
    "Capabilities:\n" +
    "1. General: Chat, help, and information.\n" +
    "2. Medical: Provide detailed health advice (Disclaimer: Not a doctor).\n" +
    "3. Code: Explain concepts in depth, debug with clear reasoning, and generate well-commented code.\n" +
    "4. Math: Solve complex problems step-by-step.\n" +
    "5. Translation: Translate text fluently.\n" +
    "6. System: Output [REMINDER|YYYY-MM-DD HH:MM|Message] or [TIMER|Minutes|Message].\n" +
    "7. Computer Control: To control the PC, output a command on a new line:\n" +
    "   - Open App: [AUTOMATION|APP|OPEN|app_name]\n" +
    "   - Open Website: [AUTOMATION|WEB|OPEN|url]\n" +
    "   - Google Search: [AUTOMATION|WEB|SEARCH|query]\n" +
    "   - YouTube: [AUTOMATION|YOUTUBE|SEARCH_PLAY|query]\n" +
    "   - Media/Volume: [AUTOMATION|SYSTEM|VOLUME|UP/DOWN/MUTE] or [AUTOMATION|MEDIA|PLAY/PAUSE/NEXT]\n" +
    "IMPORTANT: Do NOT bold or format the automation tag. Output it exactly as raw text at the end.\n" +
    "Format: Use markdown for the answer. Be thorough. Then output the [AUTOMATION|...] tag.";

// Priority Order as requested - using OpenRouter model IDs
const PRIMARY_MODELS = [
    "google/gemini-2.0-flash-001",
    "google/gemini-pro-1.5",
    "openai/gpt-3.5-turbo" // Fallback to GPT-3.5 if Gemini fails
];

/**
 * Helper to generate content with automatic fallback
 */
async function generateWithFallback(messages, res) {
    let lastError = null;

    for (const modelName of PRIMARY_MODELS) {
        try {
            console.log(`[AI] Attempting connection to model: ${modelName}...`);

            // 15 Second Timeout Promise
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error("Request timed out after 15s")), 15000)
            );

            // AI Request Promise
            const aiPromise = client.chat.completions.create({
                model: modelName,
                messages: [
                    { role: "system", content: SYSTEM_INSTRUCTION },
                    ...messages
                ],
                stream: true,
            });

            // Race against timeout
            const stream = await Promise.race([aiPromise, timeoutPromise]);

            // If we get here, the request was accepted. Now verify stream integrity.
            // We need to write the first chunk to be sure we have a valid stream.

            let firstChunk = true;

            for await (const chunk of stream) {
                const chunkText = chunk.choices[0]?.delta?.content || "";

                // Skip empty chunks (common in some streams)
                if (!chunkText && !firstChunk) continue;

                // If this is the first successful chunk, we commit to this model
                if (firstChunk) {
                    // Even if chunkText is empty, getting a valid stream response means connection is established
                    console.log(`[AI] Connection established with: ${modelName}`);

                    // Only set headers if not already sent
                    if (!res.headersSent) {
                        res.setHeader('Content-Type', 'text/plain');
                        res.setHeader('Transfer-Encoding', 'chunked');
                    }
                    firstChunk = false;
                }

                if (chunkText) {
                    res.write(chunkText);
                }
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

        const mockResponse = "NOTICE: The AI Core is currently offline. " +
            "Emergency protocols active. Please try again later. " +
            "[SYSTEM_STATUS: OFFLINE]";

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

        // Convert user message to OpenRouter/OpenAI message format
        const messages = [{ role: 'user', content: message }];

        // Execute fallback logic
        await generateWithFallback(messages, res);

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

// Start Server
const server = app.listen(port, () => {
    console.log(`NEXORA AI Core linked on port ${port}`);
});

server.on('error', (e) => {
    if (e.code === 'EADDRINUSE') {
        console.error(`\n[ERROR] Port ${port} is already in use!`);
        console.error(`Action: Kill the existing process or change PORT in .env.`);
        process.exit(1);
    }
});
