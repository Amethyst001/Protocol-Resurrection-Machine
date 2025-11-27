<script lang="ts">
  import { theme, toggleTheme, currentTheme } from '$lib/stores/theme';
  import { layout, resetLayout, isMobile, mobileLayout } from '$lib/stores/layout';
  import { diagnostics } from '$lib/stores/diagnostics';
  import { spec } from '$lib/stores/spec';
  import { toast } from '$lib/stores/toast';
  import { generated } from '$lib/stores/generated';
  import { consoleStore, formattedLogs } from '$lib/stores/console';
  import { pbtResults } from '$lib/stores/pbtResults';
  import { timeline } from '$lib/stores/timeline';
  import { discovery } from '$lib/stores/discovery';
  import { documentation } from '$lib/stores/documentation';
  import { steering } from '$lib/stores/steering';
  import { mcp } from '$lib/stores/mcp';
  import { animationQueue } from '$lib/stores/animation-queue';
  import { loadPreset } from '$lib/utils/preset-loader';
  import SplitPane from '$lib/components/SplitPane.svelte';
  import Editor from '$lib/components/Editor.svelte';
  import CodeViewer from '$lib/components/CodeViewer.svelte';
  import Console from '$lib/components/Console.svelte';
  import ProtocolDiscovery from '$lib/components/ProtocolDiscovery.svelte';
  import MCPServer from '$lib/components/MCPServer.svelte';
  import DocumentationViewer from '$lib/components/DocumentationViewer.svelte';
  import Toolbar from '$lib/components/Toolbar.svelte';
  import ActivityBar from '$lib/components/ActivityBar.svelte';
  import ErrorBoundary from '$lib/components/ErrorBoundary.svelte';
  import ToastContainer from '$lib/components/ToastContainer.svelte';
  import ScenarioModal from '$lib/components/ScenarioModal.svelte';
  import BottomNavigation from '$lib/components/BottomNavigation.svelte';
  import type { Preset } from '$lib/utils/preset-loader';
  import { onMount, onDestroy } from 'svelte';
  import { keyboardManager } from '$lib/utils/keyboard';

  let activeView = $state('editor');
  let consoleCollapsed = $state(false);
  let scenarioModalOpen = $state(false);
  let selectedLanguage = $state<'typescript' | 'python' | 'go' | 'rust' | 'topology'>('typescript');
  let autoStartSimulation = $state(false);

  function handleViewChange(event: CustomEvent<{ view: string }>) {
    activeView = event.detail.view;
  }

  // Handle preset loading
  async function handleLoadPreset(yamlFile: string) {
    try {
      consoleStore.log(`Loading preset: ${yamlFile}...`, 'info');
      const yamlContent = await loadPreset(yamlFile);
      $spec = yamlContent;

      // Update active node for topology (extract ID from filename or content)
      // Simple heuristic: map filename to ID
      const presetId = yamlFile.includes('binary')
        ? 'iot'
        : yamlFile.includes('banking')
          ? 'banking'
          : 'chat';
      activeNode = undefined; // Reset active node

      consoleStore.log(`✓ Preset loaded successfully`, 'success');
      toast.success(`Preset loaded: ${yamlFile.replace('.yaml', '')}`);

      // Auto-validate the loaded preset
      await handleValidation(yamlContent);

      // Auto-generate code for immediate feedback
      await handleGenerate();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      consoleStore.log(`✗ Failed to load preset: ${errorMessage}`, 'error');
      toast.error(`Failed to load preset: ${errorMessage}`);
    }
  }

  // Handle documentation generation
  async function handleGenerateDocs() {
    documentation.setGenerating(true);
    consoleStore.log('Generating documentation...', 'info');

    try {
      const response = await fetch('/api/documentation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ yaml: $spec }),
      });

      if (!response.ok) {
        throw new Error(`Documentation generation failed: ${response.statusText}`);
      }

      const result = await response.json();
      documentation.setDocs(result);
      consoleStore.log('✓ Documentation generated successfully', 'success');
      toast.success('Documentation generated successfully');

      // Switch to docs view
      activeView = 'docs';
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      documentation.setError(errorMessage);
      consoleStore.log(`✗ Documentation generation failed: ${errorMessage}`, 'error');
      toast.error(`Documentation generation failed: ${errorMessage}`);
    } finally {
      documentation.setGenerating(false);
    }
  }

  // Handle editor value changes
  function handleEditorChange(value: string) {
    $spec = value;
  }

  // Handle validation requests
  async function handleValidation(value: string, autoConvert: boolean = false) {
    // Skip validation if input is empty
    if (!value || value.trim().length === 0) {
      $diagnostics = [];
      return;
    }

    try {
      const response = await fetch('/api/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ yaml: value, autoConvert }),
      });

      if (!response.ok) {
        throw new Error(`Validation failed: ${response.statusText}`);
      }

      const result = await response.json();

      // If the input was auto-converted, update the editor
      if (result.wasConverted && result.convertedYaml) {
        $spec = result.convertedYaml;

        if (result.fixesApplied && result.fixesApplied.length > 0) {
          const fixCount = result.fixesApplied.length;
          const fixSummary =
            result.fixesApplied.slice(0, 3).join(', ') +
            (fixCount > 3 ? ` and ${fixCount - 3} more` : '');
          toast.success(`Applied ${fixCount} fixes: ${fixSummary}`);
          consoleStore.log(`✓ Applied ${fixCount} fixes:`, 'success');
          result.fixesApplied.forEach((fix: string) => consoleStore.log(`  - ${fix}`, 'info'));
        } else {
          toast.success('Input auto-converted to valid YAML format!');
          consoleStore.log('✓ Input was automatically converted to valid YAML', 'success');
        }

        $diagnostics = result.diagnostics || [];
        return;
      }

      // If conversion is available, prompt the user
      if (result.canAutoConvert && !autoConvert) {
        const shouldConvert = confirm(
          'This input appears to be invalid or improperly formatted YAML.\n\n' +
            'Would you like to automatically format and convert it to valid YAML?\n\n' +
            '(This will extract protocol information from TypeScript code, fix broken YAML, or create a basic template)'
        );

        if (shouldConvert) {
          // Retry validation with autoConvert flag
          handleValidation(value, true);
          return;
        }
      }

      if (result.diagnostics) {
        $diagnostics = result.diagnostics;
        // Check for CRITICAL errors only for validity
        const hasCritical = result.diagnostics.some((d: any) => d.severity === 'CRITICAL');

        if (!hasCritical) {
          if ($currentTheme === 'halloween') {
            toast.success(`Resurrection Successful. Health Score: ${result.score ?? 100} 🧟`);
          } else {
            toast.success(`Specification is valid. Health Score: ${result.score ?? 100}`);
          }
        }

        if (result.score !== undefined) {
          if (result.score < 50)
            consoleStore.log(`⚠ Health Score: ${result.score} (Critical Condition)`, 'error');
          else if (result.score < 80)
            consoleStore.log(`⚠ Health Score: ${result.score} (Needs Improvement)`, 'warning');
          else consoleStore.log(`✓ Health Score: ${result.score} (Healthy)`, 'success');
        }
      } else {
        $diagnostics = [];
      }
    } catch (error) {
      console.error('Validation error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Validation failed: ${errorMessage}`);
      $diagnostics = [
        {
          line: 1,
          column: 1,
          severity: 'error',
          message: 'Failed to validate: ' + errorMessage,
        },
      ];
    }
  }

  let isValidating = $state(false);
  let isGenerating = $state(false);
  let isRunningPBT = $state(false);
  let isDiscovering = $state(false);
  let isValidatingCode = $state(false);
  let activeNode: 'typescript' | 'python' | 'go' | 'rust' | undefined = $state(undefined);
  let consoleComponent = $state<Console>();
  let simulationStartIndex = $state(0);

  // Handle auto-fix
  async function handleAutoFix() {
    consoleStore.log('Running auto-fix...', 'info');
    try {
      const response = await fetch('/api/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ yaml: $spec, autoConvert: true }),
      });

      if (!response.ok) {
        throw new Error(`Auto-fix failed: ${response.statusText}`);
      }

      const result = await response.json();

      // If the input was auto-converted, update the editor
      if (result.wasConverted && result.convertedYaml) {
        $spec = result.convertedYaml;

        if (result.valid) {
          const fixCount = result.fixesApplied?.length || 0;
          const fixSummary = result.fixesApplied
            ? result.fixesApplied.slice(0, 3).join(', ') +
              (fixCount > 3 ? ` and ${fixCount - 3} more` : '')
            : 'Fixed formatting';

          toast.success(`Auto-fixed successfully! Score: ${result.score}`);
          consoleStore.log(
            `✓ Auto-fix successful (Score: ${result.score}). Applied ${fixCount} fixes:`,
            'success'
          );
          if (result.fixesApplied) {
            result.fixesApplied.forEach((fix: string) => consoleStore.log(`  - ${fix}`, 'info'));
          }
          $diagnostics = result.diagnostics || [];
        } else {
          toast.warning(`Auto-fix applied, but errors remain. Score: ${result.score}`);
          consoleStore.log(
            `⚠ Auto-fix applied, but validation errors remain (Score: ${result.score})`,
            'warning'
          );
          if (result.diagnostics) {
            $diagnostics = result.diagnostics;
          }
        }
      } else {
        // No conversion happened. Check if it's actually valid.
        if (result.valid) {
          toast.info('YAML is already valid');
          consoleStore.log('YAML is already valid', 'info');
        } else {
          toast.warning('Auto-fix could not resolve all issues.');
          consoleStore.log('⚠ Auto-fix could not resolve all issues.', 'warning');
          if (result.diagnostics) {
            $diagnostics = result.diagnostics;
            // Log errors
            result.diagnostics.forEach((d: any) => {
              if (d.severity === 'CRITICAL') {
                consoleStore.log(`  ✗ ${d.message}`, 'error');
              }
            });
          }
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      consoleStore.log(`✗ Auto-fix failed: ${errorMessage}`, 'error');
      toast.error(`Auto-fix failed: ${errorMessage}`);
    }
  }

  // Handle code validation
  async function handleValidateCode() {
    if (!$generated.typescript && !$generated.python && !$generated.go && !$generated.rust) {
      toast.error('No generated code to validate. Generate code first.');
      return;
    }

    isValidatingCode = true;
    consoleStore.log('Validating generated code...', 'info');

    try {
      const response = await fetch('/api/validate-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          typescript: $generated.typescript,
          python: $generated.python,
          go: $generated.go,
          rust: $generated.rust,
        }),
      });

      if (!response.ok) {
        throw new Error(`Code validation failed: ${response.statusText}`);
      }

      const result: any = await response.json();

      // Validate each language sequentially and log immediately
      let hasErrors = false;
      const languages = ['typescript', 'python', 'go', 'rust'];

      for (const lang of languages) {
        if (result[lang]) {
          const v = result[lang] as { valid: boolean; errors?: any[] };
          if (v.valid) {
            consoleStore.log(`✓ ${lang}: Valid and compiles correctly`, 'success');
          } else {
            hasErrors = true;
            consoleStore.log(`${lang}: Compilation errors found`, 'error');
            if (v.errors) {
              v.errors.forEach((err: any) => {
                consoleStore.log(`  Line ${err.line || '?'}: ${err.message}`, 'error');
              });
            }
          }
        }
      }

      // Show duration
      if (result.durationMs) {
        consoleStore.log(`Validation completed in ${result.durationMs}ms`, 'info');
      }

      if (hasErrors) {
        toast.error('Some generated code has compilation errors');
      } else {
        toast.success('All generated code validates successfully!');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      consoleStore.log(`Code validation failed: ${errorMessage}`, 'error');
      toast.error(`Code validation failed: ${errorMessage}`);
    } finally {
      isValidatingCode = false;
    }
  }

  // Handle generation
  async function handleGenerate() {
    isGenerating = true;
    consoleStore.log('Starting code generation...', 'info');
    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ yaml: $spec }),
      });

      if (!response.ok) {
        throw new Error(`Generation failed: ${response.statusText}`);
      }

      const result = await response.json();

      // Update generated code store
      $generated = {
        typescript: result.typescript,
        python: result.python,
        go: result.go,
        rust: result.rust,
      };

      consoleStore.log(`✓ Code generated in ${result.generationTimeMs}ms`, 'success');
      if ($currentTheme === 'halloween') {
        toast.success(`Creature resurrected in ${result.generationTimeMs}ms 🧟`);
      } else {
        toast.success(`Code generated in ${result.generationTimeMs}ms`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      consoleStore.log(`✗ Generation failed: ${errorMessage}`, 'error');
      toast.error(`Generation failed: ${errorMessage}`);
    } finally {
      isGenerating = false;
    }
  }

  // Handle validation
  async function handleValidate() {
    isValidating = true;
    consoleStore.log('Starting validation...', 'info');
    try {
      await handleValidation($spec);
      if ($diagnostics.length === 0) {
        consoleStore.log('✓ Validation successful', 'success');
      } else {
        consoleStore.log(`✗ Found ${$diagnostics.length} validation error(s)`, 'error');
      }
    } finally {
      isValidating = false;
    }
  }

  // Handle Scenario Selection
  function handleRunPBT() {
    // Open scenario selection modal
    scenarioModalOpen = true;
  }
  async function handleSelectScenario(preset: Preset) {
    // Load the preset
    await handleLoadPreset(preset.yamlFile);

    // Minimize console FIRST
    $layout.rightTopHeight = 90;

    // Wait before switching to topology view
    setTimeout(() => {
      selectedLanguage = 'topology';
    }, 600);

    // Trigger auto-start simulation after switch completes
    autoStartSimulation = false; // Reset first
    setTimeout(() => {
      autoStartSimulation = true;
    }, 1100); // 600ms (switch) + 500ms (buffer)
  }

  // Handle protocol discovery
  async function handleDiscover(host: string, port: number) {
    isDiscovering = true;
    discovery.setDiscovering(true);
    consoleStore.log(`Starting protocol discovery on ${host}:${port}...`, 'info');

    // Switch to discovery view
    activeView = 'discovery';

    try {
      const response = await fetch('/api/discover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ host, port }),
      });

      if (!response.ok) {
        throw new Error(`Discovery failed: ${response.statusText}`);
      }

      const result = await response.json();
      discovery.setResult(result);

      if (result.packets) {
        $timeline = result.packets;
        consoleStore.log(`  - Captured ${result.packets.length} packets`, 'info');
      }

      if (result.identified) {
        consoleStore.log(`✓ Protocol identified: ${result.identified.protocol}`, 'success');
        toast.success(`Protocol identified: ${result.identified.protocol}`);
      } else {
        consoleStore.log('✗ Protocol could not be identified', 'warning');
        toast.info('Protocol could not be identified');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      discovery.setError(errorMessage);
      consoleStore.log(`✗ Discovery failed: ${errorMessage}`, 'error');
      toast.error(`Discovery failed: ${errorMessage}`);
    } finally {
      isDiscovering = false;
      discovery.setDiscovering(false);
    }
  }

  // Handle code download
  async function handleDownloadCode(language: string) {
    // Special case: download all languages as SDK zip
    if (language === 'all') {
      try {
        const response = await fetch('/api/download-sdk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: $generated }),
        });

        if (!response.ok) {
          toast.error('Failed to generate SDK zip');
          return;
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'protocol-sdk.zip';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);

        toast.success('SDK zip downloaded!');
      } catch (error) {
        console.error('SDK download error:', error);
        toast.error('Failed to download SDK');
      }
      return;
    }

    // Single language download (existing code)
    const code = $generated[language as keyof typeof $generated];

    if (!code) {
      toast.error(`No ${language} code available. Generate code first.`);
      return;
    }

    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `parser.${language === 'typescript' ? 'ts' : language === 'python' ? 'py' : language === 'go' ? 'go' : 'rs'}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    consoleStore.log(`✓ Downloaded ${language} code`, 'success');
    toast.success(`Downloaded ${language} code`);
  }

  function checkViewport() {
    // No longer needed for new layout
  }

  function handleResetLayout() {
    resetLayout();
    toast.success('Layout reset to default');
  }

  onMount(() => {
    // Register keyboard shortcuts
    keyboardManager.register({
      key: 's',
      ctrl: true,
      handler: handleValidate,
      description: 'Validate specification',
    });

    keyboardManager.register({
      key: 'g',
      ctrl: true,
      handler: handleGenerate,
      description: 'Generate code',
    });

    keyboardManager.start();

    // Fetch initial fingerprints
    fetch('/api/fingerprints')
      .then((res) => res.json())
      .then((data) => discovery.setFingerprints(data))
      .catch((err) => console.error('Failed to load fingerprints:', err));

    // Fetch steering documents
    steering.setLoading(true);
    fetch('/api/steering')
      .then((res) => res.json())
      .then((data) => steering.setDocuments(data.documents))
      .catch((err) => {
        console.error('Failed to load steering documents:', err);
        steering.setError(err.message);
      })
      .finally(() => steering.setLoading(false));

    return () => {
      keyboardManager.stop();
    };
  });

  onDestroy(() => {
    keyboardManager.stop();
  });
</script>

<ErrorBoundary fallback="The workbench encountered an error">
  <ToastContainer />

  {#if $isMobile}
    <!-- Mobile Layout: Single pane with bottom navigation -->
    <div
      class="h-screen flex flex-col bg-[#F8FAFC] dark:bg-slate-900 text-slate-900 dark:text-gray-100"
    >
      <!-- Toolbar -->
      <div class="flex-none z-10">
        <Toolbar
          onValidate={handleValidate}
          onGenerate={handleGenerate}
          onGenerateDocs={handleGenerateDocs}
          onRunPBT={handleRunPBT}
          onDiscover={handleDiscover}
          onLoadPreset={handleLoadPreset}
          onResetLayout={handleResetLayout}
          onLoadExample={(name: string) => {
            spec.loadExample(name as 'demo' | 'gopher' | 'finger');
            consoleStore.log(`Loaded ${name} example`, 'success');
            toast.success(`Loaded ${name} example`);
          }}
          onDownloadCode={handleDownloadCode}
          {isValidating}
          {isGenerating}
          isGeneratingDocs={$documentation.isGenerating}
          {isRunningPBT}
          isDiscovering={$discovery.isDiscovering}
          canGenerate={$diagnostics.length === 0}
        />
      </div>

      <!-- Mobile Content: Only show active tab -->
      <div class="flex-1 overflow-hidden pb-16">
        {#if $mobileLayout.activeTab === 'editor'}
          <div class="h-full touch-pan-y" style="touch-action: pan-y;">
            <Editor
              value={$spec}
              diagnostics={$diagnostics}
              onchange={handleEditorChange}
              onvalidate={handleValidation}
            />
          </div>
        {:else if $mobileLayout.activeTab === 'output'}
          <div class="h-full overflow-auto">
            <CodeViewer
              code={$generated}
              {activeNode}
              bind:selectedLanguage
              protocolName={$spec.includes('Binary')
                ? 'iot'
                : $spec.includes('COBOL')
                  ? 'banking'
                  : 'chat'}
              onsimulationend={() => {
                autoStartSimulation = false;
              }}
              {autoStartSimulation}
            />
          </div>
        {:else if $mobileLayout.activeTab === 'console'}
          <div class="h-full">
            <Console logs={$formattedLogs} />
          </div>
        {/if}
      </div>

      <!-- Bottom Navigation -->
      <BottomNavigation />
    </div>
  {:else}
    <!-- Desktop Layout: Three-pane split (existing layout) -->
    <div
      class="workbench h-screen flex flex-col bg-[#F8FAFC] dark:bg-slate-900 text-slate-900 dark:text-gray-100 overflow-hidden"
    >
      <!-- Toolbar -->
      <div class="flex-none z-10">
        <Toolbar
          onValidate={handleValidate}
          onGenerate={handleGenerate}
          onGenerateDocs={handleGenerateDocs}
          onRunPBT={handleRunPBT}
          onDiscover={handleDiscover}
          onLoadPreset={handleLoadPreset}
          onResetLayout={handleResetLayout}
          onLoadExample={(name: string) => {
            spec.loadExample(name as 'demo' | 'gopher' | 'finger');
            consoleStore.log(`Loaded ${name} example`, 'success');
            toast.success(`Loaded ${name} example`);
          }}
          onDownloadCode={handleDownloadCode}
          {isValidating}
          {isGenerating}
          isGeneratingDocs={$documentation.isGenerating}
          {isRunningPBT}
          isDiscovering={$discovery.isDiscovering}
          canGenerate={$diagnostics.length === 0}
        />
      </div>

      <!-- Main Content Area -->
      <div class="flex flex-1 min-h-0 bg-[#F8FAFC] dark:bg-slate-900">
        <!-- Activity Bar -->
        <div class="flex-none z-10">
          <ActivityBar {activeView} on:change={handleViewChange} />
        </div>

        <!-- View Content -->
        <SplitPane direction="vertical" bind:size={$layout.rightTopHeight}>
          {#snippet first()}
            {#if activeView === 'editor'}
              <SplitPane direction="horizontal" bind:size={$layout.leftWidth}>
                {#snippet first()}
                  <div class="h-full flex flex-col">
                    <!-- YAML Editor Header - Modern & Stylish -->
                    <div class="flex-none px-6 py-3 panel-header-left border-b shadow-sm">
                      <div class="flex items-center gap-3">
                        <div
                          class="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-500 dark:bg-blue-600 shadow-md"
                        >
                          <svg
                            class="w-5 h-5 text-white"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              stroke-linecap="round"
                              stroke-linejoin="round"
                              stroke-width="2"
                              d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
                            />
                          </svg>
                        </div>
                        <div class="flex-1">
                          <h3
                            class="text-sm font-bold text-gray-800 dark:text-white tracking-tight"
                          >
                            Protocol Specification
                          </h3>
                          <p class="text-xs text-gray-600 dark:text-gray-300 mt-0.5">
                            Define your protocol in YAML
                          </p>
                        </div>
                        <div class="flex items-center gap-2">
                          <button
                            onclick={handleAutoFix}
                            class="px-2 py-1 text-xs font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-md border border-purple-200 dark:border-purple-700 hover:bg-purple-200 dark:hover:bg-purple-800/40 transition-colors flex items-center gap-1"
                            title="Auto-fix and format YAML"
                          >
                            <svg
                              class="w-3.5 h-3.5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
                              />
                            </svg>
                            Auto-Fix
                          </button>
                          <span
                            class="px-2 py-1 text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-md border border-blue-200 dark:border-blue-700"
                          >
                            YAML
                          </span>
                        </div>
                      </div>
                    </div>
                    <div class="flex-1 overflow-hidden">
                      <Editor
                        value={$spec}
                        diagnostics={$diagnostics}
                        onchange={handleEditorChange}
                        onvalidate={handleValidation}
                      />
                    </div>
                  </div>
                {/snippet}
                {#snippet second()}
                  <div class="h-full flex flex-col">
                    <!-- Code Viewer Header - Matching Style -->
                    <div class="flex-none px-6 py-3 panel-header-right border-b shadow-sm">
                      <div class="flex items-center gap-3">
                        <div
                          class="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-500 dark:bg-emerald-600 shadow-md"
                        >
                          <svg
                            class="w-5 h-5 text-white"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              stroke-linecap="round"
                              stroke-linejoin="round"
                              stroke-width="2"
                              d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                            />
                          </svg>
                        </div>
                        <div class="flex-1">
                          <h3
                            class="text-sm font-bold text-gray-800 dark:text-white tracking-tight"
                          >
                            Generated Code
                          </h3>
                          <p class="text-xs text-gray-600 dark:text-gray-300 mt-0.5">
                            Multi-language implementation
                          </p>
                        </div>
                        <div class="flex items-center gap-2">
                          <button
                            onclick={handleValidateCode}
                            disabled={isValidatingCode ||
                              (!$generated.typescript &&
                                !$generated.python &&
                                !$generated.go &&
                                !$generated.rust)}
                            class="px-2 py-1 text-xs font-medium bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 rounded-md border border-teal-200 dark:border-teal-700 hover:bg-teal-200 dark:hover:bg-teal-800/40 transition-colors flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Validate that generated code compiles correctly"
                          >
                            {#if isValidatingCode}
                              <svg
                                class="w-3.5 h-3.5 animate-spin"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  stroke-linecap="round"
                                  stroke-linejoin="round"
                                  stroke-width="2"
                                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                                />
                              </svg>
                            {:else}
                              <svg
                                class="w-3.5 h-3.5"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  stroke-linecap="round"
                                  stroke-linejoin="round"
                                  stroke-width="2"
                                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                                />
                              </svg>
                            {/if}
                            Validate Code
                          </button>
                        </div>
                      </div>
                    </div>
                    <div class="flex-1 overflow-hidden">
                      <CodeViewer
                        code={$generated}
                        {activeNode}
                        bind:selectedLanguage
                        protocolName={$spec.includes('Binary')
                          ? 'iot'
                          : $spec.includes('COBOL')
                            ? 'banking'
                            : 'chat'}
                        onsimulate={() => {
                          // Capture current log count as start index
                          // Minimize console when simulation starts
                          $layout.rightTopHeight = 90;
                        }}
                        onsimulationend={() => {
                          // Add delay before expanding console for smoother transition
                          setTimeout(() => {
                            $layout.rightTopHeight = 60;

                            // Trigger console replay scroll after expansion
                            setTimeout(() => {
                              if (consoleComponent) {
                                consoleComponent.replayScroll(simulationStartIndex);
                              }
                            }, 300);
                          }, 500);
                          autoStartSimulation = false;
                        }}
                        {autoStartSimulation}
                      />
                    </div>
                  </div>
                {/snippet}
              </SplitPane>
            {:else if activeView === 'discovery'}
              <ProtocolDiscovery />
            {:else if activeView === 'mcp'}
              <MCPServer />
            {:else if activeView === 'docs'}
              <DocumentationViewer />
            {/if}
          {/snippet}
          {#snippet second()}
            <Console bind:this={consoleComponent} logs={$formattedLogs} />
          {/snippet}
        </SplitPane>
      </div>
    </div>
  {/if}
</ErrorBoundary>

<!-- Scenario Modal -->
<ScenarioModal
  isOpen={scenarioModalOpen}
  onClose={() => (scenarioModalOpen = false)}
  onSelectScenario={handleSelectScenario}
/>

<style>
  :global(body) {
    margin: 0;
    padding: 0;
    font-family:
      -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
    overflow: hidden;
  }

  /* Modern Custom Scrollbars */
  :global(*::-webkit-scrollbar) {
    width: 10px;
    height: 10px;
  }

  :global(*::-webkit-scrollbar-track) {
    background: #f1f5f9;
    border-radius: 10px;
  }

  :global(*::-webkit-scrollbar-thumb) {
    background: #cbd5e1;
    border-radius: 10px;
    border: 2px solid #f1f5f9;
  }

  :global(*::-webkit-scrollbar-thumb:hover) {
    background: #94a3b8;
  }

  /* Dark mode scrollbars */
  :global(.dark *::-webkit-scrollbar-track) {
    background: #1e293b;
  }

  :global(.dark *::-webkit-scrollbar-thumb) {
    background: #475569;
    border-color: #1e293b;
  }

  :global(.dark *::-webkit-scrollbar-thumb:hover) {
    background: #64748b;
  }

  /* Firefox scrollbar styling */
  :global(*) {
    scrollbar-width: thin;
    scrollbar-color: #cbd5e1 #f1f5f9;
  }

  :global(.dark *) {
    scrollbar-color: #475569 #1e293b;
  }

  /* Panel Headers - Light Mode */
  .panel-header-left {
    background: linear-gradient(to right, #eff6ff, #eef2ff);
    border-color: #dbeafe;
  }

  .panel-header-right {
    background: linear-gradient(to right, #ecfdf5, #f0fdfa);
    border-color: #d1fae5;
  }

  /* Panel Headers - Dark Mode */
  :global(.dark) .panel-header-left,
  :global([data-mode='dark']) .panel-header-left {
    background: linear-gradient(to right, #1e293b, #334155);
    border-color: #475569;
  }

  :global(.dark) .panel-header-right,
  :global([data-mode='dark']) .panel-header-right {
    background: linear-gradient(to right, #1e293b, #334155);
    border-color: #475569;
  }
</style>
