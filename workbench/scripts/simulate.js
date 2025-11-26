/**
 * Simulation Script
 * Mocks a multi-language network simulation with structured logs
 */

function log(prefix, message) {
    // Output as JSON for the frontend to parse
    console.log(JSON.stringify({ message: `[${prefix}] ${message}` }));
}

async function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runSimulation() {
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

    for (let i = 0; i < 3; i++) {
        await sleep(1000);
        const temp = (20 + Math.random() * 5).toFixed(2);
        log('RUST', `Sending telemetry: { temp: ${temp}C, humidity: 45% }`);
        await sleep(200);
        log('GO', `Received packet: ${temp}C`);
        await sleep(200);
        log('PYTHON', `Analytics: Processing data point ${temp}`);
    }

    await sleep(1000);
    log('TYPESCRIPT', 'Dashboard client connected');
    log('GO', 'Streaming real-time updates to client');
    log('TYPESCRIPT', 'UI updated with latest sensor data');

    await sleep(1500);
    log('SYSTEM', 'Simulation completed successfully');
}

runSimulation();
