<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { EditorView, basicSetup } from 'codemirror';
  import { EditorState, type Extension } from '@codemirror/state';
  import { yaml } from '@codemirror/lang-yaml';
  import { oneDark } from '@codemirror/theme-one-dark';
  import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
  import { tags } from '@lezer/highlight';
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

  // Light theme for CodeMirror - Engineering Blueprint style
  const lightTheme = EditorView.theme({
    '&': {
      backgroundColor: '#ffffff',
      color: '#0f172a',
    },
    '.cm-content': {
      caretColor: '#2563eb',
    },
    '.cm-cursor, .cm-dropCursor': {
      borderLeftColor: '#2563eb',
    },
    '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection': {
      backgroundColor: '#dbeafe',
    },
    '.cm-panels': {
      backgroundColor: '#f8fafc',
      color: '#0f172a',
    },
    '.cm-panels.cm-panels-top': {
      borderBottom: '1px solid #e2e8f0',
    },
    '.cm-panels.cm-panels-bottom': {
      borderTop: '1px solid #e2e8f0',
    },
    '.cm-searchMatch': {
      backgroundColor: '#fef08a',
      outline: '1px solid #facc15',
    },
    '.cm-searchMatch.cm-searchMatch-selected': {
      backgroundColor: '#fde047',
    },
    '.cm-activeLine': {
      backgroundColor: '#f1f5f9',
    },
    '.cm-selectionMatch': {
      backgroundColor: '#dbeafe',
    },
    '&.cm-focused .cm-matchingBracket, &.cm-focused .cm-nonmatchingBracket': {
      backgroundColor: '#dbeafe',
      outline: '1px solid #93c5fd',
    },
    '.cm-gutters': {
      backgroundColor: '#f8fafc',
      color: '#94a3b8',
      border: 'none',
      borderRight: '1px solid #e2e8f0',
    },
    '.cm-activeLineGutter': {
      backgroundColor: '#e2e8f0',
      color: '#475569',
    },
    '.cm-foldPlaceholder': {
      backgroundColor: '#e2e8f0',
      border: 'none',
      color: '#64748b',
    },
    '.cm-tooltip': {
      border: '1px solid #e2e8f0',
      backgroundColor: '#ffffff',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    },
    '.cm-tooltip .cm-tooltip-arrow:before': {
      borderTopColor: '#e2e8f0',
      borderBottomColor: '#e2e8f0',
    },
    '.cm-tooltip .cm-tooltip-arrow:after': {
      borderTopColor: '#ffffff',
      borderBottomColor: '#ffffff',
    },
    '.cm-tooltip-autocomplete': {
      '& > ul > li[aria-selected]': {
        backgroundColor: '#dbeafe',
        color: '#0f172a',
      },
    },
  }, { dark: false });

  // Light syntax highlighting
  const lightHighlightStyle = HighlightStyle.define([
    { tag: tags.keyword, color: '#7c3aed' },
    { tag: tags.operator, color: '#0f172a' },
    { tag: tags.special(tags.variableName), color: '#0369a1' },
    { tag: tags.typeName, color: '#0891b2' },
    { tag: tags.atom, color: '#7c3aed' },
    { tag: tags.number, color: '#c2410c' },
    { tag: tags.definition(tags.variableName), color: '#0369a1' },
    { tag: tags.string, color: '#15803d' },
    { tag: tags.special(tags.string), color: '#15803d' },
    { tag: tags.comment, color: '#64748b', fontStyle: 'italic' },
    { tag: tags.variableName, color: '#0f172a' },
    { tag: tags.tagName, color: '#0891b2' },
    { tag: tags.bracket, color: '#64748b' },
    { tag: tags.meta, color: '#7c3aed' },
    { tag: tags.link, color: '#2563eb', textDecoration: 'underline' },
    { tag: tags.heading, fontWeight: 'bold', color: '#0f172a' },
    { tag: tags.emphasis, fontStyle: 'italic' },
    { tag: tags.strong, fontWeight: 'bold' },
    { tag: tags.strikethrough, textDecoration: 'line-through' },
    { tag: tags.className, color: '#0891b2' },
    { tag: tags.propertyName, color: '#0369a1' },
    { tag: tags.labelName, color: '#7c3aed' },
    { tag: tags.namespace, color: '#0891b2' },
    { tag: tags.macroName, color: '#7c3aed' },
    { tag: tags.literal, color: '#c2410c' },
    { tag: tags.inserted, color: '#15803d' },
    { tag: tags.deleted, color: '#dc2626' },
    { tag: tags.changed, color: '#d97706' },
    { tag: tags.invalid, color: '#dc2626' },
  ]);

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
    } else {
      extensions.push(lightTheme);
      extensions.push(syntaxHighlighting(lightHighlightStyle));
    }

    // Subscribe to theme changes and recreate editor when theme changes
    const unsubscribe = theme.subscribe((t) => {
      if (currentTheme !== t && editorView) {
        currentTheme = t;
        // Recreate editor with new theme
        const currentDoc = editorView.state.doc.toString();
        editorView.destroy();
        
        const newExtensions: Extension[] = [
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
              debouncedValidate(newValue);
            }
          }),
        ];
        
        if ($isMobile) {
          newExtensions.push(
            EditorView.editorAttributes.of({
              class: 'mobile-editor-view'
            })
          );
        }
        
        if (t === 'dark') {
          newExtensions.push(oneDark);
        } else {
          newExtensions.push(lightTheme);
          newExtensions.push(syntaxHighlighting(lightHighlightStyle));
        }
        
        const newState = EditorState.create({
          doc: currentDoc,
          extensions: newExtensions,
        });
        
        editorView = new EditorView({
          state: newState,
          parent: editorElement,
        });
      }
      currentTheme = t;
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

  /* Light Mode - Engineering Blueprint */
  :global(.cm-editor) {
    height: 100%;
    font-size: 14px;
    background: #ffffff;
  }
  
  :global(.cm-scroller) {
    overflow: auto;
  }

  :global(.cm-gutters) {
    background: #f8fafc;
    border-right: 1px solid #e2e8f0;
    color: #94a3b8;
  }

  :global(.cm-lineNumbers .cm-gutterElement) {
    color: #94a3b8;
  }

  :global(.cm-activeLine) {
    background: #f1f5f9;
    border-radius: 0.25rem;
  }

  :global(.cm-activeLineGutter) {
    background: #e2e8f0;
    color: #475569;
  }

  :global(.cm-tooltip-hover) {
    background-color: #ffffff;
    color: #0f172a;
    border: 1px solid #e2e8f0;
    border-radius: 4px;
    padding: 4px 8px;
    font-size: 12px;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  }

  :global(.cm-diagnostic-error) {
    border-left: 3px solid #dc2626;
  }

  :global(.cm-diagnostic-warning) {
    border-left: 3px solid #ca8a04;
  }

  :global(.cm-diagnostic-info) {
    border-left: 3px solid #2563eb;
  }

  /* Dark Mode */
  :global(.dark .cm-editor),
  :global([data-mode='dark'] .cm-editor) {
    background: #0f172a;
  }

  :global(.dark .cm-gutters),
  :global([data-mode='dark'] .cm-gutters) {
    background: #1e293b;
    border-right-color: #334155;
    color: #64748b;
  }

  :global(.dark .cm-lineNumbers .cm-gutterElement),
  :global([data-mode='dark'] .cm-lineNumbers .cm-gutterElement) {
    color: #64748b;
  }

  :global(.dark .cm-activeLine),
  :global([data-mode='dark'] .cm-activeLine) {
    background: #1e293b;
  }

  :global(.dark .cm-activeLineGutter),
  :global([data-mode='dark'] .cm-activeLineGutter) {
    background: #334155;
    color: #94a3b8;
  }

  :global(.dark .cm-tooltip-hover),
  :global([data-mode='dark'] .cm-tooltip-hover) {
    background-color: #1e293b;
    color: #e2e8f0;
    border-color: #334155;
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
</style>
