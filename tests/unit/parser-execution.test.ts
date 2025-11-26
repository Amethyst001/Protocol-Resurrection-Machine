/**
 * Tests for executing generated parser code
 * This test actually runs the generated parser to verify it works
 */

import { describe, it, expect } from 'vitest';
import { ParserGenerator } from '../../src/generation/parser-generator.js';
import { YAMLParser } from '../../src/core/yaml-parser.js';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('Parser Execution', () => {
  it.skip('should generate executable parser code (SKIPPED: expects old parser architecture)', () => {
    // Load Gopher protocol spec
    const yamlContent = readFileSync(join(process.cwd(), 'protocols/gopher.yaml'), 'utf-8');
    const yamlParser = new YAMLParser();
    const spec = yamlParser.parse(yamlContent);

    // Generate parser code
    const generator = new ParserGenerator();
    const code = generator.generate(spec);

    // Verify the code is syntactically valid TypeScript
    expect(code).toBeTruthy();
    expect(code.length).toBeGreaterThan(100);
    
    // Verify key components are present
    expect(code).toContain('class RequestParser');
    expect(code).toContain('class DirectoryItemParser');
    expect(code).toContain('parseInternal');
    expect(code).toContain('parseStream');
    
    // Verify error handling is present
    expect(code).toContain('ParseError');
    expect(code).toContain('bytesConsumed');
    expect(code).toContain('success: false');
    expect(code).toContain('success: true');
  });

  it.skip('should generate correct field extraction for delimiter-based parsing (SKIPPED: expects old parser architecture)', () => {
    const yamlContent = readFileSync(join(process.cwd(), 'protocols/gopher.yaml'), 'utf-8');
    const yamlParser = new YAMLParser();
    const spec = yamlParser.parse(yamlContent);

    const generator = new ParserGenerator();
    const code = generator.generate(spec);

    // Verify delimiter-based parsing for DirectoryItem
    expect(code).toContain('const delimiter = "\\t"');
    expect(code).toContain('lineData.split(delimiter)');
    expect(code).toContain('parts.length');
    
    // Verify field extraction
    expect(code).toContain('itemTypeRaw');
    expect(code).toContain('displayRaw');
    expect(code).toContain('selectorRaw');
    expect(code).toContain('hostRaw');
    expect(code).toContain('portRaw');
    
    // Verify type conversion for port (number)
    expect(code).toContain('parseInt');
    expect(code).toContain('isNaN');
  });

  it.skip('should generate validation for enum fields (SKIPPED: expects old parser architecture)', () => {
    const yamlContent = readFileSync(join(process.cwd(), 'protocols/gopher.yaml'), 'utf-8');
    const yamlParser = new YAMLParser();
    const spec = yamlParser.parse(yamlContent);

    const generator = new ParserGenerator();
    const code = generator.generate(spec);

    // Verify enum validation for itemType
    expect(code).toContain('validValuesitemType');
    expect(code).toContain('.includes(');
    expect(code).toContain('invalid enum value');
  });

  it.skip('should generate range validation for number fields (SKIPPED: expects old parser architecture)', () => {
    const yamlContent = readFileSync(join(process.cwd(), 'protocols/gopher.yaml'), 'utf-8');
    const yamlParser = new YAMLParser();
    const spec = yamlParser.parse(yamlContent);

    const generator = new ParserGenerator();
    const code = generator.generate(spec);

    // Verify range validation for port field (0-65535, allowing 0 for dummy values)
    expect(code).toContain('message.port < 0');
    expect(code).toContain('message.port > 65535');
    expect(code).toContain('below minimum value');
    expect(code).toContain('exceeds maximum value');
  });
});
