/**
 * Error Formatting Utilities
 * Provides comprehensive error reporting with file locations, line numbers, and suggested fixes
 */

import chalk from 'chalk';
import type {
  ValidationError,
  ParseError,
  SerializeError,
} from '../types/results.js';
import {
  PRMError,
  YAMLParseError,
  ValidationError as ValidationErrorClass,
  GenerationError,
  ProtocolParseError,
  ProtocolSerializeError,
  NetworkError,
} from '../types/errors.js';

/**
 * Format options for error display
 */
export interface ErrorFormatOptions {
  /** Use color coding (default: true) */
  useColor?: boolean;
  /** Include stack trace (default: false) */
  includeStack?: boolean;
  /** Include context information (default: true) */
  includeContext?: boolean;
  /** Include suggestions (default: true) */
  includeSuggestions?: boolean;
}

/**
 * Error formatter for comprehensive error reporting
 */
export class ErrorFormatter {
  private options: Required<ErrorFormatOptions>;

  constructor(options: ErrorFormatOptions = {}) {
    this.options = {
      useColor: options.useColor ?? true,
      includeStack: options.includeStack ?? false,
      includeContext: options.includeContext ?? true,
      includeSuggestions: options.includeSuggestions ?? true,
    };
  }

  /**
   * Format a validation error for display
   */
  formatValidationError(error: ValidationError, index?: number): string {
    const lines: string[] = [];
    const prefix = index !== undefined ? `${index + 1}. ` : '';

    // Error message
    const message = this.color(
      `${prefix}${error.message}`,
      'red',
      this.options.useColor
    );
    lines.push(message);

    // Location information
    if (error.line !== undefined || error.column !== undefined) {
      const location: string[] = [];
      if (error.line !== undefined) location.push(`line ${error.line}`);
      if (error.column !== undefined) location.push(`column ${error.column}`);
      lines.push(
        this.color(`   Location: ${location.join(', ')}`, 'gray', this.options.useColor)
      );
    }

    // Field path
    if (error.fieldPath && this.options.includeContext) {
      lines.push(
        this.color(`   Field: ${error.fieldPath}`, 'gray', this.options.useColor)
      );
    }

    // Expected vs Actual
    if (error.expected && this.options.includeContext) {
      lines.push(
        this.color(`   Expected: ${error.expected}`, 'gray', this.options.useColor)
      );
    }

    if (error.actual && this.options.includeContext) {
      lines.push(
        this.color(`   Actual: ${error.actual}`, 'gray', this.options.useColor)
      );
    }

    // Suggestion
    if (error.suggestion && this.options.includeSuggestions) {
      lines.push(
        this.color(`   💡 Suggestion: ${error.suggestion}`, 'yellow', this.options.useColor)
      );
    }

    return lines.join('\n');
  }

  /**
   * Format multiple validation errors
   */
  formatValidationErrors(errors: ValidationError[]): string {
    if (errors.length === 0) {
      return this.color('✓ No validation errors', 'green', this.options.useColor);
    }

    const lines: string[] = [];
    lines.push(
      this.color(
        `✗ Found ${errors.length} validation error${errors.length === 1 ? '' : 's'}:`,
        'red',
        this.options.useColor
      )
    );
    lines.push('');

    errors.forEach((error, index) => {
      lines.push(this.formatValidationError(error, index));
      if (index < errors.length - 1) {
        lines.push('');
      }
    });

    return lines.join('\n');
  }

  /**
   * Format a parse error for display
   */
  formatParseError(error: ParseError): string {
    const lines: string[] = [];

    // Error type and message
    lines.push(
      this.color('[PARSE_ERROR] Protocol Parse Error', 'red', this.options.useColor)
    );
    lines.push(this.color(`Message: ${error.message}`, 'red', this.options.useColor));

    // Byte offset
    if (this.options.includeContext) {
      lines.push(
        this.color(`Byte Offset: ${error.offset}`, 'gray', this.options.useColor)
      );
    }

    // Expected format
    if (error.expected && this.options.includeContext) {
      lines.push(
        this.color(`Expected: ${error.expected}`, 'gray', this.options.useColor)
      );
    }

    // Actual data
    if (error.actual && this.options.includeContext) {
      const actualDisplay =
        error.actual.length > 50
          ? error.actual.substring(0, 50) + '...'
          : error.actual;
      lines.push(
        this.color(`Actual: ${actualDisplay}`, 'gray', this.options.useColor)
      );
    }

    // Context
    if (error.context && this.options.includeContext) {
      lines.push(
        this.color(`Context: ${error.context}`, 'gray', this.options.useColor)
      );
    }

    // Suggestion
    if (this.options.includeSuggestions) {
      lines.push(
        this.color(
          '💡 Suggestion: Check that the input data matches the expected protocol format',
          'yellow',
          this.options.useColor
        )
      );
    }

    return lines.join('\n');
  }

  /**
   * Format a serialize error for display
   */
  formatSerializeError(error: SerializeError): string {
    const lines: string[] = [];

    // Error type and message
    lines.push(
      this.color('[SERIALIZE_ERROR] Protocol Serialize Error', 'red', this.options.useColor)
    );
    lines.push(this.color(`Message: ${error.message}`, 'red', this.options.useColor));

    // Field name
    if (error.fieldName && this.options.includeContext) {
      lines.push(
        this.color(`Field: ${error.fieldName}`, 'gray', this.options.useColor)
      );
    }

    // Expected format
    if (error.expected && this.options.includeContext) {
      lines.push(
        this.color(`Expected: ${error.expected}`, 'gray', this.options.useColor)
      );
    }

    // Actual value
    if (error.actual !== undefined && this.options.includeContext) {
      const actualDisplay =
        typeof error.actual === 'object'
          ? JSON.stringify(error.actual)
          : String(error.actual);
      lines.push(
        this.color(`Actual: ${actualDisplay}`, 'gray', this.options.useColor)
      );
    }

    // Constraint
    if (error.constraint && this.options.includeContext) {
      lines.push(
        this.color(`Constraint: ${error.constraint}`, 'gray', this.options.useColor)
      );
    }

    // Suggestion
    if (this.options.includeSuggestions) {
      lines.push(
        this.color(
          '💡 Suggestion: Ensure all required fields are present and have valid values',
          'yellow',
          this.options.useColor
        )
      );
    }

    return lines.join('\n');
  }

  /**
   * Format a PRM error (custom error classes) for display
   */
  formatPRMError(error: PRMError): string {
    const lines: string[] = [];

    // Error type and message
    lines.push(
      this.color(
        `[${error.type.toUpperCase()}] Error in ${this.getComponentName(error)}`,
        'red',
        this.options.useColor
      )
    );
    lines.push(this.color(`Message: ${error.message}`, 'red', this.options.useColor));

    // Type-specific information
    if (error instanceof YAMLParseError) {
      if (error.line !== undefined || error.column !== undefined) {
        const location: string[] = [];
        if (error.line !== undefined) location.push(`line ${error.line}`);
        if (error.column !== undefined) location.push(`column ${error.column}`);
        lines.push(
          this.color(`Location: ${location.join(', ')}`, 'gray', this.options.useColor)
        );
      }
    } else if (error instanceof ValidationErrorClass) {
      if (error.fieldPath) {
        lines.push(
          this.color(`Field: ${error.fieldPath}`, 'gray', this.options.useColor)
        );
      }
    } else if (error instanceof GenerationError) {
      if (error.phase) {
        lines.push(
          this.color(`Phase: ${error.phase}`, 'gray', this.options.useColor)
        );
      }
      if (error.artifact) {
        lines.push(
          this.color(`Artifact: ${error.artifact}`, 'gray', this.options.useColor)
        );
      }
    } else if (error instanceof ProtocolParseError) {
      lines.push(
        this.color(`Byte Offset: ${error.offset}`, 'gray', this.options.useColor)
      );
      lines.push(
        this.color(`Expected: ${error.expected}`, 'gray', this.options.useColor)
      );
      lines.push(
        this.color(`Actual: ${error.actual}`, 'gray', this.options.useColor)
      );
    } else if (error instanceof ProtocolSerializeError) {
      if (error.fieldName) {
        lines.push(
          this.color(`Field: ${error.fieldName}`, 'gray', this.options.useColor)
        );
      }
    } else if (error instanceof NetworkError) {
      if (error.operation) {
        lines.push(
          this.color(`Operation: ${error.operation}`, 'gray', this.options.useColor)
        );
      }
      if (error.connectionState) {
        lines.push(
          this.color(
            `Connection State: ${error.connectionState}`,
            'gray',
            this.options.useColor
          )
        );
      }
    }

    // Context information
    if (error.context && this.options.includeContext) {
      const contextEntries = Object.entries(error.context).filter(
        ([key]) => !['line', 'column', 'fieldPath', 'phase', 'artifact', 'offset', 'expected', 'actual', 'operation', 'connectionState'].includes(key)
      );
      if (contextEntries.length > 0) {
        lines.push(this.color('Context:', 'gray', this.options.useColor));
        contextEntries.forEach(([key, value]) => {
          lines.push(
            this.color(`  ${key}: ${JSON.stringify(value)}`, 'gray', this.options.useColor)
          );
        });
      }
    }

    // Suggestion
    if (this.options.includeSuggestions) {
      const suggestion = this.getSuggestionForError(error);
      if (suggestion) {
        lines.push(
          this.color(`💡 Suggestion: ${suggestion}`, 'yellow', this.options.useColor)
        );
      }
    }

    // Stack trace
    if (this.options.includeStack && error.stack) {
      lines.push('');
      lines.push(this.color('Stack Trace:', 'gray', this.options.useColor));
      lines.push(this.color(error.stack, 'gray', this.options.useColor));
    }

    return lines.join('\n');
  }

  /**
   * Format a generic error for display
   */
  formatError(error: Error | PRMError): string {
    if (error instanceof PRMError) {
      return this.formatPRMError(error);
    }

    const lines: string[] = [];
    lines.push(
      this.color('[ERROR] Unexpected Error', 'red', this.options.useColor)
    );
    lines.push(this.color(`Message: ${error.message}`, 'red', this.options.useColor));

    if (this.options.includeStack && error.stack) {
      lines.push('');
      lines.push(this.color('Stack Trace:', 'gray', this.options.useColor));
      lines.push(this.color(error.stack, 'gray', this.options.useColor));
    }

    return lines.join('\n');
  }

  /**
   * Get component name from error type
   */
  private getComponentName(error: PRMError): string {
    if (error instanceof YAMLParseError) return 'YAML Parser';
    if (error instanceof ValidationErrorClass) return 'Validator';
    if (error instanceof GenerationError) return 'Code Generator';
    if (error instanceof ProtocolParseError) return 'Protocol Parser';
    if (error instanceof ProtocolSerializeError) return 'Protocol Serializer';
    if (error instanceof NetworkError) return 'Network Client';
    return 'Unknown Component';
  }

  /**
   * Get suggestion for common error types
   */
  private getSuggestionForError(error: PRMError): string | undefined {
    if (error instanceof YAMLParseError) {
      return 'Check YAML syntax and ensure all required fields are present';
    }
    if (error instanceof ValidationErrorClass) {
      return 'Review the protocol specification schema and fix validation errors';
    }
    if (error instanceof GenerationError) {
      return 'Check the YAML specification and ensure all references are valid';
    }
    if (error instanceof ProtocolParseError) {
      return 'Verify that the input data matches the expected protocol format';
    }
    if (error instanceof ProtocolSerializeError) {
      return 'Ensure all required fields are present and have valid values';
    }
    if (error instanceof NetworkError) {
      return 'Check network connectivity and server availability';
    }
    return undefined;
  }

  /**
   * Apply color to text if color is enabled
   */
  private color(text: string, color: 'red' | 'yellow' | 'green' | 'blue' | 'gray', enabled: boolean): string {
    if (!enabled) return text;

    switch (color) {
      case 'red':
        return chalk.red(text);
      case 'yellow':
        return chalk.yellow(text);
      case 'green':
        return chalk.green(text);
      case 'blue':
        return chalk.blue(text);
      case 'gray':
        return chalk.gray(text);
      default:
        return text;
    }
  }
}

/**
 * Create a default error formatter instance
 */
export function createErrorFormatter(options?: ErrorFormatOptions): ErrorFormatter {
  return new ErrorFormatter(options);
}

/**
 * Quick format functions for common use cases
 */
export const formatValidationErrors = (errors: ValidationError[], options?: ErrorFormatOptions): string => {
  const formatter = createErrorFormatter(options);
  return formatter.formatValidationErrors(errors);
};

export const formatParseError = (error: ParseError, options?: ErrorFormatOptions): string => {
  const formatter = createErrorFormatter(options);
  return formatter.formatParseError(error);
};

export const formatSerializeError = (error: SerializeError, options?: ErrorFormatOptions): string => {
  const formatter = createErrorFormatter(options);
  return formatter.formatSerializeError(error);
};

export const formatError = (error: Error | PRMError, options?: ErrorFormatOptions): string => {
  const formatter = createErrorFormatter(options);
  return formatter.formatError(error);
};
