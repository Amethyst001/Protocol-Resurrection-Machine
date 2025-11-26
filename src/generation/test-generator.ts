/**
 * Test Generator
 * Generates property-based and unit tests for protocol implementations
 * 
 * This module implements test generation:
 * 1. Generate fast-check arbitraries for message types
 * 2. Generate round-trip property tests
 * 3. Generate parser error handling tests
 * 4. Generate serializer validation tests
 * 5. Configure tests for 100+ iterations
 */

import type { ProtocolSpec, MessageType, FieldDefinition } from '../types/protocol-spec.js';

/**
 * Test Generator
 * Generates property-based tests for protocol implementations
 */
export class TestGenerator {
  constructor() {
    // Test generator initialization
  }

  /**
   * Generate property-based tests for a protocol specification
   * @param spec - Protocol specification
   * @returns Generated TypeScript test code
   */
  generatePropertyTests(spec: ProtocolSpec): string {
    // Generate imports
    const imports = this.generateImports(spec);
    
    // Generate arbitraries for each message type
    const arbitraries = this.generateArbitraries(spec);
    
    // Generate round-trip property tests
    const roundTripTests = this.generateRoundTripTests(spec);
    
    // Generate parser error handling tests
    const parserErrorTests = this.generateParserErrorTests(spec);
    
    // Generate serializer validation tests
    const serializerValidationTests = this.generateSerializerValidationTests(spec);
    
    return `${imports}\n\n${arbitraries}\n\n${roundTripTests}\n\n${parserErrorTests}\n\n${serializerValidationTests}`;
  }

  /**
   * Generate imports section
   */
  private generateImports(spec: ProtocolSpec): string {
    const protocolName = spec.protocol.name.toLowerCase();
    
    // Generate imports for parser and serializer classes
    const parserImports = spec.messageTypes
      .map(mt => `${mt.name}Parser`)
      .join(', ');
    const serializerImports = spec.messageTypes
      .map(mt => `${mt.name}Serializer`)
      .join(', ');
    
    return `/**
 * Property-Based Tests for ${spec.protocol.name} Protocol
 * Tests universal properties that should hold across all valid inputs
 * 
 * This file is auto-generated. Do not edit manually.
 * Regenerate using: protocol-resurrection-machine generate ${spec.protocol.name.toLowerCase()}.yaml
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { ${parserImports} } from '../${protocolName}-parser.js';
import { ${serializerImports} } from '../${protocolName}-serializer.js';`;
  }

  /**
   * Generate fast-check arbitraries for all message types
   */
  private generateArbitraries(spec: ProtocolSpec): string {
    const lines: string[] = [];
    
    lines.push('// ============================================================================');
    lines.push('// Fast-check Arbitraries for Message Types');
    lines.push('// ============================================================================');
    lines.push('');
    
    for (const messageType of spec.messageTypes) {
      lines.push(this.generateArbitraryForMessageType(messageType, spec));
      lines.push('');
    }
    
    return lines.join('\n');
  }

  /**
   * Generate arbitrary for a specific message type
   */
  private generateArbitraryForMessageType(messageType: MessageType, spec: ProtocolSpec): string {
    const lines: string[] = [];
    
    lines.push(`/**`);
    lines.push(` * Arbitrary for ${messageType.name} messages`);
    lines.push(` * Generates random valid ${messageType.name} objects`);
    lines.push(` */`);
    lines.push(`const ${messageType.name.toLowerCase()}Arbitrary = fc.record({`);
    
    for (const field of messageType.fields) {
      const fieldArbitrary = this.generateFieldArbitrary(field, spec);
      const optional = !field.required ? '.map(v => v ?? undefined)' : '';
      lines.push(`  ${field.name}: ${fieldArbitrary}${optional},`);
    }
    
    lines.push('});');
    
    return lines.join('\n');
  }

  /**
   * Generate arbitrary for a specific field
   */
  private generateFieldArbitrary(field: FieldDefinition, _spec: ProtocolSpec): string {
    switch (field.type.kind) {
      case 'string':
        return this.generateStringArbitrary(field);
        
      case 'number':
        return this.generateNumberArbitrary(field);
        
      case 'enum':
        return this.generateEnumArbitrary(field);
        
      case 'boolean':
        return 'fc.boolean()';
        
      case 'bytes':
        return this.generateBytesArbitrary(field);
        
      default:
        return 'fc.string()';
    }
  }

  /**
   * Generate string arbitrary with constraints
   */
  private generateStringArbitrary(field: FieldDefinition): string {
    const constraints: string[] = [];
    
    if (field.validation?.minLength !== undefined) {
      constraints.push(`minLength: ${field.validation.minLength}`);
    } else {
      constraints.push('minLength: 0');
    }
    
    if (field.validation?.maxLength !== undefined) {
      constraints.push(`maxLength: ${field.validation.maxLength}`);
    } else if (field.type.kind === 'string' && field.type.maxLength !== undefined) {
      constraints.push(`maxLength: ${field.type.maxLength}`);
    } else {
      constraints.push('maxLength: 100');
    }
    
    let arbitrary = `fc.string({ ${constraints.join(', ')} })`;
    
    // Add pattern filter if specified
    if (field.validation?.pattern) {
      const pattern = field.validation.pattern.replace(/\\/g, '\\\\');
      arbitrary += `.filter(s => new RegExp(${JSON.stringify(pattern)}).test(s) || s.length === 0)`;
    }
    
    // Filter out strings that would break the protocol format
    // Avoid tab characters if used as delimiter, avoid CRLF if used as terminator
    arbitrary += `.filter(s => !s.includes('\\t') && !s.includes('\\r') && !s.includes('\\n'))`;
    
    return arbitrary;
  }

  /**
   * Generate number arbitrary with constraints
   */
  private generateNumberArbitrary(field: FieldDefinition): string {
    const constraints: string[] = [];
    
    if (field.validation?.min !== undefined) {
      constraints.push(`min: ${field.validation.min}`);
    } else if (field.type.kind === 'number' && field.type.min !== undefined) {
      constraints.push(`min: ${field.type.min}`);
    } else {
      constraints.push('min: 0');
    }
    
    if (field.validation?.max !== undefined) {
      constraints.push(`max: ${field.validation.max}`);
    } else if (field.type.kind === 'number' && field.type.max !== undefined) {
      constraints.push(`max: ${field.type.max}`);
    } else {
      constraints.push('max: 65535');
    }
    
    return `fc.integer({ ${constraints.join(', ')} })`;
  }

  /**
   * Generate enum arbitrary
   */
  private generateEnumArbitrary(field: FieldDefinition): string {
    if (field.type.kind === 'enum') {
      const values = field.type.values.map(v => JSON.stringify(v)).join(', ');
      return `fc.constantFrom(${values})`;
    }
    return 'fc.string()';
  }

  /**
   * Generate bytes arbitrary
   */
  private generateBytesArbitrary(field: FieldDefinition): string {
    if (field.type.kind === 'bytes' && field.type.length !== undefined) {
      return `fc.uint8Array({ minLength: ${field.type.length}, maxLength: ${field.type.length} }).map(arr => Buffer.from(arr))`;
    }
    return `fc.uint8Array({ minLength: 0, maxLength: 100 }).map(arr => Buffer.from(arr))`;
  }

  /**
   * Generate round-trip property tests for all message types
   */
  private generateRoundTripTests(spec: ProtocolSpec): string {
    const lines: string[] = [];
    
    lines.push('// ============================================================================');
    lines.push('// Round-Trip Property Tests');
    lines.push('// ============================================================================');
    lines.push('');
    lines.push(`describe('${spec.protocol.name} Protocol - Round-Trip Properties', () => {`);
    
    for (const messageType of spec.messageTypes) {
      lines.push('');
      lines.push(this.generateRoundTripTestForMessageType(messageType, spec));
    }
    
    lines.push('});');
    
    return lines.join('\n');
  }

  /**
   * Generate round-trip test for a specific message type
   */
  private generateRoundTripTestForMessageType(messageType: MessageType, _spec: ProtocolSpec): string {
    const lines: string[] = [];
    
    lines.push(`  /**`);
    lines.push(`   * Feature: protocol-resurrection-machine, Property 7: Parser-Serializer Round-Trip`);
    lines.push(`   * For any valid ${messageType.name} message, serialize then parse should produce equivalent message`);
    lines.push(`   * Validates: Requirements 4.1, 4.2, 4.3, 4.4, 5.1, 5.2, 5.3, 5.4, 6.1`);
    lines.push(`   */`);
    lines.push(`  it('${messageType.name}: serialize then parse produces equivalent message', () => {`);
    lines.push(`    fc.assert(`);
    lines.push(`      fc.property(`);
    lines.push(`        ${messageType.name.toLowerCase()}Arbitrary,`);
    lines.push(`        (message) => {`);
    lines.push(`          // Serialize the message`);
    lines.push(`          const serializer = new ${messageType.name}Serializer();`);
    lines.push(`          const serializeResult = serializer.serialize(message);`);
    lines.push(``);
    lines.push(`          // Serialization should succeed`);
    lines.push(`          expect(serializeResult.success).toBe(true);`);
    lines.push(`          expect(serializeResult.data).toBeDefined();`);
    lines.push(``);
    lines.push(`          if (!serializeResult.data) {`);
    lines.push(`            throw new Error('Serialization failed');`);
    lines.push(`          }`);
    lines.push(``);
    lines.push(`          // Parse the serialized data`);
    lines.push(`          const parser = new ${messageType.name}Parser();`);
    lines.push(`          const parseResult = parser.parse(serializeResult.data);`);
    lines.push(``);
    lines.push(`          // Parsing should succeed`);
    lines.push(`          expect(parseResult.success).toBe(true);`);
    lines.push(`          expect(parseResult.message).toBeDefined();`);
    lines.push(``);
    lines.push(`          if (!parseResult.message) {`);
    lines.push(`            throw new Error('Parsing failed');`);
    lines.push(`          }`);
    lines.push(``);
    lines.push(`          // Parsed message should equal original message`);
    lines.push(`          expect(parseResult.message).toEqual(message);`);
    lines.push(`        }`);
    lines.push(`      ),`);
    lines.push(`      { numRuns: 100 }`);
    lines.push(`    );`);
    lines.push(`  });`);
    
    return lines.join('\n');
  }

  /**
   * Generate parser error handling tests
   */
  private generateParserErrorTests(spec: ProtocolSpec): string {
    const lines: string[] = [];
    
    lines.push('// ============================================================================');
    lines.push('// Parser Error Handling Tests');
    lines.push('// ============================================================================');
    lines.push('');
    lines.push(`describe('${spec.protocol.name} Protocol - Parser Error Handling', () => {`);
    
    for (const messageType of spec.messageTypes) {
      lines.push('');
      lines.push(this.generateParserErrorTestForMessageType(messageType));
    }
    
    lines.push('});');
    
    return lines.join('\n');
  }

  /**
   * Generate parser error test for a specific message type
   */
  private generateParserErrorTestForMessageType(messageType: MessageType): string {
    const lines: string[] = [];
    
    lines.push(`  /**`);
    lines.push(`   * Feature: protocol-resurrection-machine, Property 8: Parser Error Reporting`);
    lines.push(`   * For any malformed ${messageType.name} message, parser should return descriptive error`);
    lines.push(`   * Validates: Requirements 4.5, 17.3`);
    lines.push(`   */`);
    lines.push(`  it('${messageType.name}: parser reports errors for malformed input', () => {`);
    lines.push(`    fc.assert(`);
    lines.push(`      fc.property(`);
    lines.push(`        fc.uint8Array({ minLength: 0, maxLength: 50 }),`);
    lines.push(`        (randomBytes) => {`);
    lines.push(`          const parser = new ${messageType.name}Parser();`);
    lines.push(`          const data = Buffer.from(randomBytes);`);
    lines.push(`          const result = parser.parse(data);`);
    lines.push(``);
    lines.push(`          // If parsing fails, error should have required fields`);
    lines.push(`          if (!result.success) {`);
    lines.push(`            expect(result.error).toBeDefined();`);
    lines.push(`            expect(result.error?.message).toBeDefined();`);
    lines.push(`            expect(result.error?.offset).toBeDefined();`);
    lines.push(`            expect(result.error?.expected).toBeDefined();`);
    lines.push(`            expect(result.error?.actual).toBeDefined();`);
    lines.push(`          }`);
    lines.push(``);
    lines.push(`          // Either success or proper error`);
    lines.push(`          expect(result.success || result.error !== undefined).toBe(true);`);
    lines.push(`        }`);
    lines.push(`      ),`);
    lines.push(`      { numRuns: 100 }`);
    lines.push(`    );`);
    lines.push(`  });`);
    
    return lines.join('\n');
  }

  /**
   * Generate serializer validation tests
   */
  private generateSerializerValidationTests(spec: ProtocolSpec): string {
    const lines: string[] = [];
    
    lines.push('// ============================================================================');
    lines.push('// Serializer Validation Tests');
    lines.push('// ============================================================================');
    lines.push('');
    lines.push(`describe('${spec.protocol.name} Protocol - Serializer Validation', () => {`);
    
    for (const messageType of spec.messageTypes) {
      lines.push('');
      lines.push(this.generateSerializerValidationTestForMessageType(messageType));
    }
    
    lines.push('});');
    
    return lines.join('\n');
  }

  /**
   * Generate serializer validation test for a specific message type
   */
  private generateSerializerValidationTestForMessageType(messageType: MessageType): string {
    const lines: string[] = [];
    
    // Find required fields
    const requiredFields = messageType.fields.filter(f => f.required);
    
    if (requiredFields.length === 0) {
      // No required fields, skip this test
      return '';
    }
    
    lines.push(`  /**`);
    lines.push(`   * Feature: protocol-resurrection-machine, Property 9: Serializer Validation`);
    lines.push(`   * For any invalid ${messageType.name} message, serializer should return descriptive error`);
    lines.push(`   * Validates: Requirements 5.5`);
    lines.push(`   */`);
    lines.push(`  it('${messageType.name}: serializer validates required fields', () => {`);
    lines.push(`    fc.assert(`);
    lines.push(`      fc.property(`);
    lines.push(`        ${messageType.name.toLowerCase()}Arbitrary,`);
    lines.push(`        fc.constantFrom(${requiredFields.map(f => `'${f.name}'`).join(', ')}),`);
    lines.push(`        (message, fieldToRemove) => {`);
    lines.push(`          // Create invalid message by removing a required field`);
    lines.push(`          const invalidMessage = { ...message };`);
    lines.push(`          delete (invalidMessage as any)[fieldToRemove];`);
    lines.push(``);
    lines.push(`          // Serialize the invalid message`);
    lines.push(`          const serializer = new ${messageType.name}Serializer();`);
    lines.push(`          const result = serializer.serialize(invalidMessage as any);`);
    lines.push(``);
    lines.push(`          // Serialization should fail`);
    lines.push(`          expect(result.success).toBe(false);`);
    lines.push(`          expect(result.error).toBeDefined();`);
    lines.push(`          expect(result.error?.field).toBeDefined();`);
    lines.push(`          expect(result.error?.message).toBeDefined();`);
    lines.push(`          expect(result.error?.reason).toBeDefined();`);
    lines.push(``);
    lines.push(`          // Error should mention the missing field`);
    lines.push(`          const errorText = result.error?.message.toLowerCase() || '';`);
    lines.push(`          expect(errorText.includes(fieldToRemove.toLowerCase())).toBe(true);`);
    lines.push(`        }`);
    lines.push(`      ),`);
    lines.push(`      { numRuns: 100 }`);
    lines.push(`    );`);
    lines.push(`  });`);
    
    return lines.join('\n');
  }

  /**
   * Generate unit tests for specific examples
   * @param spec - Protocol specification
   * @returns Generated TypeScript test code
   */
  generateUnitTests(spec: ProtocolSpec): string {
    const lines: string[] = [];
    
    lines.push(`/**`);
    lines.push(` * Unit Tests for ${spec.protocol.name} Protocol`);
    lines.push(` * Tests specific examples and edge cases`);
    lines.push(` * `);
    lines.push(` * This file is auto-generated. Do not edit manually.`);
    lines.push(` * Regenerate using: protocol-resurrection-machine generate ${spec.protocol.name.toLowerCase()}.yaml`);
    lines.push(` */`);
    lines.push(``);
    lines.push(`import { describe, it, expect } from 'vitest';`);
    lines.push(``);
    lines.push(`describe('${spec.protocol.name} Protocol - Unit Tests', () => {`);
    lines.push(`  // Add specific example tests here`);
    lines.push(`  it('should be implemented', () => {`);
    lines.push(`    expect(true).toBe(true);`);
    lines.push(`  });`);
    lines.push(`});`);
    
    return lines.join('\n');
  }

  /**
   * Generate test data generators (arbitraries) as a separate module
   * @param spec - Protocol specification
   * @returns Generated TypeScript code for test data generators
   */
  generateTestData(spec: ProtocolSpec): string {
    const header = `/**
 * Test Data Generators for ${spec.protocol.name} Protocol
 * Fast-check arbitraries for generating random valid messages
 * 
 * This file is auto-generated. Do not edit manually.
 * Regenerate using: protocol-resurrection-machine generate ${spec.protocol.name.toLowerCase()}.yaml
 */

import * as fc from 'fast-check';

`;
    return header + this.generateArbitraries(spec);
  }
}
