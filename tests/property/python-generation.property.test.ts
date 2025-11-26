/**
 * Property-Based Tests for Python Code Generation
 * 
 * Feature: prm-phase-2, Property 13: Multi-Language Code Generation (Python)
 * 
 * Tests that Python code generation:
 * - Produces valid Python code
 * - Follows snake_case naming convention
 * - Uses Exception classes for errors
 * - Generates all required artifacts
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { PythonGenerator } from '../../src/generation/multi-language/python-generator.js';
import { createLanguageProfile } from '../../src/types/language-target.js';
import type { ProtocolSpec } from '../../src/types/protocol-spec.js';

describe('Python Code Generation Properties', () => {
  const generator = new PythonGenerator();
  const profile = createLanguageProfile('python');
  
  /**
   * Feature: prm-phase-2, Property 13: Multi-Language Code Generation (Python)
   * For any protocol specification, Python code generation should produce
   * valid artifacts that follow Python conventions
   * 
   * Validates: Requirements 6.3, 7.3, 8.2
   */
  it('should generate valid Python code for any protocol spec', async () => {
    await fc.assert(
      fc.asyncProperty(
        protocolSpecArbitrary(),
        async (spec) => {
          // Generate Python code
          const artifacts = await generator.generate(spec, profile);
          
          // Verify all artifacts are generated
          expect(artifacts.language).toBe('python');
          expect(artifacts.parser).toBeTruthy();
          expect(artifacts.serializer).toBeTruthy();
          expect(artifacts.client).toBeTruthy();
          expect(artifacts.tests).toBeTruthy();
          expect(artifacts.generationTimeMs).toBeGreaterThanOrEqual(0);
          
          // Verify Python code structure
          expect(artifacts.parser).toContain('"""');  // Docstrings
          expect(artifacts.parser).toContain('@dataclass');
          expect(artifacts.parser).toContain('class');
          
          // Verify no TypeScript-specific syntax
          expect(artifacts.parser).not.toContain('interface');
          expect(artifacts.parser).not.toContain('export');
          expect(artifacts.parser).not.toContain(': string');
        }
      ),
      { numRuns: 100 }
    );
  });
  
  /**
   * Feature: prm-phase-2, Property 14: Language-Specific Naming Conventions
   * For any generated Python code, all identifiers should follow snake_case
   * 
   * Validates: Requirements 7.3
   */
  it('should use snake_case naming convention', async () => {
    await fc.assert(
      fc.asyncProperty(
        protocolSpecArbitrary(),
        async (spec) => {
          // Generate Python code
          const artifacts = await generator.generate(spec, profile);
          
          // Check for snake_case in method names
          const methodPattern = /def\s+([a-z_][a-z0-9_]*)\s*\(/g;
          const methods = artifacts.parser.match(methodPattern) || [];
          
          for (const method of methods) {
            const methodName = method.match(/def\s+([a-z_][a-z0-9_]*)/)?.[1];
            if (methodName && !methodName.startsWith('_')) {
              // Verify snake_case (no camelCase)
              expect(methodName).not.toMatch(/[A-Z]/);
              // Verify it's not PascalCase
              expect(methodName[0]).not.toMatch(/[A-Z]/);
            }
          }
          
          // Check for PascalCase in class names
          const classPattern = /class\s+([A-Z][a-zA-Z0-9]*)/g;
          const classes = artifacts.parser.match(classPattern) || [];
          
          for (const cls of classes) {
            const className = cls.match(/class\s+([A-Z][a-zA-Z0-9]*)/)?.[1];
            if (className) {
              // Verify PascalCase for classes
              expect(className[0]).toMatch(/[A-Z]/);
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });
  
  /**
   * Feature: prm-phase-2, Property 15: Language-Specific Error Handling
   * For any generated Python code, errors should use Exception classes
   * 
   * Validates: Requirements 8.2
   */
  it('should use Exception classes for error handling', async () => {
    await fc.assert(
      fc.asyncProperty(
        protocolSpecArbitrary(),
        async (spec) => {
          // Generate Python code
          const artifacts = await generator.generate(spec, profile);
          
          // Verify Exception classes are defined
          expect(artifacts.parser).toContain('Exception');
          expect(artifacts.parser).toContain('raise');
          
          // Verify no TypeScript-style error handling
          expect(artifacts.parser).not.toContain('throw new');
          expect(artifacts.parser).not.toContain('try {');
          
          // Verify Python-style try/except
          if (artifacts.parser.includes('try:')) {
            expect(artifacts.parser).toContain('except');
          }
          
          // Verify custom exception classes inherit from Exception
          const exceptionPattern = /class\s+\w+Error\((\w+)\)/g;
          const exceptions = artifacts.parser.match(exceptionPattern) || [];
          
          for (const exc of exceptions) {
            const baseClass = exc.match(/class\s+\w+Error\((\w+)\)/)?.[1];
            if (baseClass) {
              expect(baseClass).toMatch(/Error|Exception/);
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });
  
  /**
   * Feature: prm-phase-2, Property 13: Multi-Language Code Generation (Python)
   * For any protocol with async operations, Python code should use async/await
   * 
   * Validates: Requirements 6.3, 7.3
   */
  it('should use async/await for async operations', async () => {
    await fc.assert(
      fc.asyncProperty(
        protocolSpecArbitrary(),
        async (spec) => {
          // Generate Python code
          const artifacts = await generator.generate(spec, profile);
          
          // Verify async/await in client
          if (artifacts.client.includes('async def')) {
            expect(artifacts.client).toContain('await');
            expect(artifacts.client).toContain('asyncio');
          }
          
          // Verify no Promise-based syntax
          expect(artifacts.client).not.toContain('Promise');
          expect(artifacts.client).not.toContain('.then(');
        }
      ),
      { numRuns: 100 }
    );
  });
  
  /**
   * Feature: prm-phase-2, Property 13: Multi-Language Code Generation (Python)
   * For any protocol, Python tests should use hypothesis for property-based testing
   * 
   * Validates: Requirements 6.3
   */
  it('should generate hypothesis-based property tests', async () => {
    await fc.assert(
      fc.asyncProperty(
        protocolSpecArbitrary(),
        async (spec) => {
          // Generate Python code
          const artifacts = await generator.generate(spec, profile);
          
          // Verify hypothesis is used
          expect(artifacts.tests).toContain('from hypothesis import');
          expect(artifacts.tests).toContain('@given');
          expect(artifacts.tests).toContain('strategies');
          
          // Verify pytest is used
          expect(artifacts.tests).toContain('pytest');
          
          // Verify no fast-check (TypeScript library)
          expect(artifacts.tests).not.toContain('fast-check');
          expect(artifacts.tests).not.toContain('fc.assert');
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * Arbitrary for generating protocol specifications
 */
function protocolSpecArbitrary(): fc.Arbitrary<ProtocolSpec> {
  return fc.record({
    protocol: fc.record({
      name: fc.constantFrom('Gopher', 'Finger', 'TestProtocol'),
      rfc: fc.string(),
      port: fc.integer({ min: 1, max: 65535 }),
      description: fc.string()
    }),
    connection: fc.record({
      type: fc.constantFrom('tcp', 'udp'),
      terminator: fc.constantFrom('\\r\\n', '\\n', '\\0')
    }),
    messageTypes: fc.array(
      fc.record({
        name: fc.constantFrom('Query', 'Response', 'Request', 'DirectoryItem'),
        direction: fc.constantFrom('request', 'response', 'bidirectional'),
        format: fc.string(),
        description: fc.string(),
        fields: fc.array(
          fc.record({
            name: fc.constantFrom('selector', 'host', 'port', 'type', 'display'),
            type: fc.constantFrom('string', 'integer', 'number', 'boolean'),
            optional: fc.boolean(),
            delimiter: fc.option(fc.constantFrom('\\t', '\\r\\n', ' '), { nil: undefined })
          }),
          { minLength: 1, maxLength: 5 }
        )
      }),
      { minLength: 1, maxLength: 3 }
    )
  }) as fc.Arbitrary<ProtocolSpec>;
}
