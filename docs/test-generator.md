# Test Generator Documentation

## Overview

The Test Generator is a component of the Protocol Resurrection Machine that automatically generates property-based tests for protocol implementations. It creates comprehensive test suites that verify the correctness of generated parsers, serializers, and other protocol components.

## Features

### 1. Fast-check Arbitraries Generation

The test generator creates smart arbitraries (random data generators) for each message type in a protocol specification:

- **String fields**: Generates strings with appropriate length constraints and filters out protocol-breaking characters (tabs, CR, LF)
- **Number fields**: Generates integers within specified min/max ranges
- **Enum fields**: Generates values from the valid enumeration set
- **Boolean fields**: Generates true/false values
- **Bytes fields**: Generates Buffer objects with appropriate lengths

### 2. Round-Trip Property Tests

Generates tests that verify the fundamental property: `parse(serialize(message)) == message`

These tests:
- Run 100+ iterations with random valid messages
- Verify that serialization and parsing are inverse operations
- Catch bugs in both parser and serializer implementations
- Reference Property 7 from the design document
- Validate Requirements 4.1, 4.2, 4.3, 4.4, 5.1, 5.2, 5.3, 5.4, 6.1

### 3. Parser Error Handling Tests

Generates tests that verify parsers handle malformed input correctly:

- Feed random byte sequences to the parser
- Verify that errors include required fields (message, offset, expected, actual)
- Ensure parsers fail gracefully on invalid input
- Reference Property 8 from the design document
- Validate Requirements 4.5, 17.3

### 4. Serializer Validation Tests

Generates tests that verify serializers validate message objects:

- Create invalid messages by removing required fields
- Verify that serialization fails with descriptive errors
- Ensure error messages identify the problematic field
- Reference Property 9 from the design document
- Validate Requirements 5.5

## Usage

```typescript
import { TestGenerator } from './src/generation/test-generator.js';
import { YAMLParser } from './src/core/yaml-parser.js';

// Parse protocol specification
const parser = new YAMLParser();
const spec = parser.parse(yamlContent);

// Generate tests
const generator = new TestGenerator();
const propertyTests = generator.generatePropertyTests(spec);
const unitTests = generator.generateUnitTests(spec);

// Write to files
fs.writeFileSync('tests/property/protocol.property.test.ts', propertyTests);
fs.writeFileSync('tests/unit/protocol.test.ts', unitTests);
```

## Generated Test Structure

### Property Tests

```typescript
// Fast-check Arbitraries
const messageArbitrary = fc.record({
  field1: fc.string({ minLength: 0, maxLength: 100 }),
  field2: fc.integer({ min: 0, max: 65535 }),
  // ...
});

// Round-Trip Tests
describe('Protocol - Round-Trip Properties', () => {
  it('Message: serialize then parse produces equivalent message', () => {
    fc.assert(
      fc.property(messageArbitrary, (message) => {
        // Test implementation
      }),
      { numRuns: 100 }
    );
  });
});

// Parser Error Tests
describe('Protocol - Parser Error Handling', () => {
  it('Message: parser reports errors for malformed input', () => {
    // Test implementation
  });
});

// Serializer Validation Tests
describe('Protocol - Serializer Validation', () => {
  it('Message: serializer validates required fields', () => {
    // Test implementation
  });
});
```

## Property Tags

All generated tests include property tags that reference the design document:

```typescript
/**
 * Feature: protocol-resurrection-machine, Property 7: Parser-Serializer Round-Trip
 * For any valid Message, serialize then parse should produce equivalent message
 * Validates: Requirements 4.1, 4.2, 4.3, 4.4, 5.1, 5.2, 5.3, 5.4, 6.1
 */
```

This ensures traceability from requirements → design properties → test implementation.

## Test Configuration

- **Iterations**: All property tests run 100+ iterations by default
- **Shrinking**: fast-check automatically finds minimal counterexamples on failure
- **Reproducibility**: Failed tests can be reproduced using the seed value

## Example: Gopher Protocol

For the Gopher protocol, the test generator creates:

1. **Request message arbitrary**:
   - `selector`: string (0-255 chars, no tabs/CR/LF)

2. **DirectoryItem message arbitrary**:
   - `itemType`: enum ("0", "1", "3", "7", "9", "g", "I", "h")
   - `display`: string (no tabs/CR/LF)
   - `selector`: string (no tabs/CR/LF)
   - `host`: string (no tabs/CR/LF)
   - `port`: integer (1-65535)

3. **Round-trip tests** for both message types
4. **Parser error tests** for both message types
5. **Serializer validation tests** for both message types

## Benefits

1. **Comprehensive Coverage**: Tests thousands of random inputs automatically
2. **Bug Detection**: Catches edge cases that manual tests might miss
3. **Specification Compliance**: Ensures implementation matches YAML spec
4. **Regression Prevention**: Prevents bugs from being reintroduced
5. **Documentation**: Tests serve as executable specification
6. **Traceability**: Links requirements → design → tests

## Implementation Details

- **File**: `src/generation/test-generator.ts`
- **Tests**: `tests/unit/test-generator.test.ts`, `tests/unit/test-generator-gopher.test.ts`
- **Dependencies**: fast-check, vitest
- **Lines of Code**: ~500 LOC

## Future Enhancements

Potential improvements for the test generator:

1. Generate JSON conversion round-trip tests
2. Generate client integration tests
3. Generate performance tests
4. Support custom test templates
5. Generate test fixtures from examples
6. Add mutation testing support
