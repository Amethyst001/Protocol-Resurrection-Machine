<script lang="ts">
	import { mobileLayout } from '$lib/stores/layout';
	import type { MobileTab } from '$lib/stores/layout';

	function setActiveTab(tab: MobileTab) {
		mobileLayout.update((state) => ({ ...state, activeTab: tab }));
	}
</script>

<nav
	class="fixed bottom-0 left-0 right-0 w-full h-16 bg-gray-900 border-t border-gray-700 z-50"
	aria-label="Mobile navigation"
>
	<div class="flex justify-around items-center h-full">
		<button
			class="flex-1 flex flex-col items-center justify-center h-full transition-colors
             {$mobileLayout.activeTab === 'editor' ? 'bg-blue-600 text-white' : 'text-gray-400'}"
			on:click={() => setActiveTab('editor')}
			aria-label="Editor tab"
			aria-current={$mobileLayout.activeTab === 'editor' ? 'page' : undefined}
		>
			<svg class="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
				/>
			</svg>
			<span class="text-xs">Editor</span>
		</button>

		<button
			class="flex-1 flex flex-col items-center justify-center h-full transition-colors
             {$mobileLayout.activeTab === 'output' ? 'bg-blue-600 text-white' : 'text-gray-400'}"
			on:click={() => setActiveTab('output')}
			aria-label="Output tab"
			aria-current={$mobileLayout.activeTab === 'output' ? 'page' : undefined}
		>
			<svg class="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
				/>
			</svg>
			<span class="text-xs">Output</span>
		</button>

		<button
			class="flex-1 flex flex-col items-center justify-center h-full transition-colors
             {$mobileLayout.activeTab === 'console' ? 'bg-blue-600 text-white' : 'text-gray-400'}"
			on:click={() => setActiveTab('console')}
			aria-label="Console tab"
			aria-current={$mobileLayout.activeTab === 'console' ? 'page' : undefined}
		>
			<svg class="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
				/>
			</svg>
			<span class="text-xs">Console</span>
		</button>
	</div>
</nav>
