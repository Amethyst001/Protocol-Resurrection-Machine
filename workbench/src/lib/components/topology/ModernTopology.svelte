<script lang="ts">
  import { SvelteFlow, Background, type Node, type Edge, type NodeTypes } from '@xyflow/svelte';
  import { untrack } from 'svelte';
  import '@xyflow/svelte/dist/style.css';

  import GlassNode from './GlassNode.svelte';
  import {
    topologyState,
    getLayout,
    getAnimationSequence,
    type ScenarioId,
  } from '$lib/stores/topology-state';
  import { currentTheme, theme } from '$lib/stores/theme';
  import { activeProtocol } from '$lib/stores/active-protocol';
  import { consoleStore } from '$lib/stores/console';

  let {
    onsimulate,
    onsimulationend,
    autoStart = false,
  }: { onsimulate?: () => void; onsimulationend?: () => void; autoStart?: boolean } = $props();

  // Auto-start simulation when autoStart prop changes to true
  $effect(() => {
    if (autoStart && !isSimulating) {
      // Longer delay to ensure layout is ready and give user time to see topology
      setTimeout(() => startSimulation(), 800);
    }
  });

  // Custom node types
  const nodeTypes: NodeTypes = {
    glass: GlassNode,
  };

  // Determine current scenario based on protocol name
  let currentScenario = $derived.by<ScenarioId>(() => {
    const name = $activeProtocol?.name?.toLowerCase() || '';
    if (name.includes('sensor') || name.includes('iot')) return 'iot';
    if (name.includes('bank') || name.includes('legacy')) return 'banking';
    if (name.includes('chat') || name.includes('messaging')) return 'chat';
    return 'demo';
  });

  // Reactive state for nodes and edges
  let nodes = $state<Node[]>([]);
  let edges = $state<Edge[]>([]);
  let isSimulating = $state(false);

  // Load layout when scenario changes
  $effect(() => {
    const scenario = currentScenario;
    const layout = getLayout(scenario);
    nodes = layout.nodes;
    edges = layout.edges;
  });

  // Simulation function - animates data flow through the topology
  // Simulation state
  let isProcessComplete = $state(false);

  // Simulation function - animates data flow through the topology
  async function startSimulation() {
    if (isSimulating) return;
    isSimulating = true;
    isProcessComplete = false;

    if (onsimulate) onsimulate();

    // Run visual and process loops concurrently
    // The visual loop will keep running until the process loop sets isProcessComplete = true
    await Promise.all([runVisualLoop(), runProcessSimulation()]);

    // Add delay before triggering end callback (smoother transition)
    await new Promise((resolve) => setTimeout(resolve, 800));

    isSimulating = false;

    // Trigger end callback
    if (onsimulationend) onsimulationend();
  }

  // Infinite visual loop - keeps animating until process is complete
  async function runVisualLoop() {
    const sequence = getAnimationSequence(currentScenario);
    const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    // Reset visuals
    topologyState.set(null);
    updateVisuals([], []);

    while (!isProcessComplete) {
      for (const step of sequence) {
        // If process finished mid-cycle, we can either break immediately or finish the cycle.
        // Finishing the cycle usually looks smoother.
        if (isProcessComplete) break;

        // Update visuals
        updateVisuals(step.activeNodes, step.activeEdges);

        // Wait for duration
        await delay(step.duration);
      }

      // Brief pause between loops
      updateVisuals([], []);
      if (!isProcessComplete) {
        await delay(300);
      }
    }

    // Final reset
    topologyState.set(null);
    updateVisuals([], []);
  }

  // Process simulation - generates logs and determines when success happens
  async function runProcessSimulation() {
    const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    // Run "normal process" (e.g., 3 cycles of logs)
    const totalLoops = 3;
    for (let loop = 0; loop < totalLoops; loop++) {
      // Log loop progress
      if (loop > 0) {
        consoleStore.log(`--- Data Flow Cycle ${loop + 1}/${totalLoops} ---`, 'info');
        // Wait a bit to simulate processing time
        await delay(1500);
      } else {
        // First loop delay
        await delay(500);
      }

      // Simulate some log activity during the cycle
      // We don't need to match the visual steps exactly, just emit some logs
      const sequence = getAnimationSequence(currentScenario);
      for (const step of sequence) {
        if (step.consoleMessage) {
          consoleStore.log(step.consoleMessage);
          // Random delay to simulate processing
          await delay(Math.random() * 500 + 200);
        }
      }
    }

    // Log completion
    consoleStore.log('✓ Simulation completed successfully.', 'success');

    // Signal that process is done
    isProcessComplete = true;
  }

  function updateVisuals(activeNodeIds: string[], activeEdgeIds: string[]) {
    // Update nodes
    nodes = untrack(() => nodes).map((node) => ({
      ...node,
      data: { ...node.data, active: activeNodeIds.includes(node.id) },
    }));

    // Update edges
    edges = untrack(() => edges).map((edge) => {
      const isActive = activeEdgeIds.includes(edge.id);
      // Determine color based on scenario
      let strokeColor = '#475569';
      if (isActive) {
        const scenario = untrack(() => currentScenario);
        if (scenario === 'iot')
          strokeColor = '#ff4500'; // Orange
        else if (scenario === 'banking')
          strokeColor = '#00add8'; // Cyan
        else if (scenario === 'chat')
          strokeColor = '#3572A5'; // Blue
        else strokeColor = '#39ff14'; // Green (Demo)
      }

      return {
        ...edge,
        animated: isActive,
        style: `stroke: ${strokeColor}; stroke-width: ${isActive ? 3 : 2}px;`,
      };
    });
  }

  // Background color based on theme (Halloween uses same as dark mode)
  let bgColor = $derived(
    $theme === 'light'
      ? '#f8fafc' // Light mode: slate-50
      : '#0f172a' // Dark mode & Halloween: slate-900
  );

  let bgPattern = $derived(
    $theme === 'light'
      ? '#e2e8f0' // Light mode: slate-200
      : '#1e293b' // Dark mode & Halloween: slate-800
  );
</script>

<div class="modern-topology-wrapper relative">
  <div class="simulation-controls">
    <button onclick={startSimulation} class="simulate-button" disabled={isSimulating}>
      {isSimulating ? 'Simulating...' : 'Simulate Data Flow'}
    </button>
  </div>

  <div class="modern-topology" style:--bg-color={bgColor}>
    <SvelteFlow
      {nodes}
      {edges}
      {nodeTypes}
      fitView
      fitViewOptions={{ padding: 0.2 }}
      nodesDraggable={false}
      nodesConnectable={false}
      elementsSelectable={false}
      panOnDrag={false}
      zoomOnScroll={false}
      zoomOnPinch={false}
      zoomOnDoubleClick={false}
      preventScrolling={true}
    >
      <Background patternColor={bgPattern} gap={20} size={1} />
    </SvelteFlow>

    <!-- Light Mode Vignette -->
    {#if $theme === 'light'}
      <div class="absolute inset-0 pointer-events-none vignette"></div>
    {/if}
  </div>
</div>

<style>
  .modern-topology-wrapper {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
  }

  .modern-topology {
    flex: 1;
    width: 100%;
    min-height: 300px;
    background: var(--bg-color);
    border-radius: 8px;
    overflow: hidden;
    position: relative;
    border: 1px solid rgba(148, 163, 184, 0.2);
  }

  .vignette {
    background: radial-gradient(circle at center, transparent 0%, rgba(0, 0, 0, 0.03) 100%);
    box-shadow: inset 0 0 40px rgba(0, 0, 0, 0.05);
  }

  /* Override Svelte Flow defaults for glassmorphism look */
  .modern-topology :global(.svelte-flow) {
    background: transparent;
  }

  .modern-topology :global(.svelte-flow__edge-path) {
    transition:
      stroke 0.3s ease,
      stroke-width 0.3s ease;
  }

  /* Animated edge glow */
  .modern-topology :global(.svelte-flow__edge.animated .svelte-flow__edge-path) {
    filter: drop-shadow(0 0 6px currentColor);
  }

  /* Hide attribution */
  .modern-topology :global(.svelte-flow__attribution) {
    display: none;
  }

  /* Simulation controls */
  .simulation-controls {
    display: flex;
    justify-content: center;
    padding: 0.75rem;
    border-bottom: 1px solid var(--border-color, rgba(255, 255, 255, 0.1));
  }

  .simulate-button {
    padding: 0.5rem 1.5rem;
    background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
    color: white;
    border: none;
    border-radius: 0.5rem;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3);
  }

  /* Dark mode glow for button */
  :global(.dark) .simulate-button {
    box-shadow: 0 0 15px rgba(59, 130, 246, 0.5);
  }

  .simulate-button:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
  }

  :global(.dark) .simulate-button:hover:not(:disabled) {
    box-shadow: 0 0 20px rgba(59, 130, 246, 0.7);
  }

  .simulate-button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }
</style>
