import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { runSimulationStream } from '$lib/server/simulation';

export const POST: RequestHandler = async () => {
    // Create a readable stream for the response
    const stream = new ReadableStream({
        start(controller) {
            // Run simulation directly in the stream controller
            runSimulationStream(controller);
        }
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'application/x-ndjson',
            'Cache-Control': 'no-cache'
        }
    });
};
