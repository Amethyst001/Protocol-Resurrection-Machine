import { writable, derived } from 'svelte/store';

export interface LogContext {
	file?: string;
	line?: number;
	column?: number;
	code?: string;
	[key: string]: any;
}

export interface ConsoleEntry {
	timestamp: number;
	level: 'info' | 'warning' | 'error' | 'success';
	message: string;
	context?: LogContext;
	suggestion?: string;
}

export interface FormattedLogEntry {
	timestamp: Date;
	level: 'error' | 'warning' | 'info';
	message: string;
	context?: LogContext;
	suggestion?: string;
}

function createConsoleStore() {
	const { subscribe, update } = writable<ConsoleEntry[]>([]);

	return {
		subscribe,
		log: (message: string, level: ConsoleEntry['level'] = 'info', context?: LogContext, suggestion?: string) => {
			update(entries => [...entries, {
				timestamp: Date.now(),
				level,
				message,
				context,
				suggestion
			}]);
		},
		clear: () => update(() => [])
	};
}

export const consoleStore = createConsoleStore();

// Derived store for formatted logs - this is reactive!
export const formattedLogs = derived(consoleStore, ($logs) =>
	$logs.map(e => ({
		timestamp: new Date(e.timestamp),
		level: (e.level === 'success' ? 'info' : e.level) as 'error' | 'warning' | 'info',
		message: e.message,
		context: e.context,
		suggestion: e.suggestion
	}))
);
