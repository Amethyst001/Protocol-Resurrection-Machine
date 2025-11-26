/**
 * Type guards and validation utilities
 */

import type {
  ProtocolSpec,
  ProtocolMetadata,
  ConnectionSpec,
  MessageType,
  FieldDefinition,
  FieldType,
  TypeDefinition,
  EnumDefinition,
  StructDefinition,
  EnumValue,
} from './protocol-spec.js';

/**
 * Type guard for ProtocolSpec
 */
export function isProtocolSpec(value: unknown): value is ProtocolSpec {
  if (typeof value !== 'object' || value === null) return false;
  const spec = value as Partial<ProtocolSpec>;
  return (
    isProtocolMetadata(spec.protocol) &&
    isConnectionSpec(spec.connection) &&
    Array.isArray(spec.messageTypes) &&
    spec.messageTypes.every(isMessageType)
  );
}

/**
 * Type guard for ProtocolMetadata
 */
export function isProtocolMetadata(value: unknown): value is ProtocolMetadata {
  if (typeof value !== 'object' || value === null) return false;
  const meta = value as Partial<ProtocolMetadata>;
  return (
    typeof meta.name === 'string' &&
    typeof meta.port === 'number' &&
    typeof meta.description === 'string'
  );
}

/**
 * Type guard for ConnectionSpec
 */
export function isConnectionSpec(value: unknown): value is ConnectionSpec {
  if (typeof value !== 'object' || value === null) return false;
  const conn = value as Partial<ConnectionSpec>;
  return conn.type === 'TCP' || conn.type === 'UDP';
}

/**
 * Type guard for MessageType
 */
export function isMessageType(value: unknown): value is MessageType {
  if (typeof value !== 'object' || value === null) return false;
  const msg = value as Partial<MessageType>;
  return (
    typeof msg.name === 'string' &&
    (msg.direction === 'request' ||
      msg.direction === 'response' ||
      msg.direction === 'bidirectional') &&
    typeof msg.format === 'string' &&
    Array.isArray(msg.fields) &&
    msg.fields.every(isFieldDefinition)
  );
}

/**
 * Type guard for FieldDefinition
 */
export function isFieldDefinition(value: unknown): value is FieldDefinition {
  if (typeof value !== 'object' || value === null) return false;
  const field = value as Partial<FieldDefinition>;
  return (
    typeof field.name === 'string' &&
    isFieldType(field.type) &&
    typeof field.required === 'boolean'
  );
}

/**
 * Type guard for FieldType
 */
export function isFieldType(value: unknown): value is FieldType {
  if (typeof value !== 'object' || value === null) return false;
  const type = value as any;
  
  if (type.kind === 'string') {
    return (
      type.maxLength === undefined || typeof type.maxLength === 'number'
    );
  }
  if (type.kind === 'number') {
    return (
      (type.min === undefined || typeof type.min === 'number') &&
      (type.max === undefined || typeof type.max === 'number')
    );
  }
  if (type.kind === 'enum') {
    return Array.isArray(type.values) && type.values.every((v: any) => typeof v === 'string');
  }
  if (type.kind === 'bytes') {
    return type.length === undefined || typeof type.length === 'number';
  }
  if (type.kind === 'boolean') {
    return true;
  }
  
  return false;
}

/**
 * Type guard for EnumValue
 */
export function isEnumValue(value: unknown): value is EnumValue {
  if (typeof value !== 'object' || value === null) return false;
  const enumVal = value as Partial<EnumValue>;
  return (
    typeof enumVal.name === 'string' &&
    (typeof enumVal.value === 'string' || typeof enumVal.value === 'number')
  );
}

/**
 * Type guard for TypeDefinition
 */
export function isTypeDefinition(value: unknown): value is TypeDefinition {
  if (typeof value !== 'object' || value === null) return false;
  const def = value as Partial<TypeDefinition>;
  
  if (typeof def.name !== 'string') return false;
  
  if (def.kind === 'enum') {
    return Array.isArray(def.values) && def.values.every(isEnumValue);
  }
  
  if (def.kind === 'struct') {
    return Array.isArray(def.fields) && def.fields.every(isFieldDefinition);
  }
  
  return false;
}

/**
 * Type guard for EnumDefinition
 */
export function isEnumDefinition(value: unknown): value is EnumDefinition {
  if (!isTypeDefinition(value)) return false;
  return value.kind === 'enum' && Array.isArray(value.values);
}

/**
 * Type guard for StructDefinition
 */
export function isStructDefinition(value: unknown): value is StructDefinition {
  if (!isTypeDefinition(value)) return false;
  return value.kind === 'struct' && Array.isArray(value.fields);
}

/**
 * Validates that a string is a valid connection type
 */
export function isValidConnectionType(
  value: string
): value is 'TCP' | 'UDP' {
  return value === 'TCP' || value === 'UDP';
}

/**
 * Validates that a port number is valid
 */
export function isValidPort(port: number): boolean {
  return Number.isInteger(port) && port >= 1 && port <= 65535;
}

/**
 * Validates that a message direction is valid
 */
export function isValidMessageDirection(
  value: string
): value is 'request' | 'response' | 'bidirectional' {
  return (
    value === 'request' || value === 'response' || value === 'bidirectional'
  );
}
