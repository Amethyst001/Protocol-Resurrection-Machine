/**
 * Property-Based Tests for MCP Server Generation
 * 
 * Tests Properties 7, 8, and 11:
 * - Property 7: MCP Server Generation Completeness
 * - Property 8: MCP Tool Count Correctness
 * - Property 11: MCP Tool Schema Validity
 * 
 * Validates: Requirements 3.1, 3.2, 4.1, 4.2, 4.3, 4.4
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { ToolGenerator } from '../../src/mcp/tool-generator.js';
import { SchemaGenerator } from '../../src/mcp/schema-generator.js';
import { MCPServer } from '../../src/mcp/server-template.js';
import type { ProtocolSpec, MessageType, FieldDefinition } from '../../src/types/protocol-spec.js';

// ============================================================================
// Arbitraries for Protocol Specifications
// ============================================================================

/**
 * Arbitrary for field types
 */
const fieldTypeArbitrary = fc.oneof(
  fc.constant({ kind: 'string' as const }),
  fc.constant({ kind: 'number' as const }),
  fc.constant({ kind: 'boolean' as const }),
  fc.record({
    kind: fc.constant('enum' as const),
    values: fc.array(fc.string({ minLength: 1, maxLength: 10 }), { minLength: 2, maxLength: 5 })
  })
);

/**
 * Arbitrary for field definitions
 */
const fieldDefinitionArbitrary: fc.Arbitrary<FieldDefinition> = fc.record({
  name: fc.string({ minLength: 1, maxLength: 20 }).filter(s => /^[a-zA-Z][a-zA-Z0-9]*$/.test(s)),
  type: fieldTypeArbitrary,
  required: fc.boolean(),
  validation: fc.option(fc.record({
    minLength: fc.option(fc.integer({ min: 0, max: 10 })),
    maxLength: fc.option(fc.integer({ min: 10, max: 100 })),
    min: fc.option(fc.integer({ min: 0, max: 100 })),
    max: fc.option(fc.integer({ min: 100, max: 1000 })),
    pattern: fc.option(fc.constantFrom('^[a-z]+$', '^[0-9]+$', '^[a-zA-Z0-9]+$'))
  }), { nil: undefined })
});

/**
 * Arbitrary for message types with unique field names
 */
const messageTypeArbitrary: fc.Arbitrary<MessageType> = fc.record({
  name: fc.string({ minLength: 1, maxLength: 20 }).filter(s => /^[A-Z][a-zA-Z0-9]*$/.test(s)),
  direction: fc.constantFrom('request' as const, 'response' as const, 'bidirectional' as const),
  format: fc.string({ minLength: 1, maxLength: 50 }),
  fields: fc.array(fieldDefinitionArbitrary, { minLength: 1, maxLength: 5 }),
  delimiter: fc.option(fc.constantFrom('\t', ',', '|'), { nil: undefined }),
  terminator: fc.option(fc.constantFrom('\r\n', '\n', '\0'), { nil: undefined })
}).map(mt => {
  // Ensure field names are unique
  const uniqueFields: FieldDefinition[] = [];
  const seenNames = new Set<string>();
  
  for (const field of mt.fields) {
    if (!seenNames.has(field.name)) {
      uniqueFields.push(field);
      seenNames.add(field.name);
    }
  }
  
  return { ...mt, fields: uniqueFields.length > 0 ? uniqueFields : [mt.fields[0]] };
});

/**
 * Arbitrary for protocol specifications with unique message type names
 */
const protocolSpecArbitrary: fc.Arbitrary<ProtocolSpec> = fc.record({
  protocol: fc.record({
    name: fc.string({ minLength: 1, maxLength: 20 }).filter(s => /^[A-Z][a-zA-Z0-9]*$/.test(s)),
    rfc: fc.option(fc.integer({ min: 1, max: 9999 }).map(n => n.toString()), { nil: undefined }),
    port: fc.integer({ min: 1, max: 65535 }),
    description: fc.string({ minLength: 10, maxLength: 100 }),
    version: fc.option(fc.constantFrom('1.0', '2.0', '1.1'), { nil: undefined })
  }),
  connection: fc.record({
    type: fc.constantFrom('TCP' as const, 'UDP' as const),
    timeout: fc.option(fc.integer({ min: 1000, max: 30000 }), { nil: undefined }),
    keepAlive: fc.option(fc.boolean(), { nil: undefined })
  }),
  messageTypes: fc.array(messageTypeArbitrary, { minLength: 1, maxLength: 5 })
}).map(spec => {
  // Ensure message type names are unique
  const uniqueMessageTypes: MessageType[] = [];
  const seenNames = new Set<string>();
  
  for (const mt of spec.messageTypes) {
    if (!seenNames.has(mt.name)) {
      uniqueMessageTypes.push(mt);
      seenNames.add(mt.name);
    }
  }
  
  return { ...spec, messageTypes: uniqueMessageTypes.length > 0 ? uniqueMessageTypes : [spec.messageTypes[0]] };
});

// ============================================================================
// Property Tests
// ============================================================================

describe('MCP Server Generation Properties', () => {
  const toolGenerator = new ToolGenerator();
  const schemaGenerator = new SchemaGenerator();

  /**
   * Feature: prm-phase-2, Property 7: MCP Server Generation Completeness
   * For any protocol specification, generating an MCP server should produce
   * a server file that exports a valid MCP server implementation with tool
   * registration for all message types.
   */
  it('Property 7: MCP server generation completeness', () => {
    fc.assert(
      fc.property(protocolSpecArbitrary, (spec) => {
        // Generate tools from spec
        const tools = toolGenerator.generateTools(spec);

        // Create MCP server
        const server = new MCPServer({
          name: spec.protocol.name,
          version: spec.protocol.version || '1.0',
          tools
        });

        // Verify server was created
        expect(server).toBeDefined();
        expect(server.getConfig()).toBeDefined();
        expect(server.getRegistry()).toBeDefined();

        // Verify all request/bidirectional messages have tools
        const requestMessages = spec.messageTypes.filter(
          mt => mt.direction === 'request' || mt.direction === 'bidirectional'
        );

        expect(tools.length).toBe(requestMessages.length);

        // Verify each tool is registered
        for (const tool of tools) {
          expect(server.getRegistry().has(tool.name)).toBe(true);
        }

        return true;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: prm-phase-2, Property 8: MCP Tool Count Correctness
   * For any protocol specification with N message types, the generated MCP
   * server should register exactly N tools, with tool names following the
   * {protocol}_{operation} convention.
   */
  it('Property 8: MCP tool count correctness', () => {
    fc.assert(
      fc.property(protocolSpecArbitrary, (spec) => {
        // Generate tools
        const tools = toolGenerator.generateTools(spec);

        // Count request/bidirectional messages
        const expectedCount = spec.messageTypes.filter(
          mt => mt.direction === 'request' || mt.direction === 'bidirectional'
        ).length;

        // Verify tool count matches
        expect(tools.length).toBe(expectedCount);

        // Verify tool names follow convention
        const protocolName = spec.protocol.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
        
        for (const tool of tools) {
          // Check name follows {protocol}_{operation} pattern
          expect(tool.name).toMatch(/^[a-z0-9]+_[a-z0-9_]+$/);
          expect(tool.name).toContain(protocolName);
        }

        return true;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: prm-phase-2, Property 11: MCP Tool Schema Validity
   * For any message type, the generated JSON schema should be valid according
   * to JSON Schema Draft 7 and should accurately describe all fields with
   * their types and constraints.
   */
  it('Property 11: MCP tool schema validity', () => {
    fc.assert(
      fc.property(messageTypeArbitrary, (messageType) => {
        // Generate schema
        const schema = schemaGenerator.generateSchema(messageType);

        // Verify schema is valid
        const validation = schemaGenerator.validateSchema(schema);
        expect(validation.valid).toBe(true);
        expect(validation.errors).toHaveLength(0);

        // Verify schema has correct structure
        expect(schema.type).toBe('object');
        expect(schema.properties).toBeDefined();

        // Verify all fields are in schema
        for (const field of messageType.fields) {
          expect(schema.properties).toHaveProperty(field.name);
          
          const fieldSchema = schema.properties![field.name];
          expect(fieldSchema).toBeDefined();
          expect(fieldSchema.type).toBeDefined();

          // Verify required fields are marked
          if (field.required) {
            expect(schema.required).toContain(field.name);
          }

          // Verify field type matches
          switch (field.type.kind) {
            case 'string':
              expect(fieldSchema.type).toBe('string');
              break;
            case 'number':
              expect(fieldSchema.type).toBe('number');
              break;
            case 'boolean':
              expect(fieldSchema.type).toBe('boolean');
              break;
            case 'enum':
              expect(fieldSchema.type).toBe('string');
              expect(fieldSchema.enum).toBeDefined();
              expect(fieldSchema.enum).toEqual(field.type.values);
              break;
          }

          // Verify validation constraints are applied
          if (field.validation) {
            if (field.validation.minLength !== undefined) {
              expect(fieldSchema.minLength).toBe(field.validation.minLength);
            }
            if (field.validation.maxLength !== undefined) {
              expect(fieldSchema.maxLength).toBe(field.validation.maxLength);
            }
            if (field.validation.min !== undefined) {
              expect(fieldSchema.minimum).toBe(field.validation.min);
            }
            if (field.validation.max !== undefined) {
              expect(fieldSchema.maximum).toBe(field.validation.max);
            }
            if (field.validation.pattern) {
              expect(fieldSchema.pattern).toBe(field.validation.pattern);
            }
          }
        }

        return true;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Additional test: Verify tool validation works correctly
   */
  it('validates generated tools correctly', () => {
    fc.assert(
      fc.property(protocolSpecArbitrary, (spec) => {
        const tools = toolGenerator.generateTools(spec);

        for (const tool of tools) {
          const validation = toolGenerator.validateTool(tool);
          expect(validation.valid).toBe(true);
          expect(validation.errors).toHaveLength(0);
        }

        return true;
      }),
      { numRuns: 100 }
    );
  });
});
