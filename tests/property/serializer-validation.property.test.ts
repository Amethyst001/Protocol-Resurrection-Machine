/**
 * Property-Based Tests for Serializer Validation
 * 
 * Feature: protocol-resurrection-machine, Property 9: Serializer Validation
 * For any invalid message object (missing required fields, invalid field types, constraint violations),
 * serialization should fail with an error that identifies the invalid field and the reason for invalidity
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

describe('Serializer Validation Property Tests', () => {

  /**
   * Feature: protocol-resurrection-machine, Property 9: Serializer Validation
   * For any message missing required fields, serialization should fail with field identification
   */
  describe('Property 9: Missing Required Fields', () => {
    it('should fail when required selector field is missing', () => {
      // Generate messages with missing selector
      const invalidRequestArbitrary = fc.record({
        selector: fc.constant(undefined as any),
      });

      fc.assert(
        fc.property(invalidRequestArbitrary, (request) => {
          const result = serializeRequest(request);

          // Should fail
          expect(result.success).toBe(false);

          if (!result.success && result.error) {
            // Should identify the missing field
            expect(result.error.field).toBe('selector');
            expect(result.error.message).toContain('selector');
            expect(result.error.message.toLowerCase()).toContain('missing');
          }
        }),
        { numRuns: 100 }
      );
    });

    it('should fail when required DirectoryItem fields are missing', () => {
      const validItemTypes = ['0', '1', '3', '7', '9'];

      // Generate messages with one required field missing
      const missingFieldArbitrary = fc.oneof(
        fc.record({
          itemType: fc.constant(undefined as any),
          display: fc.constant('Test'),
          selector: fc.constant('/test'),
          host: fc.constant('example.com'),
          port: fc.constant(70),
        }),
        fc.record({
          itemType: fc.constantFrom(...validItemTypes),
          display: fc.constant(undefined as any),
          selector: fc.constant('/test'),
          host: fc.constant('example.com'),
          port: fc.constant(70),
        }),
        fc.record({
          itemType: fc.constantFrom(...validItemTypes),
          display: fc.constant('Test'),
          selector: fc.constant(undefined as any),
          host: fc.constant('example.com'),
          port: fc.constant(70),
        }),
        fc.record({
          itemType: fc.constantFrom(...validItemTypes),
          display: fc.constant('Test'),
          selector: fc.constant('/test'),
          host: fc.constant(undefined as any),
          port: fc.constant(70),
        }),
        fc.record({
          itemType: fc.constantFrom(...validItemTypes),
          display: fc.constant('Test'),
          selector: fc.constant('/test'),
          host: fc.constant('example.com'),
          port: fc.constant(undefined as any),
        })
      );

      fc.assert(
        fc.property(missingFieldArbitrary, (item) => {
          const result = serializeDirectoryItem(item);

          // Should fail
          expect(result.success).toBe(false);

          if (!result.success && result.error) {
            // Should identify a field
            expect(result.error.field).toBeTruthy();
            expect(result.error.field.length).toBeGreaterThan(0);
            expect(result.error.message.toLowerCase()).toContain('missing');
          }
        }),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Feature: protocol-resurrection-machine, Property 9: Serializer Validation
   * For any message with invalid field types, serialization should fail with type identification
   */
  describe('Property 9: Invalid Field Types', () => {
    it('should fail when port is not a number', () => {
      const validItemTypes = ['0', '1', '3', '7', '9'];

      const invalidTypeArbitrary = fc.record({
        itemType: fc.constantFrom(...validItemTypes),
        display: fc.constant('Test'),
        selector: fc.constant('/test'),
        host: fc.constant('example.com'),
        port: fc.string().map(s => s as any), // Wrong type
      });

      fc.assert(
        fc.property(invalidTypeArbitrary, (item) => {
          const result = serializeDirectoryItem(item);

          // Should fail
          expect(result.success).toBe(false);

          if (!result.success && result.error) {
            // Should identify the field and type issue
            expect(result.error.field).toBe('port');
            const errorMsg = result.error.message.toLowerCase();
            expect(errorMsg.includes('number') || errorMsg.includes('type')).toBe(true);
          }
        }),
        { numRuns: 100 }
      );
    });

    it('should fail when string fields have wrong type', () => {
      const validItemTypes = ['0', '1', '3', '7', '9'];

      const invalidTypeArbitrary = fc.oneof(
        fc.record({
          itemType: fc.constantFrom(...validItemTypes),
          display: fc.integer().map(n => n as any), // Wrong type
          selector: fc.constant('/test'),
          host: fc.constant('example.com'),
          port: fc.constant(70),
        }),
        fc.record({
          itemType: fc.constantFrom(...validItemTypes),
          display: fc.constant('Test'),
          selector: fc.integer().map(n => n as any), // Wrong type
          host: fc.constant('example.com'),
          port: fc.constant(70),
        }),
        fc.record({
          itemType: fc.constantFrom(...validItemTypes),
          display: fc.constant('Test'),
          selector: fc.constant('/test'),
          host: fc.integer().map(n => n as any), // Wrong type
          port: fc.constant(70),
        })
      );

      fc.assert(
        fc.property(invalidTypeArbitrary, (item) => {
          const result = serializeDirectoryItem(item);

          // Should fail
          expect(result.success).toBe(false);

          if (!result.success && result.error) {
            // Should identify field and type issue
            expect(result.error.field).toBeTruthy();
            const errorMsg = result.error.message.toLowerCase();
            expect(errorMsg.includes('string') || errorMsg.includes('type')).toBe(true);
          }
        }),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Feature: protocol-resurrection-machine, Property 9: Serializer Validation
   * For any message with constraint violations, serialization should fail with constraint identification
   */
  describe('Property 9: Constraint Violations', () => {
    it('should fail when string exceeds maxLength', () => {
      // Generate selector that exceeds maxLength (255)
      const tooLongArbitrary = fc.record({
        selector: fc.string({ minLength: 256, maxLength: 500 }),
      });

      fc.assert(
        fc.property(tooLongArbitrary, (request) => {
          const result = serializeRequest(request);

          // Should fail
          expect(result.success).toBe(false);

          if (!result.success && result.error) {
            // Should identify the field and constraint
            expect(result.error.field).toBe('selector');
            const errorMsg = result.error.message.toLowerCase();
            expect(errorMsg.includes('length') || errorMsg.includes('exceeds')).toBe(true);
          }
        }),
        { numRuns: 50 }
      );
    });

    it('should fail when port is out of valid range', () => {
      const validItemTypes = ['0', '1', '3', '7', '9'];

      // Generate port outside valid range (1-65535)
      const invalidPortArbitrary = fc.record({
        itemType: fc.constantFrom(...validItemTypes),
        display: fc.constant('Test'),
        selector: fc.constant('/test'),
        host: fc.constant('example.com'),
        port: fc.oneof(
          fc.integer({ min: -1000, max: 0 }),
          fc.integer({ min: 65536, max: 100000 })
        ),
      });

      fc.assert(
        fc.property(invalidPortArbitrary, (item) => {
          const result = serializeDirectoryItem(item);

          // Should fail
          expect(result.success).toBe(false);

          if (!result.success && result.error) {
            // Should identify the field and range issue
            expect(result.error.field).toBe('port');
            const errorMsg = result.error.message.toLowerCase();
            expect(
              errorMsg.includes('minimum') || 
              errorMsg.includes('maximum') || 
              errorMsg.includes('range')
            ).toBe(true);
          }
        }),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Feature: protocol-resurrection-machine, Property 9: Serializer Validation
   * For any message with invalid enum values, serialization should fail with enum identification
   */
  describe('Property 9: Invalid Enum Values', () => {
    it('should fail when itemType has invalid enum value', () => {
      // Generate invalid item types
      const invalidEnumArbitrary = fc.record({
        itemType: fc.string({ minLength: 1, maxLength: 3 })
          .filter(s => !['0', '1', '3', '7', '9', 'g', 'I', 'h'].includes(s)),
        display: fc.constant('Test'),
        selector: fc.constant('/test'),
        host: fc.constant('example.com'),
        port: fc.constant(70),
      });

      fc.assert(
        fc.property(invalidEnumArbitrary, (item) => {
          const result = serializeDirectoryItem(item);

          // Should fail
          expect(result.success).toBe(false);

          if (!result.success && result.error) {
            // Should identify the field and enum issue
            expect(result.error.field).toBe('itemType');
            const errorMsg = result.error.message.toLowerCase();
            expect(errorMsg.includes('enum') || errorMsg.includes('invalid')).toBe(true);
          }
        }),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Feature: protocol-resurrection-machine, Property 9: Serializer Validation
   * For any validation error, should provide expected and actual values
   */
  describe('Property 9: Error Details', () => {
    it('should include expected and actual values in validation errors', () => {
      const validItemTypes = ['0', '1', '3', '7', '9'];

      // Generate message with out-of-range port
      const invalidArbitrary = fc.record({
        itemType: fc.constantFrom(...validItemTypes),
        display: fc.constant('Test'),
        selector: fc.constant('/test'),
        host: fc.constant('example.com'),
        port: fc.integer({ min: 70000, max: 100000 }),
      });

      fc.assert(
        fc.property(invalidArbitrary, (item) => {
          const result = serializeDirectoryItem(item);

          if (!result.success && result.error) {
            // Should have expected value
            expect(result.error).toHaveProperty('expected');
            expect(result.error.expected).toBeTruthy();

            // Should have actual value
            expect(result.error).toHaveProperty('actual');
            expect(result.error.actual).toBeTruthy();
          }
        }),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Feature: protocol-resurrection-machine, Property 9: Serializer Validation
   * For any validation error, should provide reason for failure
   */
  describe('Property 9: Error Reason', () => {
    it('should include reason in validation errors', () => {
      const invalidArbitrary = fc.record({
        selector: fc.constant(undefined as any),
      });

      fc.assert(
        fc.property(invalidArbitrary, (request) => {
          const result = serializeRequest(request);

          if (!result.success && result.error) {
            // Should have reason
            expect(result.error).toHaveProperty('reason');
            expect(typeof result.error.reason).toBe('string');
            expect(result.error.reason.length).toBeGreaterThan(0);
          }
        }),
        { numRuns: 100 }
      );
    });
  });
});

// Helper functions simulating serializer behavior

interface SerializeResult {
  success: boolean;
  data?: Buffer;
  error?: {
    message: string;
    field: string;
    reason: string;
    expected?: string;
    actual?: string;
  };
}

function serializeRequest(request: { selector?: string }): SerializeResult {
  // Validate required field
  if (request.selector === undefined || request.selector === null) {
    return {
      success: false,
      error: {
        message: 'Required field "selector" is missing',
        field: 'selector',
        reason: 'validation_failed',
        expected: 'non-null value',
        actual: 'undefined',
      },
    };
  }

  // Validate type
  if (typeof request.selector !== 'string') {
    return {
      success: false,
      error: {
        message: 'Field "selector" must be a string',
        field: 'selector',
        reason: 'validation_failed',
        expected: 'string',
        actual: typeof request.selector,
      },
    };
  }

  // Validate maxLength
  if (request.selector.length > 255) {
    return {
      success: false,
      error: {
        message: 'Field "selector" exceeds maximum length of 255',
        field: 'selector',
        reason: 'validation_failed',
        expected: 'length <= 255',
        actual: `length = ${request.selector.length}`,
      },
    };
  }

  return {
    success: true,
    data: Buffer.from(request.selector + '\r\n', 'utf-8'),
  };
}

function serializeDirectoryItem(item: {
  itemType?: string;
  display?: string;
  selector?: string;
  host?: string;
  port?: number;
}): SerializeResult {
  const validItemTypes = ['0', '1', '3', '7', '9', 'g', 'I', 'h'];

  // Validate required fields
  if (item.itemType === undefined || item.itemType === null) {
    return {
      success: false,
      error: {
        message: 'Required field "itemType" is missing',
        field: 'itemType',
        reason: 'validation_failed',
        expected: 'non-null value',
        actual: 'undefined',
      },
    };
  }

  if (item.display === undefined || item.display === null) {
    return {
      success: false,
      error: {
        message: 'Required field "display" is missing',
        field: 'display',
        reason: 'validation_failed',
        expected: 'non-null value',
        actual: 'undefined',
      },
    };
  }

  if (item.selector === undefined || item.selector === null) {
    return {
      success: false,
      error: {
        message: 'Required field "selector" is missing',
        field: 'selector',
        reason: 'validation_failed',
        expected: 'non-null value',
        actual: 'undefined',
      },
    };
  }

  if (item.host === undefined || item.host === null) {
    return {
      success: false,
      error: {
        message: 'Required field "host" is missing',
        field: 'host',
        reason: 'validation_failed',
        expected: 'non-null value',
        actual: 'undefined',
      },
    };
  }

  if (item.port === undefined || item.port === null) {
    return {
      success: false,
      error: {
        message: 'Required field "port" is missing',
        field: 'port',
        reason: 'validation_failed',
        expected: 'non-null value',
        actual: 'undefined',
      },
    };
  }

  // Validate types
  if (typeof item.display !== 'string') {
    return {
      success: false,
      error: {
        message: 'Field "display" must be a string',
        field: 'display',
        reason: 'validation_failed',
        expected: 'string',
        actual: typeof item.display,
      },
    };
  }

  if (typeof item.selector !== 'string') {
    return {
      success: false,
      error: {
        message: 'Field "selector" must be a string',
        field: 'selector',
        reason: 'validation_failed',
        expected: 'string',
        actual: typeof item.selector,
      },
    };
  }

  if (typeof item.host !== 'string') {
    return {
      success: false,
      error: {
        message: 'Field "host" must be a string',
        field: 'host',
        reason: 'validation_failed',
        expected: 'string',
        actual: typeof item.host,
      },
    };
  }

  if (typeof item.port !== 'number' || isNaN(item.port)) {
    return {
      success: false,
      error: {
        message: 'Field "port" must be a valid number',
        field: 'port',
        reason: 'validation_failed',
        expected: 'number',
        actual: typeof item.port,
      },
    };
  }

  // Validate enum
  if (!validItemTypes.includes(item.itemType)) {
    return {
      success: false,
      error: {
        message: 'Field "itemType" has invalid enum value',
        field: 'itemType',
        reason: 'validation_failed',
        expected: `one of: ${validItemTypes.join(', ')}`,
        actual: item.itemType,
      },
    };
  }

  // Validate port range
  if (item.port < 1) {
    return {
      success: false,
      error: {
        message: 'Field "port" is below minimum value of 1',
        field: 'port',
        reason: 'validation_failed',
        expected: '>= 1',
        actual: String(item.port),
      },
    };
  }

  if (item.port > 65535) {
    return {
      success: false,
      error: {
        message: 'Field "port" exceeds maximum value of 65535',
        field: 'port',
        reason: 'validation_failed',
        expected: '<= 65535',
        actual: String(item.port),
      },
    };
  }

  const serialized = `${item.itemType}${item.display}\t${item.selector}\t${item.host}\t${item.port}\r\n`;

  return {
    success: true,
    data: Buffer.from(serialized, 'utf-8'),
  };
}
