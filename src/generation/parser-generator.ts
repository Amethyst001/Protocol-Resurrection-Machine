/**
 * Parser Generator
 * Generates TypeScript parser code from protocol specifications using state machine approach
 */

import type { ProtocolSpec } from '../types/protocol-spec.js';
import { StateMachineParserGenerator } from './state-machine-parser-generator.js';
import { toPascalCase, toKebabCase } from '../utils/string-utils.js';
import { FormatParser } from '../core/format-parser.js';

/**
 * Parser Generator
 * Generates parser code from protocol specifications
 */
export class ParserGenerator {
  private stateMachineGenerator: StateMachineParserGenerator;

  constructor() {
    this.stateMachineGenerator = new StateMachineParserGenerator();
  }

  /**
   * Generate parser code for a protocol specification
   * @param spec - Protocol specification
   * @returns Generated TypeScript parser code
   */
  generate(spec: ProtocolSpec): string {
    // CRITICAL FIX: Auto-populate fields from format strings
    this.ensureFieldsPopulated(spec);

    // Generate imports
    const imports = this.generateImports(spec);

    // Generate type definitions
    const types = this.generateTypes(spec);

    // Generate parser class for each message type using state machine approach
    const parsers = spec.messageTypes
      .map(messageType => this.stateMachineGenerator.generateParser(messageType, {
        includeComments: true,
        maxErrorDataLength: 50,
      }))
      .join('\n\n');

    // Generate main parser class that combines all message parsers
    const mainParser = this.generateMainParser(spec);

    return `${imports}\n\n${types}\n\n${parsers}\n\n${mainParser}`;
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
 * Generated Parser for ${spec.protocol.name} Protocol
 * RFC: ${spec.protocol.rfc || 'N/A'}
 * Port: ${spec.protocol.port}
 * 
 * This file is auto-generated. Do not edit manually.
 * Regenerate using: protocol-resurrection-machine generate ${toKebabCase(spec.protocol.name)}.yaml
 */

import { Readable } from 'stream';`;
  }

  /**
   * Generate type definitions
   */
  private generateTypes(spec: ProtocolSpec): string {
    const lines: string[] = [];

    // Generate ParseResult interface
    lines.push(`/**
 * Result of a parse operation
 */
export interface ParseResult<T> {
  /** Whether parsing succeeded */
  success: boolean;
  /** Parsed message (if successful) */
  message?: T;
  /** Parse error (if failed) */
  error?: ParseError;
  /** Number of bytes consumed from input */
  bytesConsumed: number;
}

/**
 * Parse error with detailed information
 */
export interface ParseError {
  /** Error message */
  message: string;
  /** Byte offset where error occurred */
  offset: number;
  /** Expected format or value */
  expected: string;
  /** Actual data encountered */
  actual: string;
  /** Field context (if applicable) */
  fieldName?: string;
}`);

    // Generate message type interfaces
    for (const messageType of spec.messageTypes) {
      lines.push('');
      lines.push(`/**
 * ${messageType.name} message
 * Direction: ${messageType.direction}
 * Format: ${messageType.format}
 */`);
      lines.push(`export interface ${messageType.name} {`);

      for (let i = 0; i < messageType.fields.length; i++) {
        const field = messageType.fields[i];
        if (!field) continue;
        const optional = !field.required ? '?' : '';
        const tsType = this.fieldTypeToTypeScript(field.type);
        lines.push(`  /** ${field.name} field */`);
        lines.push(`  ${field.name}${optional}: ${tsType};`);

        // Add blank line between fields for readability
        if (i < messageType.fields.length - 1) {
          lines.push('');
        }
      }

      lines.push('}');
    }

    return lines.join('\n');
  }

  /**
   * Convert FieldType to TypeScript type string
   */
  private fieldTypeToTypeScript(fieldType: any): string {
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
        return fieldType.values.map((v: any) => JSON.stringify(v)).join(' | ');
      default:
        return 'any';
    }
  }

  /**
   * Generate main parser class
   */
  private generateMainParser(spec: ProtocolSpec): string {
    const lines: string[] = [];

    lines.push(`/**
 * Main parser for ${spec.protocol.name} protocol
 * Provides access to all message type parsers
 */
export class ${toPascalCase(spec.protocol.name)}Parser {`);

    // Generate parser instances for each message type
    for (let i = 0; i < spec.messageTypes.length; i++) {
      const messageType = spec.messageTypes[i];
      if (!messageType) continue;
      lines.push(`  /** Parser for ${messageType.name} messages */`);
      lines.push(`  public ${messageType.name.toLowerCase()}: ${messageType.name}Parser;`);

      // Add blank line between declarations
      if (i < spec.messageTypes.length - 1) {
        lines.push('');
      }
    }

    lines.push('');
    lines.push('  constructor() {');
    for (const messageType of spec.messageTypes) {
      lines.push(`    this.${messageType.name.toLowerCase()} = new ${messageType.name}Parser();`);
    }
    lines.push('  }');

    lines.push('}');

    return lines.join('\n');
  }
}
