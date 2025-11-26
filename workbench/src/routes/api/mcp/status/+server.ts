import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
    // For the hackathon demo, we return a mock status
    // In a real implementation, this would check the actual running server process
    return json({
        isRunning: false,
        tools: []
    });
};
