<script lang="ts">
	import { templates, type Template } from '$lib/utils/templates';

	export let onSelect: (template: Template) => void = () => {};

	let isOpen = false;

	function selectTemplate(template: Template) {
		onSelect(template);
		isOpen = false;
	}

	function toggleDropdown() {
		isOpen = !isOpen;
	}
</script>

<div class="relative inline-block">
	<button
		onclick={toggleDropdown}
		class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 
		       focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
		       dark:bg-blue-500 dark:hover:bg-blue-600 transition-colors"
		aria-label="Select template"
		aria-haspopup="true"
		aria-expanded={isOpen}
	>
		<span class="flex items-center gap-2">
			<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
				      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
			</svg>
			Templates
		</span>
	</button>

	{#if isOpen}
		<div
			class="absolute left-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-lg 
			       border border-gray-200 dark:border-gray-700 z-50"
			role="menu"
		>
			<div class="p-2">
				<div class="text-sm font-semibold text-gray-700 dark:text-gray-300 px-3 py-2">
					Protocol Templates
				</div>
				{#each templates as template}
					<button
						onclick={() => selectTemplate(template)}
						class="w-full text-left px-3 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700
						       focus:outline-none focus:bg-gray-100 dark:focus:bg-gray-700 transition-colors"
						role="menuitem"
					>
						<div class="font-medium text-gray-900 dark:text-gray-100">
							{template.name}
						</div>
						<div class="text-sm text-gray-600 dark:text-gray-400 mt-1">
							{template.description}
						</div>
					</button>
				{/each}
			</div>
		</div>
	{/if}
</div>

{#if isOpen}
	<!-- Backdrop to close dropdown when clicking outside -->
	<button
		onclick={() => isOpen = false}
		class="fixed inset-0 z-40"
		aria-label="Close template selector"
		tabindex="-1"
	></button>
{/if}
