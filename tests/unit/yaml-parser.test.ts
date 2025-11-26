/**
 * Unit tests for YAML Parser
 */

import { describe, it, expect } from 'vitest';
import { YAMLParser } from '../../src/core/yaml-parser.js';
import { YAMLParseError } from '../../src/types/errors.js';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('YAMLParser', () => {
  const parser = new YAMLParser();

  describe('parse()', () => {
    it('should parse a valid Gopher protocol specification', () => {
      const yamlContent = readFileSync(
        join(process.cwd(), 'protocols', 'gopher.yaml'),
        'utf-8'
      );

      const spec = parser.parse(yamlContent);

      // Verify protocol metadata
      expect(spec.protocol.name).toBe('Gopher');
      expect(spec.protocol.rfc).toBe('1436');
      expect(spec.protocol.port).toBe(70);
      expect(spec.protocol.description).toContain('Gopher protocol');

      // Verify connection spec
      expect(spec.connection.type).toBe('TCP');
      expect(spec.connection.timeout).toBe(30000);
      expect(spec.connection.keepAlive).toBe(false);

      // Verify message types
      expect(spec.messageTypes).toHaveLength(2);
      expect(spec.messageTypes[0].name).toBe('Request');
      expect(spec.messageTypes[0].direction).toBe('request');
      expect(spec.messageTypes[0].format).toBe('{selector}\r\n');
      expect(spec.messageTypes[0].fields).toHaveLength(1);
      expect(spec.messageTypes[0].fields[0].name).toBe('selector');

      expect(spec.messageTypes[1].name).toBe('DirectoryItem');
      expect(spec.messageTypes[1].fields).toHaveLength(5);

      // Verify type definitions
      expect(spec.types).toBeDefined();
      expect(spec.types).toHaveLength(1);
      expect(spec.types![0].name).toBe('GopherItemType');
      expect(spec.types![0].kind).toBe('enum');

      // Verify error handling
      expect(spec.errorHandling).toBeDefined();
      expect(spec.errorHandling!.onParseError).toBe('return');
      expect(spec.errorHandling!.onNetworkError).toBe('retry');
    });

    it('should parse minimal protocol specification', () => {
      const yaml = `
protocol:
  name: TestProtocol
  port: 8080
  description: A test protocol

connection:
  type: TCP

messageTypes:
  - name: TestMessage
    direction: request
    format: "TEST"
    fields: []
`;

      const spec = parser.parse(yaml);
      expect(spec.protocol.name).toBe('TestProtocol');
      expect(spec.messageTypes).toHaveLength(1);
    });

    it('should throw error for missing protocol section', () => {
      const yaml = `
connection:
  type: TCP
`;

      expect(() => parser.parse(yaml)).toThrow(YAMLParseError);
      expect(() => parser.parse(yaml)).toThrow('Missing or invalid "protocol" section');
    });

    it('should throw error for invalid port number', () => {
      const yaml = `
protocol:
  name: Test
  port: 99999
  description: Test

connection:
  type: TCP

messageTypes:
  - name: Test
    format: "test"
    fields: []
`;

      expect(() => parser.parse(yaml)).toThrow(YAMLParseError);
      expect(() => parser.parse(yaml)).toThrow('port must be a number between 1 and 65535');
    });

    it('should throw error for invalid connection type', () => {
      const yaml = `
protocol:
  name: Test
  port: 8080
  description: Test

connection:
  type: HTTP

messageTypes:
  - name: Test
    format: "test"
    fields: []
`;

      expect(() => parser.parse(yaml)).toThrow(YAMLParseError);
      expect(() => parser.parse(yaml)).toThrow('Connection type must be either "TCP" or "UDP"');
    });

    it('should parse message types with fields', () => {
      const yaml = `
protocol:
  name: Test
  port: 8080
  description: Test

connection:
  type: TCP

messageTypes:
  - name: TestMessage
    direction: request
    format: "{field1} {field2}"
    fields:
      - name: field1
        type: string
        required: true
      - name: field2
        type: number
        required: false
`;

      const spec = parser.parse(yaml);
      expect(spec.messageTypes[0].fields).toHaveLength(2);
      expect(spec.messageTypes[0].fields[0].name).toBe('field1');
      expect(spec.messageTypes[0].fields[0].type).toEqual({ kind: 'string' });
      expect(spec.messageTypes[0].fields[0].required).toBe(true);
      expect(spec.messageTypes[0].fields[1].name).toBe('field2');
      expect(spec.messageTypes[0].fields[1].type).toEqual({ kind: 'number' });
      expect(spec.messageTypes[0].fields[1].required).toBe(false);
    });

    it('should parse enum field types', () => {
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
          values: ["OK", "ERROR", "PENDING"]
        required: true
`;

      const spec = parser.parse(yaml);
      const field = spec.messageTypes[0].fields[0];
      expect(field.type).toEqual({
        kind: 'enum',
        values: ['OK', 'ERROR', 'PENDING'],
      });
    });
  });

  describe('validate()', () => {
    it('should validate a correct protocol spec', () => {
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

      const spec = parser.parse(yaml);
      const result = parser.validate(spec);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect invalid port in validation', () => {
      const spec = parser.parse(`
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
`);

      // Manually set invalid port
      spec.protocol.port = 99999;

      const result = parser.validate(spec);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].type).toBe('invalid_constraint');
    });

    it('should detect undefined field references in format strings', () => {
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
      const result = parser.validate(spec);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].type).toBe('invalid_placeholder');
    });
  });
});
