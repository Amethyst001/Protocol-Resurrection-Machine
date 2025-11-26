/**
 * API client utilities for workbench
 */

export async function validateSpec(yaml: string) {
	const response = await fetch('/api/validate', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ yaml })
	});
	
	if (!response.ok) {
		throw new Error(`Validation failed: ${response.statusText}`);
	}
	
	return response.json();
}

export async function generateCode(yaml: string, languages: string[], includeDiff = false) {
	const response = await fetch('/api/generate', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ yaml, languages, includeDiff })
	});
	
	if (!response.ok) {
		throw new Error(`Generation failed: ${response.statusText}`);
	}
	
	return response.json();
}

export async function runPBT(yaml: string, iterations = 100) {
	const response = await fetch('/api/test/pbt', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ yaml, iterations })
	});
	
	if (!response.ok) {
		throw new Error(`PBT execution failed: ${response.statusText}`);
	}
	
	return response.json();
}

export async function discoverProtocol(host: string, port: number, timeout = 10000) {
	const response = await fetch('/api/discover', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ host, port, timeout })
	});
	
	if (!response.ok) {
		throw new Error(`Discovery failed: ${response.statusText}`);
	}
	
	return response.json();
}
