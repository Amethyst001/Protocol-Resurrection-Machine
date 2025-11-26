/**
 * Preset Loader Utility
 * Loads preset YAML files and returns content
 */

export interface Preset {
    id: string;
    name: string;
    description: string;
    icon: string;
    yamlFile: string;
    theme: 'blue' | 'orange' | 'green';
}

export const PRESETS: Preset[] = [
    {
        id: 'chat',
        name: '💬 Chat App',
        description: 'Text-based protocol with auth & messages',
        icon: '💬',
        yamlFile: 'demo-chat.yaml',
        theme: 'blue'
    },
    {
        id: 'iot',
        name: '🏭 IoT Sensor',
        description: 'Binary headers, float data, hex terminators',
        icon: '🏭',
        yamlFile: 'binary-sensor.yaml',
        theme: 'orange'
    },
    {
        id: 'banking',
        name: '🏦 Legacy Bank',
        description: 'Fixed-width COBOL-style mainframe stream',
        icon: '🏦',
        yamlFile: 'legacy-banking.yaml',
        theme: 'green'
    }
];

/**
 * Load a preset YAML file from /presets/ directory
 */
export async function loadPreset(yamlFile: string): Promise<string> {
    try {
        const response = await fetch(`/presets/${yamlFile}`);
        if (!response.ok) {
            throw new Error(`Failed to load preset: ${response.statusText}`);
        }
        return await response.text();
    } catch (error) {
        console.error(`Error loading preset ${yamlFile}:`, error);
        throw error;
    }
}

/**
 * Get preset by ID
 */
export function getPresetById(id: string): Preset | undefined {
    return PRESETS.find((preset) => preset.id === id);
}
