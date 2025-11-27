import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { DiscoveryEngine } from '../../../../../src/discovery/discovery-engine.js';
import { FingerprintDatabase } from '../../../../../src/discovery/fingerprint-database.js';
import { generateFingerprint } from '../../../../../src/discovery/fingerprint-generator.js';
import { YAMLParser } from '../../../../../src/core/yaml-parser.js';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

export interface Packet {
	direction: 'sent' | 'received';
	timestamp: string;
	length: number;
	hex: string;
	parsed?: any;
	error?: string;
}

// Initialize fingerprint database with known protocols
let fingerprintDb: FingerprintDatabase | null = null;

function initializeFingerprintDatabase(): FingerprintDatabase {
	if (fingerprintDb) {
		return fingerprintDb;
	}

	fingerprintDb = new FingerprintDatabase();
	const parser = new YAMLParser();

	try {
		// Load protocol specs from multiple directories
		const protocolDirs = [
			join(process.cwd(), '..', 'protocols'),         // Main protocols folder
			join(process.cwd(), 'static', 'presets'),       // Workbench presets
		];

		let loadedCount = 0;
		for (const protocolsDir of protocolDirs) {
			try {
				console.log('[Fingerprint DB] Loading from:', protocolsDir);
				const files = readdirSync(protocolsDir).filter(f => f.endsWith('.yaml'));
				console.log('[Fingerprint DB] Found protocol files:', files);

				for (const file of files) {
					try {
						const yamlContent = readFileSync(join(protocolsDir, file), 'utf-8');
						const spec = parser.parse(yamlContent);
						const fingerprint = generateFingerprint(spec);
						fingerprintDb.add(fingerprint);
						loadedCount++;
						console.log(`[Fingerprint DB] Loaded ${file} -> ${fingerprint.protocol}`);
					} catch (error) {
						console.warn(`Failed to load fingerprint from ${file}:`, error);
					}
				}
			} catch (dirError) {
				console.warn(`[Fingerprint DB] Could not read directory ${protocolsDir}:`, dirError);
			}
		}

		console.log(`[Fingerprint DB] Successfully loaded ${loadedCount} fingerprints`);
	} catch (error) {
		console.warn('Failed to initialize fingerprint database:', error);
	}

	return fingerprintDb;
}

export const POST: RequestHandler = async ({ request }) => {
	const startTime = Date.now();

	try {
		const { host, port, timeout = 10000 } = await request.json();

		if (!host || typeof host !== 'string') {
			return json(
				{ error: 'Invalid request: host field is required and must be a string' },
				{ status: 400 }
			);
		}

		if (!port || typeof port !== 'number' || port < 1 || port > 65535) {
			return json(
				{ error: 'Invalid request: port must be a number between 1 and 65535' },
				{ status: 400 }
			);
		}

		// Initialize fingerprint database
		const db = initializeFingerprintDatabase();

		// Create discovery engine
		const engine = new DiscoveryEngine(db);

		try {
			// Perform discovery with timeout
			const discoveryTimeout = Math.min(timeout, 10000); // Cap at 10 seconds
			const result = await Promise.race([
				engine.discover(host, port, discoveryTimeout),
				new Promise<never>((_, reject) =>
					setTimeout(() => reject(new Error('Discovery timeout')), discoveryTimeout)
				)
			]);

			const duration = Date.now() - startTime;

			// Check if we exceeded the 10 second target
			if (duration > 10000) {
				console.warn(`Discovery took ${duration}ms, exceeding 10000ms target`);
			}

			// Format packets for response
			const packets: Packet[] = result.packets.map(p => ({
				direction: p.direction,
				timestamp: p.timestamp,
				length: p.length,
				hex: p.hex,
				parsed: p.parsed,
				error: p.error
			}));

			// Build response
			const response: any = {
				packets,
				suggestions: result.suggestions || [],
				durationMs: duration
			};

			// Add identified protocol if found
			if (result.identified) {
				response.identified = {
					protocol: result.identified.protocol,
					confidence: result.confidence,
					specPath: result.identified.specPath,
					matchedFeatures: result.identified.matchedFeatures
				};
			}

			return json(response);

		} catch (discoveryError) {
			const duration = Date.now() - startTime;

			return json({
				packets: [],
				suggestions: [
					discoveryError instanceof Error ? discoveryError.message : 'Discovery failed',
					'Check if the host is reachable',
					'Verify the port number is correct',
					'Check if a firewall is blocking the connection'
				],
				durationMs: duration,
				error: discoveryError instanceof Error ? discoveryError.message : 'Discovery failed'
			});
		}

	} catch (error) {
		return json(
			{
				error: error instanceof Error ? error.message : 'Discovery failed',
				packets: [],
				suggestions: ['An unexpected error occurred during discovery'],
				durationMs: Date.now() - startTime
			},
			{ status: 500 }
		);
	}
};
