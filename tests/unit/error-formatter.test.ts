/**
 * Tests for Error Formatter
 */

import { describe, it, expect } from 'vitest';
import {
  ErrorFormatter,
  createErrorFormatter,
  formatValidationErrors,
  formatParseError,
  formatSerializeError,
  formatError,
} from '../../src/utils/error-formatter.js';
import type { ValidationError, ParseError, SerializeError } from '../../src/types/results.js';
import {
  YAMLParseError,
  ValidationError as ValidationErrorClass,
  GenerationError,
  ProtocolParseError,
  ProtocolSerializeError,
  NetworkError,
} from '../../src/types/errors.js';

describe('ErrorFormatter', () => {
  describe('formatValidationError', () => {
    it('should format a basic validation error', () => {
      const formatter = createErrorFormatter({ useColor: false });
      const error: ValidationError = {
        type: 'missing_required_field',
        message: 'Missing required field: protocol.name',
      };

      const formatted = formatter.formatValidationError(error);
      expect(formatted).toContain('Missing required field: protocol.name');
    });

    it('should include location information when available', () => {
      const formatter = createErrorFormatter({ useColor: false });
      const error: ValidationError = {
        type: 'invalid_type',
        message: 'Invalid type',
        line: 10,
        column: 5,
      };

      const formatted = formatter.formatValidationError(error);
      expect(formatted).toContain('Location: line 10, column 5');
    });

    it('should include field path when available', () => {
      const formatter = createErrorFormatter({ useColor: false });
      const error: ValidationError = {
        type: 'invalid_type',
        message: 'Invalid type',
        fieldPath: 'protocol.port',
      };

      const formatted = formatter.formatValidationError(error);
      expect(formatted).toContain('Field: protocol.port');
    });

    it('should include expected and actual values', () => {
      const formatter = createErrorFormatter({ useColor: false });
      const error: ValidationError = {
        type: 'invalid_type',
        message: 'Invalid type',
        expected: 'number',
        actual: 'string',
      };

      const formatted = formatter.formatValidationError(error);
      expect(formatted).toContain('Expected: number');
      expect(formatted).toContain('Actual: string');
    });

    it('should include suggestion when available', () => {
      const formatter = createErrorFormatter({ useColor: false });
      const error: ValidationError = {
        type: 'missing_required_field',
        message: 'Missing field',
        suggestion: 'Add the "name" field',
      };

      const formatted = formatter.formatValidationError(error);
      expect(formatted).toContain('Suggestion: Add the "name" field');
    });

    it('should respect includeContext option', () => {
      const formatter = createErrorFormatter({ useColor: false, includeContext: false });
      const error: ValidationError = {
        type: 'invalid_type',
        message: 'Invalid type',
        fieldPath: 'protocol.port',
        expected: 'number',
        actual: 'string',
      };

      const formatted = formatter.formatValidationError(error);
      expect(formatted).not.toContain('Field:');
      expect(formatted).not.toContain('Expected:');
      expect(formatted).not.toContain('Actual:');
    });

    it('should respect includeSuggestions option', () => {
      const formatter = createErrorFormatter({ useColor: false, includeSuggestions: false });
      const error: ValidationError = {
        type: 'missing_required_field',
        message: 'Missing field',
        suggestion: 'Add the field',
      };

      const formatted = formatter.formatValidationError(error);
      expect(formatted).not.toContain('Suggestion:');
    });
  });

  describe('formatValidationErrors', () => {
    it('should format multiple validation errors', () => {
      const errors: ValidationError[] = [
        {
          type: 'missing_required_field',
          message: 'Missing field: name',
        },
        {
          type: 'invalid_type',
          message: 'Invalid type for port',
        },
      ];

      const formatted = formatValidationErrors(errors, { useColor: false });
      expect(formatted).toContain('Found 2 validation errors');
      expect(formatted).toContain('1. Missing field: name');
      expect(formatted).toContain('2. Invalid type for port');
    });

    it('should handle empty error array', () => {
      const formatted = formatValidationErrors([], { useColor: false });
      expect(formatted).toContain('No validation errors');
    });

    it('should handle single error', () => {
      const errors: ValidationError[] = [
        {
          type: 'missing_required_field',
          message: 'Missing field',
        },
      ];

      const formatted = formatValidationErrors(errors, { useColor: false });
      expect(formatted).toContain('Found 1 validation error');
    });
  });

  describe('formatParseError', () => {
    it('should format a parse error with all fields', () => {
      const formatter = createErrorFormatter({ useColor: false });
      const error: ParseError = {
        message: 'Expected CRLF',
        offset: 42,
        expected: '\\r\\n',
        actual: '\\n',
        context: 'line 5',
      };

      const formatted = formatter.formatParseError(error);
      expect(formatted).toContain('[PARSE_ERROR]');
      expect(formatted).toContain('Expected CRLF');
      expect(formatted).toContain('Byte Offset: 42');
      expect(formatted).toContain('Expected: \\r\\n');
      expect(formatted).toContain('Actual: \\n');
      expect(formatted).toContain('Context: line 5');
    });

    it('should truncate long actual values', () => {
      const formatter = createErrorFormatter({ useColor: false });
      const error: ParseError = {
        message: 'Parse error',
        offset: 0,
        expected: 'valid data',
        actual: 'a'.repeat(100),
      };

      const formatted = formatter.formatParseError(error);
      expect(formatted).toContain('...');
      // The actual value in the formatted output should be truncated (max 50 chars + '...')
      const actualLine = formatted.split('\n').find(line => line.includes('Actual:'));
      expect(actualLine).toBeDefined();
      expect(actualLine).not.toContain('a'.repeat(60)); // Should not contain the full 100 'a's
    });
  });

  describe('formatSerializeError', () => {
    it('should format a serialize error with all fields', () => {
      const formatter = createErrorFormatter({ useColor: false });
      const error: SerializeError = {
        message: 'Missing required field',
        fieldName: 'username',
        expected: 'string',
        actual: undefined,
        constraint: 'required',
      };

      const formatted = formatter.formatSerializeError(error);
      expect(formatted).toContain('[SERIALIZE_ERROR]');
      expect(formatted).toContain('Missing required field');
      expect(formatted).toContain('Field: username');
      expect(formatted).toContain('Expected: string');
      expect(formatted).toContain('Constraint: required');
    });

    it('should handle object actual values', () => {
      const formatter = createErrorFormatter({ useColor: false });
      const error: SerializeError = {
        message: 'Invalid value',
        fieldName: 'data',
        actual: { foo: 'bar' },
      };

      const formatted = formatter.formatSerializeError(error);
      expect(formatted).toContain('{"foo":"bar"}');
    });
  });

  describe('formatPRMError', () => {
    it('should format YAMLParseError', () => {
      const formatter = createErrorFormatter({ useColor: false });
      const error = new YAMLParseError('Invalid YAML syntax', 10, 5);

      const formatted = formatter.formatPRMError(error);
      expect(formatted).toContain('[YAMLPARSEERROR]');
      expect(formatted).toContain('YAML Parser');
      expect(formatted).toContain('Invalid YAML syntax');
      expect(formatted).toContain('Location: line 10, column 5');
    });

    it('should format ValidationError', () => {
      const formatter = createErrorFormatter({ useColor: false });
      const error = new ValidationErrorClass('Validation failed', 'protocol.port');

      const formatted = formatter.formatPRMError(error);
      expect(formatted).toContain('[VALIDATIONERROR]');
      expect(formatted).toContain('Validator');
      expect(formatted).toContain('Validation failed');
      expect(formatted).toContain('Field: protocol.port');
    });

    it('should format GenerationError', () => {
      const formatter = createErrorFormatter({ useColor: false });
      const error = new GenerationError('Generation failed', 'parser', 'gopher-parser.ts');

      const formatted = formatter.formatPRMError(error);
      expect(formatted).toContain('[GENERATIONERROR]');
      expect(formatted).toContain('Code Generator');
      expect(formatted).toContain('Generation failed');
      expect(formatted).toContain('Phase: parser');
      expect(formatted).toContain('Artifact: gopher-parser.ts');
    });

    it('should format ProtocolParseError', () => {
      const formatter = createErrorFormatter({ useColor: false });
      const error = new ProtocolParseError('Parse failed', 42, 'CRLF', 'LF');

      const formatted = formatter.formatPRMError(error);
      expect(formatted).toContain('[PROTOCOLPARSEERROR]');
      expect(formatted).toContain('Protocol Parser');
      expect(formatted).toContain('Parse failed');
      expect(formatted).toContain('Byte Offset: 42');
      expect(formatted).toContain('Expected: CRLF');
      expect(formatted).toContain('Actual: LF');
    });

    it('should format ProtocolSerializeError', () => {
      const formatter = createErrorFormatter({ useColor: false });
      const error = new ProtocolSerializeError('Serialize failed', 'username');

      const formatted = formatter.formatPRMError(error);
      expect(formatted).toContain('[PROTOCOLSERIALIZEERROR]');
      expect(formatted).toContain('Protocol Serializer');
      expect(formatted).toContain('Serialize failed');
      expect(formatted).toContain('Field: username');
    });

    it('should format NetworkError', () => {
      const formatter = createErrorFormatter({ useColor: false });
      const error = new NetworkError('Connection failed', 'connect', 'disconnected');

      const formatted = formatter.formatPRMError(error);
      expect(formatted).toContain('[NETWORKERROR]');
      expect(formatted).toContain('Network Client');
      expect(formatted).toContain('Connection failed');
      expect(formatted).toContain('Operation: connect');
      expect(formatted).toContain('Connection State: disconnected');
    });

    it('should include stack trace when requested', () => {
      const formatter = createErrorFormatter({ useColor: false, includeStack: true });
      const error = new YAMLParseError('Test error');

      const formatted = formatter.formatPRMError(error);
      expect(formatted).toContain('Stack Trace:');
    });

    it('should include suggestions for known error types', () => {
      const formatter = createErrorFormatter({ useColor: false });
      const error = new NetworkError('Connection failed', 'connect', 'disconnected');

      const formatted = formatter.formatPRMError(error);
      expect(formatted).toContain('Suggestion:');
      expect(formatted).toContain('network connectivity');
    });
  });

  describe('formatError', () => {
    it('should format generic Error', () => {
      const formatter = createErrorFormatter({ useColor: false });
      const error = new Error('Something went wrong');

      const formatted = formatter.formatError(error);
      expect(formatted).toContain('[ERROR]');
      expect(formatted).toContain('Unexpected Error');
      expect(formatted).toContain('Something went wrong');
    });

    it('should format PRMError', () => {
      const formatter = createErrorFormatter({ useColor: false });
      const error = new YAMLParseError('YAML error');

      const formatted = formatter.formatError(error);
      expect(formatted).toContain('[YAMLPARSEERROR]');
      expect(formatted).toContain('YAML error');
    });
  });

  describe('Quick format functions', () => {
    it('formatValidationErrors should work', () => {
      const errors: ValidationError[] = [
        { type: 'missing_required_field', message: 'Missing field' },
      ];

      const formatted = formatValidationErrors(errors, { useColor: false });
      expect(formatted).toContain('Missing field');
    });

    it('formatParseError should work', () => {
      const error: ParseError = {
        message: 'Parse error',
        offset: 0,
        expected: 'data',
        actual: 'invalid',
      };

      const formatted = formatParseError(error, { useColor: false });
      expect(formatted).toContain('Parse error');
    });

    it('formatSerializeError should work', () => {
      const error: SerializeError = {
        message: 'Serialize error',
        fieldName: 'field',
      };

      const formatted = formatSerializeError(error, { useColor: false });
      expect(formatted).toContain('Serialize error');
    });

    it('formatError should work', () => {
      const error = new Error('Test error');

      const formatted = formatError(error, { useColor: false });
      expect(formatted).toContain('Test error');
    });
  });
});
