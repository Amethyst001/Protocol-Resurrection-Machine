<script lang="ts" context="module">
  export interface LogContext {
    file?: string;
    line?: number;
    column?: number;
    code?: string;
    [key: string]: any;
  }

  export interface LogEntry {
    timestamp: Date;
    level: 'error' | 'warning' | 'info';
    message: string;
    context?: LogContext;
    suggestion?: string;
  }
</script>

<script lang="ts">
  import { afterUpdate } from 'svelte';
  import { slide } from 'svelte/transition';
  import { currentTheme } from '$lib/stores/theme';
  import { topologyState } from '$lib/stores/topology-state';
  import { isMobile } from '$lib/stores/layout';

  export let logs: LogEntry[] = [];
  export let autoScroll: boolean = true;
  export let collapsed: boolean = false;

  $: console.log('Console component logs:', logs);

  let consoleElement: HTMLDivElement;
  let shouldAutoScroll = true;
  let expandedLogs: Set<number> = new Set();
  let touchStartY = 0;
  let touchEndY = 0;

  function formatTimestamp(date: Date): string {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    const ms = date.getMilliseconds().toString().padStart(3, '0');
    return `${hours}:${minutes}:${seconds}.${ms}`;
  }

  function getLevelColor(level: LogEntry['level']): string {
    switch (level) {
      case 'error':
        return 'text-red-600 dark:text-red-400';
      case 'warning':
        return 'text-yellow-600 dark:text-yellow-400';
      case 'info':
        return 'text-blue-600 dark:text-blue-400';
    }
  }

  function getLevelIcon(level: LogEntry['level']): string {
    switch (level) {
      case 'error':
        return '✖';
      case 'warning':
        return '⚠';
      case 'info':
        return 'ℹ';
    }
  }

  /**
   * Parse log message for language prefixes and colorize them
   * Supports: [RUST], [GO], [PYTHON], [TYPESCRIPT], [SYSTEM]
   */
  function parseLogMessage(
    message: string
  ): { prefix: string; color: string; rest: string } | null {
    const prefixMatch = message.match(/^\[([A-Z]+)\]\s*(.*)$/);
    if (!prefixMatch) return null;

    const [, lang, rest] = prefixMatch;

    const isHalloween = $currentTheme === 'halloween';

    const colorMap: Record<string, string> = {
      RUST: isHalloween ? 'text-[#ff4500]' : 'text-orange-600 dark:text-orange-400',
      GO: isHalloween ? 'text-[#39ff14]' : 'text-cyan-600 dark:text-cyan-400',
      PYTHON: isHalloween ? 'text-[#bf00ff]' : 'text-blue-600 dark:text-blue-400',
      TYPESCRIPT: 'text-indigo-600 dark:text-indigo-400',
      SYSTEM: 'text-gray-600 dark:text-gray-400',
    };

    // Update topology state based on log prefix
    if (['RUST', 'GO', 'PYTHON', 'TYPESCRIPT'].includes(lang)) {
      const lowerLang = lang.toLowerCase() as 'rust' | 'go' | 'python' | 'typescript';
      topologyState.set(lowerLang);

      // Reset after a short delay to create a "pulse" effect
      setTimeout(() => {
        topologyState.update((current) => (current === lowerLang ? null : current));
      }, 1000);
    }

    return {
      prefix: `[${lang}]`,
      color: colorMap[lang] || 'text-gray-600 dark:text-gray-400',
      rest: rest,
    };
  }

  function clearLogs() {
    logs = [];
  }

  function toggleLog(index: number) {
    if (expandedLogs.has(index)) {
      expandedLogs.delete(index);
    } else {
      expandedLogs.add(index);
    }
    expandedLogs = expandedLogs;
  }

  function handleScroll() {
    if (!consoleElement) return;
    const isAtBottom =
      consoleElement.scrollHeight - consoleElement.scrollTop <= consoleElement.clientHeight + 50;
    shouldAutoScroll = isAtBottom;
  }

  afterUpdate(() => {
    if (autoScroll && shouldAutoScroll && consoleElement) {
      consoleElement.scrollTop = consoleElement.scrollHeight;
    }
  });

  // Handle swipe gesture to collapse on mobile
  function handleTouchStart(event: TouchEvent) {
    if (!$isMobile) return;
    touchStartY = event.touches[0].clientY;
  }

  function handleTouchMove(event: TouchEvent) {
    if (!$isMobile) return;
    touchEndY = event.touches[0].clientY;
  }

  function handleTouchEnd() {
    if (!$isMobile) return;
    const swipeDistance = touchStartY - touchEndY;
    
    // Swipe down to collapse (threshold: 50px)
    if (swipeDistance < -50 && !collapsed) {
      collapsed = true;
    }
    // Swipe up to expand (threshold: 50px)
    else if (swipeDistance > 50 && collapsed) {
      collapsed = false;
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text).then(() => {
      // Could show a toast notification here
    });
  }
</script>

<div 
  class="console-container flex flex-col h-full bg-white dark:bg-slate-900"
  ontouchstart={handleTouchStart}
  ontouchmove={handleTouchMove}
  ontouchend={handleTouchEnd}
>
  <div
    class="flex items-center justify-between px-3 sm:px-6 py-3 sm:py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800"
  >
    <div class="flex items-center gap-2">
      <svg
        class="w-4 h-4 text-gray-600 dark:text-gray-400"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
        />
      </svg>
      <span class="text-xs font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-300"
        >Console</span
      >
      <span class="text-xs text-gray-500 dark:text-gray-400">({logs.length})</span>
    </div>

    <div class="flex items-center gap-1 sm:gap-2">
      <label class="hidden sm:flex items-center gap-2 text-sm text-gray-700 dark:text-gray-400">
        <input
          type="checkbox"
          bind:checked={autoScroll}
          class="rounded border-gray-300 dark:border-gray-600"
        />
        <span class="hidden md:inline">Auto-scroll</span>
      </label>

      <button
        onclick={() => (collapsed = !collapsed)}
        class="min-w-[44px] min-h-[44px] p-2 text-sm text-gray-700 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 
               hover:bg-gray-100 dark:hover:bg-gray-700 active:bg-gray-200 dark:active:bg-gray-600
               focus:outline-none focus:ring-2 focus:ring-blue-500 rounded transition-colors touch-manipulation"
        aria-label={collapsed ? 'Expand console' : 'Collapse console'}
        title={collapsed ? 'Expand console' : 'Collapse console'}
      >
        <svg
          class="w-5 h-5 transition-transform"
          class:rotate-180={!collapsed}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      <button
        onclick={clearLogs}
        class="min-w-[44px] min-h-[44px] p-2 text-sm text-gray-700 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 
               hover:bg-gray-100 dark:hover:bg-gray-700 active:bg-gray-200 dark:active:bg-gray-600
               focus:outline-none focus:ring-2 focus:ring-blue-500 rounded transition-colors touch-manipulation"
        aria-label="Clear console"
        title="Clear console"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
          />
        </svg>
      </button>
    </div>
  </div>

  {#if !collapsed}
    <div
      bind:this={consoleElement}
      onscroll={handleScroll}
      class="flex-1 overflow-auto px-3 sm:px-6 py-3 sm:py-4 font-mono text-xs sm:text-sm console-output 
             scroll-smooth {$currentTheme === 'halloween' ? 'console-halloween' : ''}"
      style="overflow-y: auto; -webkit-overflow-scrolling: touch;"
    >
      {#if logs.length === 0}
        <div class="flex items-center justify-center h-full w-full">
          <div
            class="text-center bg-gray-50 dark:bg-gray-800 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg px-12 py-16 max-w-md w-full relative overflow-hidden"
          >
            {#if $currentTheme === 'halloween'}
              <div class="fog-layer"></div>
              <div class="fog-layer-2"></div>
              <div class="relative z-10">
                <span class="text-5xl mb-3 block">⚰️</span>
                <p class="text-sm font-semibold text-gray-700 dark:text-gray-400">
                  The void stares back...
                </p>
                <p class="text-xs mt-1 text-gray-600 dark:text-gray-500">
                  Summon a process to capture its soul
                </p>
              </div>
            {:else}
              <svg
                class="w-12 h-12 mx-auto mb-3 text-gray-400 dark:text-gray-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <p class="text-sm font-semibold text-gray-700 dark:text-gray-400">Console is empty</p>
              <p class="text-xs mt-1 text-gray-600 dark:text-gray-500">
                Operations will log output here
              </p>
            {/if}
          </div>
        </div>
      {:else}
        {#each logs as log, i}
          {@const parsed = parseLogMessage(log.message)}
          <div
            class="py-2 sm:py-2.5 px-2 sm:px-3 border-b border-gray-200 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <div class="flex gap-2 sm:gap-3 items-start">
              <span
                class="text-gray-500 dark:text-gray-400 flex-shrink-0 select-none text-[10px] sm:text-xs mt-0.5"
                >{formatTimestamp(log.timestamp)}</span
              >
              <span class="{getLevelColor(log.level)} flex-shrink-0 font-bold select-none mt-0.5 text-sm"
                >{getLevelIcon(log.level)}</span
              >
              <div class="flex-1 min-w-0">
                <div class="flex items-start justify-between gap-2">
                  {#if parsed}
                    <span
                      class="text-gray-900 dark:text-gray-200 break-words font-medium text-xs sm:text-sm leading-relaxed"
                      style="word-wrap: break-word; overflow-wrap: break-word; white-space: pre-wrap;"
                    >
                      <span class="font-bold {parsed.color}">{parsed.prefix}</span>
                      {parsed.rest}
                    </span>
                  {:else}
                    <span
                      class="text-gray-900 dark:text-gray-200 break-words font-medium text-xs sm:text-sm leading-relaxed"
                      style="word-wrap: break-word; overflow-wrap: break-word; white-space: pre-wrap;"
                    >
                      {log.message}
                    </span>
                  {/if}
                  <div class="flex gap-1 flex-shrink-0">
                    {#if $isMobile}
                      <button
                        onclick={() => copyToClipboard(log.message)}
                        class="min-w-[44px] min-h-[44px] p-2 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 
                               hover:bg-gray-100 dark:hover:bg-gray-700 rounded touch-manipulation"
                        aria-label="Copy message"
                        title="Copy message"
                      >
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                          />
                        </svg>
                      </button>
                    {/if}
                    {#if log.context || log.suggestion}
                      <button
                        onclick={() => toggleLog(i)}
                        class="min-w-[44px] min-h-[44px] p-2 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 
                               hover:bg-gray-100 dark:hover:bg-gray-700 rounded touch-manipulation whitespace-nowrap"
                      >
                        {expandedLogs.has(i) ? 'Hide' : 'Details'}
                      </button>
                    {/if}
                  </div>
                </div>

                {#if expandedLogs.has(i) && (log.context || log.suggestion)}
                  <div class="mt-2 space-y-2" transition:slide>
                    {#if log.suggestion}
                      <div
                        class="bg-blue-50 dark:bg-blue-900/20 p-2 rounded border border-blue-100 dark:border-blue-800"
                      >
                        <span
                          class="text-xs font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wide block mb-1"
                          >Suggestion</span
                        >
                        <p class="text-sm text-blue-800 dark:text-blue-200">{log.suggestion}</p>
                      </div>
                    {/if}

                    {#if log.context}
                      <div
                        class="bg-gray-50 dark:bg-gray-900 p-2 rounded border border-gray-200 dark:border-gray-700"
                      >
                        <span
                          class="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1"
                          >Context</span
                        >
                        <pre
                          class="text-xs overflow-auto max-h-32 text-gray-600 dark:text-gray-400">{JSON.stringify(
                            log.context,
                            null,
                            2
                          )}</pre>
                      </div>
                    {/if}
                  </div>
                {/if}
              </div>
            </div>
          </div>
        {/each}
      {/if}
    </div>
  {/if}
</div>

<style>
  .console-container {
    background: #ffffff;
  }

  .console-output {
    flex: 1;
    overflow-y: auto;
    padding: 0.75rem 0.75rem;
    font-family: 'Fira Code', 'Courier New', monospace;
    font-size: 0.75rem;
    line-height: 1.6;
    background: #ffffff;
    min-height: 80px;
    scroll-behavior: smooth;
    -webkit-overflow-scrolling: touch;
  }

  @media (min-width: 640px) {
    .console-output {
      padding: 1rem 1.5rem;
      font-size: 0.875rem;
    }
  }

  :global(.dark) .console-container {
    background: #0f172a;
  }

  :global(.dark) .console-output {
    background: #0f172a;
  }

  /* Ensure touch targets are properly sized */
  button {
    -webkit-tap-highlight-color: transparent;
  }
</style>
