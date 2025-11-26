<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  export let activeView: string = 'editor';

  const dispatch = createEventDispatcher<{
    change: { view: string };
  }>();

  function setView(view: string) {
    activeView = view;
    dispatch('change', { view });
  }

  const views = [
    { id: 'editor', label: 'Editor', icon: 'M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z' }, // Home/Editor
    { id: 'discovery', label: 'Discovery', icon: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z' }, // Search
    {
      id: 'mcp',
      label: 'MCP Server',
      icon: 'M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01',
    }, // Server
    {
      id: 'docs',
      label: 'Documentation',
      icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253',
    }, // Book
    // Removed: steering button
  ];
</script>

<div
  class="w-12 flex flex-col bg-gray-100 dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 h-full"
>
  {#each views as view}
    <button
      class="p-3 relative group focus:outline-none transition-colors {activeView === view.id
        ? 'text-blue-600 dark:text-blue-400 bg-white dark:bg-gray-700'
        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700/50'}"
      onclick={() => setView(view.id)}
      title={view.label}
      aria-label={view.label}
    >
      {#if activeView === view.id}
        <div class="absolute left-0 top-0 bottom-0 w-0.5 bg-blue-600 dark:bg-blue-400"></div>
      {/if}
      <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={view.icon} />
      </svg>
    </button>
  {/each}
</div>
