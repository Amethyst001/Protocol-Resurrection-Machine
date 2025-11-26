/**
 * Integration tests for DIC protocol with complex format strings
 * Tests: Fixed strings, delimiters, optional sections
 */

import { describe, it, expect } from 'vitest';
import { RequestParser, ResponseParser } from '../../generated/dic/dic/dic-parser.js';
import { RequestSerializer, ResponseSerializer } from '../../generated/dic/dic/dic-serializer.js';
import type { Request, Response } from '../../generated/dic/dic/dic-parser.js';

describe('DIC Protocol - Complex Format Handling', () => {
  describe('Request Parser', () => {
    const parser = new RequestParser();

    it('should parse request with all fields including optional', () => {
      const data = Buffer.from('START 123 | test payload [TIMEOUT:30]\n\n', 'utf-8');
      const result = parser.parse(data);

      expect(result.success).toBe(true);
      expect(result.message).toBeDefined();
      expect(result.message?.id).toBe(123);
      expect(result.message?.payload).toBe('test payload ');
      expect(result.message?.seconds).toBe(30);
    });

    it('should parse request without optional timeout', () => {
      const data = Buffer.from('START 456 | another payload\n\n', 'utf-8');
      const result = parser.parse(data);

      expect(result.success).toBe(true);
      expect(result.message).toBeDefined();
      expect(result.message?.id).toBe(456);
      expect(result.message?.payload).toBe('another payload');
      expect(result.message?.seconds).toBeUndefined();
    });

    it('should handle fixed prefix "START "', () => {
      const data = Buffer.from('WRONG 123 | payload\n\n', 'utf-8');
      const result = parser.parse(data);

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('START');
    });

    it('should handle delimiter " | "', () => {
      const data = Buffer.from('START 123 WRONG payload\n\n', 'utf-8');
      const result = parser.parse(data);

      expect(result.success).toBe(false);
    });

    it('should handle terminator "\\n\\n"', () => {
      const data = Buffer.from('START 123 | payload\n', 'utf-8');
      const result = parser.parse(data);

      expect(result.success).toBe(false);
    });

    it('should handle optional section prefix "TIMEOUT:"', () => {
      const data = Buffer.from('START 123 | payload [WRONG:30]\n\n', 'utf-8');
      const result = parser.parse(data);

      // Should still succeed but without the optional field
      expect(result.success).toBe(true);
      expect(result.message?.seconds).toBeUndefined();
    });
  });

  describe('Response Parser', () => {
    const parser = new ResponseParser();

    it('should parse simple response', () => {
      const data = Buffer.from('OK success\n', 'utf-8');
      const result = parser.parse(data);

      expect(result.success).toBe(true);
      expect(result.message).toBeDefined();
      expect(result.message?.status).toBe('success');
    });

    it('should handle fixed prefix "OK "', () => {
      const data = Buffer.from('ERROR failure\n', 'utf-8');
      const result = parser.parse(data);

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('OK');
    });
  });

  describe('Round-trip Tests', () => {
    const requestParser = new RequestParser();
    const requestSerializer = new RequestSerializer();
    const responseParser = new ResponseParser();
    const responseSerializer = new ResponseSerializer();

    it('should round-trip request with optional field', () => {
      const original: Request = {
        id: 789,
        payload: 'test data',
        seconds: 60
      };

      const serialized = requestSerializer.serialize(original);
      expect(serialized.success).toBe(true);
      expect(serialized.data).toBeDefined();

      const parsed = requestParser.parse(serialized.data!);
      expect(parsed.success).toBe(true);
      expect(parsed.message).toEqual(original);
    });

    it('should round-trip request without optional field', () => {
      const original: Request = {
        id: 999,
        payload: 'minimal data'
      };

      const serialized = requestSerializer.serialize(original);
      expect(serialized.success).toBe(true);

      const parsed = requestParser.parse(serialized.data!);
      expect(parsed.success).toBe(true);
      expect(parsed.message?.id).toBe(original.id);
      expect(parsed.message?.payload).toBe(original.payload);
      expect(parsed.message?.seconds).toBeUndefined();
    });

    it('should round-trip response', () => {
      const original: Response = {
        status: 'completed'
      };

      const serialized = responseSerializer.serialize(original);
      expect(serialized.success).toBe(true);

      const parsed = responseParser.parse(serialized.data!);
      expect(parsed.success).toBe(true);
      expect(parsed.message).toEqual(original);
    });
  });

  describe('Edge Cases', () => {
    const parser = new RequestParser();

    it('should handle empty payload', () => {
      const data = Buffer.from('START 1 | \n\n', 'utf-8');
      const result = parser.parse(data);

      expect(result.success).toBe(true);
      expect(result.message?.payload).toBe('');
    });

    it('should handle payload with special characters', () => {
      const data = Buffer.from('START 2 | payload with | pipes\n\n', 'utf-8');
      const result = parser.parse(data);

      expect(result.success).toBe(true);
      expect(result.message?.payload).toContain('|');
    });

    it('should handle zero timeout', () => {
      const data = Buffer.from('START 3 | payload [TIMEOUT:0]\n\n', 'utf-8');
      const result = parser.parse(data);

      expect(result.success).toBe(true);
      expect(result.message?.seconds).toBe(0);
    });
  });
});
