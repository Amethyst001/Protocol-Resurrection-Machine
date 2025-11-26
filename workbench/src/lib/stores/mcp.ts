import { writable } from 'svelte/store';

export interface MCPTool {
    name: string;
    description: string;
    inputSchema: Record<string, any>;
}

export interface MCPStatus {
    isRunning: boolean;
    port?: number;
    tools: MCPTool[];
    error?: string;
}

export interface MCPState {
    status: MCPStatus;
    generatedCode: string | null;
    isGenerating: boolean;
    lastUpdated: number;
}

const initialState: MCPState = {
    status: {
        isRunning: false,
        tools: []
    },
    generatedCode: null,
    isGenerating: false,
    lastUpdated: Date.now()
};

function createMCPStore() {
    const { subscribe, set, update } = writable<MCPState>(initialState);

    return {
        subscribe,
        setStatus: (status: MCPStatus) => update(s => ({ ...s, status, lastUpdated: Date.now() })),
        setGeneratedCode: (code: string) => update(s => ({ ...s, generatedCode: code })),
        setGenerating: (isGenerating: boolean) => update(s => ({ ...s, isGenerating })),
        reset: () => set(initialState)
    };
}

export const mcp = createMCPStore();
