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

<!-- Activity Bar -->
<div
  class="activity-bar w-12 flex flex-col h-full"
>
  {#each views as view}
    <button
      class="p-3 relative group focus:outline-none transition-colors activity-bar-btn {activeView === view.id
        ? 'active'
        : ''}"
      onclick={() => setView(view.id)}
      title={view.label}
      aria-label={view.label}
    >
      {#if activeView === view.id}
        <div class="absolute left-0 top-0 bottom-0 w-0.5 activity-bar-indicator"></div>
      {/if}
      <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={view.icon} />
      </svg>
    </button>
  {/each}
</div>

<style>
  /* Light Mode - Activity Bar */
  .activity-bar {
    background-color: #f1f5f9;
    border-right: 1px solid #e2e8f0;
  }

  .activity-bar-btn {
    color: #64748b;
  }

  .activity-bar-btn:hover {
    color: #0f172a;
    background-color: #e2e8f0;
  }

  .activity-bar-btn.active {
    color: #2563eb;
    background-color: #ffffff;
  }

  .activity-bar-indicator {
    background-color: #2563eb;
  }

  /* Dark Mode - Activity Bar */
  :global(.dark) .activity-bar,
  :global([data-mode='dark']) .activity-bar {
    background-color: #1e293b;
    border-right-color: #334155;
  }

  :global(.dark) .activity-bar-btn,
  :global([data-mode='dark']) .activity-bar-btn {
    color: #94a3b8;
  }

  :global(.dark) .activity-bar-btn:hover,
  :global([data-mode='dark']) .activity-bar-btn:hover {
    color: #e2e8f0;
    background-color: rgba(51, 65, 85, 0.5);
  }

  :global(.dark) .activity-bar-btn.active,
  :global([data-mode='dark']) .activity-bar-btn.active {
    color: #60a5fa;
    background-color: #334155;
  }

  :global(.dark) .activity-bar-indicator,
  :global([data-mode='dark']) .activity-bar-indicator {
    background-color: #60a5fa;
  }
</style>
