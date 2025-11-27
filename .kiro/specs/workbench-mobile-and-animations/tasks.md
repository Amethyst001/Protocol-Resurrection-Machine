# Final Execution Plan

## Phase 1: The Mobile Foundation (Layout & Nav)

*Goal: Make the app usable on a phone immediately.*

- [x] 1. Enhanced Layout Store ✅ COMPLETE
  - Create `src/lib/stores/layout.ts` with viewport tracking
  - Implement `isMobile` derived store (width < 768px)
  - Implement `desktopLayout` store (leftPaneWidth, topRightHeight percentages)
  - Implement `mobileLayout` store (activeTab: 'editor' | 'output' | 'console')
  - Add debounced window resize listener (300ms) to update viewport state
  - Add `resetToDesktopDefaults()` and `resetToMobileDefaults()` functions
  - _Requirements: 11.1, 11.2, 12.1, 12.2, 12.3, 12.4_

- [x] 2. Bottom Navigation Component





  - Create `src/lib/components/BottomNavigation.svelte`
  - Add 3 tabs: Editor, Output, Console with SVG icons
  - Style with `fixed bottom-0 left-0 right-0 w-full h-16 z-50`
  - **Constraint:** Ensure each button is at least 60px tall (touch target minimum)
  - Wire up tab clicks to update `$mobileLayout.activeTab`
  - Add `aria-label="Mobile navigation"` to nav
  - Add `aria-current="page"` to active tab button
  - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5_
-

- [x] 3. Conditional Rendering (The Switch)





  - Modify `workbench/src/routes/+page.svelte`
  - Wrap existing desktop layout in `{#if !$isMobile}` block
  - Add mobile layout in `{:else}` block with stacked divs + BottomNavigation
  - Mobile layout: render only active tab content based on `$mobileLayout.activeTab`
  - Desktop layout: keep existing SplitPane structure
  - **Manual Test:** Resize browser < 768px - split panes should vanish, bottom nav should appear
  - _Requirements: 1.1, 1.3, 11.1, 11.2, 11.3, 11.4_

- [x] 4. Mobile Editor Tweaks




  - In `Editor.svelte`: check `$isMobile` from layout store
  - If mobile: set editor height to `calc(100vh - 60px)` (leave room for bottom nav)
  - If mobile: apply `touch-action: pan-y` CSS (vertical scrolling only)
  - If mobile: disable minimap (`minimap: { enabled: false }`)
  - If mobile: disable line numbers (`lineNumbers: "off"`) to save screen space
  - Add touch event handler to prevent horizontal swipes > 50px
  - _Requirements: 3.1, 3.3, 14.1, 14.2, 14.3_

## Phase 2: The Cinematic Topology (The "Wow" Factor)

*Goal: Make the diagram look like a living system.*

- [x] 5. Animation Queue Store ✅ COMPLETE




  - Create `src/lib/stores/animation-queue.ts`
  - Implement `AnimationTask` interface (id, type, nodeId, edgeId, duration, direction)
  - Implement `enqueue(task)` function to add tasks to queue
  - Implement `processQueue()` with async/await for sequential execution
  - **CRITICAL:** Use `requestAnimationFrame` before applying classes to sync with paint
  - Use `await new Promise(r => setTimeout(r, duration))` to enforce sequential playback
  - Implement `clear()` to stop animations when diagram not visible
  - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5_

- [x] 6. Topology Component Refactor




  - Update `TopologyDiagram.svelte`
  - **CRITICAL:** Add `mermaid.initialize({ securityLevel: 'loose', theme: 'base' })` in `onMount`
  - Add `data-node-id` and `data-edge-id` attributes to diagram elements
  - Implement topology-specific animation patterns:
    - **Dendrite:** sensors → gateway → dashboard (fan-in)
    - **Mesh:** client ↔ server (bidirectional)
    - **Pipeline:** stage1 → stage2 → stage3 (sequential)
    - **Generic:** client → server (simple)
  - Add "Simulate Data Flow" button that enqueues animations
  - Add IntersectionObserver to clear queue when diagram not visible
  - Wire up button to call appropriate animation function based on topology type
  - _Requirements: 5.1, 5.2, 5.3, 10.1, 10.2, 10.3, 10.4_
-

- [x] 7. CSS Animation Engine



  - Add to `app.css` or component styles:
  - `@keyframes pulse-glow` for node animations (scale + drop-shadow)
  - `@keyframes edge-flow` for edge animations (stroke-dashoffset)
  - Create `.animate-pulse-glow` class (600ms duration)
  - Create `.animate-edge-flow` class (400ms duration)
  - Add `.reverse` class for backward edge animations
  - Add `will-change: transform, filter` for GPU acceleration
  - Add `transform: translateZ(0)` for GPU layer
  - Implement `@media (prefers-reduced-motion: reduce)` to disable animations
  - _Requirements: 5.2, 6.1, 6.2, 7.1, 7.2, 7.5_

## Phase 3: Robust Documentation (The Polish)

*Goal: Ensure the "Download SDK" button delivers working code.*
-

- [x] 8. README Generator Fallbacks




  - Update documentation generator (likely in `src/lib/documentation/`)
  - Implement `getPortWithFallback(spec)` function:
    - Return spec.protocol.port if defined
    - Infer from protocol name (gopher→70, finger→79, etc.)
    - Default to 'N/A' if unknown
  - Implement `getTransportWithFallback(spec)` function:
    - Return spec.connection.type if defined
    - Default to 'TCP'
  - Implement `getDescriptionWithFallback(spec)` function:
    - Return spec.protocol.description if defined
    - Generate from protocol name: "A generated SDK for the {name} protocol"
  - Update all README templates to use fallback functions
  - **Ensure no `undefined` strings ever reach the output**
  - _Requirements: 16.1, 16.5, 17.1, 17.2, 17.3_
-

- [x] 9. Package Name Sanitizer






  - Create `sanitizePackageName(protocolName)` utility function
  - Logic:
    - Convert to lowercase
    - Replace spaces with hyphens
    - Remove special characters (keep only a-z, 0-9, -)
    - Remove leading/trailing hyphens
    - Collapse multiple hyphens to single
  - Apply to all package manager commands in README templates:
    - npm: `npm install @prm/generated-{sanitized}`
    - pip: `pip install prm-{sanitized}`
    - go: `go get github.com/prm/generated/{sanitized}`
    - cargo: `cargo add prm-{sanitized}`
  - _Requirements: 16.2, 16.3, 16.4, 18.1, 18.2, 18.3, 18.4, 18.5_
-

- [x] 10. Complete README Sections




  - Ensure all referenced sections exist in generated README
  - Generate API Reference section (placeholder if code not ready: "See generated code")
  - Generate Examples section with code snippets for all 4 languages
  - Validate that internal links `[Link](#anchor)` actually point to existing headers
  - Add placeholder text for empty sections ("Coming soon" or "See generated code")
  - Generate TypeScript example with proper imports and type annotations
  - Generate Python example with proper imports and type hints
  - Generate Go example with proper package imports and error handling
  - Generate Rust example with proper use statements and Result types
  - _Requirements: 19.1, 19.2, 19.3, 19.4, 19.5, 20.1, 20.2, 20.3, 20.4, 20.5_

## Phase 4: Final Integration & Polish

*Goal: Polish the UI and verify everything works.*

- [x] 11. Responsive Toolbar & Console




- [ ] 11. Responsive Toolbar & Console
  - Make toolbar responsive with Tailwind utilities
  - Add overflow menu for actions that don't fit on mobile
  - Add touch states to toolbar buttons (active, hover)
  - Optimize console for mobile:
    - Appropriate font size and line wrapping
    - Smooth scrolling with auto-scroll to latest
    - Collapse button or swipe gesture to minimize
  - Apply consistent Tailwind breakpoints (sm:, md:, lg:)
  - Verify all touch targets meet 44x44px minimum
  - _Requirements: 2.1, 2.2, 2.3, 8.1, 8.2, 9.1, 9.5_

- [ ] 12. Final Manual Verification
  - **Mobile Check:** Open DevTools → Device Mode → iPhone SE
    - Can you switch tabs?
    - Is the code readable?
    - Does the editor scroll vertically without getting trapped?
    - Are all buttons easy to tap (not too small)?
  - **Simulation Check:** Load "Demo Chat" protocol
    - Click "Simulate Data Flow"
    - Do nodes glow in order? (Client → Server → Client)
    - Do edges animate between nodes?
    - Does the animation look smooth (no jank)?
  - **README Check:** Click "Download SDK"
    - Open README.md
    - Are there any 'undefined' words? (Search for "undefined")
    - Are npm/pip/go/cargo install commands valid (no spaces in package names)?
    - Do all internal links work when clicked?
    - Are there code examples for TypeScript, Python, Go, and Rust?
  - _Requirements: All requirements validated through manual testing_
