
import express from 'express';
import { SYSTEM_PROMPTS } from './prompts.js';
import OpenAI from 'openai';
import dotenv from 'dotenv';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') }); // Load root .env

const router = express.Router();

// Initialize OpenAI Helper (reusing key)
const client = new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: process.env.OPENROUTER_API_KEY,
    defaultHeaders: {
        "HTTP-Referer": "http://localhost:5000",
        "X-Title": "Nexora AI Features",
    }
});

const MODEL = "google/gemini-2.0-flash-001"; // Default efficiently model

// --- GENERIC CHAT HANDLER ---
// Handles Medical, Code, Math, Quiz, Translator
router.post('/chat', async (req, res) => {
    try {
        const { message, mode, history } = req.body;

        if (!message) return res.status(400).json({ error: "Message required" });

        const systemPrompt = SYSTEM_PROMPTS[mode] || SYSTEM_PROMPTS.default;

        // Construct messages
        const messages = [
            { role: "system", content: systemPrompt },
            ...(history || []), // Optional history
            { role: "user", content: message }
        ];

        // Stream response
        const stream = await client.chat.completions.create({
            model: MODEL,
            messages: messages,
            stream: true,
        });

        res.setHeader('Content-Type', 'text/plain');
        res.setHeader('Transfer-Encoding', 'chunked');

        for await (const chunk of stream) {
            const text = chunk.choices[0]?.delta?.content || "";
            if (text) res.write(text);
        }
        res.end();

    } catch (error) {
        console.error("Feature Chat Error:", error);
        res.status(500).json({ error: "Feature execution failed" });
    }
});


import multer from 'multer';
import pdf from 'pdf-parse';
import * as cheerio from 'cheerio';
import fs from 'fs';

// Configure Multer for PDF Uploads
const upload = multer({ dest: 'uploads/' });

// --- TOOL HANDLERS ---

// 1. PDF Upload & Parse
router.post('/upload-pdf', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: "No file uploaded" });

        const dataBuffer = fs.readFileSync(req.file.path);
        const data = await pdf(dataBuffer);

        // Clean up uploaded file
        fs.unlinkSync(req.file.path);

        res.json({ text: data.text });
    } catch (error) {
        console.error("PDF Error:", error);
        res.status(500).json({ error: "Failed to parse PDF" });
    }
});

// 2. URL Summarizer (Scraping)
router.post('/summarize-url', async (req, res) => {
    const { url } = req.body;
    try {
        const response = await fetch(url);
        const html = await response.text();
        const $ = cheerio.load(html);

        // Extract text from paragraphs
        let text = "";
        $('p').each((i, el) => {
            text += $(el).text() + "\n";
        });

        // Limit text length for token limits
        text = text.substring(0, 5000);

        if (!text.trim()) return res.status(400).json({ error: "No readable text found" });

        // Send to AI for summary
        const messages = [
            { role: "system", content: "You are a summarization engine. Summarize the following web page content concisely." },
            { role: "user", content: text }
        ];

        const completion = await client.chat.completions.create({
            model: MODEL,
            messages: messages,
        });

        res.json({ summary: completion.choices[0].message.content });

    } catch (error) {
        console.error("URL Error:", error);
        res.status(500).json({ error: "Failed to fetch or parse URL" });
    }
});

// 3. Weather (Using wttr.in as strictly text/json source)
// Weather
router.get('/weather', async (req, res) => {
    const { city } = req.query;
    try {
        // wttr.in is a reliable public API for this without keys
        const response = await fetch(`https://wttr.in/${city}?format=%C+%t&m`);
        const text = await response.text();
        res.json({ weather: text.trim() });
    } catch (e) {
        res.status(500).json({ error: "Weather data unavailable" });
    }
});

// Currency
router.get('/currency', async (req, res) => {
    const { from, to, amount } = req.query;
    try {
        const response = await fetch(`https://open.er-api.com/v6/latest/${from}`);
        const data = await response.json();
        const rate = data.rates[to];
        if (!rate) throw new Error("Invalid currency code");
        const result = amount * rate;
        res.json({ result, rate });
    } catch (e) {
        res.status(500).json({ error: "Currency conversion failed" });
    }
});

// System Monitor (Basic)
router.get('/system', (req, res) => {
    try {
        const stats = {
            platform: os.platform(),
            arch: os.arch(),
            cpus: os.cpus().length,
            memory: {
                total: os.totalmem(),
                free: os.freemem(),
                usage: ((1 - os.freemem() / os.totalmem()) * 100).toFixed(1) + "%"
            },
            uptime: os.uptime()
        };
        res.json(stats);
    } catch (e) {
        res.status(500).json({ error: "System info unavailable" });
    }
});

export default router;
