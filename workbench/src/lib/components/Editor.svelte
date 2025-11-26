<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { EditorView, basicSetup } from 'codemirror';
  import { EditorState, type Extension } from '@codemirror/state';
  import { yaml } from '@codemirror/lang-yaml';
  import { oneDark } from '@codemirror/theme-one-dark';
  import { lintGutter, linter, type Diagnostic as CMDiagnostic } from '@codemirror/lint';
  import {
    autocompletion,
    type CompletionContext,
    type CompletionResult,
  } from '@codemirror/autocomplete';
  import { hoverTooltip, type Tooltip } from '@codemirror/view';
  import { theme } from '$lib/stores/theme';
  import { isMobile } from '$lib/stores/layout';
  import { debounce } from '$lib/utils/debounce';

  export let value: string = '';
  export let diagnostics: Array<{
    line: number;
    column: number;
    severity: 'error' | 'warning' | 'info';
    message: string;
  }> = [];
  export let onchange: (value: string) => void = () => {};
  export let onvalidate: (value: string) => void = () => {};

  let editorElement: HTMLDivElement;
  let editorView: EditorView | null = null;
  let currentTheme: 'light' | 'dark' = 'dark';
  let currentDiagnostics: typeof diagnostics = [];
  
  // Touch gesture tracking for horizontal swipe prevention
  let touchStartX = 0;
  let touchStartY = 0;

  // Debounced validation function (500ms delay)
  const debouncedValidate = debounce((text: string) => {
    onvalidate(text);
  }, 500);

  // Convert our diagnostics to CodeMirror format
  function convertDiagnostics(text: string): CMDiagnostic[] {
    return currentDiagnostics.map((diag) => {
      const lines = text.split('\n');
      let from = 0;
      const line = diag.line || 1;
      const column = diag.column || 1;

      for (let i = 0; i < line - 1 && i < lines.length; i++) {
        from += lines[i].length + 1; // +1 for newline
      }
      from += column - 1; // 0-indexed column for calculation

      return {
        from,
        to: from + 1,
        severity: diag.severity,
        message: diag.message,
      };
    });
  }

  // Custom lint source that uses our diagnostics
  const customLintSource = linter((view) => {
    return convertDiagnostics(view.state.doc.toString());
  });

  // Autocomplete provider for YAML protocol specs
  function yamlAutocomplete(context: CompletionContext): CompletionResult | null {
    const word = context.matchBefore(/\w*/);
    if (!word || (word.from === word.to && !context.explicit)) {
      return null;
    }

    const suggestions = [
      // Top-level keys
      { label: 'protocol', type: 'keyword', info: 'Protocol metadata' },
      { label: 'connection', type: 'keyword', info: 'Connection configuration' },
      { label: 'messageTypes', type: 'keyword', info: 'Message type definitions' },

      // Protocol fields
      { label: 'name', type: 'property', info: 'Protocol name' },
      { label: 'version', type: 'property', info: 'Protocol version' },
      { label: 'description', type: 'property', info: 'Protocol description' },
      { label: 'defaultPort', type: 'property', info: 'Default port number' },

      // Connection fields
      { label: 'type', type: 'property', info: 'Connection type (tcp/udp)' },
      { label: 'terminator', type: 'property', info: 'Message terminator' },

      // Message type fields
      { label: 'format', type: 'property', info: 'Message format string' },
      { label: 'fields', type: 'property', info: 'Field definitions' },
      { label: 'direction', type: 'property', info: 'Message direction (request/response)' },

      // Field types
      { label: 'string', type: 'type', info: 'String field type' },
      { label: 'integer', type: 'type', info: 'Integer field type' },
      { label: 'enum', type: 'type', info: 'Enumeration field type' },

      // Validation constraints
      { label: 'minLength', type: 'property', info: 'Minimum length constraint' },
      { label: 'maxLength', type: 'property', info: 'Maximum length constraint' },
      { label: 'pattern', type: 'property', info: 'Regex pattern constraint' },
      { label: 'min', type: 'property', info: 'Minimum value constraint' },
      { label: 'max', type: 'property', info: 'Maximum value constraint' },
      { label: 'values', type: 'property', info: 'Enum values' },
    ];

    return {
      from: word.from,
      options: suggestions,
    };
  }

  // Hover documentation provider
  function hoverDocumentation(view: EditorView, pos: number): Tooltip | null {
    const word = view.state.wordAt(pos);
    if (!word) return null;

    const text = view.state.doc.sliceString(word.from, word.to);

    const docs: Record<string, string> = {
      protocol: 'Protocol metadata including name, version, and description',
      connection: 'Connection configuration including type, port, and terminator',
      messageTypes: 'Array of message type definitions for the protocol',
      format: 'Format string using {field} placeholders and fixed text',
      fields: 'Field definitions with types and validation constraints',
      terminator: 'Byte sequence that marks the end of a message (e.g., \\r\\n)',
      string: 'Variable-length text field',
      integer: 'Numeric field',
      enum: 'Field with a fixed set of allowed values',
    };

    const doc = docs[text];
    if (!doc) return null;

    return {
      pos: word.from,
      above: true,
      create() {
        const dom = document.createElement('div');
        dom.className = 'cm-tooltip-hover';
        dom.textContent = doc;
        return { dom };
      },
    };
  }

  // Handle touch events to prevent horizontal swipes
  function handleTouchStart(event: TouchEvent) {
    if (!$isMobile) return;
    
    const touch = event.touches[0];
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
  }

  function handleTouchMove(event: TouchEvent) {
    if (!$isMobile) return;
    
    const touch = event.touches[0];
    const deltaX = Math.abs(touch.clientX - touchStartX);
    const deltaY = Math.abs(touch.clientY - touchStartY);
    
    // If horizontal swipe exceeds threshold and is greater than vertical movement, prevent it
    if (deltaX > 50 && deltaX > deltaY) {
      event.preventDefault();
    }
  }

  onMount(() => {
    const extensions: Extension[] = [
      // Use basicSetup with mobile-specific configuration
      basicSetup,
      yaml(),
      lintGutter(),
      customLintSource,
      autocompletion({
        override: [yamlAutocomplete],
        activateOnTyping: true,
      }),
      hoverTooltip(hoverDocumentation),
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          const newValue = update.state.doc.toString();
          onchange(newValue);
          // Trigger debounced validation
          debouncedValidate(newValue);
        }
      }),
    ];
    
    // Mobile-specific: hide line numbers via CSS class
    if ($isMobile) {
      extensions.push(
        EditorView.editorAttributes.of({
          class: 'mobile-editor-view'
        })
      );
    }

    // Add theme based on initial value
    if (currentTheme === 'dark') {
      extensions.push(oneDark);
    }

    // Subscribe to theme changes (note: theme changes require editor recreation in CodeMirror 6)
    const unsubscribe = theme.subscribe((t) => {
      currentTheme = t;
      // Theme changes would require recreating the editor view
      // For now, we'll just track the current theme
    });

    const startState = EditorState.create({
      doc: value,
      extensions,
    });

    editorView = new EditorView({
      state: startState,
      parent: editorElement,
    });
    
    // Add touch event listeners for mobile
    if (editorElement) {
      editorElement.addEventListener('touchstart', handleTouchStart, { passive: true });
      editorElement.addEventListener('touchmove', handleTouchMove, { passive: false });
    }

    return () => {
      unsubscribe();
      if (editorElement) {
        editorElement.removeEventListener('touchstart', handleTouchStart);
        editorElement.removeEventListener('touchmove', handleTouchMove);
      }
    };
  });

  onDestroy(() => {
    if (editorView) {
      editorView.destroy();
      editorView = null;
    }
  });

  // Update diagnostics when they change
  $: if (editorView && diagnostics) {
    currentDiagnostics = diagnostics;
    // Force lint update by dispatching a transaction
    editorView.dispatch({
      effects: [],
    });
  }

  // Update value when it changes externally
  $: if (editorView && value !== undefined && value !== editorView.state.doc.toString()) {
    editorView.dispatch({
      changes: {
        from: 0,
        to: editorView.state.doc.length,
        insert: value,
      },
    });
  }
</script>

<div 
  bind:this={editorElement} 
  class="h-full w-full overflow-auto bg-white dark:bg-slate-900"
  class:mobile-editor={$isMobile}
  style={$isMobile ? 'touch-action: pan-y;' : ''}
></div>

<style>
  /* Mobile-specific height adjustment */
  .mobile-editor {
    height: calc(100vh - 60px);
  }

  :global(.cm-editor) {
    height: 100%;
    font-size: 14px;
    background: #ffffff;
  }
  
  /* Mobile: larger font for readability */
  :global(.mobile-editor .cm-editor) {
    font-size: 16px;
    line-height: 1.6;
  }
  
  /* Mobile: hide line numbers to save screen space */
  :global(.mobile-editor .cm-lineNumbers) {
    display: none;
  }
  
  /* Mobile: hide fold gutter */
  :global(.mobile-editor .cm-foldGutter) {
    display: none;
  }
  
  /* Mobile: adjust gutters */
  :global(.mobile-editor .cm-gutters) {
    min-width: 0;
  }

  :global(.dark .cm-editor) {
    background: #0f172a;
  }

  :global(.cm-scroller) {
    overflow: auto;
  }

  :global(.cm-gutters) {
    background: #f9fafb;
    border-right: 1px solid #e5e7eb;
  }

  :global(.dark .cm-gutters) {
    background: #1f2937;
    border-right-color: #374151;
  }

  :global(.cm-activeLine) {
    background: #f3f4f6;
    border-radius: 0.25rem;
  }

  :global(.dark .cm-activeLine) {
    background: #374151;
    border-radius: 0.25rem;
  }

  :global(.cm-activeLineGutter) {
    background: #e5e7eb;
  }

  :global(.dark .cm-activeLineGutter) {
    background: #4b5563;
  }

  :global(.cm-tooltip-hover) {
    background-color: white;
    color: #1f2937;
    border: 1px solid #d1d5db;
    border-radius: 4px;
    padding: 4px 8px;
    font-size: 12px;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  }

  :global(.dark .cm-tooltip-hover) {
    background-color: #1f2937;
    color: #e5e7eb;
    border-color: #4b5563;
  }

  :global(.cm-diagnostic-error) {
    border-left: 3px solid #ef4444;
  }

  :global(.cm-diagnostic-warning) {
    border-left: 3px solid #f59e0b;
  }

  :global(.cm-diagnostic-info) {
    border-left: 3px solid #3b82f6;
  }
</style>
