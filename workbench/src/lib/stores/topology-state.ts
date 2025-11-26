import { writable } from 'svelte/store';

export type ActiveNode = 'typescript' | 'python' | 'go' | 'rust' | null;

export const topologyState = writable<ActiveNode>(null);
