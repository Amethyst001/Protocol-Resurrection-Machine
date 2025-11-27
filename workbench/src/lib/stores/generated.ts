import { writable } from 'svelte/store';

export interface GeneratedCode {
	typescript?: string;
	python?: string;
	go?: string;
	rust?: string;
	[key: string]: string | undefined;
}

export const generated = writable<GeneratedCode>({});
