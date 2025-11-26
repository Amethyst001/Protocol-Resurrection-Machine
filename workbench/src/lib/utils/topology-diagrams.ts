/**
 * Topology Diagram Definitions
 * Mermaid graphs for each preset scenario
 */

export const TOPOLOGY_DIAGRAMS = {
    iot: `graph LR
    SENSOR[Rust Firmware] -->|Binary Stream| GATEWAY[Go Gateway]
    GATEWAY -->|JSON/gRPC| DASH[Python Analytics]
    
    style SENSOR fill:#dea584,stroke:#333,stroke-width:2px
    style GATEWAY fill:#00add8,stroke:#333,stroke-width:2px
    style DASH fill:#3572A5,stroke:#333,stroke-width:2px,color:white`,

    banking: `graph TD
    MAINFRAME[Legacy COBOL System] <-->|Fixed-Width| ADAPTER[Go Adapter]
    ADAPTER <-->|REST API| CLIENT[TypeScript Web App]
    
    style MAINFRAME fill:#333,stroke:#0f0,stroke-width:2px,color:#0f0,stroke-dasharray: 5 5
    style ADAPTER fill:#00add8,stroke:#333,stroke-width:2px
    style CLIENT fill:#3178C6,stroke:#333,stroke-width:2px,color:white`,

    chat: `graph LR
    USER_A[TS Client A] <-->|WebSockets| SERVER[Go Server]
    SERVER <-->|WebSockets| USER_B[TS Client B]
    SERVER -->|Async Events| BOT[Python AI Bot]
    
    style USER_A fill:#3178C6,stroke:#333,stroke-width:2px,color:white
    style USER_B fill:#3178C6,stroke:#333,stroke-width:2px,color:white
    style SERVER fill:#00add8,stroke:#333,stroke-width:2px
    style BOT fill:#3572A5,stroke:#333,stroke-width:2px,color:white`
} as const;

export type TopologyType = keyof typeof TOPOLOGY_DIAGRAMS;

/**
 * Get diagram for a preset/protocol
 */
export function getTopologyDiagram(preset: string): string | null {
    const normalized = preset.toLowerCase();

    if (normalized.includes('iot') || normalized.includes('sensor')) {
        return TOPOLOGY_DIAGRAMS.iot;
    }

    if (normalized.includes('bank') || normalized.includes('gopher') || normalized.includes('cobol')) {
        return TOPOLOGY_DIAGRAMS.banking;
    }

    if (normalized.includes('chat') || normalized.includes('message')) {
        return TOPOLOGY_DIAGRAMS.chat;
    }

    // Default to chat for demo purposes
    return TOPOLOGY_DIAGRAMS.chat;
}
