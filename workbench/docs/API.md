# API Documentation

> Complete reference for the Protocol Workbench API

---

## Table of Contents

- [Validation API](#validation-api)
- [Code Generation API](#code-generation-api)
- [Testing API](#testing-api)
- [Discovery API](#discovery-api)
- [SDK Usage](#sdk-usage)
- [Error Handling](#error-handling)
- [Best Practices](#best-practices)

---

## Validation API

### `POST /api/validate`

Validates a protocol YAML specification.

#### Request

```typescript
interface ValidateRequest {
  yamlContent: string;
}
```

**Example**:
```bash
curl -X POST http://localhost:5173/api/validate \
  -H "Content-Type: application/json" \
  -d '{"yamlContent": "protocol:\n  name: MyProtocol\n  version: 1.0"}'
```

#### Response

```typescript
interface ValidateResponse {
  valid: boolean;
  diagnostics: Diagnostic[];
  ast?: ProtocolAST;
}

interface Diagnostic {
  line: number;
  column: number;
  severity: 'error' | 'warning' | 'info';
  message: string;
}
```

**Success Example**:
```json
{
  "valid": true,
  "diagnostics": [],
  "ast": {
    "protocol": {
      "name": "MyProtocol",
      "version": "1.0"
    }
  }
}
```

**Error Example**:
```json
{
  "valid": false,
  "diagnostics": [
    {
      "line": 3,
      "column": 5,
      "severity": "error",
      "message": "Missing required field 'messages'"
    }
  ]
}
```

---

## Code Generation API

### `POST /api/generate`

Generates SDK code in multiple languages from a validated specification.

#### Request

```typescript
interface GenerateRequest {
  yamlContent: string;
  languages?: ('typescript' | 'python' | 'go' | 'rust')[];
}
```

**Example**:
```typescript
const response = await fetch('/api/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    yamlContent: spec,
    languages: ['typescript', 'python']
  })
});
```

#### Response

```typescript
interface GenerateResponse {
  success: boolean;
  code: {
    typescript?: string;
    python?: string;
    go?: string;
    rust?: string;
  };
  error?: string;
}
```

**Example**:
```json
{
  "success": true,
  "code": {
    "typescript": "// Generated TypeScript SDK\ninterface MyProtocol {...}",
    "python": "# Generated Python SDK\nclass MyProtocol: ..."
  }
}
```

---

## Testing API

### `POST /api/test/pbt`

Runs property-based tests on generated code.

#### Request

```typescript
interface PBTRequest {
  yamlContent: string;
  scenario?: string;
  iterations?: number;
}
```

**Example**:
```typescript
await fetch('/api/test/pbt', {
  method: 'POST',
  body: JSON.stringify({
    yamlContent: spec,
    scenario: 'happy_path',
    iterations: 100
  })
});
```

#### Response

```typescript
interface PBTResponse {
  success: boolean;
  results: {
    passed: number;
    failed: number;
    coverage: number;
  };
  logs: string[];
  failures?: TestFailure[];
}

interface TestFailure {
  scenario: string;
  input: any;
  expected: any;
  actual: any;
  message: string;
}
```

---

## Discovery API

### `POST /api/discover`

Discovers legacy protocols by fingerprinting network traffic.

#### Request

```typescript
interface DiscoverRequest {
  host: string;
  port: number;
  timeout?: number;
}
```

**Example**:
```typescript
const result = await fetch('/api/discover', {
  method: 'POST',
  body: JSON.stringify({
    host: 'gopher.floodgap.com',
    port: 70,
    timeout: 5000
  })
});
```

#### Response

```typescript
interface DiscoverResponse {
  discovered: boolean;
  protocol?: string;
  confidence: number;
  fingerprint?: {
    pattern: string;
    metadata: Record<string, any>;
  };
}
```

---

## SDK Usage

### Generated TypeScript SDK

```typescript
import { MyProtocolClient } from './generated/typescript';

const client = new MyProtocolClient({
  host: 'localhost',
  port: 8080
});

// Send a message
await client.send({
  type: 'REQUEST',
  payload: { action: 'getData' }
});

// Receive response
const response = await client.receive();
```

### Generated Python SDK

```python
from generated.python import MyProtocolClient

async def main():
    client = MyProtocolClient(host='localhost', port=8080)
    
    # Send message
    await client.send({
        'type': 'REQUEST',
        'payload': {'action': 'getData'}
    })
    
    # Receive response
    response = await client.receive()
```

### Generated Go SDK

```go
package main

import "generated/go/myprotocol"

func main() {
    client := myprotocol.NewClient("localhost", 8080)
    
    // Send message
    client.Send(myprotocol.Message{
        Type: "REQUEST",
        Payload: map[string]interface{}{
            "action": "getData",
        },
    })
    
    // Receive response
    response, err := client.Receive()
}
```

### Generated Rust SDK

```rust
use generated::rust::MyProtocolClient;

#[tokio::main]
async fn main() {
    let mut client = MyProtocolClient::new("localhost", 8080);
    
    // Send message
    client.send(Message {
        msg_type: "REQUEST".to_string(),
        payload: serde_json::json!({"action": "getData"}),
    }).await?;
    
    // Receive response
    let response = client.receive().await?;
}
```

---

## Error Handling

### Common Error Codes

| Code | Message | Solution |
|------|---------|----------|
| `YAML_PARSE_ERROR` | Invalid YAML syntax | Check YAML formatting |
| `VALIDATION_ERROR` | Schema validation failed | Review required fields |
| `GENERATION_ERROR` | Code generation failed | Check spec completeness |
| `NETWORK_ERROR` | Discovery connection failed | Verify host/port |
| `TIMEOUT_ERROR` | Operation timed out | Increase timeout value |

### Error Response Format

```typescript
interface ErrorResponse {
  error: string;
  code: string;
  details?: any;
}
```

**Example**:
```json
{
  "error": "Invalid protocol specification",
  "code": "VALIDATION_ERROR",
  "details": {
    "field": "messages.RequestMessage.fields",
    "issue": "Missing required type annotation"
  }
}
```

---

## Best Practices

### 1. **Always Validate Before Generating**
```typescript
// ✅ Good
const validation = await validate(spec);
if (validation.valid) {
  const code = await generate(spec);
}

// ❌ Bad
const code = await generate(spec); // May fail unexpectedly
```

### 2. **Use Type Guards**
```typescript
function isValidResponse(response: any): response is ValidateResponse {
  return response && typeof response.valid === 'boolean';
}
```

### 3. **Handle Async Errors**
```typescript
try {
  const result = await fetch('/api/generate', {...});
  const data = await result.json();
} catch (error) {
  console.error('Generation failed:', error);
  toast.error('Failed to generate code');
}
```

### 4. **Debounce Validation Calls**
```typescript
const debouncedValidate = debounce(async (yaml: string) => {
  await fetch('/api/validate', {
    method: 'POST',
    body: JSON.stringify({ yamlContent: yaml })
  });
}, 500);
```

### 5. **Cache Generated Code**
```typescript
const codeCache = new Map<string, GeneratedCode>();

async function getOrGenerateCode(spec: string) {
  if (codeCache.has(spec)) {
    return codeCache.get(spec)!;
  }
  
  const code = await generate(spec);
  codeCache.set(spec, code);
  return code;
}
```

---

## Type Definitions

### Complete TypeScript Types

```typescript
// Core types
export interface ProtocolSpec {
  protocol: {
    name: string;
    version: string;
    description?: string;
  };
  messages: Record<string, MessageType>;
  states?: Record<string, State>;
  topology?: TopologyConfig;
}

export interface MessageType {
  fields: Field[];
  format?: string;
}

export interface Field {
  name: string;
  type: string;
  optional?: boolean;
  default?: any;
}

export interface State {
  transitions: Transition[];
}

export interface Transition {
  from: string;
  to: string;
  on: string;
}

export interface TopologyConfig {
  type: 'mesh' | 'star' | 'pipeline' | 'generic';
  nodes: Node[];
  edges: Edge[];
}

export interface Node {
  id: string;
  type: 'client' | 'server' | 'gateway' | 'sensor';
  language?: 'typescript' | 'python' | 'go' | 'rust';
}

export interface Edge {
  from: string;
  to: string;
  bidirectional?: boolean;
}
```

---

## Migration Guides

### Upgrading from v1.x to v2.x

**Breaking Changes**:
1. `/api/validate` now returns `diagnostics` instead of `errors`
2. Field type syntax changed from `type: integer` to `type: u32`
3. Topology config moved to top-level key

**Migration Steps**:
```diff
  protocol:
    name: MyProtocol
    version: 2.0
  messages:
    Request:
      fields:
-       - name: id, type: integer
+       - name: id, type: u32
+ topology:
+   type: mesh
```

---

## Rate Limiting

All API endpoints are rate-limited to **60 requests per minute** per IP address.

**Response Headers**:
```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1640000000
```

---

## Support

- 📧 Email: support@protocolresurrection.dev
- 💬 Discord: [Join our community](https://discord.gg/protocol-resurrection)
- 🐛 Issues: [GitHub Issues](https://github.com/protocol-resurrection/workbench/issues)

---

**Last Updated**: 2025-11-25  
**API Version**: 2.0.0
