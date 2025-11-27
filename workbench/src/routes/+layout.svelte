<script lang="ts">
  import '../app.css';
  import favicon from '$lib/assets/favicon.svg';
  import { onMount } from 'svelte';
  import { initTheme } from '$lib/utils/theme';
  import { currentTheme, theme } from '$lib/stores/theme';
  import { browser } from '$app/environment';

  let { children } = $props();

  // Initialize theme on app load
  onMount(() => {
    initTheme();
  });

  // Sync theme stores to DOM attributes for CSS variables
  $effect(() => {
    if (browser) {
      document.documentElement.setAttribute('data-theme', $currentTheme);
      document.documentElement.setAttribute('data-mode', $theme);
    }
  });
</script>

<svelte:head>
  <link rel="icon" href={favicon} />
</svelte:head>

{#if $currentTheme === 'halloween'}
  <!-- Top Left Cobweb -->
  <div class="fixed top-0 left-0 w-48 h-48 pointer-events-none z-50 opacity-50">
    <svg
      viewBox="0 0 100 100"
      class="w-full h-full fill-none stroke-gray-500/40 dark:stroke-gray-400/30"
      style="filter: drop-shadow(0 0 2px rgba(0,0,0,0.5));"
    >
      <!-- Radial lines -->
      <path d="M0 0 L100 0" stroke-width="1" />
      <path d="M0 0 L90 20" stroke-width="1" />
      <path d="M0 0 L70 40" stroke-width="1" />
      <path d="M0 0 L40 70" stroke-width="1" />
      <path d="M0 0 L20 90" stroke-width="1" />
      <path d="M0 0 L0 100" stroke-width="1" />

      <!-- Concentric webs -->
      <path d="M20 0 Q20 20 0 20" stroke-width="0.5" fill="none" />
      <path d="M40 0 Q40 40 0 40" stroke-width="0.5" fill="none" />
      <path d="M60 0 Q60 60 0 60" stroke-width="0.5" fill="none" />
      <path d="M80 0 Q80 80 0 80" stroke-width="0.5" fill="none" />
      <path d="M95 5 Q50 50 5 95" stroke-width="0.5" fill="none" stroke-dasharray="2,2" />

      <!-- Spider -->
      <g class="animate-bounce" style="animation-duration: 4s;">
        <line x1="40" y1="0" x2="40" y2="30" stroke="currentColor" stroke-width="0.5" />
        <circle cx="40" cy="30" r="4" class="fill-black dark:fill-white" stroke="none" />
        <path
          d="M36 34 L32 38 M44 34 L48 38 M36 26 L32 22 M44 26 L48 22"
          stroke="currentColor"
          stroke-width="1"
        />
      </g>
    </svg>
  </div>

  <!-- Top Right Cobweb -->
  <div
    class="fixed top-0 right-0 w-48 h-48 pointer-events-none z-50 opacity-50 transform scale-x-[-1]"
  >
    <svg
      viewBox="0 0 100 100"
      class="w-full h-full fill-none stroke-gray-500/40 dark:stroke-gray-400/30"
      style="filter: drop-shadow(0 0 2px rgba(0,0,0,0.5));"
    >
      <!-- Radial lines -->
      <path d="M0 0 L100 0" stroke-width="1" />
      <path d="M0 0 L90 20" stroke-width="1" />
      <path d="M0 0 L70 40" stroke-width="1" />
      <path d="M0 0 L40 70" stroke-width="1" />
      <path d="M0 0 L20 90" stroke-width="1" />
      <path d="M0 0 L0 100" stroke-width="1" />

      <!-- Concentric webs -->
      <path d="M20 0 Q20 20 0 20" stroke-width="0.5" fill="none" />
      <path d="M40 0 Q40 40 0 40" stroke-width="0.5" fill="none" />
      <path d="M60 0 Q60 60 0 60" stroke-width="0.5" fill="none" />
      <path d="M80 0 Q80 80 0 80" stroke-width="0.5" fill="none" />
    </svg>
  </div>
{/if}

{@render children()}
