---
inclusion: always
---

# Testing Strategy for Protocol Resurrection Machine

This document defines the testing approach for both the Protocol Resurrection Machine itself and the generated protocol implementations.

## Dual Testing Approach

We use both unit tests and property-based tests:

### Unit Tests
Use unit tests for:
- Specific examples of YAML parsing (e.g., parsing the Gopher spec)
- Known protocol messages (e.g., specific Gopher directory lines)
- Error handling with specific invalid inputs
- Integration between components
- Edge cases (empty messages, maximum sizes, boundary values)

### Property-Based Tests
Use property-based tests for:
- Universal properties that should hold across all inputs
- Round-trip correctness (serialize → parse → equivalent)
- Parser correctness across random valid inputs
- Serializer correctness across random valid messages
- JSON conversion correctness
- Generator validity (ensuring generated test data is valid)

**Key principle**: Unit tests catch specific bugs, property tests verify general correctness.

## Essential Properties to Test

Every protocol implementation MUST have property-based tests for:

1. **Round-trip property** (CRITICAL):
   ```typescript
   For any valid message M:
     parse(serialize(M)) == M
     serialize(parse(bytes)) produces equivalent bytes
   ```

2. **JSON conversion round-trip**:
   ```typescript
   For any valid message M:
     fromJSON(toJSON(M)) == M
   ```

3. **Parser error handling**:
   ```typescript
   For any invalid byte sequence:
     parse() returns error with byte offset and description
   ```

4. **Serializer validation**:
   ```typescript
   For any invalid message object:
     serialize() returns error identifying invalid field
   ```

5. **Generator validity**:
   ```typescript
   For any generated test message:
     message satisfies all constraints from YAML spec
   ```

## Property Test Configuration

All property-based tests MUST:
- Use fast-check library
- Run minimum 100 iterations (configure with `{ numRuns: 100 }`)
- Include property tag comment referencing design document
- Use seed-based reproducibility for debugging failures
- Enable shrinking to find minimal counterexamples

Example:
```typescript
/**
 * Feature: protocol-resurrection-machine, Property 7: Parser-Serializer Round-Trip
 * For any valid message object, serialize then parse should produce equivalent message
 */
test('gopher directory item round-trip', () => {
  fc.assert(
    fc.property(gopherDirectoryItemArbitrary, (item) => {
      const serialized = serializer.serialize(item);
      expect(serialized.success).toBe(true);
      
      const parsed = parser.parse(serialized.data!);
      expect(parsed.success).toBe(true);
      expect(parsed.message).toEqual(item);
    }),
    { numRuns: 100 }
  );
});
```

## Test Organization

```
tests/
  unit/
    yaml-parser.test.ts          # Unit tests for YAML parsing
    kiro-spec-generator.test.ts  # Unit tests for spec generation
    code-generator.test.ts       # Unit tests for code generation
  
  property/
    round-trip.property.test.ts      # Property tests for round-trip
    validation.property.test.ts      # Property tests for validation
    generation.property.test.ts      # Property tests for generation
  
  integration/
    end-to-end.test.ts          # Full pipeline tests
    gopher.test.ts              # Gopher protocol integration tests
    finger.test.ts              # Finger protocol integration tests
  
  generated/
    gopher/
      gopher.property.test.ts   # Generated property tests for Gopher
      gopher.unit.test.ts       # Generated unit tests for Gopher
    finger/
      finger.property.test.ts   # Generated property tests for Finger
      finger.unit.test.ts       # Generated unit tests for Finger
```

## Test Data Generation

When creating fast-check arbitraries:

- **Respect constraints** from YAML spec (min/max length, valid enum values)
- **Include edge cases** (empty strings, boundary values, special characters)
- **Generate diverse data** (varying lengths, different enum values)
- **Ensure validity** (all generated messages should be valid according to spec)

Example arbitrary for a string field with constraints:
```typescript
const selectorArbitrary = fc.string({
  minLength: 0,
  maxLength: 255,
  // Gopher selectors can contain any printable ASCII
}).filter(s => /^[\x20-\x7E]*$/.test(s));
```

## Testing Parsers and Serializers

Special considerations for parser/serializer testing:

### Parser Testing
- Test with valid protocol messages (should succeed)
- Test with malformed messages (should fail with descriptive errors)
- Test with edge cases (empty input, very large input)
- Test with messages containing special characters
- Test streaming behavior for large inputs

### Serializer Testing
- Test with valid message objects (should succeed)
- Test with invalid message objects (should fail with field-specific errors)
- Test with missing required fields
- Test with invalid field types
- Test with constraint violations (too long, out of range)

### Round-Trip Testing
- Generate random valid messages
- Serialize then parse
- Verify equivalence (use deep equality)
- Test with all message types defined in protocol
- Run 100+ iterations to catch edge cases

## Performance Testing

Property tests should also verify performance:

- **Parser performance**: Verify O(n) time complexity by testing with messages of varying sizes
- **Test execution time**: Property tests should complete in under 10 seconds per protocol
- **Memory usage**: Ensure no memory leaks in streaming scenarios

## Test Execution Workflow

During development:
1. **On file save**: Run unit tests for fast feedback (< 1 second)
2. **Before commit**: Run all property tests (< 30 seconds)
3. **In CI/CD**: Run full test suite including integration tests

## Coverage Goals

Aim for:
- 100% coverage of parser/serializer code paths
- 100% coverage of validation logic
- 100% coverage of error handling paths
- Property tests for all correctness properties from design document
- Example-based tests for Gopher and Finger protocols

## When Tests Fail

If a property-based test fails:
1. **Note the seed** - fast-check will show the seed for reproducibility
2. **Examine the counterexample** - what input caused the failure?
3. **Verify the property** - is the property correct or does the spec need updating?
4. **Fix the implementation** - update generated code or generator
5. **Re-run with same seed** - verify the fix works
6. **Run full suite** - ensure no regressions

## Test-Driven Development

For the Protocol Resurrection Machine itself:
1. Write property tests based on correctness properties in design document
2. Implement the feature
3. Run tests to verify correctness
4. Refactor with confidence (tests catch regressions)

This approach ensures that the system generates correct code from the start.

## Multi-Constraint Testing (Phase 2)

When testing constraint solvers:

- **Test constraint satisfaction** - verify all constraints are met
- **Test conflict detection** - ensure conflicting constraints are identified
- **Test boundary values** - test at min/max constraint boundaries
- **Test constraint combinations** - test multiple constraints on same field
- **Test relaxation strategies** - verify fallback when constraints conflict

Example:
```typescript
describe('Constraint Solver', () => {
  it('should satisfy multiple constraints', () => {
    fc.assert(
      fc.property(
        fc.array(constraintArbitrary),
        (constraints) => {
          const solution = solve(constraints);
          if (solution) {
            return constraints.every(c =>
              satisfiesConstraint(solution[c.field], c)
            );
          }
          return true; // No solution is acceptable
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

## Boundary Value Testing (Phase 2)

Test at constraint boundaries:

- **Minimum values** - test at min length, min range
- **Maximum values** - test at max length, max range
- **Just inside boundaries** - min+1, max-1
- **Just outside boundaries** - min-1, max+1
- **Empty/zero values** - empty strings, zero numbers
- **Special characters** - delimiters, escape sequences

Example:
```typescript
describe('Boundary Values', () => {
  it('should handle minimum length', () => {
    const minLength = 1;
    const value = 'a'.repeat(minLength);
    expect(validate(value, { minLength })).toBe(true);
  });
  
  it('should reject below minimum', () => {
    const minLength = 1;
    const value = '';
    expect(validate(value, { minLength })).toBe(false);
  });
});
```

## UI Testing (Phase 2)

For workbench UI components:

### Component Tests
- Use @testing-library/svelte for component tests
- Test user interactions, not implementation details
- Mock API calls and external dependencies
- Test accessibility with axe-core
- Test keyboard navigation

Example:
```typescript
import { render, fireEvent } from '@testing-library/svelte';
import ProtocolEditor from './ProtocolEditor.svelte';

test('saves protocol on button click', async () => {
  const onSave = vi.fn();
  const { getByRole } = render(ProtocolEditor, {
    props: { protocol: { name: 'Test' }, onSave }
  });
  
  await fireEvent.click(getByRole('button', { name: /save/i }));
  expect(onSave).toHaveBeenCalled();
});
```

### E2E Tests (Playwright)
- Test critical user workflows end-to-end
- Test across different browsers
- Test responsive design at different viewports
- Test error scenarios and recovery
- Use page object pattern for maintainability

Example:
```typescript
import { test, expect } from '@playwright/test';

test('create and generate protocol', async ({ page }) => {
  await page.goto('/');
  await page.click('text=New Protocol');
  await page.fill('#name', 'Test Protocol');
  await page.fill('#port', '8080');
  await page.click('text=Save');
  await page.click('text=Generate');
  await expect(page.locator('text=Generated successfully')).toBeVisible();
});
```

## Regression Testing (Phase 2)

Prevent regressions:

- **Snapshot tests** - capture generated code and compare
- **Golden file tests** - compare against known-good outputs
- **Version compatibility tests** - ensure backward compatibility
- **Performance regression tests** - track performance over time

Example:
```typescript
describe('Code Generation Regression', () => {
  it('should generate consistent parser code', () => {
    const spec = loadSpec('gopher.yaml');
    const generated = generateParser(spec);
    expect(generated).toMatchSnapshot();
  });
  
  it('should parse legacy protocol specs', () => {
    const legacySpec = loadSpec('legacy/gopher-v1.yaml');
    expect(() => parseSpec(legacySpec)).not.toThrow();
  });
});
```

## Test Organization for Phase 2

Extended test structure:
```
tests/
  unit/
    # Existing unit tests
    multi-language-generator.test.ts
    mcp-server-generator.test.ts
    constraint-solver.test.ts
    state-machine-compiler.test.ts
  
  property/
    # Existing property tests
    multi-constraint.property.test.ts
    state-machine.property.test.ts
    discovery.property.test.ts
  
  integration/
    # Existing integration tests
    mcp-server.test.ts
    workbench-api.test.ts
    multi-language-generation.test.ts
  
  e2e/
    workbench.spec.ts
    protocol-workflow.spec.ts
  
  generated/
    gopher/
      # Existing generated tests
      python/
        gopher.property.test.py
        gopher.unit.test.py
      go/
        gopher_test.go
      rust/
        gopher_test.rs
```

## Test-Driven Development

For the Protocol Resurrection Machine itself:
1. Write property tests based on correctness properties in design document
2. Implement the feature
3. Run tests to verify correctness
4. Refactor with confidence (tests catch regressions)

This approach ensures that the system generates correct code from the start.
