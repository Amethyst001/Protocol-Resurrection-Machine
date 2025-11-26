/**
 * Property-Based Tests for Language-Specific Naming Conventions
 * 
 * Feature: prm-phase-2, Property 14: Language-Specific Naming Conventions
 * 
 * Tests that generated code in all languages follows language-specific naming conventions:
 * - TypeScript: camelCase for functions/variables, PascalCase for classes
 * - Python: snake_case for functions/variables, PascalCase for classes
 * - Go: PascalCase for exports, camelCase for private
 * - Rust: snake_case for functions/variables, PascalCase for structs
 * 
 * Validates: Requirements 7.2, 7.3, 7.4, 7.5
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
// Helper Functions
// ============================================================================

/**
 * Check if a string follows camelCase convention
 */
function isCamelCase(str: string): boolean {
  return /^[a-z][a-zA-Z0-9]*$/.test(str);
}

/**
 * Check if a string follows PascalCase convention
 */
function isPascalCase(str: string): boolean {
  return /^[A-Z][a-zA-Z0-9]*$/.test(str);
}

/**
 * Check if a string follows snake_case convention
 */
function isSnakeCase(str: string): boolean {
  return /^[a-z][a-z0-9_]*$/.test(str);
}

/**
 * Extract function names from code
 */
function extractFunctionNames(code: string, pattern: RegExp): string[] {
  const matches = code.matchAll(pattern);
  const names: string[] = [];
  for (const match of matches) {
    if (match[1]) {
      names.push(match[1]);
    }
  }
  return names;
}

/**
 * Extract class/struct names from code
 */
function extractTypeNames(code: string, pattern: RegExp): string[] {
  const matches = code.matchAll(pattern);
  const names: string[] = [];
  for (const match of matches) {
    if (match[1]) {
      names.push(match[1]);
    }
  }
  return names;
}

// ============================================================================
// Property Tests
// ============================================================================

describe('Language-Specific Naming Conventions - Property Tests', () => {
  
  /**
   * Feature: prm-phase-2, Property 14: Language-Specific Naming Conventions (TypeScript)
   * For any generated TypeScript code, identifiers should follow camelCase convention
   * Validates: Requirements 7.2
   * 
   * KNOWN LIMITATION: This test may fail with extreme edge cases where the property-based
   * test generator creates minimal protocol specs (e.g., format: " ") that result in code
   * with no traditional function declarations. Real protocols (Gopher, Finger) pass correctly.
   * See FAILING-TESTS-ANALYSIS.md for details.
   */
  it('Property 14: TypeScript uses camelCase for functions and PascalCase for classes', async () => {
    const generator = new TypeScriptGenerator();
    const profile = createLanguageProfileWithSteering('typescript');
    
    await fc.assert(
      fc.asyncProperty(
        protocolSpecArbitrary,
        async (spec) => {
          // Generate TypeScript code
          const artifacts = await generator.generate(spec, profile);
          
          // Extract function names (functions and methods)
          const functionPattern = /(?:function|async)\s+([a-z][a-zA-Z0-9]*)\s*\(/g;
          const functionNames = extractFunctionNames(artifacts.parser, functionPattern);
          
          // Verify all function names are camelCase
          for (const name of functionNames) {
            expect(isCamelCase(name), `Function "${name}" should be camelCase`).toBe(true);
          }
          
          // Extract class names
          const classPattern = /class\s+([A-Z][a-zA-Z0-9]*)/g;
          const classNames = extractTypeNames(artifacts.parser, classPattern);
          
          // Verify all class names are PascalCase
          for (const name of classNames) {
            expect(isPascalCase(name), `Class "${name}" should be PascalCase`).toBe(true);
          }
          
          // Verify no snake_case in TypeScript
          const hasSnakeCase = /\b[a-z]+_[a-z]+\b/.test(artifacts.parser);
          expect(hasSnakeCase, 'TypeScript should not use snake_case').toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });
  
  /**
   * Feature: prm-phase-2, Property 14: Language-Specific Naming Conventions (Python)
   * For any generated Python code, identifiers should follow snake_case convention
   * Validates: Requirements 7.3
   */
  it('Property 14: Python uses snake_case for functions and PascalCase for classes', async () => {
    const generator = new PythonGenerator();
    const profile = createLanguageProfileWithSteering('python');
    
    await fc.assert(
      fc.asyncProperty(
        protocolSpecArbitrary,
        async (spec) => {
          // Generate Python code
          const artifacts = await generator.generate(spec, profile);
          
          // Extract function names
          const functionPattern = /def\s+([a-z_][a-z0-9_]*)\s*\(/g;
          const functionNames = extractFunctionNames(artifacts.parser, functionPattern);
          
          // Verify all function names are snake_case
          for (const name of functionNames) {
            if (!name.startsWith('_')) {  // Skip private methods
              expect(isSnakeCase(name), `Function "${name}" should be snake_case`).toBe(true);
            }
          }
          
          // Extract class names
          const classPattern = /class\s+([A-Z][a-zA-Z0-9]*)/g;
          const classNames = extractTypeNames(artifacts.parser, classPattern);
          
          // Verify all class names are PascalCase
          for (const name of classNames) {
            expect(isPascalCase(name), `Class "${name}" should be PascalCase`).toBe(true);
          }
          
          // Verify no camelCase in Python (except for class names)
          const hasCamelCase = /\b[a-z][a-zA-Z]+[A-Z][a-zA-Z]*\b/.test(artifacts.parser);
          expect(hasCamelCase, 'Python should not use camelCase for functions').toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });
  
  /**
   * Feature: prm-phase-2, Property 14: Language-Specific Naming Conventions (Go)
   * For any generated Go code, identifiers should follow PascalCase for exports and camelCase for private
   * Validates: Requirements 7.4
   */
  it('Property 14: Go uses PascalCase for exports and camelCase for private', async () => {
    const generator = new GoGenerator();
    const profile = createLanguageProfileWithSteering('go');
    
    await fc.assert(
      fc.asyncProperty(
        protocolSpecArbitrary,
        async (spec) => {
          // Generate Go code
          const artifacts = await generator.generate(spec, profile);
          
          // Extract exported function names (start with capital letter)
          const exportedFuncPattern = /func\s+(?:\([^)]+\)\s+)?([A-Z][a-zA-Z0-9]*)\s*\(/g;
          const exportedFuncNames = extractFunctionNames(artifacts.parser, exportedFuncPattern);
          
          // Verify all exported function names are PascalCase
          for (const name of exportedFuncNames) {
            expect(isPascalCase(name), `Exported function "${name}" should be PascalCase`).toBe(true);
          }
          
          // Extract struct names (should be PascalCase for exports)
          const structPattern = /type\s+([A-Z][a-zA-Z0-9]*)\s+struct/g;
          const structNames = extractTypeNames(artifacts.parser, structPattern);
          
          // Verify all struct names are PascalCase
          for (const name of structNames) {
            expect(isPascalCase(name), `Struct "${name}" should be PascalCase`).toBe(true);
          }
          
          // Verify no snake_case in Go
          const hasSnakeCase = /\b[a-z]+_[a-z]+\b/.test(artifacts.parser);
          expect(hasSnakeCase, 'Go should not use snake_case').toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });
  
  /**
   * Feature: prm-phase-2, Property 14: Language-Specific Naming Conventions (Rust)
   * For any generated Rust code, identifiers should follow snake_case convention
   * Validates: Requirements 7.5
   */
  it('Property 14: Rust uses snake_case for functions and PascalCase for structs', async () => {
    const generator = new RustGenerator();
    const profile = createLanguageProfileWithSteering('rust');
    
    await fc.assert(
      fc.asyncProperty(
        protocolSpecArbitrary,
        async (spec) => {
          // Generate Rust code
          const artifacts = await generator.generate(spec, profile);
          
          // Extract function names
          const functionPattern = /fn\s+([a-z_][a-z0-9_]*)\s*\(/g;
          const functionNames = extractFunctionNames(artifacts.parser, functionPattern);
          
          // Verify all function names are snake_case
          for (const name of functionNames) {
            expect(isSnakeCase(name), `Function "${name}" should be snake_case`).toBe(true);
          }
          
          // Extract struct names
          const structPattern = /struct\s+([A-Z][a-zA-Z0-9]*)/g;
          const structNames = extractTypeNames(artifacts.parser, structPattern);
          
          // Verify all struct names are PascalCase
          for (const name of structNames) {
            expect(isPascalCase(name), `Struct "${name}" should be PascalCase`).toBe(true);
          }
          
          // Verify no camelCase in Rust (except for struct names)
          const hasCamelCase = /\b[a-z][a-zA-Z]+[A-Z][a-zA-Z]*\b/.test(artifacts.parser);
          expect(hasCamelCase, 'Rust should not use camelCase for functions').toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });
  
  /**
   * Cross-language test: Verify each language uses its own conventions
   */
  it('Property 14: All languages use their respective naming conventions', async () => {
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
          
          // TypeScript: should have camelCase functions
          const tsFunctions = extractFunctionNames(tsArtifacts.parser, /(?:function|async)\s+([a-z][a-zA-Z0-9]*)\s*\(/g);
          expect(tsFunctions.length, 'TypeScript should have camelCase functions').toBeGreaterThan(0);
          
          // Python: should have snake_case functions
          const pyFunctions = extractFunctionNames(pyArtifacts.parser, /def\s+([a-z_][a-z0-9_]*)\s*\(/g);
          expect(pyFunctions.length, 'Python should have snake_case functions').toBeGreaterThan(0);
          
          // Go: should have PascalCase exported functions
          const goFunctions = extractFunctionNames(goArtifacts.parser, /func\s+(?:\([^)]+\)\s+)?([A-Z][a-zA-Z0-9]*)\s*\(/g);
          expect(goFunctions.length, 'Go should have PascalCase exported functions').toBeGreaterThan(0);
          
          // Rust: should have snake_case functions
          const rustFunctions = extractFunctionNames(rustArtifacts.parser, /fn\s+([a-z_][a-z0-9_]*)\s*\(/g);
          expect(rustFunctions.length, 'Rust should have snake_case functions').toBeGreaterThan(0);
        }
      ),
      { numRuns: 100 }
    );
  });
});
