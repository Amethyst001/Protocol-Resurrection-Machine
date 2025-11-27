# Workbench UI Development Guidelines

This document defines best practices for developing the Protocol Resurrection Machine workbench UI using SvelteKit.

## SvelteKit Component Patterns

### Component Structure
```svelte
<script lang="ts">
  // 1. Imports
  import { onMount } from 'svelte';
  import type { Protocol } from '$lib/types';
  
  // 2. Props
  export let protocol: Protocol;
  export let onSave: (protocol: Protocol) => void;
  
  // 3. State
  let isEditing = false;
  let errors: string[] = [];
  
  // 4. Reactive declarations
  $: isValid = errors.length === 0;
  
  // 5. Functions
  function handleSave() {
    if (isValid) {
      onSave(protocol);
    }
  }
  
  // 6. Lifecycle
  onMount(() => {
    // Initialize
  });
</script>

<!-- 7. Template -->
<div class="protocol-editor">
  <!-- Content -->
</div>

<!-- 8. Styles -->
<style>
  .protocol-editor {
    /* Scoped styles */
  }
</style>
```

### Component Rules
- Keep components small and focused (< 200 lines)
- Use TypeScript for all scripts
- Export props explicitly with `export let`
- Use reactive declarations ($:) for derived state
- Prefer composition over inheritance
- Extract reusable logic to stores or utilities

## Tailwind CSS Usage

### Utility-First Approach
```svelte
<button
  class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 
         focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
         disabled:opacity-50 disabled:cursor-not-allowed"
  disabled={!isValid}
  on:click={handleSave}
>
  Save Protocol
</button>
```

### Custom Components
```svelte
<!-- Button.svelte -->
<script lang="ts">
  export let variant: 'primary' | 'secondary' | 'danger' = 'primary';
  export let disabled = false;
  
  const variants = {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white',
    secondary: 'bg-gray-200 hover:bg-gray-300 text-gray-900',
    danger: 'bg-red-600 hover:bg-red-700 text-white'
  };
</script>

<button
  class="px-4 py-2 rounded-lg focus:outline-none focus:ring-2 
         disabled:opacity-50 disabled:cursor-not-allowed {variants[variant]}"
  {disabled}
  on:click
>
  <slot />
</button>
```

### Tailwind Rules
- Use utility classes for most styling
- Create component classes for repeated patterns
- Use @apply sparingly in <style> blocks
- Follow mobile-first responsive design (sm:, md:, lg:)
- Use Tailwind's color palette consistently
- Leverage dark mode with dark: prefix

## API Endpoint Implementation

### Route Structure
```
routes/
  api/
    protocols/
      +server.ts              # GET /api/protocols, POST /api/protocols
      [id]/
        +server.ts            # GET /api/protocols/:id, PUT, DELETE
        generate/
          +server.ts          # POST /api/protocols/:id/generate
```

### Endpoint Pattern
```typescript
// routes/api/protocols/+server.ts
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { protocolService } from '$lib/server/services';

export const GET: RequestHandler = async ({ url }) => {
  try {
    const protocols = await protocolService.list();
    return json(protocols);
  } catch (error) {
    return json(
      { error: error.message },
      { status: 500 }
    );
  }
};

export const POST: RequestHandler = async ({ request }) => {
  try {
    const data = await request.json();
    const protocol = await protocolService.create(data);
    return json(protocol, { status: 201 });
  } catch (error) {
    return json(
      { error: error.message },
      { status: 400 }
    );
  }
};
```

### API Rules
- Use RESTful conventions
- Return appropriate HTTP status codes
- Validate input data
- Handle errors gracefully
- Use TypeScript for type safety
- Keep business logic in services, not routes
- Use +server.ts for API routes

## Store Management

### Writable Stores
```typescript
// lib/stores/protocols.ts
import { writable } from 'svelte/store';
import type { Protocol } from '$lib/types';

function createProtocolStore() {
  const { subscribe, set, update } = writable<Protocol[]>([]);
  
  return {
    subscribe,
    load: async () => {
      const response = await fetch('/api/protocols');
      const protocols = await response.json();
      set(protocols);
    },
    add: (protocol: Protocol) => {
      update(protocols => [...protocols, protocol]);
    },
    remove: (id: string) => {
      update(protocols => protocols.filter(p => p.id !== id));
    }
  };
}

export const protocols = createProtocolStore();
```

### Derived Stores
```typescript
import { derived } from 'svelte/store';
import { protocols } from './protocols';

export const protocolCount = derived(
  protocols,
  $protocols => $protocols.length
);

export const validProtocols = derived(
  protocols,
  $protocols => $protocols.filter(p => p.isValid)
);
```

### Store Rules
- Use stores for shared state
- Keep stores focused and single-purpose
- Provide methods for common operations
- Use derived stores for computed values
- Avoid storing derived data
- Clean up subscriptions in components

## Performance Optimization

### Debouncing
```typescript
function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

// Usage in component
const handleSearch = debounce((query: string) => {
  // Perform search
}, 300);
```

### Virtual Scrolling
```svelte
<script lang="ts">
  import { VirtualList } from 'svelte-virtual-list';
  
  export let items: any[];
  
  let start: number;
  let end: number;
</script>

<VirtualList {items} let:item bind:start bind:end>
  <div class="item">
    {item.name}
  </div>
</VirtualList>
```

### Performance Rules
- Debounce user input (300ms for search, 500ms for validation)
- Use virtual scrolling for large lists (> 100 items)
- Lazy load images and heavy components
- Memoize expensive computations
- Avoid unnecessary reactivity
- Use {#key} blocks to force re-renders when needed

## Accessibility Requirements

### Semantic HTML
```svelte
<nav aria-label="Main navigation">
  <ul>
    <li><a href="/protocols">Protocols</a></li>
    <li><a href="/generate">Generate</a></li>
  </ul>
</nav>

<main>
  <h1>Protocol Editor</h1>
  <form on:submit|preventDefault={handleSubmit}>
    <label for="protocol-name">Protocol Name</label>
    <input
      id="protocol-name"
      type="text"
      bind:value={name}
      aria-required="true"
      aria-invalid={errors.name ? 'true' : 'false'}
      aria-describedby={errors.name ? 'name-error' : undefined}
    />
    {#if errors.name}
      <span id="name-error" class="error" role="alert">
        {errors.name}
      </span>
    {/if}
  </form>
</main>
```

### Keyboard Navigation
```svelte
<script lang="ts">
  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      closeModal();
    } else if (event.key === 'Enter' && event.ctrlKey) {
      handleSave();
    }
  }
</script>

<div
  role="dialog"
  aria-modal="true"
  aria-labelledby="dialog-title"
  on:keydown={handleKeydown}
  tabindex="-1"
>
  <!-- Dialog content -->
</div>
```

### Accessibility Rules
- Use semantic HTML elements
- Provide ARIA labels for interactive elements
- Ensure keyboard navigation works
- Maintain focus management in modals
- Use sufficient color contrast (WCAG AA)
- Provide text alternatives for images
- Test with screen readers

## Form Validation

### Client-Side Validation
```svelte
<script lang="ts">
  import { z } from 'zod';
  
  const protocolSchema = z.object({
    name: z.string().min(1, 'Name is required').max(50),
    port: z.number().min(1).max(65535),
    format: z.string().min(1, 'Format is required')
  });
  
  let formData = { name: '', port: 70, format: '' };
  let errors: Record<string, string> = {};
  
  function validate() {
    try {
      protocolSchema.parse(formData);
      errors = {};
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        errors = error.errors.reduce((acc, err) => {
          acc[err.path[0]] = err.message;
          return acc;
        }, {} as Record<string, string>);
      }
      return false;
    }
  }
  
  function handleSubmit() {
    if (validate()) {
      // Submit form
    }
  }
</script>
```

### Validation Rules
- Validate on blur and submit
- Show errors inline near fields
- Use zod or similar for schema validation
- Provide helpful error messages
- Validate on server as well
- Clear errors when user corrects input

## Error Handling

### Error Boundary
```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  
  let error: Error | null = null;
  
  onMount(() => {
    window.addEventListener('error', (event) => {
      error = event.error;
    });
  });
</script>

{#if error}
  <div class="error-boundary">
    <h2>Something went wrong</h2>
    <p>{error.message}</p>
    <button on:click={() => window.location.reload()}>
      Reload Page
    </button>
  </div>
{:else}
  <slot />
{/if}
```

### Toast Notifications
```typescript
// lib/stores/toast.ts
import { writable } from 'svelte/store';

type Toast = {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
};

function createToastStore() {
  const { subscribe, update } = writable<Toast[]>([]);
  
  return {
    subscribe,
    show: (message: string, type: Toast['type'] = 'info') => {
      const id = Math.random().toString(36);
      update(toasts => [...toasts, { id, message, type }]);
      setTimeout(() => {
        update(toasts => toasts.filter(t => t.id !== id));
      }, 5000);
    },
    success: (message: string) => {
      return createToastStore().show(message, 'success');
    },
    error: (message: string) => {
      return createToastStore().show(message, 'error');
    }
  };
}

export const toast = createToastStore();
```

### Error Handling Rules
- Catch errors at component boundaries
- Show user-friendly error messages
- Log errors for debugging
- Provide recovery actions
- Use toast notifications for transient errors
- Use error pages for critical errors

## Testing

### Component Tests
```typescript
import { render, fireEvent } from '@testing-library/svelte';
import { describe, it, expect } from 'vitest';
import ProtocolEditor from './ProtocolEditor.svelte';

describe('ProtocolEditor', () => {
  it('renders protocol name', () => {
    const { getByText } = render(ProtocolEditor, {
      props: { protocol: { name: 'Gopher' } }
    });
    expect(getByText('Gopher')).toBeInTheDocument();
  });
  
  it('calls onSave when save button clicked', async () => {
    let saved = false;
    const { getByRole } = render(ProtocolEditor, {
      props: {
        protocol: { name: 'Gopher' },
        onSave: () => { saved = true; }
      }
    });
    
    await fireEvent.click(getByRole('button', { name: /save/i }));
    expect(saved).toBe(true);
  });
});
```

### E2E Tests (Playwright)
```typescript
import { test, expect } from '@playwright/test';

test('create new protocol', async ({ page }) => {
  await page.goto('/protocols');
  await page.click('text=New Protocol');
  
  await page.fill('#protocol-name', 'Test Protocol');
  await page.fill('#protocol-port', '8080');
  await page.click('text=Save');
  
  await expect(page.locator('text=Test Protocol')).toBeVisible();
});
```

### Testing Rules
- Test user interactions, not implementation
- Use Testing Library for component tests
- Use Playwright for E2E tests
- Mock API calls in component tests
- Test accessibility with axe
- Aim for 80%+ coverage on critical paths

