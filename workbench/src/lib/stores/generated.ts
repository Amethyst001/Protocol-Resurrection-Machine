import { writable } from 'svelte/store';

export interface GeneratedCode {
	typescript?: string;
	python?: string;
	go?: string;
	rust?: string;
}

export const generated = writable<GeneratedCode>({});
