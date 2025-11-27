import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { FingerprintDatabase } from '../../../../../src/discovery/fingerprint-database.js';
import { generateFingerprint } from '../../../../../src/discovery/fingerprint-generator.js';
import { YAMLParser } from '../../../../../src/core/yaml-parser.js';
import { readFileSync, readdirSync, existsSync } from 'fs';
import { join } from 'path';

// Singleton instance for the database
let fingerprintDb: FingerprintDatabase | null = null;

function getFingerprintDatabase(): FingerprintDatabase {
    if (fingerprintDb) {
        return fingerprintDb;
    }

    fingerprintDb = new FingerprintDatabase();
    const parser = new YAMLParser();

    try {
        // Load protocol specs from multiple directories
        const protocolDirs = [
            join(process.cwd(), 'static', 'presets'),      // Workbench presets
            join(process.cwd(), '..', 'protocols'),         // Main protocols folder
        ];

        for (const protocolsDir of protocolDirs) {
            if (existsSync(protocolsDir)) {
                const files = readdirSync(protocolsDir).filter(f => f.endsWith('.yaml'));

                for (const file of files) {
                    try {
                        const yamlContent = readFileSync(join(protocolsDir, file), 'utf-8');
                        const spec = parser.parse(yamlContent);
                        const fingerprint = generateFingerprint(spec);
                        fingerprintDb.add(fingerprint);
                    } catch (error) {
                        console.warn(`Failed to load fingerprint from ${file}:`, error);
                    }
                }
            }
        }
    } catch (error) {
        console.warn('Failed to initialize fingerprint database:', error);
    }

    return fingerprintDb;
}

export const GET: RequestHandler = async () => {
    try {
        const db = getFingerprintDatabase();
        return json(db.getAll());
    } catch (error) {
        return json(
            { error: error instanceof Error ? error.message : 'Failed to fetch fingerprints' },
            { status: 500 }
        );
    }
};

export const POST: RequestHandler = async ({ request }) => {
    try {
        const fingerprints = await request.json();
        const db = getFingerprintDatabase();

        if (Array.isArray(fingerprints)) {
            db.addMany(fingerprints);
        } else {
            db.add(fingerprints);
        }

        return json({ success: true, count: db.size() });
    } catch (error) {
        return json(
            { error: error instanceof Error ? error.message : 'Failed to add fingerprints' },
            { status: 500 }
        );
    }
};
