/**
 * Core type definitions for Protocol Resurrection Machine
 * Defines the structure of YAML protocol specifications and related types
 */

/**
 * Complete protocol specification parsed from YAML
 */
export interface ProtocolSpec {
  /** Protocol metadata */
  protocol: ProtocolMetadata;
  /** Connection specification */
  connection: ConnectionSpec;
  /** Message type definitions */
  messageTypes: MessageType[];
  /** Type definitions (enums, structs) */
  types?: TypeDefinition[];
  /** Error handling specification */
  errorHandling?: ErrorHandlingSpec;
}

/**
 * Protocol metadata
 */
export interface ProtocolMetadata {
  /** Protocol name (e.g., "Gopher", "Finger") */
  name: string;
  /** RFC reference number (e.g., "1436") */
  rfc?: string;
  /** Default port number */
  port: number;
  /** Protocol description */
  description: string;
  /** Protocol version */
  version?: string;
}

/**
 * Connection behavior specification
 */
export interface ConnectionSpec {
  /** Connection type (TCP or UDP) */
  type: 'TCP' | 'UDP';
  /** Handshake sequence if required */
  handshake?: HandshakeSpec;
  /** Connection termination behavior */
  termination?: TerminationSpec;
  /** Connection timeout in milliseconds */
  timeout?: number;
  /** Whether to use keep-alive */
  keepAlive?: boolean;
}

/**
 * Handshake specification
 */
export interface HandshakeSpec {
  /** Message client sends during handshake */
  clientSends?: string;
  /** Message server responds with */
  serverResponds?: string;
  /** Whether handshake is required */
  required: boolean;
}

/**
 * Connection termination specification
 */
export interface TerminationSpec {
  /** Message client sends to terminate */
  clientSends?: string;
  /** Message server responds with */
  serverResponds?: string;
  /** Whether to close connection after termination */
  closeConnection: boolean;
}

/**
 * Message type definition
 */
export interface MessageType {
  /** Message type name */
  name: string;
  /** Message direction */
  direction: 'request' | 'response' | 'bidirectional';
  /** Message format string with placeholders */
  format: string;
  /** Field definitions (array for ordered fields) */
  fields: FieldDefinition[];
  /** Field delimiter */
  delimiter?: string;
  /** Message terminator */
  terminator?: string;
}

/**
 * Field definition within a message
 */
export interface FieldDefinition {
  /** Field name */
  name: string;
  /** Field data type */
  type: FieldType;
  /** Whether field is required */
  required: boolean;
  /** Validation rules */
  validation?: ValidationRule;
  /** Default value if not required */
  defaultValue?: any;
}

/**
 * Field data types (discriminated union)
 */
export type FieldType =
  | { kind: 'string'; maxLength?: number }
  | { kind: 'number'; min?: number; max?: number }
  | { kind: 'enum'; values: string[] }
  | { kind: 'bytes'; length?: number }
  | { kind: 'boolean' };

/**
 * Validation rules for fields
 */
export interface ValidationRule {
  /** Regex pattern for string validation */
  pattern?: string;
  /** Minimum length for strings */
  minLength?: number;
  /** Maximum length for strings */
  maxLength?: number;
  /** Minimum value for numbers */
  min?: number;
  /** Maximum value for numbers */
  max?: number;
  /** Custom validation function name */
  custom?: string;
}

/**
 * Type definition (enum or struct)
 */
export interface TypeDefinition {
  /** Type name */
  name: string;
  /** Type kind */
  kind: 'enum' | 'struct';
  /** Enum values (if kind is 'enum') */
  values?: EnumValue[];
  /** Struct fields (if kind is 'struct') */
  fields?: FieldDefinition[];
}

/**
 * Enumeration value definition
 */
export interface EnumValue {
  /** Enum value name */
  name: string;
  /** Enum value (string or number) */
  value: string | number;
  /** Optional description */
  description?: string;
}

/**
 * Enumeration type definition
 */
export interface EnumDefinition extends TypeDefinition {
  kind: 'enum';
  values: EnumValue[];
}

/**
 * Struct type definition
 */
export interface StructDefinition extends TypeDefinition {
  kind: 'struct';
  fields: FieldDefinition[];
}

/**
 * Error handling specification
 */
export interface ErrorHandlingSpec {
  /** How to handle parse errors */
  onParseError: 'throw' | 'return' | 'log';
  /** How to handle network errors */
  onNetworkError: 'throw' | 'retry' | 'return';
  /** Number of retry attempts for network errors */
  retryAttempts?: number;
  /** Delay between retries in milliseconds */
  retryDelay?: number;
}
