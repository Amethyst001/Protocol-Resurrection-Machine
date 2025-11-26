<script lang="ts">
  import { PRESETS, type Preset } from '$lib/utils/preset-loader';

  interface Props {
    isOpen?: boolean;
    onClose?: () => void;
    onSelectScenario?: (preset: Preset) => void;
  }

  let { isOpen = false, onClose = () => {}, onSelectScenario = () => {} }: Props = $props();

  function handleSelect(preset: Preset) {
    onSelectScenario(preset);
    onClose();
  }

  function handleBackdropClick(e: MouseEvent) {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }
</script>

{#if isOpen}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
    onclick={handleBackdropClick}
  >
    <div
      class="relative w-full max-w-4xl mx-4 rounded-xl shadow-2xl"
      style="background: var(--bg-primary); border: 1px solid var(--border-primary);"
    >
      <!-- Header -->
      <div
        class="px-6 py-4 border-b flex items-center justify-between"
        style="border-color: var(--border-primary);"
      >
        <div>
          <h2 class="text-2xl font-bold" style="color: var(--text-primary);">
            Select Simulation Scenario
          </h2>
          <p class="mt-1 text-sm" style="color: var(--text-secondary);">
            Choose a real-world use case to auto-load and simulate
          </p>
        </div>
        <button
          onclick={onClose}
          class="p-2 rounded-lg transition-all hover:bg-gray-100 dark:hover:bg-gray-800"
          aria-label="Close modal"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      <!-- Scenario Cards -->
      <div class="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        {#each PRESETS as preset (preset.id)}
          <button
            onclick={() => handleSelect(preset)}
            class="scenario-card p-6 rounded-lg border-2 transition-all group
                   hover:scale-105 hover:shadow-xl text-left"
            class:blue-card={preset.theme === 'blue'}
            class:orange-card={preset.theme === 'orange'}
            class:green-card={preset.theme === 'green'}
          >
            <div class="text-5xl mb-3">{preset.icon}</div>
            <h3 class="text-lg font-bold mb-2" style="color: var(--text-primary);">
              {preset.name}
            </h3>
            <p class="text-sm" style="color: var(--text-secondary);">
              {preset.description}
            </p>
            <div class="mt-4 flex items-center text-sm font-medium" style="color: var(--primary);">
              <span>Launch Scenario</span>
              <svg
                class="w-4 h-4 ml-1 transition-transform group-hover:translate-x-1"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </div>
          </button>
        {/each}
      </div>

      <!-- Footer -->
      <div class="px-6 py-4 border-t flex justify-end" style="border-color: var(--border-primary);">
        <button
          onclick={onClose}
          class="px-4 py-2 rounded-lg font-medium transition-all hover:bg-gray-100 dark:hover:bg-gray-800"
          style="color: var(--text-secondary);"
        >
          Cancel
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .scenario-card {
    background: var(--bg-secondary);
    border-color: var(--border-primary);
  }

  .scenario-card:hover {
    border-color: var(--primary);
  }

  .blue-card:hover {
    border-color: #3b82f6;
  }

  .orange-card:hover {
    border-color: #ff7518;
  }

  .green-card:hover {
    border-color: #10b981;
  }
</style>
