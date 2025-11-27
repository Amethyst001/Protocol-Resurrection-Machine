---
inclusion: always
---

# Protocol Implementation Patterns

This steering document provides guidelines for implementing the Protocol Resurrection Machine and generating protocol implementations.

## Parser Generation Guidelines

When generating protocol parsers:

- **Always use Buffer operations** instead of string concatenation for performance
- **Include byte offset** in all parse errors to help users debug malformed protocol data
- **Support streaming** with AsyncIterator for large protocol responses
- **Pre-compile format strings** to state machines when possible for better performance
- **Validate fixed strings** before attempting to parse variable fields
- **Use linear-time algorithms** - avoid backtracking or nested loops over input

Example error format:
```typescript
{
  message: "Expected CRLF delimiter",
  offset: 42,
  expected: "\\r\\n",
  actual: "\\n"
}
```

## Serializer Generation Guidelines

When generating protocol serializers:

- **Validate before serializing** - check all required fields are present
- **Use Buffer.concat** for combining byte sequences
- **Handle line endings correctly** - CRLF vs LF based on protocol spec
- **Include field name** in validation errors
- **Generate type-safe interfaces** so invalid messages can't be constructed

## Client Generation Guidelines

When generating protocol clients:

- **Reuse connections** when protocol allows persistent connections
- **Implement timeouts** for all network operations (default 30 seconds)
- **Use exponential backoff** for retries on network errors
- **Close connections properly** according to protocol termination spec
- **Integrate with generated parser/serializer** - don't duplicate logic
- **Include connection state** in all error messages

## Property-Based Testing Requirements

When generating property-based tests:

- **Use fast-check library** for all property tests
- **Configure for minimum 100 iterations** per property test
- **Tag each test** with the correctness property it validates using this format:
  ```typescript
  /**
   * Feature: protocol-resurrection-machine, Property 7: Parser-Serializer Round-Trip
   * For any valid message object, serialize then parse should produce equivalent message
   */
  ```
- **Generate smart arbitraries** that respect field constraints from YAML spec
- **Test round-trip properties** for all message types - this is essential for parsers
- **Include shrinking** to find minimal counterexamples on failure

## Code Generation Best Practices

When generating any code:

- **Use ts-morph or AST builders** instead of string concatenation
- **Format with Prettier** after generation
- **Include JSDoc comments** for all public functions
- **Generate TypeScript interfaces** for all message types
- **Create extension points** (hooks) for customization
- **Preserve extension point files** during regeneration

## Error Handling Standards

All generated code should follow these error handling patterns:

- **Return structured errors** with type, message, and context
- **Never throw generic errors** - always include diagnostic information
- **Log errors** at appropriate levels (debug, info, warn, error)
- **Provide actionable error messages** - tell users how to fix the problem
- **Include examples** in error messages when format is expected

Error message format:
```
[ERROR_TYPE] Error in [COMPONENT]: [DESCRIPTION]
Location: [FILE]:[LINE]:[COLUMN]
Expected: [EXPECTED_FORMAT]
Actual: [ACTUAL_VALUE]
Suggestion: [HOW_TO_FIX]
```

## Performance Guidelines

- **Parsers must be O(n)** in message size - no quadratic behavior
- **Cache compiled format strings** to avoid repeated parsing
- **Use lazy loading** for protocol implementations in multi-protocol scenarios
- **Stream large responses** instead of buffering entirely in memory
- **Property tests should complete** in under 10 seconds per protocol

## YAML Specification Validation

When validating YAML protocol specs:

- **Collect all errors** in a single validation pass - don't fail on first error
- **Provide line numbers** for all validation errors
- **Suggest fixes** for common mistakes
- **Validate semantic correctness** not just schema compliance (e.g., check that format string placeholders reference actual fields)
- **Check for undefined references** in enum values, field types, etc.

## State Machine Parser Generation (Phase 2)

When generating state machine-based parsers:

- **Compile format strings to state machines** at generation time, not runtime
- **Validate state machine completeness** - ensure all states are reachable
- **Check for ambiguous transitions** - each state should have deterministic next states
- **Detect infinite loops** - ensure state machines can reach terminal states
- **Generate transition tables** for efficient parsing
- **Include state names in errors** to help debug parsing failures

Example state machine for Gopher directory item:
```typescript
enum State {
  START,
  ITEM_TYPE,
  DISPLAY_TEXT,
  SELECTOR,
  HOST,
  PORT,
  END
}

const transitions: Record<State, Transition[]> = {
  [State.START]: [{ on: /[0-9i]/, next: State.ITEM_TYPE }],
  [State.ITEM_TYPE]: [{ on: /[^\t]/, next: State.DISPLAY_TEXT }],
  // ...
};
```

## Multi-Language Code Generation (Phase 2)

When generating code for multiple languages:

- **Follow language-specific idioms** - see multi-language-idioms.md
- **Use appropriate naming conventions** - camelCase vs snake_case vs PascalCase
- **Generate idiomatic error handling** - Results vs Exceptions vs error returns
- **Use language-specific async patterns** - Promises vs asyncio vs goroutines
- **Generate proper documentation** - JSDoc vs docstrings vs godoc vs rustdoc
- **Respect type system differences** - nullable types, union types, generics
- **Use appropriate collection types** - Array vs list vs slice vs Vec

Supported languages:
- TypeScript (primary)
- Python (Phase 2)
- Go (Phase 2)
- Rust (Phase 2)

## MCP Server Generation (Phase 2)

When generating MCP servers:

- **Follow tool naming conventions** - `{protocol}_{operation}` (e.g., `gopher_query`)
- **Generate JSON schemas** for all tool inputs and outputs
- **Reuse generated parsers/serializers** - don't duplicate protocol logic
- **Handle errors in MCP format** - structured error responses
- **Include input validation** - prevent SSRF and other security issues
- **Implement timeouts** - default 30 seconds for all operations
- **Generate tool documentation** - include examples and error conditions

See mcp-server-patterns.md for detailed guidelines.
