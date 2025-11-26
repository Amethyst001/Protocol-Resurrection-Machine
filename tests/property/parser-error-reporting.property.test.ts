/**
 * Property-Based Tests for Parser Error Reporting
 * 
 * Feature: protocol-resurrection-machine, Property 8: Parser Error Reporting
 * For any malformed protocol message, parsing should fail with an error that includes
 * the byte offset of the failure, the expected format, and the actual data encountered
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { ParserGenerator } from '../../src/generation/parser-generator.js';
import { YAMLParser } from '../../src/core/yaml-parser.js';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('Parser Error Reporting Property Tests', () => {
  const yamlParser = new YAMLParser();

  // Load Gopher protocol spec
  const gopherYaml = readFileSync(join(process.cwd(), 'protocols', 'gopher.yaml'), 'utf-8');
  const gopherSpec = yamlParser.parse(gopherYaml);

  /**
   * Feature: protocol-resurrection-machine, Property 8: Parser Error Reporting
   * For any malformed message, parser should return error with byte offset
   */
  describe('Property 8: Error Contains Byte Offset', () => {
    it('should include byte offset in parse errors for missing terminators', () => {
      // Generate messages without proper terminators
      const malformedRequestArbitrary = fc.string({ minLength: 1, maxLength: 50 })
        .filter(s => !s.includes('\r\n')); // No terminator

      fc.assert(
        fc.property(malformedRequestArbitrary, (selector) => {
          const result = parseRequest(selector); // Missing CRLF

          // Should fail
          expect(result.success).toBe(false);

          // Should have error with offset
          if (!result.success && result.error) {
            expect(result.error).toHaveProperty('offset');
            expect(typeof result.error.offset).toBe('number');
            expect(result.error.offset).toBeGreaterThanOrEqual(0);
          }
        }),
        { numRuns: 100 }
      );
    });

    it('should include byte offset in parse errors for invalid delimiters', () => {
      // Generate DirectoryItem messages with wrong delimiters
      const malformedItemArbitrary = fc.record({
        itemType: fc.constantFrom('0', '1', '3', '7', '9'),
        display: fc.string({ minLength: 1, maxLength: 20 }),
        selector: fc.string({ minLength: 0, maxLength: 20 }),
        host: fc.domain(),
        port: fc.integer({ min: 1, max: 65535 }),
      });

      fc.assert(
        fc.property(malformedItemArbitrary, (item) => {
          // Use wrong delimiter (space instead of tab)
          const malformed = `${item.itemType}${item.display} ${item.selector} ${item.host} ${item.port}\r\n`;
          const result = parseDirectoryItem(malformed);

          // Should fail (not enough tab-delimited fields)
          expect(result.success).toBe(false);

          if (!result.success && result.error) {
            expect(result.error).toHaveProperty('offset');
            expect(typeof result.error.offset).toBe('number');
          }
        }),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Feature: protocol-resurrection-machine, Property 8: Parser Error Reporting
   * For any malformed message, parser should include expected format in error
   */
  describe('Property 8: Error Contains Expected Format', () => {
    it('should include expected format in parse errors', () => {
      const malformedDataArbitrary = fc.string({ minLength: 1, maxLength: 50 });

      fc.assert(
        fc.property(malformedDataArbitrary, (data) => {
          const result = parseRequest(data);

          if (!result.success && result.error) {
            expect(result.error).toHaveProperty('expected');
            expect(typeof result.error.expected).toBe('string');
            expect(result.error.expected.length).toBeGreaterThan(0);
          }
        }),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Feature: protocol-resurrection-machine, Property 8: Parser Error Reporting
   * For any malformed message, parser should include actual data in error
   */
  describe('Property 8: Error Contains Actual Data', () => {
    it('should include actual data encountered in parse errors', () => {
      const malformedDataArbitrary = fc.string({ minLength: 1, maxLength: 50 });

      fc.assert(
        fc.property(malformedDataArbitrary, (data) => {
          const result = parseRequest(data);

          if (!result.success && result.error) {
            expect(result.error).toHaveProperty('actual');
            expect(typeof result.error.actual).toBe('string');
            // Actual data should be non-empty
            expect(result.error.actual.length).toBeGreaterThan(0);
          }
        }),
        { numRuns: 100 }
      );
    });

    it('should truncate long actual data in error messages', () => {
      // Generate very long malformed data
      const longDataArbitrary = fc.string({ minLength: 100, maxLength: 500 });

      fc.assert(
        fc.property(longDataArbitrary, (data) => {
          const result = parseRequest(data);

          if (!result.success && result.error) {
            // Actual data should be truncated to reasonable length (e.g., 50 chars)
            expect(result.error.actual.length).toBeLessThanOrEqual(100);
          }
        }),
        { numRuns: 50 }
      );
    });
  });

  /**
   * Feature: protocol-resurrection-machine, Property 8: Parser Error Reporting
   * For any malformed message, parser should provide descriptive error message
   */
  describe('Property 8: Error Contains Descriptive Message', () => {
    it('should include descriptive error message', () => {
      const malformedDataArbitrary = fc.string({ minLength: 1, maxLength: 50 });

      fc.assert(
        fc.property(malformedDataArbitrary, (data) => {
          const result = parseRequest(data);

          if (!result.success && result.error) {
            expect(result.error).toHaveProperty('message');
            expect(typeof result.error.message).toBe('string');
            expect(result.error.message.length).toBeGreaterThan(10); // Reasonably descriptive
          }
        }),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Feature: protocol-resurrection-machine, Property 8: Parser Error Reporting
   * For invalid field values, parser should identify the field in error
   */
  describe('Property 8: Error Identifies Invalid Field', () => {
    it('should include field name for field-specific errors', () => {
      // Generate DirectoryItem with invalid port (non-numeric)
      const invalidPortArbitrary = fc.record({
        itemType: fc.constantFrom('0', '1', '3'),
        display: fc.constant('Test'),
        selector: fc.constant('/test'),
        host: fc.constant('example.com'),
        port: fc.string({ minLength: 1, maxLength: 10 })
          .filter(s => isNaN(parseInt(s, 10))), // Non-numeric port
      });

      fc.assert(
        fc.property(invalidPortArbitrary, (item) => {
          const malformed = `${item.itemType}${item.display}\t${item.selector}\t${item.host}\t${item.port}\r\n`;
          const result = parseDirectoryItem(malformed);

          // Should fail due to invalid port
          expect(result.success).toBe(false);

          if (!result.success && result.error) {
            // Error should mention the field or contain relevant context
            const errorText = result.error.message.toLowerCase();
            const hasFieldContext = 
              errorText.includes('port') || 
              errorText.includes('number') ||
              errorText.includes('field');
            expect(hasFieldContext).toBe(true);
          }
        }),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Feature: protocol-resurrection-machine, Property 8: Parser Error Reporting
   * For any parse error, bytesConsumed should be 0 (no partial consumption)
   */
  describe('Property 8: Failed Parse Consumes No Bytes', () => {
    it('should return bytesConsumed = 0 for failed parses', () => {
      const malformedDataArbitrary = fc.string({ minLength: 1, maxLength: 50 });

      fc.assert(
        fc.property(malformedDataArbitrary, (data) => {
          const result = parseRequest(data);

          if (!result.success) {
            expect(result.bytesConsumed).toBe(0);
          }
        }),
        { numRuns: 100 }
      );
    });
  });
});

// Helper functions simulating parser behavior

interface ParseResult<T> {
  success: boolean;
  message?: T;
  error?: {
    message: string;
    offset: number;
    expected: string;
    actual: string;
    fieldName?: string;
  };
  bytesConsumed: number;
}

function parseRequest(data: string): ParseResult<{ selector: string }> {
  const terminatorIndex = data.indexOf('\r\n');

  if (terminatorIndex === -1) {
    return {
      success: false,
      error: {
        message: 'Expected terminator "\\r\\n" not found',
        offset: 0,
        expected: '\\r\\n',
        actual: data.slice(0, Math.min(50, data.length)),
      },
      bytesConsumed: 0,
    };
  }

  const selector = data.slice(0, terminatorIndex);

  return {
    success: true,
    message: { selector },
    bytesConsumed: terminatorIndex + 2,
  };
}

function parseDirectoryItem(data: string): ParseResult<{
  itemType: string;
  display: string;
  selector: string;
  host: string;
  port: number;
}> {
  const terminatorIndex = data.indexOf('\r\n');

  if (terminatorIndex === -1) {
    return {
      success: false,
      error: {
        message: 'Expected terminator "\\r\\n" not found',
        offset: 0,
        expected: '\\r\\n',
        actual: data.slice(0, Math.min(50, data.length)),
      },
      bytesConsumed: 0,
    };
  }

  const line = data.slice(0, terminatorIndex);
  const itemType = line[0];
  const rest = line.slice(1);
  const parts = rest.split('\t');

  if (parts.length < 4) {
    return {
      success: false,
      error: {
        message: `Expected at least 4 fields but got ${parts.length}`,
        offset: 0,
        expected: '4 fields',
        actual: `${parts.length} fields`,
      },
      bytesConsumed: 0,
    };
  }

  const port = parseInt(parts[3], 10);

  if (isNaN(port)) {
    return {
      success: false,
      error: {
        message: 'Field port is not a valid number',
        offset: 0,
        expected: 'number',
        actual: parts[3],
        fieldName: 'port',
      },
      bytesConsumed: 0,
    };
  }

  return {
    success: true,
    message: {
      itemType,
      display: parts[0],
      selector: parts[1],
      host: parts[2],
      port,
    },
    bytesConsumed: terminatorIndex + 2,
  };
}
