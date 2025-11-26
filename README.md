# Protocol Resurrection Machine

> Automatically generate complete, working implementations of obsolete network protocols from simple YAML specifications.

The Protocol Resurrection Machine (PRM) is a meta-programming system that transforms declarative protocol descriptions into production-ready implementations. Describe a protocol in YAML, and PRM generates parsers, serializers, network clients, property-based tests, and user interfaces—all type-safe, tested, and ready to use.

## 🎯 What It Does

```
YAML Protocol Spec → Complete Implementation
                     ├── Parser (decode protocol messages)
                     ├── Serializer (encode protocol messages)
                     ├── Network Client (connect to servers)
                     ├── Protocol Discovery (identify running protocols)
                     ├── Property-Based Tests (100+ iterations)
                     ├── Unit Tests (specific examples)
                     └── Documentation (usage & API reference)
```

**Real Example**: Define the Gopher protocol in 80 lines of YAML → Get a working Gopher client that connects to real servers like `gopher://gopher.floodgap.com`

## 🚀 Quick Start

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd protocol-resurrection-machine

# Install dependencies
pnpm install

# Build the system
pnpm build

# Run tests
pnpm test
```

### Generate Your First Protocol

```bash
# Generate Gopher protocol implementation
pnpm prm generate protocols/gopher.yaml

# Generated files appear in generated/gopher/:
# - gopher-parser.ts       (decode Gopher messages)
# - gopher-serializer.ts   (encode Gopher messages)
# - gopher-ui.ts           (interactive terminal browser)
# - tests/                 (property-based & unit tests)
```

### Use the Generated Implementation

```typescript
import { GopherParser } from './generated/gopher/gopher-parser';
import { GopherSerializer } from './generated/gopher/gopher-serializer';

const parser = new GopherParser();
const serializer = new GopherSerializer();

// Serialize a request
const request = { selector: '/about' };
const serialized = serializer.request.serialize(request);

// Parse a response
const parsed = parser.directoryitem.parse(responseData);
console.log(parsed.message); // Parsed directory item
```

### Use the Generated UI

```bash
# Start the interactive Gopher browser
cd generated/gopher
node gopher-ui.ts gopher.floodgap.com 70

# Navigate using:
# - Number keys to select items
# - 'b' to go back
# - 'q' to quit
```

### Discover Protocols

```typescript
import { createDiscoveryEngine, FingerprintDatabase } from './src/discovery';

// Create fingerprint database from protocol specs
const db = new FingerprintDatabase();
await db.loadFromDirectory('./protocols');

// Create discovery engine
const engine = createDiscoveryEngine(db);

// Discover protocol on a host:port
const result = await engine.discover('gopher.floodgap.com', 70);

console.log(`Protocol: ${result.identified?.protocol}`);
console.log(`Confidence: ${(result.confidence * 100).toFixed(0)}%`);
console.log(`Packets captured: ${result.packets.length}`);
```

## 📖 YAML Specification Format

Protocol specifications use a simple YAML format with four main sections:

### 1. Protocol Metadata

```yaml
protocol:
  name: Gopher              # Protocol name
  rfc: "1436"               # RFC reference
  port: 70                  # Default port
  description: The Gopher protocol for hierarchical document retrieval
```

### 2. Connection Specification

```yaml
connection:
  type: TCP                 # TCP or UDP
  timeout: 30000            # Timeout in milliseconds
  keepAlive: false          # Connection reuse
```

### 3. Message Types

Define request and response formats using template strings with `{placeholder}` syntax:

```yaml
messageTypes:
  - name: Request
    direction: request
    format: "{selector}\r\n"    # Format string with placeholders
    terminator: "\r\n"
    fields:
      - name: selector
        type: string
        required: true
        validation:
          maxLength: 255
```

**Format String Syntax**:
- `{fieldName}`: Variable field (extracted during parsing, inserted during serialization)
- Fixed text: Literal strings that must appear exactly
- `\r\n`: CRLF line ending
- `\t`: Tab delimiter

### 4. Type Definitions

Define enums and custom types:

```yaml
types:
  - name: GopherItemType
    kind: enum
    values:
      - name: TextFile
        value: "0"
        description: Plain text file
      - name: Directory
        value: "1"
        description: Directory/menu
```

**Complete examples**: See `protocols/gopher.yaml` and `protocols/finger.yaml`

## 🏗️ Architecture Overview

The Protocol Resurrection Machine operates in two phases:

### Phase 1: Specification Processing

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
```

### Phase 2: Code Generation

```
Kiro Specs
       ↓
[Code Generation]
       ↓
Generated Artifacts:
  - protocol-parser.ts
  - protocol-serializer.ts
  - protocol-ui.ts
  - protocol.test.ts
```

### System Layers

1. **Specification Processing Layer**: YAML parsing, validation, semantic analysis
2. **Code Generation Layer**: Template-based code generation with AST builders
3. **Runtime Protocol Layer**: Generated parsers, serializers, and clients
4. **Discovery Layer**: Protocol fingerprinting, probing, and identification
5. **Testing Layer**: Property-based tests with fast-check (100+ iterations)
6. **User Interface Layer**: CLI and generated protocol UIs

## 🎮 CLI Commands

### Generate Protocol Implementation

```bash
pnpm prm generate <yaml-file> [options]

Options:
  --output <dir>    Output directory (default: ./generated)
  --verbose         Show detailed generation progress
```

Example:
```bash
pnpm prm generate protocols/gopher.yaml --output ./generated --verbose
```

### Validate Protocol Specification

```bash
pnpm prm validate <yaml-file>
```

Validates YAML syntax, schema compliance, and semantic correctness without generating code.

### Discover Protocol

```bash
pnpm prm discover <host> <port> [options]

Options:
  --timeout <ms>    Discovery timeout (default: 10000)
  --verbose         Show detailed discovery progress
```

Example:
```bash
pnpm prm discover gopher.floodgap.com 70
# Output:
# Protocol: Gopher
# Confidence: 95%
# Matched features: banner, response-pattern, probe-response
```

### List Available Protocols

```bash
pnpm prm list [output-dir]
```

Lists all generated protocol implementations with metadata.

## 🧪 Testing Strategy

The Protocol Resurrection Machine uses a dual testing approach:

### Unit Tests
- Specific examples (known Gopher directory lines)
- Edge cases (empty messages, boundary values)
- Integration between components
- Error handling with specific invalid inputs

### Property-Based Tests
- **Round-trip correctness**: `parse(serialize(x)) == x` for all valid messages
- **Parser correctness**: All valid protocol messages parse successfully
- **Serializer correctness**: All valid message objects serialize successfully
- **JSON conversion**: `fromJSON(toJSON(x)) == x` for all messages
- **Error reporting**: Invalid inputs produce descriptive errors

**Configuration**: All property tests run 100+ iterations using fast-check library.

Example property test:
```typescript
/**
 * Feature: protocol-resurrection-machine, Property 7: Parser-Serializer Round-Trip
 * For any valid message object, serialize then parse should produce equivalent message
 */
test('gopher directory item round-trip', () => {
  fc.assert(
    fc.property(gopherDirectoryItemArbitrary, (item) => {
      const serialized = serializer.serialize(item);
      const parsed = parser.parse(serialized.data!);
      expect(parsed.message).toEqual(item);
    }),
    { numRuns: 100 }
  );
});
```

## 📚 Example Protocols

### Gopher Protocol (RFC 1436)

A hierarchical document retrieval protocol from 1991. Clients send selector strings, servers respond with directory listings or file content.

**Try it**:
```bash
pnpm prm generate protocols/gopher.yaml
# Connect to gopher://gopher.floodgap.com
```

### Finger Protocol (RFC 1288)

A simple user information lookup protocol from 1977. Clients send usernames, servers respond with user information.

**Try it**:
```bash
pnpm prm generate protocols/finger.yaml
# Query public Finger servers
```

## 🔧 Extension Points

Generated implementations include hooks for customization:

- **Client hooks**: Pre-send and post-receive message processing
- **Parser hooks**: Custom field validation
- **UI hooks**: Custom rendering for message types

Extension point files are preserved during regeneration, allowing you to add custom behavior without modifying generated code.

## 📊 Project Structure

```
protocol-resurrection-machine/
├── .kiro/
│   ├── specs/protocol-resurrection-machine/
│   │   ├── requirements.md          # 20 requirements with EARS syntax
│   │   ├── design.md                # 29 correctness properties
│   │   └── tasks.md                 # 100+ implementation tasks
│   ├── steering/                    # Code generation guidelines
│   │   ├── testing-strategy.md
│   │   └── protocol-patterns.md
│   └── hooks/                       # 6 agent hooks for automation
├── protocols/
│   ├── gopher.yaml                  # Gopher protocol specification
│   └── finger.yaml                  # Finger protocol specification
├── generated/                       # Generated protocol implementations
│   ├── gopher/
│   │   ├── gopher-parser.ts
│   │   ├── gopher-serializer.ts
│   │   ├── gopher-ui.ts
│   │   └── tests/
│   └── finger/
│       ├── finger-parser.ts
│       ├── finger-serializer.ts
│       └── tests/
├── src/                            # Core system implementation
│   ├── core/                       # YAML parsing & validation
│   ├── generation/                 # Code generators
│   ├── discovery/                  # Protocol discovery & fingerprinting
│   ├── orchestration/              # Generation pipeline
│   └── cli/                        # CLI interface
├── tests/                          # System tests
│   ├── unit/                       # Unit tests
│   ├── property/                   # Property-based tests
│   └── integration/                # End-to-end tests
└── docs/                           # Additional documentation
    ├── yaml-format.md              # YAML specification format
    └── architecture.md             # System architecture details
```

## 🎓 Kiro Features Demonstrated

This project showcases Kiro's spec-driven development methodology:

- **Spec-Driven Development**: 20 requirements → 29 correctness properties → 100+ tasks
- **EARS Compliance**: All requirements follow Easy Approach to Requirements Syntax
- **Property-Based Testing**: Formal correctness verification with 100+ iterations per property
- **Agent Hooks**: 6 hooks automating validation, testing, documentation, and progress tracking
- **Steering Documents**: Guidelines for protocol implementation patterns and testing strategies
- **Incremental Development**: Build complex features step-by-step with validation checkpoints

## 📖 Documentation

- **YAML Format Guide**: `docs/yaml-format.md` - Complete YAML specification reference
- **Architecture Guide**: `docs/architecture.md` - System design and component interfaces
- **Kiro Spec**: `.kiro/specs/protocol-resurrection-machine/` - Requirements, design, and tasks
- **Hackathon Guide**: `HACKATHON-GUIDE.md` - Implementation guide and submission info

## 🤝 Contributing

1. Read the Kiro spec in `.kiro/specs/protocol-resurrection-machine/`
2. Pick a task from `tasks.md`
3. Implement following the design in `design.md`
4. Ensure all property-based tests pass (100+ iterations)
5. Submit a pull request

## 📄 License

MIT

## 🙏 Acknowledgments

Built with [Kiro](https://kiro.dev) - AI-powered IDE for spec-driven development.

Demonstrates protocol resurrection for Gopher (RFC 1436) and Finger (RFC 1288).
