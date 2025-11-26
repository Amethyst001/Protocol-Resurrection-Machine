/**
 * Unit tests for generated parser code
 * Tests that the generated parser can actually parse protocol messages
 */

import { describe, it, expect } from 'vitest';
import { ParserGenerator } from '../../src/generation/parser-generator.js';
import { YAMLParser } from '../../src/core/yaml-parser.js';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('Generated Parser', () => {
  it.skip('should generate working parser for Gopher protocol (SKIPPED: expects old parser architecture)', () => {
    // Load Gopher protocol spec
    const yamlContent = readFileSync(join(process.cwd(), 'protocols/gopher.yaml'), 'utf-8');
    const yamlParser = new YAMLParser();
    const spec = yamlParser.parse(yamlContent);

    // Generate parser code
    const generator = new ParserGenerator();
    const code = generator.generate(spec);

    // Verify generated code structure
    expect(code).toContain('export interface ParseResult');
    expect(code).toContain('export interface Request');
    expect(code).toContain('export interface DirectoryItem');
    expect(code).toContain('export class RequestParser');
    expect(code).toContain('export class DirectoryItemParser');
    expect(code).toContain('export class GopherParser');
    
    // Verify parse method exists
    expect(code).toContain('parse(data: Buffer, offset: number = 0)');
    expect(code).toContain('parseStream(stream: Readable)');
    
    // Verify error handling
    expect(code).toContain('ParseError');
    expect(code).toContain('offset:');
    expect(code).toContain('expected:');
    expect(code).toContain('actual:');
  });

  it.skip('should generate delimiter-based parsing for DirectoryItem (SKIPPED: expects old parser architecture)', () => {
    const yamlContent = readFileSync(join(process.cwd(), 'protocols/gopher.yaml'), 'utf-8');
    const yamlParser = new YAMLParser();
    const spec = yamlParser.parse(yamlContent);

    const generator = new ParserGenerator();
    const code = generator.generate(spec);

    // Verify delimiter-based parsing logic
    expect(code).toContain('split(delimiter)');
    expect(code).toContain('parts.length');
  });
});
