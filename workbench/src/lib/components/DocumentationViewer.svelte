<script lang="ts">
  import { documentation } from '$lib/stores/documentation';
  import { toast } from '$lib/stores/toast';
  import { currentTheme } from '$lib/stores/theme';
  import { slide } from 'svelte/transition';

  let activeTab: 'readme' | 'api' | 'usage' = 'readme';

  function downloadDoc(type: 'readme' | 'api' | 'usage') {
    if (!$documentation.docs) return;

    let content = '';
    let filename = '';

    switch (type) {
      case 'readme':
        content = $documentation.docs.readme;
        filename = 'README.md';
        break;
      case 'api':
        content = $documentation.docs.apiDocs;
        filename = 'API.md';
        break;
      case 'usage':
        content = $documentation.docs.usageGuide;
        filename = 'USAGE.md';
        break;
    }

    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success(`Downloaded ${filename}`);
  }

  function downloadAll() {
    // In a real app, we'd use JSZip here, but for now we'll just download README
    // as a placeholder for the "bundle" concept
    downloadDoc('readme');
    toast.success('Downloaded documentation bundle');
  }
</script>

<div class="h-full flex flex-col bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100">
  <!-- Header -->
  <div
    class="flex items-center justify-between px-4 py-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50"
  >
    <h2 class="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
      Documentation
    </h2>
    {#if $documentation.docs}
      <button
        onclick={downloadAll}
        class="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
      >
        Download All
      </button>
    {/if}
  </div>

  <!-- Content -->
  <div class="flex-1 flex flex-col overflow-hidden">
    {#if $documentation.isGenerating}
      <div class="flex-1 flex flex-col items-center justify-center text-gray-500">
        <svg
          class="w-8 h-8 animate-spin mb-2 text-blue-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
          />
        </svg>
        <span class="text-sm">Generating documentation...</span>
      </div>
    {:else if $documentation.docs}
      <!-- Tabs -->
      <div class="flex border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
        <button
          class="px-4 py-2 text-sm font-medium border-b-2 transition-colors {activeTab === 'readme'
            ? 'border-blue-500 text-blue-600 dark:text-blue-400'
            : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}"
          onclick={() => (activeTab = 'readme')}
        >
          README
        </button>
        <button
          class="px-4 py-2 text-sm font-medium border-b-2 transition-colors {activeTab === 'api'
            ? 'border-blue-500 text-blue-600 dark:text-blue-400'
            : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}"
          onclick={() => (activeTab = 'api')}
        >
          API Docs
        </button>
        <button
          class="px-4 py-2 text-sm font-medium border-b-2 transition-colors {activeTab === 'usage'
            ? 'border-blue-500 text-blue-600 dark:text-blue-400'
            : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}"
          onclick={() => (activeTab = 'usage')}
        >
          Usage Guide
        </button>
      </div>

      <!-- Tab Content -->
      <div class="flex-1 overflow-auto p-4 bg-white dark:bg-slate-900">
        <div class="prose dark:prose-invert max-w-none">
          <div class="flex justify-end mb-2">
            <button
              onclick={() => downloadDoc(activeTab)}
              class="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 flex items-center gap-1"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
              Download {activeTab.toUpperCase()}
            </button>
          </div>

          {#if activeTab === 'readme'}
            <pre class="whitespace-pre-wrap font-mono text-sm">{$documentation.docs.readme}</pre>
          {:else if activeTab === 'api'}
            <pre class="whitespace-pre-wrap font-mono text-sm">{$documentation.docs.apiDocs}</pre>
          {:else if activeTab === 'usage'}
            <pre class="whitespace-pre-wrap font-mono text-sm">{$documentation.docs
                .usageGuide}</pre>
          {/if}
        </div>
      </div>
    {:else}
      <div class="flex flex-col items-center justify-center h-64 text-gray-400 text-center">
        {#if $currentTheme === 'halloween'}
          <span class="text-6xl mb-4 block">📜</span>
          <p class="text-sm font-semibold text-gray-700 dark:text-gray-400">
            Grimoire not yet written...
          </p>
          <p class="text-xs mt-1 text-gray-600 dark:text-gray-500">
            Chant "Generate Docs" to inscribe the ancient texts
          </p>
        {:else}
          <svg
            class="w-12 h-12 mb-3 opacity-50"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <p class="text-sm">No documentation generated yet.</p>
          <p class="text-xs mt-1">Click "Generate Docs" in the toolbar to create documentation.</p>
        {/if}
      </div>
    {/if}
  </div>
</div>
