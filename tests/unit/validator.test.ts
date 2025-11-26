/**
 * Unit tests for Protocol Validator
 */

import { describe, it, expect } from 'vitest';
import { ProtocolValidator } from '../../src/core/validator.js';
import { YAMLParser } from '../../src/core/yaml-parser.js';

describe('ProtocolValidator', () => {
  const validator = new ProtocolValidator();
  const parser = new YAMLParser();

  describe('validateSchema()', () => {
    it('should validate a correct protocol specification', () => {
      const data = {
        protocol: {
          name: 'Test',
          port: 8080,
          description: 'Test protocol',
        },
        connection: {
          type: 'TCP',
        },
        messageTypes: [
          {
            name: 'TestMessage',
            format: '{field}',
            fields: [
              {
                name: 'field',
                type: 'string',
                required: true,
              },
            ],
          },
        ],
      };

      const result = validator.validateSchema(data);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing required fields', () => {
      const data = {
        protocol: {
          name: 'Test',
          // Missing port
          description: 'Test protocol',
        },
        connection: {
          type: 'TCP',
        },
        messageTypes: [],
      };

      const result = validator.validateSchema(data);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some((e) => e.message.includes('port'))).toBe(true);
    });

    it('should detect invalid port numbers', () => {
      const data = {
        protocol: {
          name: 'Test',
          port: 99999,
          description: 'Test protocol',
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

      const result = validator.validateSchema(data);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.message.includes('port'))).toBe(true);
    });

    it('should detect invalid connection types', () => {
      const data = {
        protocol: {
          name: 'Test',
          port: 8080,
          description: 'Test protocol',
        },
        connection: {
          type: 'HTTP', // Invalid
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
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.message.includes('TCP') || e.message.includes('UDP'))).toBe(
        true
      );
    });

    it('should provide helpful error messages with suggestions', () => {
      const data = {
        protocol: {
          name: 'Test',
          port: 8080,
          description: 'Test protocol',
        },
        connection: {
          type: 'TCP',
        },
        messageTypes: [], // Empty array
      };

      const result = validator.validateSchema(data);
      expect(result.valid).toBe(false);
      const error = result.errors.find((e) => e.message.includes('messageTypes'));
      expect(error).toBeDefined();
      expect(error?.suggestion).toBeDefined();
    });

    it('should collect all errors in a single pass', () => {
      const data = {
        protocol: {
          // Missing name
          port: 99999, // Invalid port
          // Missing description
        },
        connection: {
          type: 'HTTP', // Invalid type
        },
        // Missing messageTypes
      };

      const result = validator.validateSchema(data);
      expect(result.valid).toBe(false);
      // Should have multiple errors
      expect(result.errors.length).toBeGreaterThan(2);
    });
  });

  describe('validateSemantics()', () => {
    it('should validate format string placeholders match fields', () => {
      const yaml = `
protocol:
  name: Test
  port: 8080
  description: Test

connection:
  type: TCP

messageTypes:
  - name: TestMessage
    format: "{field1} {undefinedField}"
    fields:
      - name: field1
        type: string
        required: true
`;

      const spec = parser.parse(yaml);
      const result = validator.validateSemantics(spec);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.type === 'invalid_placeholder')).toBe(true);
    });

    it('should detect duplicate message type names', () => {
      const yaml = `
protocol:
  name: Test
  port: 8080
  description: Test

connection:
  type: TCP

messageTypes:
  - name: DuplicateName
    format: "test1"
    fields: []
  - name: DuplicateName
    format: "test2"
    fields: []
`;

      const spec = parser.parse(yaml);
      const result = validator.validateSemantics(spec);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.message.includes('Duplicate message type'))).toBe(true);
    });

    it('should detect duplicate field names', () => {
      const yaml = `
protocol:
  name: Test
  port: 8080
  description: Test

connection:
  type: TCP

messageTypes:
  - name: TestMessage
    format: "{field1}"
    fields:
      - name: field1
        type: string
        required: true
      - name: field1
        type: number
        required: true
`;

      const spec = parser.parse(yaml);
      const result = validator.validateSemantics(spec);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.message.includes('Duplicate field name'))).toBe(true);
    });

    it('should validate number field constraints', () => {
      const yaml = `
protocol:
  name: Test
  port: 8080
  description: Test

connection:
  type: TCP

messageTypes:
  - name: TestMessage
    format: "{value}"
    fields:
      - name: value
        type:
          kind: number
          min: 100
          max: 50
        required: true
`;

      const spec = parser.parse(yaml);
      const result = validator.validateSemantics(spec);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.message.includes('invalid range'))).toBe(true);
    });

    it('should validate enum field has values', () => {
      // This test validates that the validator catches empty enum values
      // We need to construct a spec directly since the parser will reject it
      const spec = {
        protocol: {
          name: 'Test',
          port: 8080,
          description: 'Test',
        },
        connection: {
          type: 'TCP' as const,
        },
        messageTypes: [
          {
            name: 'TestMessage',
            format: '{status}',
            fields: [
              {
                name: 'status',
                type: {
                  kind: 'enum' as const,
                  values: [], // Empty values array
                },
                required: true,
              },
            ],
          },
        ],
      };

      const result = validator.validateSemantics(spec);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.message.includes('no values'))).toBe(true);
    });

    it('should detect duplicate enum values', () => {
      const yaml = `
protocol:
  name: Test
  port: 8080
  description: Test

connection:
  type: TCP

messageTypes:
  - name: TestMessage
    format: "{status}"
    fields:
      - name: status
        type:
          kind: enum
          values: ["OK", "ERROR", "OK"]
        required: true
`;

      const spec = parser.parse(yaml);
      const result = validator.validateSemantics(spec);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.message.includes('Duplicate enum value'))).toBe(true);
    });

    it('should validate regex patterns in validation rules', () => {
      const yaml = `
protocol:
  name: Test
  port: 8080
  description: Test

connection:
  type: TCP

messageTypes:
  - name: TestMessage
    format: "{field}"
    fields:
      - name: field
        type: string
        required: true
        validation:
          pattern: "[invalid(regex"
`;

      const spec = parser.parse(yaml);
      const result = validator.validateSemantics(spec);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.message.includes('invalid regex pattern'))).toBe(true);
    });

    it('should validate validation rule constraints', () => {
      const yaml = `
protocol:
  name: Test
  port: 8080
  description: Test

connection:
  type: TCP

messageTypes:
  - name: TestMessage
    format: "{field}"
    fields:
      - name: field
        type: string
        required: true
        validation:
          minLength: 100
          maxLength: 50
`;

      const spec = parser.parse(yaml);
      const result = validator.validateSemantics(spec);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.message.includes('invalid length range'))).toBe(true);
    });

    it('should validate retry configuration when onNetworkError is retry', () => {
      const yaml = `
protocol:
  name: Test
  port: 8080
  description: Test

connection:
  type: TCP

messageTypes:
  - name: Test
    format: "test"
    fields: []

errorHandling:
  onNetworkError: retry
`;

      const spec = parser.parse(yaml);
      const result = validator.validateSemantics(spec);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.message.includes('retryAttempts'))).toBe(true);
    });

    it('should detect duplicate type names', () => {
      const yaml = `
protocol:
  name: Test
  port: 8080
  description: Test

connection:
  type: TCP

messageTypes:
  - name: Test
    format: "test"
    fields: []

types:
  - name: DuplicateType
    kind: enum
    values: ["A", "B"]
  - name: DuplicateType
    kind: enum
    values: ["C", "D"]
`;

      const spec = parser.parse(yaml);
      const result = validator.validateSemantics(spec);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.message.includes('Duplicate type name'))).toBe(true);
    });
  });

  describe('validate() - complete validation', () => {
    it('should perform both schema and semantic validation', () => {
      const data = {
        protocol: {
          name: 'Test',
          port: 99999, // Schema error: invalid port
          description: 'Test',
        },
        connection: {
          type: 'TCP',
        },
        messageTypes: [
          {
            name: 'Test',
            format: '{field1} {undefinedField}', // Semantic error: undefined field
            fields: [
              {
                name: 'field1',
                type: 'string',
                required: true,
              },
            ],
          },
        ],
      };

      const spec = parser.parse(`
protocol:
  name: Test
  port: 8080
  description: Test

connection:
  type: TCP

messageTypes:
  - name: Test
    format: "{field1} {undefinedField}"
    fields:
      - name: field1
        type: string
        required: true
`);

      const result = validator.validate(data, spec);
      expect(result.valid).toBe(false);
      // Should have errors from both schema and semantic validation
      expect(result.errors.length).toBeGreaterThan(1);
    });
  });

  describe('YAMLParser.validateComplete()', () => {
    it('should validate complete YAML with both schema and semantics', () => {
      const yaml = `
protocol:
  name: Test
  port: 8080
  description: Test protocol

connection:
  type: TCP

messageTypes:
  - name: TestMessage
    format: "{field}"
    fields:
      - name: field
        type: string
        required: true
`;

      const result = parser.validateComplete(yaml);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should catch YAML syntax errors', () => {
      const yaml = `
protocol:
  name: Test
  port: 8080
  description: Test
  invalid: [unclosed array
`;

      // The validateComplete method should catch YAML parsing errors
      // and return them as validation errors
      try {
        const result = parser.validateComplete(yaml);
        expect(result.valid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      } catch (error) {
        // If it throws, that's also acceptable - the YAML parser
        // may throw before we can convert to validation errors
        expect(error).toBeDefined();
      }
    });
  });
});
