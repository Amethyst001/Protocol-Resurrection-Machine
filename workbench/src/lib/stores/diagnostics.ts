import { writable } from 'svelte/store';

export interface Diagnostic {
	line: number;
	column: number;
	severity: 'error' | 'warning' | 'info';
	message: string;
}

/**
 * Store for validation diagnostics
 */
export const diagnostics = writable<Diagnostic[]>([]);
