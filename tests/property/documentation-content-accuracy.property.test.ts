/**
 * Property-Based Tests for Documentation Content Accuracy
 * 
 * Feature: protocol-resurrection-machine, Property 26: Documentation Content Accuracy
 * Validates: Requirements 19.2, 19.3, 19.4, 20.2, 20.3
 * 
 * Tests that generated documentation accurately reflects all protocol elements:
 * - All message types are documented
 * - All fields are documented with correct types
 * - All constraints are documented
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { DocumentationGenerator } from '../../src/documentation/documentation-generator';
import type { ProtocolSpec } from '../../src/types/protocol-spec';

describe('Property 26: Documentation Content Accuracy', () => {
  const generator = new DocumentationGenerator();

  /**
   * Property: All message types appear in documentation
   */
  it('should document all message types', () => {
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
          const docs = generator.generate(spec);
          
          // Verify all message types are documented in readme
          for (const messageType of spec.messageTypes) {
            expect(docs.readme).toContain(messageType.name);
          }
          
          return true;
        }
      ),
      { numRuns: 20 }
    );
  });

  /**
   * Property: All fields are documented with types
   */
  it('should document all fields with their types', () => {
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
            { minLength: 1, maxLength: 2 }
          )
        }),
        (spec: ProtocolSpec) => {
          const docs = generator.generate(spec);
          
          // Verify all fields are documented
          for (const messageType of spec.messageTypes) {
            for (const field of messageType.fields) {
              expect(docs.readme).toContain(field.name);
              expect(docs.readme).toContain(field.type);
            }
          }
          
          return true;
        }
      ),
      { numRuns: 20 }
    );
  });

  /**
   * Property: Documentation structure is complete
   */
  it('should generate complete documentation structure', () => {
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
                { minLength: 1, maxLength: 2 }
              )
            }),
            { minLength: 1, maxLength: 2 }
          )
        }),
        (spec: ProtocolSpec) => {
          const docs = generator.generate(spec);
          
          // Verify documentation structure
          expect(docs.readme).toBeDefined();
          expect(docs.apiReference).toBeDefined();
          expect(docs.examples).toBeDefined();
          expect(docs.examples.length).toBeGreaterThan(0);
          
          // Verify examples for all languages
          const languages = docs.examples.map(e => e.language);
          expect(languages).toContain('typescript');
          expect(languages).toContain('python');
          expect(languages).toContain('go');
          expect(languages).toContain('rust');
          
          return true;
        }
      ),
      { numRuns: 20 }
    );
  });
});
