# Design Document

## Overview

This design addresses three critical improvements to the Protocol Resurrection Machine workbench:

1. **Mobile Responsiveness**: Transform the desktop-optimized split-pane interface into a mobile-friendly experience using conditional rendering, bottom navigation, and touch-optimized controls
2. **Enhanced Topology Animations**: Implement a promise-based animation queue system for smooth, sequential node and edge animations that visualize data flow
3. **Robust Documentation Generation**: Fix undefined values, invalid package names, and broken links in generated README files through comprehensive fallback logic and validation

The design follows a principle of **conditional unwrapping** rather than responsive adaptation - we render completely different layouts for mobile vs desktop rather than trying to make split panes responsive. This avoids the complexity of managing split-pane state across breakpoints and provides optimal UX for each form factor.

## Architecture

### High-Level Component Structure

```
workbench/
├── src/lib/
│   ├── components/
│   │   ├── Editor.svelte (conditional rendering)
│   │   ├── BottomNavigation.svelte (new - mobile only)
│   │   ├── SplitPane.svelte (desktop only)
│   │   ├── TopologyDiagram.svelte (enhanced animations)
│   │   ├── Toolbar.svelte (responsive)
│   │   └── Console.svelte (responsive)
│   ├── stores/
│   │   ├── layout.ts (decoupled desktop/mobile state)
│   │   ├── animation-queue.ts (new - sequential animations)
│   │   └── topology-state.ts (new - animation coordination)
│   ├── utils/
│   │   └── reactive-topology.ts (new - animation utilities)
│   └── documentation/
│       ├── documentation-generator.ts (enhanced with fallbacks)
│       └── templates/ (improved README templates)
└── routes/
    └── +page.svelte (conditional layout rendering)
```

### Key Architectural Decisions

1. **Conditional Rendering Over Responsive Adaptation**: Use `{#if $isMobile}` blocks to render completely different layouts rather than trying to make split panes responsive
2. **Decoupled State Management**: Separate stores for desktop split-pane state and mobile tab state to avoid complex synchronization
3. **Promise-Based Animation Queue**: Use async/await for strict sequential execution of topology animations
4. **Template Fallback Pattern**: Every template variable has a documented fallback value to prevent undefined output

## Components and Interfaces

### 1. Layout Store (Enhanced)

**File**: `src/lib/stores/layout.ts`

```typescript
import { writable, derived } from 'svelte/store';
import { browser } from '$app/environment';

// Desktop split-pane state
interface DesktopLayout {
  leftPaneWidth: number;    // percentage (0-100)
  topRightHeight: number;   // percentage (0-100)
}

// Mobile tab state
type MobileTab = 'editor' | 'output' | 'console';

interface MobileLayout {
  activeTab: MobileTab;
}

// Viewport state
interface ViewportState {
  width: number;
  height: number;
  isMobile: boolean;  // width < 768px
}

// Create stores
export const viewport = writable<ViewportState>({
  width: browser ? window.innerWidth : 1024,
  height: browser ? window.innerHeight : 768,
  isMobile: browser ? window.innerWidth < 768 : false
});

export const desktopLayout = writable<DesktopLayout>({
  leftPaneWidth: 40,
  topRightHeight: 70
});

export const mobileLayout = writable<MobileLayout>({
  activeTab: 'editor'
});

// Derived convenience store
export const isMobile = derived(viewport, $viewport => $viewport.isMobile);

// Initialize viewport tracking
if (browser) {
  const updateViewport = () => {
    viewport.set({
      width: window.innerWidth,
      height: window.innerHeight,
      isMobile: window.innerWidth < 768
    });
  };
  
  window.addEventListener('resize', updateViewport);
  window.addEventListener('orientationchange', updateViewport);
}

// Reset functions for layout transitions
export function resetToDesktopDefaults() {
  desktopLayout.set({
    leftPaneWidth: 40,
    topRightHeight: 70
  });
}

export function resetToMobileDefaults() {
  mobileLayout.set({
    activeTab: 'editor'
  });
}
```

### 2. Animation Queue Store

**File**: `src/lib/stores/animation-queue.ts`

```typescript
import { writable, get } from 'svelte/store';

export interface AnimationTask {
  id: string;
  type: 'node' | 'edge';
  nodeId?: string;
  edgeId?: string;
  duration: number;  // milliseconds
  direction?: 'forward' | 'backward';
}

interface AnimationQueueState {
  queue: AnimationTask[];
  isProcessing: boolean;
  activeAnimations: Set<string>;
}

function createAnimationQueue() {
  const { subscribe, update } = writable<AnimationQueueState>({
    queue: [],
    isProcessing: false,
    activeAnimations: new Set()
  });

  return {
    subscribe,
    
    enqueue(task: AnimationTask) {
      update(state => ({
        ...state,
        queue: [...state.queue, task]
      }));
      
      // Start processing if not already running
      const state = get({ subscribe });
      if (!state.isProcessing) {
        this.processQueue();
      }
    },
    
    async processQueue() {
      update(state => ({ ...state, isProcessing: true }));
      
      while (true) {
        const state = get({ subscribe });
        if (state.queue.length === 0) break;
        
        const task = state.queue[0];
        
        // Mark as active
        update(s => ({
          ...s,
          activeAnimations: new Set([...s.activeAnimations, task.id])
        }));
        
        // Execute animation
        await this.executeAnimation(task);
        
        // Remove from queue and active set
        update(s => ({
          ...s,
          queue: s.queue.slice(1),
          activeAnimations: new Set(
            [...s.activeAnimations].filter(id => id !== task.id)
          )
        }));
      }
      
      update(state => ({ ...state, isProcessing: false }));
    },
    
    async executeAnimation(task: AnimationTask): Promise<void> {
      return new Promise(resolve => {
        if (task.type === 'node') {
          // Trigger node animation via DOM or store
          this.animateNode(task.nodeId!, task.duration);
        } else if (task.type === 'edge') {
          // Trigger edge animation
          this.animateEdge(task.edgeId!, task.duration, task.direction);
        }
        
        // Wait for animation to complete
        setTimeout(resolve, task.duration);
      });
    },
    
    animateNode(nodeId: string, duration: number) {
      // Implementation will add/remove CSS classes
      const element = document.querySelector(`[data-node-id="${nodeId}"]`);
      if (element) {
        element.classList.add('animate-pulse-glow');
        setTimeout(() => {
          element.classList.remove('animate-pulse-glow');
        }, duration);
      }
    },
    
    animateEdge(edgeId: string, duration: number, direction?: string) {
      // Implementation will animate edge with traveling gradient
      const element = document.querySelector(`[data-edge-id="${edgeId}"]`);
      if (element) {
        element.classList.add('animate-edge-flow');
        if (direction === 'backward') {
          element.classList.add('reverse');
        }
        setTimeout(() => {
          element.classList.remove('animate-edge-flow', 'reverse');
        }, duration);
      }
    },
    
    clear() {
      update(state => ({
        queue: [],
        isProcessing: false,
        activeAnimations: new Set()
      }));
    }
  };
}

export const animationQueue = createAnimationQueue();
```

### 3. Bottom Navigation Component

**File**: `src/lib/components/BottomNavigation.svelte`

```svelte
<script lang="ts">
  import { mobileLayout } from '$lib/stores/layout';
  
  type Tab = 'editor' | 'output' | 'console';
  
  function setActiveTab(tab: Tab) {
    mobileLayout.update(state => ({ ...state, activeTab: tab }));
  }
</script>

<nav 
  class="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-700 z-50"
  aria-label="Mobile navigation"
>
  <div class="flex justify-around items-center h-16">
    <button
      class="flex-1 flex flex-col items-center justify-center h-full transition-colors
             {$mobileLayout.activeTab === 'editor' ? 'bg-blue-600 text-white' : 'text-gray-400'}"
      on:click={() => setActiveTab('editor')}
      aria-label="Editor tab"
      aria-current={$mobileLayout.activeTab === 'editor' ? 'page' : undefined}
    >
      <svg class="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
              d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
      </svg>
      <span class="text-xs">Editor</span>
    </button>
    
    <button
      class="flex-1 flex flex-col items-center justify-center h-full transition-colors
             {$mobileLayout.activeTab === 'output' ? 'bg-blue-600 text-white' : 'text-gray-400'}"
      on:click={() => setActiveTab('output')}
      aria-label="Output tab"
      aria-current={$mobileLayout.activeTab === 'output' ? 'page' : undefined}
    >
      <svg class="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      <span class="text-xs">Output</span>
    </button>
    
    <button
      class="flex-1 flex flex-col items-center justify-center h-full transition-colors
             {$mobileLayout.activeTab === 'console' ? 'bg-blue-600 text-white' : 'text-gray-400'}"
      on:click={() => setActiveTab('console')}
      aria-label="Console tab"
      aria-current={$mobileLayout.activeTab === 'console' ? 'page' : undefined}
    >
      <svg class="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
              d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
      <span class="text-xs">Console</span>
    </button>
  </div>
</nav>
```

### 4. Main Page Layout (Conditional Rendering)

**File**: `routes/+page.svelte` (key sections)

```svelte
<script lang="ts">
  import { isMobile, mobileLayout, desktopLayout } from '$lib/stores/layout';
  import SplitPane from '$lib/components/SplitPane.svelte';
  import BottomNavigation from '$lib/components/BottomNavigation.svelte';
  import Editor from '$lib/components/Editor.svelte';
  import CodeViewer from '$lib/components/CodeViewer.svelte';
  import Console from '$lib/components/Console.svelte';
  import TopologyDiagram from '$lib/components/TopologyDiagram.svelte';
</script>

{#if $isMobile}
  <!-- Mobile Layout: Single pane with bottom navigation -->
  <div class="h-screen flex flex-col bg-gray-900">
    <Toolbar class="flex-shrink-0" />
    
    <div class="flex-1 overflow-hidden pb-16">
      {#if $mobileLayout.activeTab === 'editor'}
        <div class="h-full">
          <Editor 
            class="h-full touch-pan-y"
            style="touch-action: pan-y;"
          />
        </div>
      {:else if $mobileLayout.activeTab === 'output'}
        <div class="h-full overflow-auto">
          <CodeViewer />
          <TopologyDiagram />
        </div>
      {:else if $mobileLayout.activeTab === 'console'}
        <div class="h-full">
          <Console />
        </div>
      {/if}
    </div>
    
    <BottomNavigation />
  </div>
{:else}
  <!-- Desktop Layout: Three-pane split -->
  <div class="h-screen flex flex-col bg-gray-900">
    <Toolbar class="flex-shrink-0" />
    
    <div class="flex-1 overflow-hidden">
      <SplitPane 
        orientation="horizontal"
        initialSize={$desktopLayout.leftPaneWidth}
        on:resize={(e) => desktopLayout.update(s => ({ ...s, leftPaneWidth: e.detail }))}
      >
        <div slot="left" class="h-full">
          <Editor />
        </div>
        
        <div slot="right" class="h-full">
          <SplitPane 
            orientation="vertical"
            initialSize={$desktopLayout.topRightHeight}
            on:resize={(e) => desktopLayout.update(s => ({ ...s, topRightHeight: e.detail }))}
          >
            <div slot="top" class="h-full overflow-auto">
              <CodeViewer />
              <TopologyDiagram />
            </div>
            
            <div slot="bottom" class="h-full">
              <Console />
            </div>
          </SplitPane>
        </div>
      </SplitPane>
    </div>
  </div>
{/if}
```

### 5. Enhanced Topology Diagram Component

**File**: `src/lib/components/TopologyDiagram.svelte` (key sections)

```svelte
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { animationQueue } from '$lib/stores/animation-queue';
  import type { TopologyType } from '$lib/types';
  
  export let topologyType: TopologyType = 'generic';
  
  let mermaidContainer: HTMLElement;
  let isVisible = true;
  
  // Intersection observer to pause animations when not visible
  onMount(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        isVisible = entries[0].isIntersecting;
        if (!isVisible) {
          animationQueue.clear();
        }
      },
      { threshold: 0.1 }
    );
    
    if (mermaidContainer) {
      observer.observe(mermaidContainer);
    }
    
    return () => observer.disconnect();
  });
  
  function startSimulation() {
    // Queue animations based on topology type
    if (topologyType === 'dendrite') {
      queueDendriteAnimation();
    } else if (topologyType === 'mesh') {
      queueMeshAnimation();
    } else if (topologyType === 'pipeline') {
      queuePipelineAnimation();
    } else {
      queueGenericAnimation();
    }
  }
  
  function queueDendriteAnimation() {
    // Fan-in pattern: sensors -> gateway -> dashboard
    animationQueue.enqueue({ id: 'sensor1', type: 'node', nodeId: 'sensor1', duration: 600 });
    animationQueue.enqueue({ id: 'edge1', type: 'edge', edgeId: 'sensor1-gateway', duration: 400 });
    animationQueue.enqueue({ id: 'gateway', type: 'node', nodeId: 'gateway', duration: 600 });
    animationQueue.enqueue({ id: 'edge2', type: 'edge', edgeId: 'gateway-dashboard', duration: 400 });
    animationQueue.enqueue({ id: 'dashboard', type: 'node', nodeId: 'dashboard', duration: 600 });
  }
  
  function queueMeshAnimation() {
    // Bidirectional: client <-> server
    animationQueue.enqueue({ id: 'client', type: 'node', nodeId: 'client', duration: 600 });
    animationQueue.enqueue({ id: 'edge1', type: 'edge', edgeId: 'client-server', duration: 400, direction: 'forward' });
    animationQueue.enqueue({ id: 'server', type: 'node', nodeId: 'server', duration: 600 });
    animationQueue.enqueue({ id: 'edge2', type: 'edge', edgeId: 'client-server', duration: 400, direction: 'backward' });
  }
  
  function queuePipelineAnimation() {
    // Sequential: stage1 -> stage2 -> stage3
    animationQueue.enqueue({ id: 'stage1', type: 'node', nodeId: 'stage1', duration: 600 });
    animationQueue.enqueue({ id: 'edge1', type: 'edge', edgeId: 'stage1-stage2', duration: 400 });
    animationQueue.enqueue({ id: 'stage2', type: 'node', nodeId: 'stage2', duration: 600 });
    animationQueue.enqueue({ id: 'edge2', type: 'edge', edgeId: 'stage2-stage3', duration: 400 });
    animationQueue.enqueue({ id: 'stage3', type: 'node', nodeId: 'stage3', duration: 600 });
  }
  
  function queueGenericAnimation() {
    // Simple client -> server
    animationQueue.enqueue({ id: 'client', type: 'node', nodeId: 'client', duration: 600 });
    animationQueue.enqueue({ id: 'edge', type: 'edge', edgeId: 'client-server', duration: 400 });
    animationQueue.enqueue({ id: 'server', type: 'node', nodeId: 'server', duration: 600 });
  }
</script>

<div 
  bind:this={mermaidContainer}
  class="topology-container"
  data-reduced-motion={window.matchMedia('(prefers-reduced-motion: reduce)').matches}
>
  <!-- Mermaid diagram rendered here -->
  <slot />
  
  <button 
    on:click={startSimulation}
    class="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
  >
    Simulate Data Flow
  </button>
</div>

<style>
  /* Node pulse animation */
  :global(.animate-pulse-glow) {
    animation: pulse-glow 600ms ease-in-out;
  }
  
  @keyframes pulse-glow {
    0%, 100% {
      filter: drop-shadow(0 0 0 transparent);
      transform: scale(1);
    }
    50% {
      filter: drop-shadow(0 0 8px rgba(59, 130, 246, 0.8));
      transform: scale(1.05);
    }
  }
  
  /* Edge flow animation */
  :global(.animate-edge-flow) {
    stroke-dasharray: 10 5;
    animation: edge-flow 400ms linear;
  }
  
  @keyframes edge-flow {
    from {
      stroke-dashoffset: 0;
    }
    to {
      stroke-dashoffset: -15;
    }
  }
  
  :global(.animate-edge-flow.reverse) {
    animation-direction: reverse;
  }
  
  /* Respect reduced motion preference */
  [data-reduced-motion="true"] :global(.animate-pulse-glow),
  [data-reduced-motion="true"] :global(.animate-edge-flow) {
    animation: none !important;
    filter: none !important;
    transform: none !important;
  }
  
  /* GPU acceleration */
  :global(.animate-pulse-glow),
  :global(.animate-edge-flow) {
    will-change: transform, filter;
    transform: translateZ(0);
  }
</style>
```

## Data Models

### Layout State Models

```typescript
// Desktop split-pane state
interface DesktopLayout {
  leftPaneWidth: number;      // 0-100 percentage
  topRightHeight: number;     // 0-100 percentage
}

// Mobile tab state
type MobileTab = 'editor' | 'output' | 'console';

interface MobileLayout {
  activeTab: MobileTab;
}

// Viewport detection
interface ViewportState {
  width: number;
  height: number;
  isMobile: boolean;          // width < 768px
  isTablet: boolean;          // 768px <= width < 1024px
  isDesktop: boolean;         // width >= 1024px
}
```

### Animation Models

```typescript
// Animation task in queue
interface AnimationTask {
  id: string;                 // unique identifier
  type: 'node' | 'edge';
  nodeId?: string;            // for node animations
  edgeId?: string;            // for edge animations
  duration: number;           // milliseconds
  direction?: 'forward' | 'backward';  // for edge animations
}

// Animation queue state
interface AnimationQueueState {
  queue: AnimationTask[];
  isProcessing: boolean;
  activeAnimations: Set<string>;
}

// Topology types
type TopologyType = 'generic' | 'dendrite' | 'mesh' | 'pipeline';

interface TopologyConfig {
  type: TopologyType;
  nodes: TopologyNode[];
  edges: TopologyEdge[];
}

interface TopologyNode {
  id: string;
  label: string;
  type: 'client' | 'server' | 'gateway' | 'sensor' | 'dashboard' | 'stage';
}

interface TopologyEdge {
  id: string;
  source: string;
  target: string;
  bidirectional: boolean;
}
```

### Documentation Models

```typescript
// README generation context
interface DocumentationContext {
  protocol: ProtocolSpec;
  targetLanguage: 'typescript' | 'python' | 'go' | 'rust';
  packageName: string;        // sanitized
  version: string;
  generatedDate: string;
}

// Template fallback configuration
interface TemplateFallbacks {
  port: string | number;      // default: 'N/A'
  transport: string;          // default: 'TCP'
  description: string;        // default: generated from name
  format: string;             // default: 'Format not specified'
}

// Package name sanitization rules
interface PackageNameRules {
  npm: {
    pattern: /^[a-z0-9-]+$/;
    transform: (name: string) => string;  // to kebab-case
  };
  pip: {
    pattern: /^[a-z0-9_-]+$/;
    transform: (name: string) => string;  // to snake_case or kebab-case
  };
  go: {
    pattern: /^[a-z0-9]+$/;
    transform: (name: string) => string;  // to lowercase
  };
  cargo: {
    pattern: /^[a-z0-9_-]+$/;
    transform: (name: string) => string;  // to snake_case or kebab-case
  };
}
```

