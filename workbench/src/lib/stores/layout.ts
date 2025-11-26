import { writable, derived } from 'svelte/store';
import { browser } from '$app/environment';

// Legacy interface for backward compatibility
export interface LayoutConfig {
	leftWidth: number; // percentage
	rightTopHeight: number; // percentage
	rightBottomHeight: number; // percentage
}

// Desktop split-pane state
export interface DesktopLayout {
	leftPaneWidth: number; // percentage (0-100)
	topRightHeight: number; // percentage (0-100)
}

// Mobile tab state
export type MobileTab = 'editor' | 'output' | 'console';

export interface MobileLayout {
	activeTab: MobileTab;
}

// Viewport state
export interface ViewportState {
	width: number;
	height: number;
	isMobile: boolean; // width < 768px
}

const DEFAULT_LAYOUT: LayoutConfig = {
	leftWidth: 40,
	rightTopHeight: 60,
	rightBottomHeight: 40
};

const DEFAULT_DESKTOP_LAYOUT: DesktopLayout = {
	leftPaneWidth: 40,
	topRightHeight: 70
};

const DEFAULT_MOBILE_LAYOUT: MobileLayout = {
	activeTab: 'editor'
};

// Load layout from localStorage or use defaults
const getInitialLayout = (): LayoutConfig => {
	if (!browser) return DEFAULT_LAYOUT;

	const stored = localStorage.getItem('workbench-layout');
	if (stored) {
		try {
			return JSON.parse(stored);
		} catch {
			return DEFAULT_LAYOUT;
		}
	}

	return DEFAULT_LAYOUT;
};

// Debounce utility function
function debounce<T extends (...args: any[]) => any>(fn: T, delay: number): (...args: Parameters<T>) => void {
	let timeoutId: ReturnType<typeof setTimeout>;

	return (...args: Parameters<T>) => {
		clearTimeout(timeoutId);
		timeoutId = setTimeout(() => fn(...args), delay);
	};
}

/**
 * Store for workbench layout configuration (legacy)
 */
export const layout = writable<LayoutConfig>(getInitialLayout());

/**
 * Viewport state store with mobile detection
 */
export const viewport = writable<ViewportState>({
	width: browser ? window.innerWidth : 1024,
	height: browser ? window.innerHeight : 768,
	isMobile: browser ? window.innerWidth < 768 : false
});

/**
 * Desktop layout store for split-pane configuration
 */
export const desktopLayout = writable<DesktopLayout>(DEFAULT_DESKTOP_LAYOUT);

/**
 * Mobile layout store for tab navigation
 */
export const mobileLayout = writable<MobileLayout>(DEFAULT_MOBILE_LAYOUT);

/**
 * Derived store for mobile detection convenience
 */
export const isMobile = derived(viewport, ($viewport) => $viewport.isMobile);

// Initialize viewport tracking with debounced resize listener
if (browser) {
	const updateViewport = () => {
		viewport.set({
			width: window.innerWidth,
			height: window.innerHeight,
			isMobile: window.innerWidth < 768
		});
	};

	// Debounce resize events to prevent excessive re-renders (300ms)
	const debouncedResize = debounce(updateViewport, 300);

	window.addEventListener('resize', debouncedResize);
	window.addEventListener('orientationchange', updateViewport);

	// Persist legacy layout changes to localStorage
	layout.subscribe((value) => {
		localStorage.setItem('workbench-layout', JSON.stringify(value));
	});
}

/**
 * Reset desktop layout to default configuration
 */
export function resetToDesktopDefaults() {
	desktopLayout.set({ ...DEFAULT_DESKTOP_LAYOUT });
}

/**
 * Reset mobile layout to default configuration
 */
export function resetToMobileDefaults() {
	mobileLayout.set({ ...DEFAULT_MOBILE_LAYOUT });
}

/**
 * Reset layout to default configuration (legacy)
 */
export function resetLayout() {
	console.log('[Layout] Resetting to default:', DEFAULT_LAYOUT);
	layout.set({ ...DEFAULT_LAYOUT });
	if (browser) {
		localStorage.setItem('workbench-layout', JSON.stringify(DEFAULT_LAYOUT));
		console.log('[Layout] Saved to localStorage');
	}
}
