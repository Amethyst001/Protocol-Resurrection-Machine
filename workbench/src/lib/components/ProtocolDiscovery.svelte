<script lang="ts">
  import { discovery } from '$lib/stores/discovery';
  import { theme, currentTheme } from '$lib/stores/theme';
  import { slide } from 'svelte/transition';

  let showFingerprints = false;
  let importError = '';

  function getConfidenceColor(score: number): string {
    if (score >= 0.8) return 'text-green-600 dark:text-green-400';
    if (score >= 0.5) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  }

  function getConfidenceBg(score: number): string {
    if (score >= 0.8) return 'bg-green-100 dark:bg-green-900/30';
    if (score >= 0.5) return 'bg-yellow-100 dark:bg-yellow-900/30';
    return 'bg-red-100 dark:bg-red-900/30';
  }

  function formatTimestamp(isoString: string): string {
    const date = new Date(isoString);
    return date.toLocaleTimeString(undefined, {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3,
    });
  }

  async function handleExportFingerprints() {
    try {
      const response = await fetch('/api/fingerprints');
      if (!response.ok) throw new Error('Failed to fetch fingerprints');

      const data = await response.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = 'protocol-fingerprints.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
    }
  }

  async function handleImportFingerprints(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const content = e.target?.result as string;
        const fingerprints = JSON.parse(content);

        const response = await fetch('/api/fingerprints', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(fingerprints),
        });

        if (!response.ok) throw new Error('Failed to import fingerprints');

        // Refresh fingerprints
        const refreshResponse = await fetch('/api/fingerprints');
        if (refreshResponse.ok) {
          const data = await refreshResponse.json();
          discovery.setFingerprints(data);
        }

        importError = '';
      } catch (error) {
        console.error('Import failed:', error);
        importError = 'Invalid fingerprint file';
      }
    };

    reader.readAsText(file);
  }
</script>

<div class="h-full flex flex-col bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100">
  <!-- Header -->
  <div
    class="flex items-center justify-between px-4 py-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50"
  >
    <h2 class="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
      Protocol Discovery
    </h2>
    <div class="flex gap-2">
      <button
        class="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded text-gray-500 dark:text-gray-400"
        title="Manage Fingerprints"
        onclick={() => (showFingerprints = !showFingerprints)}
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
          />
        </svg>
      </button>
    </div>
  </div>

  <!-- Fingerprint Management Panel -->
  {#if showFingerprints}
    <div
      class="p-4 border-b border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
      transition:slide
    >
      <div class="flex justify-between items-center mb-3">
        <h3 class="font-medium text-gray-900 dark:text-gray-100">Fingerprint Database</h3>
        <div class="flex gap-2">
          <button
            onclick={handleExportFingerprints}
            class="px-3 py-1 text-xs bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100 transition-colors"
          >
            Export JSON
          </button>
          <label
            class="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 cursor-pointer transition-colors"
          >
            Import JSON
            <input type="file" accept=".json" class="hidden" onchange={handleImportFingerprints} />
          </label>
        </div>
      </div>
      {#if importError}
        <div class="text-xs text-red-600 dark:text-red-400 mb-2">{importError}</div>
      {/if}
      <div class="text-xs text-gray-600 dark:text-gray-400">
        {$discovery.fingerprints.length} fingerprints loaded
      </div>
    </div>
  {/if}

  <!-- Content -->
  <div class="flex-1 overflow-auto p-4 space-y-6">
    {#if $discovery.isDiscovering}
      <div class="flex flex-col items-center justify-center h-32 text-gray-500">
        <svg
          class="w-8 h-8 animate-spin mb-2 text-orange-500"
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
        <span class="text-sm">Analyzing traffic patterns...</span>
      </div>
    {:else if $discovery.result}
      <!-- Identification Result -->
      <div class="rounded-lg border border-gray-300 dark:border-gray-600 overflow-hidden shadow-sm">
        {#if $discovery.result.identified}
          <div
            class="p-4 {$discovery.result.identified.confidence > 0.8
              ? 'bg-green-50 dark:bg-green-900/20'
              : 'bg-yellow-50 dark:bg-yellow-900/20'}"
          >
            <div class="flex items-center justify-between mb-2">
              <h3
                class="text-lg font-bold flex items-center gap-2 text-gray-900 dark:text-gray-100"
              >
                <span class="uppercase">{$discovery.result.identified.protocol}</span>
                <span
                  class="text-xs px-2 py-0.5 rounded-full border {getConfidenceColor(
                    $discovery.result.identified.confidence
                  )} {getConfidenceBg($discovery.result.identified.confidence)} border-current"
                >
                  {Math.round($discovery.result.identified.confidence * 100)}% Match
                </span>
              </h3>
              <span class="text-xs text-gray-600 dark:text-gray-400 font-mono"
                >{$discovery.result.identified.specPath}</span
              >
            </div>

            <div class="space-y-1">
              <div
                class="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-1"
              >
                Matched Features
              </div>
              {#each $discovery.result.identified.matchedFeatures as feature}
                <div class="flex items-center gap-2 text-sm text-gray-800 dark:text-gray-200">
                  <svg
                    class="w-4 h-4 text-green-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  {feature}
                </div>
              {/each}
            </div>
          </div>
        {:else}
          <div class="p-4 bg-white dark:bg-gray-800">
            <div class="flex items-center gap-2 text-yellow-600 dark:text-yellow-400 mb-2">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <h3 class="font-bold">Unknown Protocol</h3>
            </div>
            <p class="text-sm text-gray-600 dark:text-gray-400">
              Could not confidently identify the protocol. Try adding more fingerprints or checking
              the connection.
            </p>
          </div>
        {/if}
      </div>

      <!-- Suggestions -->
      {#if $discovery.result.suggestions.length > 0}
        <div
          class="bg-blue-50 dark:bg-blue-950/40 rounded-lg p-3 border border-blue-200 dark:border-blue-800 shadow-sm"
        >
          <div
            class="text-xs font-semibold text-blue-700 dark:text-blue-300 uppercase tracking-wider mb-2"
          >
            Suggestions
          </div>
          <ul class="space-y-1">
            {#each $discovery.result.suggestions as suggestion}
              <li class="text-sm text-blue-900 dark:text-blue-100 flex items-start gap-2">
                <span class="mt-1.5 w-1 h-1 rounded-full bg-blue-500 dark:bg-blue-400 flex-shrink-0"
                ></span>
                {suggestion}
              </li>
            {/each}
          </ul>
        </div>
      {/if}

      <!-- Traffic Analysis -->
      <div>
        <h3
          class="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3"
        >
          Traffic Analysis ({$discovery.result.packets.length} packets)
        </h3>
        <div class="space-y-2 font-mono text-xs">
          {#each $discovery.result.packets as packet}
            <div
              class="flex gap-3 p-2 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors shadow-sm"
            >
              <div class="text-gray-500 dark:text-gray-400 w-20 flex-shrink-0">
                {formatTimestamp(packet.timestamp)}
              </div>
              <div class="flex-shrink-0 w-8">
                {#if packet.direction === 'sent'}
                  <span class="text-blue-600 dark:text-blue-400 font-bold">TX</span>
                {:else}
                  <span class="text-green-600 dark:text-green-400 font-bold">RX</span>
                {/if}
              </div>
              <div class="flex-1 break-all">
                {#if packet.parsed}
                  <div class="text-purple-600 dark:text-purple-400 font-bold mb-1">
                    {packet.parsed.type}
                  </div>
                  <div class="text-gray-700 dark:text-gray-200">
                    {JSON.stringify(packet.parsed.fields)}
                  </div>
                {:else}
                  <div class="text-gray-600 dark:text-gray-300">
                    {packet.hex}
                  </div>
                  {#if packet.error}
                    <div class="text-red-600 dark:text-red-400 mt-1 italic">{packet.error}</div>
                  {/if}
                {/if}
              </div>
              <div class="text-gray-500 dark:text-gray-400 text-right w-12 flex-shrink-0">
                {packet.length}B
              </div>
            </div>
          {/each}
        </div>
      </div>
    {:else}
      <div class="flex flex-col items-center justify-center h-64 text-gray-400 text-center">
        {#if $currentTheme === 'halloween'}
          <span class="text-6xl mb-4 block">🕸️</span>
          <p class="text-sm font-semibold text-gray-700 dark:text-gray-400">
            The spirits are silent...
          </p>
          <p class="text-xs mt-1 text-gray-600 dark:text-gray-500">
            Cast "Discover" to sense the ethereal plane
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
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <p class="text-sm">No discovery results yet.</p>
          <p class="text-xs mt-1">Click "Discover" in the toolbar to analyze a protocol.</p>
        {/if}
      </div>
    {/if}
  </div>
</div>
