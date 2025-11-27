# Design Document

## Overview

The Protocol Resurrection Machine Phase 2 (PRM-P2) represents a comprehensive evolution from a YAML-to-Code generator into a Universal Protocol Generation and Validation Engine. This phase addresses critical technical debt (14 parser test failures), introduces multi-language code generation with idiomatic output, implements an MCP server for protocol-as-a-service capabilities, provides a modern SvelteKit-based web workbench, enhances property-based testing with constraint solving, enables dynamic protocol discovery, and ensures documentation synchronization.

The architecture maintains the existing PRM foundation while adding new layers for multi-language support, MCP integration, web UI, and advanced testing. The system demonstrates Kiro's capabilities in meta-programming, language-agnostic code generation, and intelligent protocol handling.

Key architectural principles:
- **Language Agnostic Core**: Protocol specifications remain language-independent
- **Pluggable Code Generators**: Each language has its own generator with steering documents
- **Service-Oriented**: MCP server exposes protocols as callable tools
- **Real-Time Feedback**: Web workbench provides instant validation and preview
- **Constraint-Based Testing**: Advanced PBT with multi-constraint arbitraries
- **Protocol Intelligence**: Fingerprinting and discovery capabilities

## Architecture

### System Layers (Updated)

```
┌─────────────────────────────────────────────────────────────────┐
│                    User Interface Layer                          │
│  (CLI, SvelteKit Web Workbench, Generated Protocol UIs)        │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    MCP Server Layer (NEW)                        │
│  (Protocol Tools, JSON Schemas, Tool Registry)                  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│              Orchestration & Control Layer                       │
│  (Generation Pipeline, Multi-Language Coordinator)              │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│           Multi-Language Code Generation Layer (NEW)             │
│  (TypeScript, Python, Go, Rust Generators + Steering)          │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│              Specification Processing Layer                      │
│  (YAML Parser, Validator, State Machine Parser Gen)            │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│           Advanced Testing Layer (NEW)                           │
│  (Constraint Solver, Multi-Constraint Arbitraries)             │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│           Protocol Discovery Layer (NEW)                         │
│  (Fingerprinting, Probing, Signature Database)                 │
└─────────────────────────────────────────────────────────────────┘
```

### Data Flow (Phase 2)

```
YAML Protocol Spec
       ↓
   [Validation]
       ↓
  Internal AST
       ↓
[Multi-Language Generation]
       ↓
TypeScript, Python, Go, Rust Artifacts
       ↓
[MCP Server Generation]
       ↓
MCP Tools + JSON Schemas
       ↓
[Documentation Sync]
       ↓
Versioned, Interactive Docs
```


## Components and Interfaces

### 1. State Machine Parser Generator (Enhanced)

**Purpose**: Generate robust parsers using explicit state machines instead of string manipulation.

**Interface**:
```typescript
interface StateMachineParserGenerator {
  generateParser(spec: ProtocolSpec, language: TargetLanguage): string;
  analyzeFormatString(format: string): StateMachine;
  generateStateTransitions(sm: StateMachine, language: TargetLanguage): string;
}

interface StateMachine {
  states: State[];
  transitions: Transition[];
  initialState: string;
  acceptStates: string[];
}

interface State {
  name: string;
  type: 'fixed_string' | 'field_extraction' | 'delimiter' | 'optional';
  data?: any;
}

interface Transition {
  from: string;
  to: string;
  condition: string;
  action?: string;
}
```

**Responsibilities**:
- Analyze format strings to determine parsing strategy
- Generate state machines for complex format patterns
- Handle fixed strings, delimiters, optional fields, and field extraction
- Generate language-specific state machine implementations
- Provide detailed error reporting with state context

**State Machine Example**:
For format string `"{type}{display}\t{selector}\t{host}\t{port}\r\n"`:
```
States:
1. INIT → extract type (1 char)
2. EXTRACT_DISPLAY → extract until \t
3. EXPECT_TAB_1 → validate \t
4. EXTRACT_SELECTOR → extract until \t
5. EXPECT_TAB_2 → validate \t
6. EXTRACT_HOST → extract until \t
7. EXPECT_TAB_3 → validate \t
8. EXTRACT_PORT → extract until \r\n
9. EXPECT_CRLF → validate \r\n
10. ACCEPT → parsing complete
```


### 2. Multi-Language Code Generator

**Purpose**: Generate idiomatic protocol implementations in TypeScript, Python, Go, and Rust.

**Interface**:
```typescript
interface MultiLanguageGenerator {
  generate(spec: ProtocolSpec, languages: TargetLanguage[]): LanguageArtifacts;
  loadSteering(language: TargetLanguage): SteeringDocument;
  applyIdioms(code: AST, steering: SteeringDocument): AST;
}

interface LanguageArtifacts {
  typescript?: GeneratedCode;
  python?: GeneratedCode;
  go?: GeneratedCode;
  rust?: GeneratedCode;
}

interface GeneratedCode {
  parser: string;
  serializer: string;
  client: string;
  types: string;
  tests: string;
  generationTimeMs: number;
}

interface SteeringDocument {
  language: TargetLanguage;
  namingConvention: 'camelCase' | 'snake_case' | 'PascalCase';
  errorHandling: 'exceptions' | 'result_types' | 'error_returns';
  asyncPattern: 'promises' | 'async_await' | 'callbacks';
  idioms: LanguageIdiom[];
}

interface LanguageIdiom {
  pattern: string;
  replacement: string;
  condition?: string;
}
```

**Language-Specific Generators**:

**TypeScript Generator**:
- Uses interfaces for message types
- Promise-based async operations
- Throws typed Error subclasses
- camelCase naming
- JSDoc comments

**Python Generator**:
- Uses dataclasses for message types
- async/await for async operations
- Raises Exception subclasses
- snake_case naming
- Type hints with typing module

**Go Generator**:
- Uses structs for message types
- Error return values
- defer for cleanup
- PascalCase for exports, camelCase for private
- Godoc comments

**Rust Generator**:
- Uses structs and enums for message types
- Result<T, E> for error handling
- Ownership and borrowing patterns
- snake_case naming
- Rustdoc comments


### 3. MCP Server Generator

**Purpose**: Generate MCP servers that expose protocol operations as callable tools.

**Interface**:
```typescript
interface MCPServerGenerator {
  generateServer(protocols: ProtocolSpec[]): MCPServerCode;
  generateToolSchema(messageType: MessageType): JSONSchema;
  generateToolHandler(messageType: MessageType, protocol: ProtocolSpec): string;
  generateMCPConfig(protocols: ProtocolSpec[]): MCPConfig;
}

interface MCPServerCode {
  server: string;  // Main MCP server implementation
  tools: MCPTool[];
  config: MCPConfig;
}

interface MCPTool {
  name: string;  // e.g., "gopher_query", "finger_lookup"
  description: string;
  inputSchema: JSONSchema;
  handler: string;  // Function implementation
}

interface MCPConfig {
  mcpServers: {
    [serverName: string]: {
      command: string;
      args: string[];
      env?: Record<string, string>;
      disabled?: boolean;
      autoApprove?: string[];
    };
  };
}

interface JSONSchema {
  type: string;
  properties: Record<string, any>;
  required: string[];
  additionalProperties?: boolean;
}
```

**MCP Tool Naming Convention**:
- Format: `{protocol}_{operation}`
- Examples: `gopher_query`, `finger_lookup`, `pop3_list_messages`

**Tool Schema Generation**:
For a Gopher query message:
```json
{
  "type": "object",
  "properties": {
    "selector": {
      "type": "string",
      "description": "The Gopher selector path to query"
    },
    "host": {
      "type": "string",
      "description": "The Gopher server hostname"
    },
    "port": {
      "type": "number",
      "default": 70,
      "description": "The Gopher server port"
    }
  },
  "required": ["selector", "host"]
}
```


### 4. SvelteKit Web Workbench

**Purpose**: Provide a modern web-based IDE for protocol specification creation and testing.

**Architecture**:
```
workbench/
├── src/
│   ├── routes/
│   │   ├── +page.svelte              # Main workbench UI
│   │   ├── +layout.svelte            # App layout with theme
│   │   └── api/
│   │       ├── validate/+server.ts   # POST /api/validate
│   │       ├── generate/+server.ts   # POST /api/generate
│   │       ├── test/
│   │       │   └── pbt/+server.ts    # POST /api/test/pbt
│   │       └── discover/+server.ts   # POST /api/discover
│   ├── lib/
│   │   ├── components/
│   │   │   ├── Editor.svelte         # CodeMirror YAML editor
│   │   │   ├── CodeViewer.svelte     # Multi-language code display
│   │   │   ├── Console.svelte        # Log output panel
│   │   │   ├── PBTResults.svelte     # Property test results
│   │   │   ├── Timeline.svelte       # Packet timeline visualizer
│   │   │   ├── Toolbar.svelte        # Action buttons
│   │   │   ├── StatusBar.svelte      # Performance metrics
│   │   │   ├── ASTViewer.svelte      # AST tree view
│   │   │   └── ThemeToggle.svelte    # Light/dark mode
│   │   ├── stores/
│   │   │   ├── spec.ts               # Current YAML spec
│   │   │   ├── diagnostics.ts        # Validation errors
│   │   │   ├── generated.ts          # Generated code
│   │   │   ├── pbtResults.ts         # Test results
│   │   │   ├── timeline.ts           # Discovery packets
│   │   │   └── theme.ts              # UI theme
│   │   └── utils/
│   │       ├── api.ts                # API client functions
│   │       ├── debounce.ts           # Debouncing utility
│   │       └── diff.ts               # Diff generation
│   └── app.css                       # Tailwind imports
└── tailwind.config.js                # Tailwind configuration
```

**Component Interfaces**:

**Editor Component**:
```typescript
interface EditorProps {
  value: string;
  diagnostics: Diagnostic[];
  onchange: (value: string) => void;
  autocomplete: AutocompleteProvider;
}

interface Diagnostic {
  line: number;
  column: number;
  severity: 'error' | 'warning' | 'info';
  message: string;
}

interface AutocompleteProvider {
  getSuggestions(context: EditorContext): Suggestion[];
}
```

**CodeViewer Component**:
```typescript
interface CodeViewerProps {
  code: LanguageArtifacts;
  selectedLanguage: TargetLanguage;
  showDiff: boolean;
  previousCode?: LanguageArtifacts;
}
```

**Timeline Component**:
```typescript
interface TimelineProps {
  packets: Packet[];
  onPacketClick: (packet: Packet) => void;
}

interface Packet {
  direction: 'sent' | 'received';
  timestamp: string;
  length: number;
  hex: string;
  parsed?: ParsedMessage;
  error?: string;
}
```


### 5. Constraint Solver for Test Generation

**Purpose**: Generate test data that satisfies multiple orthogonal constraints simultaneously.

**Interface**:
```typescript
interface ConstraintSolver {
  solve(constraints: Constraint[]): ArbitraryGenerator;
  validate(value: any, constraints: Constraint[]): ValidationResult;
  findCounterexample(constraints: Constraint[]): any | null;
}

interface Constraint {
  type: 'minLength' | 'maxLength' | 'pattern' | 'min' | 'max' | 'enum' | 'custom';
  value: any;
  field?: string;
}

interface ArbitraryGenerator {
  generate(): any;
  shrink(value: any): any[];
}
```

**Constraint Solving Strategy**:

1. **Regex Pattern Constraints**: Use regex-based string generation
2. **Numeric Range Constraints**: Generate within [min, max] with boundary values
3. **Length Constraints**: Ensure string/array length satisfies min/max
4. **Enum Constraints**: Select from valid values
5. **Custom Constraints**: Execute custom validation functions

**Multi-Constraint Example**:
```typescript
// Field with multiple constraints:
// - minLength: 5
// - maxLength: 20
// - pattern: ^[a-z]+$
// - custom: must not contain "test"

const constraints = [
  { type: 'minLength', value: 5 },
  { type: 'maxLength', value: 20 },
  { type: 'pattern', value: '^[a-z]+$' },
  { type: 'custom', value: (s) => !s.includes('test') }
];

const generator = solver.solve(constraints);
// Generates: "abcdefgh", "quickfox", "jumpsover", etc.
// Never generates: "test", "abc" (too short), "ABC" (uppercase), etc.
```

**Constraint Conflict Detection**:
```typescript
// Conflicting constraints:
// - minLength: 10
// - maxLength: 5  // CONFLICT!

solver.solve([
  { type: 'minLength', value: 10 },
  { type: 'maxLength', value: 5 }
]);
// Throws: ConstraintConflictError("minLength (10) > maxLength (5)")
```


### 6. Protocol Discovery Engine

**Purpose**: Identify unknown protocols through fingerprinting and probing.

**Interface**:
```typescript
interface ProtocolDiscoveryEngine {
  discover(host: string, port: number): DiscoveryResult;
  generateFingerprint(spec: ProtocolSpec): ProtocolFingerprint;
  matchFingerprint(observed: ProtocolSignature): MatchResult[];
  probe(host: string, port: number, probes: Probe[]): ProbeResult[];
}

interface DiscoveryResult {
  packets: Packet[];
  identified: MatchResult | null;
  confidence: number;
  suggestions: string[];
}

interface ProtocolFingerprint {
  protocol: string;
  defaultPort: number;
  initialHandshake?: string;
  responsePatterns: Pattern[];
  probes: Probe[];
}

interface ProtocolSignature {
  port: number;
  initialResponse?: Buffer;
  responseToProbes: Map<string, Buffer>;
  timing: TimingInfo;
}

interface Probe {
  name: string;
  data: Buffer;
  expectedResponse?: Pattern;
}

interface Pattern {
  type: 'exact' | 'prefix' | 'regex' | 'length';
  value: any;
}

interface MatchResult {
  protocol: string;
  confidence: number;  // 0.0 to 1.0
  matchedFeatures: string[];
  specPath: string;
}
```

**Fingerprint Database**:
```typescript
interface FingerprintDatabase {
  fingerprints: Map<string, ProtocolFingerprint>;
  
  add(fingerprint: ProtocolFingerprint): void;
  query(signature: ProtocolSignature): MatchResult[];
  update(protocol: string, fingerprint: ProtocolFingerprint): void;
}
```

**Discovery Algorithm**:
```
1. Connect to host:port
2. Record initial server response (if any)
3. Send common protocol probes:
   - Empty request
   - CRLF
   - "HELP\r\n"
   - Protocol-specific probes from database
4. Record all responses with timing
5. Compare signature against fingerprint database
6. Calculate confidence scores
7. Return top matches with confidence > 0.5
```

**Confidence Scoring**:
```typescript
function calculateConfidence(
  observed: ProtocolSignature,
  fingerprint: ProtocolFingerprint
): number {
  let score = 0.0;
  let maxScore = 0.0;
  
  // Port match (weight: 0.3)
  maxScore += 0.3;
  if (observed.port === fingerprint.defaultPort) {
    score += 0.3;
  }
  
  // Initial handshake match (weight: 0.4)
  if (fingerprint.initialHandshake) {
    maxScore += 0.4;
    if (matchesPattern(observed.initialResponse, fingerprint.initialHandshake)) {
      score += 0.4;
    }
  }
  
  // Probe response matches (weight: 0.3)
  maxScore += 0.3;
  const probeMatches = fingerprint.probes.filter(probe =>
    matchesPattern(observed.responseToProbes.get(probe.name), probe.expectedResponse)
  );
  score += (probeMatches.length / fingerprint.probes.length) * 0.3;
  
  return score / maxScore;
}
```


### 7. Documentation Synchronization Engine

**Purpose**: Automatically generate and update documentation when specifications or code change.

**Interface**:
```typescript
interface DocumentationSyncEngine {
  generate(spec: ProtocolSpec, kiroSpecs: KiroSpecSet): Documentation;
  detectChanges(oldSpec: ProtocolSpec, newSpec: ProtocolSpec): ChangeSet;
  updateDocumentation(doc: Documentation, changes: ChangeSet): Documentation;
  generateChangelog(changes: ChangeSet): string;
}

interface Documentation {
  readme: string;
  apiReference: string;
  examples: Example[];
  changelog: ChangelogEntry[];
  version: string;
  interactive: InteractiveDoc[];
}

interface ChangeSet {
  added: Change[];
  modified: Change[];
  removed: Change[];
}

interface Change {
  type: 'message_type' | 'field' | 'constraint' | 'connection';
  path: string;
  oldValue?: any;
  newValue?: any;
}

interface Example {
  language: TargetLanguage;
  title: string;
  description: string;
  code: string;
  runnable: boolean;
}

interface InteractiveDoc {
  section: string;
  examples: RunnableExample[];
}

interface RunnableExample {
  code: string;
  language: TargetLanguage;
  execute: () => Promise<ExecutionResult>;
}
```

**Documentation Generation Strategy**:

1. **Extract from Kiro Specs**:
   - User stories from requirements.md
   - Architecture diagrams from design.md
   - Implementation status from tasks.md

2. **Generate API Reference**:
   - Parse generated code AST
   - Extract public functions, types, interfaces
   - Generate markdown documentation

3. **Create Examples**:
   - Generate example code for each message type
   - Include connection setup, message sending, response handling
   - Provide examples in all supported languages

4. **Version Control**:
   - Semantic versioning based on changes
   - Major: Breaking changes (removed fields, changed types)
   - Minor: New features (new message types, new fields)
   - Patch: Bug fixes, documentation updates

5. **Interactive Examples**:
   - Embed runnable code snippets
   - Connect to live protocol servers (if available)
   - Display execution results inline


## Data Models

### Extended Protocol Specification

```typescript
// Extends Phase 1 ProtocolSpec
interface ProtocolSpecV2 extends ProtocolSpec {
  version: string;
  fingerprint?: ProtocolFingerprint;
  mcpTools?: MCPToolConfig[];
  targetLanguages?: TargetLanguage[];
  documentation?: DocumentationConfig;
}

interface MCPToolConfig {
  name: string;
  messageType: string;
  description: string;
  autoApprove: boolean;
}

interface DocumentationConfig {
  includeExamples: boolean;
  includeInteractive: boolean;
  languages: TargetLanguage[];
}

type TargetLanguage = 'typescript' | 'python' | 'go' | 'rust';
```

### State Machine Representation

```typescript
interface ParseStateMachine {
  states: Map<string, ParseState>;
  transitions: Transition[];
  initialState: string;
  errorState: string;
}

interface ParseState {
  id: string;
  type: StateType;
  action?: StateAction;
  isAccepting: boolean;
}

type StateType = 
  | 'INIT'
  | 'EXPECT_FIXED'
  | 'EXTRACT_FIELD'
  | 'EXPECT_DELIMITER'
  | 'OPTIONAL_FIELD'
  | 'ACCEPT'
  | 'ERROR';

interface StateAction {
  type: 'validate' | 'extract' | 'convert';
  target?: string;  // Field name for extraction
  expected?: string;  // Expected value for validation
  converter?: (value: string) => any;
}
```

### MCP Server Data Models

```typescript
interface MCPServerDefinition {
  name: string;
  version: string;
  protocols: ProtocolDefinition[];
  tools: MCPToolDefinition[];
}

interface ProtocolDefinition {
  name: string;
  spec: ProtocolSpec;
  client: ProtocolClient;
  parser: ProtocolParser;
  serializer: ProtocolSerializer;
}

interface MCPToolDefinition {
  name: string;
  description: string;
  inputSchema: JSONSchema;
  outputSchema: JSONSchema;
  handler: ToolHandler;
}

type ToolHandler = (input: any) => Promise<ToolResult>;

interface ToolResult {
  success: boolean;
  data?: any;
  error?: MCPError;
}

interface MCPError {
  code: string;
  message: string;
  details?: any;
}
```

### Workbench API Models

```typescript
// POST /api/validate
interface ValidateRequest {
  yaml: string;
}

interface ValidateResponse {
  diagnostics: Diagnostic[];
  ast?: ProtocolSpec;
}

// POST /api/generate
interface GenerateRequest {
  yaml: string;
  languages: TargetLanguage[];
  includeDiff: boolean;
}

interface GenerateResponse {
  typescript?: string;
  python?: string;
  go?: string;
  rust?: string;
  diff?: string;
  generationTimeMs: number;
  errors?: string[];
}

// POST /api/test/pbt
interface PBTRequest {
  yaml: string;
  iterations?: number;
}

interface PBTResponse {
  iterations: number;
  failures: number;
  counterexample?: any;
  shrinkTrace?: any[];
  durationMs: number;
  properties: PropertyResult[];
}

interface PropertyResult {
  name: string;
  passed: boolean;
  iterations: number;
  counterexample?: any;
}

// POST /api/discover
interface DiscoverRequest {
  host: string;
  port: number;
  timeout?: number;
}

interface DiscoverResponse {
  packets: Packet[];
  identified?: {
    protocol: string;
    confidence: number;
    specPath: string;
  };
  suggestions: string[];
}
```


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Acceptance Criteria Testing Prework

**1.1 State Machine Parser - Fixed Strings**
Thoughts: This is about ensuring parsers correctly validate exact byte sequences. We can generate random format strings with fixed strings, generate parsers, and verify they reject inputs that don't match the fixed strings.
Testable: yes - property

**1.2 State Machine Parser - Delimiters**
Thoughts: This is about field extraction using delimiters. We can generate random format strings with delimiters, create test messages, and verify all fields are extracted correctly.
Testable: yes - property

**1.3 State Machine Parser - Mixed Patterns**
Thoughts: This combines fixed strings and placeholders. We can generate complex format strings and verify parsers handle the alternation correctly.
Testable: yes - property

**1.4 State Machine Parser - Optional Fields**
Thoughts: This is about handling presence/absence of optional fields. We can generate messages with and without optional fields and verify parsing succeeds in both cases.
Testable: yes - property

**1.5 State Machine Parser - Error Reporting**
Thoughts: This is about error quality. We can generate malformed inputs and verify errors include state, offset, expected, and actual values.
Testable: yes - property

**2.1-2.5 Parser Test Coverage**
Thoughts: These are about fixing specific test failures. We'll verify all existing tests pass after implementing state machine parsers.
Testable: yes - example (regression tests)

**3.1 MCP Server Generation**
Thoughts: For any protocol spec, we should generate an MCP server. We can verify the server file exists and contains the expected structure.
Testable: yes - property

**3.2 MCP Tool Registration**
Thoughts: For any protocol with N message types, the MCP server should register N tools. We can count tools and verify the count matches.
Testable: yes - property

**3.3 MCP Tool Execution**
Thoughts: For any valid tool input, execution should succeed and return structured results. We can generate random valid inputs and verify execution.
Testable: yes - property

**3.4 MCP Error Handling**
Thoughts: For any invalid input or operation failure, the MCP server should return MCP-compliant errors. We can generate invalid inputs and verify error format.
Testable: yes - property

**4.1 MCP Tool Schema Generation**
Thoughts: For any message type, we should generate a JSON schema. We can verify the schema is valid JSON Schema and describes all fields.
Testable: yes - property

**4.2-4.5 Schema Constraints**
Thoughts: These are about schema accuracy. We can verify required fields, constraints, nested structures, and regeneration all work correctly.
Testable: yes - property

**6.1-6.5 Multi-Language Generation**
Thoughts: For any protocol spec and target language, we should generate code in that language. We can verify generated code compiles and follows language conventions.
Testable: yes - property

**7.1-7.5 Language-Specific Steering**
Thoughts: For any target language, generated code should follow that language's idioms. We can verify naming conventions, error handling patterns, and async patterns match the steering document.
Testable: yes - property

**9.1-9.5 Web Workbench Layout**
Thoughts: These are UI requirements. We can test that the layout renders correctly, but visual appearance isn't fully testable as a property.
Testable: yes - example (UI tests)

**10.1-10.5 Live Validation**
Thoughts: For any YAML input, validation should complete within 500ms and return diagnostics. We can measure timing and verify diagnostic format.
Testable: yes - property

**13.1-13.5 Multi-Constraint Test Generation**
Thoughts: For any field with multiple constraints, the generator should produce values satisfying all constraints. This is a critical property for test quality.
Testable: yes - property

**14.1-14.5 Constraint Solver**
Thoughts: For any set of constraints, the solver should find valid values or report conflicts. We can test with various constraint combinations.
Testable: yes - property

**16.1-16.5 Protocol Discovery**
Thoughts: For any host:port, discovery should connect, probe, and compare against fingerprints. We can test with known protocols and verify identification.
Testable: yes - property

**19.1-19.5 Documentation Sync**
Thoughts: For any spec change, documentation should regenerate and reflect the changes. We can verify documentation content matches the spec.
Testable: yes - property

**46.1-49.5 Workbench API Endpoints**
Thoughts: For any API request, the endpoint should return the expected response format within time limits. We can test all endpoints with various inputs.
Testable: yes - property

### Property Reflection

After analyzing all acceptance criteria, I've identified the following consolidation opportunities:

- **Parser Generation** (1.1-1.5, 2.1-2.5): Can be consolidated into comprehensive parser correctness properties
- **MCP Server** (3.1-3.4, 4.1-4.5): Can be consolidated into MCP server generation and tool execution properties
- **Multi-Language** (6.1-6.5, 7.1-7.5): Can be consolidated into language-specific generation properties
- **Constraint Solving** (13.1-13.5, 14.1-14.5): Can be consolidated into constraint satisfaction properties
- **Discovery** (16.1-16.5): Can be consolidated into protocol identification properties
- **Workbench** (9.1-9.5, 10.1-10.5, 46.1-49.5): Mix of UI tests (examples) and API properties

This consolidation reduces ~100+ potential properties to ~30 essential properties.


### Core Correctness Properties

**Property 1: State Machine Parser Fixed String Validation**
*For any* format string containing fixed strings, the generated parser should reject inputs where the fixed strings don't match exactly at the expected byte offsets.
**Validates: Requirements 1.1**

**Property 2: State Machine Parser Field Extraction**
*For any* format string with delimited fields, the generated parser should extract all fields correctly using state transitions, regardless of field content (as long as it doesn't contain the delimiter).
**Validates: Requirements 1.2**

**Property 3: State Machine Parser Mixed Pattern Handling**
*For any* format string with alternating fixed strings and placeholders, the generated parser should correctly validate fixed portions and extract variable portions in sequence.
**Validates: Requirements 1.3**

**Property 4: State Machine Parser Optional Field Handling**
*For any* format string with optional fields, the generated parser should successfully parse messages both with and without the optional fields present.
**Validates: Requirements 1.4**

**Property 5: State Machine Parser Error Context**
*For any* malformed input, the generated parser should return an error including the current state name, byte offset, expected input, and actual input encountered.
**Validates: Requirements 1.5**

**Property 6: Parser Regression Test Coverage**
*For any* previously failing parser test case, the state machine parser implementation should pass the test, with zero failures across all 14 original failing tests.
**Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5**

**Property 7: MCP Server Generation Completeness**
*For any* protocol specification, generating an MCP server should produce a server file that exports a valid MCP server implementation with tool registration for all message types.
**Validates: Requirements 3.1**

**Property 8: MCP Tool Count Correctness**
*For any* protocol specification with N message types, the generated MCP server should register exactly N tools, with tool names following the {protocol}_{operation} convention.
**Validates: Requirements 3.2**

**Property 9: MCP Tool Execution Success**
*For any* valid tool input matching the tool's JSON schema, executing the tool should return a successful result with the expected output structure.
**Validates: Requirements 3.3**

**Property 10: MCP Error Format Compliance**
*For any* tool execution failure (invalid input, network error, parse error), the MCP server should return an error object with code, message, and details fields in MCP-compliant format.
**Validates: Requirements 3.4**

**Property 11: MCP Tool Schema Validity**
*For any* message type, the generated JSON schema should be valid according to JSON Schema Draft 7 and should accurately describe all fields with their types and constraints.
**Validates: Requirements 4.1, 4.2, 4.3, 4.4**

**Property 12: MCP Schema Regeneration Consistency**
*For any* protocol specification change, regenerating the MCP server should update tool schemas to match the new specification exactly.
**Validates: Requirements 4.5**

**Property 13: Multi-Language Code Generation**
*For any* protocol specification and target language, generating code should produce compilable artifacts (parser, serializer, client, types, tests) in that language.
**Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.5**

**Property 14: Language-Specific Naming Conventions**
*For any* generated code in a target language, all identifiers should follow that language's naming convention (camelCase for TypeScript, snake_case for Python/Rust, PascalCase for Go exports).
**Validates: Requirements 7.2, 7.3, 7.4, 7.5**

**Property 15: Language-Specific Error Handling**
*For any* generated code in a target language, error handling should follow that language's idioms (exceptions for TypeScript/Python, error returns for Go, Result types for Rust).
**Validates: Requirements 8.1, 8.2, 8.3, 8.4, 8.5**

**Property 16: Workbench Validation Response Time**
*For any* YAML specification under 10KB, the /api/validate endpoint should return diagnostics within 500ms.
**Validates: Requirements 10.5, 46.5**

**Property 17: Workbench Generation Response Time**
*For any* valid protocol specification, the /api/generate endpoint should return generated code for all languages within 5 seconds.
**Validates: Requirements 47.5**

**Property 18: Multi-Constraint Satisfaction**
*For any* field with multiple constraints (minLength, maxLength, pattern), the test generator should produce values that satisfy all constraints simultaneously, with zero constraint violations.
**Validates: Requirements 13.1, 13.2, 13.3**

**Property 19: Constraint Conflict Detection**
*For any* set of contradictory constraints (e.g., minLength > maxLength), the constraint solver should detect the conflict and report which constraints are incompatible.
**Validates: Requirements 13.4, 14.5**

**Property 20: Constraint Solver Completeness**
*For any* satisfiable set of constraints, the constraint solver should find at least one valid value within 1 second.
**Validates: Requirements 14.1, 14.2, 14.3, 14.4**

**Property 21: Boundary Value Generation**
*For any* numeric field with min/max constraints, the test generator should include boundary values (min, min+1, max-1, max) in the generated test cases.
**Validates: Requirements 15.1, 15.2, 15.3, 15.4**

**Property 22: Protocol Discovery Connection Success**
*For any* reachable host:port, the discovery engine should successfully connect, send probes, and record responses within the specified timeout.
**Validates: Requirements 16.1, 16.2, 16.3**

**Property 23: Protocol Fingerprint Matching**
*For any* known protocol running on its default port, the discovery engine should identify it with confidence > 0.7 when all probes match the fingerprint.
**Validates: Requirements 16.4, 16.5, 17.4**

**Property 24: Protocol Probe Generation**
*For any* protocol specification with defined handshakes or request messages, the system should generate probes that can be used for discovery.
**Validates: Requirements 18.1, 18.2, 18.3, 18.4**

**Property 25: Documentation Regeneration Trigger**
*For any* change to a protocol specification, the documentation sync engine should detect the change and trigger regeneration within 1 second.
**Validates: Requirements 19.1**

**Property 26: Documentation Content Accuracy**
*For any* protocol specification, the generated documentation should include all message types, fields, and constraints defined in the specification.
**Validates: Requirements 19.2, 19.3, 19.4, 20.2, 20.3**

**Property 27: Documentation Version Increment**
*For any* breaking change (removed field, changed type), the documentation version should increment the major version number.
**Validates: Requirements 21.2, 21.3**

**Property 28: Cross-Language Example Consistency**
*For any* protocol operation, examples in all supported languages should demonstrate the same functionality with equivalent inputs and outputs.
**Validates: Requirements 23.1, 23.2, 23.3, 23.4, 23.5**

**Property 29: Workbench API Diagnostic Format**
*For any* validation error, the /api/validate endpoint should return diagnostics with line, column, severity, and message fields populated correctly.
**Validates: Requirements 46.1, 46.2, 46.3, 46.4**

**Property 30: Workbench PBT Execution**
*For any* protocol specification, the /api/test/pbt endpoint should execute property-based tests and return results with iterations, failures, and counterexamples (if any) within 30 seconds.
**Validates: Requirements 48.1, 48.2, 48.3, 48.4, 48.5**


## Error Handling

### Error Categories (Phase 2)

**1. State Machine Parser Errors**
- State transition failures (unexpected input in current state)
- Fixed string mismatches
- Delimiter not found
- Field extraction failures
- Type conversion errors

**Error Handling Strategy**:
- Include current state name in error message
- Report byte offset where error occurred
- Show expected input for current state
- Show actual input encountered
- Provide state transition history for debugging

**2. Multi-Language Generation Errors**
- Language-specific compilation errors
- Steering document parsing failures
- Template rendering errors
- AST transformation failures

**Error Handling Strategy**:
- Report which language failed
- Include the specific generation phase (parser, client, tests)
- Show the problematic code snippet
- Suggest fixes based on common issues
- Validate generated code before writing files

**3. MCP Server Errors**
- Tool registration failures
- Schema validation errors
- Tool execution failures
- Protocol operation errors

**Error Handling Strategy**:
- Return MCP-compliant error objects
- Include error codes (INVALID_INPUT, NETWORK_ERROR, PARSE_ERROR)
- Provide detailed error messages
- Log errors for server debugging
- Support error recovery and retry

**4. Workbench API Errors**
- Validation timeout errors
- Generation failures
- PBT execution errors
- Discovery connection failures

**Error Handling Strategy**:
- Return structured JSON errors
- Include HTTP status codes (400, 500, 504)
- Provide user-friendly error messages
- Log detailed errors server-side
- Support graceful degradation in UI

**5. Constraint Solver Errors**
- Unsatisfiable constraints
- Constraint conflicts
- Solver timeout errors
- Invalid constraint specifications

**Error Handling Strategy**:
- Identify conflicting constraints
- Suggest constraint modifications
- Provide examples of valid values
- Report solver performance metrics
- Fall back to simpler generation strategies

**6. Protocol Discovery Errors**
- Connection timeout errors
- Probe failures
- Fingerprint database errors
- No matching protocols found

**Error Handling Strategy**:
- Report connection details (host, port, timeout)
- Show which probes succeeded/failed
- Suggest alternative ports or protocols
- Provide raw packet data for manual analysis
- Support retry with different parameters


## Testing Strategy

### Dual Testing Approach (Phase 2)

**Unit Tests** verify:
- State machine parser generation for specific format strings
- Multi-language code generation for known protocols
- MCP server generation and tool registration
- Constraint solver with specific constraint sets
- Protocol discovery with known protocols
- Workbench API endpoints with sample inputs
- Documentation generation from sample specs

**Property-Based Tests** verify:
- Parser correctness across random format strings
- Multi-language generation across random specs
- MCP tool execution across random inputs
- Constraint satisfaction across random constraint sets
- Discovery accuracy across random protocols
- API response format across random requests
- Documentation accuracy across random spec changes

### Property-Based Testing Framework

**Library**: fast-check (TypeScript/JavaScript)

**Configuration**:
- Minimum 100 iterations per property test
- Minimum 1000 iterations for critical properties (parser round-trip, constraint satisfaction)
- Seed-based reproducibility
- Shrinking enabled for minimal counterexamples
- Timeout: 30 seconds per property

**Test Organization** (Phase 2):
```
tests/
  unit/
    state-machine-parser.test.ts
    multi-language-generator.test.ts
    mcp-server-generator.test.ts
    constraint-solver.test.ts
    protocol-discovery.test.ts
    workbench-api.test.ts
  property/
    parser-state-machine.property.test.ts
    multi-language-generation.property.test.ts
    mcp-tool-execution.property.test.ts
    constraint-satisfaction.property.test.ts
    discovery-accuracy.property.test.ts
    api-response-format.property.test.ts
  integration/
    end-to-end-generation.test.ts
    mcp-server-integration.test.ts
    workbench-integration.test.ts
    multi-language-round-trip.test.ts
  regression/
    parser-fixes.test.ts  # The 14 failing tests
  ui/
    workbench-ui.test.ts  # Playwright/Cypress tests
```

### Property Test Tagging (Phase 2)

Each property-based test MUST be tagged with the correctness property:

```typescript
/**
 * Feature: prm-phase-2, Property 2: State Machine Parser Field Extraction
 * For any format string with delimited fields, parser should extract all fields correctly
 */
test('state machine parser extracts delimited fields', () => {
  fc.assert(
    fc.property(formatStringWithDelimitersArbitrary, messageArbitrary, (format, message) => {
      const parser = generateParser(format);
      const serialized = serialize(message, format);
      const parsed = parser.parse(serialized);
      expect(parsed).toEqual(message);
    }),
    { numRuns: 1000 }
  );
});
```

### Test Coverage Goals (Phase 2)

- 100% coverage of state machine parser generation
- 100% coverage of multi-language generators
- 100% coverage of MCP server generation
- 100% coverage of constraint solver
- 90% coverage of workbench API endpoints
- 80% coverage of protocol discovery
- Property tests for all 30 correctness properties
- Regression tests for all 14 parser failures

### Performance Targets (Phase 2)

- Unit tests: < 2 seconds total
- Property tests: < 60 seconds total
- Integration tests: < 120 seconds total
- Regression tests: < 5 seconds total
- UI tests: < 30 seconds total
- Full test suite: < 5 minutes


## Implementation Technology Stack

### Core System (Phase 2)
- **Language**: TypeScript 5.x
- **Runtime**: Node.js 20.x LTS
- **Build Tool**: tsup
- **Package Manager**: pnpm

### Multi-Language Code Generation
- **TypeScript**: ts-morph for AST manipulation
- **Python**: Python AST library (via child process)
- **Go**: text/template with Go formatting
- **Rust**: syn/quote crates (via child process)

### MCP Server
- **Protocol**: Model Context Protocol (MCP) specification
- **Server Framework**: Custom MCP server implementation
- **JSON Schema**: ajv for schema validation
- **Tool Registry**: In-memory tool registration

### Web Workbench
- **Framework**: SvelteKit 2.x
- **Styling**: Tailwind CSS 3.x
- **Editor**: CodeMirror 6
- **Syntax Highlighting**: @codemirror/lang-yaml
- **Diff View**: diff library + custom rendering
- **State Management**: Svelte stores
- **API Client**: fetch API
- **Build**: Vite

### Constraint Solving
- **Regex Generation**: randexp for pattern-based strings
- **Numeric Ranges**: Custom range generators
- **Constraint Validation**: Custom validation engine
- **Conflict Detection**: Constraint graph analysis

### Protocol Discovery
- **Network**: Node.js net module
- **Packet Capture**: Custom packet recording
- **Fingerprinting**: Custom signature matching
- **Database**: JSON file-based fingerprint storage

### Testing (Phase 2)
- **Test Framework**: Vitest
- **Property Testing**: fast-check
- **UI Testing**: Playwright
- **Coverage**: Vitest coverage (c8)
- **Mocking**: Vitest built-in mocks

### Documentation
- **Format**: Markdown
- **Generation**: Custom templates + AST parsing
- **Versioning**: Semantic versioning
- **Interactive**: Custom execution engine

### Kiro Steering
- **Format**: Markdown files in .kiro/steering/
- **Languages**: TypeScript, Python, Go, Rust
- **Loading**: Custom markdown parser
- **Application**: AST transformation rules


## File Structure (Phase 2)

```
protocol-resurrection-machine/
├── src/
│   ├── core/
│   │   ├── yaml-parser.ts
│   │   ├── validator.ts
│   │   ├── protocol-spec.ts
│   │   ├── state-machine.ts (NEW)
│   │   └── errors.ts
│   ├── generation/
│   │   ├── multi-language/ (NEW)
│   │   │   ├── typescript-generator.ts
│   │   │   ├── python-generator.ts
│   │   │   ├── go-generator.ts
│   │   │   ├── rust-generator.ts
│   │   │   └── language-coordinator.ts
│   │   ├── state-machine-parser-generator.ts (NEW)
│   │   ├── mcp-server-generator.ts (NEW)
│   │   ├── kiro-spec-generator.ts
│   │   ├── code-generator.ts
│   │   ├── test-generator.ts
│   │   ├── ui-generator.ts
│   │   └── doc-generator.ts
│   ├── mcp/ (NEW)
│   │   ├── server.ts
│   │   ├── tool-registry.ts
│   │   ├── schema-generator.ts
│   │   └── config-generator.ts
│   ├── testing/ (NEW)
│   │   ├── constraint-solver.ts
│   │   ├── arbitrary-generator.ts
│   │   ├── boundary-value-generator.ts
│   │   └── multi-constraint-generator.ts
│   ├── discovery/ (NEW)
│   │   ├── discovery-engine.ts
│   │   ├── fingerprint-database.ts
│   │   ├── probe-generator.ts
│   │   └── signature-matcher.ts
│   ├── documentation/ (NEW)
│   │   ├── sync-engine.ts
│   │   ├── changelog-generator.ts
│   │   ├── example-generator.ts
│   │   ├── interactive-doc-generator.ts
│   │   └── version-manager.ts
│   ├── steering/ (NEW)
│   │   ├── steering-loader.ts
│   │   ├── idiom-applier.ts
│   │   └── language-rules.ts
│   ├── templates/
│   │   ├── kiro-specs/
│   │   │   ├── requirements.md.hbs
│   │   │   ├── design.md.hbs
│   │   │   └── tasks.md.hbs
│   │   ├── code/
│   │   │   ├── typescript/
│   │   │   │   ├── parser.ts.hbs
│   │   │   │   ├── serializer.ts.hbs
│   │   │   │   ├── client.ts.hbs
│   │   │   │   └── tests.ts.hbs
│   │   │   ├── python/
│   │   │   │   ├── parser.py.hbs
│   │   │   │   ├── serializer.py.hbs
│   │   │   │   ├── client.py.hbs
│   │   │   │   └── tests.py.hbs
│   │   │   ├── go/
│   │   │   │   ├── parser.go.hbs
│   │   │   │   ├── serializer.go.hbs
│   │   │   │   ├── client.go.hbs
│   │   │   │   └── tests.go.hbs
│   │   │   └── rust/
│   │   │       ├── parser.rs.hbs
│   │   │       ├── serializer.rs.hbs
│   │   │       ├── client.rs.hbs
│   │   │       └── tests.rs.hbs
│   │   ├── mcp/
│   │   │   ├── server.ts.hbs
│   │   │   └── mcp.json.hbs
│   │   └── docs/
│   │       ├── README.md.hbs
│   │       └── API.md.hbs
│   ├── orchestration/
│   │   ├── pipeline.ts
│   │   ├── regeneration.ts
│   │   └── verification.ts
│   ├── cli/
│   │   ├── commands/
│   │   │   ├── generate.ts
│   │   │   ├── regenerate.ts
│   │   │   ├── list.ts
│   │   │   ├── validate.ts
│   │   │   ├── discover.ts (NEW)
│   │   │   └── workbench.ts (NEW)
│   │   └── index.ts
│   └── runtime/
│       ├── base-parser.ts
│       ├── base-client.ts
│       └── base-converter.ts
├── workbench/ (NEW)
│   ├── src/
│   │   ├── routes/
│   │   │   ├── +page.svelte
│   │   │   ├── +layout.svelte
│   │   │   └── api/
│   │   │       ├── validate/+server.ts
│   │   │       ├── generate/+server.ts
│   │   │       ├── test/
│   │   │       │   └── pbt/+server.ts
│   │   │       └── discover/+server.ts
│   │   ├── lib/
│   │   │   ├── components/
│   │   │   │   ├── Editor.svelte
│   │   │   │   ├── CodeViewer.svelte
│   │   │   │   ├── Console.svelte
│   │   │   │   ├── PBTResults.svelte
│   │   │   │   ├── Timeline.svelte
│   │   │   │   ├── Toolbar.svelte
│   │   │   │   ├── StatusBar.svelte
│   │   │   │   ├── ASTViewer.svelte
│   │   │   │   ├── ThemeToggle.svelte
│   │   │   │   └── DiffViewer.svelte
│   │   │   ├── stores/
│   │   │   │   ├── spec.ts
│   │   │   │   ├── diagnostics.ts
│   │   │   │   ├── generated.ts
│   │   │   │   ├── pbtResults.ts
│   │   │   │   ├── timeline.ts
│   │   │   │   └── theme.ts
│   │   │   └── utils/
│   │   │       ├── api.ts
│   │   │       ├── debounce.ts
│   │   │       └── diff.ts
│   │   └── app.css
│   ├── static/
│   ├── svelte.config.js
│   ├── tailwind.config.js
│   ├── vite.config.ts
│   └── package.json
├── .kiro/
│   ├── steering/ (NEW)
│   │   ├── typescript-idioms.md
│   │   ├── python-idioms.md
│   │   ├── go-idioms.md
│   │   └── rust-idioms.md
│   └── specs/
│       ├── protocol-resurrection-machine/
│       │   ├── requirements.md
│       │   ├── design.md
│       │   └── tasks.md
│       └── prm-phase-2/
│           ├── requirements.md
│           ├── design.md
│           └── tasks.md
├── protocols/
│   ├── gopher.yaml
│   ├── finger.yaml
│   └── fingerprints.json (NEW)
├── generated/
│   ├── gopher/
│   │   ├── typescript/
│   │   ├── python/
│   │   ├── go/
│   │   ├── rust/
│   │   ├── mcp/
│   │   └── docs/
│   └── finger/
│       └── [same structure]
├── tests/
│   ├── unit/
│   ├── property/
│   ├── integration/
│   ├── regression/ (NEW)
│   ├── ui/ (NEW)
│   └── fixtures/
├── docs/
│   ├── yaml-spec-format.md
│   ├── architecture.md
│   ├── multi-language-guide.md (NEW)
│   ├── mcp-integration.md (NEW)
│   ├── workbench-guide.md (NEW)
│   └── extending.md
├── package.json
├── tsconfig.json
├── vitest.config.ts
└── README.md
```

## Performance Considerations (Phase 2)

### State Machine Parser Performance
- Pre-compile format strings to state machines at generation time
- Use efficient state transition lookup (Map or switch statements)
- Minimize allocations during parsing
- Stream large messages instead of buffering

### Multi-Language Generation Performance
- Generate languages in parallel using worker threads
- Cache steering documents after first load
- Reuse AST transformations for similar patterns
- Lazy-load language-specific generators

### MCP Server Performance
- Keep tool registry in memory for fast lookup
- Cache JSON schemas after generation
- Reuse protocol clients for multiple tool calls
- Implement connection pooling

### Workbench Performance
- Debounce validation requests (500ms)
- Use virtual scrolling for large code/timeline displays
- Cache generated code until spec changes
- Lazy-load syntax highlighting for inactive tabs
- Use Web Workers for heavy computations

### Constraint Solver Performance
- Cache solver results for identical constraint sets
- Use heuristics to quickly find valid values
- Timeout complex constraint solving (1 second)
- Fall back to simpler generation if solver times out

### Protocol Discovery Performance
- Parallel probe execution
- Timeout individual probes (2 seconds)
- Cache fingerprint database in memory
- Limit packet capture to first 100 packets

## Security Considerations (Phase 2)

### Multi-Language Code Generation
- Validate generated code before writing files
- Sanitize all template inputs
- Prevent code injection through format strings
- Use safe AST manipulation instead of string concatenation

### MCP Server Security
- Validate all tool inputs against JSON schemas
- Sanitize host/port inputs for discovery
- Implement rate limiting for tool calls
- Log all tool executions for audit

### Workbench Security
- Validate all API inputs
- Implement CORS for API endpoints
- Sanitize YAML before parsing
- Prevent XSS in code viewer and console
- Use CSP headers

### Protocol Discovery Security
- Validate host/port inputs
- Implement connection timeouts
- Limit probe payload sizes
- Prevent SSRF attacks
- Log all discovery attempts

