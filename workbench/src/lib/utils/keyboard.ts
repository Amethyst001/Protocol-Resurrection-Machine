/**
 * Keyboard shortcuts handler
 */

export interface KeyboardShortcut {
	key: string;
	ctrl?: boolean;
	shift?: boolean;
	alt?: boolean;
	handler: () => void;
	description: string;
}

export class KeyboardShortcutManager {
	private shortcuts: KeyboardShortcut[] = [];
	private listener: ((event: KeyboardEvent) => void) | null = null;

	register(shortcut: KeyboardShortcut) {
		this.shortcuts.push(shortcut);
	}

	unregister(key: string) {
		this.shortcuts = this.shortcuts.filter(s => s.key !== key);
	}

	start() {
		this.listener = (event: KeyboardEvent) => {
			for (const shortcut of this.shortcuts) {
				const ctrlMatch = shortcut.ctrl === undefined || shortcut.ctrl === event.ctrlKey;
				const shiftMatch = shortcut.shift === undefined || shortcut.shift === event.shiftKey;
				const altMatch = shortcut.alt === undefined || shortcut.alt === event.altKey;
				const keyMatch = shortcut.key.toLowerCase() === event.key.toLowerCase();

				if (ctrlMatch && shiftMatch && altMatch && keyMatch) {
					event.preventDefault();
					shortcut.handler();
					break;
				}
			}
		};

		window.addEventListener('keydown', this.listener);
	}

	stop() {
		if (this.listener) {
			window.removeEventListener('keydown', this.listener);
			this.listener = null;
		}
	}

	getShortcuts(): KeyboardShortcut[] {
		return [...this.shortcuts];
	}
}

export const keyboardManager = new KeyboardShortcutManager();
