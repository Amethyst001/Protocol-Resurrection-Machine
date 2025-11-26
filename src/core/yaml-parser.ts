/**
 * YAML Protocol Specification Parser
 * Parses YAML protocol specifications into ProtocolSpec objects
 */

import yaml from 'js-yaml';
import type {
  ProtocolSpec,
  ProtocolMetadata,
  ConnectionSpec,
  MessageType,
  FieldDefinition,
  FieldType,
  TypeDefinition,
  EnumValue,
  HandshakeSpec,
  TerminationSpec,
  ErrorHandlingSpec,
  ValidationRule,
} from '../types/protocol-spec.js';
import { YAMLParseError } from '../types/errors.js';
import type { ValidationResult } from '../types/results.js';
import { ProtocolValidator } from './validator.js';

/**
 * YAML Parser for protocol specifications
 */
export class YAMLParser {
  private validator: ProtocolValidator;

  constructor() {
    this.validator = new ProtocolValidator();
  }

  /**
   * Parse YAML content into a ProtocolSpec
   * @param yamlContent - YAML string content
   * @returns Parsed ProtocolSpec
   * @throws YAMLParseError if parsing fails
   */
  parse(yamlContent: string): ProtocolSpec {
    try {
      // Parse YAML to JavaScript object
      const rawData = yaml.load(yamlContent) as any;

      if (!rawData || typeof rawData !== 'object') {
        throw new YAMLParseError('YAML content must be an object');
      }

      // Parse each section
      const protocol = this.parseProtocolMetadata(rawData.protocol);
      const connection = this.parseConnectionSpec(rawData.connection);
      const messageTypes = this.parseMessageTypes(rawData.messageTypes || rawData.messages);
      const types = rawData.types ? this.parseTypeDefinitions(rawData.types) : undefined;
      const errorHandling = rawData.errorHandling
        ? this.parseErrorHandling(rawData.errorHandling)
        : undefined;

      const spec: ProtocolSpec = {
        protocol,
        connection,
        messageTypes,
      };

      if (types !== undefined) {
        spec.types = types;
      }

      if (errorHandling !== undefined) {
        spec.errorHandling = errorHandling;
      }

      return spec;
    } catch (error) {
      if (error instanceof YAMLParseError) {
        throw error;
      }
      if (error instanceof yaml.YAMLException) {
        throw new YAMLParseError(
          error.message,
          (error as any).mark?.line,
          (error as any).mark?.column
        );
      }
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new YAMLParseError(`Failed to parse YAML: ${errorMessage}`);
    }
  }

  /**
   * Parse protocol metadata section
   */
  private parseProtocolMetadata(data: any): ProtocolMetadata {
    if (!data || typeof data !== 'object') {
      throw new YAMLParseError('Missing or invalid "protocol" section');
    }

    if (typeof data.name !== 'string' || !data.name.trim()) {
      throw new YAMLParseError('Protocol name is required and must be a non-empty string');
    }

    if (typeof data.port !== 'number' || data.port < 1 || data.port > 65535) {
      throw new YAMLParseError('Protocol port must be a number between 1 and 65535');
    }

    if (typeof data.description !== 'string' || !data.description.trim()) {
      throw new YAMLParseError('Protocol description is required and must be a non-empty string');
    }

    const metadata: ProtocolMetadata = {
      name: data.name.trim(),
      port: data.port,
      description: data.description.trim(),
    };

    if (data.rfc) {
      metadata.rfc = String(data.rfc).trim();
    }

    if (data.version) {
      metadata.version = String(data.version).trim();
    }

    return metadata;
  }

  /**
   * Parse connection specification section
   */
  private parseConnectionSpec(data: any): ConnectionSpec {
    if (!data || typeof data !== 'object') {
      throw new YAMLParseError('Missing or invalid "connection" section');
    }

    if (data.type !== 'TCP' && data.type !== 'UDP') {
      throw new YAMLParseError('Connection type must be either "TCP" or "UDP"');
    }

    const handshake = data.handshake ? this.parseHandshakeSpec(data.handshake) : undefined;
    const termination = data.termination ? this.parseTerminationSpec(data.termination) : undefined;

    const connection: ConnectionSpec = {
      type: data.type,
    };

    if (handshake !== undefined) {
      connection.handshake = handshake;
    }

    if (termination !== undefined) {
      connection.termination = termination;
    }

    if (typeof data.timeout === 'number') {
      connection.timeout = data.timeout;
    }

    if (typeof data.keepAlive === 'boolean') {
      connection.keepAlive = data.keepAlive;
    }

    return connection;
  }

  /**
   * Parse handshake specification
   */
  private parseHandshakeSpec(data: any): HandshakeSpec {
    if (typeof data !== 'object') {
      throw new YAMLParseError('Handshake specification must be an object');
    }

    const handshake: HandshakeSpec = {
      required: typeof data.required === 'boolean' ? data.required : false,
    };

    if (data.clientSends) {
      handshake.clientSends = String(data.clientSends);
    }

    if (data.serverResponds) {
      handshake.serverResponds = String(data.serverResponds);
    }

    return handshake;
  }

  /**
   * Parse termination specification
   */
  private parseTerminationSpec(data: any): TerminationSpec {
    if (typeof data !== 'object') {
      throw new YAMLParseError('Termination specification must be an object');
    }

    const termination: TerminationSpec = {
      closeConnection: typeof data.closeConnection === 'boolean' ? data.closeConnection : true,
    };

    if (data.clientSends) {
      termination.clientSends = String(data.clientSends);
    }

    if (data.serverResponds) {
      termination.serverResponds = String(data.serverResponds);
    }

    return termination;
  }

  /**
   * Parse message types section
   */
  private parseMessageTypes(data: any): MessageType[] {
    if (!Array.isArray(data) && typeof data === 'object' && data !== null) {
      // Handle object format: { request: {...}, response: {...} }
      return Object.entries(data).map(([name, msgData]) =>
        this.parseMessageType(name, msgData)
      );
    }

    if (!Array.isArray(data) || data.length === 0) {
      throw new YAMLParseError('Message types must be a non-empty array or object');
    }

    return data.map((msgData, index) => {
      if (!msgData.name) {
        throw new YAMLParseError(`Message type at index ${index} is missing a name`);
      }
      return this.parseMessageType(msgData.name, msgData);
    });
  }

  /**
   * Parse a single message type
   */
  private parseMessageType(name: string, data: any): MessageType {
    if (!data || typeof data !== 'object') {
      throw new YAMLParseError(`Message type "${name}" must be an object`);
    }

    const direction = data.direction || 'bidirectional';
    if (direction !== 'request' && direction !== 'response' && direction !== 'bidirectional') {
      throw new YAMLParseError(
        `Message type "${name}" has invalid direction: ${direction}. Must be "request", "response", or "bidirectional"`
      );
    }

    if (typeof data.format !== 'string') {
      throw new YAMLParseError(`Message type "${name}" is missing required "format" field`);
    }

    const fields = this.parseFields(data.fields || [], name);

    const messageType: MessageType = {
      name,
      direction,
      format: data.format,
      fields,
    };

    if (data.delimiter) {
      messageType.delimiter = String(data.delimiter);
    }

    if (data.terminator) {
      messageType.terminator = String(data.terminator);
    }

    // Auto-infer fields from format string if fields are empty
    if (messageType.fields.length === 0 && messageType.format) {
      const inferredFields = this.inferFieldsFromFormat(messageType.format);
      if (inferredFields.length > 0) {
        messageType.fields = inferredFields;
      }
    }

    return messageType;
  }

  /**
   * Infer fields from format string variables
   */
  private inferFieldsFromFormat(format: string): FieldDefinition[] {
    const fields: FieldDefinition[] = [];
    const regex = /\{([a-zA-Z0-9_]+)(?::([a-zA-Z0-9_]+))?\}/g;
    let match;
    const seen = new Set<string>();

    while ((match = regex.exec(format)) !== null) {
      const name = match[1];
      if (!name) continue;

      // Optional type hint in format string e.g. {name:number} (not standard but useful for inference)
      // If no type hint, default to string
      const typeHint = match[2];

      if (!seen.has(name)) {
        seen.add(name);

        let type: FieldType = { kind: 'string' };
        if (typeHint === 'number') type = { kind: 'number' };
        else if (typeHint === 'boolean') type = { kind: 'boolean' };

        fields.push({
          name,
          type,
          required: true // Inferred fields are required by default as they appear in format
        });
      }
    }
    return fields;
  }

  /**
   * Parse field definitions
   */
  private parseFields(data: any, messageName: string): FieldDefinition[] {
    if (!Array.isArray(data)) {
      // Handle object format: { fieldName: { type: ..., required: ... } }
      if (typeof data === 'object' && data !== null) {
        return Object.entries(data).map(([fieldName, fieldData]) =>
          this.parseField(fieldName, fieldData, messageName)
        );
      }
      return [];
    }

    return data.map((fieldData, index) => {
      if (!fieldData.name) {
        throw new YAMLParseError(
          `Field at index ${index} in message "${messageName}" is missing a name`
        );
      }
      return this.parseField(fieldData.name, fieldData, messageName);
    });
  }

  /**
   * Parse a single field definition
   */
  private parseField(name: string, data: any, messageName: string): FieldDefinition {
    if (!data || typeof data !== 'object') {
      throw new YAMLParseError(
        `Field "${name}" in message "${messageName}" must be an object`
      );
    }

    const type = this.parseFieldType(data.type, name, messageName);
    const required = typeof data.required === 'boolean' ? data.required : true;
    const validation = data.validation ? this.parseValidationRule(data.validation) : undefined;

    const field: FieldDefinition = {
      name,
      type,
      required,
    };

    if (validation !== undefined) {
      field.validation = validation;
    }

    if (data.defaultValue !== undefined) {
      field.defaultValue = data.defaultValue;
    }

    return field;
  }

  /**
   * Parse field type
   */
  private parseFieldType(data: any, fieldName: string, messageName: string): FieldType {
    if (typeof data === 'string') {
      // Simple string type: "string", "number", "boolean", "bytes"
      switch (data) {
        case 'string':
          return { kind: 'string' };
        case 'number':
          return { kind: 'number' };
        case 'boolean':
          return { kind: 'boolean' };
        case 'bytes':
          return { kind: 'bytes' };
        default:
          throw new YAMLParseError(
            `Field "${fieldName}" in message "${messageName}" has invalid type: ${data}`
          );
      }
    }

    if (typeof data === 'object' && data !== null) {
      const kind = data.kind || data.type;

      switch (kind) {
        case 'string':
          return {
            kind: 'string',
            maxLength: typeof data.maxLength === 'number' ? data.maxLength : undefined,
          };
        case 'number':
          return {
            kind: 'number',
            min: typeof data.min === 'number' ? data.min : undefined,
            max: typeof data.max === 'number' ? data.max : undefined,
          };
        case 'enum':
          if (!Array.isArray(data.values) || data.values.length === 0) {
            throw new YAMLParseError(
              `Enum field "${fieldName}" in message "${messageName}" must have a non-empty "values" array`
            );
          }
          return {
            kind: 'enum',
            values: data.values.map(String),
          };
        case 'bytes':
          return {
            kind: 'bytes',
            length: typeof data.length === 'number' ? data.length : undefined,
          };
        case 'boolean':
          return { kind: 'boolean' };
        default:
          throw new YAMLParseError(
            `Field "${fieldName}" in message "${messageName}" has invalid type kind: ${kind}`
          );
      }
    }

    throw new YAMLParseError(
      `Field "${fieldName}" in message "${messageName}" has invalid type specification`
    );
  }

  /**
   * Parse validation rule
   */
  private parseValidationRule(data: any): ValidationRule {
    if (typeof data !== 'object' || data === null) {
      throw new YAMLParseError('Validation rule must be an object');
    }

    const rule: ValidationRule = {};

    if (data.pattern) {
      rule.pattern = String(data.pattern);
    }

    if (typeof data.minLength === 'number') {
      rule.minLength = data.minLength;
    }

    if (typeof data.maxLength === 'number') {
      rule.maxLength = data.maxLength;
    }

    if (typeof data.min === 'number') {
      rule.min = data.min;
    }

    if (typeof data.max === 'number') {
      rule.max = data.max;
    }

    if (data.custom) {
      rule.custom = String(data.custom);
    }

    return rule;
  }

  /**
   * Parse type definitions section
   */
  private parseTypeDefinitions(data: any): TypeDefinition[] {
    if (!Array.isArray(data)) {
      // Handle object format: { TypeName: { kind: ..., values: ... } }
      if (typeof data === 'object' && data !== null) {
        return Object.entries(data).map(([typeName, typeData]) =>
          this.parseTypeDefinition(typeName, typeData)
        );
      }
      throw new YAMLParseError('Type definitions must be an array or object');
    }

    return data.map((typeData, index) => {
      if (!typeData.name) {
        throw new YAMLParseError(`Type definition at index ${index} is missing a name`);
      }
      return this.parseTypeDefinition(typeData.name, typeData);
    });
  }

  /**
   * Parse a single type definition
   */
  private parseTypeDefinition(name: string, data: any): TypeDefinition {
    if (!data || typeof data !== 'object') {
      throw new YAMLParseError(`Type definition "${name}" must be an object`);
    }

    const kind = data.kind;
    if (kind !== 'enum' && kind !== 'struct') {
      throw new YAMLParseError(
        `Type definition "${name}" has invalid kind: ${kind}. Must be "enum" or "struct"`
      );
    }

    if (kind === 'enum') {
      const values = this.parseEnumValues(data.values || [], name);
      return { name, kind: 'enum', values };
    }

    if (kind === 'struct') {
      const fields = this.parseFields(data.fields || [], name);
      return { name, kind: 'struct', fields };
    }

    throw new YAMLParseError(`Type definition "${name}" has invalid structure`);
  }

  /**
   * Parse enum values
   */
  private parseEnumValues(data: any, typeName: string): EnumValue[] {
    if (!Array.isArray(data) && typeof data === 'object' && data !== null) {
      // Handle object format: { VALUE_NAME: "value" } or { VALUE_NAME: { value: "x", description: "..." } }
      return Object.entries(data).map(([enumName, enumData]) => {
        if (typeof enumData === 'string' || typeof enumData === 'number') {
          return { name: enumName, value: enumData };
        }
        if (typeof enumData === 'object' && enumData !== null) {
          return {
            name: enumName,
            value: (enumData as any).value,
            description: (enumData as any).description,
          };
        }
        throw new YAMLParseError(`Invalid enum value "${enumName}" in type "${typeName}"`);
      });
    }

    if (!Array.isArray(data)) {
      throw new YAMLParseError(`Enum values for type "${typeName}" must be an array or object`);
    }

    return data.map((enumData, index) => {
      if (typeof enumData === 'string' || typeof enumData === 'number') {
        return { name: String(enumData), value: enumData };
      }

      if (typeof enumData === 'object' && enumData !== null) {
        if (!enumData.name) {
          throw new YAMLParseError(
            `Enum value at index ${index} in type "${typeName}" is missing a name`
          );
        }
        if (enumData.value === undefined) {
          throw new YAMLParseError(
            `Enum value "${enumData.name}" in type "${typeName}" is missing a value`
          );
        }
        return {
          name: enumData.name,
          value: enumData.value,
          description: enumData.description,
        };
      }

      throw new YAMLParseError(
        `Invalid enum value at index ${index} in type "${typeName}"`
      );
    });
  }

  /**
   * Parse error handling specification
   */
  private parseErrorHandling(data: any): ErrorHandlingSpec {
    if (typeof data !== 'object' || data === null) {
      throw new YAMLParseError('Error handling specification must be an object');
    }

    const onParseError = data.onParseError || 'throw';
    if (onParseError !== 'throw' && onParseError !== 'return' && onParseError !== 'log') {
      throw new YAMLParseError(
        `Invalid onParseError value: ${onParseError}. Must be "throw", "return", or "log"`
      );
    }

    const onNetworkError = data.onNetworkError || 'throw';
    if (
      onNetworkError !== 'throw' &&
      onNetworkError !== 'retry' &&
      onNetworkError !== 'return'
    ) {
      throw new YAMLParseError(
        `Invalid onNetworkError value: ${onNetworkError}. Must be "throw", "retry", or "return"`
      );
    }

    return {
      onParseError,
      onNetworkError,
      retryAttempts: typeof data.retryAttempts === 'number' ? data.retryAttempts : undefined,
      retryDelay: typeof data.retryDelay === 'number' ? data.retryDelay : undefined,
    };
  }

  /**
   * Validate a parsed protocol specification
   * @param spec - Protocol specification to validate
   * @returns Validation result with any errors or warnings
   */
  validate(spec: ProtocolSpec): ValidationResult {
    // Use the new validator for semantic validation
    return this.validator.validateSemantics(spec);
  }

  /**
   * Validate raw YAML data against the JSON schema
   * @param data - Raw YAML data (parsed to JavaScript object)
   * @returns Validation result with any errors
   */
  validateSchema(data: unknown): ValidationResult {
    return this.validator.validateSchema(data);
  }

  /**
   * Perform complete validation (schema + semantics)
   * @param yamlContent - YAML string content
   * @returns Validation result with all errors
   */
  validateComplete(yamlContent: string): ValidationResult {
    try {
      const rawData = yaml.load(yamlContent);
      const spec = this.parse(yamlContent);
      return this.validator.validate(rawData, spec);
    } catch (error) {
      if (error instanceof YAMLParseError) {
        const validationError: ValidationResult['errors'][0] = {
          type: 'schema_violation',
          message: error.message,
        };

        if (error.line !== undefined) {
          validationError.line = error.line;
        }

        if (error.column !== undefined) {
          validationError.column = error.column;
        }

        return {
          valid: false,
          errors: [validationError],
        };
      }
      throw error;
    }
  }
}
