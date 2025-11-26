import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import * as fs from 'fs';
import * as path from 'path';

export const GET: RequestHandler = async () => {
    try {
        const steeringDir = path.resolve('.kiro/steering');

        if (!fs.existsSync(steeringDir)) {
            return json({ documents: [] });
        }

        const files = fs.readdirSync(steeringDir)
            .filter(file => file.endsWith('.md'));

        const documents = files.map(file => {
            const content = fs.readFileSync(path.join(steeringDir, file), 'utf-8');
            const name = file.replace(/-/g, ' ').replace('.md', '');

            // Extract description from first paragraph or use filename
            const lines = content.split('\n');
            let description = `Steering document for ${name}`;
            for (const line of lines) {
                if (line.trim() && !line.startsWith('#') && !line.startsWith('import')) {
                    description = line.trim().substring(0, 100) + (line.length > 100 ? '...' : '');
                    break;
                }
            }

            return {
                id: file,
                name: name.charAt(0).toUpperCase() + name.slice(1),
                content,
                description,
                isActive: true // Default to active for visualization
            };
        });

        return json({ documents });

    } catch (error) {
        return json(
            { error: error instanceof Error ? error.message : 'Failed to load steering documents' },
            { status: 500 }
        );
    }
};
