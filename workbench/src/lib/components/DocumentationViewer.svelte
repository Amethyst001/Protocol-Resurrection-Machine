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

<div class="h-full flex flex-col docs-container">
  <!-- Header -->
  <div
    class="flex items-center justify-between px-4 py-2 border-b docs-header"
  >
    <h2 class="text-sm font-semibold uppercase tracking-wider docs-header-text">
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
      <div class="flex-1 flex flex-col items-center justify-center docs-loading">
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
      <div class="flex border-b docs-tabs">
        <button
          class="px-4 py-2 text-sm font-medium border-b-2 transition-colors {activeTab === 'readme'
            ? 'border-blue-500 text-blue-600 dark:text-blue-400'
            : 'border-transparent docs-tab-inactive'}"
          onclick={() => (activeTab = 'readme')}
        >
          README
        </button>
        <button
          class="px-4 py-2 text-sm font-medium border-b-2 transition-colors {activeTab === 'api'
            ? 'border-blue-500 text-blue-600 dark:text-blue-400'
            : 'border-transparent docs-tab-inactive'}"
          onclick={() => (activeTab = 'api')}
        >
          API Docs
        </button>
        <button
          class="px-4 py-2 text-sm font-medium border-b-2 transition-colors {activeTab === 'usage'
            ? 'border-blue-500 text-blue-600 dark:text-blue-400'
            : 'border-transparent docs-tab-inactive'}"
          onclick={() => (activeTab = 'usage')}
        >
          Usage Guide
        </button>
      </div>

      <!-- Tab Content -->
      <div class="flex-1 overflow-auto p-4 docs-content">
        <div class="prose dark:prose-invert max-w-none docs-prose">
          <div class="flex justify-end mb-2">
            <button
              onclick={() => downloadDoc(activeTab)}
              class="text-xs docs-download-btn flex items-center gap-1"
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
            <pre class="whitespace-pre-wrap font-mono text-sm docs-code">{$documentation.docs.readme}</pre>
          {:else if activeTab === 'api'}
            <pre class="whitespace-pre-wrap font-mono text-sm docs-code">{$documentation.docs.apiDocs}</pre>
          {:else if activeTab === 'usage'}
            <pre class="whitespace-pre-wrap font-mono text-sm docs-code">{$documentation.docs
                .usageGuide}</pre>
          {/if}
        </div>
      </div>
    {:else}
      <div class="flex flex-col items-center justify-center h-64 text-center docs-empty">
        {#if $currentTheme === 'halloween'}
          <span class="text-6xl mb-4 block">📜</span>
          <p class="text-sm font-semibold docs-empty-title">
            Grimoire not yet written...
          </p>
          <p class="text-xs mt-1 docs-empty-subtitle">
            Chant "Generate Docs" to inscribe the ancient texts
          </p>
        {:else}
          <svg
            class="w-12 h-12 mb-3 docs-empty-icon"
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
          <p class="text-sm docs-empty-title">No documentation generated yet.</p>
          <p class="text-xs mt-1 docs-empty-subtitle">Click "Generate Docs" in the toolbar to create documentation.</p>
        {/if}
      </div>
    {/if}
  </div>
</div>

<style>
  /* Light Mode - Engineering Blueprint */
  .docs-container {
    background-color: #FFFFFF;
    color: #0F172A;
  }
  
  .docs-header {
    background-color: #F8FAFC;
    border-color: #E2E8F0;
  }
  
  .docs-header-text {
    color: #64748B;
  }
  
  .docs-tabs {
    background-color: #F8FAFC;
    border-color: #E2E8F0;
  }
  
  .docs-tab-inactive {
    color: #64748B;
  }
  
  .docs-tab-inactive:hover {
    color: #0F172A;
  }
  
  .docs-content {
    background-color: #FFFFFF;
  }
  
  .docs-prose {
    color: #334155;
  }
  
  /* Code blocks stay dark for contrast */
  .docs-code {
    background-color: #1e293b;
    color: #e2e8f0;
    padding: 1rem;
    border-radius: 0.5rem;
  }
  
  .docs-download-btn {
    color: #64748B;
  }
  
  .docs-download-btn:hover {
    color: #0F172A;
  }
  
  .docs-loading {
    color: #64748B;
  }
  
  .docs-empty-icon {
    color: #CBD5E1;
  }
  
  .docs-empty-title {
    color: #64748B;
  }
  
  .docs-empty-subtitle {
    color: #94A3B8;
  }
  
  /* Dark Mode */
  :global(.dark) .docs-container,
  :global([data-mode="dark"]) .docs-container {
    background-color: #0f172a;
    color: #f1f5f9;
  }
  
  :global(.dark) .docs-header,
  :global([data-mode="dark"]) .docs-header {
    background-color: rgba(30, 41, 59, 0.5);
    border-color: #334155;
  }
  
  :global(.dark) .docs-header-text,
  :global([data-mode="dark"]) .docs-header-text {
    color: #94a3b8;
  }
  
  :global(.dark) .docs-tabs,
  :global([data-mode="dark"]) .docs-tabs {
    background-color: #1e293b;
    border-color: #334155;
  }
  
  :global(.dark) .docs-tab-inactive,
  :global([data-mode="dark"]) .docs-tab-inactive {
    color: #94a3b8;
  }
  
  :global(.dark) .docs-tab-inactive:hover,
  :global([data-mode="dark"]) .docs-tab-inactive:hover {
    color: #e2e8f0;
  }
  
  :global(.dark) .docs-content,
  :global([data-mode="dark"]) .docs-content {
    background-color: #0f172a;
  }
  
  :global(.dark) .docs-prose,
  :global([data-mode="dark"]) .docs-prose {
    color: #e2e8f0;
  }
  
  :global(.dark) .docs-download-btn,
  :global([data-mode="dark"]) .docs-download-btn {
    color: #94a3b8;
  }
  
  :global(.dark) .docs-download-btn:hover,
  :global([data-mode="dark"]) .docs-download-btn:hover {
    color: #e2e8f0;
  }
  
  :global(.dark) .docs-empty-icon,
  :global([data-mode="dark"]) .docs-empty-icon {
    color: #475569;
  }
  
  :global(.dark) .docs-empty-title,
  :global([data-mode="dark"]) .docs-empty-title {
    color: #94a3b8;
  }
  
  :global(.dark) .docs-empty-subtitle,
  :global([data-mode="dark"]) .docs-empty-subtitle {
    color: #64748b;
  }
</style>
