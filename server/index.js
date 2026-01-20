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

        // Using Gemini 3 Flash Preview with the new SDK syntax
        const result = await client.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: [{ role: 'user', parts: [{ text: message }] }],
            config: {
                systemInstruction: "You are 'NEXORA', an omniscient planetary-scale AI assistant for a futuristic HUD system. Your responses should be technical, concise, and professional. Avoid human-level conversational fillers. Use terms like 'Data decrypted', 'Analysis complete', 'Neural link stable'."
            }
        });

        // The new SDK returns text differently
        res.json({ response: result.text || "NO_DATA_RECONSTRUCTED" });
    } catch (error) {
        console.error("Gemini 3 Proxy Error Details:", error);

        let errorMessage = "AI_CORE_FAILURE: Protocol corruption.";
        if (error.message?.includes("API key not valid")) {
            errorMessage = "ERROR: INVALID_IDENTITY. API key is rejected by Google.";
        } else if (error.message?.includes("quota")) {
            errorMessage = "ERROR: QUOTA_EXCEEDED. AI core exhausted.";
        } else if (error.message) {
            errorMessage = `AI_ERROR: ${error.message.substring(0, 70)}...`;
        }

        res.status(500).json({ error: errorMessage });
    }
});

app.listen(port, () => {
    console.log(`NEXORA AI Core linked on port ${port}`);
});
