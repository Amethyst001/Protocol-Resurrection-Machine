/**
 * Serializer Generator
 * Generates TypeScript serializer code from protocol specifications
 * 
 * This module implements the serializer generation strategy:
 * 1. Analyze format strings to determine serialization approach
 * 2. Generate field formatting code from format strings
 * 3. Handle delimiters and fixed string insertion
 * 4. Generate validation code for required fields
 * 5. Generate error reporting for invalid fields
 */

import type { ProtocolSpec, MessageType, FieldDefinition, FieldType } from '../types/protocol-spec.js';
import { FormatParser, type ParsedFormat } from '../core/format-parser.js';
import { EnhancedFormatParser } from '../core/enhanced-format-parser.js';
import { toPascalCase, toKebabCase } from '../utils/string-utils.js';

/**
 * Serialization strategy for a message type
 */
export interface SerializationStrategy {
  /** Message type being serialized */
  messageType: MessageType;
  /** Parsed format information */
  parsedFormat: ParsedFormat;
  /** Whether the format has fixed strings */
  hasFixedStrings: boolean;
  /** Whether the format uses delimiters */
  usesDelimiters: boolean;
  /** Serialization approach to use */
  approach: 'simple' | 'delimiter-based' | 'format-string';
  /** Field serialization order */
  fieldOrder: string[];
}

/**
 * Field serialization plan
 */
export interface FieldSerializationPlan {
  fieldName: string;
  fieldType: FieldType;
  required: boolean;
  validation?: any;
  formattingMethod: string;
  conversionMethod: string;
}

/**
 * Serializer Generation Strategy Analyzer
 */
export class SerializerGenerationStrategy {
  private formatParser: FormatParser;

  constructor() {
    this.formatParser = new FormatParser();
  }

  /**
   * Analyze a message type and determine the serialization strategy
   * @param messageType - Message type to analyze
   * @returns Serialization strategy for the message type
   */
  analyzeMessageType(messageType: MessageType): SerializationStrategy {
    const parsedFormat = this.formatParser.parse(messageType.format);

    // Determine if format has fixed strings
    const hasFixedStrings = parsedFormat.fixedParts.some(part => part.length > 0);

    // Determine if format uses delimiters
    const usesDelimiters = messageType.delimiter !== undefined;

    // Determine serialization approach
    let approach: SerializationStrategy['approach'];

    if (!parsedFormat.hasPlaceholders) {
      // No placeholders - just output fixed string
      approach = 'simple';
    } else if (usesDelimiters) {
      // Has delimiters - use delimiter-based serialization
      approach = 'delimiter-based';
    } else {
      // Use format string approach
      approach = 'format-string';
    }

    // Extract field order from format
    const fieldOrder = parsedFormat.placeholders.map(p => p.fieldName);

    return {
      messageType,
      parsedFormat,
      hasFixedStrings,
      usesDelimiters,
      approach,
      fieldOrder,
    };
  }

  /**
   * Analyze all message types in a protocol spec
   * @param spec - Protocol specification
   * @returns Map of message type names to serialization strategies
   */
  analyzeProtocol(spec: ProtocolSpec): Map<string, SerializationStrategy> {
    const strategies = new Map<string, SerializationStrategy>();

    for (const messageType of spec.messageTypes) {
      const strategy = this.analyzeMessageType(messageType);
      strategies.set(messageType.name, strategy);
    }

    return strategies;
  }

  /**
   * Plan field serialization for a message type
   * @param strategy - Serialization strategy
   * @returns Field serialization plans
   */
  planFieldSerialization(strategy: SerializationStrategy): FieldSerializationPlan[] {
    const plans: FieldSerializationPlan[] = [];

    for (const placeholder of strategy.parsedFormat.placeholders) {
      const field = strategy.messageType.fields.find(f => f.name === placeholder.fieldName);

      if (!field) {
        continue;
      }

      plans.push({
        fieldName: field.name,
        fieldType: field.type,
        required: field.required,
        validation: field.validation,
        formattingMethod: this.determineFormattingMethod(field.type),
        conversionMethod: this.determineConversionMethod(field.type),
      });
    }

    return plans;
  }

  /**
   * Determine formatting method for a field type
   */
  private determineFormattingMethod(fieldType: FieldType): string {
    switch (fieldType.kind) {
      case 'string':
        return 'format-string';
      case 'number':
        return 'format-number';
      case 'enum':
        return 'format-enum';
      case 'bytes':
        return 'format-bytes';
      case 'boolean':
        return 'format-boolean';
      default:
        return 'format-string';
    }
  }

  /**
   * Determine conversion method for a field type
   */
  private determineConversionMethod(fieldType: FieldType): string {
    switch (fieldType.kind) {
      case 'string':
        return 'toString';
      case 'number':
        return 'toString';
      case 'enum':
        return 'toString';
      case 'bytes':
        return 'toBuffer';
      case 'boolean':
        return 'toBoolean';
      default:
        return 'toString';
    }
  }
}

/**
 * Serializer Generator
 * Generates serializer code from protocol specifications
 */
export class SerializerGenerator {
  private strategy: SerializerGenerationStrategy;

  constructor() {
    this.strategy = new SerializerGenerationStrategy();
  }

  /**
   * Generate serializer code for a protocol specification
   * @param spec - Protocol specification
   * @returns Generated TypeScript serializer code
   */
  generate(spec: ProtocolSpec): string {
    // CRITICAL FIX: Auto-populate fields from format strings
    this.ensureFieldsPopulated(spec);

    const strategies = this.strategy.analyzeProtocol(spec);

    // Generate imports
    const imports = this.generateImports(spec);

    // Generate type definitions
    const types = this.generateTypes(spec);

    // Generate serializer class for each message type
    const serializers = Array.from(strategies.values())
      .map(strategy => this.generateSerializerForMessageType(strategy))
      .join('\n\n');

    // Generate main serializer class that combines all message serializers
    const mainSerializer = this.generateMainSerializer(spec, strategies);

    return `${imports}\n\n${types}\n\n${serializers}\n\n${mainSerializer}`;
  }

  /**
   * Ensure all messageTypes have fields populated from format strings
   * This auto-discovers fields like {db}, {username}, etc.
   */
  private ensureFieldsPopulated(spec: ProtocolSpec): void {
    const formatParser = new FormatParser();

    for (const messageType of spec.messageTypes) {
      // Extract field names from format string
      const fieldNamesInFormat = formatParser.extractFieldNames(messageType.format);

      // Create a set of existing field names
      const existingFields = new Set(messageType.fields.map(f => f.name));

      // Add any missing fields auto-discovered from format
      for (const fieldName of fieldNamesInFormat) {
        if (!existingFields.has(fieldName)) {
          // Auto-create field with default string type
          messageType.fields.push({
            name: fieldName,
            type: { kind: 'string' },
            required: true // Fields in format string are required
          });
        }
      }
    }
  }

  /**
   * Generate imports section
   */
  private generateImports(spec: ProtocolSpec): string {
    return `/**
 * Generated Serializer for ${spec.protocol.name} Protocol
 * RFC: ${spec.protocol.rfc || 'N/A'}
 * Port: ${spec.protocol.port}
 * 
 * This file is auto-generated. Do not edit manually.
 * Regenerate using: protocol-resurrection-machine generate ${toKebabCase(spec.protocol.name)}.yaml
 */`;
  }

  /**
   * Generate type definitions
   */
  private generateTypes(spec: ProtocolSpec): string {
    const lines: string[] = [];

    // Generate SerializeResult interface
    lines.push(`/**
 * Result of a serialize operation
 */
export interface SerializeResult {
  /** Whether serialization succeeded */
  success: boolean;
  /** Serialized data (if successful) */
  data?: Buffer;
  /** Serialize error (if failed) */
  error?: SerializeError;
}

/**
 * Serialize error with detailed information
 */
export interface SerializeError {
  /** Error message */
  message: string;
  /** Field name that caused error */
  field: string;
  /** Reason for error */
  reason: string;
  /** Expected value or format */
  expected?: string;
  /** Actual value provided */
  actual?: string;
}

/**
 * Validation result for pre-serialization checks
 */
export interface ValidationResult {
  /** Whether validation succeeded */
  valid: boolean;
  /** Validation errors if any */
  errors: ValidationError[];
}

/**
 * Validation error
 */
export interface ValidationError {
  /** Field name */
  field: string;
  /** Error message */
  message: string;
  /** Expected value or constraint */
  expected?: string;
  /** Actual value */
  actual?: string;
}`);

    // Generate message type interfaces (if not already defined elsewhere)
    for (const messageType of spec.messageTypes) {
      lines.push('');
      lines.push(`/**
 * ${messageType.name} message
 * Direction: ${messageType.direction}
 * Format: ${messageType.format}
 */`);
      lines.push(`export interface ${messageType.name} {`);

      for (const field of messageType.fields) {
        const optional = !field.required ? '?' : '';
        const tsType = this.fieldTypeToTypeScript(field.type);
        lines.push(`  /** ${field.name} field */`);
        lines.push(`  ${field.name}${optional}: ${tsType};`);
      }

      lines.push('}');
    }

    return lines.join('\n');
  }

  /**
   * Convert FieldType to TypeScript type string
   */
  private fieldTypeToTypeScript(fieldType: FieldType): string {
    switch (fieldType.kind) {
      case 'string':
        return 'string';
      case 'number':
        return 'number';
      case 'boolean':
        return 'boolean';
      case 'bytes':
        return 'Buffer';
      case 'enum':
        // For inline enums, use union type
        return fieldType.values.map(v => JSON.stringify(v)).join(' | ');
      default:
        return 'any';
    }
  }

  /**
   * Generate serializer for a specific message type
   */
  private generateSerializerForMessageType(strategy: SerializationStrategy): string {
    const { messageType } = strategy;
    const className = `${messageType.name}Serializer`;

    const lines: string[] = [];

    lines.push(`/**
 * Serializer for ${messageType.name} messages
 */
export class ${className} {
  /**
   * Serialize a ${messageType.name} message to a Buffer
   * @param message - Message object to serialize
   * @returns Serialize result with data or error
   */
  serialize(message: ${messageType.name}): SerializeResult {
    try {
      // Validate message before serialization
      const validation = this.validate(message);
      if (!validation.valid) {
        return {
          success: false,
          error: {
            message: validation.errors.map(e => e.message).join('; '),
            field: validation.errors[0]?.field || 'unknown',
            reason: 'validation_failed',
            expected: validation.errors[0]?.expected,
            actual: validation.errors[0]?.actual,
          },
        };
      }

      // Perform serialization
      const result = this.serializeInternal(message);
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: {
          message: errorMessage,
          field: 'unknown',
          reason: 'serialization_error',
        },
      };
    }
  }

  /**
   * Validate a message before serialization
   * @param message - Message object to validate
   * @returns Validation result
   */
  validate(message: ${messageType.name}): ValidationResult {
    const errors: ValidationError[] = [];

    ${this.generateValidationCode(strategy)}

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Internal serialization implementation
   * @param message - Message object to serialize
   * @returns Serialize result
   */
  private serializeInternal(message: ${messageType.name}): SerializeResult {
    ${this.generateSerializeImplementation(strategy)}
  }

  /**
   * Extension point: Custom pre-serialization hook
   * Override this method to add custom processing before serialization
   * @param message - Message to process
   * @returns Processed message
   */
  protected preSerialization(message: ${messageType.name}): ${messageType.name} {
    // Extension point - can be overridden
    return message;
  }
}`);

    return lines.join('\n');
  }

  /**
   * Generate validation code for a message type
   */
  private generateValidationCode(strategy: SerializationStrategy): string {
    const { messageType } = strategy;
    const lines: string[] = [];

    for (const field of messageType.fields) {
      // Check required fields
      if (field.required) {
        lines.push(`// Validate required field: ${field.name}`);
        lines.push(`if (message.${field.name} === undefined || message.${field.name} === null) {`);
        lines.push('  errors.push({');
        lines.push(`    field: '${field.name}',`);
        lines.push(`    message: 'Required field "${field.name}" is missing',`);
        lines.push(`    expected: 'non-null value',`);
        lines.push('    actual: \'undefined\',');
        lines.push('  });');
        lines.push('}');
        lines.push('');
      }

      // Type-specific validation
      lines.push(`// Validate field type: ${field.name}`);
      lines.push(`if (message.${field.name} !== undefined && message.${field.name} !== null) {`);

      switch (field.type.kind) {
        case 'string':
          lines.push(`  if (typeof message.${field.name} !== 'string') {`);
          lines.push('    errors.push({');
          lines.push(`      field: '${field.name}',`);
          lines.push(`      message: 'Field "${field.name}" must be a string',`);
          lines.push(`      expected: 'string',`);
          lines.push(`      actual: typeof message.${field.name},`);
          lines.push('    });');
          lines.push('  }');

          // String length validation
          if (field.validation?.maxLength !== undefined) {
            lines.push(`  if (typeof message.${field.name} === 'string' && message.${field.name}.length > ${field.validation.maxLength}) {`);
            lines.push('    errors.push({');
            lines.push(`      field: '${field.name}',`);
            lines.push(`      message: 'Field "${field.name}" exceeds maximum length of ${field.validation.maxLength}',`);
            lines.push(`      expected: 'length <= ${field.validation.maxLength}',`);
            lines.push(`      actual: \`length = \${message.${field.name}.length}\`,`);
            lines.push('    });');
            lines.push('  }');
          }

          if (field.validation?.minLength !== undefined) {
            lines.push(`  if (typeof message.${field.name} === 'string' && message.${field.name}.length < ${field.validation.minLength}) {`);
            lines.push('    errors.push({');
            lines.push(`      field: '${field.name}',`);
            lines.push(`      message: 'Field "${field.name}" is below minimum length of ${field.validation.minLength}',`);
            lines.push(`      expected: 'length >= ${field.validation.minLength}',`);
            lines.push(`      actual: \`length = \${message.${field.name}.length}\`,`);
            lines.push('    });');
            lines.push('  }');
          }

          // Pattern validation
          if (field.validation?.pattern) {
            lines.push(`  if (typeof message.${field.name} === 'string') {`);
            lines.push(`    const pattern = new RegExp(${JSON.stringify(field.validation.pattern)});`);
            lines.push(`    if (!pattern.test(message.${field.name})) {`);
            lines.push('      errors.push({');
            lines.push(`        field: '${field.name}',`);
            lines.push(`        message: 'Field "${field.name}" does not match pattern ${field.validation.pattern}',`);
            lines.push(`        expected: 'pattern: ${field.validation.pattern}',`);
            lines.push(`        actual: message.${field.name},`);
            lines.push('      });');
            lines.push('    }');
            lines.push('  }');
          }
          break;

        case 'number':
          lines.push(`  if (typeof message.${field.name} !== 'number' || isNaN(message.${field.name})) {`);
          lines.push('    errors.push({');
          lines.push(`      field: '${field.name}',`);
          lines.push(`      message: 'Field "${field.name}" must be a valid number',`);
          lines.push(`      expected: 'number',`);
          lines.push(`      actual: typeof message.${field.name},`);
          lines.push('    });');
          lines.push('  }');

          // Number range validation
          if (field.validation?.min !== undefined) {
            lines.push(`  if (typeof message.${field.name} === 'number' && message.${field.name} < ${field.validation.min}) {`);
            lines.push('    errors.push({');
            lines.push(`      field: '${field.name}',`);
            lines.push(`      message: 'Field "${field.name}" is below minimum value of ${field.validation.min}',`);
            lines.push(`      expected: '>= ${field.validation.min}',`);
            lines.push(`      actual: String(message.${field.name}),`);
            lines.push('    });');
            lines.push('  }');
          }

          if (field.validation?.max !== undefined) {
            lines.push(`  if (typeof message.${field.name} === 'number' && message.${field.name} > ${field.validation.max}) {`);
            lines.push('    errors.push({');
            lines.push(`      field: '${field.name}',`);
            lines.push(`      message: 'Field "${field.name}" exceeds maximum value of ${field.validation.max}',`);
            lines.push(`      expected: '<= ${field.validation.max}',`);
            lines.push(`      actual: String(message.${field.name}),`);
            lines.push('    });');
            lines.push('  }');
          }
          break;

        case 'enum':
          const validValues = field.type.values;
          lines.push(`  const validValues = ${JSON.stringify(validValues)};`);
          lines.push(`  if (!validValues.includes(message.${field.name} as any)) {`);
          lines.push('    errors.push({');
          lines.push(`      field: '${field.name}',`);
          lines.push(`      message: 'Field "${field.name}" has invalid enum value',`);
          lines.push(`      expected: \`one of: \${validValues.join(', ')}\`,`);
          lines.push(`      actual: String(message.${field.name}),`);
          lines.push('    });');
          lines.push('  }');
          break;

        case 'boolean':
          lines.push(`  if (typeof message.${field.name} !== 'boolean') {`);
          lines.push('    errors.push({');
          lines.push(`      field: '${field.name}',`);
          lines.push(`      message: 'Field "${field.name}" must be a boolean',`);
          lines.push(`      expected: 'boolean',`);
          lines.push(`      actual: typeof message.${field.name},`);
          lines.push('    });');
          lines.push('  }');
          break;

        case 'bytes':
          lines.push(`  if (!Buffer.isBuffer(message.${field.name})) {`);
          lines.push('    errors.push({');
          lines.push(`      field: '${field.name}',`);
          lines.push(`      message: 'Field "${field.name}" must be a Buffer',`);
          lines.push(`      expected: 'Buffer',`);
          lines.push(`      actual: typeof message.${field.name},`);
          lines.push('    });');
          lines.push('  }');

          // Bytes length validation
          if (field.type.length !== undefined) {
            lines.push(`  if (Buffer.isBuffer(message.${field.name}) && message.${field.name}.length !== ${field.type.length}) {`);
            lines.push('    errors.push({');
            lines.push(`      field: '${field.name}',`);
            lines.push(`      message: 'Field "${field.name}" must be exactly ${field.type.length} bytes',`);
            lines.push(`      expected: 'length = ${field.type.length}',`);
            lines.push(`      actual: \`length = \${message.${field.name}.length}\`,`);
            lines.push('    });');
            lines.push('  }');
          }
          break;
      }

      lines.push('}');
      lines.push('');
    }

    return lines.join('\n    ');
  }

  /**
   * Generate the serialize implementation based on strategy
   */
  private generateSerializeImplementation(strategy: SerializationStrategy): string {
    switch (strategy.approach) {
      case 'simple':
        return this.generateSimpleSerialize(strategy);
      case 'delimiter-based':
        return this.generateDelimiterBasedSerialize(strategy);
      case 'format-string':
        return this.generateFormatStringSerialize(strategy);
      default:
        return 'throw new Error("Unknown serialization approach");';
    }
  }

  /**
   * Generate simple serialization (fixed string output)
   */
  private generateSimpleSerialize(strategy: SerializationStrategy): string {
    const { parsedFormat } = strategy;
    const lines: string[] = [];

    // If no placeholders, just output the fixed string
    if (!parsedFormat.hasPlaceholders) {
      const fixedString = parsedFormat.fixedParts[0] || '';
      lines.push(`const data = Buffer.from(${JSON.stringify(fixedString)}, 'utf-8');`);
      lines.push('');
      lines.push('return {');
      lines.push('  success: true,');
      lines.push('  data,');
      lines.push('};');
    } else {
      // Has placeholders - use format string approach
      return this.generateFormatStringSerialize(strategy);
    }

    return lines.join('\n    ');
  }

  /**
   * Generate delimiter-based serialization
   */
  private generateDelimiterBasedSerialize(strategy: SerializationStrategy): string {
    const { messageType, parsedFormat } = strategy;
    const lines: string[] = [];

    lines.push('const parts: string[] = [];');
    lines.push('');

    // Serialize each field
    for (const placeholder of parsedFormat.placeholders) {
      const field = messageType.fields.find(f => f.name === placeholder.fieldName);

      if (field) {
        lines.push(`// Serialize field: ${field.name}`);
        const fieldSerialization = this.generateFieldSerialization(field);
        lines.push(fieldSerialization);
        lines.push('');
      }
    }

    // Join with delimiter
    const delimiter = messageType.delimiter || '\\t';
    lines.push(`const line = parts.join(${JSON.stringify(delimiter)});`);

    // Add terminator if specified
    if (messageType.terminator) {
      lines.push(`const terminator = ${JSON.stringify(messageType.terminator)};`);
      lines.push('const data = Buffer.from(line + terminator, \'utf-8\');');
    } else {
      lines.push('const data = Buffer.from(line, \'utf-8\');');
    }

    lines.push('');
    lines.push('return {');
    lines.push('  success: true,');
    lines.push('  data,');
    lines.push('};');

    return lines.join('\n    ');
  }

  /**
   * Generate format string-based serialization
   */
  private generateFormatStringSerialize(strategy: SerializationStrategy): string {
    const { messageType } = strategy;
    const lines: string[] = [];

    // We will build an array of Buffers/strings and concat them at the end
    lines.push('const parts: (string | Buffer)[] = [];');
    lines.push('');

    // Use EnhancedFormatParser to get correct token sequence
    const parser = new EnhancedFormatParser();
    const parsed = parser.parse(messageType.format);

    // Iterate through tokens to build serialization in correct order
    for (const token of parsed.tokens) {
      if (!token) continue;

      switch (token.type) {
        case 'fixed':
          // Append fixed string
          lines.push(`parts.push(Buffer.from(${JSON.stringify(token.value)}, 'utf-8'));`);
          break;

        case 'field':
          // Append field value
          const field = messageType.fields.find((f: any) => f.name === token.fieldName);
          if (field) {
            lines.push(`// Add field: ${field.name}`);

            const fieldType = field.type.kind || field.type;

            // BINARY HANDLING
            if (['u8', 'byte', 'i8', 'u16', 'i16', 'u32', 'i32', 'f32', 'float', 'f64', 'double'].includes(fieldType)) {
              if (fieldType === 'u8' || fieldType === 'byte') {
                lines.push(`const buf_${field.name} = Buffer.alloc(1);`);
                lines.push(`buf_${field.name}.writeUInt8(message.${field.name}, 0);`);
                lines.push(`parts.push(buf_${field.name});`);
              } else if (fieldType === 'i8') {
                lines.push(`const buf_${field.name} = Buffer.alloc(1);`);
                lines.push(`buf_${field.name}.writeInt8(message.${field.name}, 0);`);
                lines.push(`parts.push(buf_${field.name});`);
              } else if (fieldType === 'u16') {
                lines.push(`const buf_${field.name} = Buffer.alloc(2);`);
                lines.push(`buf_${field.name}.writeUInt16BE(message.${field.name}, 0);`);
                lines.push(`parts.push(buf_${field.name});`);
              } else if (fieldType === 'i16') {
                lines.push(`const buf_${field.name} = Buffer.alloc(2);`);
                lines.push(`buf_${field.name}.writeInt16BE(message.${field.name}, 0);`);
                lines.push(`parts.push(buf_${field.name});`);
              } else if (fieldType === 'u32') {
                lines.push(`const buf_${field.name} = Buffer.alloc(4);`);
                lines.push(`buf_${field.name}.writeUInt32BE(message.${field.name}, 0);`);
                lines.push(`parts.push(buf_${field.name});`);
              } else if (fieldType === 'i32') {
                lines.push(`const buf_${field.name} = Buffer.alloc(4);`);
                lines.push(`buf_${field.name}.writeInt32BE(message.${field.name}, 0);`);
                lines.push(`parts.push(buf_${field.name});`);
              } else if (fieldType === 'f32' || fieldType === 'float') {
                lines.push(`const buf_${field.name} = Buffer.alloc(4);`);
                lines.push(`buf_${field.name}.writeFloatBE(message.${field.name}, 0);`);
                lines.push(`parts.push(buf_${field.name});`);
              } else if (fieldType === 'f64' || fieldType === 'double') {
                lines.push(`const buf_${field.name} = Buffer.alloc(8);`);
                lines.push(`buf_${field.name}.writeDoubleBE(message.${field.name}, 0);`);
                lines.push(`parts.push(buf_${field.name});`);
              }
            } else {
              // TEXT HANDLING
              const fieldFormatting = this.generateFieldFormatting(field);
              lines.push(fieldFormatting);
            }
          }
          break;

        case 'optional':
          // Handle optional fields
          const optField = messageType.fields.find((f: any) => f.name === token.fieldName);
          if (optField) {
            lines.push(`// Add optional field: ${optField.name}`);
            lines.push(`if (message.${optField.name} !== undefined) {`);
            if (token.optionalPrefix) {
              lines.push(`  parts.push(Buffer.from(${JSON.stringify(token.optionalPrefix)}, 'utf-8'));`);
            }

            // For optional fields, we default to string serialization for now unless we want to duplicate the binary logic
            // Assuming optional fields in mixed protocols are usually text-based or handled simply
            lines.push(`  parts.push(Buffer.from(String(message.${optField.name}), 'utf-8'));`);

            if (token.optionalSuffix) {
              lines.push(`  parts.push(Buffer.from(${JSON.stringify(token.optionalSuffix)}, 'utf-8'));`);
            }
            lines.push(`}`);
          }
          break;
      }
    }

    lines.push('');
    // Helper to concat string|Buffer
    lines.push(`
    const buffers = parts.map(p => Buffer.isBuffer(p) ? p : Buffer.from(p, 'utf-8'));
    const data = Buffer.concat(buffers);
    `);
    lines.push('');
    lines.push('return {');
    lines.push('  success: true,');
    lines.push('  data,');
    lines.push('};');

    return lines.join('\n    ');
  }


  /**
   * Generate field serialization code (for delimiter-based)
   */
  private generateFieldSerialization(field: FieldDefinition): string {
    const lines: string[] = [];

    switch (field.type.kind) {
      case 'string':
        lines.push(`parts.push(message.${field.name} || '');`);
        break;

      case 'number':
        lines.push(`parts.push(String(message.${field.name}));`);
        break;

      case 'enum':
        lines.push(`parts.push(String(message.${field.name}));`);
        break;

      case 'boolean':
        lines.push(`parts.push(message.${field.name} ? 'true' : 'false');`);
        break;

      case 'bytes':
        lines.push(`parts.push(message.${field.name}.toString('utf-8'));`);
        break;
    }

    return lines.join('\n    ');
  }

  /**
   * Generate field formatting code (for format string-based)
   */
  private generateFieldFormatting(field: FieldDefinition): string {
    const lines: string[] = [];

    switch (field.type.kind) {
      case 'string':
        lines.push(`parts.push(message.${field.name} || '');`);
        break;

      case 'number':
        lines.push(`parts.push(String(message.${field.name}));`);
        break;

      case 'enum':
        lines.push(`parts.push(String(message.${field.name}));`);
        break;

      case 'boolean':
        lines.push(`parts.push(message.${field.name} ? 'true' : 'false');`);
        break;

      case 'bytes':
        // For bytes in a format string, we assume we want the raw bytes
        lines.push(`parts.push(message.${field.name});`);
        break;

      default:
        // Fallback for unknown types - try to convert to string
        lines.push(`parts.push(String(message.${field.name}));`);
        break;
    }

    return lines.join('\n    ');
  }

  /**
   * Generate main serializer class
   */
  private generateMainSerializer(spec: ProtocolSpec, _strategies: Map<string, SerializationStrategy>): string {
    const lines: string[] = [];

    lines.push(`/**
 * Main serializer for ${spec.protocol.name} protocol
 * Provides access to all message type serializers
 */
export class ${toPascalCase(spec.protocol.name)}Serializer {`);

    // Generate serializer instances for each message type
    for (const messageType of spec.messageTypes) {
      lines.push(`  /** Serializer for ${messageType.name} messages */`);
      lines.push(`  public ${messageType.name.toLowerCase()}: ${messageType.name}Serializer;`);
    }

    lines.push('');
    lines.push('  constructor() {');
    for (const messageType of spec.messageTypes) {
      lines.push(`    this.${messageType.name.toLowerCase()} = new ${messageType.name}Serializer();`);
    }
    lines.push('  }');

    lines.push('}');

    return lines.join('\n');
  }
}
