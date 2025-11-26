/**
 * Parser Generator
 * Generates TypeScript parser code from protocol specifications
 * 
 * This module implements the parser generation strategy:
 * 1. Analyze format strings to determine parsing approach
 * 2. Generate state machine for complex formats
 * 3. Handle delimiters and field extraction
 * 4. Generate error reporting with byte offsets
 */

import type { ProtocolSpec, MessageType, FieldType } from '../types/protocol-spec.js';
import { FormatParser, type ParsedFormat } from '../core/format-parser.js';
import { StateMachineParserGenerator } from './state-machine-parser-generator.js';

/**
 * Parsing strategy for a message type
 */
export interface ParsingStrategy {
  /** Message type being parsed */
  messageType: MessageType;
  /** Parsed format information */
  parsedFormat: ParsedFormat;
  /** Whether the format has fixed strings */
  hasFixedStrings: boolean;
  /** Whether the format uses delimiters */
  usesDelimiters: boolean;
  /** Parsing approach to use */
  approach: 'simple' | 'delimiter-based' | 'state-machine';
  /** Field extraction order */
  fieldOrder: string[];
}

/**
 * Parser generation strategy analyzer
 */
export class ParserGenerationStrategy {
  private formatParser: FormatParser;

  constructor() {
    this.formatParser = new FormatParser();
  }

  /**
   * Analyze a message type and determine the parsing strategy
   * @param messageType - Message type to analyze
   * @returns Parsing strategy for the message type
   */
  analyzeMessageType(messageType: MessageType): ParsingStrategy {
    const parsedFormat = this.formatParser.parse(messageType.format);

    // Determine if format has fixed strings (including terminator)
    const hasFixedStrings = parsedFormat.fixedParts.some(part => part.length > 0) ||
      (messageType.terminator !== undefined && messageType.terminator.length > 0);

    // Determine if format uses delimiters
    const usesDelimiters = messageType.delimiter !== undefined;

    // Determine parsing approach
    let approach: ParsingStrategy['approach'];

    if (!parsedFormat.hasPlaceholders) {
      // No placeholders - just validate fixed string
      approach = 'simple';
    } else if (usesDelimiters) {
      // Has delimiters - use delimiter-based parsing
      approach = 'delimiter-based';
    } else if (hasFixedStrings) {
      // Has fixed strings (or terminator) but no delimiters - use state machine
      approach = 'state-machine';
    } else {
      // Only placeholders, no fixed strings or delimiters
      // This is ambiguous - need delimiters or fixed strings
      approach = 'simple';
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
   * @returns Map of message type names to parsing strategies
   */
  analyzeProtocol(spec: ProtocolSpec): Map<string, ParsingStrategy> {
    const strategies = new Map<string, ParsingStrategy>();

    for (const messageType of spec.messageTypes) {
      const strategy = this.analyzeMessageType(messageType);
      strategies.set(messageType.name, strategy);
    }

    return strategies;
  }

  /**
   * Generate state machine description for a message format
   * This is used for complex formats with fixed strings and placeholders
   * 
   * @param strategy - Parsing strategy
   * @returns State machine description
   */
  generateStateMachine(strategy: ParsingStrategy): StateMachine {
    const states: State[] = [];
    const { parsedFormat } = strategy;

    let stateId = 0;

    // Create states for each fixed part and placeholder
    for (let i = 0; i < parsedFormat.fixedParts.length; i++) {
      const fixedPart = parsedFormat.fixedParts[i];

      if (fixedPart && fixedPart.length > 0) {
        // State for matching fixed string
        states.push({
          id: stateId++,
          type: 'match-fixed',
          value: fixedPart,
          nextState: stateId,
        });
      }

      // Add placeholder state if there's a placeholder after this fixed part
      if (i < parsedFormat.placeholders.length) {
        const placeholder = parsedFormat.placeholders[i];
        if (!placeholder) continue;
        const field = strategy.messageType.fields.find(f => f.name === placeholder.fieldName);

        if (field) {
          states.push({
            id: stateId++,
            type: 'extract-field',
            fieldName: placeholder.fieldName,
            fieldType: field.type,
            nextState: i < parsedFormat.fixedParts.length - 1 ? stateId : -1, // -1 = final state
          });
        }
      }
    }

    return {
      states,
      initialState: 0,
      finalState: states.length > 0 ? (states[states.length - 1]?.id ?? 0) : 0,
    };
  }

  /**
   * Plan delimiter handling for a message type
   * @param strategy - Parsing strategy
   * @returns Delimiter handling plan
   */
  planDelimiterHandling(strategy: ParsingStrategy): DelimiterPlan {
    const { messageType, parsedFormat } = strategy;

    if (!messageType.delimiter) {
      return {
        hasDelimiter: false,
        delimiter: '',
        fieldCount: parsedFormat.placeholders.length,
        splitStrategy: 'none',
      };
    }

    // Determine split strategy based on delimiter
    let splitStrategy: DelimiterPlan['splitStrategy'];

    if (messageType.delimiter === '\t') {
      splitStrategy = 'tab';
    } else if (messageType.delimiter === ' ') {
      splitStrategy = 'space';
    } else if (messageType.delimiter.length === 1) {
      splitStrategy = 'single-char';
    } else {
      splitStrategy = 'multi-char';
    }

    return {
      hasDelimiter: true,
      delimiter: messageType.delimiter,
      fieldCount: parsedFormat.placeholders.length,
      splitStrategy,
    };
  }

  /**
   * Plan field extraction for a message type
   * @param strategy - Parsing strategy
   * @returns Field extraction plan
   */
  planFieldExtraction(strategy: ParsingStrategy): FieldExtractionPlan[] {
    const plans: FieldExtractionPlan[] = [];

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
        extractionMethod: this.determineExtractionMethod(field.type),
        conversionMethod: this.determineConversionMethod(field.type),
      });
    }

    return plans;
  }

  /**
   * Determine extraction method for a field type
   */
  private determineExtractionMethod(fieldType: FieldType): string {
    switch (fieldType.kind) {
      case 'string':
        return 'extract-string';
      case 'number':
        return 'extract-number';
      case 'enum':
        return 'extract-enum';
      case 'bytes':
        return 'extract-bytes';
      case 'boolean':
        return 'extract-boolean';
      default:
        return 'extract-string';
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
        return 'toNumber';
      case 'enum':
        return 'toEnum';
      case 'bytes':
        return 'toBytes';
      case 'boolean':
        return 'toBoolean';
      default:
        return 'toString';
    }
  }

  /**
   * Design error reporting strategy
   * @param _strategy - Parsing strategy
   * @returns Error reporting plan
   */
  designErrorReporting(_strategy: ParsingStrategy): ErrorReportingPlan {
    return {
      includeByteOffset: true,
      includeExpectedFormat: true,
      includeActualData: true,
      includeFieldContext: true,
      maxActualDataLength: 50, // Truncate long data in error messages
    };
  }
}

/**
 * State machine for parsing
 */
export interface StateMachine {
  states: State[];
  initialState: number;
  finalState: number;
}

/**
 * State in the parsing state machine
 */
export interface State {
  id: number;
  type: 'match-fixed' | 'extract-field';
  value?: string; // For match-fixed states
  fieldName?: string; // For extract-field states
  fieldType?: FieldType; // For extract-field states
  nextState: number; // -1 for final state
}

/**
 * Delimiter handling plan
 */
export interface DelimiterPlan {
  hasDelimiter: boolean;
  delimiter: string;
  fieldCount: number;
  splitStrategy: 'none' | 'tab' | 'space' | 'single-char' | 'multi-char';
}

/**
 * Field extraction plan
 */
export interface FieldExtractionPlan {
  fieldName: string;
  fieldType: FieldType;
  required: boolean;
  validation?: any;
  extractionMethod: string;
  conversionMethod: string;
}

/**
 * Error reporting plan
 */
export interface ErrorReportingPlan {
  includeByteOffset: boolean;
  includeExpectedFormat: boolean;
  includeActualData: boolean;
  includeFieldContext: boolean;
  maxActualDataLength: number;
}

/**
 * Parser Generator
 * Generates parser code from protocol specifications
 */
export class ParserGenerator {
  private strategy: ParserGenerationStrategy;
  private stateMachineGenerator: StateMachineParserGenerator;

  constructor() {
    this.strategy = new ParserGenerationStrategy();
    this.stateMachineGenerator = new StateMachineParserGenerator();
  }

  /**
   * Generate parser code for a protocol specification
   * @param spec - Protocol specification
   * @returns Generated TypeScript parser code
   */
  generate(spec: ProtocolSpec): string {
    const strategies = this.strategy.analyzeProtocol(spec);

    // Generate imports
    const imports = this.generateImports(spec);

    // Generate type definitions
    const types = this.generateTypes(spec);

    // Generate parser class for each message type
    const parsers = Array.from(strategies.values())
      .map(strategy => this.generateParserForMessageType(strategy))
      .join('\n\n');

    // Generate main parser class that combines all message parsers
    const mainParser = this.generateMainParser(spec, strategies);

    return `${imports}\n\n${types}\n\n${parsers}\n\n${mainParser}`;
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
 * Regenerate using: protocol-resurrection-machine generate ${spec.protocol.name.toLowerCase()}.yaml
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

      for (const field of messageType.fields) {
        const optional = !field.required ? '?' : '';
        const tsType = this.fieldTypeToTypeScript(field.type);
        lines.push(`  /** ${field.name} field */`);
        lines.push(`  ${field.name}${optional}: ${tsType};`);
      }

      lines.push('}');
    }

    // Generate enum types if defined
    if (spec.types) {
      for (const typeDef of spec.types) {
        if (typeDef.kind === 'enum' && typeDef.values) {
          lines.push('');
          lines.push(`/**
 * ${typeDef.name} enumeration
 */`);
          lines.push(`export enum ${typeDef.name} {`);

          for (const enumValue of typeDef.values) {
            const desc = enumValue.description ? ` // ${enumValue.description}` : '';
            lines.push(`  ${enumValue.name} = ${JSON.stringify(enumValue.value)},${desc}`);
          }

          lines.push('}');
        }
      }
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



  // Old parsing methods removed - now using StateMachineParserGenerator

  /**
   * Generate field conversion code
   */
  // Old parsing methods removed - now using StateMachineParserGenerator

  /**
   * Generate parser for a specific message type
   * Now uses the state machine parser generator for all message types
   */
  private generateParserForMessageType(strategy: ParsingStrategy): string {
    const { messageType } = strategy;

    // Use the state machine parser generator for all parsers
    return this.stateMachineGenerator.generateParser(messageType, {
      includeComments: true,
      maxErrorDataLength: 50,
    });
  }

  /**
   * Generate main parser class
   */
  private generateMainParser(spec: ProtocolSpec, _strategies: Map<string, ParsingStrategy>): string {
    const lines: string[] = [];

    lines.push(`/**
 * Main parser for ${spec.protocol.name} protocol
 * Provides access to all message type parsers
 */
export class ${spec.protocol.name}Parser {`);

    // Generate parser instances for each message type
    for (const messageType of spec.messageTypes) {
      lines.push(`  /** Parser for ${messageType.name} messages */`);
      lines.push(`  public ${messageType.name.toLowerCase()}: ${messageType.name}Parser;`);
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
