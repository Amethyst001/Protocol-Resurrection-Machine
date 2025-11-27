# MCP Server Generation Patterns

This document defines best practices for generating Model Context Protocol (MCP) servers from protocol specifications.

## Tool Naming Conventions

MCP tools should follow this naming pattern:
```
{protocol}_{operation}
```

Examples:
- `gopher_query` - Query a Gopher server
- `finger_lookup` - Look up user information via Finger
- `whois_domain_lookup` - Look up domain information via WHOIS
- `gemini_fetch` - Fetch a Gemini document

### Naming Rules
- Use lowercase with underscores (snake_case)
- Start with protocol name
- Use descriptive operation verbs (query, fetch, lookup, send, list)
- Keep names concise but clear
- Avoid redundancy (not `gopher_gopher_query`)

## JSON Schema Generation

### Input Schema
Generate JSON schemas that match the protocol's request parameters:

```typescript
{
  "type": "object",
  "properties": {
    "host": {
      "type": "string",
      "description": "The Gopher server hostname"
    },
    "port": {
      "type": "integer",
      "default": 70,
      "description": "The Gopher server port"
    },
    "selector": {
      "type": "string",
      "description": "The resource selector path"
    }
  },
  "required": ["host", "selector"]
}
```

### Schema Rules
- Include descriptions for all properties
- Mark required fields explicitly
- Provide sensible defaults (e.g., port 70 for Gopher)
- Use appropriate JSON types (string, integer, boolean, array, object)
- Add constraints (minimum, maximum, pattern, enum) from YAML spec
- Include examples in descriptions when helpful

### Output Schema
For tools that return structured data, define output schemas:

```typescript
{
  "type": "object",
  "properties": {
    "items": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "type": { "type": "string" },
          "display": { "type": "string" },
          "selector": { "type": "string" },
          "host": { "type": "string" },
          "port": { "type": "integer" }
        }
      }
    }
  }
}
```

## Tool Handler Implementation

### Basic Structure
```typescript
async function handleGopherQuery(args: {
  host: string;
  port?: number;
  selector: string;
}): Promise<ToolResponse> {
  try {
    // 1. Validate inputs
    validateInputs(args);
    
    // 2. Use generated parser/serializer
    const client = new GopherClient();
    const response = await client.query(args.host, args.port ?? 70, args.selector);
    
    // 3. Format response for MCP
    return {
      content: [
        {
          type: "text",
          text: formatGopherResponse(response)
        }
      ]
    };
  } catch (error) {
    // 4. Handle errors in MCP format
    return {
      content: [
        {
          type: "text",
          text: `Error: ${error.message}`
        }
      ],
      isError: true
    };
  }
}
```

### Handler Rules
- Always validate inputs before processing
- Reuse generated parser/serializer code - don't duplicate logic
- Return structured MCP responses
- Handle errors gracefully with descriptive messages
- Include timeout handling (default 30 seconds)
- Log errors for debugging
- Support cancellation when possible

## Error Handling in MCP Format

### Error Response Structure
```typescript
{
  content: [
    {
      type: "text",
      text: "Error: Connection timeout after 30 seconds"
    }
  ],
  isError: true
}
```

### Error Categories
1. **Validation Errors** - Invalid input parameters
   ```
   Error: Invalid port number: must be between 1 and 65535
   ```

2. **Network Errors** - Connection failures, timeouts
   ```
   Error: Failed to connect to gopher.example.com:70 - connection refused
   ```

3. **Protocol Errors** - Malformed responses, parsing failures
   ```
   Error: Invalid Gopher response at byte 42: expected tab delimiter
   ```

4. **Application Errors** - Resource not found, access denied
   ```
   Error: Resource not found: /nonexistent
   ```

### Error Message Guidelines
- Start with "Error: " prefix
- Be specific about what went wrong
- Include relevant context (host, port, selector)
- Suggest fixes when possible
- Don't expose sensitive information (credentials, internal paths)

## Tool Registration

### Server Configuration
```typescript
const server = new Server(
  {
    name: "protocol-resurrection-machine",
    version: "1.0.0"
  },
  {
    capabilities: {
      tools: {}
    }
  }
);

// Register tools
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "gopher_query",
      description: "Query a Gopher server for directory listings or text files",
      inputSchema: gopherQuerySchema
    },
    {
      name: "finger_lookup",
      description: "Look up user information via the Finger protocol",
      inputSchema: fingerLookupSchema
    }
  ]
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  
  switch (name) {
    case "gopher_query":
      return handleGopherQuery(args);
    case "finger_lookup":
      return handleFingerLookup(args);
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
});
```

### Registration Rules
- Register all tools in ListToolsRequestSchema handler
- Provide clear, concise descriptions
- Include input schemas for all tools
- Handle unknown tools gracefully
- Use switch/case for tool routing
- Keep tool list organized alphabetically

## Configuration File Generation

### MCP Server Config
Generate a `.mcp.json` configuration file:

```json
{
  "mcpServers": {
    "protocol-resurrection-machine": {
      "command": "node",
      "args": ["dist/mcp-server.js"],
      "env": {
        "LOG_LEVEL": "info"
      }
    }
  }
}
```

### Config Rules
- Use descriptive server names
- Provide correct command and args for execution
- Include environment variables for configuration
- Document required environment variables
- Provide sensible defaults

## Performance Optimization

### Connection Pooling
```typescript
class ConnectionPool {
  private connections = new Map<string, Connection>();
  
  async getConnection(host: string, port: number): Promise<Connection> {
    const key = `${host}:${port}`;
    let conn = this.connections.get(key);
    
    if (!conn || !conn.isAlive()) {
      conn = await createConnection(host, port);
      this.connections.set(key, conn);
    }
    
    return conn;
  }
}
```

### Caching
```typescript
class ResponseCache {
  private cache = new Map<string, { data: any; timestamp: number }>();
  private ttl = 60000; // 1 minute
  
  get(key: string): any | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data;
  }
  
  set(key: string, data: any): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }
}
```

### Performance Rules
- Reuse connections when protocol supports it
- Cache responses when appropriate (with TTL)
- Implement request timeouts
- Use streaming for large responses
- Limit concurrent connections
- Clean up resources properly

## Security Considerations

### Input Validation
```typescript
function validateHost(host: string): void {
  // Prevent SSRF attacks
  if (host.match(/^(localhost|127\.|10\.|172\.(1[6-9]|2[0-9]|3[01])\.|192\.168\.)/)) {
    throw new Error("Access to private networks is not allowed");
  }
  
  // Validate hostname format
  if (!host.match(/^[a-zA-Z0-9.-]+$/)) {
    throw new Error("Invalid hostname format");
  }
}

function validatePort(port: number): void {
  if (port < 1 || port > 65535) {
    throw new Error("Port must be between 1 and 65535");
  }
  
  // Optionally restrict to non-privileged ports
  if (port < 1024) {
    throw new Error("Access to privileged ports is not allowed");
  }
}
```

### Security Rules
- Validate all inputs before use
- Prevent SSRF attacks (block private IPs)
- Sanitize user-provided data
- Implement rate limiting
- Use timeouts to prevent DoS
- Don't expose internal errors to users
- Log security-relevant events

## Testing MCP Servers

### Unit Tests
```typescript
describe('gopher_query tool', () => {
  it('should query Gopher server successfully', async () => {
    const response = await handleGopherQuery({
      host: 'gopher.example.com',
      port: 70,
      selector: '/'
    });
    
    expect(response.content).toBeDefined();
    expect(response.isError).toBeFalsy();
  });
  
  it('should handle connection errors', async () => {
    const response = await handleGopherQuery({
      host: 'nonexistent.example.com',
      port: 70,
      selector: '/'
    });
    
    expect(response.isError).toBe(true);
    expect(response.content[0].text).toContain('Error:');
  });
});
```

### Integration Tests
```typescript
describe('MCP server integration', () => {
  let server: Server;
  
  beforeEach(() => {
    server = createMCPServer();
  });
  
  it('should list all available tools', async () => {
    const response = await server.request({
      method: 'tools/list'
    });
    
    expect(response.tools).toContainEqual(
      expect.objectContaining({ name: 'gopher_query' })
    );
  });
  
  it('should execute tool successfully', async () => {
    const response = await server.request({
      method: 'tools/call',
      params: {
        name: 'gopher_query',
        arguments: {
          host: 'gopher.example.com',
          selector: '/'
        }
      }
    });
    
    expect(response.content).toBeDefined();
  });
});
```

### Testing Rules
- Test each tool handler independently
- Test error handling paths
- Test input validation
- Test MCP protocol compliance
- Test with real protocol servers when possible
- Mock network calls for unit tests
- Use integration tests for end-to-end validation

## Documentation Generation

### Tool Documentation
Generate markdown documentation for each tool:

```markdown
# Gopher Query Tool

## Name
`gopher_query`

## Description
Query a Gopher server for directory listings or text files.

## Parameters
- `host` (string, required): The Gopher server hostname
- `port` (integer, optional): The Gopher server port (default: 70)
- `selector` (string, required): The resource selector path

## Returns
A directory listing or text content from the Gopher server.

## Example
\`\`\`json
{
  "host": "gopher.floodgap.com",
  "port": 70,
  "selector": "/"
}
\`\`\`

## Errors
- Connection timeout after 30 seconds
- Invalid hostname or port
- Protocol parsing errors
```

### Documentation Rules
- Document all tools in README
- Include parameter descriptions
- Provide usage examples
- Document error conditions
- Link to protocol specifications
- Keep documentation in sync with code

