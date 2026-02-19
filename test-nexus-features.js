// Native fetch used (Node 18+)

const BASE_URL = 'http://localhost:5000/api/features';

async function testEndpoint(name, url, method = 'GET', body = null) {
    try {
        console.log(`Testing ${name}...`);
        const options = { method };
        if (body) {
            options.headers = { 'Content-Type': 'application/json' };
            options.body = JSON.stringify(body);
        }
        const res = await fetch(url, options);
        if (res.ok) {
            const data = await res.json();
            console.log(`✅ ${name} Success:`, JSON.stringify(data).substring(0, 100) + "...");
            return true;
        } else {
            console.error(`❌ ${name} Failed: ${res.status} ${res.statusText}`);
            const text = await res.text();
            console.error("Response:", text);
            return false;
        }
    } catch (e) {
        console.error(`❌ ${name} Error:`, e.message);
        return false;
    }
}

async function runTests() {
    console.log("Starting Feature Verification...");

    // 1. System Info
    await testEndpoint('System Info', `${BASE_URL}/system`);

    // 2. Weather (London)
    await testEndpoint('Weather', `${BASE_URL}/weather?city=London`);

    // 3. Currency (USD to EUR)
    await testEndpoint('Currency', `${BASE_URL}/currency?from=USD&to=EUR&amount=100`);

    // 4. Chat (Medical Mode)
    await testEndpoint('Medical Chat', `${BASE_URL}/chat`, 'POST', {
        message: "I have a headache.",
        mode: "medical"
    });

    // 5. URL Summary (Example)
    // Note: This might fail if the URL is blocked or too large, but testing logic
    // Using a reliable small page like example.com
    await testEndpoint('URL Summary', `${BASE_URL}/summarize-url`, 'POST', {
        url: "https://example.com"
    });

    console.log("Verification Complete.");
}

runTests();
