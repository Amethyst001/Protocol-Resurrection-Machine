import { writable } from 'svelte/store';
import { browser } from '$app/environment';

type Theme = 'light' | 'dark';
export type ThemeVariant = 'halloween' | 'pro';

// Initialize theme from localStorage or system preference
const getInitialTheme = (): Theme => {
	if (!browser) return 'dark';

	const stored = localStorage.getItem('theme') as Theme | null;
	if (stored) return stored;

	return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

/**
 * Store for UI theme (light/dark)
 */
export const theme = writable<Theme>(getInitialTheme());

/**
 * Store for Theme Variant (halloween/pro)
 */
/**
 * Store for Theme Variant (halloween/pro)
 */
export const currentTheme = writable<ThemeVariant>('halloween');

// Apply initial theme
if (browser) {
	const initial = getInitialTheme();
	document.documentElement.classList.remove('light', 'dark');
	document.documentElement.classList.add(initial);
}

// Persist theme changes to localStorage and apply to DOM
// NOTE: This is now handled by src/lib/utils/theme.ts to avoid conflicts
// if (browser) {
// 	theme.subscribe(value => {
// 		localStorage.setItem('theme', value);
// 		document.documentElement.classList.remove('light', 'dark');
// 		document.documentElement.classList.add(value);
// 	});
// }



/**
 * Toggle between light and dark themes
 */
export function toggleMode() {
	theme.update(current => current === 'dark' ? 'light' : 'dark');
}

/**
 * Toggle between Halloween and Pro themes
 */
export function toggleTheme() {
	currentTheme.update(current => current === 'halloween' ? 'pro' : 'halloween');
}
