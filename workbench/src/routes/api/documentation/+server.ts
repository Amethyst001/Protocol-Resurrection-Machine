import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { YAMLParser } from '../../../../../src/core/yaml-parser.js';
import { DocumentationGenerator } from '../../../../../src/documentation/documentation-generator.js';

export const POST: RequestHandler = async ({ request }) => {
    try {
        const { yaml } = await request.json();

        if (!yaml || typeof yaml !== 'string') {
            return json(
                { error: 'Invalid request: yaml field is required' },
                { status: 400 }
            );
        }

        const parser = new YAMLParser();
        const spec = parser.parse(yaml);

        const generator = new DocumentationGenerator();

        // Generate all documentation
        const docs = generator.generate(spec);

        return json({
            readme: docs.readme,
            apiDocs: docs.apiReference,
            usageGuide: docs.examples.find(e => e.language === 'typescript')?.code || 'No usage guide available',
            examples: docs.examples.reduce((acc, ex) => ({ ...acc, [ex.language]: ex.code }), {})
        });

    } catch (error) {
        return json(
            { error: error instanceof Error ? error.message : 'Failed to generate documentation' },
            { status: 500 }
        );
    }
};
