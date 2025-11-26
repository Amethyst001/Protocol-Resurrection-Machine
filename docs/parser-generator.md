# Parser Generator Implementation

## Overview

The Parser Generator is a core component of the Protocol Resurrection Machine that automatically generates TypeScript parser code from YAML protocol specifications. It analyzes message formats and produces efficient, type-safe parsers with comprehensive error handling.

## Implementation Summary

### Task 9.1: Parser Generation Strategy

Implemented a comprehensive strategy analyzer that:

- **Analyzes format strings** to determine the optimal parsing approach
- **Classifies parsing strategies** into three types:
  - `simple`: Fixed string validation only
  - `delimiter-based`: Split by delimiters (e.g., tab-separated fields)
  - `state-machine`: Complex formats with fixed strings and placeholders
- **Plans field extraction** based on field types and positions
- **Designs error reporting** with byte offsets and context

Key classes:
- `ParserGenerationStrategy`: Analyzes message types and determines parsing approach
- `ParsingStrategy`: Describes how to parse a specific message type
- `StateMachine`: Represents state-based parsing for complex formats

### Task 9.2: Parser Template

Created TypeScript templates for generated parsers including:

- **ParseResult<T> interface**: Standardized result type with success/error states
- **ParseError interface**: Detailed error information with byte offsets
- **Message type interfaces**: Generated from YAML field definitions
- **Parser classes**: One per message type with:
  - `parse(data: Buffer, offset?: number)`: Parse from buffer
  - `parseStream(stream: Readable)`: Async streaming parser
  - `customValidation()`: Extension point for custom validation

### Task 9.3: Parser Code Generator

Implemented complete code generation with:

#### Field Extraction
- **String fields**: Direct extraction with optional length/pattern validation
- **Number fields**: parseInt with NaN checking and range validation
- **Enum fields**: Value validation against allowed values
- **Boolean fields**: Conversion from string representations
- **Bytes fields**: Buffer creation from UTF-8 strings

#### Parsing Approaches

**Simple Parsing**:
```typescript
// For formats like: "HELLO\r\n"
- Validate fixed strings
- Extract fields until terminator
```

**Delimiter-Based Parsing**:
```typescript
// For formats like: "{type}\t{display}\t{selector}\r\n"
- Find line terminator
- Split by delimiter
- Validate field count
- Extract and convert each field
```

**State Machine Parsing**:
```typescript
// For formats like: "GET {path} HTTP/1.1\r\n"
- Match fixed string "GET "
- Extract field until next fixed string
- Match fixed string " HTTP/1.1\r\n"
```

#### Error Reporting

All parse errors include:
- **Byte offset**: Exact position where parsing failed
- **Expected format**: What the parser expected to find
- **Actual data**: What was actually encountered (truncated to 50 chars)
- **Field context**: Which field was being parsed (if applicable)

Example error:
```typescript
{
  message: "Expected terminator \"\\r\\n\" not found",
  offset: 42,
  expected: "\\r\\n",
  actual: "incomplete data...",
  fieldName: "selector"
}
```

## Generated Code Structure

For a protocol like Gopher, the generator produces:

```typescript
// Type definitions
export interface ParseResult<T> { ... }
export interface ParseError { ... }
export interface Request { selector: string; }
export interface DirectoryItem { ... }
export enum GopherItemType { ... }

// Parser for each message type
export class RequestParser {
  parse(data: Buffer, offset?: number): ParseResult<Request>
  parseStream(stream: Readable): AsyncIterableIterator<ParseResult<Request>>
  protected customValidation(message: Request): string | null
}

export class DirectoryItemParser { ... }

// Main parser combining all message parsers
export class GopherParser {
  public request: RequestParser;
  public directoryitem: DirectoryItemParser;
}
```

## Validation Features

The generated parsers include comprehensive validation:

### String Validation
- Maximum length checking
- Regex pattern matching
- Required field enforcement

### Number Validation
- Type checking (isNaN detection)
- Minimum value enforcement
- Maximum value enforcement
- Range validation

### Enum Validation
- Value membership checking
- Clear error messages listing valid values

## Performance Characteristics

- **Linear time complexity**: O(n) where n is message size
- **Buffer operations**: Uses Buffer methods instead of string concatenation
- **Streaming support**: Can parse large responses incrementally
- **Early termination**: Fails fast on invalid input

## Extension Points

Generated parsers include hooks for customization:

```typescript
protected customValidation(message: MessageType): string | null {
  // Override to add custom validation logic
  return null;
}
```

## Testing

Comprehensive test coverage includes:

1. **Unit tests**: Strategy analysis, code generation structure
2. **Integration tests**: Generated code for Gopher protocol
3. **Execution tests**: Validation, field extraction, error handling

All tests pass successfully:
- `tests/unit/parser-generator.test.ts`: 3 tests
- `tests/unit/generated-parser.test.ts`: 2 tests  
- `tests/unit/parser-execution.test.ts`: 4 tests

## Requirements Validated

This implementation satisfies:
- **Requirement 4.1**: Parse byte streams into structured message objects
- **Requirement 4.2**: Verify fixed strings in message formats
- **Requirement 4.3**: Split fields using delimiters
- **Requirement 4.4**: Extract and convert fields to appropriate types
- **Requirement 4.5**: Return descriptive errors with byte offsets

## Next Steps

The parser generator is complete and ready for integration with:
- Serializer generator (Task 10)
- Client generator (Task 12)
- Test generator (Task 14)
- Round-trip property testing (Task 11)
