/**
 * Unit tests for CodeGenerator orchestration
 */

import { describe, it, expect } from 'vitest';
import { CodeGenerator } from '../../src/generation/code-generator.js';
import type { ProtocolSpec } from '../../src/types/protocol-spec.js';

describe('CodeGenerator', () => {
  const simpleSpec: ProtocolSpec = {
    protocol: {
      name: 'TestProtocol',
      port: 1234,
      description: 'A simple test protocol',
    },
    connection: {
      type: 'TCP',
    },
    messageTypes: [
      {
        name: 'TestRequest',
        direction: 'request',
        format: '{message}',
        fields: [
          {
            name: 'message',
            type: { kind: 'string' },
            required: true,
          },
        ],
        terminator: '\r\n',
      },
    ],
  };

  describe('generateAll', () => {
    it('should generate all artifacts', async () => {
      const generator = new CodeGenerator();
      const artifacts = await generator.generateAll(simpleSpec);

      expect(artifacts).toBeDefined();
      expect(artifacts.parser).toBeDefined();
      expect(artifacts.serializer).toBeDefined();
      expect(artifacts.propertyTests).toBeDefined();
      expect(artifacts.unitTests).toBeDefined();
      expect(artifacts.testData).toBeDefined();

      // Verify parser contains expected content
      expect(artifacts.parser).toContain('TestProtocol');
      expect(artifacts.parser).toContain('TestRequest');
      expect(artifacts.parser).toContain('ParseResult');

      // Verify serializer contains expected content
      expect(artifacts.serializer).toContain('TestProtocol');
      expect(artifacts.serializer).toContain('TestRequest');
      expect(artifacts.serializer).toContain('SerializeResult');

      // Verify tests contain expected content
      expect(artifacts.propertyTests).toContain('fast-check');
      expect(artifacts.propertyTests).toContain('TestRequest');
    });

    it('should format code by default', async () => {
      const generator = new CodeGenerator();
      const artifacts = await generator.generateAll(simpleSpec);

      // Check that code is formatted (has consistent indentation)
      expect(artifacts.parser).toMatch(/\n {2}\w/); // 2-space indentation
      expect(artifacts.serializer).toMatch(/\n {2}\w/);
    });

    it('should skip formatting when requested', async () => {
      const generator = new CodeGenerator();
      const artifacts = await generator.generateAll(simpleSpec, { format: false });

      expect(artifacts).toBeDefined();
      expect(artifacts.parser).toBeDefined();
      expect(artifacts.serializer).toBeDefined();
    });
  });

  describe('generateParser', () => {
    it('should generate parser code only', async () => {
      const generator = new CodeGenerator();
      const parser = await generator.generateParser(simpleSpec);

      expect(parser).toBeDefined();
      expect(parser).toContain('TestProtocol');
      expect(parser).toContain('TestRequest');
      expect(parser).toContain('ParseResult');
    });
  });

  describe('generateSerializer', () => {
    it('should generate serializer code only', async () => {
      const generator = new CodeGenerator();
      const serializer = await generator.generateSerializer(simpleSpec);

      expect(serializer).toBeDefined();
      expect(serializer).toContain('TestProtocol');
      expect(serializer).toContain('TestRequest');
      expect(serializer).toContain('SerializeResult');
    });
  });

  describe('generateTests', () => {
    it('should generate test code only', async () => {
      const generator = new CodeGenerator();
      const tests = await generator.generateTests(simpleSpec);

      expect(tests).toBeDefined();
      expect(tests.propertyTests).toBeDefined();
      expect(tests.unitTests).toBeDefined();
      expect(tests.testData).toBeDefined();

      expect(tests.propertyTests).toContain('fast-check');
      expect(tests.propertyTests).toContain('TestRequest');
    });
  });

  describe('validateCodeSyntax', () => {
    it('should validate balanced braces', () => {
      const generator = new CodeGenerator();

      expect(generator.validateCodeSyntax('{ }')).toBe(true);
      expect(generator.validateCodeSyntax('{ { } }')).toBe(true);
      expect(generator.validateCodeSyntax('{ ')).toBe(false);
      expect(generator.validateCodeSyntax('} {')).toBe(false);
    });

    it('should validate balanced parentheses', () => {
      const generator = new CodeGenerator();

      expect(generator.validateCodeSyntax('( )')).toBe(true);
      expect(generator.validateCodeSyntax('( ( ) )')).toBe(true);
      expect(generator.validateCodeSyntax('( ')).toBe(false);
      expect(generator.validateCodeSyntax(') (')).toBe(false);
    });

    it('should validate balanced brackets', () => {
      const generator = new CodeGenerator();

      expect(generator.validateCodeSyntax('[ ]')).toBe(true);
      expect(generator.validateCodeSyntax('[ [ ] ]')).toBe(true);
      expect(generator.validateCodeSyntax('[ ')).toBe(false);
      expect(generator.validateCodeSyntax('] [')).toBe(false);
    });

    it('should ignore brackets in strings', () => {
      const generator = new CodeGenerator();

      expect(generator.validateCodeSyntax('"{"')).toBe(true);
      expect(generator.validateCodeSyntax("'('")).toBe(true);
      expect(generator.validateCodeSyntax('`[`')).toBe(true);
    });

    it('should ignore brackets in comments', () => {
      const generator = new CodeGenerator();

      expect(generator.validateCodeSyntax('// {')).toBe(true);
      expect(generator.validateCodeSyntax('/* ( */')).toBe(true);
    });
  });

  describe('getProtocolDirectory', () => {
    it('should return protocol-specific directory', () => {
      const generator = new CodeGenerator();
      const dir = generator.getProtocolDirectory(simpleSpec, '/output');

      expect(dir).toContain('testprotocol');
      expect(dir).toContain('output');
    });

    it('should handle protocol names with spaces', () => {
      const generator = new CodeGenerator();
      const spec: ProtocolSpec = {
        ...simpleSpec,
        protocol: {
          ...simpleSpec.protocol,
          name: 'Test Protocol',
        },
      };

      const dir = generator.getProtocolDirectory(spec, '/output');
      expect(dir).toContain('test-protocol');
      expect(dir).not.toContain(' ');
    });
  });

  describe('getExpectedFilePaths', () => {
    it('should return all expected file paths', () => {
      const generator = new CodeGenerator();
      const paths = generator.getExpectedFilePaths(simpleSpec, '/output');

      expect(paths).toBeDefined();
      expect(paths.length).toBeGreaterThan(0);

      // Should include parser and serializer
      expect(paths.some((p) => p.includes('parser'))).toBe(true);
      expect(paths.some((p) => p.includes('serializer'))).toBe(true);

      // Should include tests
      expect(paths.some((p) => p.includes('test'))).toBe(true);

      // Should include extensions
      expect(paths.some((p) => p.includes('extensions'))).toBe(true);
    });
  });
});
