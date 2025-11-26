import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { YAMLParser } from '$lib/server/yaml-parser';
import { SmartYAMLConverter } from '$lib/server/smart-yaml-converter';
import { ParserGenerator } from '../../../../../src/generation/parser-generator.js';
import { SerializerGenerator } from '../../../../../src/generation/serializer-generator.js';

export const POST: RequestHandler = async ({ request }) => {
	const startTime = Date.now();

	try {
		const { yaml: rawYaml, languages = ['typescript', 'python', 'go', 'rust'], includeDiff = false } = await request.json();

		if (!rawYaml || typeof rawYaml !== 'string') {
			return json(
				{ error: 'Invalid request: yaml field is required and must be a string' },
				{ status: 400 }
			);
		}

		// Smart preprocessing - try to fix/convert YAML before parsing
		const parser = new YAMLParser();
		const converter = new SmartYAMLConverter();
		let spec;
		let yaml = rawYaml;

		try {
			// Try to parse as-is first
			spec = parser.parse(rawYaml);
		} catch (parseError) {
			// Parsing failed - try smart conversion
			try {
				console.log('Initial parse failed, attempting smart conversion...');
				yaml = converter.convert(rawYaml);
				spec = parser.parse(yaml);
				console.log('Smart conversion successful!');
			} catch (conversionError) {
				// Both failed - return detailed error
				const errorMsg = parseError instanceof Error ? parseError.message : 'Parse error';
				const conversionMsg = conversionError instanceof Error ? conversionError.message : 'Conversion error';

				return json(
					{
						error: 'Failed to parse YAML specification',
						details: `Original error: ${errorMsg}. Conversion attempt also failed: ${conversionMsg}`,
						suggestion: 'Please check your YAML syntax. The input should define a protocol with name, port, and messages.',
						errors: [errorMsg, conversionMsg]
					},
					{ status: 400 }
				);
			}
		}

		// Generate code for requested languages
		const result: any = {
			generationTimeMs: 0,
			errors: []
		};

		try {
			// Import multi-language generators
			const { PythonGenerator } = await import('../../../../../src/generation/multi-language/python-generator.js');
			const { GoGenerator } = await import('../../../../../src/generation/multi-language/go-generator.js');
			const { RustGenerator } = await import('../../../../../src/generation/multi-language/rust-generator.js');

			// Create minimal language profiles
			const createProfile = (lang: 'python' | 'go' | 'rust') => ({
				config: {
					language: lang,
					displayName: lang.charAt(0).toUpperCase() + lang.slice(1),
					fileExtension: lang === 'python' ? '.py' : lang === 'go' ? '.go' : '.rs',
					namingConvention: lang === 'go' || lang === 'rust' ? 'snake_case' as const : 'snake_case' as const,
					errorHandling: lang === 'rust' ? 'result_types' as const : lang === 'go' ? 'error_returns' as const : 'exceptions' as const,
					asyncPattern: lang === 'python' ? 'async_await' as const : lang === 'go' ? 'goroutines' as const : 'async_await' as const,
					typeSystem: lang === 'python' ? 'duck' as const : 'nominal' as const,
					requiresTypeAnnotations: lang !== 'python',
					supportsNull: true
				},
				naming: {
					types: 'PascalCase' as const,
					functions: 'snake_case' as const,
					variables: 'snake_case' as const,
					constants: 'UPPER_SNAKE_CASE' as const,
					private: 'snake_case' as const,
					files: 'snake_case' as const
				},
				errorHandling: {
					throwError: lang === 'python' ? 'raise' : 'return Err',
					catchError: lang === 'python' ? 'except' : 'if err != nil',
					defineErrorType: 'class',
					addErrorContext: 'wrap',
					useResultTypes: lang === 'rust'
				},
				idioms: []
			});

			// Helper to format code according to Universal Formatting Rules
			const formatCode = (code: string): string => {
				// CRITICAL: Remove non-breaking spaces and other non-standard whitespace
				let formatted = code
					.replace(/\u00A0/g, ' ') // Replace non-breaking spaces with standard spaces
					.replace(/[\u2000-\u200B\u202F\u205F\u3000]/g, ' ') // Replace other unicode spaces
					.split('\n')
					.map(line => {
						// Convert tabs to 4 spaces (universal standard)
						const withSpaces = line.replace(/\t/g, '    ');
						// Trim trailing whitespace
						return withSpaces.trimEnd();
					})
					.join('\n')
					.trim();

				// Remove excessive blank lines (max 2 consecutive)
				formatted = formatted.replace(/\n{3,}/g, '\n\n');

				// Add single blank line before major sections
				// Before doc comments
				formatted = formatted.replace(/\n(\/\*\*|\/\/\/|\/\/!|""")/g, '\n\n$1');
				// Before class/struct/function definitions
				formatted = formatted.replace(/\n(export class |export interface |export function |class |def |func |type |pub fn |pub struct |impl )/g, '\n\n$1');
				// After closing braces at top level
				formatted = formatted.replace(/\n}\n\n(export |class |def |func |type |pub |impl |\/\/|\/\*)/g, '\n}\n\n$1');

				// Clean up any excessive spacing created
				formatted = formatted.replace(/\n{3,}/g, '\n\n');

				return formatted;
			};

			// Generate TypeScript (always available)
			if (languages.includes('typescript')) {
				const parserGen = new ParserGenerator();
				const serializerGen = new SerializerGenerator();

				const parserCode = parserGen.generate(spec);
				const serializerCode = serializerGen.generate(spec);

				// Combine and format
				result.typescript = formatCode(`${parserCode}\n\n${serializerCode}`);
			}

			// Generate Python
			if (languages.includes('python')) {
				const pythonGen = new PythonGenerator();
				const artifacts = await pythonGen.generate(spec, createProfile('python'));
				result.python = formatCode(`${artifacts.parser}\n\n${artifacts.serializer}`);
			}

			// Generate Go
			if (languages.includes('go')) {
				const goGen = new GoGenerator();
				const artifacts = await goGen.generate(spec, createProfile('go'));
				result.go = formatCode(`${artifacts.parser}\n\n${artifacts.serializer}`);
			}

			// Generate Rust
			if (languages.includes('rust')) {
				const rustGen = new RustGenerator();
				const artifacts = await rustGen.generate(spec, createProfile('rust'));
				result.rust = formatCode(`${artifacts.parser}\n\n${artifacts.serializer}`);
			}

			// Calculate generation time
			const duration = Date.now() - startTime;
			result.generationTimeMs = duration;

			// Check if we exceeded the 5 second target
			if (duration > 5000) {
				console.warn(`Generation took ${duration}ms, exceeding 5000ms target`);
			}

			// Handle diff if requested
			if (includeDiff) {
				// For now, no diff support - would need to store previous generation
				result.diff = null;
			}

			return json(result);

		} catch (genError) {
			console.error('Generation error details:', {
				error: genError,
				message: genError instanceof Error ? genError.message : 'Unknown error',
				stack: genError instanceof Error ? genError.stack : undefined
			});

			return json(
				{
					error: 'Code generation failed',
					details: genError instanceof Error ? genError.message : 'Generation error',
					stack: genError instanceof Error ? genError.stack : undefined,
					errors: [genError instanceof Error ? genError.message : 'Generation error'],
					generationTimeMs: Date.now() - startTime
				},
				{ status: 500 }
			);
		}

	} catch (error) {
		console.error('Top-level generation error:', {
			error,
			message: error instanceof Error ? error.message : 'Unknown',
			stack: error instanceof Error ? error.stack : undefined
		});

		return json(
			{
				error: error instanceof Error ? error.message : 'Generation failed',
				details: error instanceof Error ? error.stack : undefined,
				errors: [error instanceof Error ? error.message : 'Unknown error'],
				generationTimeMs: Date.now() - startTime
			},
			{ status: 500 }
		);
	}
};
