import { writable } from 'svelte/store';

export interface PBTResult {
	iterations: number;
	failures: number;
	durationMs: number;
	properties: Array<{
		name: string;
		passed: boolean;
		counterexample?: any;
	}>;
}

export const pbtResults = writable<PBTResult | null>(null);
