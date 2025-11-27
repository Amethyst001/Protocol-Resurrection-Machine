---
inclusion: fileMatch
fileMatchPattern: "protocols/*.yaml"
---

# YAML Protocol Specification Format

This document defines the YAML format for describing network protocols in the Protocol Resurrection Machine.

## Complete YAML Schema

```yaml
protocol:
  name: string              # Protocol name (e.g., "Gopher", "Finger")
  rfc: string              # RFC reference (e.g., "RFC 1436") [optional]
  port: number             # Default port number (e.g., 70, 79)
  description: string      # Human-readable description
  version: string          # Protocol version [optional]

connection:
  type: "TCP" | "UDP"      # Connection type
  handshake:               # Handshake specification [optional]
    clientSends: string    # What client sends first [optional]
    serverResponds: string # Expected server response [optional]
    required: boolean      # Whether handshake is required
  termination:             # Connection termination [optional]
    clientSends: string    # Termination message from client [optional]
    serverResponds: string # Expected server response [optional]
    closeConnection: boolean
  timeout: number          # Connection timeout in milliseconds [optional]
  keepAlive: boolean       # Whether to keep connection alive [optional]

messageTypes:              # Array of message type definitions
  - name: string           # Message type name (e.g., "request", "response")
    direction: "request" | "response" | "bidirectional"
    format: string         # Format string with {placeholder} syntax
    fields:                # Array of field definitions
      - name: string       # Field name (must match placeholder in format)
        type: string       # Field type (see Field Types below)
        required: boolean  # Whether field is required
        validation:        # Validation rules [optional]
          pattern: string  # Regex pattern [optional]
          minLength: number [optional]
          maxLength: number [optional]
          min: number      # Minimum value for numbers [optional]
          max: number      # Maximum value for numbers [optional]
        defaultValue: any  # Default value if not provided [optional]
    delimiter: string      # Field delimiter (e.g., "\t") [optional]
    terminator: string     # Message terminator (e.g., "\r\n") [optional]

types:                     # Custom type definitions [optional]
  - name: string           # Type name
    kind: "enum" | "struct"
    values:                # For enums
      - name: string       # Enum value name
        value: string | number
        description: string [optional]
    fields:                # For structs
      - [same as messageTypes.fields]

errorHandling:             # Error handling configuration [optional]
  onParseError: "throw" | "return" | "log"
  onNetworkError: "throw" | "retry" | "return"
  retryAttempts: number    # Number of retry attempts [optional]
  retryDelay: number       # Delay between retries in ms [optional]
```

## Field Types

Supported field types:

- `string` - Text field
- `number` - Numeric field (integer or float)
- `boolean` - Boolean field
- `bytes` - Raw byte sequence
- `enum:TypeName` - Reference to enum type defined in `types` section

## Format String Syntax

Format strings use `{placeholder}` syntax to indicate variable fields:

- `{fieldName}` - Insert field value
- Fixed text outside placeholders is matched literally
- Use `\r\n` for CRLF, `\n` for LF, `\t` for tab

Examples:
```yaml
format: "{selector}\r\n"                                    # Simple request
format: "{type}{display}\t{selector}\t{host}\t{port}\r\n"  # Delimited fields
format: "GET {path} HTTP/1.1\r\nHost: {host}\r\n\r\n"      # HTTP-style
```

## Complete Example: Gopher Protocol

```yaml
protocol:
  name: "Gopher"
  rfc: "RFC 1436"
  port: 70
  description: "The Internet Gopher Protocol - a distributed document search and retrieval protocol"
  version: "1.0"

connection:
  type: "TCP"
  timeout: 30000
  keepAlive: false
  termination:
    closeConnection: true

messageTypes:
  - name: "request"
    direction: "request"
    format: "{selector}\r\n"
    fields:
      - name: "selector"
        type: "string"
        required: true
        validation:
          maxLength: 255
    terminator: "\r\n"

  - name: "directoryItem"
    direction: "response"
    format: "{type}{display}\t{selector}\t{host}\t{port}\r\n"
    fields:
      - name: "type"
        type: "enum:GopherItemType"
        required: true
      - name: "display"
        type: "string"
        required: true
        validation:
          maxLength: 70
      - name: "selector"
        type: "string"
        required: true
      - name: "host"
        type: "string"
        required: true
      - name: "port"
        type: "number"
        required: true
        validation:
          min: 1
          max: 65535
    delimiter: "\t"
    terminator: "\r\n"

types:
  - name: "GopherItemType"
    kind: "enum"
    values:
      - name: "TextFile"
        value: "0"
        description: "Text file"
      - name: "Directory"
        value: "1"
        description: "Directory/menu"
      - name: "CSO"
        value: "2"
        description: "CSO phone-book server"
      - name: "Error"
        value: "3"
        description: "Error"
      - name: "BinHex"
        value: "4"
        description: "BinHexed Macintosh file"
      - name: "DOSArchive"
        value: "5"
        description: "DOS binary archive"
      - name: "UUEncoded"
        value: "6"
        description: "Unix uuencoded file"
      - name: "Search"
        value: "7"
        description: "Index-Search server"
      - name: "Telnet"
        value: "8"
        description: "Telnet session"
      - name: "Binary"
        value: "9"
        description: "Binary file"
      - name: "GIF"
        value: "g"
        description: "GIF image"
      - name: "Image"
        value: "I"
        description: "Image file"
      - name: "HTML"
        value: "h"
        description: "HTML file"

errorHandling:
  onParseError: "return"
  onNetworkError: "retry"
  retryAttempts: 3
  retryDelay: 1000
```

## Complete Example: Finger Protocol

```yaml
protocol:
  name: "Finger"
  rfc: "RFC 1288"
  port: 79
  description: "The Finger User Information Protocol"

connection:
  type: "TCP"
  timeout: 30000
  keepAlive: false

messageTypes:
  - name: "request"
    direction: "request"
    format: "{username}\r\n"
    fields:
      - name: "username"
        type: "string"
        required: false
        validation:
          maxLength: 255
          pattern: "^[a-zA-Z0-9._-]*$"
        defaultValue: ""
    terminator: "\r\n"

  - name: "response"
    direction: "response"
    format: "{text}"
    fields:
      - name: "text"
        type: "string"
        required: true

errorHandling:
  onParseError: "return"
  onNetworkError: "return"
```

## Validation Rules

When creating YAML specs, ensure:

1. **All placeholders in format strings** have corresponding field definitions
2. **Enum references** (e.g., `enum:GopherItemType`) match defined type names
3. **Port numbers** are between 1 and 65535
4. **Connection type** is either "TCP" or "UDP"
5. **Message direction** is "request", "response", or "bidirectional"
6. **Required fields** are marked appropriately
7. **Validation constraints** are reasonable (e.g., maxLength > minLength)

## Common Patterns

### Simple Request-Response Protocol
```yaml
messageTypes:
  - name: "request"
    direction: "request"
    format: "{query}\r\n"
    # ...
  - name: "response"
    direction: "response"
    format: "{result}"
    # ...
```

### Protocol with Handshake
```yaml
connection:
  type: "TCP"
  handshake:
    clientSends: "HELLO\r\n"
    serverResponds: "OK\r\n"
    required: true
```

### Delimited Fields
```yaml
format: "{field1}\t{field2}\t{field3}\r\n"
delimiter: "\t"
terminator: "\r\n"
```

### Optional Fields with Defaults
```yaml
fields:
  - name: "username"
    type: "string"
    required: false
    defaultValue: ""
```

## Tips for Writing YAML Specs

1. **Start with protocol metadata** - name, RFC, port, description
2. **Define connection type** - TCP or UDP
3. **List all message types** - requests and responses
4. **Use clear field names** - they become variable names in generated code
5. **Add validation rules** - they become runtime checks
6. **Define enums for codes** - makes generated code more readable
7. **Include descriptions** - they appear in generated documentation
8. **Test incrementally** - validate YAML before generating code

## Getting Help

If you're unsure about the format:
1. Look at example specs in `protocols/` directory
2. Run `validate` command to check your YAML
3. Check error messages - they include suggestions for fixes
4. Refer to the RFC for the protocol you're implementing
