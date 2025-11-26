/**
 * Unit tests for core type definitions
 */

import { describe, it, expect } from 'vitest';
import {
  isProtocolSpec,
  isProtocolMetadata,
  isConnectionSpec,
  isMessageType,
  isFieldDefinition,
  isFieldType,
  isTypeDefinition,
  isEnumDefinition,
  isStructDefinition,
  isEnumValue,
  isValidConnectionType,
  isValidPort,
  isValidMessageDirection,
} from '../../src/types/guards.js';
import type {
  ProtocolSpec,
  ProtocolMetadata,
  ConnectionSpec,
  MessageType,
  FieldDefinition,
  FieldType,
  TypeDefinition,
} from '../../src/types/protocol-spec.js';

describe('Type Guards', () => {
  describe('isProtocolMetadata', () => {
    it('should accept valid protocol metadata', () => {
      const metadata: ProtocolMetadata = {
        name: 'Gopher',
        rfc: '1436',
        port: 70,
        description: 'The Gopher protocol',
      };
      expect(isProtocolMetadata(metadata)).toBe(true);
    });

    it('should reject invalid protocol metadata', () => {
      expect(isProtocolMetadata(null)).toBe(false);
      expect(isProtocolMetadata({})).toBe(false);
      expect(isProtocolMetadata({ name: 'Test' })).toBe(false);
    });
  });

  describe('isConnectionSpec', () => {
    it('should accept valid TCP connection spec', () => {
      const conn: ConnectionSpec = {
        type: 'TCP',
      };
      expect(isConnectionSpec(conn)).toBe(true);
    });

    it('should accept valid UDP connection spec', () => {
      const conn: ConnectionSpec = {
        type: 'UDP',
      };
      expect(isConnectionSpec(conn)).toBe(true);
    });

    it('should reject invalid connection spec', () => {
      expect(isConnectionSpec(null)).toBe(false);
      expect(isConnectionSpec({ type: 'http' })).toBe(false);
    });
  });

  describe('isFieldType', () => {
    it('should accept string field type', () => {
      const fieldType: FieldType = { kind: 'string', maxLength: 255 };
      expect(isFieldType(fieldType)).toBe(true);
    });

    it('should accept number field type', () => {
      const fieldType: FieldType = { kind: 'number', min: 0, max: 100 };
      expect(isFieldType(fieldType)).toBe(true);
    });

    it('should accept enum field type', () => {
      const fieldType: FieldType = { kind: 'enum', values: ['a', 'b', 'c'] };
      expect(isFieldType(fieldType)).toBe(true);
    });

    it('should accept bytes field type', () => {
      const fieldType: FieldType = { kind: 'bytes', length: 16 };
      expect(isFieldType(fieldType)).toBe(true);
    });

    it('should accept boolean field type', () => {
      const fieldType: FieldType = { kind: 'boolean' };
      expect(isFieldType(fieldType)).toBe(true);
    });

    it('should reject invalid field type', () => {
      expect(isFieldType(null)).toBe(false);
      expect(isFieldType({ kind: 'invalid' })).toBe(false);
    });
  });

  describe('isFieldDefinition', () => {
    it('should accept valid field definition', () => {
      const field: FieldDefinition = {
        name: 'selector',
        type: { kind: 'string' },
        required: true,
      };
      expect(isFieldDefinition(field)).toBe(true);
    });

    it('should reject invalid field definition', () => {
      expect(isFieldDefinition(null)).toBe(false);
      expect(isFieldDefinition({ name: 'test' })).toBe(false);
    });
  });

  describe('isMessageType', () => {
    it('should accept valid message type', () => {
      const message: MessageType = {
        name: 'Request',
        direction: 'request',
        format: '{selector}\\r\\n',
        fields: [
          {
            name: 'selector',
            type: { kind: 'string' },
            required: true,
          },
        ],
      };
      expect(isMessageType(message)).toBe(true);
    });

    it('should reject invalid message type', () => {
      expect(isMessageType(null)).toBe(false);
      expect(isMessageType({ name: 'Test' })).toBe(false);
    });
  });

  describe('isTypeDefinition', () => {
    it('should accept valid enum definition', () => {
      const enumDef: TypeDefinition = {
        name: 'ItemType',
        kind: 'enum',
        values: [
          { name: 'File', value: '0' },
          { name: 'Directory', value: '1' },
        ],
      };
      expect(isTypeDefinition(enumDef)).toBe(true);
      expect(isEnumDefinition(enumDef)).toBe(true);
    });

    it('should accept valid struct definition', () => {
      const structDef: TypeDefinition = {
        name: 'Item',
        kind: 'struct',
        fields: [
          {
            name: 'type',
            type: { kind: 'string' },
            required: true,
          },
        ],
      };
      expect(isTypeDefinition(structDef)).toBe(true);
      expect(isStructDefinition(structDef)).toBe(true);
    });

    it('should reject invalid type definition', () => {
      expect(isTypeDefinition(null)).toBe(false);
      expect(isTypeDefinition({ kind: 'enum' })).toBe(false);
    });
  });

  describe('isProtocolSpec', () => {
    it('should accept valid protocol spec', () => {
      const spec: ProtocolSpec = {
        protocol: {
          name: 'Gopher',
          rfc: '1436',
          port: 70,
          description: 'The Gopher protocol',
        },
        connection: {
          type: 'TCP',
        },
        messageTypes: [
          {
            name: 'Request',
            direction: 'request',
            format: '{selector}\\r\\n',
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
      expect(isProtocolSpec(spec)).toBe(true);
    });

    it('should reject invalid protocol spec', () => {
      expect(isProtocolSpec(null)).toBe(false);
      expect(isProtocolSpec({})).toBe(false);
    });
  });

  describe('Validation utilities', () => {
    it('should validate connection types', () => {
      expect(isValidConnectionType('TCP')).toBe(true);
      expect(isValidConnectionType('UDP')).toBe(true);
      expect(isValidConnectionType('http')).toBe(false);
    });

    it('should validate port numbers', () => {
      expect(isValidPort(80)).toBe(true);
      expect(isValidPort(65535)).toBe(true);
      expect(isValidPort(0)).toBe(false);
      expect(isValidPort(65536)).toBe(false);
      expect(isValidPort(3.14)).toBe(false);
    });

    it('should validate message directions', () => {
      expect(isValidMessageDirection('request')).toBe(true);
      expect(isValidMessageDirection('response')).toBe(true);
      expect(isValidMessageDirection('bidirectional')).toBe(true);
      expect(isValidMessageDirection('invalid')).toBe(false);
    });
  });
});
