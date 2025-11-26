<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';

	export let fallback: string = 'Something went wrong';

	let error: Error | null = null;
	let errorInfo: string = '';

	function handleError(event: ErrorEvent) {
		error = event.error;
		errorInfo = event.message;
		console.error('Error caught by boundary:', error);
	}

	function handleUnhandledRejection(event: PromiseRejectionEvent) {
		error = new Error(event.reason);
		errorInfo = 'Unhandled promise rejection';
		console.error('Unhandled rejection caught by boundary:', event.reason);
	}

	function reload() {
		if (browser) {
			window.location.reload();
		}
	}

	function clearError() {
		error = null;
		errorInfo = '';
	}

	onMount(() => {
		if (browser) {
			window.addEventListener('error', handleError);
			window.addEventListener('unhandledrejection', handleUnhandledRejection);
		}
	});

	onDestroy(() => {
		if (browser) {
			window.removeEventListener('error', handleError);
			window.removeEventListener('unhandledrejection', handleUnhandledRejection);
		}
	});
</script>

{#if error}
	<div class="error-boundary" role="alert" aria-live="assertive">
		<div class="error-content">
			<div class="error-icon">
				<svg class="w-16 h-16 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
					      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
				</svg>
			</div>
			<h2 class="error-title">{fallback}</h2>
			<p class="error-message">{error.message}</p>
			{#if errorInfo}
				<p class="error-info">{errorInfo}</p>
			{/if}
			<div class="error-actions">
				<button
					onclick={reload}
					class="btn-primary"
					aria-label="Reload page"
				>
					Reload Page
				</button>
				<button
					onclick={clearError}
					class="btn-secondary"
					aria-label="Dismiss error"
				>
					Dismiss
				</button>
			</div>
		</div>
	</div>
{:else}
	<slot />
{/if}

<style>
	.error-boundary {
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 100vh;
		padding: 2rem;
		background: linear-gradient(to bottom, #fee2e2, #fef2f2);
	}

	:global(.dark) .error-boundary {
		background: linear-gradient(to bottom, #7f1d1d, #1f2937);
	}

	.error-content {
		max-width: 32rem;
		text-align: center;
		background: white;
		padding: 2rem;
		border-radius: 0.5rem;
		box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
	}

	:global(.dark) .error-content {
		background: #1f2937;
	}

	.error-icon {
		display: flex;
		justify-content: center;
		margin-bottom: 1rem;
	}

	.error-title {
		font-size: 1.5rem;
		font-weight: 700;
		color: #1f2937;
		margin-bottom: 0.5rem;
	}

	:global(.dark) .error-title {
		color: #f9fafb;
	}

	.error-message {
		color: #6b7280;
		margin-bottom: 0.5rem;
	}

	:global(.dark) .error-message {
		color: #9ca3af;
	}

	.error-info {
		font-size: 0.875rem;
		color: #9ca3af;
		margin-bottom: 1.5rem;
	}

	:global(.dark) .error-info {
		color: #6b7280;
	}

	.error-actions {
		display: flex;
		gap: 1rem;
		justify-content: center;
	}

	.btn-primary {
		padding: 0.5rem 1.5rem;
		background: #3b82f6;
		color: white;
		border: none;
		border-radius: 0.375rem;
		font-weight: 500;
		cursor: pointer;
		transition: background-color 0.2s;
	}

	.btn-primary:hover {
		background: #2563eb;
	}

	.btn-primary:focus {
		outline: 2px solid #3b82f6;
		outline-offset: 2px;
	}

	.btn-secondary {
		padding: 0.5rem 1.5rem;
		background: #e5e7eb;
		color: #1f2937;
		border: none;
		border-radius: 0.375rem;
		font-weight: 500;
		cursor: pointer;
		transition: background-color 0.2s;
	}

	:global(.dark) .btn-secondary {
		background: #374151;
		color: #f9fafb;
	}

	.btn-secondary:hover {
		background: #d1d5db;
	}

	:global(.dark) .btn-secondary:hover {
		background: #4b5563;
	}

	.btn-secondary:focus {
		outline: 2px solid #3b82f6;
		outline-offset: 2px;
	}
</style>
