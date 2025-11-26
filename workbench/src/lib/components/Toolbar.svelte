<script lang="ts">
  import { toggleTheme, toggleMode } from '$lib/utils/theme';
  import { currentTheme } from '$lib/stores/theme';
  import { PRESETS } from '$lib/utils/preset-loader';
  import { toast } from '$lib/stores/toast';
  import { isMobile } from '$lib/stores/layout';

  export let onValidate: () => void = () => {};
  export let onGenerate: () => void = () => {};
  export let onGenerateDocs: () => void = () => {};
  export let onRunPBT: () => void = () => {};
  export let onDiscover: (host: string, port: number) => void = () => {};
  export let onLoadPreset: (yamlFile: string) => void = () => {};
  export let onResetLayout: () => void = () => {};
  export let onLoadExample: (name: string) => void = () => {};
  export let onDownloadCode: (language: string) => void = () => {};
  export let isGenerating: boolean = false;
  export let isGeneratingDocs: boolean = false;
  export let isValidating: boolean = false;
  export let isRunningPBT: boolean = false;
  export let isDiscovering: boolean = false;
  export let canGenerate: boolean = true;

  let showOverflowMenu = false;

  function loadExample(name: string) {
    onLoadExample(name);
  }

  function loadRandomExample() {
    const examples = ['gopher', 'finger', 'wais', 'archie', 'demo'];
    const randomExample = examples[Math.floor(Math.random() * examples.length)];

    loadExample(randomExample);

    // Update discovery inputs based on selection
    if (randomExample === 'gopher') {
      discoveryHost = 'gopher.floodgap.com';
      discoveryPort = 70;
    } else if (randomExample === 'finger') {
      discoveryHost = 'finger.floodgap.com';
      discoveryPort = 79;
    } else if (randomExample === 'wais') {
      discoveryHost = 'wais.example.com'; // Placeholder
      discoveryPort = 210;
    } else if (randomExample === 'archie') {
      discoveryHost = 'archie.icm.edu.pl';
      discoveryPort = 1525;
    }
  }

  function downloadCode(language: string) {
    onDownloadCode(language);
  }

  function handleValidate() {
    console.log('Toolbar: handleValidate called');
    onValidate();
  }

  function handleGenerate() {
    console.log('Toolbar: handleGenerate called');
    onGenerate();
  }

  function handleGenerateDocs() {
    onGenerateDocs();
  }

  function handleResetLayout() {
    console.log('Toolbar: handleResetLayout called');
    onResetLayout();
  }

  let showDiscoveryInput = false;
  let showSimulationMenu = false;
  let discoveryTab: 'live' | 'preset' = 'live';
  let discoveryHost = 'gopher.floodgap.com';
  let discoveryPort = 70;
  let discoveryError = '';

  function handleDiscoverClick() {
    showDiscoveryInput = !showDiscoveryInput;
    showSimulationMenu = false;
    discoveryTab = 'live';
    discoveryError = '';
  }

  function handleRunPBT() {
    showSimulationMenu = !showSimulationMenu;
    showDiscoveryInput = false;
  }

  function handlePresetClick(yamlFile: string) {
    onLoadPreset(yamlFile);
    showDiscoveryInput = false;
  }

  function validateDiscoveryInput(): boolean {
    // Validate hostname
    if (!discoveryHost || discoveryHost.trim() === '') {
      discoveryError = 'Hostname is required';
      return false;
    }

    // Validate port
    if (discoveryPort < 1 || discoveryPort > 65535) {
      discoveryError = 'Port must be between 1 and 65535';
      return false;
    }

    discoveryError = '';
    return true;
  }

  function handleDiscoverSubmit() {
    if (validateDiscoveryInput()) {
      onDiscover(discoveryHost, discoveryPort);
      showDiscoveryInput = false;
    }
  }

  function handleKeyPress(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      handleDiscoverSubmit();
    } else if (event.key === 'Escape') {
      showDiscoveryInput = false;
      discoveryError = '';
    }
  }

  function loadFinger() {
    discoveryHost = 'finger.floodgap.com';
    discoveryPort = 79;
    showDiscoveryInput = true;
    discoveryError = '';
  }

  // Seasonal Logic
  const today = new Date();
  const isStandardHalloween =
    (today.getMonth() === 9 && today.getDate() >= 25) ||
    (today.getMonth() === 10 && today.getDate() <= 1);
  // Special extension for Resurrection Phase: Nov 2025 - Jan 2026
  const isResurrectionPhase =
    (today.getFullYear() === 2025 && today.getMonth() >= 10) ||
    (today.getFullYear() === 2026 && today.getMonth() === 0);

  const isHalloweenSeason = isStandardHalloween || isResurrectionPhase;

  // Spooky Theme Classes
  $: isHalloween = $currentTheme === 'halloween';

  $: toolbarClasses = isHalloween
    ? 'toolbar flex items-center justify-between px-2 sm:px-3 md:px-4 py-2 sm:py-2.5 md:py-3 bg-white dark:bg-gray-900 border-b-4 border-orange-500 min-h-[56px]'
    : 'toolbar flex items-center justify-between px-2 sm:px-3 md:px-4 py-2 sm:py-2.5 md:py-3 bg-white dark:bg-gray-900 border-b-2 border-gray-200 dark:border-gray-700 min-h-[56px]';
</script>

<div class={toolbarClasses}>
  <!-- Left side - Action buttons -->
  <div class="flex items-center gap-1 sm:gap-1.5 md:gap-2.5 flex-wrap">
    {#if isHalloween}
      <span class="text-xl mr-2" title="Happy Halloween!">🎃</span>
    {/if}
    <!-- Example loaders -->
    <div
      class="flex items-center gap-0.5 sm:gap-1 mr-1 sm:mr-1.5 md:mr-2 border-r border-gray-300 dark:border-gray-600 pr-1 sm:pr-1.5 md:pr-3"
    >
      <button
        onclick={loadRandomExample}
        class="h-11 min-h-[44px] px-1.5 sm:px-2 md:px-3 py-1 sm:py-1.5 text-xs md:text-sm bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 active:bg-gray-300 dark:active:bg-gray-600 transition-colors font-medium whitespace-nowrap flex items-center justify-center touch-manipulation"
        title="Load Random Example"
      >
        Demo
      </button>
    </div>

    <button
      onclick={handleValidate}
      disabled={isValidating}
      class="h-11 min-h-[44px] px-3 md:px-4 py-1.5 md:py-2 text-white rounded-lg font-medium text-xs sm:text-sm
             hover:opacity-90 hover:scale-[1.02] active:scale-95
             focus:outline-none focus:ring-2 focus:ring-offset-2
             disabled:opacity-50 disabled:cursor-not-allowed transition-all
             shadow-sm whitespace-nowrap flex items-center justify-center touch-manipulation
             {isHalloween
        ? 'bg-[#6b2cf5] focus:ring-[#6b2cf5] dark:bg-[#6b2cf5] dark:hover:bg-[#5a24d1] active:bg-[#5a24d1]'
        : 'bg-[#227BFF] focus:ring-[#227BFF] dark:bg-blue-600 dark:hover:bg-blue-700 active:bg-blue-800'}"
      aria-label={isHalloween ? 'Exorcise demons' : 'Validate specification'}
      title={isHalloween
        ? 'Check for demons (errors) in the code'
        : 'Validate YAML specification (Ctrl+S)'}
    >
      <span class="flex items-center gap-1 sm:gap-1.5 md:gap-2">
        {#if isValidating}
          <svg
            class="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5 animate-spin"
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
        {:else}
          <svg
            class="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        {/if}
        <span class="hidden sm:inline">{isHalloween ? 'Exorcise' : 'Validate'}</span>
      </span>
    </button>

    <button
      onclick={handleGenerate}
      disabled={!canGenerate || isGenerating}
      class="h-11 min-h-[44px] px-3 md:px-4 py-1.5 md:py-2 text-white rounded-lg font-medium text-xs sm:text-sm
             hover:opacity-90 hover:scale-[1.02] active:scale-95
             focus:outline-none focus:ring-2 focus:ring-offset-2
             disabled:opacity-50 disabled:cursor-not-allowed transition-all
             shadow-sm whitespace-nowrap flex items-center justify-center touch-manipulation
             {isHalloween
        ? 'bg-[#39ff14] text-black focus:ring-[#39ff14] dark:bg-[#39ff14] dark:text-black dark:hover:bg-[#32e010] active:bg-[#2dd00e]'
        : 'bg-[#2DBA64] focus:ring-[#2DBA64] dark:bg-green-600 dark:hover:bg-green-700 active:bg-green-800'}"
      aria-label={isHalloween ? 'Resurrect code' : 'Generate code'}
      title={isHalloween
        ? 'Resurrect the protocol from the dead'
        : 'Generate code for all languages (Ctrl+G)'}
    >
      <span class="flex items-center gap-1 sm:gap-1.5 md:gap-2">
        {#if isGenerating}
          {#if isHalloween}
            <span class="animate-bounce">⚗️</span>
          {:else}
            <svg
              class="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5 animate-spin"
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
          {/if}
        {:else}
          <svg
            class="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
            />
          </svg>
        {/if}
        <span class="hidden sm:inline">{isHalloween ? 'Resurrect' /* ⚰️ */ : 'Generate'}</span>
      </span>
    </button>

    <!-- Hide Docs button on mobile, show in overflow menu -->
    <button
      onclick={handleGenerateDocs}
      disabled={!canGenerate || isGeneratingDocs}
      class="hidden sm:flex h-11 min-h-[44px] px-3 md:px-4 py-1.5 md:py-2 bg-[#00B8D9] text-white rounded-lg font-medium text-sm
             hover:opacity-90 hover:scale-[1.02] active:scale-95
             focus:outline-none focus:ring-2 focus:ring-[#00B8D9] focus:ring-offset-2
             disabled:opacity-50 disabled:cursor-not-allowed transition-all
             dark:bg-cyan-600 dark:text-white dark:hover:bg-cyan-700 active:bg-cyan-800 shadow-sm items-center justify-center touch-manipulation
             {isHalloween ? 'bg-[#00e5ff] text-black dark:bg-[#00e5ff] dark:text-black active:bg-[#00d1e6]' : ''}"
      aria-label="Generate documentation"
      title="Generate documentation (README, API, Usage)"
    >
      <span class="flex items-center gap-1.5 md:gap-2">
        {#if isGeneratingDocs}
          <svg
            class="w-4 h-4 md:w-5 md:h-5 animate-spin"
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
        {:else}
          <svg class="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        {/if}
        <span class="hidden sm:inline">Docs</span>
      </span>
    </button>

    <div class="relative inline-flex shadow-sm rounded-lg">
      <button
        onclick={onRunPBT}
        disabled={!canGenerate || isRunningPBT}
        class="h-11 min-h-[44px] px-3 md:px-4 py-1.5 md:py-2 text-white rounded-l-lg font-medium text-sm
               hover:opacity-90 hover:scale-[1.02] active:scale-95
               focus:outline-none focus:ring-2 focus:ring-offset-2
               disabled:opacity-50 disabled:cursor-not-allowed transition-all
               shadow-sm flex items-center justify-center touch-manipulation
               {isHalloween
          ? 'bg-[#ff7518] focus:ring-[#ff7518] dark:bg-[#ff7518] dark:hover:bg-[#e66a15] active:bg-[#d66013]'
          : 'bg-[#2DBA64] focus:ring-[#2DBA64] dark:bg-green-600 dark:hover:bg-green-700 active:bg-green-800'}"
        aria-label="Simulate network"
        title="Run network simulation"
      >
        <span class="flex items-center gap-1.5 md:gap-2">
          {#if isRunningPBT}
            <svg
              class="w-4 h-4 md:w-5 md:h-5 animate-spin"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                />
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </path></svg
            >
          {/if}
          <span class="hidden sm:inline"
            >{isHalloween ? "It's Alive!" /* ⚡ */ : '▶ Simulate'}</span
          >
          <span class="sm:hidden">{isHalloween ? 'Alive' /* ⚡ */ : '▶'}</span>
        </span>
      </button>
      <button
        onclick={handleRunPBT}
        class="h-11 min-h-[44px] px-2 py-1.5 md:py-2 text-white rounded-r-lg font-medium text-sm
               hover:opacity-90 active:scale-95
               focus:outline-none focus:ring-2 focus:ring-offset-2
               transition-all
               shadow-sm flex items-center justify-center border-l border-white/20 touch-manipulation
               {isHalloween
          ? 'bg-[#ff7518] focus:ring-[#ff7518] dark:bg-[#ff7518] dark:hover:bg-[#e66a15] active:bg-[#d66013]'
          : 'bg-[#2DBA64] focus:ring-[#2DBA64] dark:bg-green-600 dark:hover:bg-green-700 active:bg-green-800'}"
        aria-label="Simulation options"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {#if showSimulationMenu}
        <div
          class="absolute top-full left-0 sm:left-auto sm:right-0 mt-2 p-4 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-50 w-[calc(100vw-2rem)] sm:w-96 max-w-lg"
        >
          <div class="flex items-center justify-between mb-3">
            <div class="text-sm font-medium text-gray-700 dark:text-gray-300">Presets</div>
          </div>

          <div class="space-y-4">
            <!-- Presets -->
            <div class="space-y-2">
              <div class="text-xs text-gray-600 dark:text-gray-400 mb-1">Load Preset Scenario</div>
              <div class="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto">
                {#each PRESETS as preset}
                  <button
                    onclick={() => {
                      handlePresetClick(preset.yamlFile);
                      showSimulationMenu = false;
                    }}
                    class="text-left p-3 rounded-lg border-2 transition-all hover:scale-[1.02]
                    {preset.theme === 'blue'
                      ? 'border-blue-200 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-950/30'
                      : preset.theme === 'orange'
                        ? 'border-orange-200 dark:border-orange-800 hover:bg-orange-50 dark:hover:bg-orange-950/30'
                        : 'border-green-200 dark:border-green-800 hover:bg-green-50 dark:hover:bg-green-950/30'}"
                  >
                    <div class="flex items-center gap-2 mb-1">
                      <span class="text-2xl">{preset.icon}</span>
                      <span class="font-bold text-gray-900 dark:text-white">{preset.name}</span>
                    </div>
                    <p class="text-xs text-gray-600 dark:text-gray-400">{preset.description}</p>
                  </button>
                {/each}
              </div>
            </div>
          </div>
        </div>
      {/if}
    </div>

    <!-- Hide Discover button on mobile, show in overflow menu -->
    <div class="relative hidden sm:block">
      <button
        onclick={handleDiscoverClick}
        disabled={isDiscovering}
        class="h-11 min-h-[44px] px-3 md:px-4 py-1.5 md:py-2 text-white rounded-lg font-medium text-sm
               hover:opacity-90 hover:scale-[1.02] active:scale-95
               focus:outline-none focus:ring-2 focus:ring-offset-2
               disabled:opacity-50 disabled:cursor-not-allowed transition-all
               shadow-sm flex items-center justify-center touch-manipulation
               {isHalloween
          ? 'bg-[#4b5563] focus:ring-[#4b5563] dark:bg-[#4b5563] dark:hover:bg-[#374151] active:bg-[#2d3748]'
          : 'bg-gray-600 focus:ring-gray-600 dark:bg-gray-700 dark:hover:bg-gray-600 active:bg-gray-800'}"
        aria-label="Discover protocol"
        title="Discover protocol on host:port"
      >
        <span class="flex items-center gap-1.5 md:gap-2">
          {#if isDiscovering}
            <svg
              class="w-4 h-4 md:w-5 md:h-5 animate-spin"
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
          {:else}
            <svg
              class="w-4 h-4 md:w-5 md:h-5"
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
          {/if}
          <span class="hidden sm:inline">Discover</span>
        </span>
      </button>

      {#if showDiscoveryInput}
        <div
          class="absolute top-full left-0 sm:left-auto sm:right-0 mt-2 p-4 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-50 w-[calc(100vw-2rem)] sm:w-96 max-w-lg"
        >
          <div class="flex items-center justify-between mb-3">
            <div class="text-sm font-medium text-gray-700 dark:text-gray-300">
              Protocol Discovery
            </div>
          </div>

          <!-- Live Scan Content (Tabs removed) -->
          <div class="space-y-3">
            <div>
              <label
                for="discovery-host"
                class="block text-sm text-gray-600 dark:text-gray-400 mb-1"
              >
                Hostname
              </label>
              <input
                id="discovery-host"
                type="text"
                bind:value={discoveryHost}
                onkeypress={handleKeyPress}
                placeholder="gopher.floodgap.com"
                class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                       bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100
                       focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
              />
            </div>

            <div>
              <label
                for="discovery-port"
                class="block text-sm text-gray-600 dark:text-gray-400 mb-1"
              >
                Port
              </label>

              <input
                id="discovery-port"
                type="number"
                bind:value={discoveryPort}
                onkeypress={handleKeyPress}
                min="1"
                max="65535"
                placeholder="70"
                class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                       bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100
                       focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
              />
            </div>

            {#if discoveryError}
              <div class="text-sm text-red-600 dark:text-red-400">
                {discoveryError}
              </div>
            {/if}

            <div class="flex gap-2">
              <button
                onclick={handleDiscoverSubmit}
                class="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700
                       focus:outline-none focus:ring-2 focus:ring-orange-500 transition-colors text-sm font-medium"
              >
                Discover
              </button>
              <button
                onclick={() => {
                  showDiscoveryInput = false;
                  discoveryError = '';
                }}
                class="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600
                       focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors text-sm font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      {/if}
    </div>

    <!-- Mobile overflow menu button -->
    <div class="relative sm:hidden">
      <button
        onclick={() => (showOverflowMenu = !showOverflowMenu)}
        class="h-11 min-h-[44px] px-3 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-lg
               hover:bg-gray-200 dark:hover:bg-gray-700 active:bg-gray-300 dark:active:bg-gray-600
               focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors touch-manipulation
               flex items-center justify-center"
        aria-label="More actions"
        title="More actions"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
          />
        </svg>
      </button>

      {#if showOverflowMenu}
        <div
          class="absolute top-full right-0 mt-2 p-2 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-50 w-56"
        >
          <button
            onclick={() => {
              handleGenerateDocs();
              showOverflowMenu = false;
            }}
            disabled={!canGenerate || isGeneratingDocs}
            class="w-full h-11 min-h-[44px] px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300
                   hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors
                   disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 touch-manipulation"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            Generate Docs
          </button>

          <button
            onclick={() => {
              handleDiscoverClick();
              showOverflowMenu = false;
            }}
            disabled={isDiscovering}
            class="w-full h-11 min-h-[44px] px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300
                   hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors
                   disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 touch-manipulation"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            Discover Protocol
          </button>
        </div>
      {/if}
    </div>
  </div>

  <!-- Right side - Layout controls and theme toggle -->
  <div class="flex items-center gap-1.5 md:gap-2">
    <button
      onclick={handleResetLayout}
      class="h-11 min-h-[44px] px-2 md:px-3 py-1.5 md:py-2 text-xs md:text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200
			       hover:bg-gray-100 dark:hover:bg-gray-800 active:bg-gray-200 dark:active:bg-gray-700 rounded-lg font-medium
			       focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors touch-manipulation"
      aria-label="Reset layout"
      title="Reset layout to default"
    >
      <span class="flex items-center gap-1">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
          />
        </svg>
        <span class="hidden md:inline">Reset Layout</span>
      </span>
    </button>

    <!-- Halloween Toggle -->
    <button
      onclick={() => {
        toggleTheme();
        // Check theme AFTER toggle to show correct message
        setTimeout(() => {
          const isPro = $currentTheme === 'pro';
          toast.success(`Switched to ${isPro ? 'Pro' : 'Halloween'} Theme`);
        }, 50);
      }}
      class="p-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300
             hover:bg-gray-200 dark:hover:bg-gray-700 active:bg-gray-300 dark:active:bg-gray-600 rounded-lg transition-all
             focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[44px] min-h-[44px] w-11 h-11 flex items-center justify-center touch-manipulation"
      aria-label="Switch theme"
      title="Switch between Halloween and Pro themes"
    >
      <span class="text-xl">🎃</span>
    </button>

    <!-- Mode Toggle (Light/Dark) -->
    <button
      onclick={toggleMode}
      class="p-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300
             hover:bg-gray-200 dark:hover:bg-gray-700 active:bg-gray-300 dark:active:bg-gray-600 rounded-lg transition-all
             focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[44px] min-h-[44px] w-11 h-11 flex items-center justify-center touch-manipulation"
      aria-label="Toggle dark mode"
      title="Toggle light/dark mode"
    >
      <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path
          class="dark:hidden"
          d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
        />
        <path
          class="hidden dark:block"
          d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
        />
      </svg>
    </button>
  </div>
</div>

{#if showDiscoveryInput}
  <!-- Backdrop to close dropdown when clicking outside -->
  <button
    onclick={() => {
      showDiscoveryInput = false;
      discoveryError = '';
    }}
    class="fixed inset-0 z-40"
    aria-label="Close discovery input"
    tabindex="-1"
  ></button>
{/if}

{#if showSimulationMenu}
  <!-- Backdrop to close dropdown when clicking outside -->
  <button
    onclick={() => {
      showSimulationMenu = false;
    }}
    class="fixed inset-0 z-40"
    aria-label="Close simulation menu"
    tabindex="-1"
  ></button>
{/if}

{#if showOverflowMenu}
  <!-- Backdrop to close overflow menu when clicking outside -->
  <button
    onclick={() => {
      showOverflowMenu = false;
    }}
    class="fixed inset-0 z-40"
    aria-label="Close overflow menu"
    tabindex="-1"
  ></button>
{/if}
