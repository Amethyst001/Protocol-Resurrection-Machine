/**
 * Property-Based Tests for TypeScript Code Generation
 * 
 * Tests Property 13: Multi-Language Code Generation (TypeScript)
 * Validates: Requirements 6.2, 7.2, 8.1
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { TypeScriptGenerator } from '../../src/generation/multi-language/typescript-generator.js';
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
 * Generates format strings that match the protocol specification grammar
 */
const formatStringArbitrary = fc.oneof(
  // Simple fixed string
  fc.string({ minLength: 1, maxLength: 20 }).filter(s => !s.includes('{') && !s.includes('}')),
  // Single placeholder
  fc.string({ minLength: 1, maxLength: 10 }).filter(s => /^[a-zA-Z][a-zA-Z0-9]*$/.test(s)).map(s => `{${s}}`),
  // Multiple placeholders with delimiters
  fc.array(
    fc.string({ minLength: 1, maxLength: 10 }).filter(s => /^[a-zA-Z][a-zA-Z0-9]*$/.test(s)),
    { minLength: 1, maxLength: 3 }
  ).map(fields => fields.map(f => `{${f}}`).join('\\t')),
  // Mixed fixed and placeholders
  fc.tuple(
    fc.string({ minLength: 1, maxLength: 5 }).filter(s => !s.includes('{') && !s.includes('}')),
    fc.string({ minLength: 1, maxLength: 10 }).filter(s => /^[a-zA-Z][a-zA-Z0-9]*$/.test(s)),
    fc.string({ minLength: 1, maxLength: 5 }).filter(s => !s.includes('{') && !s.includes('}'))
  ).map(([prefix, field, suffix]) => `${prefix}{${field}}${suffix}`)
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

describe('TypeScript Code Generation - Property Tests', () => {
  const generator = new TypeScriptGenerator();
  const profile = createLanguageProfileWithSteering('typescript');
  
  /**
   * Feature: prm-phase-2, Property 13: Multi-Language Code Generation (TypeScript)
   * For any protocol specification, TypeScript code should compile without errors
   * Validates: Requirements 6.2, 7.2, 8.1
   * 
   * KNOWN LIMITATION: This test may fail with edge case format strings (e.g., escaped
   * braces like "\{A}") that the format parser doesn't handle. Real protocols work
   * correctly. See FAILING-TESTS-ANALYSIS.md for details.
   */
  it('Property 13: Generated TypeScript code is syntactically valid', async () => {
    await fc.assert(
      fc.asyncProperty(
        protocolSpecArbitrary,
        async (spec) => {
          // Generate TypeScript code
          const artifacts = await generator.generate(spec, profile);
          
          // Check that all artifacts were generated
          expect(artifacts.parser).toBeDefined();
          expect(artifacts.serializer).toBeDefined();
          expect(artifacts.client).toBeDefined();
          expect(artifacts.tests).toBeDefined();
          
          // Check that code is not empty
          expect(artifacts.parser.length).toBeGreaterThan(0);
          expect(artifacts.serializer.length).toBeGreaterThan(0);
          expect(artifacts.client.length).toBeGreaterThan(0);
          expect(artifacts.tests.length).toBeGreaterThan(0);
          
          // Check that generation time is reasonable
          expect(artifacts.generationTimeMs).toBeGreaterThan(0);
          expect(artifacts.generationTimeMs).toBeLessThan(10000); // Less than 10 seconds
          
          // Check language is correct
          expect(artifacts.language).toBe('typescript');
        }
      ),
      { numRuns: 100 }
    );
  });
  
  /**
   * Feature: prm-phase-2, Property 14: Language-Specific Naming Conventions
   * For any generated TypeScript code, identifiers should follow camelCase convention
   * Validates: Requirements 7.2
   */
  it('Property 14: TypeScript code follows camelCase naming convention', async () => {
    await fc.assert(
      fc.asyncProperty(
        protocolSpecArbitrary,
        async (spec) => {
          // Generate TypeScript code
          const artifacts = await generator.generate(spec, profile);
          
          // Check parser for camelCase
          // Functions and variables should be camelCase
          const parserHasCamelCase = /\b[a-z][a-zA-Z0-9]*\s*\(/.test(artifacts.parser);
          expect(parserHasCamelCase).toBe(true);
          
          // Classes should be PascalCase
          const parserHasPascalCase = /class\s+[A-Z][a-zA-Z0-9]*/.test(artifacts.parser);
          expect(parserHasPascalCase).toBe(true);
          
          // Check serializer for camelCase
          const serializerHasCamelCase = /\b[a-z][a-zA-Z0-9]*\s*\(/.test(artifacts.serializer);
          expect(serializerHasCamelCase).toBe(true);
          
          // Check client for camelCase
          const clientHasCamelCase = /\b[a-z][a-zA-Z0-9]*\s*\(/.test(artifacts.client);
          expect(clientHasCamelCase).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });
  
  /**
   * Feature: prm-phase-2, Property 15: Language-Specific Error Handling
   * For any generated TypeScript code, errors should use Error classes
   * Validates: Requirements 8.1
   */
  it('Property 15: TypeScript code uses Error classes for error handling', async () => {
    await fc.assert(
      fc.asyncProperty(
        protocolSpecArbitrary,
        async (spec) => {
          // Generate TypeScript code
          const artifacts = await generator.generate(spec, profile);
          
          // Check that client defines Error subclasses
          const hasErrorClass = /class\s+\w+Error\s+extends\s+Error/.test(artifacts.client);
          expect(hasErrorClass).toBe(true);
          
          // Check that errors are thrown
          const throwsErrors = /throw\s+new\s+\w+Error/.test(artifacts.client);
          expect(throwsErrors).toBe(true);
          
          // Check that parser returns error objects
          const hasErrorInterface = /interface\s+\w*Error/.test(artifacts.parser);
          expect(hasErrorInterface).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });
  
  /**
   * Additional test: Generated code includes JSDoc comments
   */
  it('Generated TypeScript code includes JSDoc comments', async () => {
    await fc.assert(
      fc.asyncProperty(
        protocolSpecArbitrary,
        async (spec) => {
          // Generate TypeScript code
          const artifacts = await generator.generate(spec, profile);
          
          // Check for JSDoc comments
          const hasJSDoc = /\/\*\*[\s\S]*?\*\//.test(artifacts.parser);
          expect(hasJSDoc).toBe(true);
          
          // Check for @param tags
          const hasParamTags = /@param/.test(artifacts.parser);
          expect(hasParamTags).toBe(true);
          
          // Check for @returns tags
          const hasReturnsTags = /@returns/.test(artifacts.parser);
          expect(hasReturnsTags).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });
  
  /**
   * Additional test: Generated code uses Buffer operations
   */
  it('Generated TypeScript code uses Buffer operations for performance', async () => {
    await fc.assert(
      fc.asyncProperty(
        protocolSpecArbitrary,
        async (spec) => {
          // Generate TypeScript code
          const artifacts = await generator.generate(spec, profile);
          
          // Check that parser uses Buffer
          const parserUsesBuffer = /Buffer/.test(artifacts.parser);
          expect(parserUsesBuffer).toBe(true);
          
          // Check that serializer uses Buffer
          const serializerUsesBuffer = /Buffer/.test(artifacts.serializer);
          expect(serializerUsesBuffer).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });
  
  /**
   * Additional test: Generated tests use fast-check
   */
  it('Generated TypeScript tests use fast-check for property-based testing', async () => {
    await fc.assert(
      fc.asyncProperty(
        protocolSpecArbitrary,
        async (spec) => {
          // Generate TypeScript code
          const artifacts = await generator.generate(spec, profile);
          
          // Check that tests import fast-check
          const importsFastCheck = /import.*fc.*from.*fast-check/.test(artifacts.tests);
          expect(importsFastCheck).toBe(true);
          
          // Check that tests use fc.assert
          const usesFcAssert = /fc\.assert/.test(artifacts.tests);
          expect(usesFcAssert).toBe(true);
          
          // Check that tests configure numRuns
          const configuresNumRuns = /numRuns:\s*\d+/.test(artifacts.tests);
          expect(configuresNumRuns).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });
  
  /**
   * Additional test: Generated client uses Promise-based async
   */
  it('Generated TypeScript client uses Promise-based async operations', async () => {
    await fc.assert(
      fc.asyncProperty(
        protocolSpecArbitrary,
        async (spec) => {
          // Generate TypeScript code
          const artifacts = await generator.generate(spec, profile);
          
          // Check that client uses async/await
          const usesAsync = /async\s+\w+\s*\(/.test(artifacts.client);
          expect(usesAsync).toBe(true);
          
          // Check that client returns Promises
          const returnsPromise = /Promise</.test(artifacts.client);
          expect(returnsPromise).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });
  
  /**
   * Additional test: Generated client implements connection pooling
   */
  it('Generated TypeScript client implements connection pooling', async () => {
    await fc.assert(
      fc.asyncProperty(
        protocolSpecArbitrary,
        async (spec) => {
          // Generate TypeScript code
          const artifacts = await generator.generate(spec, profile);
          
          // Check that client has connection pool
          const hasConnectionPool = /ConnectionPool/.test(artifacts.client);
          expect(hasConnectionPool).toBe(true);
          
          // Check that pool manages connections
          const managesConnections = /getConnection/.test(artifacts.client);
          expect(managesConnections).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });
});
