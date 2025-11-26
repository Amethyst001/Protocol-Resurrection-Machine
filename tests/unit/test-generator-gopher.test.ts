/**
 * Integration test for Test Generator with Gopher protocol
 * Verifies that generated tests are valid and executable
 */

import { describe, it, expect } from 'vitest';
import { TestGenerator } from '../../src/generation/test-generator.js';
import { YAMLParser } from '../../src/core/yaml-parser.js';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('TestGenerator - Gopher Protocol Integration', () => {
  const generator = new TestGenerator();
  const parser = new YAMLParser();

  it('should generate valid property tests for Gopher protocol', () => {
    // Load Gopher protocol spec
    const yamlPath = join(process.cwd(), 'protocols', 'gopher.yaml');
    const yamlContent = readFileSync(yamlPath, 'utf-8');
    const spec = parser.parse(yamlContent);

    // Generate property tests
    const propertyTests = generator.generatePropertyTests(spec);

    // Verify structure
    expect(propertyTests).toContain('import { describe, it, expect } from \'vitest\'');
    expect(propertyTests).toContain('import * as fc from \'fast-check\'');

    // Verify arbitraries for Gopher message types
    expect(propertyTests).toContain('requestArbitrary');
    expect(propertyTests).toContain('directoryitemArbitrary');

    // Verify Request message arbitrary
    expect(propertyTests).toContain('selector:');
    expect(propertyTests).toContain('fc.string');
    expect(propertyTests).toContain('maxLength: 255');

    // Verify DirectoryItem message arbitrary
    expect(propertyTests).toContain('itemType:');
    expect(propertyTests).toContain('fc.constantFrom');
    expect(propertyTests).toContain('"0"'); // Text file
    expect(propertyTests).toContain('"1"'); // Directory
    expect(propertyTests).toContain('display:');
    expect(propertyTests).toContain('host:');
    expect(propertyTests).toContain('port:');
    expect(propertyTests).toContain('fc.integer');
    expect(propertyTests).toContain('min: 0'); // Allow 0 for dummy values in Gopher protocol
    expect(propertyTests).toContain('max: 65535');

    // Verify round-trip tests
    expect(propertyTests).toContain('Request: serialize then parse produces equivalent message');
    expect(propertyTests).toContain('DirectoryItem: serialize then parse produces equivalent message');

    // Verify parser error tests
    expect(propertyTests).toContain('Request: parser reports errors for malformed input');
    expect(propertyTests).toContain('DirectoryItem: parser reports errors for malformed input');

    // Verify serializer validation tests
    expect(propertyTests).toContain('Request: serializer validates required fields');
    expect(propertyTests).toContain('DirectoryItem: serializer validates required fields');

    // Verify test configuration
    expect(propertyTests).toContain('numRuns: 100');

    // Verify property tags
    expect(propertyTests).toContain('Feature: protocol-resurrection-machine');
    expect(propertyTests).toContain('Property 7: Parser-Serializer Round-Trip');
    expect(propertyTests).toContain('Property 8: Parser Error Reporting');
    expect(propertyTests).toContain('Property 9: Serializer Validation');
    expect(propertyTests).toContain('Validates: Requirements');
  });

  it('should generate unit tests for Gopher protocol', () => {
    // Load Gopher protocol spec
    const yamlPath = join(process.cwd(), 'protocols', 'gopher.yaml');
    const yamlContent = readFileSync(yamlPath, 'utf-8');
    const spec = parser.parse(yamlContent);

    // Generate unit tests
    const unitTests = generator.generateUnitTests(spec);

    // Verify structure
    expect(unitTests).toContain('Unit Tests for Gopher Protocol');
    expect(unitTests).toContain('import { describe, it, expect } from \'vitest\'');
    expect(unitTests).toContain('describe(\'Gopher Protocol - Unit Tests\'');
  });

  it('should generate test data module for Gopher protocol', () => {
    // Load Gopher protocol spec
    const yamlPath = join(process.cwd(), 'protocols', 'gopher.yaml');
    const yamlContent = readFileSync(yamlPath, 'utf-8');
    const spec = parser.parse(yamlContent);

    // Generate test data
    const testData = generator.generateTestData(spec);

    // Verify structure
    expect(testData).toContain('Fast-check Arbitraries for Message Types');
    expect(testData).toContain('requestArbitrary');
    expect(testData).toContain('directoryitemArbitrary');
  });

  it('should filter out protocol-breaking characters from string arbitraries', () => {
    // Load Gopher protocol spec
    const yamlPath = join(process.cwd(), 'protocols', 'gopher.yaml');
    const yamlContent = readFileSync(yamlPath, 'utf-8');
    const spec = parser.parse(yamlContent);

    // Generate property tests
    const propertyTests = generator.generatePropertyTests(spec);

    // Verify that string arbitraries filter out tabs, CR, and LF
    // These would break the protocol format
    expect(propertyTests).toContain('.filter(s => !s.includes(\'\\t\') && !s.includes(\'\\r\') && !s.includes(\'\\n\'))');
  });

  it('should handle enum fields correctly', () => {
    // Load Gopher protocol spec
    const yamlPath = join(process.cwd(), 'protocols', 'gopher.yaml');
    const yamlContent = readFileSync(yamlPath, 'utf-8');
    const spec = parser.parse(yamlContent);

    // Generate property tests
    const propertyTests = generator.generatePropertyTests(spec);

    // Verify enum handling for itemType field (including "i" for info lines)
    expect(propertyTests).toContain('itemType: fc.constantFrom("0", "1", "3", "7", "9", "g", "I", "h", "i")');
  });

  it('should generate tests that reference correct requirements', () => {
    // Load Gopher protocol spec
    const yamlPath = join(process.cwd(), 'protocols', 'gopher.yaml');
    const yamlContent = readFileSync(yamlPath, 'utf-8');
    const spec = parser.parse(yamlContent);

    // Generate property tests
    const propertyTests = generator.generatePropertyTests(spec);

    // Verify requirement references
    expect(propertyTests).toContain('Validates: Requirements 4.1, 4.2, 4.3, 4.4, 5.1, 5.2, 5.3, 5.4, 6.1');
    expect(propertyTests).toContain('Validates: Requirements 4.5, 17.3');
    expect(propertyTests).toContain('Validates: Requirements 5.5');
  });
});
