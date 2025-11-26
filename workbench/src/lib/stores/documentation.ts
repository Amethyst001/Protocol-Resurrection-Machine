import { writable } from 'svelte/store';

export interface Documentation {
    readme: string;
    apiDocs: string;
    usageGuide: string;
    examples: Record<string, string>;
}

export interface DocumentationState {
    docs: Documentation | null;
    isGenerating: boolean;
    error: string | null;
    lastUpdated: number;
}

const initialState: DocumentationState = {
    docs: null,
    isGenerating: false,
    error: null,
    lastUpdated: Date.now()
};

function createDocumentationStore() {
    const { subscribe, set, update } = writable<DocumentationState>(initialState);

    return {
        subscribe,
        setDocs: (docs: Documentation) => update(s => ({ ...s, docs, error: null, lastUpdated: Date.now() })),
        setGenerating: (isGenerating: boolean) => update(s => ({ ...s, isGenerating })),
        setError: (error: string) => update(s => ({ ...s, error, isGenerating: false })),
        reset: () => set(initialState)
    };
}

export const documentation = createDocumentationStore();
