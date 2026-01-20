const https = require('https');
const API_KEY = 'AIzaSyDnSlLuK2p1NgKXsYoODcu1l19kBLcRfmg';

https.get(`https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`, (res) => {
    let data = '';
    res.on('data', d => data += d);
    res.on('end', () => {
        const json = JSON.parse(data);
        console.log('--- ALL AVAILABLE MODELS ---');
        json.models?.forEach(m => console.log(m.name));
    });
});
