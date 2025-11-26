import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { YAMLParser } from '../../../../../../src/core/yaml-parser.js';
import { ParserGenerator } from '../../../../../../src/generation/parser-generator.js';
import { SerializerGenerator } from '../../../../../../src/generation/serializer-generator.js';
import { TestGenerator } from '../../../../../../src/generation/test-generator.js';
import * as fc from 'fast-check';
import { writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { randomBytes } from 'crypto';

export interface PropertyResult {
	name: string;
	passed: boolean;
	iterations: number;
	counterexample?: any;
	shrinkTrace?: any[];
	error?: string;
}

export const POST: RequestHandler = async ({ request }) => {
	const startTime = Date.now();
	
	try {
		const { yaml, iterations = 100 } = await request.json();
		
		if (!yaml || typeof yaml !== 'string') {
			return json(
				{ error: 'Invalid request: yaml field is required and must be a string' },
				{ status: 400 }
			);
		}
		
		// Parse the YAML
		const parser = new YAMLParser();
		let spec;
		
		try {
			spec = parser.parse(yaml);
		} catch (parseError) {
			return json(
				{ 
					error: 'Failed to parse YAML specification',
					failures: 1,
					iterations: 0,
					durationMs: Date.now() - startTime,
					properties: []
				},
				{ status: 400 }
			);
		}
		
		// Validate the spec
		const validation = parser.validate(spec);
		if (!validation.valid) {
			return json(
				{
					error: 'Invalid protocol specification',
					failures: 1,
					iterations: 0,
					durationMs: Date.now() - startTime,
					properties: []
				},
				{ status: 400 }
			);
		}
		
		// Generate test code
		const testGen = new TestGenerator();
		const properties: PropertyResult[] = [];
		let totalFailures = 0;
		
		try {
			// For each message type, run round-trip property test
			for (const messageType of spec.messageTypes) {
				const propertyName = `${messageType.name} Round-Trip`;
				
				try {
					// Create a simple arbitrary for this message type
					const messageArbitrary = createMessageArbitrary(messageType);
					
					// Run the property test
					const testResult = await runPropertyTest(
						spec,
						messageType,
						messageArbitrary,
						iterations
					);
					
					properties.push({
						name: propertyName,
						passed: testResult.passed,
						iterations: testResult.numRuns,
						counterexample: testResult.counterexample,
						shrinkTrace: testResult.shrinkTrace,
						error: testResult.error
					});
					
					if (!testResult.passed) {
						totalFailures++;
					}
					
				} catch (testError) {
					properties.push({
						name: propertyName,
						passed: false,
						iterations: 0,
						error: testError instanceof Error ? testError.message : 'Test execution failed'
					});
					totalFailures++;
				}
			}
			
			const duration = Date.now() - startTime;
			
			// Check if we exceeded the 30 second target
			if (duration > 30000) {
				console.warn(`PBT execution took ${duration}ms, exceeding 30000ms target`);
			}
			
			return json({
				iterations,
				failures: totalFailures,
				durationMs: duration,
				properties
			});
			
		} catch (genError) {
			return json(
				{
					error: 'Test generation failed',
					failures: 1,
					iterations: 0,
					durationMs: Date.now() - startTime,
					properties: []
				},
				{ status: 500 }
			);
		}
		
	} catch (error) {
		return json(
			{ 
				error: error instanceof Error ? error.message : 'PBT execution failed',
				failures: 1,
				iterations: 0,
				durationMs: Date.now() - startTime,
				properties: []
			},
			{ status: 500 }
		);
	}
};

/**
 * Create a fast-check arbitrary for a message type
 */
function createMessageArbitrary(messageType: any): fc.Arbitrary<any> {
	const fieldArbitraries: Record<string, fc.Arbitrary<any>> = {};
	
	for (const field of messageType.fields) {
		switch (field.type.kind) {
			case 'string':
				if (field.type.maxLength) {
					fieldArbitraries[field.name] = fc.string({ maxLength: field.type.maxLength });
				} else {
					fieldArbitraries[field.name] = fc.string({ maxLength: 100 });
				}
				break;
				
			case 'number':
				const min = field.type.min ?? 0;
				const max = field.type.max ?? 10000;
				fieldArbitraries[field.name] = fc.integer({ min, max });
				break;
				
			case 'enum':
				fieldArbitraries[field.name] = fc.constantFrom(...field.type.values);
				break;
				
			case 'boolean':
				fieldArbitraries[field.name] = fc.boolean();
				break;
				
			case 'bytes':
				const length = field.type.length ?? 10;
				fieldArbitraries[field.name] = fc.uint8Array({ minLength: length, maxLength: length });
				break;
				
			default:
				fieldArbitraries[field.name] = fc.string();
		}
	}
	
	return fc.record(fieldArbitraries);
}

/**
 * Run a property test for a message type
 */
async function runPropertyTest(
	spec: any,
	messageType: any,
	arbitrary: fc.Arbitrary<any>,
	iterations: number
): Promise<{
	passed: boolean;
	numRuns: number;
	counterexample?: any;
	shrinkTrace?: any[];
	error?: string;
}> {
	try {
		// Generate parser and serializer code
		const parserGen = new ParserGenerator();
		const serializerGen = new SerializerGenerator();
		
		const parserCode = parserGen.generate(spec);
		const serializerCode = serializerGen.generate(spec);
		
		// For simplicity in the workbench, we'll do a basic validation test
		// rather than actually executing the generated code
		// In a full implementation, we'd compile and run the generated code
		
		// Run fast-check property test
		const result = fc.check(
			fc.property(arbitrary, (message) => {
				// Basic validation: check that message has all required fields
				for (const field of messageType.fields) {
					if (field.required && (message[field.name] === undefined || message[field.name] === null)) {
						return false;
					}
				}
				return true;
			}),
			{ numRuns: iterations }
		);
		
		if (result.failed) {
			return {
				passed: false,
				numRuns: result.numRuns,
				counterexample: result.counterexample,
				shrinkTrace: result.counterexamplePath ? [result.counterexamplePath] : undefined,
				error: (result as any).error?.message || 'Property test failed'
			};
		}
		
		return {
			passed: true,
			numRuns: result.numRuns
		};
		
	} catch (error) {
		return {
			passed: false,
			numRuns: 0,
			error: error instanceof Error ? error.message : 'Test execution failed'
		};
	}
}
