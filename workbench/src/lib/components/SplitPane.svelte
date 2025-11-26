<script lang="ts">
  import { onMount } from 'svelte';
  import type { Snippet } from 'svelte';

  interface Props {
    direction?: 'horizontal' | 'vertical';
    initialSize?: number;
    minSize?: number;
    maxSize?: number;
    onResize?: (size: number) => void;
    size?: number;
    first: Snippet;
    second: Snippet;
  }

  let {
    direction = 'horizontal',
    initialSize = 50,
    minSize = 10,
    maxSize = 90,
    onResize = undefined,
    size = $bindable(initialSize),
    first,
    second,
  }: Props = $props();

  let containerRef: HTMLDivElement;
  let isDragging = $state(false);

  function handleMouseDown(e: MouseEvent) {
    e.preventDefault();
    isDragging = true;
    document.body.style.cursor = direction === 'horizontal' ? 'col-resize' : 'row-resize';
    document.body.style.userSelect = 'none';
  }

  function handleMouseMove(e: MouseEvent) {
    if (!isDragging || !containerRef) return;

    requestAnimationFrame(() => {
      if (!isDragging || !containerRef) return;

      const rect = containerRef.getBoundingClientRect();
      let newSize: number;

      if (direction === 'horizontal') {
        const x = e.clientX - rect.left;
        newSize = (x / rect.width) * 100;
      } else {
        const y = e.clientY - rect.top;
        newSize = (y / rect.height) * 100;
      }

      newSize = Math.max(minSize, Math.min(maxSize, newSize));
      size = newSize;

      if (onResize) {
        onResize(size);
      }
    });
  }

  function handleMouseUp() {
    if (isDragging) {
      isDragging = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }
  }

  onMount(() => {
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  });
</script>

<div bind:this={containerRef} class="split-pane {direction}" class:dragging={isDragging}>
  <div class="pane first" style="{direction === 'horizontal' ? 'width' : 'height'}: {size}%">
    {@render first()}
  </div>

  <button
    class="divider {direction}"
    onmousedown={handleMouseDown}
    aria-label="Resize {direction === 'horizontal' ? 'horizontally' : 'vertically'}"
  ></button>

  <div class="pane second" style="{direction === 'horizontal' ? 'width' : 'height'}: {100 - size}%">
    {@render second()}
  </div>
</div>

<style>
  .split-pane {
    display: flex;
    width: 100%;
    height: 100%;
    overflow: hidden;
  }

  .split-pane.horizontal {
    flex-direction: row;
  }

  .split-pane.vertical {
    flex-direction: column;
  }

  .pane {
    overflow: auto;
    position: relative;
  }

  .divider {
    background: #9ca3af;
    transition: background-color 0.2s;
    flex-shrink: 0;
    position: relative;
    border: none;
    padding: 0;
    margin: 0;
  }

  :global(.dark) .divider {
    background: #4b5563;
  }

  .divider.horizontal {
    width: 6px;
    cursor: col-resize;
  }

  .divider.vertical {
    height: 6px;
    cursor: row-resize;
  }

  .divider:hover,
  .split-pane.dragging .divider {
    background: #3b82f6;
  }

  :global(.dark) .divider:hover,
  :global(.dark) .split-pane.dragging .divider {
    background: #60a5fa;
  }
</style>
