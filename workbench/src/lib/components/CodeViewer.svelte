<script lang="ts">
  import { onMount } from 'svelte';
  import TopologyDiagram from './TopologyDiagram.svelte';

  export let code: {
    typescript?: string;
    python?: string;
    go?: string;
    rust?: string;
  } = {};
  export let selectedLanguage: 'typescript' | 'python' | 'go' | 'rust' | 'topology' = 'typescript';
  export let protocolName: string = 'demo';
  export let activeNode: 'typescript' | 'python' | 'go' | 'rust' | undefined = undefined;

  // Auto-switch to topology when node becomes active
  $: if (activeNode && selectedLanguage !== 'topology') {
    selectedLanguage = 'topology';
  }

  type Language = 'typescript' | 'python' | 'go' | 'rust' | 'topology';

  const languages: { id: Language; name: string; ext: string; icon?: string }[] = [
    { id: 'typescript', name: 'TypeScript', ext: 'ts' },
    { id: 'python', name: 'Python', ext: 'py' },
    { id: 'go', name: 'Go', ext: 'go' },
    { id: 'rust', name: 'Rust', ext: 'rs' },
    { id: 'topology', name: 'Topology', ext: '' }, // Removed icon
  ];

  import { toast } from '$lib/stores/toast';
  import { currentTheme } from '$lib/stores/theme';

  function copyToClipboard() {
    if (selectedLanguage === 'topology') return;
    const currentCode = code[selectedLanguage];
    if (currentCode) {
      navigator.clipboard
        .writeText(currentCode)
        .then(() => {
          toast.success('Code copied to clipboard!');
        })
        .catch(() => {
          toast.error('Failed to copy code');
        });
    }
  }

  function highlightCode(text: string, lang: Language): string {
    if (!text) return '';

    text = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    const keywords: Record<Language, string[]> = {
      typescript: [
        'function',
        'const',
        'let',
        'var',
        'class',
        'interface',
        'type',
        'export',
        'import',
        'return',
        'if',
        'else',
        'for',
        'while',
      ],
      python: [
        'def',
        'class',
        'import',
        'from',
        'return',
        'if',
        'else',
        'elif',
        'for',
        'while',
        'try',
        'except',
      ],
      go: [
        'func',
        'type',
        'struct',
        'interface',
        'package',
        'import',
        'return',
        'if',
        'else',
        'for',
        'range',
      ],
      rust: [
        'fn',
        'struct',
        'enum',
        'impl',
        'trait',
        'use',
        'pub',
        'return',
        'if',
        'else',
        'for',
        'while',
        'match',
      ],
      topology: [], // No highlighting for topology view
    };

    const langKeywords = keywords[lang] || [];
    langKeywords.forEach((keyword) => {
      const regex = new RegExp(`\\b(${keyword})\\b`, 'g');
      text = text.replace(
        regex,
        '<span class="text-purple-600 dark:text-purple-400 font-semibold">$1</span>'
      );
    });

    text = text.replace(
      /"([^"]*)"/g,
      '<span class="text-green-600 dark:text-green-400">"$1"</span>'
    );
    text = text.replace(
      /'([^']*)'/g,
      '<span class="text-green-600 dark:text-green-400">\'$1\'</span>'
    );
    text = text.replace(
      /\b(\d+\.?\d*)\b/g,
      '<span class="text-orange-600 dark:text-orange-400">$1</span>'
    );
    text = text.replace(
      /\/\/(.*?)$/gm,
      '<span class="text-gray-500 dark:text-gray-500 italic">//$1</span>'
    );
    text = text.replace(
      /#(.*?)$/gm,
      '<span class="text-gray-500 dark:text-gray-500 italic">#$1</span>'
    );
    text = text.replace(
      /\b([A-Z][a-zA-Z0-9]*)\b/g,
      '<span class="text-blue-600 dark:text-blue-400">$1</span>'
    );

    return text;
  }

  $: currentCode =
    selectedLanguage !== 'topology' ? code[selectedLanguage as keyof typeof code] || '' : '';
  $: highlightedCode =
    selectedLanguage !== 'topology' ? highlightCode(currentCode, selectedLanguage) : '';
  $: hasCode = Object.values(code).some((c) => c && c.length > 0);
</script>

<div class="code-viewer-container flex flex-col h-full bg-white dark:bg-slate-900">
  <!-- Language tabs - Compact style -->
  <div
    class="flex items-center gap-1 px-4 py-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-slate-800/50 overflow-x-auto flex-nowrap"
  >
    {#each languages as lang}
      {#if lang.id === 'topology'}
        <!-- Visual separator before Topology -->
        <div class="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-2"></div>
      {/if}
      <button
        onclick={() => (selectedLanguage = lang.id)}
        class="px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 whitespace-nowrap {selectedLanguage ===
        lang.id
          ? lang.id === 'topology'
            ? 'bg-purple-500 text-white shadow-sm'
            : 'bg-blue-500 text-white shadow-sm'
          : 'bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-slate-600'}"
      >
        {#if lang.icon}
          <span class="mr-1">{lang.icon}</span>
        {/if}
        {lang.name}
      </button>
    {/each}

    <div class="flex-1"></div>

    {#if hasCode}
      <!-- Download SDK Button -->
      <button
        onclick={async () => {
          try {
            const response = await fetch('/api/download-sdk', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ code, protocolName }),
            });

            if (!response.ok) throw new Error('Download failed');

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${protocolName}-sdk.zip`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            toast.success('SDK downloaded successfully');
          } catch (error) {
            console.error('Download error:', error);
            toast.error('Failed to download SDK');
          }
        }}
        class="px-3 py-1 text-sm text-gray-700 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded transition-colors flex items-center gap-1"
        aria-label="Download SDK"
        title="Download Protocol SDK"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10"
          />
        </svg>
      </button>

      <!-- Copy Button -->
      <button
        onclick={copyToClipboard}
        class="px-3 py-1 text-sm text-gray-700 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded transition-all active:scale-95 active:text-blue-600 dark:active:text-blue-400"
        aria-label="Copy code to clipboard"
        title="Copy to clipboard"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
          />
        </svg>
      </button>
    {/if}
  </div>

  <!-- Code display -->
  <div class="flex-1 overflow-auto px-6 py-4 code-viewer-output">
    {#if selectedLanguage === 'topology' && hasCode}
      <!-- Topology Diagram View -->
      <div class="h-full w-full">
        <TopologyDiagram />
      </div>
    {:else if !hasCode || (selectedLanguage === 'topology' && !hasCode)}
      <div class="flex items-center justify-center h-full w-full text-gray-500 dark:text-gray-400">
        <div
          class="text-center bg-gray-50 dark:bg-gray-800 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg px-12 py-16 max-w-md w-full"
        >
          {#if $currentTheme === 'halloween'}
            <span class="text-6xl mb-4 block">👻</span>
          {:else}
            <svg
              class="w-16 h-16 mx-auto mb-4 text-gray-400 dark:text-gray-600"
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
          <p class="text-sm font-semibold text-gray-700 dark:text-gray-400">
            {$currentTheme === 'halloween' ? 'The graveyard is silent...' : 'No code generated yet'}
          </p>
          <p class="text-xs mt-2 text-gray-600 dark:text-gray-500">
            {$currentTheme === 'halloween'
              ? 'Resurrect a protocol to begin'
              : 'Click the Generate button to create code'}
          </p>
        </div>
      </div>
    {:else if !currentCode}
      <div class="flex items-center justify-center h-full text-gray-600 dark:text-gray-400">
        <p>No {languages.find((l) => l.id === selectedLanguage)?.name} code available</p>
      </div>
    {:else}
      <pre
        class="text-sm font-mono leading-relaxed code-block p-4 rounded-lg border border-gray-200 dark:border-gray-800"><code
          >{@html highlightedCode}</code
        ></pre>
    {/if}
  </div>
</div>

<style>
  .code-viewer-container {
    background: #ffffff;
  }

  .code-viewer-output {
    background: #ffffff;
  }

  .code-block {
    margin: 0;
    padding: 1.5rem;
    white-space: pre-wrap;
    word-wrap: break-word;
    background: #f9fafb;
    border: 1px solid #e5e7eb;
  }

  code {
    display: block;
    color: #1f2937;
    line-height: 1.6;
  }

  :global(.dark) .code-viewer-container {
    background: #0f172a;
  }

  :global(.dark) .code-viewer-output {
    background: #0f172a;
  }

  :global(.dark) .code-block {
    background: #0d1117;
    border-color: #30363d;
  }

  :global(.dark) code {
    color: #e6edf3;
  }
</style>
