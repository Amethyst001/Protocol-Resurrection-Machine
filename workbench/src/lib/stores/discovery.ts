import { writable } from 'svelte/store';

export interface ProtocolFingerprint {
    protocol: string;
    defaultPort: number;
    initialHandshake?: string;
    responsePatterns: Pattern[];
    probes: Probe[];
    behaviorSignatures?: BehaviorSignature[];
}

export interface Pattern {
    type: 'exact' | 'prefix' | 'regex' | 'length';
    value: string | number;
    weight: number;
    description?: string;
}

export interface Probe {
    name: string;
    protocol: string;
    payload: string; // base64 encoded in UI
    expectedResponse?: Pattern;
    timeout: number;
}

export interface BehaviorSignature {
    type: 'behavior';
    description: string;
    weight: number;
}

export interface Packet {
    direction: 'sent' | 'received';
    timestamp: string;
    length: number;
    hex: string;
    parsed?: any;
    error?: string;
}

export interface MatchResult {
    protocol: string;
    confidence: number;
    matchedFeatures: string[];
    specPath: string;
}

export interface DiscoveryResult {
    packets: Packet[];
    identified: MatchResult | null;
    suggestions: string[];
    durationMs: number;
    error?: string;
}

export interface DiscoveryState {
    isDiscovering: boolean;
    result: DiscoveryResult | null;
    fingerprints: ProtocolFingerprint[];
    error: string | null;
}

const initialState: DiscoveryState = {
    isDiscovering: false,
    result: null,
    fingerprints: [],
    error: null
};

function createDiscoveryStore() {
    const { subscribe, set, update } = writable<DiscoveryState>(initialState);

    return {
        subscribe,
        setDiscovering: (isDiscovering: boolean) => update(s => ({ ...s, isDiscovering })),
        setResult: (result: DiscoveryResult) => update(s => ({ ...s, result, error: null })),
        setError: (error: string) => update(s => ({ ...s, error, isDiscovering: false })),
        setFingerprints: (fingerprints: ProtocolFingerprint[]) => update(s => ({ ...s, fingerprints })),
        reset: () => set(initialState)
    };
}

export const discovery = createDiscoveryStore();
