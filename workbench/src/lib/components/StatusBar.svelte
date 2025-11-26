<script lang="ts" context="module">
	export interface PerformanceMetrics {
		operation: 'validation' | 'generation' | 'pbt' | 'discovery';
		durationMs: number;
		iterations?: number;
		timestamp: Date;
	}
</script>

<script lang="ts">
	export let metrics: PerformanceMetrics | null = null;

	function formatDuration(ms: number): string {
		if (ms < 1000) {
			return `${ms}ms`;
		}
		return `${(ms / 1000).toFixed(2)}s`;
	}

	function formatIterations(count: number): string {
		if (count < 1000) {
			return count.toString();
		}
		return `${(count / 1000).toFixed(1)}k`;
	}

	function getOperationLabel(operation: PerformanceMetrics['operation']): string {
		switch (operation) {
			case 'validation':
				return 'Validated';
			case 'generation':
				return 'Generated';
			case 'pbt':
				return 'PBT';
			case 'discovery':
				return 'Discovered';
		}
	}

	function getOperationIcon(operation: PerformanceMetrics['operation']): string {
		switch (operation) {
			case 'validation':
				return 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z';
			case 'generation':
				return 'M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4';
			case 'pbt':
				return 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4';
			case 'discovery':
				return 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z';
		}
	}

	$: statusText = metrics
		? metrics.operation === 'pbt' && metrics.iterations
			? `${getOperationLabel(metrics.operation)}: ${formatIterations(metrics.iterations)} iterations in ${formatDuration(metrics.durationMs)}`
			: `${getOperationLabel(metrics.operation)} in ${formatDuration(metrics.durationMs)}`
		: 'Ready';
</script>

<div class="flex items-center justify-between px-4 py-2 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 text-sm">
	<!-- Left side - Performance metrics -->
	<div class="flex items-center gap-2">
		{#if metrics}
			<svg class="w-4 h-4 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={getOperationIcon(metrics.operation)} />
			</svg>
			<span class="text-gray-700 dark:text-gray-300 font-medium">
				{statusText}
			</span>
		{:else}
			<svg class="w-4 h-4 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
				      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
			</svg>
			<span class="text-gray-700 dark:text-gray-300">
				Ready
			</span>
		{/if}
	</div>

	<!-- Right side - Additional info -->
	<div class="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
		{#if metrics}
			<span>
				{metrics.timestamp.toLocaleTimeString()}
			</span>
		{/if}
		<span>
			Protocol Resurrection Machine
		</span>
	</div>
</div>
