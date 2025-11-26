/**
 * Web Worker for heavy validation computations
 * This offloads validation work from the main thread
 */

interface ValidationMessage {
	type: 'validate';
	yaml: string;
}

interface ValidationResult {
	type: 'result';
	diagnostics: Array<{
		line: number;
		column: number;
		severity: 'error' | 'warning' | 'info';
		message: string;
	}>;
}

self.onmessage = async (event: MessageEvent<ValidationMessage>) => {
	const { type, yaml } = event.data;

	if (type === 'validate') {
		try {
			// In a real implementation, this would call the validation API
			// For now, we'll just simulate the work
			const response = await fetch('/api/validate', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ yaml })
			});

			const result = await response.json();

			const validationResult: ValidationResult = {
				type: 'result',
				diagnostics: result.diagnostics || []
			};

			self.postMessage(validationResult);
		} catch (error) {
			self.postMessage({
				type: 'result',
				diagnostics: [{
					line: 1,
					column: 1,
					severity: 'error',
					message: 'Validation failed: ' + (error instanceof Error ? error.message : 'Unknown error')
				}]
			});
		}
	}
};

export {};
