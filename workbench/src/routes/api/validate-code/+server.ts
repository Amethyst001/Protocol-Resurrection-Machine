import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
    TypeScriptValidator,
    PythonValidator,
    GoValidator,
    RustValidator,
    type CodeValidationResult,
} from '$lib/server/code-validator';

export const POST: RequestHandler = async ({ request }) => {
    const startTime = Date.now();

    try {
        const { typescript, python, go, rust } = await request.json();

        const results: Record<string, CodeValidationResult> = {};

        // Validate sequentially in a fixed order for consistent UX
        // TypeScript first (fastest)
        if (typescript) {
            const validator = new TypeScriptValidator();
            results.typescript = await validator.validate(typescript);
        }

        // Python second
        if (python) {
            const validator = new PythonValidator();
            results.python = await validator.validate(python);
        }

        // Go third
        if (go) {
            const validator = new GoValidator();
            results.go = await validator.validate(go);
        }

        // Rust last (slowest - cargo check takes time)
        if (rust) {
            const validator = new RustValidator();
            results.rust = await validator.validate(rust);
        }

        const duration = Date.now() - startTime;

        return json({
            ...results,
            durationMs: duration,
        });
    } catch (error) {
        console.error('Code validation error:', error);
        return json(
            {
                error: error instanceof Error ? error.message : 'Code validation failed',
            },
            { status: 500 }
        );
    }
};
