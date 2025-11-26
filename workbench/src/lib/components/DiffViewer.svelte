<script lang="ts">
	export let oldCode: string = '';
	export let newCode: string = '';
	export let showDiff: boolean = true;

	interface DiffLine {
		type: 'add' | 'remove' | 'context';
		content: string;
		lineNumber?: number;
	}

	function generateDiff(oldText: string, newText: string): DiffLine[] {
		const oldLines = oldText.split('\n');
		const newLines = newText.split('\n');
		const diff: DiffLine[] = [];

		// Simple line-by-line diff (not optimal but functional)
		const maxLen = Math.max(oldLines.length, newLines.length);
		
		for (let i = 0; i < maxLen; i++) {
			const oldLine = oldLines[i];
			const newLine = newLines[i];

			if (oldLine === newLine) {
				// Context line (unchanged)
				if (oldLine !== undefined) {
					diff.push({
						type: 'context',
						content: oldLine,
						lineNumber: i + 1
					});
				}
			} else {
				// Lines differ
				if (oldLine !== undefined && newLine === undefined) {
					// Line removed
					diff.push({
						type: 'remove',
						content: oldLine,
						lineNumber: i + 1
					});
				} else if (oldLine === undefined && newLine !== undefined) {
					// Line added
					diff.push({
						type: 'add',
						content: newLine,
						lineNumber: i + 1
					});
				} else {
					// Line changed (show as remove + add)
					diff.push({
						type: 'remove',
						content: oldLine,
						lineNumber: i + 1
					});
					diff.push({
						type: 'add',
						content: newLine,
						lineNumber: i + 1
					});
				}
			}
		}

		return diff;
	}

	$: diffLines = generateDiff(oldCode, newCode);
	$: hasChanges = diffLines.some(line => line.type !== 'context');
</script>

<div class="h-full overflow-auto bg-white dark:bg-gray-900">
	{#if showDiff}
		{#if !hasChanges}
			<div class="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
				<div class="text-center">
					<svg class="w-16 h-16 mx-auto mb-4 text-gray-400 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
						      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
					</svg>
					<p class="text-lg font-medium">No changes detected</p>
					<p class="text-sm mt-2">The generated code is identical to the previous version</p>
				</div>
			</div>
		{:else}
			<div class="font-mono text-sm">
				{#each diffLines as line}
					<div
						class="flex {line.type === 'add'
							? 'bg-green-50 dark:bg-green-900/20 text-green-900 dark:text-green-100'
							: line.type === 'remove'
							? 'bg-red-50 dark:bg-red-900/20 text-red-900 dark:text-red-100'
							: 'bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100'}"
					>
						<div class="w-12 flex-shrink-0 text-right px-2 py-1 text-gray-500 dark:text-gray-400 select-none border-r border-gray-200 dark:border-gray-700">
							{line.lineNumber || ''}
						</div>
						<div class="w-8 flex-shrink-0 px-2 py-1 font-bold select-none">
							{#if line.type === 'add'}
								<span class="text-green-600 dark:text-green-400">+</span>
							{:else if line.type === 'remove'}
								<span class="text-red-600 dark:text-red-400">-</span>
							{:else}
								<span class="text-gray-400"> </span>
							{/if}
						</div>
						<div class="flex-1 px-2 py-1 whitespace-pre-wrap break-all">
							{line.content}
						</div>
					</div>
				{/each}
			</div>
		{/if}
	{:else}
		<!-- Show full code without diff -->
		<div class="p-4">
			<pre class="font-mono text-sm leading-relaxed text-gray-900 dark:text-gray-100 whitespace-pre-wrap">{newCode}</pre>
		</div>
	{/if}
</div>

<style>
	pre {
		margin: 0;
		padding: 0;
	}
</style>
