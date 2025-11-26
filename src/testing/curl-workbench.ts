import http from 'http';
import { exampleVariations } from './data/variations.js';

async function testAllVariations() {
    console.log('Starting Workbench API Test (All Variations)...');
    let total = 0;
    let failed = 0;

    for (const [category, variations] of Object.entries(exampleVariations)) {
        console.log(`\nChecking Category: ${category}`);

        for (let i = 0; i < variations.length; i++) {
            const yaml = variations[i];
            const testName = `${category} variation ${i + 1}`;
            total++;

            await new Promise<void>((resolve) => {
                const data = JSON.stringify({
                    yaml: yaml,
                    languages: ['typescript', 'python', 'go', 'rust']
                });

                const options = {
                    hostname: 'localhost',
                    port: 5173,
                    path: '/api/generate',
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Content-Length': Buffer.byteLength(data)
                    }
                };

                const req = http.request(options, (res) => {
                    let body = '';
                    res.on('data', (chunk) => {
                        body += chunk;
                    });
                    res.on('end', () => {
                        if (res.statusCode === 200) {
                            process.stdout.write('.');
                        } else {
                            process.stdout.write('X');
                            failed++;
                            console.error(`\nFAILED: ${testName} (Status: ${res.statusCode})`);
                            console.error('Response:', body); // Error details enabled
                        }
                        resolve();
                    });
                });

                req.on('error', (e) => {
                    console.error(`\nERROR: ${testName} - ${e.message}`);
                    failed++;
                    resolve();
                });

                req.write(data);
                req.end();
            });
        }
    }

    console.log('\n\nSummary:');
    console.log(`Total: ${total}`);
    console.log(`Failed: ${failed}`);

    if (failed > 0) {
        process.exit(1);
    }
}

testAllVariations();
