import { writable } from 'svelte/store';

export interface Toast {
	id: string;
	message: string;
	type: 'success' | 'error' | 'info' | 'warning';
	duration?: number;
}

function createToastStore() {
	const { subscribe, update } = writable<Toast[]>([]);

	return {
		subscribe,
		show: (message: string, type: Toast['type'] = 'info', duration: number = 5000) => {
			const id = Math.random().toString(36).substring(7);
			const toast: Toast = { id, message, type, duration };

			update(toasts => [...toasts, toast]);

			if (duration > 0) {
				setTimeout(() => {
					update(toasts => toasts.filter(t => t.id !== id));
				}, duration);
			}

			return id;
		},
		success: (message: string, duration?: number) => {
			return createToastStore().show(message, 'success', duration);
		},
		error: (message: string, duration?: number) => {
			return createToastStore().show(message, 'error', duration);
		},
		warning: (message: string, duration?: number) => {
			return createToastStore().show(message, 'warning', duration);
		},
		info: (message: string, duration?: number) => {
			return createToastStore().show(message, 'info', duration);
		},
		dismiss: (id: string) => {
			update(toasts => toasts.filter(t => t.id !== id));
		},
		clear: () => {
			update(() => []);
		}
	};
}

export const toast = createToastStore();
