<script lang="ts">
  import { mcp } from '$lib/stores/mcp';
  import { currentTheme } from '$lib/stores/theme';
  import { spec } from '$lib/stores/spec';
  import { toast } from '$lib/stores/toast';
  import { slide } from 'svelte/transition';

  let showCode = false;

  async function handleGenerateMCP() {
    console.log('[MCP] Generate button clicked');
    console.log('[MCP] Current spec:', $spec);

    mcp.setGenerating(true);
    try {
      console.log('[MCP] Sending request to /api/mcp/generate');
      const response = await fetch('/api/mcp/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ yaml: $spec }),
      });

      console.log('[MCP] Response status:', response.status);
      console.log('[MCP] Response ok:', response.ok);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[MCP] Error response:', errorText);
        throw new Error(`Failed to generate MCP server: ${response.status} ${errorText}`);
      }

      const result = await response.json();
      console.log('[MCP] Generation successful:', result);

      mcp.setGeneratedCode(result.code);
      mcp.setStatus({
        isRunning: true, // Simulate running for demo
        tools: result.tools,
        port: 3000,
      });

      showCode = true;
      toast.success('MCP Server generated successfully');
    } catch (error) {
      console.error('[MCP] Generation failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
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

<div class="h-full flex flex-col bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100">
  <!-- Header -->
  <div
    class="flex items-center justify-between px-4 py-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50"
  >
    <h2 class="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
      Model Context Protocol
    </h2>
    <div class="flex items-center gap-2">
      {#if $mcp.status.isRunning}
        <span
          class="flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400 font-medium px-2 py-0.5 bg-green-100 dark:bg-green-900/30 rounded-full"
        >
          <span class="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
          Active
        </span>
      {:else}
        <span class="text-xs text-gray-500 px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded-full">
          Inactive
        </span>
      {/if}
    </div>
  </div>

  <!-- Content -->
  <div class="flex-1 overflow-auto p-4 space-y-6">
    <!-- Server Status -->
    <div
      class="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-300 dark:border-gray-600 shadow-sm"
    >
      <div class="flex items-center justify-between mb-4">
        <div>
          <h3 class="font-medium text-lg text-gray-900 dark:text-gray-100">MCP Server</h3>
          <p class="text-sm text-gray-600 dark:text-gray-400">
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
                <div
                  class="p-2 bg-gray-50 dark:bg-black rounded border border-gray-300 dark:border-gray-700"
                >
                  <div class="flex items-center justify-between mb-1">
                    <span class="font-mono text-sm font-medium text-purple-600 dark:text-purple-400"
                      >{tool.name}</span
                    >
                  </div>
                  <p class="text-xs text-gray-600 dark:text-gray-400">{tool.description}</p>
                </div>
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
            class="p-3 text-xs font-mono overflow-auto max-h-96 bg-gray-50 dark:bg-black text-gray-800 dark:text-gray-200">{$mcp.generatedCode}</pre>
        {/if}
      </div>
    {:else if $currentTheme === 'halloween'}
      <div
        class="flex flex-col items-center justify-center h-48 text-gray-400 text-center border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg"
      >
        <span class="text-5xl mb-3 block">🔮</span>
        <p class="text-sm font-semibold text-gray-700 dark:text-gray-400">
          The crystal ball is cloudy...
        </p>
        <p class="text-xs mt-1 text-gray-600 dark:text-gray-500">
          Invoke "Generate Server" to manifest the protocol
        </p>
      </div>
    {/if}
  </div>
</div>
