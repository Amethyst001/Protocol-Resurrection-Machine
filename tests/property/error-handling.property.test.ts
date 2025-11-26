/**
 * Property-Based Tests for Language-Specific Error Handling
 * 
 * Feature: prm-phase-2, Property 15: Language-Specific Error Handling
 * 
 * Tests that generated code in all languages follows language-specific error handling patterns:
 * - TypeScript: throws Error classes
 * - Python: raises Exception classes
 * - Go: returns error values
 * - Rust: returns Result types
 * 
 * Validates: Requirements 8.1, 8.2, 8.3, 8.4, 8.5
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { TypeScriptGenerator } from '../../src/generation/multi-language/typescript-generator.js';
import { PythonGenerator } from '../../src/generation/multi-language/python-generator.js';
import { GoGenerator } from '../../src/generation/multi-language/go-generator.js';
import { RustGenerator } from '../../src/generation/multi-language/rust-generator.js';
import { createLanguageProfileWithSteering } from '../../src/steering/steering-loader.js';
import type { ProtocolSpec, MessageType, FieldDefinition } from '../../src/types/protocol-spec.js';

// ============================================================================
// Arbitraries for Protocol Specifications
// ============================================================================

/**
 * Arbitrary for field types
 */
const fieldTypeArbitrary = fc.oneof(
  fc.constant({ kind: 'string' as const }),
  fc.constant({ kind: 'number' as const }),
  fc.constant({ kind: 'boolean' as const }),
  fc.record({
    kind: fc.constant('enum' as const),
    values: fc.array(fc.string({ minLength: 1, maxLength: 10 }), { minLength: 2, maxLength: 5 })
  })
);

/**
 * Arbitrary for field definitions
 */
const fieldDefinitionArbitrary: fc.Arbitrary<FieldDefinition> = fc.record({
  name: fc.string({ minLength: 1, maxLength: 20 }).filter(s => /^[a-zA-Z][a-zA-Z0-9]*$/.test(s)),
  type: fieldTypeArbitrary,
  required: fc.boolean(),
  validation: fc.option(fc.record({
    minLength: fc.option(fc.integer({ min: 0, max: 10 })),
    maxLength: fc.option(fc.integer({ min: 10, max: 100 })),
    min: fc.option(fc.integer({ min: 0, max: 100 })),
    max: fc.option(fc.integer({ min: 100, max: 1000 })),
    pattern: fc.option(fc.constantFrom('^[a-z]+$', '^[0-9]+$', '^[a-zA-Z0-9]+$'))
  }), { nil: undefined })
});

/**
 * Arbitrary for valid format strings
 */
const formatStringArbitrary = fc.oneof(
  fc.string({ minLength: 1, maxLength: 20 }).filter(s => !s.includes('{') && !s.includes('}')),
  fc.string({ minLength: 1, maxLength: 10 }).filter(s => /^[a-zA-Z][a-zA-Z0-9]*$/.test(s)).map(s => `{${s}}`),
  fc.array(
    fc.string({ minLength: 1, maxLength: 10 }).filter(s => /^[a-zA-Z][a-zA-Z0-9]*$/.test(s)),
    { minLength: 1, maxLength: 3 }
  ).map(fields => fields.map(f => `{${f}}`).join('\\t'))
);

/**
 * Arbitrary for message types
 */
const messageTypeArbitrary: fc.Arbitrary<MessageType> = fc.record({
  name: fc.string({ minLength: 1, maxLength: 30 })
    .filter(s => /^[A-Z][a-zA-Z0-9]*$/.test(s))
    .map(s => s.charAt(0).toUpperCase() + s.slice(1)),
  direction: fc.constantFrom('request' as const, 'response' as const, 'bidirectional' as const),
  format: formatStringArbitrary,
  fields: fc.array(fieldDefinitionArbitrary, { minLength: 1, maxLength: 5 }),
  delimiter: fc.option(fc.constantFrom('\\t', ',', '|'), { nil: undefined }),
  terminator: fc.option(fc.constantFrom('\\r\\n', '\\n', '\\0'), { nil: undefined })
});

/**
 * Arbitrary for protocol specifications
 */
const protocolSpecArbitrary: fc.Arbitrary<ProtocolSpec> = fc.record({
  protocol: fc.record({
    name: fc.string({ minLength: 1, maxLength: 20 })
      .filter(s => /^[A-Z][a-zA-Z0-9]*$/.test(s))
      .map(s => s.charAt(0).toUpperCase() + s.slice(1)),
    description: fc.string({ minLength: 10, maxLength: 100 }),
    version: fc.option(fc.constantFrom('1.0', '1.1', '2.0'), { nil: undefined }),
    port: fc.integer({ min: 1024, max: 65535 }),
    rfc: fc.option(fc.string({ minLength: 3, maxLength: 10 }), { nil: undefined })
  }),
  connection: fc.record({
    type: fc.constantFrom('TCP' as const, 'UDP' as const),
    timeout: fc.option(fc.integer({ min: 1000, max: 60000 }), { nil: undefined }),
    keepAlive: fc.option(fc.boolean(), { nil: undefined })
  }),
  messageTypes: fc.array(messageTypeArbitrary, { minLength: 1, maxLength: 3 })
});

// ============================================================================
// Property Tests
// ============================================================================

describe('Language-Specific Error Handling - Property Tests', () => {
  
  /**
   * Feature: prm-phase-2, Property 15: Language-Specific Error Handling (TypeScript)
   * For any generated TypeScript code, errors should use Error classes
   * Validates: Requirements 8.1
   * 
   * KNOWN LIMITATION: This test may fail with minimal protocol specs that generate
   * code with insufficient error handling to match test patterns. Real protocols
   * (Gopher, Finger) generate correct Error classes. See FAILING-TESTS-ANALYSIS.md.
   */
  it('Property 15: TypeScript uses Error classes for error handling', async () => {
    const generator = new TypeScriptGenerator();
    const profile = createLanguageProfileWithSteering('typescript');
    
    await fc.assert(
      fc.asyncProperty(
        protocolSpecArbitrary,
        async (spec) => {
          // Generate TypeScript code
          const artifacts = await generator.generate(spec, profile);
          
          // Check that client defines Error subclasses
          const hasErrorClass = /class\s+\w+Error\s+extends\s+Error/.test(artifacts.client);
          expect(hasErrorClass, 'TypeScript should define Error subclasses').toBe(true);
          
          // Check that errors are thrown
          const throwsErrors = /throw\s+new\s+\w+Error/.test(artifacts.client);
          expect(throwsErrors, 'TypeScript should throw errors').toBe(true);
          
          // Check that parser returns error objects or throws
          const hasErrorHandling = /Error/.test(artifacts.parser);
          expect(hasErrorHandling, 'TypeScript parser should handle errors').toBe(true);
          
          // Verify no Go-style error returns
          expect(artifacts.client).not.toContain('return nil, err');
          expect(artifacts.client).not.toContain('if err != nil');
          
          // Verify no Rust-style Result types
          expect(artifacts.client).not.toContain('Result<');
          expect(artifacts.client).not.toContain('Ok(');
          expect(artifacts.client).not.toContain('Err(');
        }
      ),
      { numRuns: 100 }
    );
  });
  
  /**
   * Feature: prm-phase-2, Property 15: Language-Specific Error Handling (Python)
   * For any generated Python code, errors should use Exception classes
   * Validates: Requirements 8.2
   */
  it('Property 15: Python uses Exception classes for error handling', async () => {
    const generator = new PythonGenerator();
    const profile = createLanguageProfileWithSteering('python');
    
    await fc.assert(
      fc.asyncProperty(
        protocolSpecArbitrary,
        async (spec) => {
          // Generate Python code
          const artifacts = await generator.generate(spec, profile);
          
          // Verify Exception classes are defined
          const hasExceptionClass = /class\s+\w+Error\((\w+)\)/.test(artifacts.parser);
          expect(hasExceptionClass, 'Python should define Exception subclasses').toBe(true);
          
          // Verify exceptions inherit from Exception or Error
          const exceptionPattern = /class\s+\w+Error\((\w+)\)/g;
          const exceptions = artifacts.parser.match(exceptionPattern) || [];
          
          for (const exc of exceptions) {
            const baseClass = exc.match(/class\s+\w+Error\((\w+)\)/)?.[1];
            if (baseClass) {
              expect(baseClass, 'Python exceptions should inherit from Exception or Error').toMatch(/Error|Exception/);
            }
          }
          
          // Verify raise is used
          const raisesExceptions = /raise\s+\w+Error/.test(artifacts.parser);
          expect(raisesExceptions, 'Python should raise exceptions').toBe(true);
          
          // Verify no TypeScript-style error handling
          expect(artifacts.parser).not.toContain('throw new');
          expect(artifacts.parser).not.toContain('try {');
          
          // Verify Python-style try/except
          if (artifacts.parser.includes('try:')) {
            expect(artifacts.parser).toContain('except');
          }
          
          // Verify no Go-style error returns
          expect(artifacts.client).not.toContain('return nil, err');
          
          // Verify no Rust-style Result types
          expect(artifacts.client).not.toContain('Result<');
        }
      ),
      { numRuns: 100 }
    );
  });
  
  /**
   * Feature: prm-phase-2, Property 15: Language-Specific Error Handling (Go)
   * For any generated Go code, errors should be returned as error values
   * Validates: Requirements 8.3
   */
  it('Property 15: Go returns error values for error handling', async () => {
    const generator = new GoGenerator();
    const profile = createLanguageProfileWithSteering('go');
    
    await fc.assert(
      fc.asyncProperty(
        protocolSpecArbitrary,
        async (spec) => {
          // Generate Go code
          const artifacts = await generator.generate(spec, profile);
          
          // Check that functions return error as second value
          const returnsError = /\)\s*\([^)]*,\s*error\)/.test(artifacts.parser);
          expect(returnsError, 'Go functions should return error as second value').toBe(true);
          
          // Check that errors are checked with if err != nil
          const checksErrors = /if\s+err\s*!=\s*nil/.test(artifacts.parser);
          expect(checksErrors, 'Go should check errors with if err != nil').toBe(true);
          
          // Check that errors are returned
          const returnsErrorValue = /return\s+[^,]+,\s+err/.test(artifacts.parser);
          expect(returnsErrorValue, 'Go should return error values').toBe(true);
          
          // Verify no exception throwing
          expect(artifacts.parser).not.toContain('throw');
          expect(artifacts.parser).not.toContain('raise');
          
          // Verify no Result types
          expect(artifacts.parser).not.toContain('Result<');
          expect(artifacts.parser).not.toContain('Ok(');
          expect(artifacts.parser).not.toContain('Err(');
        }
      ),
      { numRuns: 100 }
    );
  });
  
  /**
   * Feature: prm-phase-2, Property 15: Language-Specific Error Handling (Rust)
   * For any generated Rust code, errors should use Result types
   * Validates: Requirements 8.4
   */
  it('Property 15: Rust uses Result types for error handling', async () => {
    const generator = new RustGenerator();
    const profile = createLanguageProfileWithSteering('rust');
    
    await fc.assert(
      fc.asyncProperty(
        protocolSpecArbitrary,
        async (spec) => {
          // Generate Rust code
          const artifacts = await generator.generate(spec, profile);
          
          // Check that functions return Result types
          const returnsResult = /Result</.test(artifacts.parser);
          expect(returnsResult, 'Rust functions should return Result types').toBe(true);
          
          // Check that Ok and Err are used
          const usesOk = /Ok\(/.test(artifacts.parser);
          const usesErr = /Err\(/.test(artifacts.parser);
          expect(usesOk, 'Rust should use Ok() for success').toBe(true);
          expect(usesErr, 'Rust should use Err() for errors').toBe(true);
          
          // Check that error types are defined
          const hasErrorType = /struct\s+\w+Error/.test(artifacts.parser);
          expect(hasErrorType, 'Rust should define error types').toBe(true);
          
          // Check that ? operator is used for error propagation
          const usesQuestionMark = /\?/.test(artifacts.parser);
          expect(usesQuestionMark, 'Rust should use ? operator for error propagation').toBe(true);
          
          // Verify no exception throwing
          expect(artifacts.parser).not.toContain('throw');
          expect(artifacts.parser).not.toContain('raise');
          
          // Verify no Go-style error returns
          expect(artifacts.parser).not.toContain('return nil, err');
          expect(artifacts.parser).not.toContain('if err != nil');
        }
      ),
      { numRuns: 100 }
    );
  });
  
  /**
   * Cross-language test: Verify each language uses its own error handling pattern
   */
  it('Property 15: All languages use their respective error handling patterns', async () => {
    const tsGenerator = new TypeScriptGenerator();
    const pyGenerator = new PythonGenerator();
    const goGenerator = new GoGenerator();
    const rustGenerator = new RustGenerator();
    
    const tsProfile = createLanguageProfileWithSteering('typescript');
    const pyProfile = createLanguageProfileWithSteering('python');
    const goProfile = createLanguageProfileWithSteering('go');
    const rustProfile = createLanguageProfileWithSteering('rust');
    
    await fc.assert(
      fc.asyncProperty(
        protocolSpecArbitrary,
        async (spec) => {
          // Generate code in all languages
          const tsArtifacts = await tsGenerator.generate(spec, tsProfile);
          const pyArtifacts = await pyGenerator.generate(spec, pyProfile);
          const goArtifacts = await goGenerator.generate(spec, goProfile);
          const rustArtifacts = await rustGenerator.generate(spec, rustProfile);
          
          // TypeScript: should throw Error classes
          const tsThrowsErrors = /throw\s+new\s+\w+Error/.test(tsArtifacts.client);
          expect(tsThrowsErrors, 'TypeScript should throw Error classes').toBe(true);
          
          // Python: should raise Exception classes
          const pyRaisesExceptions = /raise\s+\w+Error/.test(pyArtifacts.parser);
          expect(pyRaisesExceptions, 'Python should raise Exception classes').toBe(true);
          
          // Go: should return error values
          const goReturnsErrors = /\)\s*\([^)]*,\s*error\)/.test(goArtifacts.parser);
          expect(goReturnsErrors, 'Go should return error values').toBe(true);
          
          // Rust: should return Result types
          const rustReturnsResult = /Result</.test(rustArtifacts.parser);
          expect(rustReturnsResult, 'Rust should return Result types').toBe(true);
          
          // Verify no cross-contamination
          // TypeScript should not have Go/Rust patterns
          expect(tsArtifacts.client).not.toContain('return nil, err');
          expect(tsArtifacts.client).not.toContain('Result<');
          
          // Python should not have TypeScript/Go/Rust patterns
          expect(pyArtifacts.parser).not.toContain('throw new');
          expect(pyArtifacts.parser).not.toContain('return nil, err');
          expect(pyArtifacts.parser).not.toContain('Result<');
          
          // Go should not have TypeScript/Python/Rust patterns
          expect(goArtifacts.parser).not.toContain('throw');
          expect(goArtifacts.parser).not.toContain('raise');
          expect(goArtifacts.parser).not.toContain('Result<');
          
          // Rust should not have TypeScript/Python/Go patterns
          expect(rustArtifacts.parser).not.toContain('throw');
          expect(rustArtifacts.parser).not.toContain('raise');
          expect(rustArtifacts.parser).not.toContain('return nil, err');
        }
      ),
      { numRuns: 100 }
    );
  });
  
  /**
   * Additional test: Verify error messages include context
   */
  it('Property 15: Error messages include protocol-specific context', async () => {
    const tsGenerator = new TypeScriptGenerator();
    const tsProfile = createLanguageProfileWithSteering('typescript');
    
    await fc.assert(
      fc.asyncProperty(
        protocolSpecArbitrary,
        async (spec) => {
          // Generate TypeScript code
          const artifacts = await tsGenerator.generate(spec, tsProfile);
          
          // Check that error messages include context
          // Look for error messages with field names, offsets, or expected values
          const hasContextInErrors = 
            /Error\([^)]*\$\{[^}]+\}/.test(artifacts.parser) || // Template literals in errors
            /Error\([^)]*\+/.test(artifacts.parser) || // String concatenation in errors
            /new\s+\w+Error\([^)]+,/.test(artifacts.parser); // Multiple parameters to error constructor
          
          expect(hasContextInErrors, 'Errors should include context information').toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });
  
  /**
   * Additional test: Verify custom error types are defined
   */
  it('Property 15: Custom error types are defined for protocol-specific errors', async () => {
    const tsGenerator = new TypeScriptGenerator();
    const tsProfile = createLanguageProfileWithSteering('typescript');
    
    await fc.assert(
      fc.asyncProperty(
        protocolSpecArbitrary,
        async (spec) => {
          // Generate TypeScript code
          const artifacts = await tsGenerator.generate(spec, tsProfile);
          
          // Check that custom error types are defined
          const hasCustomErrors = /class\s+\w+Error\s+extends\s+Error/.test(artifacts.client);
          expect(hasCustomErrors, 'Custom error types should be defined').toBe(true);
          
          // Check that error types are protocol-specific
          const protocolName = spec.protocol.name;
          const hasProtocolSpecificError = new RegExp(`class\\s+${protocolName}\\w*Error`).test(artifacts.client);
          expect(hasProtocolSpecificError, 'Error types should be protocol-specific').toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });
});
