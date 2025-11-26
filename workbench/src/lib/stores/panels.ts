import { writable } from 'svelte/store';
import { browser } from '$app/environment';

export type PanelId = 'editor' | 'codeViewer' | 'console' | 'pbtResults' | 'timeline' | 'astViewer' | 'discovery' | 'mcpServer' | 'documentation' | 'steering';

export type PanelPosition = 'left' | 'right-top' | 'right-bottom';

export interface PanelConfig {
	id: PanelId;
	title: string;
	position: PanelPosition;
	order: number;
}

const DEFAULT_PANELS: PanelConfig[] = [
	{ id: 'editor', title: 'YAML Editor', position: 'left', order: 0 },
	{ id: 'codeViewer', title: 'Generated Code', position: 'right-top', order: 0 },
	{ id: 'console', title: 'Console', position: 'right-bottom', order: 0 },
	{ id: 'discovery', title: 'Protocol Discovery', position: 'right-bottom', order: 1 },
	{ id: 'mcpServer', title: 'MCP Server', position: 'right-top', order: 1 },
	{ id: 'documentation', title: 'Documentation', position: 'right-top', order: 2 },
	{ id: 'steering', title: 'Steering', position: 'left', order: 1 }
];

// Load panel configuration from localStorage or use defaults
const getInitialPanels = (): PanelConfig[] => {
	if (!browser) return DEFAULT_PANELS;

	const stored = localStorage.getItem('workbench-panels-v2');
	if (stored) {
		try {
			return JSON.parse(stored);
		} catch {
			return DEFAULT_PANELS;
		}
	}

	return DEFAULT_PANELS;
};

/**
 * Store for panel configuration
 */
export const panels = writable<PanelConfig[]>(getInitialPanels());

// Persist panel changes to localStorage
if (browser) {
	panels.subscribe(value => {
		localStorage.setItem('workbench-panels-v2', JSON.stringify(value));
	});
}

/**
 * Reset panels to default configuration
 */
export function resetPanels() {
	console.log('[Panels] Resetting to default:', DEFAULT_PANELS);
	panels.set([...DEFAULT_PANELS]);
	if (browser) {
		localStorage.setItem('workbench-panels-v2', JSON.stringify(DEFAULT_PANELS));
		console.log('[Panels] Saved to localStorage');
	}
}

/**
 * Move a panel to a new position
 */
export function movePanel(panelId: PanelId, newPosition: PanelPosition, newOrder: number) {
	panels.update(current => {
		return current.map(panel => {
			if (panel.id === panelId) {
				return { ...panel, position: newPosition, order: newOrder };
			}
			return panel;
		});
	});
}

/**
 * Get panels for a specific position
 */
export function getPanelsForPosition(panelConfigs: PanelConfig[], position: PanelPosition): PanelConfig[] {
	return panelConfigs
		.filter(p => p.position === position)
		.sort((a, b) => a.order - b.order);
}
