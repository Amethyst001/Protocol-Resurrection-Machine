<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import mermaid from 'mermaid';
  import { generateMermaid } from '$lib/topology/generator';
  import { topologyState } from '$lib/stores/topology-state';
  import { currentTheme } from '$lib/stores/theme';
  import { activeProtocol } from '$lib/stores/active-protocol';
  import { animationQueue } from '$lib/stores/animation-queue';
  import { detectTopologyType, type TopologyType } from '$lib/topology/detector';

  let containerEl: HTMLDivElement;
  let diagramSvg = $state('');
  let isVisible = $state(true);
  let observer: IntersectionObserver | null = null;

  let { onsimulate }: { onsimulate?: () => void } = $props();

  // Reactive derived state for the diagram - STATIC (no topologyState dependency)
  let diagramCode = $derived(
    generateMermaid(
      $activeProtocol?.name || 'Unknown',
      $activeProtocol?.spec || {},
      $currentTheme as 'light' | 'dark' | 'halloween',
      null // Pass null to render static graph without active states
    )
  );

  // Get current topology type
  let topologyType = $derived(
    detectTopologyType($activeProtocol?.name || 'Unknown', $activeProtocol?.spec || {})
  );

  // Re-render ONLY when protocol or theme changes (not active node)
  $effect(() => {
    if (diagramCode) {
      renderDiagram(diagramCode);
    }
  });

  onMount(() => {
    // CRITICAL: Initialize Mermaid with loose security to allow CSS injection
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: 'loose',
      theme: 'base',
      themeVariables: {
        fontFamily: 'Inter, system-ui, sans-serif',
        mainBkg: 'transparent',
        clusterBkg: 'transparent',
        lineColor: '#64748b',
      },
    });

    // Set up IntersectionObserver to clear queue when diagram not visible
    observer = new IntersectionObserver(
      (entries) => {
        isVisible = entries[0].isIntersecting;
        if (!isVisible) {
          animationQueue.clear();
        }
      },
      { threshold: 0.1 }
    );

    if (containerEl) {
      observer.observe(containerEl);
    }
  });

  onDestroy(() => {
    if (observer) {
      observer.disconnect();
    }
  });

  // Animate active node via DOM manipulation
  $effect(() => {
    if (diagramSvg && $topologyState) {
      animateNode($topologyState);
    } else if (diagramSvg && !$topologyState) {
      // Clear all animations if state is null
      clearAnimations();
    }
  });

  function clearAnimations() {
    if (!containerEl) return;
    const activeElements = containerEl.querySelectorAll('.active-pulse');
    activeElements.forEach((el) => el.classList.remove('active-pulse'));
  }

  function animateNode(nodeId: string) {
    if (!containerEl) return;

    // Clear previous
    clearAnimations();

    // Find target node
    // Mermaid usually generates IDs like "flowchart-NODEID-..."
    // We use a partial attribute selector to find it
    const selector = `[id^="flowchart-${nodeId}-"]`;
    const target = containerEl.querySelector(selector);

    if (target) {
      target.classList.add('active-pulse');
    } else {
      // Fallback: Try finding by text content if ID lookup fails
      // This is a backup strategy
      const allNodes = containerEl.querySelectorAll('.node');
      for (const node of allNodes) {
        if (node.textContent?.includes(nodeId)) {
          node.classList.add('active-pulse');
          break;
        }
      }
    }
  }

  let error = $state<string | null>(null);

  async function renderDiagram(code: string) {
    try {
      error = null;
      // Generate a unique ID for this render to prevent caching issues
      const id = `topology-${Date.now()}`;
      const { svg } = await mermaid.render(id, code);
      diagramSvg = svg;

      // After rendering, add data attributes to nodes and edges
      setTimeout(() => addDataAttributes(), 0);
    } catch (err) {
      console.error('Mermaid rendering error:', err);
      console.log('Problematic Mermaid Code:', code);
      error = err instanceof Error ? err.message : 'Unknown rendering error';
    }
  }

  function addDataAttributes() {
    if (!containerEl) return;

    // Add data-node-id attributes to nodes
    const nodes = containerEl.querySelectorAll('.node');
    nodes.forEach((node) => {
      // Extract node ID from Mermaid's generated ID (format: flowchart-NODEID-...)
      const id = node.getAttribute('id');
      if (id) {
        const match = id.match(/flowchart-([^-]+)/);
        if (match) {
          const nodeId = match[1];
          node.setAttribute('data-node-id', nodeId);
        }
      }
    });

    // Add data-edge-id attributes to edges
    const edges = containerEl.querySelectorAll('.edgePath');
    edges.forEach((edge, index) => {
      // Use index-based approach for edge identification
      const edgeId = `edge-${index}`;
      edge.setAttribute('data-edge-id', edgeId);

      // Store original stroke properties for restoration
      const path = edge.querySelector('path');
      if (path) {
        const originalStroke = path.getAttribute('stroke') || '#64748b';
        const originalStrokeWidth = path.getAttribute('stroke-width') || '1.5';
        path.setAttribute('data-original-stroke', originalStroke);
        path.setAttribute('data-original-stroke-width', originalStrokeWidth);
      }
    });
  }

  function startSimulation() {
    if (!isVisible) return;

    // Queue animations based on topology type
    if (onsimulate) onsimulate();

    if (topologyType === 'DENDRITE') {
      queueDendriteAnimation();
    } else if (topologyType === 'MESH') {
      queueMeshAnimation();
    } else if (topologyType === 'PIPELINE') {
      queuePipelineAnimation();
    } else {
      queueGenericAnimation();
    }
  }

  function queueDendriteAnimation() {
    // Fan-in pattern: sensors → gateway → dashboard
    animationQueue.enqueue({ id: 'sensor1', type: 'node', nodeId: 'S1', duration: 600 });
    animationQueue.enqueue({ id: 'edge1', type: 'edge', edgeId: 'edge-0', duration: 400 });
    animationQueue.enqueue({ id: 'sensor2', type: 'node', nodeId: 'S2', duration: 600 });
    animationQueue.enqueue({ id: 'edge2', type: 'edge', edgeId: 'edge-1', duration: 400 });
    animationQueue.enqueue({ id: 'sensor3', type: 'node', nodeId: 'S3', duration: 600 });
    animationQueue.enqueue({ id: 'edge3', type: 'edge', edgeId: 'edge-2', duration: 400 });
    animationQueue.enqueue({ id: 'gateway', type: 'node', nodeId: 'GATEWAY', duration: 600 });
    animationQueue.enqueue({ id: 'edge4', type: 'edge', edgeId: 'edge-3', duration: 400 });
    animationQueue.enqueue({ id: 'dashboard', type: 'node', nodeId: 'DASH', duration: 600 });
  }

  function queueMeshAnimation() {
    // Bidirectional: client ↔ server
    animationQueue.enqueue({ id: 'client-a', type: 'node', nodeId: 'CLIENT_A', duration: 600 });
    animationQueue.enqueue({
      id: 'edge1',
      type: 'edge',
      edgeId: 'edge-0',
      duration: 400,
      direction: 'forward',
    });
    animationQueue.enqueue({ id: 'server', type: 'node', nodeId: 'SERVER', duration: 600 });
    animationQueue.enqueue({
      id: 'edge2',
      type: 'edge',
      edgeId: 'edge-0',
      duration: 400,
      direction: 'backward',
    });
    animationQueue.enqueue({ id: 'client-b', type: 'node', nodeId: 'CLIENT_B', duration: 600 });
    animationQueue.enqueue({
      id: 'edge3',
      type: 'edge',
      edgeId: 'edge-1',
      duration: 400,
      direction: 'forward',
    });
    animationQueue.enqueue({ id: 'server2', type: 'node', nodeId: 'SERVER', duration: 600 });
    animationQueue.enqueue({ id: 'edge4', type: 'edge', edgeId: 'edge-2', duration: 400 });
    animationQueue.enqueue({ id: 'bot', type: 'node', nodeId: 'BOT', duration: 600 });
  }

  function queuePipelineAnimation() {
    // Sequential: stage1 → stage2 → stage3
    animationQueue.enqueue({ id: 'mainframe', type: 'node', nodeId: 'MAINFRAME', duration: 600 });
    animationQueue.enqueue({ id: 'edge1', type: 'edge', edgeId: 'edge-0', duration: 400 });
    animationQueue.enqueue({ id: 'adapter', type: 'node', nodeId: 'ADAPTER', duration: 600 });
    animationQueue.enqueue({ id: 'edge2', type: 'edge', edgeId: 'edge-1', duration: 400 });
    animationQueue.enqueue({ id: 'api', type: 'node', nodeId: 'API', duration: 600 });
    animationQueue.enqueue({ id: 'edge3', type: 'edge', edgeId: 'edge-2', duration: 400 });
    animationQueue.enqueue({ id: 'dashboard', type: 'node', nodeId: 'DASH', duration: 600 });
  }

  function queueGenericAnimation() {
    // Simple client → server
    animationQueue.enqueue({ id: 'client', type: 'node', nodeId: 'CLIENT', duration: 600 });
    animationQueue.enqueue({ id: 'edge', type: 'edge', edgeId: 'edge-0', duration: 400 });
    animationQueue.enqueue({ id: 'server', type: 'node', nodeId: 'SERVER', duration: 600 });
  }
</script>

<div class="topology-wrapper">
  <div
    class="topology-container"
    bind:this={containerEl}
    data-reduced-motion={typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches}
  >
    {#if error}
      <div class="flex flex-col items-center justify-center h-full text-red-500 p-4 text-center">
        <p class="font-bold mb-2">Failed to render topology</p>
        <p class="text-sm opacity-75">{error}</p>
        <pre
          class="mt-4 text-xs bg-black/10 p-2 rounded text-left overflow-auto max-w-full max-h-48 hidden hover:block">
          {diagramCode}
        </pre>
      </div>
    {:else if diagramSvg}
      {@html diagramSvg}
    {:else}
      <div class="topology-placeholder">
        <svg
          class="animate-spin h-8 w-8 mx-auto mb-4"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"
          ></circle>
          <path
            class="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          ></path>
        </svg>
        <p class="text-center" style="color: var(--text-secondary)">Loading topology diagram...</p>
      </div>
    {/if}
  </div>

  {#if diagramSvg && !error}
    <div class="simulation-controls">
      <button onclick={startSimulation} class="simulate-button" disabled={!isVisible}>
        Simulate Data Flow
      </button>
    </div>
  {/if}
</div>

<style>
  .topology-wrapper {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
  }

  .topology-container {
    flex: 1;
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2rem;
    background-color: transparent;
    overflow: hidden;
  }

  .topology-container :global(svg) {
    max-width: 100%;
    height: auto;
    max-height: 100%;
    overflow: visible !important; /* Prevent clipping of glowing elements */
  }

  .topology-placeholder {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: var(--text-tertiary);
  }

  .simulation-controls {
    display: flex;
    justify-content: center;
    padding: 1rem;
    border-top: 1px solid var(--border-color);
  }

  .simulate-button {
    padding: 0.5rem 1.5rem;
    background-color: #3b82f6;
    color: white;
    border: none;
    border-radius: 0.375rem;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.2s;
  }

  .simulate-button:hover:not(:disabled) {
    background-color: #2563eb;
  }

  .simulate-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }

  .animate-spin {
    animation: spin 1s linear infinite;
  }

  /* Node pulse animation - Cyber-Physical glow effect */
  /* Target the shape elements inside nodes for proper SVG transform */
  .topology-container :global(.node.animate-pulse-glow rect),
  .topology-container :global(.node.animate-pulse-glow circle),
  .topology-container :global(.node.animate-pulse-glow polygon),
  .topology-container :global(.node.animate-pulse-glow path) {
    /* CRITICAL: Scale from element's own center, not SVG canvas origin */
    transform-box: fill-box;
    transform-origin: center center;
    animation: pulse-glow 600ms cubic-bezier(0.4, 0, 0.2, 1);
  }

  /* Glow effect on the entire node group */
  .topology-container :global(.node.animate-pulse-glow) {
    filter: drop-shadow(0 0 12px #39ff14) drop-shadow(0 0 24px rgba(57, 255, 20, 0.4));
  }

  @keyframes pulse-glow {
    0%,
    100% {
      transform: scale(1);
    }
    50% {
      transform: scale(1.08);
    }
  }

  /* Edge flow animation - Data traveling effect */
  .topology-container :global(.edgePath path.animate-edge-flow) {
    stroke: #39ff14 !important;
    stroke-width: 3 !important;
    stroke-dasharray: 8 4;
    stroke-linecap: round;
    animation: edge-flow 400ms linear forwards;
    filter: drop-shadow(0 0 6px #39ff14) drop-shadow(0 0 2px #fff);
  }

  @keyframes edge-flow {
    0% {
      stroke-dashoffset: 100;
      opacity: 0.6;
    }
    50% {
      opacity: 1;
    }
    100% {
      stroke-dashoffset: 0;
      opacity: 0.6;
    }
  }

  .topology-container :global(.edgePath path.animate-edge-flow.reverse) {
    animation: edge-flow-reverse 400ms linear forwards;
  }

  @keyframes edge-flow-reverse {
    0% {
      stroke-dashoffset: -100;
      opacity: 0.6;
    }
    50% {
      opacity: 1;
    }
    100% {
      stroke-dashoffset: 0;
      opacity: 0.6;
    }
  }

  /* Arrowhead glow during edge animation */
  .topology-container :global(.edgePath.animate-edge-active marker path) {
    fill: #39ff14 !important;
  }

  /* Respect reduced motion preference */
  .topology-container[data-reduced-motion='true'] :global(.animate-pulse-glow),
  .topology-container[data-reduced-motion='true'] :global(.animate-pulse-glow rect),
  .topology-container[data-reduced-motion='true'] :global(.animate-pulse-glow circle),
  .topology-container[data-reduced-motion='true'] :global(.animate-pulse-glow polygon),
  .topology-container[data-reduced-motion='true'] :global(.animate-edge-flow) {
    animation: none !important;
    filter: drop-shadow(0 0 8px #39ff14) !important; /* Still show glow, just no motion */
    transform: none !important;
  }

  /* GPU acceleration for smooth animations */
  .topology-container :global(.node) {
    will-change: filter;
  }

  .topology-container :global(.node.animate-pulse-glow rect),
  .topology-container :global(.node.animate-pulse-glow circle),
  .topology-container :global(.node.animate-pulse-glow polygon),
  .topology-container :global(.node.animate-pulse-glow path) {
    will-change: transform;
    backface-visibility: hidden;
  }

  .topology-container :global(.edgePath path) {
    will-change: stroke-dashoffset, filter, opacity;
  }
</style>
