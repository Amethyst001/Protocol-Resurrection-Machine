<script lang="ts">
  import { mcp } from '$lib/stores/mcp';
  import { currentTheme } from '$lib/stores/theme';
  import { spec } from '$lib/stores/spec';
  import { toast } from '$lib/stores/toast';
  import { consoleStore } from '$lib/stores/console';
  import { slide } from 'svelte/transition';

  let showCode = false;

  async function handleGenerateMCP() {
    mcp.setGenerating(true);
    try {
      const response = await fetch('/api/mcp/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ yaml: $spec }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        consoleStore.log(`[MCP] Error: ${response.status} ${errorText}`, 'error');
        throw new Error(`Failed to generate MCP server: ${response.status} ${errorText}`);
      }

      const result = await response.json();
      consoleStore.log(`[MCP] Generation successful! ${result.tools.length} tools created.`, 'success');

      mcp.setGeneratedCode(result.code);
      mcp.setStatus({
        isRunning: true, // Simulate running for demo
        tools: result.tools,
        port: 3000,
      });

      showCode = true;
      toast.success('MCP Server generated successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      consoleStore.log(`[MCP] Generation failed: ${errorMessage}`, 'error');
      toast.error(`Failed to generate MCP server: ${errorMessage}`);
    } finally {
      mcp.setGenerating(false);
    }
  }

  function copyCode() {
    if ($mcp.generatedCode) {
      navigator.clipboard.writeText($mcp.generatedCode);
      toast.success('Code copied to clipboard');
    }
  }


</script>

<div class="h-full flex flex-col mcp-container">
  <!-- Header -->
  <div
    class="flex items-center justify-between px-4 py-2 border-b mcp-header"
  >
    <h2 class="text-sm font-semibold uppercase tracking-wider mcp-header-text">
      Model Context Protocol
    </h2>
    <div class="flex items-center gap-2">
      {#if $mcp.status.isRunning}
        <span
          class="flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full mcp-badge-active"
        >
          <span class="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
          Active
        </span>
      {:else}
        <span class="text-xs px-2 py-0.5 rounded-full mcp-badge-inactive">
          Inactive
        </span>
      {/if}
    </div>
  </div>

  <!-- Content -->
  <div class="flex-1 overflow-auto p-4 space-y-6 mcp-content">
    <!-- Server Status -->
    <div
      class="rounded-lg p-4 shadow-sm mcp-card"
    >
      <div class="flex items-center justify-between mb-4">
        <div>
          <h3 class="font-medium text-lg mcp-card-title">MCP Server</h3>
          <p class="text-sm mcp-card-subtitle">
            Expose this protocol to AI assistants like Claude
          </p>
        </div>
        <button
          onclick={handleGenerateMCP}
          disabled={$mcp.isGenerating}
          class="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
        >
          {#if $mcp.isGenerating}
            <svg class="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            Generating...
          {:else}
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
            Generate Server
          {/if}
        </button>
      </div>

      {#if $mcp.status.isRunning}
        <div class="space-y-3" transition:slide>
          <div class="flex items-center gap-2 text-sm">
            <span class="text-gray-600 dark:text-gray-400">Port:</span>
            <span
              class="font-mono bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded text-gray-900 dark:text-gray-100"
              >{$mcp.status.port}</span
            >
          </div>

          <div>
            <h4
              class="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-2"
            >
              Available Tools
            </h4>
            <div class="grid gap-2">
              {#each $mcp.status.tools as tool}
                <button
                  onclick={() => {
                    consoleStore.log(`[MCP] Tool: ${tool.name}`, 'info');
                    if (tool.inputSchema?.properties && Object.keys(tool.inputSchema.properties).length > 0) {
                      const props = Object.keys(tool.inputSchema.properties).join(', ');
                      consoleStore.log(`[MCP] Parameters: ${props}`, 'info');
                    }
                  }}
                  class="w-full text-left p-3 bg-gray-50 dark:bg-slate-800 rounded border border-gray-300 dark:border-slate-600 
                         hover:border-purple-400 dark:hover:border-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20
                         transition-all cursor-pointer"
                  title={tool.description}
                >
                  <div class="flex items-center justify-between mb-1">
                    <span class="font-mono text-sm font-medium text-purple-600 dark:text-purple-400"
                      >{tool.name}</span
                    >
                  </div>
                  <p class="text-xs text-gray-600 dark:text-gray-400">{tool.description}</p>
                </button>
              {/each}
            </div>
          </div>
        </div>
      {/if}
    </div>

    <!-- Generated Code -->
    {#if $mcp.generatedCode}
      <div
        class="border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden shadow-sm"
        transition:slide
      >
        <div
          class="flex items-center justify-between px-3 py-2 bg-white dark:bg-gray-800 border-b border-gray-300 dark:border-gray-600"
        >
          <span class="text-xs font-medium text-gray-700 dark:text-gray-300">server.ts</span>
          <div class="flex gap-2">
            <button
              onclick={() => (showCode = !showCode)}
              class="text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
            >
              {showCode ? 'Hide' : 'Show'} Code
            </button>
            <button
              onclick={copyCode}
              class="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
            >
              Copy
            </button>
          </div>
        </div>
        {#if showCode}
          <pre
            class="p-3 text-xs font-mono overflow-auto max-h-96 bg-gray-50 dark:bg-slate-800 text-gray-800 dark:text-gray-200">{$mcp.generatedCode}</pre>
        {/if}
      </div>
    {:else}
      <div
        class="flex flex-col items-center justify-center h-48 text-center mcp-empty-state border-2 border-dashed rounded-lg"
      >
        {#if $currentTheme === 'halloween'}
          <span class="text-5xl mb-3 block">🎃</span>
          <p class="text-sm font-semibold mcp-empty-title">
            The protocol sleeps...
          </p>
          <p class="text-xs mt-1 mcp-empty-subtitle">
            Click "Generate Server" to awaken it
          </p>
        {:else}
          <svg
            class="w-12 h-12 mb-3 mcp-empty-icon"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2"
            />
          </svg>
          <p class="text-sm font-semibold mcp-empty-title">
            No MCP server generated yet
          </p>
          <p class="text-xs mt-1 mcp-empty-subtitle">
            Click "Generate Server" to create an MCP server
          </p>
        {/if}
      </div>
    {/if}
  </div>
</div>


<style>
  /* Light Mode - Engineering Blueprint */
  .mcp-container {
    background-color: #ffffff;
    color: #0f172a;
  }

  .mcp-header {
    background-color: #f8fafc;
    border-color: #e2e8f0;
  }

  .mcp-header-text {
    color: #64748b;
  }

  .mcp-badge-active {
    background-color: #dcfce7;
    color: #16a34a;
  }

  .mcp-badge-inactive {
    background-color: #f1f5f9;
    color: #64748b;
  }

  .mcp-content {
    background-color: #f8fafc;
  }

  .mcp-card {
    background-color: #ffffff;
    border: 1px solid #e2e8f0;
  }

  .mcp-card-title {
    color: #0f172a;
  }

  .mcp-card-subtitle {
    color: #64748b;
  }

  /* Dark Mode */
  :global(.dark) .mcp-container,
  :global([data-mode='dark']) .mcp-container {
    background-color: #0f172a;
    color: #f1f5f9;
  }

  :global(.dark) .mcp-header,
  :global([data-mode='dark']) .mcp-header {
    background-color: rgba(30, 41, 59, 0.5);
    border-color: #334155;
  }

  :global(.dark) .mcp-header-text,
  :global([data-mode='dark']) .mcp-header-text {
    color: #94a3b8;
  }

  :global(.dark) .mcp-badge-active,
  :global([data-mode='dark']) .mcp-badge-active {
    background-color: rgba(22, 163, 74, 0.2);
    color: #4ade80;
  }

  :global(.dark) .mcp-badge-inactive,
  :global([data-mode='dark']) .mcp-badge-inactive {
    background-color: #1e293b;
    color: #94a3b8;
  }

  :global(.dark) .mcp-content,
  :global([data-mode='dark']) .mcp-content {
    background-color: #0f172a;
  }

  :global(.dark) .mcp-card,
  :global([data-mode='dark']) .mcp-card {
    background-color: #1e293b;
    border-color: #334155;
  }

  :global(.dark) .mcp-card-title,
  :global([data-mode='dark']) .mcp-card-title {
    color: #f1f5f9;
  }

  :global(.dark) .mcp-card-subtitle,
  :global([data-mode='dark']) .mcp-card-subtitle {
    color: #94a3b8;
  }

  /* Empty State - Light Mode */
  .mcp-empty-state {
    background-color: #f8fafc;
    border-color: #e2e8f0;
  }

  .mcp-empty-icon {
    color: #cbd5e1;
  }

  .mcp-empty-title {
    color: #64748b;
  }

  .mcp-empty-subtitle {
    color: #94a3b8;
  }

  /* Empty State - Dark Mode */
  :global(.dark) .mcp-empty-state,
  :global([data-mode='dark']) .mcp-empty-state {
    background-color: #1e293b;
    border-color: #334155;
  }

  :global(.dark) .mcp-empty-icon,
  :global([data-mode='dark']) .mcp-empty-icon {
    color: #475569;
  }

  :global(.dark) .mcp-empty-title,
  :global([data-mode='dark']) .mcp-empty-title {
    color: #94a3b8;
  }

  :global(.dark) .mcp-empty-subtitle,
  :global([data-mode='dark']) .mcp-empty-subtitle {
    color: #64748b;
  }
</style>
