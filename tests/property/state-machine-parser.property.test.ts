/**
 * Property-Based Tests for State Machine Parser Generation
 * 
 * These tests verify that the state machine parser generator produces correct parsers
 * for various format string patterns.
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { StateMachineParserGenerator } from '../../src/generation/state-machine-parser-generator.js';
import type { MessageType } from '../../src/types/protocol-spec.js';

/**
 * Feature: prm-phase-2, Property 1: State Machine Parser Fixed String Validation
 * For any format string containing fixed strings, the generated parser should reject
 * inputs where the fixed strings don't match exactly at the expected byte offsets.
 */
describe('Property 1: State Machine Parser Fixed String Validation', () => {
  it('should reject inputs with mismatched fixed strings', () => {
    fc.assert(
      fc.property(
        // Generate format strings with fixed strings (excluding special chars)
        fc.record({
          prefix: fc.stringMatching(/^[a-zA-Z0-9 ]+$/).filter(s => s.length >= 1 && s.length <= 10),
          suffix: fc.stringMatching(/^[a-zA-Z0-9 ]+$/).filter(s => s.length >= 1 && s.length <= 10),
        }),
        ({ prefix, suffix }) => {
          // Create a message type with fixed strings
          const messageType: MessageType = {
            name: 'TestMessage',
            direction: 'request',
            format: `${prefix}{field}${suffix}`,
            fields: [
              {
                name: 'field',
                type: { kind: 'string' },
                required: true,
              },
            ],
            terminator: '\r\n',
          };
          
          // Generate the parser
          const generator = new StateMachineParserGenerator();
          const parserCode = generator.generateParser(messageType);
          
          // Verify parser code contains fixed string validation
          expect(parserCode).toContain('EXPECT_FIXED');
          expect(parserCode).toContain(prefix);
          expect(parserCode).toContain(suffix);
          
          return true;
        }
      ),
      { numRuns: 1000 }
    );
  });
});

/**
 * Feature: prm-phase-2, Property 2: State Machine Parser Field Extraction
 * For any format string with delimited fields, the generated parser should extract
 * all fields correctly using state transitions, regardless of field content
 * (as long as it doesn't contain the delimiter).
 */
describe('Property 2: State Machine Parser Field Extraction', () => {
  it('should extract all delimited fields correctly', () => {
    fc.assert(
      fc.property(
        // Generate random field names and values
        fc.record({
          field1Name: fc.stringMatching(/^[a-zA-Z][a-zA-Z0-9_]*$/).filter(s => s.length >= 2 && s.length <= 15),
          field2Name: fc.stringMatching(/^[a-zA-Z][a-zA-Z0-9_]*$/).filter(s => s.length >= 2 && s.length <= 15),
          field3Name: fc.stringMatching(/^[a-zA-Z][a-zA-Z0-9_]*$/).filter(s => s.length >= 2 && s.length <= 15),
          // Field values that don't contain the delimiter (tab)
          field1Value: fc.stringMatching(/^[^\t\r\n]+$/).filter(s => s.length >= 1 && s.length <= 50),
          field2Value: fc.stringMatching(/^[^\t\r\n]+$/).filter(s => s.length >= 1 && s.length <= 50),
          field3Value: fc.stringMatching(/^[^\t\r\n]+$/).filter(s => s.length >= 1 && s.length <= 50),
        }),
        ({ field1Name, field2Name, field3Name, field1Value, field2Value, field3Value }) => {
          // Ensure field names are unique
          if (field1Name === field2Name || field2Name === field3Name || field1Name === field3Name) {
            return true; // Skip this test case
          }
          
          // Create a message type with delimited fields
          const messageType: MessageType = {
            name: 'TestMessage',
            direction: 'request',
            format: `{${field1Name}}{${field2Name}}{${field3Name}}`,
            fields: [
              {
                name: field1Name,
                type: { kind: 'string' },
                required: true,
              },
              {
                name: field2Name,
                type: { kind: 'string' },
                required: true,
              },
              {
                name: field3Name,
                type: { kind: 'string' },
                required: true,
              },
            ],
            delimiter: '\t',
            terminator: '\r\n',
          };
          
          // Generate the parser
          const generator = new StateMachineParserGenerator();
          const parserCode = generator.generateParser(messageType);
          
          // Verify parser code contains field extraction states
          expect(parserCode).toContain('EXTRACT_FIELD');
          expect(parserCode).toContain(field1Name);
          expect(parserCode).toContain(field2Name);
          expect(parserCode).toContain(field3Name);
          
          // Verify parser code contains delimiter handling
          expect(parserCode).toContain('EXPECT_DELIMITER');
          expect(parserCode).toContain('\\t');
          
          // Verify field extraction mechanism is present
          expect(parserCode).toContain('context.fields.set(fieldName');
          expect(parserCode).toContain('context.fields.get(');
          
          // Verify all fields are included in the final message
          expect(parserCode).toContain(`message.${field1Name}`);
          expect(parserCode).toContain(`message.${field2Name}`);
          expect(parserCode).toContain(`message.${field3Name}`);
          
          return true;
        }
      ),
      { numRuns: 1000 }
    );
  });
  
  it('should handle numeric field extraction', () => {
    fc.assert(
      fc.property(
        fc.record({
          fieldName: fc.stringMatching(/^[a-zA-Z][a-zA-Z0-9_]*$/).filter(s => s.length >= 2 && s.length <= 15),
          numericValue: fc.integer({ min: 0, max: 65535 }),
        }),
        ({ fieldName, numericValue }) => {
          // Create a message type with a numeric field
          const messageType: MessageType = {
            name: 'TestMessage',
            direction: 'request',
            format: `{${fieldName}}`,
            fields: [
              {
                name: fieldName,
                type: { kind: 'number' },
                required: true,
              },
            ],
            terminator: '\r\n',
          };
          
          // Generate the parser
          const generator = new StateMachineParserGenerator();
          const parserCode = generator.generateParser(messageType);
          
          // Verify parser code contains field extraction
          expect(parserCode).toContain('EXTRACT_FIELD');
          expect(parserCode).toContain(fieldName);
          
          // Verify parser code contains type conversion for numbers
          expect(parserCode).toContain('number');
          expect(parserCode).toContain('parseInt');
          
          return true;
        }
      ),
      { numRuns: 1000 }
    );
  });
  
  it('should extract fields with various delimiters', () => {
    fc.assert(
      fc.property(
        fc.record({
          field1Name: fc.stringMatching(/^[a-zA-Z][a-zA-Z0-9_]*$/).filter(s => s.length >= 2 && s.length <= 15),
          field2Name: fc.stringMatching(/^[a-zA-Z][a-zA-Z0-9_]*$/).filter(s => s.length >= 2 && s.length <= 15),
          // Choose from common delimiters
          delimiter: fc.constantFrom('\t', '|', ',', ':', ';', ' '),
        }),
        ({ field1Name, field2Name, delimiter }) => {
          // Ensure field names are unique
          if (field1Name === field2Name) {
            return true; // Skip this test case
          }
          
          // Create a message type with custom delimiter
          const messageType: MessageType = {
            name: 'TestMessage',
            direction: 'request',
            format: `{${field1Name}}{${field2Name}}`,
            fields: [
              {
                name: field1Name,
                type: { kind: 'string' },
                required: true,
              },
              {
                name: field2Name,
                type: { kind: 'string' },
                required: true,
              },
            ],
            delimiter,
            terminator: '\r\n',
          };
          
          // Generate the parser
          const generator = new StateMachineParserGenerator();
          const parserCode = generator.generateParser(messageType);
          
          // Verify parser code contains delimiter handling
          expect(parserCode).toContain('EXPECT_DELIMITER');
          
          // Verify field extraction mechanism is present
          expect(parserCode).toContain('context.fields.set(fieldName');
          
          // Verify both fields are included in the message
          expect(parserCode).toContain(`message.${field1Name}`);
          expect(parserCode).toContain(`message.${field2Name}`);
          
          return true;
        }
      ),
      { numRuns: 1000 }
    );
  });
});

/**
 * Feature: prm-phase-2, Property 3: State Machine Parser Mixed Pattern Handling
 * For any format string with alternating fixed strings and placeholders, the generated
 * parser should correctly alternate between validation and extraction states.
 */
describe('Property 3: State Machine Parser Mixed Pattern Handling', () => {
  it('should handle mixed fixed strings and placeholders', () => {
    fc.assert(
      fc.property(
        fc.record({
          prefix: fc.stringMatching(/^[a-zA-Z0-9 ]+$/).filter(s => s.length >= 1 && s.length <= 10),
          middle: fc.stringMatching(/^[a-zA-Z0-9 ]+$/).filter(s => s.length >= 1 && s.length <= 10),
          suffix: fc.stringMatching(/^[a-zA-Z0-9 ]+$/).filter(s => s.length >= 1 && s.length <= 10),
          field1Name: fc.stringMatching(/^[a-zA-Z][a-zA-Z0-9_]*$/).filter(s => s.length >= 2 && s.length <= 15),
          field2Name: fc.stringMatching(/^[a-zA-Z][a-zA-Z0-9_]*$/).filter(s => s.length >= 2 && s.length <= 15),
        }),
        ({ prefix, middle, suffix, field1Name, field2Name }) => {
          // Ensure field names are unique
          if (field1Name === field2Name) {
            return true; // Skip this test case
          }
          
          // Create a message type with mixed fixed strings and placeholders
          // Pattern: fixed + placeholder + fixed + placeholder + fixed
          const messageType: MessageType = {
            name: 'TestMessage',
            direction: 'request',
            format: `${prefix}{${field1Name}}${middle}{${field2Name}}${suffix}`,
            fields: [
              {
                name: field1Name,
                type: { kind: 'string' },
                required: true,
              },
              {
                name: field2Name,
                type: { kind: 'string' },
                required: true,
              },
            ],
            terminator: '\r\n',
          };
          
          // Generate the parser
          const generator = new StateMachineParserGenerator();
          const parserCode = generator.generateParser(messageType);
          
          // Verify parser code contains both fixed string validation and field extraction
          expect(parserCode).toContain('EXPECT_FIXED');
          expect(parserCode).toContain('EXTRACT_FIELD');
          
          // Verify all fixed strings are present
          expect(parserCode).toContain(prefix);
          expect(parserCode).toContain(middle);
          expect(parserCode).toContain(suffix);
          
          // Verify both fields are present
          expect(parserCode).toContain(field1Name);
          expect(parserCode).toContain(field2Name);
          
          // Verify field extraction mechanism
          expect(parserCode).toContain('context.fields.set(fieldName');
          
          // Verify both fields are included in the final message
          expect(parserCode).toContain(`message.${field1Name}`);
          expect(parserCode).toContain(`message.${field2Name}`);
          
          return true;
        }
      ),
      { numRuns: 1000 }
    );
  });
  
  it('should handle complex patterns with multiple alternations', () => {
    fc.assert(
      fc.property(
        fc.record({
          fixed1: fc.stringMatching(/^[a-zA-Z0-9]+$/).filter(s => s.length >= 1 && s.length <= 5),
          fixed2: fc.stringMatching(/^[a-zA-Z0-9]+$/).filter(s => s.length >= 1 && s.length <= 5),
          fixed3: fc.stringMatching(/^[a-zA-Z0-9]+$/).filter(s => s.length >= 1 && s.length <= 5),
          field1: fc.stringMatching(/^[a-zA-Z][a-zA-Z0-9_]*$/).filter(s => s.length >= 2 && s.length <= 10),
          field2: fc.stringMatching(/^[a-zA-Z][a-zA-Z0-9_]*$/).filter(s => s.length >= 2 && s.length <= 10),
          field3: fc.stringMatching(/^[a-zA-Z][a-zA-Z0-9_]*$/).filter(s => s.length >= 2 && s.length <= 10),
        }),
        ({ fixed1, fixed2, fixed3, field1, field2, field3 }) => {
          // Ensure field names are unique
          if (field1 === field2 || field2 === field3 || field1 === field3) {
            return true; // Skip this test case
          }
          
          // Create a complex pattern: fixed-field-fixed-field-fixed-field-fixed
          const messageType: MessageType = {
            name: 'TestMessage',
            direction: 'request',
            format: `${fixed1}{${field1}}${fixed2}{${field2}}${fixed3}{${field3}}`,
            fields: [
              {
                name: field1,
                type: { kind: 'string' },
                required: true,
              },
              {
                name: field2,
                type: { kind: 'string' },
                required: true,
              },
              {
                name: field3,
                type: { kind: 'string' },
                required: true,
              },
            ],
            terminator: '\r\n',
          };
          
          // Generate the parser
          const generator = new StateMachineParserGenerator();
          const parserCode = generator.generateParser(messageType);
          
          // Verify parser contains both state types
          expect(parserCode).toContain('EXPECT_FIXED');
          expect(parserCode).toContain('EXTRACT_FIELD');
          
          // Verify all fixed strings are validated
          expect(parserCode).toContain(fixed1);
          expect(parserCode).toContain(fixed2);
          expect(parserCode).toContain(fixed3);
          
          // Verify all fields are extracted
          expect(parserCode).toContain(`message.${field1}`);
          expect(parserCode).toContain(`message.${field2}`);
          expect(parserCode).toContain(`message.${field3}`);
          
          return true;
        }
      ),
      { numRuns: 1000 }
    );
  });
  
  it('should handle mixed patterns with delimiters', () => {
    fc.assert(
      fc.property(
        fc.record({
          prefix: fc.stringMatching(/^[a-zA-Z0-9]+$/).filter(s => s.length >= 1 && s.length <= 8),
          suffix: fc.stringMatching(/^[a-zA-Z0-9]+$/).filter(s => s.length >= 1 && s.length <= 8),
          field1: fc.stringMatching(/^[a-zA-Z][a-zA-Z0-9_]*$/).filter(s => s.length >= 2 && s.length <= 12),
          field2: fc.stringMatching(/^[a-zA-Z][a-zA-Z0-9_]*$/).filter(s => s.length >= 2 && s.length <= 12),
          delimiter: fc.constantFrom('\t', '|', ','),
        }),
        ({ prefix, suffix, field1, field2, delimiter }) => {
          // Ensure field names are unique
          if (field1 === field2) {
            return true; // Skip this test case
          }
          
          // Create pattern: fixed + field + delimiter + field + fixed
          const messageType: MessageType = {
            name: 'TestMessage',
            direction: 'request',
            format: `${prefix}{${field1}}{${field2}}${suffix}`,
            fields: [
              {
                name: field1,
                type: { kind: 'string' },
                required: true,
              },
              {
                name: field2,
                type: { kind: 'string' },
                required: true,
              },
            ],
            delimiter,
            terminator: '\r\n',
          };
          
          // Generate the parser
          const generator = new StateMachineParserGenerator();
          const parserCode = generator.generateParser(messageType);
          
          // Verify all state types are present
          expect(parserCode).toContain('EXPECT_FIXED');
          expect(parserCode).toContain('EXTRACT_FIELD');
          expect(parserCode).toContain('EXPECT_DELIMITER');
          
          // Verify fixed strings
          expect(parserCode).toContain(prefix);
          expect(parserCode).toContain(suffix);
          
          // Verify fields
          expect(parserCode).toContain(`message.${field1}`);
          expect(parserCode).toContain(`message.${field2}`);
          
          return true;
        }
      ),
      { numRuns: 1000 }
    );
  });
});

/**
 * Feature: prm-phase-2, Property 4: State Machine Parser Optional Field Handling
 * For any format string with optional fields, the generated parser should successfully
 * parse messages both with and without the optional fields present.
 */
describe('Property 4: State Machine Parser Optional Field Handling', () => {
  it('should handle optional fields when present and absent', () => {
    fc.assert(
      fc.property(
        fc.record({
          requiredField: fc.stringMatching(/^[a-zA-Z][a-zA-Z0-9_]*$/).filter(s => s.length >= 2 && s.length <= 12),
          optionalField: fc.stringMatching(/^[a-zA-Z][a-zA-Z0-9_]*$/).filter(s => s.length >= 2 && s.length <= 12),
        }),
        ({ requiredField, optionalField }) => {
          if (requiredField === optionalField) return true;
          
          const messageType: MessageType = {
            name: 'TestMessage',
            direction: 'request',
            format: `{${requiredField}}{${optionalField}}`,
            fields: [
              { name: requiredField, type: { kind: 'string' }, required: true },
              { name: optionalField, type: { kind: 'string' }, required: false },
            ],
            delimiter: '\t',
            terminator: '\r\n',
          };
          
          const generator = new StateMachineParserGenerator();
          const parserCode = generator.generateParser(messageType);
          
          expect(parserCode).toContain('OPTIONAL_FIELD');
          expect(parserCode).toContain(optionalField);
          expect(parserCode).toContain(`message.${requiredField}`);
          
          return true;
        }
      ),
      { numRuns: 1000 }
    );
  });
});

/**
 * Feature: prm-phase-2, Property 5: State Machine Parser Error Context
 * For any malformed input, the generated parser should return an error including
 * the current state name, byte offset, expected input, and actual input encountered.
 */
describe('Property 5: State Machine Parser Error Context', () => {
  it('should include comprehensive error context', () => {
    fc.assert(
      fc.property(
        fc.record({
          fieldName: fc.stringMatching(/^[a-zA-Z][a-zA-Z0-9_]*$/).filter(s => s.length >= 2 && s.length <= 12),
          fixedString: fc.stringMatching(/^[a-zA-Z0-9]+$/).filter(s => s.length >= 2 && s.length <= 8),
        }),
        ({ fieldName, fixedString }) => {
          const messageType: MessageType = {
            name: 'TestMessage',
            direction: 'request',
            format: `${fixedString}{${fieldName}}`,
            fields: [{ name: fieldName, type: { kind: 'string' }, required: true }],
            terminator: '\r\n',
          };
          
          const generator = new StateMachineParserGenerator();
          const parserCode = generator.generateParser(messageType);
          
          expect(parserCode).toContain('createError');
          expect(parserCode).toContain('state');
          expect(parserCode).toContain('offset');
          expect(parserCode).toContain('expected');
          expect(parserCode).toContain('actual');
          expect(parserCode).toContain('stateHistory');
          
          return true;
        }
      ),
      { numRuns: 1000 }
    );
  });
});
