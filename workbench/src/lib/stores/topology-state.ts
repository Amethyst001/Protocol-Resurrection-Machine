import { writable } from 'svelte/store';
import type { Node, Edge } from '@xyflow/svelte';

export type ActiveNode = 'typescript' | 'python' | 'go' | 'rust' | null;
export const topologyState = writable<ActiveNode>(null);

// Scenario Types
export type ScenarioId = 'iot' | 'banking' | 'chat' | 'demo';

interface ScenarioLayout {
    nodes: Node[];
    edges: Edge[];
}

// 1. IoT Sensor Network (Dendrite)
const iotLayout: ScenarioLayout = {
    nodes: [
        { id: 'rust-1', type: 'glass', position: { x: 0, y: 0 }, data: { label: 'Sensor 1 (Rust)', language: 'rust', active: false } },
        { id: 'rust-2', type: 'glass', position: { x: 0, y: 100 }, data: { label: 'Sensor 2 (Rust)', language: 'rust', active: false } },
        { id: 'rust-3', type: 'glass', position: { x: 0, y: 200 }, data: { label: 'Sensor 3 (Rust)', language: 'rust', active: false } },
        { id: 'go-gateway', type: 'glass', position: { x: 300, y: 100 }, data: { label: 'Gateway (Go)', language: 'go', active: false } },
        { id: 'python-dash', type: 'glass', position: { x: 600, y: 100 }, data: { label: 'Dashboard (Python)', language: 'python', active: false } }
    ],
    edges: [
        { id: 'e-s1-g', source: 'rust-1', target: 'go-gateway', animated: false, style: 'stroke: #475569; stroke-width: 2px;' },
        { id: 'e-s2-g', source: 'rust-2', target: 'go-gateway', animated: false, style: 'stroke: #475569; stroke-width: 2px;' },
        { id: 'e-s3-g', source: 'rust-3', target: 'go-gateway', animated: false, style: 'stroke: #475569; stroke-width: 2px;' },
        { id: 'e-g-d', source: 'go-gateway', target: 'python-dash', animated: false, style: 'stroke: #475569; stroke-width: 2px;' }
    ]
};

// 2. Legacy Banking (Pipeline) - Converted to Horizontal for better visibility
const bankingLayout: ScenarioLayout = {
    nodes: [
        { id: 'webapp', type: 'glass', position: { x: 0, y: 100 }, data: { label: 'Web App (TS)', language: 'typescript', active: false } },
        { id: 'adapter', type: 'glass', position: { x: 300, y: 100 }, data: { label: 'Adapter (Go)', language: 'go', active: false } },
        { id: 'mainframe', type: 'glass', position: { x: 600, y: 100 }, data: { label: 'Mainframe (COBOL)', language: 'cobol', active: false } }
    ],
    edges: [
        { id: 'e-w-a', source: 'webapp', target: 'adapter', animated: false, style: 'stroke: #475569; stroke-width: 2px;' },
        { id: 'e-a-m', source: 'adapter', target: 'mainframe', animated: false, style: 'stroke: #475569; stroke-width: 2px;' }
    ]
};

// 3. Secure Chat (Mesh) - Reorganized for Left-to-Right flow
const chatLayout: ScenarioLayout = {
    nodes: [
        { id: 'client-a', type: 'glass', position: { x: 0, y: 100 }, data: { label: 'Client A (TS)', language: 'typescript', active: false } },
        { id: 'server', type: 'glass', position: { x: 300, y: 100 }, data: { label: 'Server (Go)', language: 'go', active: false } },
        { id: 'client-b', type: 'glass', position: { x: 600, y: 0 }, data: { label: 'Client B (TS)', language: 'typescript', active: false } },
        { id: 'bot', type: 'glass', position: { x: 600, y: 200 }, data: { label: 'AI Bot (Python)', language: 'python', active: false } }
    ],
    edges: [
        { id: 'e-a-s', source: 'client-a', target: 'server', animated: false, style: 'stroke: #475569; stroke-width: 2px;' },
        { id: 'e-s-b', source: 'server', target: 'client-b', animated: false, style: 'stroke: #475569; stroke-width: 2px;' },
        { id: 'e-s-bot', source: 'server', target: 'bot', animated: false, style: 'stroke: #475569; stroke-width: 2px;' }
    ]
};

// 4. Demo (Generic)
const demoLayout: ScenarioLayout = {
    nodes: [
        { id: 'client', type: 'glass', position: { x: 0, y: 100 }, data: { label: 'Client (TS)', language: 'typescript', active: false } },
        { id: 'server', type: 'glass', position: { x: 400, y: 100 }, data: { label: 'Server (Go)', language: 'go', active: false } }
    ],
    edges: [
        { id: 'e-c-s', source: 'client', target: 'server', animated: false, style: 'stroke: #475569; stroke-width: 2px;' }
    ]
};

export function getLayout(scenario: ScenarioId): ScenarioLayout {
    switch (scenario) {
        case 'iot': return JSON.parse(JSON.stringify(iotLayout));
        case 'banking': return JSON.parse(JSON.stringify(bankingLayout));
        case 'chat': return JSON.parse(JSON.stringify(chatLayout));
        default: return JSON.parse(JSON.stringify(demoLayout));
    }
}

// Animation Helper Types
export type AnimationStep = {
    activeNodes: string[];
    activeEdges: string[];
    consoleMessage?: string;
    duration: number;
};

export function getAnimationSequence(scenario: ScenarioId): AnimationStep[] {
    switch (scenario) {
        case 'iot':
            return [
                {
                    activeNodes: ['rust-1', 'rust-2', 'rust-3'],
                    activeEdges: ['e-s1-g', 'e-s2-g', 'e-s3-g'],
                    consoleMessage: '[RUST] Reading Sensors...',
                    duration: 1000
                },
                {
                    activeNodes: ['go-gateway'],
                    activeEdges: ['e-g-d'],
                    consoleMessage: '[GO] Aggregating Packets...',
                    duration: 1000
                },
                {
                    activeNodes: ['python-dash'],
                    activeEdges: [],
                    consoleMessage: '[PYTHON] Updating UI...',
                    duration: 1000
                }
            ];
        case 'banking':
            return [
                {
                    activeNodes: ['webapp'],
                    activeEdges: ['e-w-a'],
                    consoleMessage: '[TS] Initiating Transfer...',
                    duration: 1000
                },
                {
                    activeNodes: ['adapter'],
                    activeEdges: ['e-a-m'],
                    consoleMessage: '[GO] Converting to Fixed-Width...',
                    duration: 1000
                },
                {
                    activeNodes: ['mainframe'],
                    activeEdges: [],
                    consoleMessage: '[SYSTEM] MAINFRAME ACK RECEIVED.',
                    duration: 800
                },
                {
                    activeNodes: [],
                    activeEdges: ['e-a-m', 'e-w-a'], // Return flow
                    consoleMessage: '[GO] Sending Response...',
                    duration: 800
                }
            ];
        case 'chat':
            return [
                {
                    activeNodes: ['client-a'],
                    activeEdges: ['e-a-s'],
                    consoleMessage: '[TS-A] User sent "Hello"',
                    duration: 800
                },
                {
                    activeNodes: ['server'],
                    activeEdges: ['e-s-b', 'e-s-bot'],
                    consoleMessage: '[GO] Broadcasting...',
                    duration: 800
                },
                {
                    activeNodes: ['client-b', 'bot'],
                    activeEdges: [],
                    consoleMessage: '[PY] Bot analyzing sentiment...',
                    duration: 800
                }
            ];
        default:
            return [
                {
                    activeNodes: ['client'],
                    activeEdges: ['e-c-s'],
                    consoleMessage: '[CLIENT] Sending Request...',
                    duration: 800
                },
                {
                    activeNodes: ['server'],
                    activeEdges: ['e-c-s'], // Return trip
                    consoleMessage: '[SERVER] Sending Response...',
                    duration: 800
                }
            ];
    }
}
