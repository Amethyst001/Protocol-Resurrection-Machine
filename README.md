# Protocol Resurrection Machine 🧟‍♂️

> **Bring Dead Protocols Back to Life.**
> Automatically generate complete, type-safe implementations of network protocols from simple YAML specifications.

The **Protocol Resurrection Machine (PRM)** is a next-generation meta-programming system that transforms declarative protocol descriptions into production-ready implementations. Whether you're reviving an ancient 80s protocol or prototyping a new one, PRM generates everything you need: parsers, serializers, clients, servers, and even interactive UIs.

## ✨ Key Features

### 🌍 Multi-Language Generation
Generate idiomatic, type-safe code for your entire stack:
- **TypeScript**: Full type safety, Zod validation, and async/await support.
- **Python**: Dataclasses, `struct` packing/unpacking, and asyncio support.
- **Go**: Struct-based parsing, standard library integration, and goroutine-safe clients.
- **Rust**: Zero-copy parsing, `Result` types, and memory-safe implementations.

### 🛠️ Interactive Workbench
A powerful web-based IDE to design and test your protocols:
- **Live Preview**: See generated code update instantly as you edit YAML.
- **Visual Topology**: Visualize protocol message flows and state transitions.
- **Protocol Simulation**: Simulate client-server interactions directly in the browser.
- **Smart Auto-Fix**: Automatically repair invalid specs and ambiguity.

### 🤖 MCP Integration (Model Context Protocol)
Turn any protocol into an LLM-accessible tool instantly:
- **One-Click Generation**: Generate a fully compliant MCP server for your protocol.
- **LLM Connectivity**: Allow Claude or other LLMs to interact with your protocol natively.
- **Tool Abstraction**: Automatically maps protocol messages to MCP tools.

### 🔍 Protocol Discovery
Identify unknown services running on your network:
- **Fingerprinting**: Match services against a database of protocol signatures.
- **Heuristic Analysis**: Detect text vs. binary, delimiters, and common patterns.
- **Automatic Spec Generation**: Generate a skeleton YAML spec from captured traffic.

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- pnpm (recommended) or npm

### Installation

```bash
# Clone the repository
git clone https://github.com/your-org/protocol-resurrection-machine.git
cd protocol-resurrection-machine

# Install dependencies
pnpm install

# Build the core system
pnpm build
```

### Running the Workbench

The easiest way to use PRM is through the interactive Workbench:

```bash
cd workbench
pnpm run dev
```

Open `http://localhost:5173` in your browser. You'll see the editor where you can load examples (like Gopher or Finger) or start writing your own spec.

---

## 📖 YAML Specification Format

Define your protocol in a simple, human-readable YAML format.

```yaml
protocol:
  name: Gopher
  port: 70
  description: The Gopher protocol for hierarchical document retrieval.

messageTypes:
  - name: Request
    direction: request
    format: "{selector}\r\n"
    fields:
      - name: selector
        type: string
        description: The path or selector to retrieve

  - name: DirectoryItem
    direction: response
    format: "{type}{display}\t{selector}\t{host}\t{port}\r\n"
    fields:
      - name: type
        type: u8
        description: Item type (0=file, 1=dir)
      - name: display
        type: string
      - name: selector
        type: string
      - name: host
        type: string
      - name: port
        type: u16
```

---

## 🏗️ Architecture

PRM operates as a multi-stage compiler:

1.  **Ingestion**: Parses YAML and validates it against the meta-schema.
2.  **Semantic Analysis**: Resolves types, checks for ambiguity, and builds an internal AST.
3.  **Optimization**: Optimizes the AST for parser efficiency (e.g., merging common prefixes).
4.  **Generation**:
    *   **Parser Generator**: Creates state machine parsers.
    *   **Serializer Generator**: Creates efficient binary/text serializers.
    *   **MCP Generator**: Creates Model Context Protocol tool definitions.
5.  **Output**: Emits formatted code for the target languages.

---

## 🧪 Testing & Verification

PRM takes correctness seriously.

*   **Property-Based Testing**: Generated code includes Fast-Check tests to verify round-trip correctness (`parse(serialize(x)) == x`) for thousands of random inputs.
*   **Validation**: The Workbench validates your spec in real-time, checking for logic errors, unreachable states, and unused types.

---

## 📄 License

MIT © 2024 Protocol Resurrection Machine Team
