/**
 * Unit tests for Format Parser
 */

import { describe, it, expect } from 'vitest';
import { FormatParser } from '../../src/core/format-parser.js';
import { YAMLParseError } from '../../src/types/errors.js';

describe('FormatParser', () => {
  const parser = new FormatParser();

  describe('parse()', () => {
    it('should parse format string with single placeholder', () => {
      const result = parser.parse('{field}');

      expect(result.hasPlaceholders).toBe(true);
      expect(result.placeholders).toHaveLength(1);
      expect(result.placeholders[0].fieldName).toBe('field');
      expect(result.placeholders[0].startPos).toBe(0);
      expect(result.placeholders[0].endPos).toBe(7);
      expect(result.fixedParts).toEqual(['', '']);
    });

    it('should parse format string with multiple placeholders', () => {
      const result = parser.parse('{field1} and {field2}');

      expect(result.placeholders).toHaveLength(2);
      expect(result.placeholders[0].fieldName).toBe('field1');
      expect(result.placeholders[1].fieldName).toBe('field2');
      expect(result.fixedParts).toEqual(['', ' and ', '']);
    });

    it('should parse format string with fixed text', () => {
      const result = parser.parse('Hello {name}, welcome!');

      expect(result.placeholders).toHaveLength(1);
      expect(result.placeholders[0].fieldName).toBe('name');
      expect(result.fixedParts).toEqual(['Hello ', ', welcome!']);
    });

    it('should parse format string with no placeholders', () => {
      const result = parser.parse('Just plain text');

      expect(result.hasPlaceholders).toBe(false);
      expect(result.placeholders).toHaveLength(0);
      expect(result.fixedParts).toEqual(['Just plain text']);
    });

    it('should handle escaped braces', () => {
      const result = parser.parse('\\{not a placeholder\\} but {this_is}');

      expect(result.placeholders).toHaveLength(1);
      expect(result.placeholders[0].fieldName).toBe('this_is');
      expect(result.fixedParts[0]).toBe('{not a placeholder} but ');
    });

    it('should handle field names with underscores and hyphens', () => {
      const result = parser.parse('{field_name} {field-name}');

      expect(result.placeholders).toHaveLength(2);
      expect(result.placeholders[0].fieldName).toBe('field_name');
      expect(result.placeholders[1].fieldName).toBe('field-name');
    });

    it('should throw error for unclosed placeholder', () => {
      expect(() => parser.parse('{unclosed')).toThrow(YAMLParseError);
      expect(() => parser.parse('{unclosed')).toThrow('Unclosed placeholder');
    });

    it('should throw error for empty placeholder', () => {
      expect(() => parser.parse('{}')).toThrow(YAMLParseError);
      expect(() => parser.parse('{}')).toThrow('Empty placeholder');
    });

    it('should throw error for unmatched closing brace', () => {
      expect(() => parser.parse('text }')).toThrow(YAMLParseError);
      expect(() => parser.parse('text }')).toThrow('Unmatched closing brace');
    });

    it('should throw error for invalid field name', () => {
      expect(() => parser.parse('{123invalid}')).toThrow(YAMLParseError);
      expect(() => parser.parse('{123invalid}')).toThrow('Invalid field name');
    });

    it('should handle whitespace in placeholders', () => {
      const result = parser.parse('{ field_name }');

      expect(result.placeholders).toHaveLength(1);
      expect(result.placeholders[0].fieldName).toBe('field_name');
    });
  });

  describe('extractFieldNames()', () => {
    it('should extract field names in order', () => {
      const names = parser.extractFieldNames('{field1} {field2} {field3}');

      expect(names).toEqual(['field1', 'field2', 'field3']);
    });

    it('should return empty array for no placeholders', () => {
      const names = parser.extractFieldNames('no placeholders here');

      expect(names).toEqual([]);
    });

    it('should handle duplicate field names', () => {
      const names = parser.extractFieldNames('{field} and {field} again');

      expect(names).toEqual(['field', 'field']);
    });
  });

  describe('containsField()', () => {
    it('should return true if field is present', () => {
      expect(parser.containsField('{field1} {field2}', 'field1')).toBe(true);
      expect(parser.containsField('{field1} {field2}', 'field2')).toBe(true);
    });

    it('should return false if field is not present', () => {
      expect(parser.containsField('{field1} {field2}', 'field3')).toBe(false);
    });

    it('should return false for format with no placeholders', () => {
      expect(parser.containsField('no placeholders', 'field')).toBe(false);
    });
  });

  describe('replacePlaceholders()', () => {
    it('should replace placeholders with values', () => {
      const result = parser.replacePlaceholders('Hello {name}!', { name: 'World' });

      expect(result).toBe('Hello World!');
    });

    it('should replace multiple placeholders', () => {
      const result = parser.replacePlaceholders('{greeting} {name}!', {
        greeting: 'Hello',
        name: 'World',
      });

      expect(result).toBe('Hello World!');
    });

    it('should handle numeric values', () => {
      const result = parser.replacePlaceholders('Port: {port}', { port: 8080 });

      expect(result).toBe('Port: 8080');
    });

    it('should throw error for missing value', () => {
      expect(() => parser.replacePlaceholders('{field}', {})).toThrow(
        'Missing value for field "field"'
      );
    });
  });

  describe('validatePlaceholders()', () => {
    it('should validate that all placeholders reference defined fields', () => {
      const fields = [
        { name: 'field1', type: { kind: 'string' as const }, required: true },
        { name: 'field2', type: { kind: 'number' as const }, required: true },
      ];

      expect(() =>
        parser.validatePlaceholders('{field1} {field2}', fields, 'TestMessage')
      ).not.toThrow();
    });

    it('should throw error for undefined field reference', () => {
      const fields = [{ name: 'field1', type: { kind: 'string' as const }, required: true }];

      expect(() =>
        parser.validatePlaceholders('{field1} {undefined}', fields, 'TestMessage')
      ).toThrow(YAMLParseError);
      expect(() =>
        parser.validatePlaceholders('{field1} {undefined}', fields, 'TestMessage')
      ).toThrow('references undefined field');
    });
  });

  describe('escape() and unescape()', () => {
    it('should escape special characters', () => {
      expect(parser.escape('text {with} braces')).toBe('text \\{with\\} braces');
      expect(parser.escape('backslash \\ here')).toBe('backslash \\\\ here');
    });

    it('should unescape escaped characters', () => {
      expect(parser.unescape('text \\{with\\} braces')).toBe('text {with} braces');
      expect(parser.unescape('backslash \\\\ here')).toBe('backslash \\ here');
    });

    it('should round-trip escape and unescape', () => {
      const original = 'text {with} braces and \\ backslash';
      const escaped = parser.escape(original);
      const unescaped = parser.unescape(escaped);

      expect(unescaped).toBe(original);
    });
  });
});
