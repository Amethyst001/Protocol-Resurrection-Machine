/**
 * Format String Analyzer
 * 
 * Analyzes format strings and generates state machine representations for parsing.
 * Handles fixed strings, placeholders, delimiters, and optional fields.
 */

import { EnhancedFormatParser, type EnhancedParsedFormat } from './enhanced-format-parser.js';
import {
  StateMachineBuilder,
  StateType,
  StateActionType,
  createState,
  createTransition,
} from './state-machine.js';
import type { StateMachine, TransitionCondition } from './state-machine.js';
import type { MessageType, FieldDefinition } from '../types/protocol-spec.js';

/**
 * Analysis result for a format string
 */
export interface FormatAnalysis {
  /** Parsed format information */
  parsedFormat: EnhancedParsedFormat;

  /** Whether format contains fixed strings */
  hasFixedStrings: boolean;

  /** Whether format uses delimiters */
  hasDelimiters: boolean;

  /** Whether format has optional fields */
  hasOptionalFields: boolean;

  /** Field extraction order */
  fieldOrder: string[];

  /** Detected ambiguities in the format */
  ambiguities: string[];

  /** Complexity score (higher = more complex) */
  complexity: number;
}

/**
 * Format String Analyzer
 * Converts format strings into state machine representations
 */
export class FormatAnalyzer {
  private formatParser: EnhancedFormatParser;

  constructor() {
    this.formatParser = new EnhancedFormatParser();
  }

  /**
   * Analyze a format string
   * @param format - Format string to analyze
   * @param messageType - Message type definition
   * @returns Analysis result
   */
  analyze(format: string, messageType: MessageType): FormatAnalysis {
    const parsedFormat = this.formatParser.parse(format);

    // Check for fixed strings
    const hasFixedStrings = parsedFormat.tokens.some(t => t.type === 'fixed');

    // Check for delimiters (explicit or implicit in fixed strings)
    const hasDelimiters = messageType.delimiter !== undefined ||
      parsedFormat.tokens.some(t => t.type === 'fixed' && t.value.includes('|'));

    // Check for optional fields
    const hasOptionalFields = parsedFormat.hasOptionalSections;

    // Extract field order
    const fieldOrder = parsedFormat.fieldNames;

    // Detect ambiguities
    const ambiguities = this.detectAmbiguities(parsedFormat);

    // Calculate complexity
    const complexity = this.calculateComplexity(parsedFormat, messageType);

    return {
      parsedFormat,
      hasFixedStrings,
      hasDelimiters,
      hasOptionalFields,
      fieldOrder,
      ambiguities,
      complexity,
    };
  }

  /**
   * Generate a state machine from a format string
   * @param messageType - Message type definition
   * @returns State machine for parsing this message type
   */
  generateStateMachine(messageType: MessageType): StateMachine {
    const analysis = this.analyze(messageType.format, messageType);
    const builder = new StateMachineBuilder();

    builder
      .setMessageTypeName(messageType.name)
      .setFormatString(messageType.format);

    // Create initial state
    const initState = createState('init', StateType.INIT, 'Initial State');
    builder.addState(initState);
    builder.setInitialState('init');

    // Create accept state
    const acceptState = createState('accept', StateType.ACCEPT, 'Accept State', {
      isTerminal: true,
    });
    builder.addState(acceptState);

    // Create error state
    const errorState = createState('error', StateType.ERROR, 'Error State', {
      isTerminal: true,
      errorMessage: 'Parse error',
    });
    builder.addState(errorState);

    // Generate states based on tokens
    let currentStateId = 'init';
    let stateCounter = 0;

    const { parsedFormat } = analysis;

    for (let i = 0; i < parsedFormat.tokens.length; i++) {
      const token = parsedFormat.tokens[i];

      if (!token) continue;

      switch (token.type) {
        case 'fixed': {
          const stateId = `fixed_${stateCounter++}`;
          const state = createState(stateId, StateType.EXPECT_FIXED, `Expect Fixed: "${token.value}"`, {
            action: {
              type: StateActionType.VALIDATE,
              expected: token.value,
            },
          });
          builder.addState(state);

          builder.addTransition(createTransition(
            currentStateId,
            stateId,
            { type: 'always' },
            { priority: 10 }
          ));

          currentStateId = stateId;
          break;
        }

        case 'field': {
          // Find explicit field definition, or auto-create one
          let field = messageType.fields.find(f => f.name === token.fieldName);
          if (!field) {
            // Auto-create field definition from format token
            // This ensures EXTRACT states are generated for ALL fields in format
            field = {
              name: token.fieldName!,
              type: { kind: 'string' },
              required: token.required,
              description: `Auto-discovered from format string`
            } as FieldDefinition;
          }

          const stateId = `extract_${stateCounter++}`;
          const state = createState(stateId, StateType.EXTRACT_FIELD, `Extract Field: ${field.name}`, {
            action: {
              type: StateActionType.EXTRACT,
              target: field.name,
              converter: this.getConverterForType(field),
            },
            metadata: {
              fieldName: field.name,
              fieldType: field.type.kind,
            },
          });
          builder.addState(state);

          builder.addTransition(createTransition(
            currentStateId,
            stateId,
            { type: 'always' },
            { priority: 10 }
          ));

          currentStateId = stateId;
          break;
        }

        case 'optional': {
          // Find explicit field definition, or auto-create one
          let field = messageType.fields.find(f => f.name === token.fieldName);
          if (!field) {
            // Auto-create field definition from format token
            field = {
              name: token.fieldName!,
              type: { kind: 'string' },
              required: false, // Optional fields are never required
              description: `Auto-discovered from format string (optional section)`
            } as FieldDefinition;
          }

          const stateId = `optional_${stateCounter++}`;
          const state = createState(stateId, StateType.OPTIONAL_FIELD, `Optional Field: ${field.name}`, {
            action: {
              type: StateActionType.EXTRACT,
              target: field.name,
              converter: this.getConverterForType(field),
            },
            metadata: {
              fieldName: field.name,
              fieldType: field.type.kind,
              optionalPrefix: token.optionalPrefix,
              optionalSuffix: token.optionalSuffix,
            },
          });
          builder.addState(state);

          builder.addTransition(createTransition(
            currentStateId,
            stateId,
            { type: 'on-optional' },
            { priority: 5 }
          ));

          currentStateId = stateId;
          break;
        }
      }
    }

    // Add transition from final state to accept state
    builder.addTransition(createTransition(
      currentStateId,
      'accept',
      { type: 'always' },
      { priority: 10 }
    ));

    return builder.build();
  }

  /**
   * Detect ambiguities in the format string
   */
  private detectAmbiguities(parsedFormat: EnhancedParsedFormat): string[] {
    const ambiguities: string[] = [];

    for (let i = 0; i < parsedFormat.tokens.length - 1; i++) {
      const token = parsedFormat.tokens[i];
      const nextToken = parsedFormat.tokens[i + 1];

      if (!token) continue;

      // Adjacent fields without delimiter
      if (token.type === 'field' && nextToken?.type === 'field') {
        ambiguities.push(
          `Ambiguous: Adjacent fields {${token.fieldName}} and {${nextToken.fieldName}} without delimiter`
        );
      }
    }

    return ambiguities;
  }

  /**
   * Calculate complexity score for a format
   */
  private calculateComplexity(parsedFormat: EnhancedParsedFormat, messageType: MessageType): number {
    let complexity = 0;

    complexity += parsedFormat.tokens.length;
    complexity += parsedFormat.hasOptionalSections ? 5 : 0;

    // Add complexity for field validations
    for (const field of messageType.fields) {
      if (field.validation) {
        complexity += 1;
      }
    }

    return complexity;
  }

  /**
   * Get converter function name for a field type
   */
  private getConverterForType(field: FieldDefinition): string {
    switch (field.type.kind) {
      case 'string':
        return 'toString';
      case 'number':
        return 'toNumber';
      case 'boolean':
        return 'toBoolean';
      case 'enum':
        return 'toEnum';
      case 'bytes':
        return 'toBytes';
      default:
        return 'toString';
    }
  }

  /**
   * Generate a state transition graph visualization (DOT format)
   */
  generateTransitionGraph(stateMachine: StateMachine): string {
    const lines: string[] = [];

    lines.push('digraph StateMachine {');
    lines.push('  rankdir=LR;');
    lines.push('  node [shape=circle];');
    lines.push('');

    // Mark special states
    lines.push(`  ${stateMachine.initialState} [shape=doublecircle, label="INIT"];`);

    for (const acceptState of stateMachine.acceptStates) {
      lines.push(`  ${acceptState} [shape=doublecircle, label="ACCEPT", style=filled, fillcolor=lightgreen];`);
    }

    for (const errorState of stateMachine.errorStates) {
      lines.push(`  ${errorState} [shape=doublecircle, label="ERROR", style=filled, fillcolor=lightcoral];`);
    }

    lines.push('');

    // Add transitions
    for (const [stateId, state] of stateMachine.states) {
      for (const transition of state.transitions) {
        const label = this.getTransitionLabel(transition.condition);
        lines.push(`  ${stateId} -> ${transition.to} [label="${label}"];`);
      }
    }

    lines.push('}');

    return lines.join('\n');
  }

  /**
   * Get a human-readable label for a transition condition
   */
  private getTransitionLabel(condition: TransitionCondition): string {
    switch (condition.type) {
      case 'always':
        return 'ε'; // Epsilon transition
      case 'on-match':
        return `match: ${condition.matchValue}`;
      case 'on-delimiter':
        return 'delimiter';
      case 'on-length':
        return `length: ${condition.length}`;
      case 'on-optional':
        return 'optional';
      default:
        return 'unknown';
    }
  }
}
