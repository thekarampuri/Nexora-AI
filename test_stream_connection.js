import fetch from 'node-fetch';

async function testStream() {
    try {
        console.log("Testing connection to http://localhost:5000/api/chat...");
        const response = await fetch('http://localhost:5000/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: "Hello" })
        });

        console.log(`Status: ${response.status} ${response.statusText}`);

        if (!response.ok) {
            const text = await response.text();
            console.error("Error Body:", text);
            return;
        }

        console.log("Headers:", response.headers.raw());

        // consume stream
        for await (const chunk of response.body) {
            console.log("Chunk:", chunk.toString());
        }

    } catch (error) {
        console.error("Connection Failed:", error);
    }
}

testStream();
