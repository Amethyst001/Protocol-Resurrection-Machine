/**
 * Reactive Topology Diagram Generator
 * Dynamically injects CSS classes for node highlighting during simulation
 */

import { TOPOLOGY_DIAGRAMS } from './topology-diagrams';

export type ActiveNode = 'rust' | 'go' | 'python' | 'typescript' | null;

/**
 * Inject active-pulse class into topology diagram based on activeNode
 */
export function injectNodeHighlight(diagram: string, activeNode: ActiveNode): string {
    if (!activeNode) return diagram;

    // Map of language to node IDs for each topology
    const nodeMap: Record<string, Record<string, string[]>> = {
        iot: {
            rust: ['SENSOR'],
            go: ['GATEWAY'],
            python: ['DASH']
        },
        banking: {
            go: ['ADAPTER'],
            typescript: ['CLIENT']
        },
        chat: {
            typescript: ['USER_A', 'USER_B'],
            go: ['SERVER'],
            python: ['BOT']
        }
    };

    // Detect which topology we're using
    let topology: string | null = null;
    if (diagram.includes('Rust Firmware')) topology = 'iot';
    else if (diagram.includes('COBOL')) topology = 'banking';
    else if (diagram.includes('WebSockets')) topology = 'chat';

    if (!topology) return diagram;

    const nodes = nodeMap[topology]?.[activeNode];
    if (!nodes || nodes.length === 0) return diagram;

    // Inject CSS class for active nodes
    const classDeclaration = `\n    class ${nodes.join(',')} active-pulse`;
    return diagram + classDeclaration;
}

/**
 * Get topology diagram with optional node highlighting
 */
export function getReactiveDiagram(preset: string, activeNode: ActiveNode = null): string | null {
    const normalized = preset.toLowerCase();

    let diagram: string | null = null;
    if (normalized.includes('iot') || normalized.includes('sensor')) {
        diagram = TOPOLOGY_DIAGRAMS.iot;
    } else if (normalized.includes('bank') || normalized.includes('gopher') || normalized.includes('cobol')) {
        diagram = TOPOLOGY_DIAGRAMS.banking;
    } else if (normalized.includes('chat') || normalized.includes('message')) {
        diagram = TOPOLOGY_DIAGRAMS.chat;
    } else {
        diagram = TOPOLOGY_DIAGRAMS.chat; // default
    }

    if (!diagram) return null;
    return injectNodeHighlight(diagram, activeNode);
}
