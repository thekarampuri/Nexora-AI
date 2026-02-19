const https = require('https');
require('dotenv').config();
const API_KEY = process.env.VITE_GEMINI_API_KEY;

if (!API_KEY) {
    console.error("Error: VITE_GEMINI_API_KEY is missing in .env");
    process.exit(1);
}

https.get(`https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`, (res) => {
    let data = '';
    res.on('data', d => data += d);
    res.on('end', () => {
        const json = JSON.parse(data);
        console.log('--- ALL AVAILABLE MODELS ---');
        json.models?.forEach(m => console.log(m.name));
    });
});
