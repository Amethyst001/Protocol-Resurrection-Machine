# YAML Protocol Specification Format

This document provides a complete reference for the YAML protocol specification format used by the Protocol Resurrection Machine.

## Table of Contents

1. [Overview](#overview)
2. [Protocol Metadata](#protocol-metadata)
3. [Connection Specification](#connection-specification)
4. [Message Types](#message-types)
5. [Field Definitions](#field-definitions)
6. [Type Definitions](#type-definitions)
7. [Error Handling](#error-handling)
8. [Format String Syntax](#format-string-syntax)
9. [Validation Rules](#validation-rules)
10. [Complete Examples](#complete-examples)

## Overview

A protocol specification is a YAML document with the following top-level sections:

```yaml
protocol:         # Required: Protocol metadata
connection:       # Required: Connection parameters
messageTypes:     # Required: List of message type definitions
types:            # Optional: Custom type definitions (enums, structs)
errorHandling:    # Optional: Error handling configuration
```

## Protocol Metadata

The `protocol` section defines basic information about the protocol.

### Schema

```yaml
protocol:
  name: string           # Required: Protocol name (used for generated file names)
  rfc: string            # Optional: RFC number (e.g., "1436")
  port: number           # Required: Default port number (1-65535)
  description: string    # Required: Human-readable description
  version: string        # Optional: Protocol version
```

### Example

```yaml
protocol:
  name: Gopher
  rfc: "1436"
  port: 70
  description: The Gopher protocol for hierarchical document retrieval
  version: "1.0"
```

### Validation Rules

- `name`: Must be a valid identifier (alphanumeric, hyphens, underscores)
- `port`: Must be between 1 and 65535
- `description`: Must not be empty

## Connection Specification

The `connection` section defines how clients connect to servers.

### Schema

```yaml
connection:
  type: "TCP" | "UDP"              # Required: Transport protocol
  timeout: number                  # Optional: Connection timeout in milliseconds (default: 30000)
  keepAlive: boolean               # Optional: Whether to reuse connections (default: false)
  handshake:                       # Optional: Handshake sequence
    clientSends: string            # Optional: Data client sends during handshake
    serverResponds: string         # Optional: Expected server response
    required: boolean              # Required if handshake defined
  termination:                     # Optional: Connection termination
    clientSends: string            # Optional: Data client sends to close
    serverResponds: string         # Optional: Expected server response
    closeConnection: boolean       # Required if termination defined
```

### Example

```yaml
connection:
  type: TCP
  timeout: 30000
  keepAlive: false
```

### Example with Handshake

```yaml
connection:
  type: TCP
  timeout: 30000
  keepAlive: true
  handshake:
    clientSends: "HELLO\r\n"
    serverResponds: "OK\r\n"
    required: true
  termination:
    clientSends: "QUIT\r\n"
    serverResponds: "BYE\r\n"
    closeConnection: true
```

### Validation Rules

- `type`: Must be "TCP" or "UDP"
- `timeout`: Must be positive integer
- If `handshake` is defined, `required` field is mandatory
- If `termination` is defined, `closeConnection` field is mandatory

## Message Types

The `messageTypes` section defines the structure of protocol messages.

### Schema

```yaml
messageTypes:
  - name: string                   # Required: Message type name (PascalCase)
    direction: string              # Required: "request", "response", or "bidirectional"
    format: string                 # Required: Format string with {placeholder} syntax
    delimiter: string              # Optional: Field delimiter (e.g., "\t")
    terminator: string             # Optional: Message terminator (e.g., "\r\n")
    fields:                        # Required: List of field definitions
      - name: string               # Required: Field name (camelCase)
        type: FieldType            # Required: Field type (see Field Definitions)
        required: boolean          # Required: Whether field must be present
        validation: ValidationRule # Optional: Validation constraints
        defaultValue: any          # Optional: Default value if not provided
```

### Example

```yaml
messageTypes:
  - name: Request
    direction: request
    format: "{selector}\r\n"
    terminator: "\r\n"
    fields:
      - name: selector
        type: string
        required: true
        validation:
          maxLength: 255

  - name: DirectoryItem
    direction: response
    format: "{itemType}{display}\t{selector}\t{host}\t{port}\r\n"
    delimiter: "\t"
    terminator: "\r\n"
    fields:
      - name: itemType
        type:
          kind: enum
          values: ["0", "1", "3", "7", "9"]
        required: true
      - name: display
        type: string
        required: true
      - name: selector
        type: string
        required: true
      - name: host
        type: string
        required: true
      - name: port
        type: number
        required: true
        validation:
          min: 1
          max: 65535
```

### Validation Rules

- `name`: Must be unique within the protocol
- `direction`: Must be "request", "response", or "bidirectional"
- `format`: Must contain placeholders for all defined fields
- All field names in `format` must have corresponding field definitions
- Field names must be unique within a message type

## Field Definitions

Fields define the data elements within messages.

### Field Types

#### String Type

```yaml
type: string
# OR with constraints
type:
  kind: string
  maxLength: number    # Optional: Maximum string length
```

#### Number Type

```yaml
type: number
# OR with constraints
type:
  kind: number
  min: number          # Optional: Minimum value
  max: number          # Optional: Maximum value
```

#### Boolean Type

```yaml
type: boolean
# OR
type:
  kind: boolean
```

#### Enum Type

```yaml
type:
  kind: enum
  values: [string, ...]    # List of valid values
```

#### Bytes Type

```yaml
type: bytes
# OR with length
type:
  kind: bytes
  length: number       # Optional: Fixed byte length
```

### Example Field Definitions

```yaml
fields:
  # Simple string
  - name: username
    type: string
    required: true

  # String with max length
  - name: selector
    type: string
    required: true
    validation:
      maxLength: 255

  # Number with range
  - name: port
    type: number
    required: true
    validation:
      min: 1
      max: 65535

  # Enum
  - name: itemType
    type:
      kind: enum
      values: ["0", "1", "3", "7", "9"]
    required: true

  # Optional field with default
  - name: timeout
    type: number
    required: false
    defaultValue: 30000

  # Boolean
  - name: compressed
    type: boolean
    required: false
    defaultValue: false

  # Fixed-length bytes
  - name: checksum
    type:
      kind: bytes
      length: 4
    required: true
```

## Type Definitions

The `types` section defines custom types (enums and structs) used in the protocol.

### Enum Type Definition

```yaml
types:
  - name: string              # Required: Type name (PascalCase)
    kind: enum                # Required: "enum" or "struct"
    values:                   # Required for enum
      - name: string          # Required: Enum member name (PascalCase)
        value: string|number  # Required: Actual protocol value
        description: string   # Optional: Human-readable description
```

### Struct Type Definition

```yaml
types:
  - name: string              # Required: Type name (PascalCase)
    kind: struct              # Required: "enum" or "struct"
    fields:                   # Required for struct
      - name: string          # Required: Field name
        type: FieldType       # Required: Field type
        required: boolean     # Required: Whether field must be present
        validation: ValidationRule  # Optional: Validation constraints
```

### Example Type Definitions

```yaml
types:
  # Enum type
  - name: GopherItemType
    kind: enum
    values:
      - name: TextFile
        value: "0"
        description: Plain text file
      - name: Directory
        value: "1"
        description: Directory/menu
      - name: Error
        value: "3"
        description: Error message

  # Struct type
  - name: Address
    kind: struct
    fields:
      - name: host
        type: string
        required: true
      - name: port
        type: number
        required: true
        validation:
          min: 1
          max: 65535
```

## Error Handling

The `errorHandling` section configures how the generated implementation handles errors.

### Schema

```yaml
errorHandling:
  onParseError: "return" | "throw" | "log"     # Required: Parse error handling
  onNetworkError: "return" | "throw" | "retry" # Required: Network error handling
  retryAttempts: number                        # Optional: Number of retries (default: 3)
  retryDelay: number                           # Optional: Initial retry delay in ms (default: 1000)
```

### Example

```yaml
errorHandling:
  onParseError: return      # Return error object
  onNetworkError: retry     # Retry with exponential backoff
  retryAttempts: 3          # Try up to 3 times
  retryDelay: 1000          # Start with 1 second delay
```

### Error Handling Strategies

#### onParseError

- `return`: Return a structured error object (recommended)
- `throw`: Throw an exception
- `log`: Log error and continue (use with caution)

#### onNetworkError

- `return`: Return a structured error object
- `throw`: Throw an exception
- `retry`: Retry with exponential backoff (recommended for transient errors)

### Validation Rules

- If `onNetworkError` is "retry", `retryAttempts` must be positive
- `retryDelay` must be positive integer

## Format String Syntax

Format strings define the structure of protocol messages using a template syntax.

### Syntax Elements

#### Placeholders

```
{fieldName}
```

Placeholders are replaced with field values during serialization and extracted during parsing.

**Rules**:
- Must match a field name defined in the `fields` list
- Case-sensitive
- Must be valid identifiers (alphanumeric, underscores)

#### Fixed Strings

```
HELLO
```

Fixed strings must appear exactly as written in the protocol message.

**Rules**:
- Validated during parsing
- Inserted during serialization
- Case-sensitive

#### Escape Sequences

- `\r\n`: CRLF (carriage return + line feed)
- `\n`: LF (line feed)
- `\t`: Tab character
- `\\`: Backslash
- `\{`: Literal opening brace
- `\}`: Literal closing brace

### Format String Examples

#### Simple Format

```yaml
format: "{username}\r\n"
```

Matches: `jdoe\r\n`

#### Multiple Fields with Delimiter

```yaml
format: "{host}\t{port}\r\n"
delimiter: "\t"
```

Matches: `example.com\t80\r\n`

#### Fixed Strings and Fields

```yaml
format: "GET {path} HTTP/1.0\r\n"
```

Matches: `GET /index.html HTTP/1.0\r\n`

#### Complex Format

```yaml
format: "{type}{display}\t{selector}\t{host}\t{port}\r\n"
delimiter: "\t"
terminator: "\r\n"
```

Matches: `1About\t/about\tgopher.example.com\t70\r\n`

### Format String Validation

The system validates format strings to ensure:

1. All placeholders reference defined fields
2. All defined fields appear in the format string
3. Escape sequences are valid
4. Braces are balanced (unless escaped)
5. Format is parseable (no ambiguous patterns)

## Validation Rules

Validation rules constrain field values.

### String Validation

```yaml
validation:
  pattern: string        # Optional: Regex pattern (JavaScript syntax)
  minLength: number      # Optional: Minimum string length
  maxLength: number      # Optional: Maximum string length
  custom: string         # Optional: Custom validation function name
```

### Number Validation

```yaml
validation:
  min: number           # Optional: Minimum value (inclusive)
  max: number           # Optional: Maximum value (inclusive)
  custom: string        # Optional: Custom validation function name
```

### Example Validation Rules

```yaml
fields:
  # String with regex pattern
  - name: email
    type: string
    required: true
    validation:
      pattern: "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$"

  # String with length constraints
  - name: username
    type: string
    required: true
    validation:
      minLength: 3
      maxLength: 20

  # Number with range
  - name: age
    type: number
    required: true
    validation:
      min: 0
      max: 150

  # Custom validation
  - name: customField
    type: string
    required: true
    validation:
      custom: "validateCustomField"
```

### Custom Validation Functions

Custom validation functions are defined in extension point files:

```typescript
// extensions/custom-validators.ts
export function validateCustomField(value: string): boolean {
  // Custom validation logic
  return value.startsWith('prefix-');
}
```

## Complete Examples

### Example 1: Simple Query-Response Protocol (Finger)

```yaml
protocol:
  name: Finger
  rfc: "1288"
  port: 79
  description: The Finger protocol for user information lookup

connection:
  type: TCP
  timeout: 30000
  keepAlive: false

messageTypes:
  - name: Request
    direction: request
    format: "{username}\r\n"
    terminator: "\r\n"
    fields:
      - name: username
        type: string
        required: false
        validation:
          maxLength: 512

  - name: Response
    direction: response
    format: "{text}"
    fields:
      - name: text
        type: string
        required: true

errorHandling:
  onParseError: return
  onNetworkError: retry
  retryAttempts: 3
  retryDelay: 1000
```

### Example 2: Structured Directory Protocol (Gopher)

```yaml
protocol:
  name: Gopher
  rfc: "1436"
  port: 70
  description: The Gopher protocol for hierarchical document retrieval

connection:
  type: TCP
  timeout: 30000
  keepAlive: false

messageTypes:
  - name: Request
    direction: request
    format: "{selector}\r\n"
    terminator: "\r\n"
    fields:
      - name: selector
        type: string
        required: true
        validation:
          maxLength: 255

  - name: DirectoryItem
    direction: response
    format: "{itemType}{display}\t{selector}\t{host}\t{port}\r\n"
    delimiter: "\t"
    terminator: "\r\n"
    fields:
      - name: itemType
        type:
          kind: enum
          values: ["0", "1", "3", "7", "9", "g", "I", "h", "i"]
        required: true
      - name: display
        type: string
        required: true
      - name: selector
        type: string
        required: true
      - name: host
        type: string
        required: true
      - name: port
        type: number
        required: true
        validation:
          min: 1
          max: 65535

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
      - name: Error
        value: "3"
        description: Error message
      - name: Search
        value: "7"
        description: Search query
      - name: Binary
        value: "9"
        description: Binary file
      - name: GIF
        value: "g"
        description: GIF image
      - name: Image
        value: "I"
        description: Image file
      - name: HTML
        value: "h"
        description: HTML document
      - name: Info
        value: "i"
        description: Informational text

errorHandling:
  onParseError: return
  onNetworkError: retry
  retryAttempts: 3
  retryDelay: 1000
```

### Example 3: Protocol with Handshake

```yaml
protocol:
  name: CustomProtocol
  port: 8080
  description: Example protocol with handshake

connection:
  type: TCP
  timeout: 30000
  keepAlive: true
  handshake:
    clientSends: "HELLO v1.0\r\n"
    serverResponds: "OK\r\n"
    required: true
  termination:
    clientSends: "QUIT\r\n"
    serverResponds: "BYE\r\n"
    closeConnection: true

messageTypes:
  - name: Command
    direction: request
    format: "{action} {target}\r\n"
    terminator: "\r\n"
    fields:
      - name: action
        type:
          kind: enum
          values: ["GET", "PUT", "DELETE"]
        required: true
      - name: target
        type: string
        required: true

  - name: Response
    direction: response
    format: "{status} {message}\r\n"
    terminator: "\r\n"
    fields:
      - name: status
        type: number
        required: true
        validation:
          min: 100
          max: 599
      - name: message
        type: string
        required: true

errorHandling:
  onParseError: return
  onNetworkError: retry
  retryAttempts: 3
  retryDelay: 1000
```

## Best Practices

### 1. Use Descriptive Names

```yaml
# Good
- name: DirectoryItem
  fields:
    - name: displayText
    - name: selectorPath

# Avoid
- name: Item
  fields:
    - name: text
    - name: path
```

### 2. Document with Comments

```yaml
# Request message sent by clients to query user information
- name: Request
  direction: request
  format: "{username}\r\n"
  fields:
    - name: username
      type: string
      required: false  # Empty username queries all users
```

### 3. Use Appropriate Validation

```yaml
# Good: Specific constraints
- name: port
  type: number
  required: true
  validation:
    min: 1
    max: 65535

# Avoid: No validation when constraints exist
- name: port
  type: number
  required: true
```

### 4. Define Enums for Fixed Values

```yaml
# Good: Enum for item types
- name: itemType
  type:
    kind: enum
    values: ["0", "1", "3", "7", "9"]
  required: true

# Avoid: String without constraints
- name: itemType
  type: string
  required: true
```

### 5. Use Consistent Terminators

```yaml
# Good: Consistent CRLF
messageTypes:
  - name: Request
    format: "{selector}\r\n"
    terminator: "\r\n"
  - name: Response
    format: "{data}\r\n"
    terminator: "\r\n"

# Avoid: Mixing terminators
messageTypes:
  - name: Request
    format: "{selector}\r\n"
    terminator: "\r\n"
  - name: Response
    format: "{data}\n"
    terminator: "\n"
```

## Validation and Error Messages

When the Protocol Resurrection Machine validates your YAML specification, it checks for:

1. **Syntax errors**: Invalid YAML syntax
2. **Schema violations**: Missing required fields, wrong types
3. **Semantic errors**: Undefined field references, circular dependencies
4. **Format string errors**: Invalid placeholders, unbalanced braces

Error messages include:
- File location (line and column)
- Error description
- Expected format
- Actual value
- Suggested fix

Example error:
```
[VALIDATION] Error in protocols/example.yaml: Missing required field
Location: protocols/example.yaml:15:3
Expected: Field 'type' in connection specification
Actual: undefined
Suggestion: Add 'type: TCP' or 'type: UDP' to connection section
```

## Next Steps

- See `protocols/gopher.yaml` and `protocols/finger.yaml` for complete examples
- Read `docs/architecture.md` for system architecture details
- Check `.kiro/specs/protocol-resurrection-machine/` for requirements and design
- Run `pnpm prm validate <yaml-file>` to validate your specification
