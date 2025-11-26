/**
 * Unit tests for Serializer Generator
 */

import { describe, it, expect } from 'vitest';
import { SerializerGenerator, SerializerGenerationStrategy } from '../../src/generation/serializer-generator.js';
import type { ProtocolSpec, MessageType } from '../../src/types/protocol-spec.js';

describe('SerializerGenerationStrategy', () => {
  const strategy = new SerializerGenerationStrategy();

  it('should analyze simple message type with fixed string', () => {
    const messageType: MessageType = {
      name: 'SimpleMessage',
      direction: 'request',
      format: 'HELLO',
      fields: [],
    };

    const result = strategy.analyzeMessageType(messageType);

    expect(result.messageType).toBe(messageType);
    expect(result.hasFixedStrings).toBe(true);
    expect(result.usesDelimiters).toBe(false);
    expect(result.approach).toBe('simple');
    expect(result.fieldOrder).toEqual([]);
  });

  it('should analyze delimiter-based message type', () => {
    const messageType: MessageType = {
      name: 'DelimitedMessage',
      direction: 'request',
      format: '{field1}\t{field2}\t{field3}',
      delimiter: '\t',
      fields: [
        { name: 'field1', type: { kind: 'string' }, required: true },
        { name: 'field2', type: { kind: 'number' }, required: true },
        { name: 'field3', type: { kind: 'string' }, required: false },
      ],
    };

    const result = strategy.analyzeMessageType(messageType);

    expect(result.usesDelimiters).toBe(true);
    expect(result.approach).toBe('delimiter-based');
    expect(result.fieldOrder).toEqual(['field1', 'field2', 'field3']);
  });

  it('should analyze format string message type', () => {
    const messageType: MessageType = {
      name: 'FormatMessage',
      direction: 'request',
      format: 'GET {path} HTTP/1.0',
      fields: [
        { name: 'path', type: { kind: 'string' }, required: true },
      ],
    };

    const result = strategy.analyzeMessageType(messageType);

    expect(result.hasFixedStrings).toBe(true);
    expect(result.usesDelimiters).toBe(false);
    expect(result.approach).toBe('format-string');
    expect(result.fieldOrder).toEqual(['path']);
  });

  it('should plan field serialization', () => {
    const messageType: MessageType = {
      name: 'TestMessage',
      direction: 'request',
      format: '{name}\t{age}',
      delimiter: '\t',
      fields: [
        { name: 'name', type: { kind: 'string' }, required: true },
        { name: 'age', type: { kind: 'number' }, required: true },
      ],
    };

    const serializationStrategy = strategy.analyzeMessageType(messageType);
    const plans = strategy.planFieldSerialization(serializationStrategy);

    expect(plans).toHaveLength(2);
    expect(plans[0].fieldName).toBe('name');
    expect(plans[0].formattingMethod).toBe('format-string');
    expect(plans[1].fieldName).toBe('age');
    expect(plans[1].formattingMethod).toBe('format-number');
  });
});

describe('SerializerGenerator', () => {
  const generator = new SerializerGenerator();

  it('should generate serializer for simple protocol', () => {
    const spec: ProtocolSpec = {
      protocol: {
        name: 'TestProtocol',
        rfc: '1234',
        port: 8080,
        description: 'Test protocol',
      },
      connection: {
        type: 'TCP',
      },
      messageTypes: [
        {
          name: 'SimpleRequest',
          direction: 'request',
          format: 'HELLO',
          fields: [],
        },
      ],
    };

    const code = generator.generate(spec);

    expect(code).toContain('Generated Serializer for TestProtocol Protocol');
    expect(code).toContain('export interface SerializeResult');
    expect(code).toContain('export interface SimpleRequest');
    expect(code).toContain('export class SimpleRequestSerializer');
    expect(code).toContain('serialize(message: SimpleRequest)');
    expect(code).toContain('validate(message: SimpleRequest)');
    expect(code).toContain('export class TestProtocolSerializer');
  });

  it('should generate serializer with field validation', () => {
    const spec: ProtocolSpec = {
      protocol: {
        name: 'TestProtocol',
        port: 8080,
        description: 'Test protocol',
      },
      connection: {
        type: 'TCP',
      },
      messageTypes: [
        {
          name: 'UserMessage',
          direction: 'request',
          format: '{username}\t{age}',
          delimiter: '\t',
          terminator: '\r\n',
          fields: [
            {
              name: 'username',
              type: { kind: 'string', maxLength: 50 },
              required: true,
              validation: { maxLength: 50, minLength: 3 },
            },
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

    const code = generator.generate(spec);

    // Check validation code is generated
    expect(code).toContain('validate(message: UserMessage)');
    expect(code).toContain('Required field "username" is missing');
    expect(code).toContain('Required field "age" is missing');
    expect(code).toContain('exceeds maximum length of 50');
    expect(code).toContain('below minimum length of 3');
    expect(code).toContain('below minimum value of 0');
    expect(code).toContain('exceeds maximum value of 150');
  });

  it('should generate delimiter-based serialization', () => {
    const spec: ProtocolSpec = {
      protocol: {
        name: 'TabDelimited',
        port: 9000,
        description: 'Tab delimited protocol',
      },
      connection: {
        type: 'TCP',
      },
      messageTypes: [
        {
          name: 'DataRow',
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

    const code = generator.generate(spec);

    // Check delimiter-based serialization code
    expect(code).toContain('const parts: string[] = []');
    expect(code).toContain('parts.join');
    expect(code).toContain('\\t'); // Tab delimiter
    expect(code).toContain('\\n'); // Line terminator
  });

  it('should generate format string serialization', () => {
    const spec: ProtocolSpec = {
      protocol: {
        name: 'HTTPLike',
        port: 80,
        description: 'HTTP-like protocol',
      },
      connection: {
        type: 'TCP',
      },
      messageTypes: [
        {
          name: 'Request',
          direction: 'request',
          format: 'GET {path} HTTP/1.0\r\n',
          terminator: '\r\n',
          fields: [
            { name: 'path', type: { kind: 'string' }, required: true },
          ],
        },
      ],
    };

    const code = generator.generate(spec);

    // Check format string serialization code
    expect(code).toContain('let result = \'\'');
    expect(code).toContain('result +=');
    expect(code).toContain('GET ');
    expect(code).toContain(' HTTP/1.0');
  });

  it('should generate enum field validation', () => {
    const spec: ProtocolSpec = {
      protocol: {
        name: 'EnumProtocol',
        port: 7000,
        description: 'Protocol with enums',
      },
      connection: {
        type: 'TCP',
      },
      messageTypes: [
        {
          name: 'StatusMessage',
          direction: 'response',
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

    const code = generator.generate(spec);

    // Check enum validation
    expect(code).toContain('const validValues = ["OK","ERROR","PENDING"]');
    expect(code).toContain('invalid enum value');
  });

  it('should generate main serializer class with all message serializers', () => {
    const spec: ProtocolSpec = {
      protocol: {
        name: 'MultiMessage',
        port: 5000,
        description: 'Protocol with multiple messages',
      },
      connection: {
        type: 'TCP',
      },
      messageTypes: [
        {
          name: 'RequestMessage',
          direction: 'request',
          format: '{data}',
          fields: [{ name: 'data', type: { kind: 'string' }, required: true }],
        },
        {
          name: 'ResponseMessage',
          direction: 'response',
          format: '{result}',
          fields: [{ name: 'result', type: { kind: 'string' }, required: true }],
        },
      ],
    };

    const code = generator.generate(spec);

    // Check main serializer class
    expect(code).toContain('export class MultiMessageSerializer');
    expect(code).toContain('public requestmessage: RequestMessageSerializer');
    expect(code).toContain('public responsemessage: ResponseMessageSerializer');
    expect(code).toContain('this.requestmessage = new RequestMessageSerializer()');
    expect(code).toContain('this.responsemessage = new ResponseMessageSerializer()');
  });

  it('should generate extension point hooks', () => {
    const spec: ProtocolSpec = {
      protocol: {
        name: 'ExtensibleProtocol',
        port: 6000,
        description: 'Protocol with extension points',
      },
      connection: {
        type: 'TCP',
      },
      messageTypes: [
        {
          name: 'Message',
          direction: 'request',
          format: '{data}',
          fields: [{ name: 'data', type: { kind: 'string' }, required: true }],
        },
      ],
    };

    const code = generator.generate(spec);

    // Check extension point
    expect(code).toContain('Extension point: Custom pre-serialization hook');
    expect(code).toContain('protected preSerialization');
  });

  it('should handle boolean fields', () => {
    const spec: ProtocolSpec = {
      protocol: {
        name: 'BooleanProtocol',
        port: 4000,
        description: 'Protocol with boolean fields',
      },
      connection: {
        type: 'TCP',
      },
      messageTypes: [
        {
          name: 'FlagMessage',
          direction: 'request',
          format: '{enabled}',
          fields: [
            { name: 'enabled', type: { kind: 'boolean' }, required: true },
          ],
        },
      ],
    };

    const code = generator.generate(spec);

    // Check boolean handling
    expect(code).toContain('typeof message.enabled !== \'boolean\'');
    expect(code).toContain('message.enabled ? \'true\' : \'false\'');
  });

  it('should handle bytes fields', () => {
    const spec: ProtocolSpec = {
      protocol: {
        name: 'BinaryProtocol',
        port: 3000,
        description: 'Protocol with binary fields',
      },
      connection: {
        type: 'TCP',
      },
      messageTypes: [
        {
          name: 'BinaryMessage',
          direction: 'request',
          format: '{data}',
          fields: [
            { name: 'data', type: { kind: 'bytes', length: 16 }, required: true },
          ],
        },
      ],
    };

    const code = generator.generate(spec);

    // Check bytes handling
    expect(code).toContain('Buffer.isBuffer');
    expect(code).toContain('must be exactly 16 bytes');
    expect(code).toContain('.toString(\'utf-8\')');
  });
});
