/**
 * Theme Switcher Utility
 * Manages Halloween/Pro theme + Light/Dark mode
 */

export type Theme = 'halloween' | 'pro';
export type Mode = 'light' | 'dark';

export interface ThemeConfig {
    theme: Theme;
    mode: Mode;
}

const THEME_STORAGE_KEY = 'kiroween-theme';
const MODE_STORAGE_KEY = 'kiroween-mode';

/**
 * Get current theme configuration from localStorage or defaults
 */
export function getThemeConfig(): ThemeConfig {
    if (typeof window === 'undefined') {
        return { theme: 'halloween', mode: 'dark' };
    }

    const theme = (localStorage.getItem(THEME_STORAGE_KEY) as Theme) || 'halloween';
    const mode = (localStorage.getItem(MODE_STORAGE_KEY) as Mode) || 'dark';

    return { theme, mode };
}

/**
 * Apply theme configuration to DOM
 */
export function applyTheme(config: ThemeConfig): void {
    if (typeof document === 'undefined') return;

    const root = document.documentElement;

    // Set theme data attribute
    root.dataset.theme = config.theme;

    // Set mode data attribute
    root.dataset.mode = config.mode;

    // Also set legacy class for TailwindCSS compatibility
    if (config.mode === 'dark') {
        root.classList.add('dark');
        root.classList.remove('light');
    } else {
        root.classList.add('light');
        root.classList.remove('dark');
    }

    // Save to localStorage
    localStorage.setItem(THEME_STORAGE_KEY, config.theme);
    localStorage.setItem(MODE_STORAGE_KEY, config.mode);
}

import { currentTheme, theme } from '$lib/stores/theme';

/**
 * Toggle between Halloween and Pro themes
 */
export function toggleTheme(): void {
    const config = getThemeConfig();
    // Toggle theme
    config.theme = config.theme === 'halloween' ? 'pro' : 'halloween';

    // If switching TO Halloween, force Dark mode
    if (config.theme === 'halloween') {
        config.mode = 'dark';
    }

    applyTheme(config);
    currentTheme.set(config.theme);
    theme.set(config.mode);
}

/**
 * Toggle between Light and Dark modes
 */
export function toggleMode(): void {
    const config = getThemeConfig();
    config.mode = config.mode === 'light' ? 'dark' : 'light';

    // If switching modes manually, disable Halloween (switch to Pro)
    // This prevents "Light Mode Halloween" which looks broken
    if (config.theme === 'halloween') {
        config.theme = 'pro';
    }

    applyTheme(config);
    currentTheme.set(config.theme);
    theme.set(config.mode);
}

/**
 * Set specific theme
 */
export function setTheme(themeName: Theme): void {
    const config = getThemeConfig();
    config.theme = themeName;
    applyTheme(config);
    currentTheme.set(themeName);
}

/**
 * Set specific mode
 */
export function setMode(mode: Mode): void {
    const config = getThemeConfig();
    config.mode = mode;
    applyTheme(config);
    theme.set(mode);
}

/**
 * Initialize theme on app load
 */
export function initTheme(): void {
    const config = getThemeConfig();
    applyTheme(config);
    currentTheme.set(config.theme);
    theme.set(config.mode);
}
