import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenAI } from "@google/genai";
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure .env is loaded from the root folder correctly
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

// Initialize Gemini 3 Client
const client = new GoogleGenAI({
    apiKey: process.env.VITE_GEMINI_API_KEY
});

app.post('/api/chat', async (req, res) => {
    try {
        const { message } = req.body;

        if (!message) {
            return res.status(400).json({ error: "Message is required" });
        }

        // Set headers for streaming
        res.setHeader('Content-Type', 'text/plain');
        res.setHeader('Transfer-Encoding', 'chunked');

        const result = await client.models.generateContentStream({
            model: "gemini-1.5-flash",
            contents: [{ role: 'user', parts: [{ text: message }] }],
            config: {
                systemInstruction: "You are 'NEXORA', an advanced AI core for a futuristic HUD system. " +
                    "Your personality: Concise, professional, and helpful. You are a highly efficient 'digital assistant', not a robotic caricature. " +
                    "Formatting: Use a technical style when appropriate, but ensure data is human-readable. You can use markdown. " +
                    "Constraint 1: You CANNOT generate or synthesize images. If asked, politely explain this is outside your current operational parameters. " +
                    "Constraint 2: Do NOT output internal JSON 'thoughts' or 'actions'. Only provide the final response to the user. " +
                    "Constraint 3: Avoid using long lists of robotic status headers (like 'Neural link stable') in every message. Use them sparingly for emphasis."
            }
        });

        for await (const chunk of result.stream) {
            const chunkText = chunk.text();
            res.write(chunkText);
        }

        res.end();

    } catch (error) {
        console.error("Gemini Proxy Error Details:", JSON.stringify(error, Object.getOwnPropertyNames(error)));
        if (!res.headersSent) {
            res.status(500).json({ error: `AI_CORE_FAILURE: ${error.message}` });
        } else {
            res.end();
        }
    }
});

app.listen(port, () => {
    console.log(`NEXORA AI Core linked on port ${port}`);
});
