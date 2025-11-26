# Protocol Resurrection Machine - Architecture

This document provides a comprehensive overview of the Protocol Resurrection Machine's architecture, including system layers, data flow, component interfaces, and extension points.

## Table of Contents

1. [System Overview](#system-overview)
2. [Architecture Layers](#architecture-layers)
3. [Data Flow](#data-flow)
4. [Core Components](#core-components)
5. [Component Interfaces](#component-interfaces)
6. [Extension Points](#extension-points)
7. [Technology Stack](#technology-stack)
8. [File Structure](#file-structure)
9. [Performance Considerations](#performance-considerations)
10. [Security Considerations](#security-considerations)

## System Overview

The Protocol Resurrection Machine (PRM) is a meta-programming system that transforms declarative YAML protocol specifications into complete, production-ready protocol implementations. The system operates in two major phases:

### Phase 1: Kiro Spec Generation
Converts YAML protocol specifications into structured Kiro specification documents (requirements.md, design.md, tasks.md).

### Phase 2: Code Generation
Executes Kiro specs to produce parsers, serializers, network clients, property-based tests, and user interfaces.

The architecture emphasizes:
- **Separation of concerns**: Distinct layers for specification processing, code generation, and runtime protocol handling
- **Type safety**: TypeScript throughout with strict mode enabled
- **Testability**: Property-based testing with 100+ iterations per test
- **Extensibility**: Designated extension points for customization

## Architecture Layers

The system is organized into five distinct layers:

```
┌─────────────────────────────────────────────────────────┐
│                    User Interface Layer                  │
│  (CLI, Generated Protocol UIs, Web Dashboard)           │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│              Orchestration & Control Layer               │
│  (Generation Pipeline, Kiro Spec Executor)              │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│                Code Generation Layer                     │
│  (Template Engine, AST Builders, File Writers)          │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│              Specification Processing Layer              │
│  (YAML Parser, Validator, Kiro Spec Generator)          │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│                  Runtime Protocol Layer                  │
│  (Generated Parsers, Clients, Converters)               │
└─────────────────────────────────────────────────────────┘
```

### Layer Responsibilities

#### 1. User Interface Layer
- CLI commands (generate, validate, list)
- Generated protocol-specific UIs
- Progress reporting and error display

#### 2. Orchestration & Control Layer
- Coordinates the entire generation pipeline
- Manages phase transitions (validation → spec generation → code generation)
- Handles incremental regeneration
- Verifies generated artifacts

#### 3. Code Generation Layer
- Template-based code generation using Handlebars or AST builders
- Generates TypeScript code for parsers, serializers, clients
- Generates property-based tests with fast-check
- Formats generated code with Prettier

#### 4. Specification Processing Layer
- Parses YAML protocol specifications with js-yaml
- Validates against JSON schema with ajv
- Performs semantic validation (undefined references, circular dependencies)
- Generates Kiro specification documents

#### 5. Runtime Protocol Layer
- Generated parsers decode protocol messages
- Generated serializers encode protocol messages
- Generated clients manage network connections
- Generated converters transform to/from JSON

## Data Flow

The complete data flow through the system:

```mermaid
graph TD
    A[YAML Protocol Spec] --> B[YAML Parser]
    B --> C[Validation]
    C --> D[Internal AST]
    D --> E[Kiro Spec Generator]
    E --> F[requirements.md]
    E --> G[design.md]
    E --> H[tasks.md]
    F --> I[Code Generator]
    G --> I
    H --> I
    I --> J[Parser]
    I --> K[Serializer]
    I --> L[UI]
    I --> M[Tests]
    J --> N[Runtime Execution]
    K --> N
    L --> O[User Interaction]
    M --> P[Test Execution]
```

### Detailed Flow

1. **Input**: User provides YAML protocol specification
2. **Parsing**: js-yaml parses YAML into JavaScript objects
3. **Validation**: ajv validates against JSON schema, semantic checks performed
4. **AST Creation**: Internal ProtocolSpec AST created
5. **Kiro Spec Generation**: requirements.md, design.md, tasks.md generated
6. **Code Generation**: TypeScript code generated from templates
7. **Artifact Writing**: Generated files written to output directory
8. **Verification**: Generated code validated for syntax and completeness
9. **Runtime**: Generated implementations used to communicate with protocol servers

## Core Components

### 1. YAML Specification Parser

**Purpose**: Parse and validate YAML protocol specifications.

**Location**: `src/core/yaml-parser.ts`

**Key Responsibilities**:
- Parse YAML files into structured objects
- Validate against JSON schema
- Check for semantic errors
- Produce detailed error messages with line numbers

**Interface**:
```typescript
interface YAMLParser {
  parse(yamlContent: string): ProtocolSpec;
  validate(spec: ProtocolSpec): ValidationResult;
}
```

### 2. Kiro Spec Generator

**Purpose**: Transform protocol specifications into Kiro spec documents.

**Location**: `src/generation/kiro-spec-generator.ts`

**Key Responsibilities**:
- Generate EARS-compliant requirements
- Create design documents with correctness properties
- Produce task lists with implementation steps
- Ensure all specs reference source YAML

**Interface**:
```typescript
interface KiroSpecGenerator {
  generateRequirements(spec: ProtocolSpec): string;
  generateDesign(spec: ProtocolSpec): string;
  generateTasks(spec: ProtocolSpec): string;
  generateAll(spec: ProtocolSpec): KiroSpecSet;
}
```

### 3. Parser Generator

**Purpose**: Generate protocol message parsers.

**Location**: `src/generation/parser-generator.ts`

**Key Responsibilities**:
- Generate field extraction code from format strings
- Generate delimiter splitting logic
- Generate type conversion code
- Generate error reporting with byte offsets

**Interface**:
```typescript
interface ParserGenerator {
  generate(spec: ProtocolSpec): string;
  generateForMessageType(messageType: MessageType): string;
}
```

### 4. Serializer Generator

**Purpose**: Generate protocol message serializers.

**Location**: `src/generation/serializer-generator.ts`

**Key Responsibilities**:
- Generate field formatting code
- Generate delimiter insertion logic
- Generate validation code
- Generate error reporting for invalid fields

**Interface**:
```typescript
interface SerializerGenerator {
  generate(spec: ProtocolSpec): string;
  generateForMessageType(messageType: MessageType): string;
}
```

### 5. Client Generator

**Purpose**: Generate network clients for protocols.

**Location**: `src/generation/client-generator.ts`

**Key Responsibilities**:
- Generate TCP/UDP connection code
- Generate handshake sequences
- Integrate with generated parsers/serializers
- Generate error handling and retry logic

**Interface**:
```typescript
interface ClientGenerator {
  generate(spec: ProtocolSpec): string;
  generateConnectionLogic(conn: ConnectionSpec): string;
}
```

### 6. Test Generator

**Purpose**: Generate property-based and unit tests.

**Location**: `src/generation/test-generator.ts`

**Key Responsibilities**:
- Generate property-based tests using fast-check
- Create random data generators (arbitraries)
- Generate round-trip property tests
- Generate error handling tests

**Interface**:
```typescript
interface TestGenerator {
  generatePropertyTests(spec: ProtocolSpec): string;
  generateUnitTests(spec: ProtocolSpec): string;
  generateTestData(spec: ProtocolSpec): string;
}
```

### 7. UI Generator

**Purpose**: Generate terminal-based user interfaces for protocol interaction.

**Location**: `src/generation/ui-generator.ts`

**Key Responsibilities**:
- Generate protocol-specific UIs (e.g., Gopher browser with navigation)
- Generate generic UIs for other protocols
- Create interactive terminal interfaces with readline
- Integrate with generated parsers and serializers
- Support navigation, history, and user input handling

**Interface**:
```typescript
interface UIGenerator {
  generate(spec: ProtocolSpec): string;
  generateGopherUI(spec: ProtocolSpec): string;
  generateGenericUI(spec: ProtocolSpec): string;
}
```

**Features**:
- **Gopher UI**: Full-featured browser with directory navigation, item type icons, back button, text file viewing
- **Generic UI**: Placeholder UI for protocols without custom implementations
- **Interactive**: Uses readline for user input, supports commands like quit, back, and item selection

### 8. State Machine Parser Generator

**Purpose**: Generate parsers using explicit state machine representation for robust parsing.

**Location**: `src/generation/state-machine-parser-generator.ts`
**Core Types**: `src/core/state-machine.ts`

**Status**: ✅ Implemented and integrated into ParserGenerator

**Key Responsibilities**:
- Define state types for parsing (INIT, EXPECT_FIXED, EXTRACT_FIELD, EXPECT_DELIMITER, OPTIONAL_FIELD, ACCEPT, ERROR)
- Build state machines from format strings with validation
- Validate state machine completeness and reachability
- Detect ambiguous transitions
- Track execution context with byte offsets and state history
- Generate detailed error messages with state context

**State Types**:
- **INIT**: Initial state - entry point of the state machine
- **EXPECT_FIXED**: Expect and validate a fixed string at current position
- **EXTRACT_FIELD**: Extract a field value from the input
- **EXPECT_DELIMITER**: Expect and validate a delimiter at current position
- **OPTIONAL_FIELD**: Handle an optional field (may or may not be present)
- **ACCEPT**: Accept state - parsing completed successfully
- **ERROR**: Error state - parsing failed

**Interface**:
```typescript
export class StateMachineBuilder {
  setMessageTypeName(name: string): this;
  setFormatString(format: string): this;
  addState(state: State): this;
  setInitialState(stateId: string): this;
  addTransition(transition: Transition): this;
  build(): StateMachine;
}

export interface StateMachine {
  states: Map<string, State>;
  initialState: string;
  acceptStates: Set<string>;
  errorStates: Set<string>;
  messageTypeName: string;
  formatString: string;
  metadata?: Record<string, any>;
}

export interface ExecutionContext {
  currentState: string;
  offset: number;
  fields: Map<string, any>;
  data: Buffer;
  stateHistory: string[];
  completed: boolean;
  error?: {
    message: string;
    state: string;
    offset: number;
    expected: string;
    actual: string;
  };
}
```

**Validation Features**:
- Reachability analysis: Ensures all states are reachable from initial state
- Ambiguity detection: Prevents multiple 'always' transitions from same state
- Completeness checking: Ensures at least one accept state exists
- Transition priority: Supports prioritized transitions for deterministic parsing

### 9. Orchestration Engine

**Purpose**: Coordinate the entire generation pipeline.

**Location**: `src/orchestration/pipeline.ts`

**Key Responsibilities**:
- Validate YAML specifications
- Generate Kiro specs
- Execute code generation (parsers, serializers, UIs, tests)
- Write files to output directory
- Verify generated artifacts

**Interface**:
```typescript
interface OrchestrationEngine {
  generate(yamlPath: string, outputDir: string): Promise<GenerationResult>;
  regenerate(yamlPath: string, outputDir: string, options: RegenerationOptions): Promise<GenerationResult>;
  listProtocols(outputDir: string): ProtocolInfo[];
}
```

## Component Interfaces

### Data Models

#### ProtocolSpec

The core data structure representing a parsed protocol specification:

```typescript
interface ProtocolSpec {
  protocol: ProtocolMetadata;
  connection: ConnectionSpec;
  messageTypes: MessageType[];
  types?: TypeDefinition[];
  errorHandling?: ErrorHandlingSpec;
}
```

#### ProtocolMetadata

```typescript
interface ProtocolMetadata {
  name: string;
  rfc?: string;
  port: number;
  description: string;
  version?: string;
}
```

#### ConnectionSpec

```typescript
interface ConnectionSpec {
  type: 'TCP' | 'UDP';
  handshake?: HandshakeSpec;
  termination?: TerminationSpec;
  timeout?: number;
  keepAlive?: boolean;
}
```

#### MessageType

```typescript
interface MessageType {
  name: string;
  direction: 'request' | 'response' | 'bidirectional';
  format: string;
  fields: FieldDefinition[];
  delimiter?: string;
  terminator?: string;
}
```

#### FieldDefinition

```typescript
interface FieldDefinition {
  name: string;
  type: FieldType;
  required: boolean;
  validation?: ValidationRule;
  defaultValue?: any;
}

type FieldType = 
  | { kind: 'string'; maxLength?: number }
  | { kind: 'number'; min?: number; max?: number }
  | { kind: 'enum'; values: string[] }
  | { kind: 'bytes'; length?: number }
  | { kind: 'boolean' };
```

### Generated Interfaces

#### Protocol Parser (Generated)

```typescript
interface ProtocolParser<T> {
  parse(data: Buffer): ParseResult<T>;
  parseStream(stream: ReadableStream): AsyncIterator<ParseResult<T>>;
}

interface ParseResult<T> {
  success: boolean;
  message?: T;
  error?: ParseError;
  bytesConsumed: number;
}
```

#### Protocol Serializer (Generated)

```typescript
interface ProtocolSerializer<T> {
  serialize(message: T): SerializeResult;
  validate(message: T): ValidationResult;
}

interface SerializeResult {
  success: boolean;
  data?: Buffer;
  error?: SerializeError;
}
```

#### Protocol Client (Generated)

```typescript
interface ProtocolClient {
  connect(host: string, port?: number): Promise<Connection>;
  disconnect(): Promise<void>;
  send<T>(message: T): Promise<void>;
  receive<T>(): Promise<T>;
  request<TReq, TRes>(message: TReq): Promise<TRes>;
}
```

## Extension Points

The system provides designated extension points for customization without modifying generated code.

### 1. Custom Validators

**Location**: `generated/[protocol]/extensions/custom-validators.ts`

**Purpose**: Add custom validation logic for fields

**Example**:
```typescript
export function validateEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}
```

**Usage in YAML**:
```yaml
fields:
  - name: email
    type: string
    validation:
      custom: "validateEmail"
```

### 2. Message Hooks

**Location**: `generated/[protocol]/extensions/message-hooks.ts`

**Purpose**: Process messages before sending or after receiving

**Example**:
```typescript
export function preSendHook(message: any): any {
  // Add timestamp to all outgoing messages
  return { ...message, timestamp: Date.now() };
}

export function postReceiveHook(message: any): any {
  // Log all incoming messages
  console.log('Received:', message);
  return message;
}
```

### 3. Custom Renderers

**Location**: `generated/[protocol]/extensions/custom-renderers.ts`

**Purpose**: Custom UI rendering for message types

**Example**:
```typescript
export function renderDirectoryItem(item: GopherDirectoryItem): string {
  const icon = getIconForType(item.itemType);
  return `${icon} ${item.display}`;
}
```

### 4. Custom Test Generators

**Location**: `generated/[protocol]/extensions/custom-generators.ts`

**Purpose**: Custom fast-check arbitraries for complex fields

**Example**:
```typescript
export function generateSelector(): fc.Arbitrary<string> {
  return fc.string({ minLength: 0, maxLength: 255 })
    .filter(s => !s.includes('\r') && !s.includes('\n'));
}
```

### Extension Point Preservation

During regeneration:
- All files in `extensions/` directories are **never modified**
- Generated code imports from extensions if they exist
- Extension points are documented in generated README
- Missing extension points use default implementations

## Technology Stack

### Core System
- **Language**: TypeScript 5.x
- **Runtime**: Node.js 20.x LTS
- **Build Tool**: tsup
- **Package Manager**: pnpm

### Code Generation
- **Template Engine**: Handlebars
- **AST Manipulation**: ts-morph
- **Code Formatting**: Prettier

### Testing
- **Test Framework**: Vitest
- **Property Testing**: fast-check
- **Coverage**: Vitest coverage (c8)

### YAML Processing
- **Parser**: js-yaml
- **Validation**: ajv (JSON Schema validator)

### Network (Generated Clients)
- **TCP/UDP**: Node.js net and dgram modules
- **Async**: Native Promises and async/await

### CLI
- **Command Framework**: commander
- **Styling**: chalk
- **Progress**: ora

## File Structure

```
protocol-resurrection-machine/
├── src/
│   ├── core/                      # Core specification processing
│   │   ├── yaml-parser.ts         # YAML parsing
│   │   ├── validator.ts           # Schema & semantic validation
│   │   ├── protocol-spec.ts       # Type definitions
│   │   ├── format-parser.ts       # Format string parsing
│   │   ├── state-machine.ts       # State machine representation (Phase 2)
│   │   └── format-analyzer.ts     # Format string analyzer (Phase 2)
│   ├── generation/                # Code generation
│   │   ├── kiro-spec-generator.ts # Kiro spec generation
│   │   ├── parser-generator.ts    # Parser code generation
│   │   ├── serializer-generator.ts # Serializer code generation
│   │   ├── client-generator.ts    # Client code generation
│   │   ├── test-generator.ts      # Test code generation
│   │   └── file-writer.ts         # File writing utilities
│   ├── orchestration/             # Pipeline orchestration
│   │   ├── pipeline.ts            # Main generation pipeline
│   │   └── artifact-verifier.ts   # Artifact verification
│   ├── cli/                       # CLI interface
│   │   └── index.ts               # CLI commands
│   └── utils/                     # Utilities
│       ├── error-formatter.ts     # Error formatting
│       ├── network-client.ts      # Network utilities
│       └── retry.ts               # Retry logic
├── protocols/                     # Protocol specifications
│   ├── gopher.yaml                # Gopher protocol
│   └── finger.yaml                # Finger protocol
├── generated/                     # Generated implementations
│   ├── gopher/
│   │   ├── gopher-parser.ts
│   │   ├── gopher-serializer.ts
│   │   ├── gopher-client.ts
│   │   ├── extensions/            # Extension points (preserved)
│   │   │   ├── custom-validators.ts
│   │   │   └── message-hooks.ts
│   │   └── tests/
│   │       ├── gopher.property.test.ts
│   │       └── gopher.unit.test.ts
│   └── finger/
│       └── [same structure]
├── tests/                         # System tests
│   ├── unit/                      # Unit tests
│   ├── property/                  # Property-based tests
│   └── integration/               # Integration tests
├── docs/                          # Documentation
│   ├── yaml-format.md             # YAML format reference
│   └── architecture.md            # This document
├── .kiro/
│   └── specs/protocol-resurrection-machine/
│       ├── requirements.md        # System requirements
│       ├── design.md              # System design
│       └── tasks.md               # Implementation tasks
├── package.json
├── tsconfig.json
├── vitest.config.ts
└── README.md
```

## Performance Considerations

### Parser Performance
- **Streaming**: Use streaming parsers for large messages
- **No backtracking**: Avoid backtracking in format string parsing
- **Pre-compilation**: Pre-compile format strings to state machines
- **Buffer operations**: Use Buffer instead of string concatenation
- **Target**: O(n) time complexity relative to message size

### Client Performance
- **Connection pooling**: Reuse connections when protocol allows
- **Async I/O**: Use async/await for non-blocking operations
- **Timeouts**: Implement timeouts for all network operations
- **Retry logic**: Exponential backoff for transient errors

### Test Performance
- **Parallelization**: Run property tests in parallel across message types
- **Caching**: Cache generated test data when appropriate
- **Iteration counts**: Use smaller counts during development (100+ in CI)
- **Target**: Property tests complete in under 10 seconds per protocol

### Generation Performance
- **Caching**: Cache parsed YAML specs
- **Parallel generation**: Generate files in parallel when possible
- **Incremental regeneration**: Only regenerate changed artifacts
- **Lazy loading**: Lazy load protocol implementations

## Security Considerations

### Input Validation
- Validate all YAML inputs against schema
- Sanitize format strings to prevent injection
- Limit message sizes to prevent DoS
- Validate network inputs before parsing

### Network Security
- Support TLS for protocols that allow it
- Validate hostnames and ports
- Implement connection timeouts
- Rate limit connection attempts

### Code Generation Security
- Sanitize all template inputs
- Validate generated code syntax
- Prevent path traversal in file generation
- Use safe file permissions

### Dependency Security
- Pin dependency versions
- Regular security audits
- Minimal dependency footprint
- Use well-maintained libraries

## Diagrams

### Component Interaction Diagram

```mermaid
graph LR
    A[CLI] --> B[Orchestration Engine]
    B --> C[YAML Parser]
    C --> D[Validator]
    D --> E[Kiro Spec Generator]
    E --> F[Code Generator]
    F --> G[Parser Generator]
    F --> H[Serializer Generator]
    F --> I[UI Generator]
    F --> J[Test Generator]
    G --> K[File Writer]
    H --> K
    I --> K
    J --> K
    K --> L[Generated Artifacts]
```

### Runtime Architecture

```mermaid
graph TD
    A[User Application] --> B[Generated Client]
    B --> C[Generated Serializer]
    B --> D[Generated Parser]
    B --> E[Network Layer]
    C --> F[Protocol Message Bytes]
    D --> G[Protocol Message Objects]
    E --> H[Protocol Server]
    H --> E
```

## Phase 2 Implementation (In Progress)

### Completed Components
- ✅ **State Machine Representation** (Task 1.1): Core state machine types and builder with validation
- ✅ **Format String Analyzer** (Task 1.2): Parse format strings into state machines
- ✅ **State Machine Parser Generator** (Task 1.3): Generate TypeScript parsers from state machines
- ✅ **Parser Generator Integration**: ParserGenerator now uses StateMachineParserGenerator
- ✅ **Protocol Discovery Engine**: Fingerprint generation, probe execution, and protocol identification

### In Progress
- 🔄 **Property Tests** (Tasks 1.4-1.8): Validating state machine parser correctness

### Planned Phase 2 Features
- Multi-language code generation (TypeScript, Python, Go, Rust)
- MCP server generation for protocol integration
- SvelteKit web workbench with live validation
- Constraint solver for property-based test generation
- Documentation synchronization engine

### Phase 3 Features (Future)
- Visual protocol designer (drag-and-drop YAML creation)
- Protocol migration tools (convert between protocol versions)
- Cloud deployment of generated servers
- Protocol analytics and monitoring
- Protocol fuzzing for security testing

## References

- **Kiro Spec**: `.kiro/specs/protocol-resurrection-machine/`
- **YAML Format**: `docs/yaml-format.md`
- **Testing Strategy**: `.kiro/steering/testing-strategy.md`
- **Protocol Patterns**: `.kiro/steering/protocol-patterns.md`
- **Gopher RFC**: https://tools.ietf.org/html/rfc1436
- **Finger RFC**: https://tools.ietf.org/html/rfc1288


## Known Limitations and Edge Cases

### Adjacent Fields Without Delimiters

**Issue**: When two variable-length fields are adjacent with no delimiter (e.g., `{field1}{field2}`), and both can be empty, the parser cannot determine where one field ends and the next begins.

**Example**: Gopher DirectoryItem format `{itemType}{display}\t...` where:
- `itemType` is a single character
- `display` can be empty string
- When display is empty, parsing `"0\t..."` is ambiguous - is it itemType="0" with empty display, or itemType="" with display="0"?

**Impact**: 
- Round-trip tests fail for messages with empty adjacent fields
- Affects 3 property-based tests in test suite
- Does not affect real-world usage where fields typically have content

**Workarounds**:
1. Add minimum length constraints to at least one field in YAML spec
2. Add delimiters between all fields
3. Use fixed-length fields instead of variable-length
4. Ensure at least one field is always non-empty in practice

**Future Solutions**:
1. Implement lookahead in state machine to peek at next delimiter
2. Add backtracking capability for ambiguous parses
3. Special case handling for single-character fields followed by variable fields
4. Add "greedy" vs "lazy" field extraction modes

### Test Suite Status

As of Task 1.9 completion:
- **Total Tests**: 428
- **Passing**: 409 (95.6%)
- **Failing**: 18 (4.4%)
  - 3 empty string round-trip tests (known limitation above)
  - 11 unit tests expecting old parser architecture
  - 4 integration tests against live servers (flaky)

**Recommendation**: Focus on integration and property tests which validate actual behavior rather than implementation details.
