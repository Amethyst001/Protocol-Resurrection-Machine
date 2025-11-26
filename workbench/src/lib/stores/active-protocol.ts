import { derived } from 'svelte/store';
import { spec } from './spec';

export const activeProtocol = derived(spec, ($spec) => {
    if (!$spec) return { name: 'Unknown', spec: {} };

    try {
        // Simple regex parsing for name, description, and encoding
        // We use \s* at the start to handle indentation (nested under protocol:)
        const nameMatch = $spec.match(/^\s*name:\s*(.+)$/m);
        const descMatch = $spec.match(/^\s*description:\s*(.+)$/m);
        const encodingMatch = $spec.match(/^\s*encoding:\s*(.+)$/m);

        // Remove quotes if present
        const clean = (str: string) => str.replace(/^["']|["']$/g, '').trim();

        return {
            name: nameMatch ? clean(nameMatch[1]) : 'Unknown Protocol',
            spec: {
                description: descMatch ? clean(descMatch[1]) : '',
                encoding: encodingMatch ? clean(encodingMatch[1]) : 'text'
            }
        };
    } catch (e) {
        console.error('Error parsing protocol spec:', e);
        return { name: 'Error', spec: {} };
    }
});
