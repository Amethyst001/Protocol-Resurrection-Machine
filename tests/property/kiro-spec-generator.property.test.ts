/**
 * Property-Based Tests for Kiro Spec Generator
 * 
 * Tests properties related to generating Kiro specification documents
 * from protocol specifications.
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { KiroSpecGenerator } from '../../src/generation/kiro-spec-generator.js';
import type { ProtocolSpec, MessageType, FieldType } from '../../src/types/protocol-spec.js';

describe('Kiro Spec Generator Property Tests', () => {
  const generator = new KiroSpecGenerator();

  /**
   * Feature: protocol-resurrection-machine, Property 5: Round-Trip Property Coverage
   * For any protocol specification with N message types, the generated design.md should contain
   * at least N round-trip correctness properties, one for each message type.
   */
  describe('Property 5: Round-Trip Property Coverage', () => {
    it('should generate at least one round-trip property per message type', () => {
      fc.assert(
        fc.property(
          fc.record({
            numMessageTypes: fc.integer({ min: 1, max: 10 }),
            protocolName: fc.string({ minLength: 3, maxLength: 20 }).filter(s => /^[A-Z][a-zA-Z]+$/.test(s)),
          }),
          (data) => {
            // Generate a protocol spec with N message types
            const spec = createProtocolSpec(data.protocolName, data.numMessageTypes);

            // Generate design document
            const design = generator.generateDesign(spec);

            // Count round-trip properties in the design document
            // Look for patterns like "Property X: MessageName Round-Trip"
            const roundTripPropertyPattern = /\*\*Property \d+: \w+ Round-Trip/g;
            const matches = design.match(roundTripPropertyPattern);
            const roundTripCount = matches ? matches.length : 0;

            // Should have at least N round-trip properties (one per message type)
            expect(roundTripCount).toBeGreaterThanOrEqual(data.numMessageTypes);

            // Verify each message type has a round-trip property
            for (const messageType of spec.messageTypes) {
              const messageRoundTripPattern = new RegExp(
                `\\*\\*Property \\d+: ${messageType.name} Round-Trip`,
                'i'
              );
              expect(design).toMatch(messageRoundTripPattern);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should include parse(serialize(x)) == x in round-trip properties', () => {
      fc.assert(
        fc.property(
          fc.record({
            numMessageTypes: fc.integer({ min: 1, max: 5 }),
            protocolName: fc.string({ minLength: 3, maxLength: 20 }).filter(s => /^[A-Z][a-zA-Z]+$/.test(s)),
          }),
          (data) => {
            const spec = createProtocolSpec(data.protocolName, data.numMessageTypes);
            const design = generator.generateDesign(spec);

            // Each round-trip property should mention the round-trip concept
            for (const messageType of spec.messageTypes) {
              // Look for the round-trip property for this message type
              // The pattern needs to capture across multiple lines
              const escapedName = messageType.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
              const roundTripPattern = new RegExp(
                `\\*\\*Property \\d+: ${escapedName} Round-Trip Correctness\\*\\*\\s*\\*For any\\*[^*]+`,
                's'
              );
              const match = design.match(roundTripPattern);
              
              expect(match).toBeTruthy();
              
              if (match) {
                const propertyText = match[0];
                
                // Should mention serializing and parsing
                expect(propertyText).toContain('serializing');
                expect(propertyText).toContain('parsing');
                expect(propertyText).toContain('parse(serialize(message)) == message');
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should link round-trip properties to requirements', () => {
      fc.assert(
        fc.property(
          fc.record({
            numMessageTypes: fc.integer({ min: 1, max: 5 }),
            protocolName: fc.string({ minLength: 3, maxLength: 20 }).filter(s => /^[A-Z][a-zA-Z]+$/.test(s)),
          }),
          (data) => {
            const spec = createProtocolSpec(data.protocolName, data.numMessageTypes);
            const design = generator.generateDesign(spec);

            // Each property should have a "Validates: Requirements" line
            const propertyBlocks = design.split(/\*\*Property \d+:/);
            
            for (let i = 1; i < propertyBlocks.length; i++) {
              const block = propertyBlocks[i];
              if (block.toLowerCase().includes('round-trip')) {
                expect(block).toMatch(/\*\*Validates: Requirements/);
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Feature: protocol-resurrection-machine, Property 6: Protocol Compliance Property Generation
   * For any message type with format constraints (fixed strings, delimiters, field types),
   * the generated design.md should include correctness properties that verify compliance
   * with those constraints.
   */
  describe('Property 6: Protocol Compliance Property Generation', () => {
    it('should generate delimiter handling property when messages have delimiters', () => {
      fc.assert(
        fc.property(
          fc.record({
            protocolName: fc.string({ minLength: 3, maxLength: 20 }).filter(s => /^[A-Z][a-zA-Z]+$/.test(s)),
            delimiter: fc.constantFrom('\t', ',', '|', ';'),
          }),
          (data) => {
            const spec = createProtocolSpecWithDelimiter(data.protocolName, data.delimiter);
            const design = generator.generateDesign(spec);

            // Should have a property about delimiter handling
            const hasDelimiterProperty = 
              design.toLowerCase().includes('delimiter') &&
              design.toLowerCase().includes('property');

            expect(hasDelimiterProperty).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should generate terminator handling property when messages have terminators', () => {
      fc.assert(
        fc.property(
          fc.record({
            protocolName: fc.string({ minLength: 3, maxLength: 20 }).filter(s => /^[A-Z][a-zA-Z]+$/.test(s)),
            terminator: fc.constantFrom('\r\n', '\n', '\0'),
          }),
          (data) => {
            const spec = createProtocolSpecWithTerminator(data.protocolName, data.terminator);
            const design = generator.generateDesign(spec);

            // Should have a property about terminator handling
            const hasTerminatorProperty = 
              design.toLowerCase().includes('terminator') &&
              design.toLowerCase().includes('property');

            expect(hasTerminatorProperty).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should generate field validation property for required fields', () => {
      fc.assert(
        fc.property(
          fc.record({
            protocolName: fc.string({ minLength: 3, maxLength: 20 }).filter(s => /^[A-Z][a-zA-Z]+$/.test(s)),
            numRequiredFields: fc.integer({ min: 1, max: 5 }),
          }),
          (data) => {
            const spec = createProtocolSpecWithRequiredFields(
              data.protocolName,
              data.numRequiredFields
            );
            const design = generator.generateDesign(spec);

            // Should have properties about required field validation
            const hasValidationProperty = 
              design.toLowerCase().includes('required field') &&
              design.toLowerCase().includes('validation');

            expect(hasValidationProperty).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should generate parser error reporting property', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 3, maxLength: 20 }).filter(s => /^[A-Z][a-zA-Z]+$/.test(s)),
          (protocolName) => {
            const spec = createProtocolSpec(protocolName, 1);
            const design = generator.generateDesign(spec);

            // Should have a property about parser error reporting
            const hasParserErrorProperty = 
              design.toLowerCase().includes('parser error') &&
              design.toLowerCase().includes('byte offset');

            expect(hasParserErrorProperty).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should generate serializer validation property', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 3, maxLength: 20 }).filter(s => /^[A-Z][a-zA-Z]+$/.test(s)),
          (protocolName) => {
            const spec = createProtocolSpec(protocolName, 1);
            const design = generator.generateDesign(spec);

            // Should have a property about serializer validation
            const hasSerializerValidationProperty = 
              design.toLowerCase().includes('serializer validation') ||
              (design.toLowerCase().includes('serialization') && 
               design.toLowerCase().includes('invalid') &&
               design.toLowerCase().includes('field'));

            expect(hasSerializerValidationProperty).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should generate format compliance property', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 3, maxLength: 20 }).filter(s => /^[A-Z][a-zA-Z]+$/.test(s)),
          (protocolName) => {
            const spec = createProtocolSpec(protocolName, 1);
            const design = generator.generateDesign(spec);

            // Should have a property about format compliance
            const hasFormatComplianceProperty = 
              design.toLowerCase().includes('format') &&
              (design.toLowerCase().includes('compliance') || 
               design.toLowerCase().includes('conform'));

            expect(hasFormatComplianceProperty).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Feature: protocol-resurrection-machine, Property 4: Kiro Spec Generation Completeness
   * For any valid protocol specification, generating Kiro specs should produce requirements.md,
   * design.md, and tasks.md files with complete content.
   */
  describe('Property 4: Kiro Spec Generation Completeness', () => {
    it('should generate all three spec documents', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 3, maxLength: 20 }).filter(s => /^[A-Z][a-zA-Z]+$/.test(s)),
          (protocolName) => {
            const spec = createProtocolSpec(protocolName, 2);
            const specs = generator.generateAll(spec);

            // Should have all three documents
            expect(specs.requirements).toBeTruthy();
            expect(specs.design).toBeTruthy();
            expect(specs.tasks).toBeTruthy();

            // Each should be non-empty
            expect(specs.requirements.length).toBeGreaterThan(100);
            expect(specs.design.length).toBeGreaterThan(100);
            expect(specs.tasks.length).toBeGreaterThan(100);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should generate EARS-compliant acceptance criteria in requirements', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 3, maxLength: 20 }).filter(s => /^[A-Z][a-zA-Z]+$/.test(s)),
          (protocolName) => {
            const spec = createProtocolSpec(protocolName, 1);
            const requirements = generator.generateRequirements(spec);

            // Should contain EARS patterns (WHEN...THEN, WHILE...THEN, IF...THEN)
            const hasWhenThen = /WHEN .+ THEN .+ SHALL/i.test(requirements);
            
            expect(hasWhenThen).toBe(true);

            // Should not contain escape clauses
            const hasEscapeClauses = /except|unless|if possible|as appropriate/i.test(requirements);
            expect(hasEscapeClauses).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should generate correctness properties in design document', () => {
      fc.assert(
        fc.property(
          fc.record({
            protocolName: fc.string({ minLength: 3, maxLength: 20 }).filter(s => /^[A-Z][a-zA-Z]+$/.test(s)),
            numMessageTypes: fc.integer({ min: 1, max: 5 }),
          }),
          (data) => {
            const spec = createProtocolSpec(data.protocolName, data.numMessageTypes);
            const design = generator.generateDesign(spec);

            // Should have "Correctness Properties" section
            expect(design).toContain('Correctness Properties');

            // Should have multiple properties
            const propertyCount = (design.match(/\*\*Property \d+:/g) || []).length;
            expect(propertyCount).toBeGreaterThan(0);

            // Properties should use "For any" quantification
            const hasForAny = design.includes('*For any*');
            expect(hasForAny).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should generate ordered implementation tasks', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 3, maxLength: 20 }).filter(s => /^[A-Z][a-zA-Z]+$/.test(s)),
          (protocolName) => {
            const spec = createProtocolSpec(protocolName, 1);
            const tasks = generator.generateTasks(spec);

            // Should have numbered tasks
            const hasNumberedTasks = /- \[ \] \d+\./m.test(tasks);
            expect(hasNumberedTasks).toBe(true);

            // Should mention parser, serializer, client
            expect(tasks.toLowerCase()).toContain('parser');
            expect(tasks.toLowerCase()).toContain('serializer');
            expect(tasks.toLowerCase()).toContain('client');
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});

// Helper functions to create test protocol specs

function createProtocolSpec(name: string, numMessageTypes: number): ProtocolSpec {
  const messageTypes: MessageType[] = [];
  
  for (let i = 0; i < numMessageTypes; i++) {
    messageTypes.push({
      name: `Message${i + 1}`,
      direction: i % 2 === 0 ? 'request' : 'response',
      format: `{field1}\\t{field2}\\r\\n`,
      fields: [
        {
          name: 'field1',
          type: { kind: 'string' },
          required: true,
        },
        {
          name: 'field2',
          type: { kind: 'number' },
          required: true,
        },
      ],
      delimiter: '\t',
      terminator: '\r\n',
    });
  }

  return {
    protocol: {
      name,
      port: 8080,
      description: `Test protocol ${name}`,
    },
    connection: {
      type: 'TCP',
    },
    messageTypes,
  };
}

function createProtocolSpecWithDelimiter(name: string, delimiter: string): ProtocolSpec {
  return {
    protocol: {
      name,
      port: 8080,
      description: `Test protocol ${name}`,
    },
    connection: {
      type: 'TCP',
    },
    messageTypes: [
      {
        name: 'TestMessage',
        direction: 'request',
        format: `{field1}${delimiter}{field2}\\r\\n`,
        fields: [
          {
            name: 'field1',
            type: { kind: 'string' },
            required: true,
          },
          {
            name: 'field2',
            type: { kind: 'string' },
            required: true,
          },
        ],
        delimiter,
        terminator: '\r\n',
      },
    ],
  };
}

function createProtocolSpecWithTerminator(name: string, terminator: string): ProtocolSpec {
  return {
    protocol: {
      name,
      port: 8080,
      description: `Test protocol ${name}`,
    },
    connection: {
      type: 'TCP',
    },
    messageTypes: [
      {
        name: 'TestMessage',
        direction: 'request',
        format: `{field1}${terminator}`,
        fields: [
          {
            name: 'field1',
            type: { kind: 'string' },
            required: true,
          },
        ],
        terminator,
      },
    ],
  };
}

function createProtocolSpecWithRequiredFields(
  name: string,
  numRequiredFields: number
): ProtocolSpec {
  const fields: Array<{
    name: string;
    type: FieldType;
    required: boolean;
  }> = [];
  
  for (let i = 0; i < numRequiredFields; i++) {
    fields.push({
      name: `field${i + 1}`,
      type: { kind: 'string' } as FieldType,
      required: true,
    });
  }

  return {
    protocol: {
      name,
      port: 8080,
      description: `Test protocol ${name}`,
    },
    connection: {
      type: 'TCP',
    },
    messageTypes: [
      {
        name: 'TestMessage',
        direction: 'request',
        format: fields.map(f => `{${f.name}}`).join('\\t') + '\\r\\n',
        fields,
        delimiter: '\t',
        terminator: '\r\n',
      },
    ],
  };
}

function extractMessagePropertySection(design: string, messageName: string): string | null {
  const pattern = new RegExp(
    `\\*\\*Property \\d+: ${messageName} Round-Trip[^*]+`,
    'i'
  );
  const match = design.match(pattern);
  return match ? match[0] : null;
}
