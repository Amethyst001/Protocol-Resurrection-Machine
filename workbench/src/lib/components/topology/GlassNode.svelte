<script lang="ts">
  import { Handle, Position } from '@xyflow/svelte';

  interface NodeData {
    label: string;
    language?: string;
    active?: boolean;
  }

  let { data }: { data: NodeData } = $props();

  // Language-specific colors
  const languageColors: Record<string, string> = {
    rust: '#ff7518',
    go: '#00add8',
    python: '#3572a5',
    typescript: '#3178c6',
    cobol: '#1e40af', // Added COBOL blue
    default: '#39ff14',
  };

  let accentColor = $derived(languageColors[data.language || 'default'] || languageColors.default);
</script>

<div class="glass-node" class:active={data.active} style:--accent-color={accentColor}>
  <Handle type="target" position={Position.Left} />

  <div class="node-content">
    <span class="node-label">{data.label}</span>
  </div>

  <Handle type="source" position={Position.Right} />
</div>

<style>
  .glass-node {
    padding: 12px 20px;
    border-radius: 12px;
    min-width: 120px;

    /* Glassmorphism - Dark Mode Default */
    background: rgba(30, 41, 59, 0.75);
    border: 1px solid rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    box-shadow:
      0 4px 30px rgba(0, 0, 0, 0.4),
      inset 0 1px 0 rgba(255, 255, 255, 0.1);

    /* Smooth transitions */
    transition:
      border-color 0.3s ease,
      box-shadow 0.3s ease,
      transform 0.3s ease;
  }

  /* Light Mode - Solid card style */
  :global([data-mode='light']) .glass-node,
  :global(html:not(.dark)) .glass-node {
    background: #ffffff;
    border: 1px solid #E2E8F0;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06);
  }

  .glass-node.active {
    border-color: var(--accent-color);
    box-shadow:
      0 0 20px color-mix(in srgb, var(--accent-color) 50%, transparent),
      0 0 40px color-mix(in srgb, var(--accent-color) 25%, transparent),
      0 4px 30px rgba(0, 0, 0, 0.4),
      inset 0 1px 0 rgba(255, 255, 255, 0.15);
  }

  /* Light Mode Active */
  :global([data-mode='light']) .glass-node.active,
  :global(html:not(.dark)) .glass-node.active {
    box-shadow:
      0 0 15px color-mix(in srgb, var(--accent-color) 40%, transparent),
      0 4px 12px rgba(0, 0, 0, 0.15);
  }

  .node-content {
    display: flex;
    align-items: center;
    gap: 8px;
    color: #e2e8f0;
    font-family: 'Inter', system-ui, sans-serif;
    font-size: 14px;
    font-weight: 500;
  }

  /* Light Mode Text */
  :global([data-mode='light']) .node-content,
  :global(html:not(.dark)) .node-content {
    color: #0F172A;
  }

  .node-label {
    white-space: nowrap;
  }

  /* Handle styling */
  .glass-node :global(.svelte-flow__handle) {
    width: 8px;
    height: 8px;
    background: rgba(100, 116, 139, 0.8);
    border: 2px solid rgba(255, 255, 255, 0.2);
    transition: all 0.2s ease;
  }

  /* Light Mode Handles */
  :global([data-mode='light']) .glass-node :global(.svelte-flow__handle),
  :global(html:not(.dark)) .glass-node :global(.svelte-flow__handle) {
    background: #94A3B8;
    border-color: #E2E8F0;
  }

  .glass-node.active :global(.svelte-flow__handle) {
    background: var(--accent-color);
    border-color: rgba(255, 255, 255, 0.4);
    box-shadow: 0 0 8px var(--accent-color);
  }

  :global([data-mode='light']) .glass-node.active :global(.svelte-flow__handle),
  :global(html:not(.dark)) .glass-node.active :global(.svelte-flow__handle) {
    border-color: #ffffff;
  }
</style>
