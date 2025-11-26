/**
 * Tests for generated serializer code structure
 * Verifies that generated serializer code has correct structure
 */

import { describe, it, expect } from 'vitest';
import { SerializerGenerator } from '../../src/generation/serializer-generator.js';
import type { ProtocolSpec } from '../../src/types/protocol-spec.js';

describe('Generated Serializer Code Structure', () => {
  it('should generate working serializer for Gopher request', () => {
    const spec: ProtocolSpec = {
      protocol: {
        name: 'Gopher',
        rfc: '1436',
        port: 70,
        description: 'Gopher Protocol',
      },
      connection: {
        type: 'TCP',
      },
      messageTypes: [
        {
          name: 'GopherRequest',
          direction: 'request',
          format: '{selector}\r\n',
          terminator: '\r\n',
          fields: [
            {
              name: 'selector',
              type: { kind: 'string' },
              required: true,
            },
          ],
        },
      ],
    };

    const generator = new SerializerGenerator();
    const code = generator.generate(spec);

    // Verify the generated code contains expected elements
    expect(code).toContain('export class GopherRequestSerializer');
    expect(code).toContain('serialize(message: GopherRequest)');
    expect(code).toContain('validate(message: GopherRequest)');
    expect(code).toContain('result +=');
    expect(code).toContain('\\r\\n');
  });

  it('should generate validation for required fields', () => {
    const spec: ProtocolSpec = {
      protocol: {
        name: 'Test',
        port: 8080,
        description: 'Test Protocol',
      },
      connection: {
        type: 'TCP',
      },
      messageTypes: [
        {
          name: 'TestMessage',
          direction: 'request',
          format: '{field1}\t{field2}',
          delimiter: '\t',
          fields: [
            { name: 'field1', type: { kind: 'string' }, required: true },
            { name: 'field2', type: { kind: 'number' }, required: true },
          ],
        },
      ],
    };

    const generator = new SerializerGenerator();
    const code = generator.generate(spec);

    // Verify validation code is generated
    expect(code).toContain('Required field "field1" is missing');
    expect(code).toContain('Required field "field2" is missing');
    expect(code).toContain('message.field1 === undefined');
    expect(code).toContain('message.field2 === undefined');
  });

  it('should generate validation for field types', () => {
    const spec: ProtocolSpec = {
      protocol: {
        name: 'Test',
        port: 8080,
        description: 'Test Protocol',
      },
      connection: {
        type: 'TCP',
      },
      messageTypes: [
        {
          name: 'TestMessage',
          direction: 'request',
          format: '{age}',
          fields: [
            { name: 'age', type: { kind: 'number' }, required: true },
          ],
        },
      ],
    };

    const generator = new SerializerGenerator();
    const code = generator.generate(spec);

    // Verify type validation code is generated
    expect(code).toContain('typeof message.age !== \'number\'');
    expect(code).toContain('must be a valid number');
    expect(code).toContain('isNaN(message.age)');
  });

  it('should generate validation for string length constraints', () => {
    const spec: ProtocolSpec = {
      protocol: {
        name: 'Test',
        port: 8080,
        description: 'Test Protocol',
      },
      connection: {
        type: 'TCP',
      },
      messageTypes: [
        {
          name: 'TestMessage',
          direction: 'request',
          format: '{username}',
          fields: [
            {
              name: 'username',
              type: { kind: 'string', maxLength: 10 },
              required: true,
              validation: { maxLength: 10, minLength: 3 },
            },
          ],
        },
      ],
    };

    const generator = new SerializerGenerator();
    const code = generator.generate(spec);

    // Verify string length validation code is generated
    expect(code).toContain('message.username.length > 10');
    expect(code).toContain('exceeds maximum length');
    expect(code).toContain('message.username.length < 3');
    expect(code).toContain('below minimum length');
  });

  it('should generate validation for number range constraints', () => {
    const spec: ProtocolSpec = {
      protocol: {
        name: 'Test',
        port: 8080,
        description: 'Test Protocol',
      },
      connection: {
        type: 'TCP',
      },
      messageTypes: [
        {
          name: 'TestMessage',
          direction: 'request',
          format: '{age}',
          fields: [
            {
              name: 'age',
              type: { kind: 'number', min: 0, max: 150 },
              required: true,
              validation: { min: 0, max: 150 },
            },
          ],
        },
      ],
    };

    const generator = new SerializerGenerator();
    const code = generator.generate(spec);

    // Verify number range validation code is generated
    expect(code).toContain('message.age < 0');
    expect(code).toContain('below minimum value');
    expect(code).toContain('message.age > 150');
    expect(code).toContain('exceeds maximum value');
  });

  it('should generate validation for enum values', () => {
    const spec: ProtocolSpec = {
      protocol: {
        name: 'Test',
        port: 8080,
        description: 'Test Protocol',
      },
      connection: {
        type: 'TCP',
      },
      messageTypes: [
        {
          name: 'TestMessage',
          direction: 'request',
          format: '{status}',
          fields: [
            {
              name: 'status',
              type: { kind: 'enum', values: ['OK', 'ERROR', 'PENDING'] },
              required: true,
            },
          ],
        },
      ],
    };

    const generator = new SerializerGenerator();
    const code = generator.generate(spec);

    // Verify enum validation code is generated
    expect(code).toContain('const validValues = ["OK","ERROR","PENDING"]');
    expect(code).toContain('invalid enum value');
    expect(code).toContain('validValues.includes');
  });

  it('should generate delimiter-based serialization', () => {
    const spec: ProtocolSpec = {
      protocol: {
        name: 'Test',
        port: 8080,
        description: 'Test Protocol',
      },
      connection: {
        type: 'TCP',
      },
      messageTypes: [
        {
          name: 'TestMessage',
          direction: 'request',
          format: '{col1}\t{col2}\t{col3}',
          delimiter: '\t',
          terminator: '\n',
          fields: [
            { name: 'col1', type: { kind: 'string' }, required: true },
            { name: 'col2', type: { kind: 'number' }, required: true },
            { name: 'col3', type: { kind: 'string' }, required: false },
          ],
        },
      ],
    };

    const generator = new SerializerGenerator();
    const code = generator.generate(spec);

    // Verify delimiter-based serialization code is generated
    expect(code).toContain('const parts: string[] = []');
    expect(code).toContain('parts.push(message.col1');
    expect(code).toContain('parts.push(String(message.col2))');
    expect(code).toContain('parts.push(message.col3');
    expect(code).toContain('parts.join');
    expect(code).toContain('\\t');
    expect(code).toContain('\\n');
  });

  it('should generate format string serialization', () => {
    const spec: ProtocolSpec = {
      protocol: {
        name: 'Test',
        port: 8080,
        description: 'Test Protocol',
      },
      connection: {
        type: 'TCP',
      },
      messageTypes: [
        {
          name: 'TestMessage',
          direction: 'request',
          format: 'GET {path} HTTP/1.0\r\n',
          terminator: '\r\n',
          fields: [
            { name: 'path', type: { kind: 'string' }, required: true },
          ],
        },
      ],
    };

    const generator = new SerializerGenerator();
    const code = generator.generate(spec);

    // Verify format string serialization code is generated
    expect(code).toContain('let result = \'\'');
    expect(code).toContain('result += "GET "');
    expect(code).toContain('result += message.path');
    expect(code).toContain('result += " HTTP/1.0\\r\\n"');
    expect(code).toContain('\\r\\n');
  });

  it('should generate boolean field handling', () => {
    const spec: ProtocolSpec = {
      protocol: {
        name: 'Test',
        port: 8080,
        description: 'Test Protocol',
      },
      connection: {
        type: 'TCP',
      },
      messageTypes: [
        {
          name: 'TestMessage',
          direction: 'request',
          format: '{enabled}',
          fields: [
            { name: 'enabled', type: { kind: 'boolean' }, required: true },
          ],
        },
      ],
    };

    const generator = new SerializerGenerator();
    const code = generator.generate(spec);

    // Verify boolean handling code is generated
    expect(code).toContain('typeof message.enabled !== \'boolean\'');
    expect(code).toContain('message.enabled ? \'true\' : \'false\'');
  });
});
