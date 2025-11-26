/**
 * Property-Based Tests for Protocol Validator
 * Tests universal properties for validation logic
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { ProtocolValidator } from '../../src/core/validator.js';
import { YAMLParser } from '../../src/core/yaml-parser.js';
import type { ProtocolSpec } from '../../src/types/protocol-spec.js';

describe('ProtocolValidator - Property-Based Tests', () => {
  const validator = new ProtocolValidator();
  const parser = new YAMLParser();

  /**
   * Feature: protocol-resurrection-machine, Property 5: Validation Error Completeness
   * For any spec with multiple errors, all errors should be reported in a single pass
   */
  describe('Property 5: Validation Error Completeness', () => {
    it('should collect all schema errors in a single validation pass', () => {
      fc.assert(
        fc.property(
          fc.record({
            hasValidName: fc.boolean(),
            hasValidPort: fc.boolean(),
            hasValidDescription: fc.boolean(),
            hasValidConnectionType: fc.boolean(),
          }),
          (flags) => {
            const data = {
              protocol: {
                ...(flags.hasValidName ? { name: 'Test' } : {}),
                port: flags.hasValidPort ? 8080 : 99999,
                ...(flags.hasValidDescription ? { description: 'Test' } : {}),
              },
              connection: {
                type: flags.hasValidConnectionType ? 'TCP' : 'INVALID',
              },
              messageTypes: [
                {
                  name: 'Test',
                  format: 'test',
                  fields: [],
                },
              ],
            };

            const result = validator.validateSchema(data);

            // Count expected errors
            let expectedErrors = 0;
            if (!flags.hasValidName) expectedErrors++;
            if (!flags.hasValidPort) expectedErrors++;
            if (!flags.hasValidDescription) expectedErrors++;
            if (!flags.hasValidConnectionType) expectedErrors++;

            if (expectedErrors > 0) {
              expect(result.valid).toBe(false);
              // Should have at least the expected number of errors
              expect(result.errors.length).toBeGreaterThanOrEqual(expectedErrors);
            } else {
              expect(result.valid).toBe(true);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should collect all semantic errors in a single validation pass', () => {
      fc.assert(
        fc.property(
          fc.record({
            hasUndefinedPlaceholder: fc.boolean(),
            hasDuplicateMessageType: fc.boolean(),
            hasInvalidNumberRange: fc.boolean(),
          }),
          (flags) => {
            // Build a spec with various semantic errors
            const messageTypes: any[] = [
              {
                name: 'Message1',
                direction: 'request',
                format: flags.hasUndefinedPlaceholder ? '{field1} {undefinedField}' : '{field1}',
                fields: [
                  {
                    name: 'field1',
                    type: flags.hasInvalidNumberRange 
                      ? { kind: 'number', min: 100, max: 50 }
                      : { kind: 'string' },
                    required: true,
                  },
                ],
              },
            ];

            if (flags.hasDuplicateMessageType) {
              messageTypes.push({
                name: 'Message1', // Duplicate name
                direction: 'response',
                format: '{field2}',
                fields: [
                  {
                    name: 'field2',
                    type: { kind: 'string' },
                    required: true,
                  },
                ],
              });
            }

            const spec: ProtocolSpec = {
              protocol: {
                name: 'Test',
                port: 8080,
                description: 'Test',
              },
              connection: {
                type: 'TCP',
              },
              messageTypes,
            };

            const result = validator.validateSemantics(spec);

            // Count expected errors
            let expectedErrors = 0;
            if (flags.hasUndefinedPlaceholder) expectedErrors++;
            if (flags.hasDuplicateMessageType) expectedErrors++;
            if (flags.hasInvalidNumberRange) expectedErrors++;

            if (expectedErrors > 0) {
              expect(result.valid).toBe(false);
              expect(result.errors.length).toBeGreaterThanOrEqual(expectedErrors);
            } else {
              expect(result.valid).toBe(true);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Feature: protocol-resurrection-machine, Property 6: Schema Validation Correctness
   * For any valid spec, validation should pass; for any invalid spec, it should fail
   */
  describe('Property 6: Schema Validation Correctness', () => {
    it('should accept all valid protocol specifications', () => {
      fc.assert(
        fc.property(
          fc.record({
            name: fc.string({ minLength: 1, maxLength: 50 }),
            port: fc.integer({ min: 1, max: 65535 }),
            description: fc.string({ minLength: 1, maxLength: 200 }),
            connectionType: fc.constantFrom('TCP', 'UDP'),
            timeout: fc.option(fc.integer({ min: 1000, max: 120000 })),
            keepAlive: fc.option(fc.boolean()),
          }),
          (data) => {
            const spec = {
              protocol: {
                name: data.name,
                port: data.port,
                description: data.description,
              },
              connection: {
                type: data.connectionType,
                ...(data.timeout !== null ? { timeout: data.timeout } : {}),
                ...(data.keepAlive !== null ? { keepAlive: data.keepAlive } : {}),
              },
              messageTypes: [
                {
                  name: 'TestMessage',
                  format: 'test',
                  fields: [],
                },
              ],
            };

            const result = validator.validateSchema(spec);
            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject specs with invalid port numbers', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.integer({ min: -1000, max: 0 }),
            fc.integer({ min: 65536, max: 100000 })
          ),
          (invalidPort) => {
            const spec = {
              protocol: {
                name: 'Test',
                port: invalidPort,
                description: 'Test',
              },
              connection: {
                type: 'TCP',
              },
              messageTypes: [
                {
                  name: 'Test',
                  format: 'test',
                  fields: [],
                },
              ],
            };

            const result = validator.validateSchema(spec);
            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.message.includes('port'))).toBe(true);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should reject specs with invalid connection types', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 20 }).filter(s => s !== 'TCP' && s !== 'UDP'),
          (invalidType) => {
            const spec = {
              protocol: {
                name: 'Test',
                port: 8080,
                description: 'Test',
              },
              connection: {
                type: invalidType,
              },
              messageTypes: [
                {
                  name: 'Test',
                  format: 'test',
                  fields: [],
                },
              ],
            };

            const result = validator.validateSchema(spec);
            expect(result.valid).toBe(false);
            expect(result.errors.some(e => 
              e.message.includes('TCP') || e.message.includes('UDP') || e.message.includes('type')
            )).toBe(true);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should validate field type constraints correctly', () => {
      fc.assert(
        fc.property(
          fc.record({
            min: fc.integer({ min: 0, max: 100 }),
            max: fc.integer({ min: 0, max: 100 }),
          }),
          (range) => {
            const spec: ProtocolSpec = {
              protocol: {
                name: 'Test',
                port: 8080,
                description: 'Test',
              },
              connection: {
                type: 'TCP',
              },
              messageTypes: [
                {
                  name: 'Test',
                  direction: 'request',
                  format: '{value}',
                  fields: [
                    {
                      name: 'value',
                      type: {
                        kind: 'number',
                        min: range.min,
                        max: range.max,
                      },
                      required: true,
                    },
                  ],
                },
              ],
            };

            const result = validator.validateSemantics(spec);

            if (range.min > range.max) {
              // Invalid range
              expect(result.valid).toBe(false);
              expect(result.errors.some(e => e.message.includes('invalid range'))).toBe(true);
            } else {
              // Valid range
              expect(result.valid).toBe(true);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should validate validation rule constraints correctly', () => {
      fc.assert(
        fc.property(
          fc.record({
            minLength: fc.integer({ min: 0, max: 100 }),
            maxLength: fc.integer({ min: 0, max: 100 }),
          }),
          (lengths) => {
            const spec: ProtocolSpec = {
              protocol: {
                name: 'Test',
                port: 8080,
                description: 'Test',
              },
              connection: {
                type: 'TCP',
              },
              messageTypes: [
                {
                  name: 'Test',
                  direction: 'request',
                  format: '{field}',
                  fields: [
                    {
                      name: 'field',
                      type: { kind: 'string' },
                      required: true,
                      validation: {
                        minLength: lengths.minLength,
                        maxLength: lengths.maxLength,
                      },
                    },
                  ],
                },
              ],
            };

            const result = validator.validateSemantics(spec);

            if (lengths.minLength > lengths.maxLength) {
              // Invalid length range
              expect(result.valid).toBe(false);
              expect(result.errors.some(e => e.message.includes('invalid length range'))).toBe(true);
            } else {
              // Valid length range
              expect(result.valid).toBe(true);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Feature: protocol-resurrection-machine, Property 7: Placeholder Validation
   * All placeholders in format strings must reference defined fields
   */
  describe('Property 7: Placeholder Validation', () => {
    const validFieldNameArb = fc.string({ minLength: 1, maxLength: 20 })
      .filter(s => /^[a-zA-Z_][a-zA-Z0-9_-]*$/.test(s));

    it('should accept format strings where all placeholders reference defined fields', () => {
      fc.assert(
        fc.property(
          fc.array(validFieldNameArb, { minLength: 1, maxLength: 5 }).map(names => [...new Set(names)]),
          (fieldNames) => {
            // Skip if empty after deduplication
            fc.pre(fieldNames.length > 0);

            const format = fieldNames.map(name => `{${name}}`).join(' ');
            const fields = fieldNames.map(name => ({
              name,
              type: { kind: 'string' as const },
              required: true,
            }));

            const spec: ProtocolSpec = {
              protocol: {
                name: 'Test',
                port: 8080,
                description: 'Test',
              },
              connection: {
                type: 'TCP',
              },
              messageTypes: [
                {
                  name: 'Test',
                  direction: 'request',
                  format,
                  fields,
                },
              ],
            };

            const result = validator.validateSemantics(spec);
            expect(result.valid).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject format strings with undefined field references', () => {
      fc.assert(
        fc.property(
          fc.array(validFieldNameArb, { minLength: 1, maxLength: 3 }),
          validFieldNameArb,
          (definedFields, undefinedField) => {
            // Ensure undefinedField is not in definedFields
            fc.pre(!definedFields.includes(undefinedField));

            const format = [...definedFields, undefinedField].map(name => `{${name}}`).join(' ');
            const fields = definedFields.map(name => ({
              name,
              type: { kind: 'string' as const },
              required: true,
            }));

            const spec: ProtocolSpec = {
              protocol: {
                name: 'Test',
                port: 8080,
                description: 'Test',
              },
              connection: {
                type: 'TCP',
              },
              messageTypes: [
                {
                  name: 'Test',
                  direction: 'request',
                  format,
                  fields,
                },
              ],
            };

            const result = validator.validateSemantics(spec);
            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.type === 'invalid_placeholder')).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Feature: protocol-resurrection-machine, Property 8: Duplicate Detection
   * Validator should detect all duplicate names (message types, fields, enum values, types)
   */
  describe('Property 8: Duplicate Detection', () => {
    const validNameArb = fc.string({ minLength: 1, maxLength: 20 })
      .filter(s => /^[a-zA-Z][a-zA-Z0-9]*$/.test(s));

    it('should detect duplicate message type names', () => {
      fc.assert(
        fc.property(
          validNameArb,
          (duplicateName) => {
            const spec: ProtocolSpec = {
              protocol: {
                name: 'Test',
                port: 8080,
                description: 'Test',
              },
              connection: {
                type: 'TCP',
              },
              messageTypes: [
                {
                  name: duplicateName,
                  direction: 'request',
                  format: 'test1',
                  fields: [],
                },
                {
                  name: duplicateName, // Duplicate
                  direction: 'response',
                  format: 'test2',
                  fields: [],
                },
              ],
            };

            const result = validator.validateSemantics(spec);
            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.message.includes('Duplicate message type'))).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should detect duplicate field names within a message type', () => {
      fc.assert(
        fc.property(
          validNameArb,
          (duplicateFieldName) => {
            const spec: ProtocolSpec = {
              protocol: {
                name: 'Test',
                port: 8080,
                description: 'Test',
              },
              connection: {
                type: 'TCP',
              },
              messageTypes: [
                {
                  name: 'Test',
                  direction: 'request',
                  format: `{${duplicateFieldName}}`,
                  fields: [
                    {
                      name: duplicateFieldName,
                      type: { kind: 'string' },
                      required: true,
                    },
                    {
                      name: duplicateFieldName, // Duplicate
                      type: { kind: 'number' },
                      required: true,
                    },
                  ],
                },
              ],
            };

            const result = validator.validateSemantics(spec);
            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.message.includes('Duplicate field name'))).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should detect duplicate enum values', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 10 }),
          (duplicateValue) => {
            const spec: ProtocolSpec = {
              protocol: {
                name: 'Test',
                port: 8080,
                description: 'Test',
              },
              connection: {
                type: 'TCP',
              },
              messageTypes: [
                {
                  name: 'Test',
                  direction: 'request',
                  format: '{status}',
                  fields: [
                    {
                      name: 'status',
                      type: {
                        kind: 'enum',
                        values: [duplicateValue, 'OTHER', duplicateValue], // Duplicate
                      },
                      required: true,
                    },
                  ],
                },
              ],
            };

            const result = validator.validateSemantics(spec);
            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.message.includes('Duplicate enum value'))).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should detect duplicate type definition names', () => {
      fc.assert(
        fc.property(
          validNameArb,
          (duplicateTypeName) => {
            const spec: ProtocolSpec = {
              protocol: {
                name: 'Test',
                port: 8080,
                description: 'Test',
              },
              connection: {
                type: 'TCP',
              },
              messageTypes: [
                {
                  name: 'Test',
                  direction: 'request',
                  format: 'test',
                  fields: [],
                },
              ],
              types: [
                {
                  name: duplicateTypeName,
                  kind: 'enum',
                  values: [
                    { name: 'A', value: 'a' },
                  ],
                },
                {
                  name: duplicateTypeName, // Duplicate
                  kind: 'enum',
                  values: [
                    { name: 'B', value: 'b' },
                  ],
                },
              ],
            };

            const result = validator.validateSemantics(spec);
            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.message.includes('Duplicate type name'))).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Feature: protocol-resurrection-machine, Property 9: Error Handling Validation
   * Validator should enforce retry configuration when onNetworkError is 'retry'
   */
  describe('Property 9: Error Handling Validation', () => {
    it('should require retryAttempts when onNetworkError is retry', () => {
      fc.assert(
        fc.property(
          fc.option(fc.integer({ min: 0, max: 10 })),
          fc.option(fc.integer({ min: 0, max: 10000 })),
          (retryAttempts, retryDelay) => {
            const spec: ProtocolSpec = {
              protocol: {
                name: 'Test',
                port: 8080,
                description: 'Test',
              },
              connection: {
                type: 'TCP',
              },
              messageTypes: [
                {
                  name: 'Test',
                  direction: 'request',
                  format: 'test',
                  fields: [],
                },
              ],
              errorHandling: {
                onParseError: 'return',
                onNetworkError: 'retry',
                ...(retryAttempts !== null ? { retryAttempts } : {}),
                ...(retryDelay !== null ? { retryDelay } : {}),
              },
            };

            const result = validator.validateSemantics(spec);

            // Should be invalid if retryAttempts is missing or < 1, or retryDelay is missing or < 0
            const hasValidRetryAttempts = retryAttempts !== null && retryAttempts >= 1;
            const hasValidRetryDelay = retryDelay !== null && retryDelay >= 0;

            if (!hasValidRetryAttempts || !hasValidRetryDelay) {
              expect(result.valid).toBe(false);
              if (!hasValidRetryAttempts) {
                expect(result.errors.some(e => e.message.includes('retryAttempts'))).toBe(true);
              }
              if (!hasValidRetryDelay) {
                expect(result.errors.some(e => e.message.includes('retryDelay'))).toBe(true);
              }
            } else {
              expect(result.valid).toBe(true);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
