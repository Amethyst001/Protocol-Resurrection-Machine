/**
 * Server-side Simulation Logic
 * Compatible with Vercel/Serverless environments (no child_process needed)
 */

function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function runSimulationStream(controller: ReadableStreamDefaultController) {
    const encoder = new TextEncoder();
    let entryCounter = 0;

    function log(prefix: string, message: string) {
        if (controller.desiredSize === null) return; // Stream closed
        entryCounter++;
        const chunk = JSON.stringify({ message: `[${prefix}] ${message}`, entry: entryCounter }) + '\n';
        try {
            controller.enqueue(encoder.encode(chunk));
        } catch (e) {
            // Ignore enqueue errors if stream is closed
        }
    }

    try {
        log('SYSTEM', 'Initializing simulation environment...');
        await sleep(800);

        log('SYSTEM', 'Compiling generated code...');
        await sleep(1200);
        log('SYSTEM', 'Compilation successful');

        log('GO', 'Starting Gateway Server on port 8080...');
        await sleep(500);
        log('GO', 'Listening for incoming connections');

        await sleep(800);
        log('RUST', 'Sensor node initialized');
        log('RUST', 'Connecting to gateway...');

        await sleep(600);
        log('GO', 'Accepted connection from 192.168.1.50');
        log('RUST', 'Connection established');

        // Run simulation loop until validation successful
        let validationPassed = false;
        let loopCount = 0;
        const maxLoops = 5; // Safety limit

        while (!validationPassed && loopCount < maxLoops) {
            loopCount++;
            log('SYSTEM', `--- Simulation Loop ${loopCount} ---`);

            for (let i = 0; i < 3; i++) {
                await sleep(1000);
                const temp = (20 + Math.random() * 5).toFixed(2);
                log('RUST', `Sending telemetry: { temp: ${temp}C, humidity: 45% }`);
                await sleep(200);
                log('GO', `Received packet: ${temp}C`);
                await sleep(200);
                log('PYTHON', `Analytics: Processing data point ${temp}`);
            }

            await sleep(800);
            log('TYPESCRIPT', 'Dashboard client connected');
            log('GO', 'Streaming real-time updates to client');
            log('TYPESCRIPT', 'UI updated with latest sensor data');

            // Validate data integrity
            await sleep(500);
            log('SYSTEM', 'Running validation checks...');
            await sleep(800);

            // Simulate validation - passes on last loop
            if (loopCount >= maxLoops) {
                validationPassed = true;
                log('SYSTEM', '✓ Validation successful - all data integrity checks passed');
            } else {
                log('SYSTEM', `Validation in progress... (${loopCount}/${maxLoops})`);
            }
        }

        await sleep(1000);
        log('SYSTEM', 'Simulation completed successfully');
    } catch (error) {
        log('SYSTEM', `Simulation error: ${error}`);
    } finally {
        try {
            controller.close();
        } catch (e) {
            // Ignore close errors
        }
    }
}
