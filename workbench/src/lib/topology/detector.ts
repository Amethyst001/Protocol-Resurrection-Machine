export type TopologyType = 'DENDRITE' | 'MESH' | 'PIPELINE' | 'GENERIC';

export function detectTopologyType(protocolName: string, spec: any): TopologyType {
    const name = protocolName.toLowerCase();
    const description = (spec?.description || "").toLowerCase();

    // 1. Hardware / IoT / Sensors -> "DENDRITE" (Star Shape)
    if (
        name.includes('sensor') || name.includes('weather') || name.includes('iot') ||
        name.includes('device') || name.includes('telemetry') ||
        spec?.encoding === 'binary' // Binary usually implies hardware
    ) {
        return 'DENDRITE';
    }

    // 2. Real-time / Interactive -> "MESH" (Bi-directional)
    if (
        name.includes('chat') || name.includes('finger') || name.includes('debug') ||
        name.includes('game') || name.includes('sync')
    ) {
        return 'MESH';
    }

    // 3. Legacy / Transformation -> "PIPELINE" (Top-Down)
    if (
        name.includes('bank') || name.includes('legacy') || name.includes('wais') ||
        name.includes('gopher') || name.includes('mainframe')
    ) {
        return 'PIPELINE';
    }

    // 4. The Universal Fallback
    return 'GENERIC';
}
