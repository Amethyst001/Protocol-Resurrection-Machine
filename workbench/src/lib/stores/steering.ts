import { writable } from 'svelte/store';

export interface SteeringDocument {
    id: string;
    name: string;
    content: string;
    isActive: boolean;
    description: string;
}

export interface SteeringState {
    documents: SteeringDocument[];
    isLoading: boolean;
    error: string | null;
    lastUpdated: number;
}

const initialState: SteeringState = {
    documents: [],
    isLoading: false,
    error: null,
    lastUpdated: Date.now()
};

function createSteeringStore() {
    const { subscribe, set, update } = writable<SteeringState>(initialState);

    return {
        subscribe,
        setDocuments: (documents: SteeringDocument[]) => update(s => ({ ...s, documents, error: null, lastUpdated: Date.now() })),
        setLoading: (isLoading: boolean) => update(s => ({ ...s, isLoading })),
        setError: (error: string) => update(s => ({ ...s, error, isLoading: false })),
        toggleDocument: (id: string) => update(s => ({
            ...s,
            documents: s.documents.map(d => d.id === id ? { ...d, isActive: !d.isActive } : d)
        })),
        reset: () => set(initialState)
    };
}

export const steering = createSteeringStore();
