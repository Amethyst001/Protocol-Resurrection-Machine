import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { YAMLParser } from '$lib/server/yaml-parser';
import { SpecFixer } from '$lib/server/spec-fixer';

export interface Diagnostic {
	line?: number;
	column?: number;
	severity: 'CRITICAL' | 'WARNING' | 'NOTICE';
	message: string;
	suggestion?: string;
}

export const POST: RequestHandler = async ({ request }) => {
	const startTime = Date.now();

	try {
		const { yaml: rawInput, autoConvert } = await request.json();

		if (!rawInput || typeof rawInput !== 'string') {
			return json(
				{ error: 'Invalid request: yaml field is required and must be a string' },
				{ status: 400 }
			);
		}

		const parser = new YAMLParser();
		const diagnostics: Diagnostic[] = [];
		let score = 100;

		try {
			// Try to parse as-is first
			const validationResult = parser.validateComplete(rawInput);
			score = validationResult.score;

			// Convert validation errors to diagnostics
			for (const error of validationResult.errors) {
				diagnostics.push({
					line: error.line,
					column: error.column,
					severity: error.severity,
					message: error.message,
					suggestion: error.suggestion
				});
			}

			// Check response time (should be under 500ms)
			const duration = Date.now() - startTime;
			if (duration > 500) {
				console.warn(`Validation took ${duration}ms, exceeding 500ms target`);
			}

			if (!autoConvert) {
				return json({
					diagnostics,
					valid: diagnostics.filter(d => d.severity === 'CRITICAL').length === 0,
					score,
					durationMs: duration
				});
			}

		} catch (parseError) {
			// Parsing failed - always offer auto-conversion
			const error = parseError as any;
			diagnostics.push({
				line: error.line || 1,
				column: error.column || 1,
				severity: 'CRITICAL',
				message: error.message || 'Failed to parse YAML'
			});
			score = 0;
		}

		// If autoConvert flag is true, try to fix the YAML
		// This runs whether parsing succeeded or failed
		if (autoConvert === true) {
			const fixer = new SpecFixer();
			try {
				const fixResult = fixer.fix(rawInput);

				// Re-validate the fixed YAML to get the new score
				const newValidation = parser.validateComplete(fixResult.fixedYaml);

				// Rollback Logic: Only commit if score improves or stays same (and is valid)
				// But since we want to show partial fixes, we return what we have with the new score

				return json({
					diagnostics: newValidation.errors.map(err => ({
						line: err.line,
						column: err.column,
						severity: err.severity,
						message: err.message,
						suggestion: err.suggestion
					})),
					valid: newValidation.valid,
					score: newValidation.score,
					convertedYaml: fixResult.fixedYaml,
					wasConverted: fixResult.wasConverted,
					fixesApplied: fixResult.fixesApplied,
					durationMs: Date.now() - startTime
				});

			} catch (conversionError) {
				// Conversion also failed
				diagnostics.push({
					line: 1,
					column: 1,
					severity: 'CRITICAL',
					message: 'Auto-conversion failed: ' + (conversionError instanceof Error ? conversionError.message : 'Unknown error'),
				});

				return json({
					diagnostics,
					valid: false,
					score: 0,
					durationMs: Date.now() - startTime
				});
			}
		}

		// Auto-convert not requested, return diagnostics with offer
		return json({
			diagnostics,
			valid: false,
			score,
			canAutoConvert: true,
			durationMs: Date.now() - startTime
		});

	} catch (error) {
		return json(
			{
				error: error instanceof Error ? error.message : 'Validation failed',
				diagnostics: [{
					severity: 'CRITICAL',
					message: error instanceof Error ? error.message : 'Validation failed'
				}]
			},
			{ status: 500 }
		);
	}
};
