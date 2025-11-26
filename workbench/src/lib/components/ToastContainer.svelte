<script lang="ts">
	import { toast, type Toast } from '$lib/stores/toast';
	import { fade, fly } from 'svelte/transition';

	$: toasts = $toast;

	function getIcon(type: Toast['type']) {
		switch (type) {
			case 'success':
				return `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />`;
			case 'error':
				return `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />`;
			case 'warning':
				return `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />`;
			case 'info':
				return `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />`;
		}
	}

	function getColorClasses(type: Toast['type']) {
		switch (type) {
			case 'success':
				return 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200';
			case 'error':
				return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200';
			case 'warning':
				return 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-200';
			case 'info':
				return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200';
		}
	}
</script>

<div class="toast-container" role="region" aria-label="Notifications" aria-live="polite">
	{#each toasts as t (t.id)}
		<div
			class="toast {getColorClasses(t.type)}"
			transition:fly={{ y: -20, duration: 300 }}
			role="alert"
		>
			<div class="toast-icon">
				<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					{@html getIcon(t.type)}
				</svg>
			</div>
			<div class="toast-message">{t.message}</div>
			<button
				onclick={() => toast.dismiss(t.id)}
				class="toast-close"
				aria-label="Dismiss notification"
			>
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
				</svg>
			</button>
		</div>
	{/each}
</div>

<style>
	.toast-container {
		position: fixed;
		top: 1rem;
		right: 1rem;
		z-index: 9999;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		max-width: 24rem;
	}

	.toast {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 1rem;
		border-radius: 0.5rem;
		border: 1px solid;
		box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
	}

	.toast-icon {
		flex-shrink: 0;
	}

	.toast-message {
		flex: 1;
		font-size: 0.875rem;
		font-weight: 500;
	}

	.toast-close {
		flex-shrink: 0;
		padding: 0.25rem;
		background: transparent;
		border: none;
		cursor: pointer;
		border-radius: 0.25rem;
		transition: background-color 0.2s;
	}

	.toast-close:hover {
		background: rgba(0, 0, 0, 0.1);
	}

	:global(.dark) .toast-close:hover {
		background: rgba(255, 255, 255, 0.1);
	}

	.toast-close:focus {
		outline: 2px solid currentColor;
		outline-offset: 2px;
	}
</style>
