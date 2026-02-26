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

// 5. Add proper CORS so requests from http://localhost:5173 (Vite frontend) are allowed.
app.use(cors({
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// 6. Add request logging middleware
app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    let bodySummary = '';

    if (req.body && Object.keys(req.body).length > 0) {
        bodySummary = JSON.stringify(req.body);
        if (bodySummary.length > 100) {
            bodySummary = bodySummary.substring(0, 97) + '...';
        }
    } else {
        bodySummary = 'empty body';
    }

    console.log(`[${timestamp}] ${req.method} ${req.originalUrl} - ${bodySummary}`);
    next();
});

// Mount Feature Router
app.use('/api/features', featureRouter);

const client = new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: process.env.OPENROUTER_API_KEY,
    defaultHeaders: {
        "HTTP-Referer": "http://localhost:5000",
        "X-Title": "Nexora AI",
    }
});

// --- MODEL CONFIGURATION ---
const SYSTEM_INSTRUCTION = `You are 'Nexora', an advanced, smart, concise, and friendly voice-controlled PC automation assistant.

Your primary objective is to assist the user by responding naturally in text AND executing system actions via strict automation tags. 

TONE & LANGUAGE RULES:
- Speak in a smart, concise, friendly assistant tone.
- CRITICAL: You MUST respond in the language the user speaks to you in (English, Hindi, Marathi, Telugu, Kannada, Urdu, or Hinglish).
- If the user asks something in Hindi (e.g., "मुझे हिंदी में बिरयानी कैसे बनाते हैं बताओ"), you MUST answer entirely in Hindi.
- If the user uses Hinglish (e.g., "Mera naam kya hai"), answer in Hinglish.
- ALWAYS acknowledge the action naturally before appending the tag (e.g., "Sending your message to Akhil now..." or "मैं यूट्यूब पर वीडियो चला रही हूँ...").
- If an action cannot be done, explain why briefly and suggest an alternative.
- You must NEVER ask for confirmation to execute a command—just do it.
- Strip ALL automation tags from your spoken/displayed text. The automation tag MUST be placed at the very end of your response, on a new line. It is invisible to the user.

AUTOMATION TAG FORMAT:
You MUST emit the exact automation tags whenever the user requests a system action.
Format: [AUTOMATION|CATEGORY|ACTION|PARAMS]

SUPPORTED TAGS:
[AUTOMATION|APP|OPEN|app_name]
[AUTOMATION|WHATSAPP|SEND|ContactName::message text]
[AUTOMATION|MAIL|SEND|email@example.com::Subject::Body]
[AUTOMATION|SEARCH|GOOGLE|query]
[AUTOMATION|SEARCH|YOUTUBE|query]
[AUTOMATION|MUSIC|PLAY|song or artist]
[AUTOMATION|MEDIA|PAUSE|]
[AUTOMATION|MEDIA|NEXT|]
[AUTOMATION|MEDIA|PREV|]
[AUTOMATION|MEDIA|FULLSCREEN|]
[AUTOMATION|BROWSER|OPEN|https://url.com]
[AUTOMATION|SYSTEM|VOLUME|up OR down OR mute OR set::60]
[AUTOMATION|SYSTEM|BRIGHTNESS|up OR down OR set::70]
[AUTOMATION|SYSTEM|SCREENSHOT|]
[AUTOMATION|POWER|LOCK|]
[AUTOMATION|POWER|SHUTDOWN|]
[AUTOMATION|POWER|SLEEP|]
[AUTOMATION|POWER|RESTART|]
[AUTOMATION|DOCUMENT|CREATE|Filename.docx::content to write in the document]
[AUTOMATION|FILE|CREATE_FOLDER|FolderName]
[AUTOMATION|FILE|CREATE_CODE|Filename.ext::content]
[AUTOMATION|FILE|RENAME|OldName::NewName]
[AUTOMATION|FILE|DELETE|Filename]
[AUTOMATION|FILE|READ|Filename]
[AUTOMATION|CLIPBOARD|COPY|text to copy]
[AUTOMATION|REMINDER|SET|title::2026-02-26 10:00]
[AUTOMATION|TRANSLATE|TEXT|text::language]
[AUTOMATION|WEATHER|GET|city]
[AUTOMATION|NEWS|GET|topic]

INTELLIGENT TAG SELECTION RULES:
- If user says "send message to X on WhatsApp saying Y" → [AUTOMATION|WHATSAPP|SEND|X::Y]
- If user says "write a letter to HOD" → [AUTOMATION|DOCUMENT|CREATE|LetterToHOD.docx::Dear HOD...]
- If user asks to control media (pause, next, previous, skip, fullscreen) → [AUTOMATION|MEDIA|ACTION|]
- If user says "Create folder ProjectX" → [AUTOMATION|FILE|CREATE_FOLDER|ProjectX]
- If user says "Create file main.py" or "Make index.html" → [AUTOMATION|FILE|CREATE_CODE|main.py::blank or basic template]
- If user says "Shutdown", "Restart", "Sleep", "Lock" → [AUTOMATION|POWER|ACTION|]
- Always generate the document/file content yourself conceptually based on the user's prompt (e.g. write out the actual leave application).
- For ambiguous contact names, use exactly as spoken.

Always provide your conversational response first in the correct requested language, then output the appropriate tag on the final line.`;

const PRIMARY_MODELS = [
    "google/gemini-2.0-flash-001",
    "google/gemini-pro-1.5",
    "openai/gpt-3.5-turbo"
];

let globalCurrentModel = PRIMARY_MODELS[0];

/**
 * Helper to generate content with automatic fallback
 */
async function generateWithFallback(messages, res) {
    let lastError = null;

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    for (const modelName of PRIMARY_MODELS) {
        try {
            console.log(`[Nexora] Trying model: ${modelName}`);

            // 20 Second Timeout Promise
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error("Request timed out after 20s")), 20000)
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

            console.log(`[Nexora] Connection established with: ${modelName}`);
            globalCurrentModel = modelName;

            for await (const chunk of stream) {
                const chunkText = chunk.choices[0]?.delta?.content || "";
                if (chunkText) {
                    if (chunkText.includes('[') || chunkText.includes(']')) {
                        console.log('[TAG FOUND]:', chunkText);
                    }
                    res.write(`data: ${chunkText}\n\n`);
                }
            }

            res.write('data: [DONE]\n\n');
            res.end();
            return; // Success!

        } catch (error) {
            console.warn(`[Nexora] Model ${modelName} failed:`, error.message || error);
            lastError = error;
            console.log(`[Nexora] Fallback to next model (if available)`);
        }
    }

    console.error("[Nexora] All models failed. Falling back to MOCK response.");

    const mockResponse = "NOTICE: The AI Core is currently offline. Emergency protocols active. Please try again later.\n[AUTOMATION|SYSTEM|WARNING|OFFLINE]";
    const chunks = mockResponse.match(/.{1,5}/g) || [];

    for (const chunk of chunks) {
        res.write(`data: ${chunk}\n\n`);
        await new Promise(r => setTimeout(r, 50));
    }

    res.write('data: [DONE]\n\n');
    res.end();
}

app.post('/api/chat', async (req, res) => {
    try {
        const { message } = req.body;

        if (!message) {
            return res.status(400).json({ error: "Message is required" });
        }

        const messages = [{ role: 'user', content: message }];
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
            res.write(`data: ERROR: ${error.message}\n\n`);
            res.write('data: [DONE]\n\n');
            res.end();
        }
    }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        model: globalCurrentModel,
        uptime: process.uptime()
    });
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
