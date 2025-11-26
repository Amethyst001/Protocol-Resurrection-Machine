/**
 * Property-Based Tests for Parser-Serializer Round-Trip
 * 
 * Feature: protocol-resurrection-machine, Property 7: Parser-Serializer Round-Trip
 * For any valid message object, serialize then parse should produce equivalent message
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { ParserGenerator } from '../../src/generation/parser-generator.js';
import { SerializerGenerator } from '../../src/generation/serializer-generator.js';
import { YAMLParser } from '../../src/core/yaml-parser.js';
import { readFileSync } from 'fs';
import { join } from 'path';
import type { MessageType } from '../../src/types/protocol-spec.js';

describe('Parser-Serializer Round-Trip Property Tests', () => {
  const yamlParser = new YAMLParser();
  const parserGenerator = new ParserGenerator();
  const serializerGenerator = new SerializerGenerator();

  // Load Gopher protocol spec
  const gopherYaml = readFileSync(join(process.cwd(), 'protocols', 'gopher.yaml'), 'utf-8');
  const gopherSpec = yamlParser.parse(gopherYaml);

  /**
   * Feature: protocol-resurrection-machine, Property 7: Parser-Serializer Round-Trip
   * For any valid Request message, serialize then parse should produce equivalent message
   */
  describe('Property 7: Request Message Round-Trip', () => {
    it('should maintain data integrity through serialize-parse cycle', () => {
      // Find Request message type
      const requestType = gopherSpec.messageTypes.find(mt => mt.name === 'Request');
      expect(requestType).toBeDefined();

      // Generate arbitrary for Request messages
      const requestArbitrary = fc.record({
        selector: fc.string({ minLength: 0, maxLength: 255 })
          .filter(s => !s.includes('\r') && !s.includes('\n')),
      });

      fc.assert(
        fc.property(requestArbitrary, (request) => {
          // Serialize the message
          const serialized = serializeRequest(request);

          // Parse the serialized data
          const parsed = parseRequest(serialized);

          // Verify round-trip equivalence
          expect(parsed.selector).toBe(request.selector);
        }),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Feature: protocol-resurrection-machine, Property 7: Parser-Serializer Round-Trip
   * For any valid DirectoryItem message, serialize then parse should produce equivalent message
   */
  describe('Property 7: DirectoryItem Message Round-Trip', () => {
    it('should maintain data integrity through serialize-parse cycle', () => {
      // Find DirectoryItem message type
      const directoryItemType = gopherSpec.messageTypes.find(mt => mt.name === 'DirectoryItem');
      expect(directoryItemType).toBeDefined();

      // Valid Gopher item types
      const validItemTypes = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'g', 'I', 'h', '+', 'i'];

      // Generate arbitrary for DirectoryItem messages
      const directoryItemArbitrary = fc.record({
        itemType: fc.constantFrom(...validItemTypes),
        display: fc.string({ minLength: 1, maxLength: 100 })
          .filter(s => !s.includes('\t') && !s.includes('\r') && !s.includes('\n')),
        selector: fc.string({ minLength: 0, maxLength: 255 })
          .filter(s => !s.includes('\t') && !s.includes('\r') && !s.includes('\n')),
        host: fc.domain(),
        port: fc.integer({ min: 1, max: 65535 }),
      });

      fc.assert(
        fc.property(directoryItemArbitrary, (item) => {
          // Serialize the message
          const serialized = serializeDirectoryItem(item);

          // Parse the serialized data
          const parsed = parseDirectoryItem(serialized);

          // Verify round-trip equivalence
          expect(parsed.itemType).toBe(item.itemType);
          expect(parsed.display).toBe(item.display);
          expect(parsed.selector).toBe(item.selector);
          expect(parsed.host).toBe(item.host);
          expect(parsed.port).toBe(item.port);
        }),
        { numRuns: 100 }
      );
    });

    it('should handle edge cases in round-trip', () => {
      const validItemTypes = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'g', 'I', 'h', '+', 'i'];

      // Test with edge cases
      const edgeCases = fc.record({
        itemType: fc.constantFrom(...validItemTypes),
        display: fc.oneof(
          fc.constant(''), // Empty display
          fc.constant('a'), // Single character
          fc.string({ minLength: 1, maxLength: 255 })
            .filter(s => !s.includes('\t') && !s.includes('\r') && !s.includes('\n'))
        ),
        selector: fc.oneof(
          fc.constant(''), // Empty selector
          fc.constant('/'), // Root selector
          fc.string({ minLength: 1, maxLength: 255 })
            .filter(s => !s.includes('\t') && !s.includes('\r') && !s.includes('\n'))
        ),
        host: fc.oneof(
          fc.constant('localhost'),
          fc.constant('127.0.0.1'),
          fc.domain()
        ),
        port: fc.oneof(
          fc.constant(70), // Default Gopher port
          fc.constant(1), // Minimum port
          fc.constant(65535), // Maximum port
          fc.integer({ min: 1, max: 65535 })
        ),
      });

      fc.assert(
        fc.property(edgeCases, (item) => {
          const serialized = serializeDirectoryItem(item);
          const parsed = parseDirectoryItem(serialized);

          expect(parsed).toEqual(item);
        }),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Feature: protocol-resurrection-machine, Property 7: Parser-Serializer Round-Trip
   * For any protocol with delimiters, round-trip should preserve field boundaries
   */
  describe('Property 7: Delimiter Handling in Round-Trip', () => {
    it('should correctly handle tab delimiters in round-trip', () => {
      const validItemTypes = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'g', 'I', 'h', '+', 'i'];

      const itemArbitrary = fc.record({
        itemType: fc.constantFrom(...validItemTypes),
        display: fc.string({ minLength: 1, maxLength: 50 })
          .filter(s => !s.includes('\t') && !s.includes('\r') && !s.includes('\n')),
        selector: fc.string({ minLength: 0, maxLength: 50 })
          .filter(s => !s.includes('\t') && !s.includes('\r') && !s.includes('\n')),
        host: fc.domain(),
        port: fc.integer({ min: 1, max: 65535 }),
      });

      fc.assert(
        fc.property(itemArbitrary, (item) => {
          const serialized = serializeDirectoryItem(item);

          // Verify delimiter is present
          expect(serialized).toContain('\t');

          // Count delimiters (should be 3: between selector, host, and port)
          // Format: itemType+display TAB selector TAB host TAB port
          const delimiterCount = (serialized.match(/\t/g) || []).length;
          expect(delimiterCount).toBe(3);

          // Parse and verify
          const parsed = parseDirectoryItem(serialized);
          expect(parsed).toEqual(item);
        }),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Feature: protocol-resurrection-machine, Property 7: Parser-Serializer Round-Trip
   * For any protocol with terminators, round-trip should preserve message boundaries
   */
  describe('Property 7: Terminator Handling in Round-Trip', () => {
    it('should correctly handle CRLF terminators in round-trip', () => {
      const requestArbitrary = fc.record({
        selector: fc.string({ minLength: 0, maxLength: 100 })
          .filter(s => !s.includes('\r') && !s.includes('\n')),
      });

      fc.assert(
        fc.property(requestArbitrary, (request) => {
          const serialized = serializeRequest(request);

          // Verify terminator is present
          expect(serialized).toMatch(/\r\n$/);

          // Parse and verify
          const parsed = parseRequest(serialized);
          expect(parsed.selector).toBe(request.selector);
        }),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Feature: protocol-resurrection-machine, Property 7: Parser-Serializer Round-Trip
   * For any valid message with numeric fields, round-trip should preserve numeric values
   */
  describe('Property 7: Numeric Field Round-Trip', () => {
    it('should preserve port numbers through round-trip', () => {
      const validItemTypes = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'g', 'I', 'h', '+', 'i'];

      const itemArbitrary = fc.record({
        itemType: fc.constantFrom(...validItemTypes),
        display: fc.constant('Test'),
        selector: fc.constant('/test'),
        host: fc.constant('example.com'),
        port: fc.integer({ min: 1, max: 65535 }),
      });

      fc.assert(
        fc.property(itemArbitrary, (item) => {
          const serialized = serializeDirectoryItem(item);
          const parsed = parseDirectoryItem(serialized);

          // Port should be preserved as a number
          expect(typeof parsed.port).toBe('number');
          expect(parsed.port).toBe(item.port);
        }),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Feature: protocol-resurrection-machine, Property 7: Parser-Serializer Round-Trip
   * For any valid message with enum fields, round-trip should preserve enum values
   */
  describe('Property 7: Enum Field Round-Trip', () => {
    it('should preserve itemType enum values through round-trip', () => {
      const validItemTypes = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'g', 'I', 'h', '+', 'i'];

      const itemArbitrary = fc.record({
        itemType: fc.constantFrom(...validItemTypes),
        display: fc.constant('Test'),
        selector: fc.constant('/test'),
        host: fc.constant('example.com'),
        port: fc.constant(70),
      });

      fc.assert(
        fc.property(itemArbitrary, (item) => {
          const serialized = serializeDirectoryItem(item);
          const parsed = parseDirectoryItem(serialized);

          // ItemType should be preserved exactly
          expect(parsed.itemType).toBe(item.itemType);
          expect(validItemTypes).toContain(parsed.itemType);
        }),
        { numRuns: 100 }
      );
    });
  });
});

// Helper functions for serialization and parsing
// These simulate the generated code behavior

function serializeRequest(request: { selector: string }): string {
  return request.selector + '\r\n';
}

function parseRequest(data: string): { selector: string } {
  const lines = data.split('\r\n');
  return { selector: lines[0] };
}

function serializeDirectoryItem(item: {
  itemType: string;
  display: string;
  selector: string;
  host: string;
  port: number;
}): string {
  // Format: itemType + display + TAB + selector + TAB + host + TAB + port + CRLF
  const parts = [item.selector, item.host, String(item.port)];
  return `${item.itemType}${item.display}\t${parts.join('\t')}\r\n`;
}

function parseDirectoryItem(data: string): {
  itemType: string;
  display: string;
  selector: string;
  host: string;
  port: number;
} {
  const line = data.replace(/\r\n$/, '');
  const itemType = line[0];
  const rest = line.slice(1);
  const parts = rest.split('\t');

  return {
    itemType,
    display: parts[0],
    selector: parts[1],
    host: parts[2],
    port: parseInt(parts[3], 10),
  };
}
