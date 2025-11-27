# Design Document

## Overview

The Protocol Resurrection Machine (PRM) is a meta-programming system that transforms declarative YAML protocol specifications into complete, production-ready protocol implementations. The system operates in two major phases: (1) Kiro Spec Generation, which converts YAML into structured Kiro specification documents, and (2) Code Generation, which executes those specs to produce parsers, clients, tests, and UIs.

The architecture emphasizes separation of concerns with distinct layers for specification processing, code generation templates, runtime protocol handling, and user interaction. By leveraging Kiro's spec-driven development methodology, the system demonstrates that complex protocol implementations can be generated reliably from high-level descriptions, effectively "resurrecting" obsolete network protocols with minimal manual effort.

The system will be implemented in TypeScript/Node.js for the generation pipeline and generated artifacts, with a focus on type safety, testability, and extensibility.

## Architecture

### System Layers

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

### Data Flow

```
YAML Protocol Spec
       ↓
   [Validation]
       ↓
  Internal AST
       ↓
[Kiro Spec Generation]
       ↓
requirements.md, design.md, tasks.md
       ↓
[Kiro Spec Execution]
       ↓
[Code Generation via Templates]
       ↓
Generated Artifacts:
  - protocol-parser.ts
  - protocol-client.ts
  - protocol-converter.ts
  - protocol.test.ts
  - protocol-ui.ts
       ↓
[Runtime Execution]
       ↓
Working Protocol Implementation
```

## Components and Interfaces

### 1. YAML Specification Parser

**Purpose**: Parse and validate YAML protocol specifications into an internal representation.

**Interface**:
```typescript
interface YAMLParser {
  parse(yamlContent: string): ProtocolSpec;
  validate(spec: ProtocolSpec): ValidationResult;
}

interface ProtocolSpec {
  protocol: ProtocolMetadata;
  connection: ConnectionSpec;
  messageTypes: MessageType[];
  types?: TypeDefinition[];
  errorHandling?: ErrorHandlingSpec;
}

interface ProtocolMetadata {
  name: string;
  rfc?: string;
  port: number;
  description: string;
}

interface ConnectionSpec {
  type: 'TCP' | 'UDP';
  handshake?: HandshakeSpec;
  termination?: TerminationSpec;
}

interface MessageType {
  name: string;
  direction: 'request' | 'response' | 'bidirectional';
  format: string;  // Format string with {placeholder} syntax
  fields: FieldDefinition[];
}

interface FieldDefinition {
  name: string;
  type: 'string' | 'number' | 'enum' | 'bytes';
  required: boolean;
  validation?: ValidationRule;
}
```

**Responsibilities**:
- Parse YAML files into structured objects
- Validate against JSON schema
- Check for semantic errors (undefined references, circular dependencies)
- Produce detailed error messages with line numbers

### 2. Kiro Spec Generator

**Purpose**: Transform validated protocol specifications into Kiro spec documents (requirements.md, design.md, tasks.md).

**Interface**:
```typescript
interface KiroSpecGenerator {
  generateRequirements(spec: ProtocolSpec): string;
  generateDesign(spec: ProtocolSpec): string;
  generateTasks(spec: ProtocolSpec): string;
  generateAll(spec: ProtocolSpec): KiroSpecSet;
}

interface KiroSpecSet {
  requirements: string;
  design: string;
  tasks: string;
}
```

**Responsibilities**:
- Generate EARS-compliant requirements from protocol spec
- Create design documents with architecture and correctness properties
- Produce task lists with implementation steps
- Ensure all generated specs reference the source YAML

**Template Strategy**:
- Use template files with placeholder substitution
- Generate user stories for each protocol capability
- Create acceptance criteria for parsing, serialization, client operations
- Define correctness properties (round-trip, protocol compliance)

### 3. Code Generator

**Purpose**: Generate TypeScript implementation files from protocol specifications.

**Interface**:
```typescript
interface CodeGenerator {
  generateParser(spec: ProtocolSpec): string;
  generateSerializer(spec: ProtocolSpec): string;
  generateClient(spec: ProtocolSpec): string;
  generateConverter(spec: ProtocolSpec): string;
  generateTests(spec: ProtocolSpec): string;
  generateUI(spec: ProtocolSpec): string;
  generateAll(spec: ProtocolSpec): GeneratedArtifacts;
}

interface GeneratedArtifacts {
  parser: string;
  serializer: string;
  client: string;
  converter: string;
  tests: string;
  ui: string;
  documentation: string;
}
```

**Responsibilities**:
- Generate type-safe TypeScript code
- Use AST builders for code generation (not string concatenation)
- Apply consistent formatting and style
- Include inline documentation
- Generate extension points for customization

### 4. Protocol Parser (Generated)

**Purpose**: Parse protocol messages from byte streams into structured objects.

**Interface** (generated for each protocol):
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

interface ParseError {
  message: string;
  offset: number;
  expected: string;
  actual: string;
}
```

**Responsibilities**:
- Decode byte streams according to message format
- Handle delimiters and fixed strings
- Extract and type-convert fields
- Provide detailed error messages on parse failures
- Support streaming and batch parsing

### 5. Protocol Serializer (Generated)

**Purpose**: Serialize structured message objects into protocol byte streams.

**Interface** (generated for each protocol):
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

interface SerializeError {
  message: string;
  field: string;
  reason: string;
}
```

**Responsibilities**:
- Encode message objects to byte streams
- Insert delimiters and fixed strings
- Format fields according to specification
- Validate message objects before serialization
- Provide detailed error messages on validation failures

### 6. Protocol Client (Generated)

**Purpose**: Establish connections and communicate using the protocol.

**Interface** (generated for each protocol):
```typescript
interface ProtocolClient {
  connect(host: string, port?: number): Promise<Connection>;
  disconnect(): Promise<void>;
  send<T>(message: T): Promise<void>;
  receive<T>(): Promise<T>;
  request<TReq, TRes>(message: TReq): Promise<TRes>;
}

interface Connection {
  connected: boolean;
  host: string;
  port: number;
  close(): Promise<void>;
}
```

**Responsibilities**:
- Manage TCP/UDP connections
- Perform protocol handshakes
- Send serialized messages
- Receive and parse responses
- Handle connection errors gracefully
- Support connection pooling when appropriate

### 7. JSON Converter (Generated)

**Purpose**: Convert protocol messages to/from JSON format.

**Interface** (generated for each protocol):
```typescript
interface JSONConverter<T> {
  toJSON(message: T): object;
  fromJSON(json: object): ConversionResult<T>;
}

interface ConversionResult<T> {
  success: boolean;
  message?: T;
  error?: ConversionError;
}

interface ConversionError {
  message: string;
  field: string;
  reason: string;
}
```

**Responsibilities**:
- Transform protocol messages to JSON objects
- Transform JSON objects to protocol messages
- Preserve all message data through conversion
- Validate JSON structure
- Handle protocol-specific types appropriately

### 8. Test Generator

**Purpose**: Generate property-based and unit tests for protocol implementations.

**Interface**:
```typescript
interface TestGenerator {
  generatePropertyTests(spec: ProtocolSpec): string;
  generateUnitTests(spec: ProtocolSpec): string;
  generateTestData(spec: ProtocolSpec): string;
}
```

**Responsibilities**:
- Generate property-based tests using fast-check library
- Create random data generators for each message type
- Generate round-trip property tests
- Generate protocol compliance tests
- Generate error handling tests
- Configure tests to run 100+ iterations

### 9. UI Generator

**Purpose**: Generate simple user interfaces for protocol interaction.

**Interface**:
```typescript
interface UIGenerator {
  generateCLI(spec: ProtocolSpec): string;
  generateWeb(spec: ProtocolSpec): string;
}
```

**Responsibilities**:
- Generate CLI interfaces using inquirer or similar
- Generate web UIs using React or similar framework
- Create input forms for message parameters
- Display responses in human-readable format
- Provide JSON view option
- Handle errors gracefully in UI

### 10. Orchestration Engine

**Purpose**: Coordinate the entire generation pipeline.

**Interface**:
```typescript
interface OrchestrationEngine {
  generate(yamlPath: string, outputDir: string): Promise<GenerationResult>;
  regenerate(yamlPath: string, outputDir: string, options: RegenerationOptions): Promise<GenerationResult>;
  listProtocols(outputDir: string): ProtocolInfo[];
}

interface GenerationResult {
  success: boolean;
  protocolName: string;
  artifacts: string[];
  errors: GenerationError[];
  warnings: string[];
}

interface RegenerationOptions {
  force?: boolean;
  artifactsToRegenerate?: string[];
}
```

**Responsibilities**:
- Validate YAML specifications
- Generate Kiro specs
- Execute code generation
- Write files to output directory
- Report progress and errors
- Support incremental regeneration
- Verify generated artifacts

## Data Models

### Protocol Specification AST

```typescript
// Core protocol specification
interface ProtocolSpec {
  protocol: ProtocolMetadata;
  connection: ConnectionSpec;
  messageTypes: MessageType[];
  types?: TypeDefinition[];
  errorHandling?: ErrorHandlingSpec;
}

// Protocol metadata
interface ProtocolMetadata {
  name: string;
  rfc?: string;
  port: number;
  description: string;
  version?: string;
}

// Connection specification
interface ConnectionSpec {
  type: 'TCP' | 'UDP';
  handshake?: HandshakeSpec;
  termination?: TerminationSpec;
  timeout?: number;
  keepAlive?: boolean;
}

interface HandshakeSpec {
  clientSends?: string;
  serverResponds?: string;
  required: boolean;
}

interface TerminationSpec {
  clientSends?: string;
  serverResponds?: string;
  closeConnection: boolean;
}

// Message type definition
interface MessageType {
  name: string;
  direction: 'request' | 'response' | 'bidirectional';
  format: string;
  fields: FieldDefinition[];
  delimiter?: string;
  terminator?: string;
}

// Field definition
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

// Validation rules
interface ValidationRule {
  pattern?: string;  // Regex pattern
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  custom?: string;  // Custom validation function name
}

// Type definitions (enums, etc.)
interface TypeDefinition {
  name: string;
  kind: 'enum' | 'struct';
  values?: EnumValue[];
  fields?: FieldDefinition[];
}

interface EnumValue {
  name: string;
  value: string | number;
  description?: string;
}

// Error handling specification
interface ErrorHandlingSpec {
  onParseError: 'throw' | 'return' | 'log';
  onNetworkError: 'throw' | 'retry' | 'return';
  retryAttempts?: number;
  retryDelay?: number;
}
```

### Generated Message Types

For each protocol, the system generates TypeScript interfaces for messages:

```typescript
// Example: Generated Gopher types
interface GopherRequest {
  selector: string;
}

interface GopherDirectoryItem {
  type: GopherItemType;
  display: string;
  selector: string;
  host: string;
  port: number;
}

enum GopherItemType {
  TextFile = '0',
  Directory = '1',
  CSO = '2',
  Error = '3',
  BinHex = '4',
  DOSArchive = '5',
  UUEncoded = '6',
  Search = '7',
  Telnet = '8',
  Binary = '9',
  GIF = 'g',
  Image = 'I',
  HTML = 'h'
}

interface GopherResponse {
  items: GopherDirectoryItem[];
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*


### Property Reflection

Before defining the final set of correctness properties, I've analyzed all acceptance criteria for redundancy and consolidation opportunities:

**Consolidation Decisions**:
- Properties 1.1-1.4 (YAML parsing) can be combined into a single comprehensive YAML parsing property
- Properties 2.1-2.5 (validation) can be consolidated into validation completeness and error reporting properties
- Properties 3.1-3.9 (Kiro spec generation) can be grouped into spec generation completeness properties
- Properties 4.1-4.5 and 5.1-5.5 (parser/serializer) are best validated through the round-trip property (6.1)
- Properties 8.1-8.6 (JSON conversion) can be consolidated with the JSON round-trip property being primary
- Properties 9.1-9.6 and 10.1-10.5 (test generation) can be combined into test generation completeness
- Properties 13.x and 14.x (Gopher/Finger) are examples, not general properties
- Properties 15.x-16.x (orchestration) can be consolidated into generation pipeline properties
- Properties 17.x (error handling) can be consolidated into error reporting quality properties
- Properties 18.x-19.x (documentation/extension points) can be combined into artifact completeness properties

This consolidation reduces ~100 potential properties to ~25 essential properties that provide unique validation value without redundancy.

### Core Correctness Properties

**Property 1: YAML Parsing Completeness**
*For any* valid YAML protocol specification containing protocol metadata, connection specs, message types, and type definitions, parsing should extract all fields correctly and produce a complete ProtocolSpec object with all specified values accessible.
**Validates: Requirements 1.1, 1.2, 1.3, 1.4**

**Property 2: YAML Validation Error Completeness**
*For any* invalid YAML protocol specification, validation should report all errors in a single pass, with each error including the field path, expected type or constraint, actual value, and line number.
**Validates: Requirements 1.5, 2.2, 2.3, 2.4**

**Property 3: Schema Validation Correctness**
*For any* YAML document, validation against the protocol schema should accept all valid specifications and reject all invalid specifications, with no false positives or false negatives.
**Validates: Requirements 2.1, 2.5**

**Property 4: Kiro Spec Generation Completeness**
*For any* valid protocol specification, generating Kiro specs should produce requirements.md, design.md, and tasks.md files, where requirements.md contains EARS-compliant acceptance criteria for all protocol capabilities, design.md contains correctness properties for all message types, and tasks.md contains ordered implementation steps covering all artifacts.
**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.7, 3.8, 3.9**

**Property 5: Round-Trip Property Coverage**
*For any* protocol specification with N message types, the generated design.md should contain at least N round-trip correctness properties, one for each message type.
**Validates: Requirements 3.5, 6.2**

**Property 6: Protocol Compliance Property Generation**
*For any* message type with format constraints (fixed strings, delimiters, field types), the generated design.md should include correctness properties that verify compliance with those constraints.
**Validates: Requirements 3.6**

**Property 7: Parser-Serializer Round-Trip**
*For any* valid message object of any message type, serializing then parsing should produce an equivalent message object (serialize(parse(x)) == x and parse(serialize(x)) == x).
**Validates: Requirements 4.1, 4.2, 4.3, 4.4, 5.1, 5.2, 5.3, 5.4, 6.1**

**Property 8: Parser Error Reporting**
*For any* malformed protocol message, parsing should fail with an error that includes the byte offset of the failure, the expected format, and the actual data encountered.
**Validates: Requirements 4.5, 17.3**

**Property 9: Serializer Validation**
*For any* invalid message object (missing required fields, invalid field types, constraint violations), serialization should fail with an error that identifies the invalid field and the reason for invalidity.
**Validates: Requirements 5.5**

**Property 10: Client Connection Type Correctness**
*For any* protocol specification with connection type TCP or UDP, the generated client should establish connections using the specified protocol type.
**Validates: Requirements 7.1**

**Property 11: Client Handshake Execution**
*For any* protocol specification with a defined handshake sequence, the generated client should execute the handshake before allowing message transmission.
**Validates: Requirements 7.2**

**Property 12: Client Serializer Integration**
*For any* message sent by the generated client, the bytes transmitted should be identical to the output of the generated serializer for that message.
**Validates: Requirements 7.3**

**Property 13: Client Parser Integration**
*For any* message received by the generated client, the parsed message object should be identical to the output of the generated parser for those bytes.
**Validates: Requirements 7.4**

**Property 14: Client Error Reporting**
*For any* network error (connection refused, timeout, connection reset), the generated client should return an error that includes the connection state, the operation that failed, and the underlying system error.
**Validates: Requirements 7.5, 17.4**

**Property 15: JSON Conversion Round-Trip**
*For any* valid message object, converting to JSON then back to a message object should produce an equivalent message (fromJSON(toJSON(x)) == x).
**Validates: Requirements 8.1, 8.2, 8.3, 8.4, 8.6**

**Property 16: JSON Validation**
*For any* JSON object missing required fields or containing invalid field types, conversion to a message object should fail with an error identifying the invalid or missing field.
**Validates: Requirements 8.5**

**Property 17: Property-Based Test Generation Completeness**
*For any* protocol specification with N message types, the generated test file should contain at least N property-based tests for round-trip correctness, plus property-based tests for parser error handling and serializer validation.
**Validates: Requirements 9.1, 9.2, 9.3, 6.2**

**Property 18: Property Test Configuration**
*For any* generated property-based test, the test configuration should specify a minimum of 100 iterations.
**Validates: Requirements 9.4**

**Property 19: Test Generator Validity**
*For any* message type, the generated random data generator should produce only valid messages that conform to all field constraints and format requirements from the YAML spec.
**Validates: Requirements 10.1, 10.2, 10.3, 10.4, 10.5**

**Property 20: UI Field Completeness**
*For any* protocol specification with message types containing N parameters, the generated UI should provide N input fields with appropriate types and validation.
**Validates: Requirements 11.1, 11.2**

**Property 21: Multi-Protocol Isolation**
*For any* set of multiple protocol specifications, generating implementations should create separate output directories for each protocol, with no shared or conflicting files between protocols.
**Validates: Requirements 12.1, 12.2**

**Property 22: Generation Pipeline Ordering**
*For any* protocol specification, the generation pipeline should execute phases in order: YAML validation, Kiro spec generation, code generation, artifact verification, with each phase completing successfully before the next begins.
**Validates: Requirements 15.1, 15.2, 15.3, 15.6**

**Property 23: Generation Success Reporting**
*For any* successful generation, the system should report a list of all generated files with their full paths.
**Validates: Requirements 15.4**

**Property 24: Incremental Regeneration Correctness**
*For any* protocol specification modification that changes only message formats, regeneration should update only parser, serializer, and test files, leaving client and UI files unchanged.
**Validates: Requirements 16.1, 16.2, 16.3**

**Property 25: Extension Point Preservation**
*For any* regeneration operation, all code in files designated as extension points should be preserved exactly, with no modifications or deletions.
**Validates: Requirements 16.4, 19.4**

**Property 26: Documentation Generation Completeness**
*For any* protocol specification, the generated README should include protocol metadata, usage examples, API reference for all public functions, and instructions for running tests and UI.
**Validates: Requirements 18.1, 18.2, 18.3, 18.4, 18.5**

**Property 27: Extension Point Presence**
*For any* generated protocol implementation, the client should include pre-send and post-receive hooks, the parser should include validation hooks, and the UI should include rendering hooks.
**Validates: Requirements 19.1, 19.2, 19.3**

**Property 28: Parser Performance Linearity**
*For any* message size N, parsing time should be O(N), with no quadratic or exponential behavior. This property should be verified by testing with messages of varying sizes (1KB to 1MB), measuring parse time for each size, and verifying that the time complexity remains linear across different message types with at least 50 test iterations per size.
**Validates: Requirements 20.1**

**Property 29: Connection Reuse**
*For any* protocol that allows persistent connections, the generated client should reuse the same connection for multiple sequential requests rather than creating new connections.
**Validates: Requirements 20.2**

## Error Handling

### Error Categories

**1. YAML Specification Errors**
- Syntax errors (invalid YAML)
- Schema violations (missing required fields, wrong types)
- Semantic errors (undefined references, invalid format strings)
- Constraint violations (invalid port numbers, unsupported connection types)

**Error Handling Strategy**:
- Collect all errors in a single validation pass
- Report errors with file location, line number, and suggested fix
- Provide examples of correct syntax
- Do not proceed to code generation if validation fails

**2. Code Generation Errors**
- Template rendering failures
- File system errors (permissions, disk space)
- Invalid generated code (syntax errors in output)
- Missing dependencies

**Error Handling Strategy**:
- Report the generation phase that failed
- Include the artifact being generated
- Provide the specific error message
- Clean up partial artifacts on failure
- Support retry with --force flag

**3. Runtime Protocol Errors**
- Parse errors (malformed protocol data)
- Network errors (connection failures, timeouts)
- Validation errors (invalid message objects)
- Protocol violations (unexpected responses)

**Error Handling Strategy**:
- Return structured error objects with error type, message, and context
- Include diagnostic information (byte offset, connection state)
- Log errors for debugging
- Provide user-friendly error messages in UI
- Support error recovery where possible

**4. Test Failures**
- Property-based test failures (counterexamples found)
- Unit test failures
- Integration test failures

**Error Handling Strategy**:
- Report the failing property or test case
- Include the counterexample input that caused failure
- Show the expected vs actual output
- Support test debugging with verbose mode

### Error Recovery

**Graceful Degradation**:
- If parser fails, return partial parse results when possible
- If client connection fails, support retry with exponential backoff
- If UI encounters errors, display error message but keep UI responsive
- If generation fails for one artifact, continue generating others

**Validation Before Operations**:
- Validate YAML before generation
- Validate message objects before serialization
- Validate JSON before conversion
- Validate connections before sending

**Detailed Error Messages**:
All error messages should follow this format:
```
[ERROR_TYPE] Error in [COMPONENT]: [DESCRIPTION]
Location: [FILE]:[LINE]:[COLUMN]
Expected: [EXPECTED_FORMAT]
Actual: [ACTUAL_VALUE]
Suggestion: [HOW_TO_FIX]
```

## Testing Strategy

### Dual Testing Approach

The Protocol Resurrection Machine requires both unit testing and property-based testing to ensure correctness:

**Unit Tests** verify:
- Specific examples of YAML parsing
- Known protocol messages (Gopher, Finger examples)
- Error handling for specific invalid inputs
- Integration between components
- Edge cases (empty messages, maximum sizes)

**Property-Based Tests** verify:
- Universal properties across all inputs
- Round-trip correctness for all message types
- Parser/serializer correctness across random inputs
- JSON conversion correctness
- Generator validity (generated test data is valid)

### Property-Based Testing Framework

**Library**: fast-check (TypeScript/JavaScript property-based testing library)

**Configuration**:
- Minimum 100 iterations per property test
- Seed-based reproducibility for failed tests
- Shrinking to find minimal counterexamples
- Verbose output on failures

**Test Organization**:
```
tests/
  unit/
    yaml-parser.test.ts
    kiro-spec-generator.test.ts
    code-generator.test.ts
  property/
    round-trip.property.test.ts
    validation.property.test.ts
    generation.property.test.ts
  integration/
    end-to-end.test.ts
    gopher.test.ts
    finger.test.ts
  generated/
    [protocol-name]/
      [protocol-name].property.test.ts
      [protocol-name].unit.test.ts
```

### Property Test Tagging

Each property-based test MUST be tagged with a comment referencing the correctness property:

```typescript
/**
 * Feature: protocol-resurrection-machine, Property 7: Parser-Serializer Round-Trip
 * For any valid message object, serialize then parse should produce equivalent message
 */
test('parser-serializer round-trip', () => {
  fc.assert(
    fc.property(messageArbitrary, (message) => {
      const serialized = serializer.serialize(message);
      const parsed = parser.parse(serialized.data);
      expect(parsed.message).toEqual(message);
    }),
    { numRuns: 100 }
  );
});
```

### Generated Test Requirements

For each generated protocol implementation, the test generator MUST create:

1. **Round-trip property tests** for each message type
2. **Parser error handling tests** with invalid inputs
3. **Serializer validation tests** with invalid message objects
4. **JSON conversion round-trip tests**
5. **Client integration tests** (if test server available)
6. **Random data generators** (arbitraries) for all message types

### Test Execution

**Development Workflow**:
- Run unit tests on every file save (fast feedback)
- Run property tests before commit (comprehensive validation)
- Run integration tests in CI/CD pipeline

**Performance Targets**:
- Unit tests: < 1 second total
- Property tests: < 10 seconds per protocol
- Integration tests: < 30 seconds total

### Test Coverage Goals

- 100% coverage of parser/serializer code paths
- 100% coverage of validation logic
- 100% coverage of error handling paths
- Property tests for all correctness properties
- Example tests for Gopher and Finger protocols

## Implementation Technology Stack

### Core System
- **Language**: TypeScript 5.x
- **Runtime**: Node.js 20.x LTS
- **Build Tool**: esbuild or tsup
- **Package Manager**: pnpm

### Code Generation
- **Template Engine**: Handlebars or custom AST builder
- **AST Manipulation**: ts-morph (TypeScript AST manipulation)
- **Code Formatting**: Prettier

### Testing
- **Test Framework**: Vitest
- **Property Testing**: fast-check
- **Mocking**: Vitest built-in mocks
- **Coverage**: Vitest coverage (c8)

### YAML Processing
- **Parser**: js-yaml
- **Validation**: ajv (JSON Schema validator)

### Network (Generated Clients)
- **TCP/UDP**: Node.js net and dgram modules
- **Async**: Native Promises and async/await

### UI (Generated)
- **CLI**: inquirer, commander, chalk
- **TUI**: ink (React for CLIs) or blessed
- **Web**: React + Vite (optional stretch goal)

### Documentation
- **Format**: Markdown
- **Generation**: Custom templates

## File Structure

```
protocol-resurrection-machine/
├── src/
│   ├── core/
│   │   ├── yaml-parser.ts
│   │   ├── validator.ts
│   │   ├── protocol-spec.ts (types)
│   │   └── errors.ts
│   ├── generation/
│   │   ├── kiro-spec-generator.ts
│   │   ├── code-generator.ts
│   │   ├── parser-generator.ts
│   │   ├── serializer-generator.ts
│   │   ├── client-generator.ts
│   │   ├── converter-generator.ts
│   │   ├── test-generator.ts
│   │   ├── ui-generator.ts
│   │   └── doc-generator.ts
│   ├── templates/
│   │   ├── kiro-specs/
│   │   │   ├── requirements.md.hbs
│   │   │   ├── design.md.hbs
│   │   │   └── tasks.md.hbs
│   │   ├── code/
│   │   │   ├── parser.ts.hbs
│   │   │   ├── serializer.ts.hbs
│   │   │   ├── client.ts.hbs
│   │   │   ├── converter.ts.hbs
│   │   │   ├── tests.ts.hbs
│   │   │   └── ui.ts.hbs
│   │   └── docs/
│   │       └── README.md.hbs
│   ├── orchestration/
│   │   ├── pipeline.ts
│   │   ├── regeneration.ts
│   │   └── verification.ts
│   ├── cli/
│   │   ├── commands/
│   │   │   ├── generate.ts
│   │   │   ├── regenerate.ts
│   │   │   ├── list.ts
│   │   │   └── validate.ts
│   │   └── index.ts
│   └── runtime/
│       ├── base-parser.ts
│       ├── base-client.ts
│       └── base-converter.ts
├── protocols/
│   ├── gopher.yaml
│   ├── finger.yaml
│   └── nntp.yaml (stretch)
├── generated/
│   ├── gopher/
│   │   ├── parser.ts
│   │   ├── serializer.ts
│   │   ├── client.ts
│   │   ├── converter.ts
│   │   ├── tests.ts
│   │   ├── ui.ts
│   │   ├── extensions/
│   │   │   ├── custom-validators.ts
│   │   │   └── custom-renderers.ts
│   │   └── README.md
│   └── finger/
│       └── [same structure]
├── tests/
│   ├── unit/
│   ├── property/
│   ├── integration/
│   └── fixtures/
├── docs/
│   ├── yaml-spec-format.md
│   ├── architecture.md
│   └── extending.md
├── .kiro/
│   └── specs/
│       └── protocol-resurrection-machine/
│           ├── requirements.md
│           ├── design.md
│           └── tasks.md
├── package.json
├── tsconfig.json
├── vitest.config.ts
└── README.md
```

## Extension Points

To support customization without modifying generated code, the system provides designated extension points:

### 1. Custom Validators
**Location**: `generated/[protocol]/extensions/custom-validators.ts`

```typescript
export function customFieldValidator(
  fieldName: string,
  value: any
): ValidationResult {
  // Custom validation logic
  return { valid: true };
}
```

### 2. Custom Renderers
**Location**: `generated/[protocol]/extensions/custom-renderers.ts`

```typescript
export function customMessageRenderer(
  messageType: string,
  message: any
): string {
  // Custom rendering logic
  return formatMessage(message);
}
```

### 3. Message Hooks
**Location**: `generated/[protocol]/extensions/message-hooks.ts`

```typescript
export function preSendHook(message: any): any {
  // Modify message before sending
  return message;
}

export function postReceiveHook(message: any): any {
  // Process message after receiving
  return message;
}
```

### 4. Custom Generators
**Location**: `generated/[protocol]/extensions/custom-generators.ts`

```typescript
export function customFieldGenerator(
  fieldName: string,
  fieldType: FieldType
): fc.Arbitrary<any> {
  // Custom test data generator
  return fc.string();
}
```

**Preservation During Regeneration**:
- All files in `extensions/` directories are never modified by regeneration
- Generated code imports from extensions if they exist
- Extension points are documented in generated README

## Performance Considerations

### Parser Performance
- Use streaming parsers for large messages
- Avoid backtracking in format string parsing
- Pre-compile format strings to state machines
- Use Buffer operations instead of string concatenation

### Client Performance
- Connection pooling for protocols that support it
- Reuse connections for multiple requests
- Implement timeout and retry logic
- Use async/await for non-blocking I/O

### Test Performance
- Parallelize property tests across message types
- Cache generated test data when appropriate
- Use smaller iteration counts during development
- Run full test suite in CI only

### Generation Performance
- Cache parsed YAML specs
- Generate files in parallel when possible
- Use incremental regeneration
- Lazy load protocol implementations

### Memory Management
- Stream large protocol responses
- Limit buffer sizes for network operations
- Clean up connections after use
- Use weak references for caches

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

## Future Enhancements

### Phase 2 Features
- Web-based protocol explorer UI
- Protocol debugging tools (packet capture, replay)
- Support for binary protocols (not just text)
- Protocol fuzzing for security testing
- Performance profiling for generated code

### Phase 3 Features
- Visual protocol designer (drag-and-drop YAML creation)
- Protocol migration tools (convert between protocol versions)
- Multi-language code generation (Python, Go, Rust)
- Cloud deployment of generated servers
- Protocol analytics and monitoring

### Community Features
- Protocol specification repository
- Community-contributed protocol specs
- Protocol compatibility testing
- Benchmarking suite for protocols
- Educational resources and tutorials
