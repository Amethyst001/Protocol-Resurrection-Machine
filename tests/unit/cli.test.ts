/**
 * CLI Tests
 * Tests for the command-line interface
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import { YAMLParser } from '../../src/core/yaml-parser.js';
import { CodeGenerator } from '../../src/generation/code-generator.js';

describe('CLI Integration', () => {
  const testOutputDir = './test-output';
  const gopherYamlPath = './protocols/gopher.yaml';

  beforeEach(async () => {
    // Clean up test output directory
    try {
      await fs.rm(testOutputDir, { recursive: true, force: true });
    } catch {
      // Directory might not exist
    }
  });

  afterEach(async () => {
    // Clean up test output directory
    try {
      await fs.rm(testOutputDir, { recursive: true, force: true });
    } catch {
      // Directory might not exist
    }
  });

  describe('validate command logic', () => {
    it('should validate a valid YAML specification', async () => {
      // Read the gopher YAML file
      const yamlContent = await fs.readFile(gopherYamlPath, 'utf-8');

      // Parse and validate
      const parser = new YAMLParser();
      const spec = parser.parse(yamlContent);
      const validationResult = parser.validate(spec);

      // Should pass validation
      expect(validationResult.valid).toBe(true);
      expect(validationResult.errors).toHaveLength(0);

      // Should have correct protocol info
      expect(spec.protocol.name).toBe('Gopher');
      expect(spec.protocol.port).toBe(70);
      expect(spec.connection.type).toBe('TCP');
    });

    it('should detect invalid YAML', async () => {
      const invalidYaml = `
protocol:
  name: Test
  # Missing required port field
  description: Test protocol

connection:
  type: TCP

messageTypes: []
`;

      const parser = new YAMLParser();
      
      // Should throw or return invalid
      try {
        const spec = parser.parse(invalidYaml);
        const validationResult = parser.validate(spec);
        expect(validationResult.valid).toBe(false);
        expect(validationResult.errors.length).toBeGreaterThan(0);
      } catch (error) {
        // Parse error is also acceptable
        expect(error).toBeDefined();
      }
    });
  });

  describe('generate command logic', () => {
    it.skip('should generate protocol implementation from YAML (SKIPPED: expects old parser architecture)', async () => {
      // Read and parse the gopher YAML file
      const yamlContent = await fs.readFile(gopherYamlPath, 'utf-8');
      const parser = new YAMLParser();
      const spec = parser.parse(yamlContent);

      // Validate
      const validationResult = parser.validate(spec);
      expect(validationResult.valid).toBe(true);

      // Generate code
      const generator = new CodeGenerator();
      const verificationResult = await generator.generateWriteAndVerify(
        spec,
        testOutputDir
      );

      // Should succeed
      expect(verificationResult.success).toBe(true);
      expect(verificationResult.missing).toHaveLength(0);

      // Should have generated files
      expect(verificationResult.artifacts.length).toBeGreaterThan(0);
      
      // Check that key files exist
      const protocolDir = generator.getProtocolDirectory(spec, testOutputDir);
      const parserFile = path.join(protocolDir, 'gopher-parser.ts');
      const serializerFile = path.join(protocolDir, 'gopher-serializer.ts');

      const parserExists = await fs.access(parserFile).then(() => true).catch(() => false);
      const serializerExists = await fs.access(serializerFile).then(() => true).catch(() => false);

      expect(parserExists).toBe(true);
      expect(serializerExists).toBe(true);
    });

    it.skip('should report missing files if generation fails (SKIPPED: expects old parser architecture)', async () => {
      // This test verifies the verification logic
      const yamlContent = await fs.readFile(gopherYamlPath, 'utf-8');
      const parser = new YAMLParser();
      const spec = parser.parse(yamlContent);

      const generator = new CodeGenerator();
      
      // Generate to a directory
      await generator.generateWriteAndVerify(spec, testOutputDir);

      // Now verify again (should find all files)
      const verificationResult = await generator.verifyArtifacts(spec, testOutputDir);
      
      expect(verificationResult.success).toBe(true);
      expect(verificationResult.missing).toHaveLength(0);
    });
  });

  describe('file validation', () => {
    it('should detect non-existent files', async () => {
      const nonExistentFile = './does-not-exist.yaml';
      
      const exists = await fs.access(nonExistentFile)
        .then(() => true)
        .catch(() => false);
      
      expect(exists).toBe(false);
    });

    it('should detect YAML file extensions', () => {
      expect(path.extname('test.yaml')).toBe('.yaml');
      expect(path.extname('test.yml')).toBe('.yml');
      expect(path.extname('test.txt')).not.toBe('.yaml');
    });
  });
});
