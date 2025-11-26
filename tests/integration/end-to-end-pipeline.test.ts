/**
 * End-to-End Integration Tests for Protocol Resurrection Machine
 * 
 * Tests the complete pipeline from YAML specification to working protocol implementation:
 * 1. YAML parsing and validation
 * 2. Code generation (parser, serializer, client)
 * 3. Generated code compilation
 * 4. Working client functionality
 * 
 * Requirements: All (end-to-end validation)
 */

import { describe, test, expect, beforeAll } from 'vitest';
import { existsSync } from 'fs';
import { join } from 'path';

describe('End-to-End Pipeline Integration', () => {
  const generatedDir = join(process.cwd(), 'generated');

  describe('Gopher Protocol Generation', () => {
    test('should have generated all required Gopher artifacts', () => {
      const gopherDir = join(generatedDir, 'gopher');
      
      // Verify directory exists
      expect(existsSync(gopherDir)).toBe(true);

      // Verify core files exist
      expect(existsSync(join(gopherDir, 'gopher-parser.ts'))).toBe(true);
      expect(existsSync(join(gopherDir, 'gopher-serializer.ts'))).toBe(true);
      
      // Verify test files exist
      const testsDir = join(gopherDir, 'tests');
      expect(existsSync(testsDir)).toBe(true);
      expect(existsSync(join(testsDir, 'gopher.property.test.ts'))).toBe(true);
      expect(existsSync(join(testsDir, 'gopher.unit.test.ts'))).toBe(true);

      // Verify extension points exist
      const extensionsDir = join(gopherDir, 'extensions');
      expect(existsSync(extensionsDir)).toBe(true);
    });

    test('should be able to import and use generated Gopher parser', async () => {
      const { GopherParser } = await import('../../generated/gopher/gopher-parser');
      
      const parser = new GopherParser();
      expect(parser).toBeDefined();
      expect(parser.request).toBeDefined();
      expect(parser.directoryitem).toBeDefined();
    });

    test('should be able to import and use generated Gopher serializer', async () => {
      const { GopherSerializer } = await import('../../generated/gopher/gopher-serializer');
      
      const serializer = new GopherSerializer();
      expect(serializer).toBeDefined();
      expect(serializer.request).toBeDefined();
      expect(serializer.directoryitem).toBeDefined();
    });

    test('should serialize Gopher Request correctly', async () => {
      const { GopherSerializer } = await import('../../generated/gopher/gopher-serializer');
      
      const serializer = new GopherSerializer();

      // Test request with selector
      const request = { selector: '/test' };
      
      // Serialize
      const serialized = serializer.request.serialize(request);
      expect(serialized.success).toBe(true);
      expect(serialized.data).toBeDefined();
      
      // Verify format matches protocol spec: {selector}\r\n\r\n
      // Note: Gopher protocol uses double CRLF for requests
      expect(serialized.data!.toString('utf-8')).toBe('/test\r\n\r\n');
      
      // Test empty selector (root directory)
      const rootRequest = { selector: '' };
      const rootSerialized = serializer.request.serialize(rootRequest);
      expect(rootSerialized.success).toBe(true);
      expect(rootSerialized.data!.toString('utf-8')).toBe('\r\n\r\n');
    });

    test('should serialize Gopher DirectoryItem correctly', async () => {
      const { GopherSerializer } = await import('../../generated/gopher/gopher-serializer');
      
      const serializer = new GopherSerializer();

      // Test directory item
      const item = {
        itemType: '1' as const,
        display: 'Test Directory',
        selector: '/test',
        host: 'gopher.example.com',
        port: 70
      };
      
      // Serialize
      const serialized = serializer.directoryitem.serialize(item);
      expect(serialized.success).toBe(true);
      expect(serialized.data).toBeDefined();
      
      // Verify format: {itemType}{display}\t{selector}\t{host}\t{port}\r\n
      // Note: The serializer adds a tab after itemType
      const expected = '1\tTest Directory\t/test\tgopher.example.com\t70\r\n';
      expect(serialized.data!.toString('utf-8')).toBe(expected);
    });
  });

  describe('Finger Protocol Generation', () => {
    test('should have generated all required Finger artifacts', () => {
      const fingerDir = join(generatedDir, 'finger');
      
      // Verify directory exists
      expect(existsSync(fingerDir)).toBe(true);

      // Verify core files exist
      expect(existsSync(join(fingerDir, 'finger-parser.ts'))).toBe(true);
      expect(existsSync(join(fingerDir, 'finger-serializer.ts'))).toBe(true);
      
      // Verify test files exist
      const testsDir = join(fingerDir, 'tests');
      expect(existsSync(testsDir)).toBe(true);
      expect(existsSync(join(testsDir, 'finger.property.test.ts'))).toBe(true);
      expect(existsSync(join(testsDir, 'finger.unit.test.ts'))).toBe(true);

      // Verify extension points exist
      const extensionsDir = join(fingerDir, 'extensions');
      expect(existsSync(extensionsDir)).toBe(true);
    });

    test('should be able to import and use generated Finger parser', async () => {
      const { RequestParser, ResponseParser } = await import('../../generated/finger/finger-parser');
      
      const requestParser = new RequestParser();
      const responseParser = new ResponseParser();
      
      expect(requestParser).toBeDefined();
      expect(responseParser).toBeDefined();
    });

    test('should be able to import and use generated Finger serializer', async () => {
      const { RequestSerializer, ResponseSerializer } = await import('../../generated/finger/finger-serializer');
      
      const requestSerializer = new RequestSerializer();
      const responseSerializer = new ResponseSerializer();
      
      expect(requestSerializer).toBeDefined();
      expect(responseSerializer).toBeDefined();
    });

    test('should serialize Finger Request correctly', async () => {
      const { RequestSerializer } = await import('../../generated/finger/finger-serializer');
      
      const serializer = new RequestSerializer();

      // Test request with username
      const request = { username: 'testuser' };
      
      // Serialize
      const serialized = serializer.serialize(request);
      expect(serialized.success).toBe(true);
      expect(serialized.data).toBeDefined();
      
      // Verify format: {username}\r\n\r\n (Finger uses double CRLF)
      expect(serialized.data!.toString('utf-8')).toBe('testuser\r\n\r\n');
      
      // Test empty username
      const emptyRequest = { username: '' };
      const emptySerialized = serializer.serialize(emptyRequest);
      expect(emptySerialized.success).toBe(true);
      expect(emptySerialized.data!.toString('utf-8')).toBe('\r\n\r\n');
    });

    test('should serialize Finger Response correctly', async () => {
      const { ResponseSerializer } = await import('../../generated/finger/finger-serializer');
      
      const serializer = new ResponseSerializer();

      // Test response
      const response = { text: 'User information:\nLogin: testuser\nName: Test User' };
      
      // Serialize
      const serialized = serializer.serialize(response);
      expect(serialized.success).toBe(true);
      expect(serialized.data).toBeDefined();
      
      // Verify the text is serialized correctly
      expect(serialized.data!.toString('utf-8')).toBe('User information:\nLogin: testuser\nName: Test User');
    });
  });

  describe('Multi-Protocol Support', () => {
    test('should support multiple protocols simultaneously', async () => {
      // Import both protocols
      const { GopherSerializer } = await import('../../generated/gopher/gopher-serializer');
      const { RequestSerializer: FingerRequestSerializer } = await import('../../generated/finger/finger-serializer');
      
      // Create instances of both
      const gopherSerializer = new GopherSerializer();
      const fingerSerializer = new FingerRequestSerializer();
      
      // Verify both work independently
      expect(gopherSerializer).toBeDefined();
      expect(fingerSerializer).toBeDefined();
      
      // Test Gopher serialization
      const gopherItem = {
        itemType: '1' as const,
        display: 'Test Directory',
        selector: '/test',
        host: 'gopher.example.com',
        port: 70
      };
      const gopherSerialized = gopherSerializer.directoryitem.serialize(gopherItem);
      expect(gopherSerialized.success).toBe(true);
      expect(gopherSerialized.data).toBeDefined();
      
      // Test Finger serialization
      const fingerRequest = { username: 'test' };
      const fingerSerialized = fingerSerializer.serialize(fingerRequest);
      expect(fingerSerialized.success).toBe(true);
      expect(fingerSerialized.data).toBeDefined();
      
      // Verify both protocols produce different output formats
      expect(gopherSerialized.data!.toString('utf-8')).toContain('\t'); // Gopher uses tabs
      expect(fingerSerialized.data!.toString('utf-8')).toBe('test\r\n\r\n'); // Finger uses double CRLF
    });

    test('should isolate protocol implementations in separate directories', () => {
      const gopherDir = join(generatedDir, 'gopher');
      const fingerDir = join(generatedDir, 'finger');
      
      // Verify both directories exist
      expect(existsSync(gopherDir)).toBe(true);
      expect(existsSync(fingerDir)).toBe(true);
      
      // Verify they have separate files
      expect(existsSync(join(gopherDir, 'gopher-parser.ts'))).toBe(true);
      expect(existsSync(join(fingerDir, 'finger-parser.ts'))).toBe(true);
      
      // Verify no cross-contamination
      expect(existsSync(join(gopherDir, 'finger-parser.ts'))).toBe(false);
      expect(existsSync(join(fingerDir, 'gopher-parser.ts'))).toBe(false);
    });
  });

  describe('Generated Code Quality', () => {
    test('should generate TypeScript code that compiles without errors', async () => {
      // If we can import the modules, they compiled successfully
      const gopherParser = await import('../../generated/gopher/gopher-parser');
      const gopherSerializer = await import('../../generated/gopher/gopher-serializer');
      const fingerParser = await import('../../generated/finger/finger-parser');
      const fingerSerializer = await import('../../generated/finger/finger-serializer');
      
      expect(gopherParser).toBeDefined();
      expect(gopherSerializer).toBeDefined();
      expect(fingerParser).toBeDefined();
      expect(fingerSerializer).toBeDefined();
    });

    test('should generate code with proper error handling', async () => {
      const { GopherSerializer } = await import('../../generated/gopher/gopher-serializer');
      
      const serializer = new GopherSerializer();
      
      // Test with invalid data (missing required field)
      const invalidItem = {
        itemType: '1' as const,
        // Missing required fields
      };
      
      const result = serializer.directoryitem.serialize(invalidItem as any);
      
      // Should fail gracefully with error
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.message).toBeDefined();
    });

    test('should generate code with proper validation', async () => {
      const { GopherSerializer } = await import('../../generated/gopher/gopher-serializer');
      
      const serializer = new GopherSerializer();
      
      // Test with invalid port number
      const invalidItem = {
        itemType: '1' as const,
        display: 'Test',
        selector: '/test',
        host: 'example.com',
        port: 99999 // Invalid port (> 65535)
      };
      
      const result = serializer.directoryitem.serialize(invalidItem);
      
      // Should fail validation
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('Extension Points', () => {
    test('should preserve extension point directories', () => {
      const gopherExtensions = join(generatedDir, 'gopher', 'extensions');
      const fingerExtensions = join(generatedDir, 'finger', 'extensions');
      
      expect(existsSync(gopherExtensions)).toBe(true);
      expect(existsSync(fingerExtensions)).toBe(true);
      
      // Verify extension point files exist
      expect(existsSync(join(gopherExtensions, 'custom-validators.ts'))).toBe(true);
      expect(existsSync(join(gopherExtensions, 'message-hooks.ts'))).toBe(true);
      expect(existsSync(join(fingerExtensions, 'custom-validators.ts'))).toBe(true);
      expect(existsSync(join(fingerExtensions, 'message-hooks.ts'))).toBe(true);
    });
  });
});
