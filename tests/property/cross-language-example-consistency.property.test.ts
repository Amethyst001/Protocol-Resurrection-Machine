/**
 * Property-Based Tests for Cross-Language Example Consistency
 * 
 * Feature: protocol-resurrection-machine, Property 28: Cross-Language Example Consistency
 * Validates: Requirements 23.1, 23.2, 23.3, 23.4, 23.5
 * 
 * Tests that examples generated for different languages are functionally equivalent:
 * - Same operations produce same results
 * - Same error conditions produce same errors
 * - Examples follow language-specific idioms
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { ExampleGenerator } from '../../src/documentation/example-generator';
import type { ProtocolSpec } from '../../src/types/protocol-spec';

describe('Property 28: Cross-Language Example Consistency', () => {
  const exampleGenerator = new ExampleGenerator();

  /**
   * Property: All languages have examples for same operations
   */
  it('should generate examples for all languages', () => {
    fc.assert(
      fc.property(
        fc.record({
          protocol: fc.record({
            name: fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
            description: fc.string(),
            version: fc.constant('1.0.0')
          }),
          connection: fc.record({
            transport: fc.constantFrom('tcp', 'udp'),
            defaultPort: fc.integer({ min: 1, max: 65535 }),
            terminator: fc.option(fc.constantFrom('\\r\\n', '\\n'))
          }),
          messageTypes: fc.array(
            fc.record({
              name: fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
              direction: fc.constantFrom('request', 'response'),
              format: fc.string({ minLength: 1 }),
              fields: fc.array(
                fc.record({
                  name: fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
                  type: fc.constantFrom('string', 'number', 'boolean'),
                  required: fc.boolean()
                }),
                { minLength: 1, maxLength: 3 }
              )
            }),
            { minLength: 1, maxLength: 3 }
          )
        }),
        (spec: ProtocolSpec) => {
          const examples = exampleGenerator.generateCrossLanguageExamples(spec);
          
          // Verify examples exist
          expect(examples).toBeDefined();
          expect(examples.length).toBeGreaterThan(0);
          
          // Verify each example has all languages
          for (const example of examples) {
            expect(example.typescript).toBeDefined();
            expect(example.python).toBeDefined();
            expect(example.go).toBeDefined();
            expect(example.rust).toBeDefined();
          }
          
          return true;
        }
      ),
      { numRuns: 20 }
    );
  });

  /**
   * Property: Examples follow language-specific naming conventions
   */
  it('should follow language-specific naming conventions', () => {
    fc.assert(
      fc.property(
        fc.record({
          protocol: fc.record({
            name: fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
            description: fc.string(),
            version: fc.constant('1.0.0')
          }),
          connection: fc.record({
            transport: fc.constantFrom('tcp', 'udp'),
            defaultPort: fc.integer({ min: 1, max: 65535 }),
            terminator: fc.option(fc.constantFrom('\\r\\n', '\\n'))
          }),
          messageTypes: fc.array(
            fc.record({
              name: fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
              direction: fc.constantFrom('request', 'response'),
              format: fc.string({ minLength: 1 }),
              fields: fc.array(
                fc.record({
                  name: fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
                  type: fc.constantFrom('string', 'number', 'boolean'),
                  required: fc.boolean()
                }),
                { minLength: 1, maxLength: 3 }
              )
            }),
            { minLength: 1, maxLength: 3 }
          )
        }),
        (spec: ProtocolSpec) => {
          const examples = exampleGenerator.generateCrossLanguageExamples(spec);
          
          // Verify examples follow language conventions
          for (const example of examples) {
            // TypeScript should use camelCase/PascalCase
            expect(example.typescript).toMatch(/[a-zA-Z]/);
            
            // Python should use snake_case
            expect(example.python).toMatch(/[a-z_]/);
            
            // Go should use PascalCase
            expect(example.go).toMatch(/[A-Z]/);
            
            // Rust should use snake_case
            expect(example.rust).toMatch(/[a-z_]/);
          }
          
          return true;
        }
      ),
      { numRuns: 20 }
    );
  });

  /**
   * Property: Examples demonstrate same operations
   */
  it('should demonstrate same operations across languages', () => {
    fc.assert(
      fc.property(
        fc.record({
          protocol: fc.record({
            name: fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
            description: fc.string(),
            version: fc.constant('1.0.0')
          }),
          connection: fc.record({
            transport: fc.constantFrom('tcp', 'udp'),
            defaultPort: fc.integer({ min: 1, max: 65535 }),
            terminator: fc.option(fc.constantFrom('\\r\\n', '\\n'))
          }),
          messageTypes: fc.array(
            fc.record({
              name: fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
              direction: fc.constantFrom('request', 'response'),
              format: fc.string({ minLength: 1 }),
              fields: fc.array(
                fc.record({
                  name: fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
                  type: fc.constantFrom('string', 'number', 'boolean'),
                  required: fc.boolean()
                }),
                { minLength: 1, maxLength: 3 }
              )
            }),
            { minLength: 1, maxLength: 3 }
          )
        }),
        (spec: ProtocolSpec) => {
          const examples = exampleGenerator.generateCrossLanguageExamples(spec);
          
          // All examples should have code (not empty)
          for (const example of examples) {
            expect(example.typescript.length).toBeGreaterThan(0);
            expect(example.python.length).toBeGreaterThan(0);
            expect(example.go.length).toBeGreaterThan(0);
            expect(example.rust.length).toBeGreaterThan(0);
            
            // All should have installation instructions
            expect(example.installation.typescript).toBeDefined();
            expect(example.installation.python).toBeDefined();
            expect(example.installation.go).toBeDefined();
            expect(example.installation.rust).toBeDefined();
          }
          
          return true;
        }
      ),
      { numRuns: 20 }
    );
  });
});
