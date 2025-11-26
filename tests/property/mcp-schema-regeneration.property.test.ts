/**
 * Property-Based Tests for MCP Schema Regeneration
 * 
 * Tests Property 12: MCP Schema Regeneration Consistency
 * 
 * Validates: Requirements 4.5
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { ToolGenerator } from '../../src/mcp/tool-generator.js';
import { SchemaGenerator } from '../../src/mcp/schema-generator.js';
import type { ProtocolSpec, MessageType, FieldDefinition } from '../../src/types/protocol-spec.js';

// ============================================================================
// Arbitraries for Protocol Modifications
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
 * Arbitrary for message type modifications
 */
const messageTypeModificationArbitrary = fc.record({
  addField: fc.option(fieldDefinitionArbitrary, { nil: undefined }),
  removeField: fc.option(fc.boolean(), { nil: undefined }),
  modifyField: fc.option(fc.record({
    changeType: fc.boolean(),
    changeRequired: fc.boolean(),
    changeValidation: fc.boolean()
  }), { nil: undefined })
});

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Create a base protocol spec for testing
 */
function createBaseProtocolSpec(): ProtocolSpec {
  return {
    protocol: {
      name: 'TestProtocol',
      rfc: '1234',
      port: 8080,
      description: 'Test protocol for schema regeneration',
      version: '1.0'
    },
    connection: {
      type: 'TCP',
      timeout: 30000,
      keepAlive: false
    },
    messageTypes: [
      {
        name: 'TestRequest',
        direction: 'request',
        format: '{field1}\t{field2}\r\n',
        delimiter: '\t',
        terminator: '\r\n',
        fields: [
          {
            name: 'field1',
            type: { kind: 'string' },
            required: true,
            validation: {
              maxLength: 100
            }
          },
          {
            name: 'field2',
            type: { kind: 'number' },
            required: false,
            validation: {
              min: 0,
              max: 1000
            }
          }
        ]
      }
    ]
  };
}

/**
 * Apply modification to protocol spec
 */
function applyModification(
  spec: ProtocolSpec,
  modification: any
): ProtocolSpec {
  const modifiedSpec = JSON.parse(JSON.stringify(spec)); // Deep clone
  const messageType = modifiedSpec.messageTypes[0];
  
  if (modification.addField) {
    // Ensure unique field name
    const newField = { ...modification.addField };
    let counter = 0;
    while (messageType.fields.some((f: FieldDefinition) => f.name === newField.name)) {
      newField.name = `${modification.addField.name}${counter++}`;
    }
    messageType.fields.push(newField);
  }
  
  if (modification.removeField && messageType.fields.length > 1) {
    messageType.fields.pop();
  }
  
  if (modification.modifyField && messageType.fields.length > 0) {
    const field = messageType.fields[0];
    
    if (modification.modifyField.changeType) {
      field.type = { kind: 'boolean' };
    }
    
    if (modification.modifyField.changeRequired) {
      field.required = !field.required;
    }
    
    if (modification.modifyField.changeValidation) {
      field.validation = {
        minLength: 5,
        maxLength: 50
      };
    }
  }
  
  return modifiedSpec;
}

// ============================================================================
// Property Tests
// ============================================================================

describe('MCP Schema Regeneration Properties', () => {
  const toolGenerator = new ToolGenerator();
  const schemaGenerator = new SchemaGenerator();

  /**
   * Feature: prm-phase-2, Property 12: MCP Schema Regeneration Consistency
   * For any protocol specification change, regenerating the MCP server should
   * update tool schemas to match the new specification exactly.
   */
  it('Property 12: MCP schema regeneration consistency', () => {
    fc.assert(
      fc.property(
        messageTypeModificationArbitrary,
        (modification) => {
          // Create base spec
          const originalSpec = createBaseProtocolSpec();
          
          // Generate original tools and schemas
          const originalTools = toolGenerator.generateTools(originalSpec);
          const originalMessageType = originalSpec.messageTypes[0];
          const originalSchema = schemaGenerator.generateSchema(originalMessageType);
          
          // Apply modification
          const modifiedSpec = applyModification(originalSpec, modification);
          
          // Regenerate tools and schemas
          const regeneratedTools = toolGenerator.generateTools(modifiedSpec);
          const modifiedMessageType = modifiedSpec.messageTypes[0];
          const regeneratedSchema = schemaGenerator.generateSchema(modifiedMessageType);
          
          // Verify schema matches the modified spec
          expect(regeneratedSchema.type).toBe('object');
          expect(regeneratedSchema.properties).toBeDefined();
          
          // Verify all fields from modified spec are in schema
          for (const field of modifiedMessageType.fields) {
            expect(regeneratedSchema.properties).toHaveProperty(field.name);
            
            const fieldSchema = regeneratedSchema.properties![field.name] as any;
            
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
                expect(fieldSchema.enum).toEqual(field.type.values);
                break;
            }
            
            // Verify required fields are marked
            if (field.required) {
              expect(regeneratedSchema.required).toContain(field.name);
            }
            
            // Verify validation constraints
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
            }
          }
          
          // Verify no extra fields in schema
          const schemaFieldCount = Object.keys(regeneratedSchema.properties!).length;
          const specFieldCount = modifiedMessageType.fields.length;
          expect(schemaFieldCount).toBe(specFieldCount);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Additional test: Verify schema changes when fields are added
   */
  it('schema updates when fields are added', () => {
    const spec = createBaseProtocolSpec();
    const messageType = spec.messageTypes[0];
    
    // Generate initial schema
    const initialSchema = schemaGenerator.generateSchema(messageType);
    const initialFieldCount = Object.keys(initialSchema.properties!).length;
    
    // Add a new field
    messageType.fields.push({
      name: 'newField',
      type: { kind: 'string' },
      required: true
    });
    
    // Regenerate schema
    const updatedSchema = schemaGenerator.generateSchema(messageType);
    const updatedFieldCount = Object.keys(updatedSchema.properties!).length;
    
    // Verify field was added
    expect(updatedFieldCount).toBe(initialFieldCount + 1);
    expect(updatedSchema.properties).toHaveProperty('newField');
    expect(updatedSchema.required).toContain('newField');
  });

  /**
   * Additional test: Verify schema changes when fields are removed
   */
  it('schema updates when fields are removed', () => {
    const spec = createBaseProtocolSpec();
    const messageType = spec.messageTypes[0];
    
    // Generate initial schema
    const initialSchema = schemaGenerator.generateSchema(messageType);
    const initialFieldCount = Object.keys(initialSchema.properties!).length;
    
    // Remove a field
    const removedFieldName = messageType.fields[messageType.fields.length - 1].name;
    messageType.fields.pop();
    
    // Regenerate schema
    const updatedSchema = schemaGenerator.generateSchema(messageType);
    const updatedFieldCount = Object.keys(updatedSchema.properties!).length;
    
    // Verify field was removed
    expect(updatedFieldCount).toBe(initialFieldCount - 1);
    expect(updatedSchema.properties).not.toHaveProperty(removedFieldName);
  });

  /**
   * Additional test: Verify schema changes when field types are modified
   */
  it('schema updates when field types are modified', () => {
    const spec = createBaseProtocolSpec();
    const messageType = spec.messageTypes[0];
    
    // Change field type
    messageType.fields[0].type = { kind: 'number' };
    
    // Regenerate schema
    const updatedSchema = schemaGenerator.generateSchema(messageType);
    
    // Verify type changed
    const fieldSchema = updatedSchema.properties![messageType.fields[0].name] as any;
    expect(fieldSchema.type).toBe('number');
  });

  /**
   * Additional test: Verify schema changes when validation constraints are modified
   */
  it('schema updates when validation constraints are modified', () => {
    const spec = createBaseProtocolSpec();
    const messageType = spec.messageTypes[0];
    
    // Modify validation constraints
    messageType.fields[0].validation = {
      minLength: 10,
      maxLength: 50,
      pattern: '^[a-z]+$'
    };
    
    // Regenerate schema
    const updatedSchema = schemaGenerator.generateSchema(messageType);
    
    // Verify constraints changed
    const fieldSchema = updatedSchema.properties![messageType.fields[0].name] as any;
    expect(fieldSchema.minLength).toBe(10);
    expect(fieldSchema.maxLength).toBe(50);
    expect(fieldSchema.pattern).toBe('^[a-z]+$');
  });

  /**
   * Additional test: Verify tool count updates when message types change
   */
  it('tool count updates when message types are added or removed', () => {
    const spec = createBaseProtocolSpec();
    
    // Generate initial tools
    const initialTools = toolGenerator.generateTools(spec);
    const initialCount = initialTools.length;
    
    // Add a new message type
    spec.messageTypes.push({
      name: 'NewRequest',
      direction: 'request',
      format: '{data}\r\n',
      terminator: '\r\n',
      fields: [
        {
          name: 'data',
          type: { kind: 'string' },
          required: true
        }
      ]
    });
    
    // Regenerate tools
    const updatedTools = toolGenerator.generateTools(spec);
    const updatedCount = updatedTools.length;
    
    // Verify tool count increased
    expect(updatedCount).toBe(initialCount + 1);
  });
});
