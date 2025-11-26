# Usage Guide

> Step-by-step tutorials and workflows for the Protocol Workbench

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Creating Your First Protocol](#creating-your-first-protocol)
3. [Code Generation](#code-generation)
4. [Property-Based Testing](#property-based-testing)
5. [Protocol Discovery](#protocol-discovery)
6. [Advanced Topics](#advanced-topics)
7. [Troubleshooting](#troubleshooting)
8. [Tips & Tricks](#tips--tricks)

---

## Getting Started

### Installation

```bash
# Clone the repository
git clone https://github.com/protocol-resurrection/workbench.git
cd workbench

# Install dependencies
npm install

# Start the development server
npm run dev
```

The workbench will be available at `http://localhost:5173`.

### Interface Overview

The workbench consists of three main panels:

```
┌─────────────────────────────────────┐
│  Activity Bar  │  Main Content      │
├─────────────────────────────────────┤
│  Editor        │  Code Viewer       │
│    YAML        │    TypeScript      │
│                │    Python          │
│                │    Go              │
│                │    Rust            │
│                │    Topology        │
├─────────────────────────────────────┤
│  Console (Logs and Diagnostics)    │
└─────────────────────────────────────┘
```

**Activity Bar** (Left):
- 🏠 Editor - YAML specification
- 🔍 Discovery - Protocol fingerprinting
- 🖥️ MCP Server - Generated server downloads
- 📚 Documentation - This guide!

---

## Creating Your First Protocol

### Step 1: Open the Editor

1. Click the **Editor** icon in the Activity Bar
2. You'll see a Monaco editor with YAML syntax highlighting

### Step 2: Define the Protocol

Create a simple chat protocol:

```yaml
protocol:
  name: SimpleChat
  version: 1.0
  description: A basic chat protocol

connection:
  type: tcp
  port: 9000

messages:
  # Client sends a message
  ChatMessage:
    fields:
      - name: username
        type: string
      - name: text
        type: string
      - name: timestamp
        type: u64

  # Server broadcasts the message
  BroadcastMessage:
    fields:
      - name: username
        type: string
      - name: text
        type: string
      - name: timestamp
        type: u64

topology:
  type: mesh
  description: Full mesh - all clients can talk to each other
```

### Step 3: Validate

As you type, the workbench automatically validates your specification:

- ✅ **Green checkmark**: Valid spec
- ❌ **Red X**: Errors detected
- ⚠️ **Yellow warning**: Suggestions

**Live Diagnostics**:
- Inline error indicators in the editor
- Hover for detailed error messages
- Console panel shows all diagnostics

### Step 4: Generate Code

Once validated:

1. Click **Generate Code** in the toolbar
2. Switch to the **Code Viewer** panel
3. Browse generated SDKs in all 4 languages

---

## Code Generation

### Generated File Structure

For each language, the workbench generates:

#### TypeScript
```
generated/
├── types.ts          # Message type definitions
├── client.ts         # Client implementation
├── server.ts         # Server implementation
└── index.ts          # Re-exports
```

#### Python
```
generated/
├── types.py          # Dataclasses for messages
├── client.py         # Async client
├── server.py         # Async server
└── __init__.py       # Package exports
```

#### Go
```
generated/
├── types.go          # Struct definitions
├── client.go         # Client implementation
├── server.go         # Server implementation
└── protocol.go       # Main package
```

#### Rust
```
generated/
├── types.rs          # Message structs with derives
├── client.rs         # Client implementation
├── server.rs         # Server implementation
└── lib.rs            # Crate exports
```

### Using Generated Code

#### TypeScript Example

```typescript
import { SimpleChatClient } from './generated/typescript';

// Create client
const client = new SimpleChatClient({
  host: 'localhost',
  port: 9000
});

// Connect
await client.connect();

// Send a message
await client.send({
  type: 'ChatMessage',
  username: 'Alice',
  text: 'Hello, world!',
  timestamp: Date.now()
});

// Receive messages
client.on('BroadcastMessage', (msg) => {
  console.log(`${msg.username}: ${msg.text}`);
});
```

#### Python Example

```python
from generated.python import SimpleChatClient

async def main():
    # Create and connect client
    client = SimpleChatClient(host='localhost', port=9000)
    await client.connect()
    
    # Send message
    await client.send_chat_message(
        username='Bob',
        text='Hi everyone!',
        timestamp=int(time.time())
    )
    
    # Receive messages
    async for msg in client.receive():
        if msg.type == 'BroadcastMessage':
            print(f"{msg.username}: {msg.text}")

asyncio.run(main())
```

---

## Property-Based Testing

### What is Property-Based Testing?

Instead of writing individual test cases, you define **properties** that should always be true, and the testing framework generates hundreds of random test cases.

### Running Tests

1. Click **Simulate** in the toolbar
2. Select a scenario:
   - **Happy Path**: Normal operation flow
   - **Edge Cases**: Boundary values, empty strings, max integers
   - **Chaos**: Random inputs, network failures

3. Watch the topology diagram animate as tests run
4. Review results in the console

### Test Scenarios

#### Happy Path
```
✓ Client connects successfully
✓ Sends valid ChatMessage
✓ Server broadcasts to all clients
✓ All clients receive message
✓ Disconnect gracefully
```

#### Edge Cases
```
✓ Empty username handled correctly
✓ Very long text (10,000 chars) handled
✓ Unicode emojis in messages ✅
✓ Timestamp overflow handled
```

#### Chaos Testing
```
✓ Client disconnects mid-send
✓ Network packet loss simulated
✓ Server restart during operation
✓ Concurrent sends from 100 clients
```

### Interpreting Results

**Console Output**:
```
[PBT] Running simulation: Happy Path
[RUST] Sensor initialized
[GO] Gateway received connection
[PYTHON] Dashboard rendering...
[INFO] Test passed: 100/100 scenarios
```

**Topology Animation**:
- Nodes light up as they process messages
- Green glow = success
- Red pulse = error detected

---

## Protocol Discovery

### What is Discovery?

Automatically identify unknown protocols by connecting to a server and analyzing its response patterns.

### How to Use

1. Click **Discovery** in the Activity Bar
2. Enter connection details:
   ```
   Host: gopher.floodgap.com
   Port: 70
   ```
3. Click **Discover**

4. The workbench will:
   - Connect to the server
   - Send probe packets
   - Analyze response structure
   - Match against known fingerprints

### Supported Protocols

Out of the box, the workbench can discover:

- **Gopher** (port 70)
- **Finger** (port 79)
- **WAIS** (port 210)
- **Archie** (port 1525)
- **HTTP** (port 80/443)
- **FTP** (port 21)

### Adding Custom Fingerprints

Create a fingerprint file in `static/fingerprints/`:

```yaml
# my-protocol.yaml
protocol:
  name: MyCustomProtocol
  
fingerprint:
  port: 5555
  initial_bytes: "\x00\x01\x02\x03"
  expected_response: "\x04\x05\x06\x07"
  
discovery:
  confidence_threshold: 0.8
  probe_timeout: 3000
```

---

## Advanced Topics

### Custom Topology Types

The workbench auto-detects topology from your spec, but you can override:

```yaml
topology:
  type: custom
  nodes:
    - id: sensor_a
      type: client
      language: rust
    - id: gateway
      type: server
      language: go
    - id: dashboard
      type: client
      language: python
  edges:
    - from: sensor_a
      to: gateway
      bidirectional: false
    - from: gateway
      to: dashboard
      bidirectional: true
```

### State Machines

Define protocol states and transitions:

```yaml
states:
  INIT:
    transitions:
      - on: CONNECT
        to: CONNECTED
        
  CONNECTED:
    transitions:
      - on: SEND_MESSAGE
        to: CONNECTED  # Stay in same state
      - on: DISCONNECT
        to: DISCONNECTED
        
  DISCONNECTED:
    transitions:
      - on: CONNECT
        to: CONNECTED
```

The generated code will enforce these state transitions at runtime.

### Custom Validation Rules

Add semantic validation beyond syntax:

```yaml
validation:
  rules:
    - field: ChatMessage.text
      constraint: length <= 1000
      message: "Message text must be under 1000 characters"
      
    - field: ChatMessage.username
      constraint: /^[a-zA-Z0-9_]+$/
      message: "Username must be alphanumeric"
```

---

## Troubleshooting

### Common Issues

#### Problem: "Syntax error in YAML"

**Solution**: Check for:
- Proper indentation (use 2 spaces, not tabs)
- Matching quotes in strings
- Colons followed by spaces

#### Problem: "Field type 'integer' not recognized"

**Solution**: Use specific types:
- Instead of `integer`, use `u32`, `i32`, `u64`, etc.
- Instead of `float`, use `f32` or `f64`

#### Problem: "Code generation failed"

**Solution**:
1. Ensure spec passed validation first
2. Check all required fields are present
3. Review console for detailed error

#### Problem: "Discovery returns no results"

**Solution**:
-  Check host/port are correct
- Ensure network connection is available
- Try increasing timeout in discovery settings
- Verify protocol is in fingerprint database

#### Problem: "Generated code won't compile"

**Solution**:
- Report this as a bug! Generated code should always compile
- Check if you're using reserved keywords as field names
- Try regenerating after clearing browser cache

---

## Tips & Tricks

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+S` | Save current spec |
| `Ctrl+G` | Generate code |
| `Ctrl+T` | Run tests |
| `Ctrl+D` | Toggle dark mode |
| `Ctrl+K` | Clear console |
| `Ctrl+/` | Toggle comment |
| `Ctrl+F` | Find in editor |

### Power User Features

#### 1. **Auto-Save**
Enable in settings to automatically save specs every 30 seconds.

#### 2. **Code Snippets**
Type `msg` and press Tab to insert a message template.

#### 3. **Export/Import**
Export your entire spec as a `.yaml` file or import existing protocols.

#### 4. **Preset Library**
Quickly load example protocols:
- Demo Chat
- IoT Sensor Network
- Legacy Banking System
- Gopher Client/Server

#### 5. **Diff View**
Compare generated code across language SDKs to ensure consistency.

#### 6. **Live Reload**
Changes to the spec automatically trigger re-validation (debounced 500ms).

### Performance Tips

- **Large protocols**: Use virtual scrolling in code viewer
- **Slow validation**: Increase debounce delay in settings
- **Heavy testing**: Reduce simulation iterations for faster feedback

---

## Video Tutorials

🎥 **Coming Soon**:
- Creating your first protocol (5 min)
- Code generation deep dive (10 min)
- Property-based testing explained (15 min)
- Advanced topology configuration (12 min)

---

## Support & Community

- 💬 **Discord**: [Join our server](https://discord.gg/protocol-resurrection)
- 📧 **Email**: support@protocolresurrection.dev
- 🐛 **Bug Reports**: [GitHub Issues](https://github.com/protocol-resurrection/workbench/issues)
- 💡 **Feature Requests**: [Discussions](https://github.com/protocol-resurrection/workbench/discussions)

---

**Happy Protocol Building!** 🚀

---

**Last Updated**: 2025-11-25  
**Version**: 2.0.0
