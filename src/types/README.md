# Core Type Definitions

This directory contains all core type definitions for the Protocol Resurrection Machine.

## Files

### protocol-spec.ts
Defines the structure of YAML protocol specifications:
- `ProtocolSpec` - Complete protocol specification
- `ProtocolMetadata` - Protocol metadata (name, RFC, port, description)
- `ConnectionSpec` - Connection behavior (TCP/UDP, handshake, termination)
- `MessageType` - Message type definitions with format strings
- `FieldDefinition` - Field definitions with types and validation
- `FieldType` - Discriminated union of field types (string, number, boolean, enum, bytes)
- `ValidationRule` - Field validation constraints
- `TypeDefinition` - Custom type definitions (enums and structs)
- `EnumValue` - Enumeration value definition
- `EnumDefinition` - Enumeration type definition
- `StructDefinition` - Struct type definition
- `ErrorHandlingSpec` - Error handling configuration

### errors.ts
Defines error types for the system:
- `PRMError` - Base error class
- `YAMLParseError` - YAML parsing errors
- `ValidationError` - Validation errors
- `GenerationError` - Code generation errors
- `ProtocolParseError` - Protocol message parsing errors (for generated parsers)
- `ProtocolSerializeError` - Protocol message serialization errors (for generated serializers)
- `NetworkError` - Network errors (for generated clients)

### results.ts
Defines result types for operations:
- `Result<T, E>` - Generic result type (Success | Failure)
- `ValidationResult` - YAML validation result with errors and warnings
- `ValidationError` - Detailed validation error information
- `ValidationWarning` - Validation warning information
- `ParseResult<T>` - Protocol message parse result
- `ParseError` - Parse error with byte offset and context
- `SerializeResult` - Protocol message serialize result
- `SerializeError` - Serialize error with field information

### guards.ts
Type guards and validation utilities:
- `isProtocolSpec()` - Type guard for ProtocolSpec
- `isProtocolMetadata()` - Type guard for ProtocolMetadata
- `isConnectionSpec()` - Type guard for ConnectionSpec
- `isMessageType()` - Type guard for MessageType
- `isFieldDefinition()` - Type guard for FieldDefinition
- `isFieldType()` - Type guard for FieldType
- `isTypeDefinition()` - Type guard for TypeDefinition
- `isEnumDefinition()` - Type guard for EnumDefinition
- `isStructDefinition()` - Type guard for StructDefinition
- `isEnumValue()` - Type guard for EnumValue
- `isValidConnectionType()` - Validates connection type strings
- `isValidPort()` - Validates port numbers
- `isValidMessageDirection()` - Validates message direction strings

### index.ts
Re-exports all types for convenient importing.

### examples.ts
Example usage demonstrating all types:
- `gopherProtocolSpec` - Complete Gopher protocol specification
- `fingerProtocolSpec` - Complete Finger protocol specification
- `allFieldTypesExample` - Example showing all field types
- `structExample` - Example struct type definition

## Task Requirements Coverage

This implementation satisfies all requirements from task 2:

✅ **Define ProtocolSpec interface and all related types**
- `ProtocolSpec` with `protocol`, `connection`, `messageTypes`, `types`, `errorHandling`
- `ProtocolMetadata` with name, RFC, port, description, version
- All related types properly defined

✅ **Define MessageType, FieldDefinition, ConnectionSpec interfaces**
- `MessageType` with name, direction, format, fields, delimiter, terminator
- `FieldDefinition` with name, type, required, validation, defaultValue
- `ConnectionSpec` with type, handshake, termination, timeout, keepAlive

✅ **Define ValidationResult, ParseResult, SerializeResult types**
- `ValidationResult` with valid flag, errors array, warnings
- `ParseResult<T>` with success flag, message, error, bytesConsumed
- `SerializeResult` with success flag, data, error

✅ **Define error types (ParseError, ValidationError, GenerationError)**
- `ParseError` with message, offset, expected, actual, context
- `ValidationError` with type, message, path, line, column, fieldPath, expected, actual, suggestion
- `GenerationError` with message, phase, artifact, context
- Plus additional error types: `YAMLParseError`, `ProtocolParseError`, `ProtocolSerializeError`, `NetworkError`

✅ **Create type guards and validation utilities**
- Type guards for all major types
- Validation utilities for connection types, ports, message directions
- All type guards properly check structure and required fields

## Design Document Alignment

All types match the design document specifications in `.kiro/specs/protocol-resurrection-machine/design.md`:
- Data models section (lines 400-600)
- Component interfaces section
- Error handling section

## Requirements Alignment

Satisfies requirements from `.kiro/specs/protocol-resurrection-machine/requirements.md`:
- Requirement 1.1, 1.2, 1.3, 1.4: YAML Protocol Specification Format
- Requirement 2.1, 2.2, 2.3, 2.4: YAML Validation and Schema Compliance
- All error types support detailed error reporting as specified

## Usage Example

```typescript
import {
  ProtocolSpec,
  isProtocolSpec,
  isValidPort,
} from './types/index.js';

// Create a protocol specification
const spec: ProtocolSpec = {
  protocol: {
    name: 'MyProtocol',
    port: 8080,
    description: 'My custom protocol',
  },
  connection: {
    type: 'TCP',
  },
  messageTypes: [
    {
      name: 'Request',
      direction: 'request',
      format: '{command}\\r\\n',
      fields: [
        {
          name: 'command',
          type: { kind: 'string' },
          required: true,
        },
      ],
    },
  ],
};

// Validate the specification
if (isProtocolSpec(spec)) {
  console.log('Valid protocol specification');
}

// Validate port
if (isValidPort(spec.protocol.port)) {
  console.log('Valid port number');
}
```
