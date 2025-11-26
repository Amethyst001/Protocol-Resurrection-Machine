<script lang="ts" context="module">
	export interface PropertyResult {
		name: string;
		passed: boolean;
		iterations: number;
		counterexample?: any;
		shrinkTrace?: any[];
		durationMs?: number;
	}

	export interface PBTResultsData {
		iterations: number;
		failures: number;
		durationMs: number;
		properties: PropertyResult[];
	}
</script>

<script lang="ts">
	export let results: PBTResultsData | null = null;

	function formatDuration(ms: number): string {
		if (ms < 1000) {
			return `${ms}ms`;
		}
		return `${(ms / 1000).toFixed(2)}s`;
	}

	function formatCounterexample(value: any): string {
		if (value === null || value === undefined) {
			return String(value);
		}
		if (typeof value === 'object') {
			return JSON.stringify(value, null, 2);
		}
		return String(value);
	}

	$: totalPassed = results?.properties.filter(p => p.passed).length || 0;
	$: totalFailed = results?.properties.filter(p => !p.passed).length || 0;
</script>

<div class="flex flex-col h-full bg-white dark:bg-gray-900">
	<!-- Header -->
	<div class="flex items-center justify-between px-4 py-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
		<div class="flex items-center gap-2">
			<svg class="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
				      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
			</svg>
			<span class="text-sm font-medium text-gray-700 dark:text-gray-300">Property-Based Tests</span>
		</div>
		
		{#if results}
			<div class="flex items-center gap-4 text-sm">
				<span class="text-green-600 dark:text-green-400">
					✓ {totalPassed} passed
				</span>
				{#if totalFailed > 0}
					<span class="text-red-600 dark:text-red-400">
						✖ {totalFailed} failed
					</span>
				{/if}
			</div>
		{/if}
	</div>

	<!-- Results -->
	<div class="flex-1 overflow-auto p-4">
		{#if !results}
			<div class="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
				<div class="text-center">
					<svg class="w-16 h-16 mx-auto mb-4 text-gray-400 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
						      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
					</svg>
					<p class="text-lg font-medium">No test results yet</p>
					<p class="text-sm mt-2">Click "Run PBT" to execute property-based tests</p>
				</div>
			</div>
		{:else}
			<!-- Summary -->
			<div class="mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
				<h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">Test Summary</h3>
				<div class="grid grid-cols-3 gap-4 text-sm">
					<div>
						<div class="text-gray-600 dark:text-gray-400">Total Iterations</div>
						<div class="text-2xl font-bold text-gray-900 dark:text-gray-100">
							{results.iterations.toLocaleString()}
						</div>
					</div>
					<div>
						<div class="text-gray-600 dark:text-gray-400">Failures</div>
						<div class="text-2xl font-bold {results.failures > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}">
							{results.failures}
						</div>
					</div>
					<div>
						<div class="text-gray-600 dark:text-gray-400">Duration</div>
						<div class="text-2xl font-bold text-gray-900 dark:text-gray-100">
							{formatDuration(results.durationMs)}
						</div>
					</div>
				</div>
			</div>

			<!-- Property results -->
			<div class="space-y-4">
				{#each results.properties as property}
					<div class="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
						<div class="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800">
							<div class="flex items-center gap-3">
								{#if property.passed}
									<svg class="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
										      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
									</svg>
								{:else}
									<svg class="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
										      d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
									</svg>
								{/if}
								<div>
									<div class="font-medium text-gray-900 dark:text-gray-100">
										{property.name}
									</div>
									<div class="text-sm text-gray-600 dark:text-gray-400">
										{property.iterations.toLocaleString()} iterations
										{#if property.durationMs}
											· {formatDuration(property.durationMs)}
										{/if}
									</div>
								</div>
							</div>
						</div>

						{#if !property.passed && property.counterexample}
							<div class="p-4 border-t border-gray-200 dark:border-gray-700">
								<div class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
									Counterexample:
								</div>
								<pre class="bg-red-50 dark:bg-red-900/20 text-red-900 dark:text-red-100 p-3 rounded text-xs font-mono overflow-x-auto">{formatCounterexample(property.counterexample)}</pre>

								{#if property.shrinkTrace && property.shrinkTrace.length > 0}
									<div class="mt-4">
										<div class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
											Shrinking trace ({property.shrinkTrace.length} steps):
										</div>
										<div class="space-y-2">
											{#each property.shrinkTrace as step, i}
												<div class="flex items-start gap-2">
													<span class="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0 mt-1">
														{i + 1}.
													</span>
													<pre class="bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 p-2 rounded text-xs font-mono overflow-x-auto flex-1">{formatCounterexample(step)}</pre>
												</div>
											{/each}
										</div>
									</div>
								{/if}
							</div>
						{/if}
					</div>
				{/each}
			</div>
		{/if}
	</div>
</div>

<style>
	pre {
		margin: 0;
		white-space: pre-wrap;
		word-wrap: break-word;
	}
</style>
