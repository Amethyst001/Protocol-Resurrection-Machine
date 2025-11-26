/**
 * Property-Based Tests for MCP Tool Execution
 * 
 * Tests Property 9: MCP Tool Execution Success
 * 
 * Validates: Requirements 3.3
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { getServer } from '../../generated/unified-mcp-server.js';
import type { JSONSchema } from '../../src/mcp/types.js';

// ============================================================================
// Arbitraries for Tool Inputs
// ============================================================================

/**
 * Generate valid input for a given JSON schema
 */
function generateValidInput(schema: JSONSchema): fc.Arbitrary<any> {
  if (schema.type !== 'object' || !schema.properties) {
    return fc.constant({});
  }

  const propertyArbitraries: Record<string, fc.Arbitrary<any>> = {};

  for (const [fieldName, fieldSchema] of Object.entries(schema.properties)) {
    const field = fieldSchema as any;
    
    // Generate arbitrary based on field type
    if (field.type === 'string') {
      let stringArb = fc.string();
      
      // Apply length constraints
      if (field.minLength !== undefined || field.maxLength !== undefined) {
        stringArb = fc.string({
          minLength: field.minLength || 0,
          maxLength: field.maxLength || 100
        });
      }
      
      // Apply pattern constraint
      if (field.pattern) {
        // For simplicity, use a subset of valid strings
        stringArb = fc.string({ minLength: field.minLength || 1, maxLength: field.maxLength || 50 })
          .filter(s => {
            try {
              return new RegExp(field.pattern).test(s);
            } catch {
              return true; // If pattern is invalid, accept any string
            }
          });
      }
      
      // Apply enum constraint
      if (field.enum) {
        stringArb = fc.constantFrom(...field.enum);
      }
      
      propertyArbitraries[fieldName] = stringArb;
    } else if (field.type === 'number') {
      let numberArb = fc.integer();
      
      // Apply range constraints
      if (field.minimum !== undefined || field.maximum !== undefined) {
        numberArb = fc.integer({
          min: field.minimum || 0,
          max: field.maximum || 1000
        });
      }
      
      propertyArbitraries[fieldName] = numberArb;
    } else if (field.type === 'boolean') {
      propertyArbitraries[fieldName] = fc.boolean();
    } else {
      // Default to constant for unknown types
      propertyArbitraries[fieldName] = fc.constant(field.default || null);
    }
  }

  // Handle required fields
  const required = schema.required || [];
  const optional = Object.keys(propertyArbitraries).filter(k => !required.includes(k));

  // Generate object with all required fields and some optional fields
  return fc.record(propertyArbitraries, {
    requiredKeys: required
  });
}

// ============================================================================
// Property Tests
// ============================================================================

describe('MCP Tool Execution Properties', () => {
  /**
   * Feature: prm-phase-2, Property 9: MCP Tool Execution Success
   * For any valid tool input matching the tool's JSON schema, executing the
   * tool should return a successful result with the expected output structure.
   */
  it('Property 9: MCP tool execution success', async () => {
    const server = await getServer();
    const toolList = await server.listTools();
    
    // Test each tool with valid inputs
    for (const toolInfo of toolList.tools) {
      await fc.assert(
        fc.asyncProperty(
          generateValidInput(toolInfo.inputSchema),
          async (validInput) => {
            // Execute tool with valid input
            const result = await server.callTool(toolInfo.name, validInput);
            
            // Verify result structure
            expect(result).toBeDefined();
            expect(result.content).toBeDefined();
            expect(Array.isArray(result.content)).toBe(true);
            expect(result.content.length).toBeGreaterThan(0);
            
            // Verify content items have correct structure
            for (const item of result.content) {
              expect(item).toHaveProperty('type');
              expect(item.type).toBe('text');
              expect(item).toHaveProperty('text');
              expect(typeof item.text).toBe('string');
            }
            
            // For valid inputs, result should not be an error
            // (unless the tool implementation itself has issues)
            // We check that the result has the expected structure
            expect(result.isError).not.toBe(true);
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    }
  });

  /**
   * Additional test: Verify all tools can be executed
   */
  it('all registered tools are executable', async () => {
    const server = await getServer();
    const toolList = await server.listTools();
    
    expect(toolList.tools.length).toBeGreaterThan(0);
    
    for (const toolInfo of toolList.tools) {
      // Create minimal valid input
      const minimalInput: any = {};
      
      // Add required fields with default values
      if (toolInfo.inputSchema.required) {
        for (const field of toolInfo.inputSchema.required) {
          const fieldSchema = toolInfo.inputSchema.properties?.[field] as any;
          if (fieldSchema) {
            if (fieldSchema.default !== undefined) {
              minimalInput[field] = fieldSchema.default;
            } else if (fieldSchema.type === 'string') {
              minimalInput[field] = 'test';
            } else if (fieldSchema.type === 'number') {
              minimalInput[field] = fieldSchema.minimum || 0;
            } else if (fieldSchema.type === 'boolean') {
              minimalInput[field] = false;
            }
          }
        }
      }
      
      // Execute tool
      const result = await server.callTool(toolInfo.name, minimalInput);
      
      // Verify result structure
      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      expect(Array.isArray(result.content)).toBe(true);
    }
  });

  /**
   * Additional test: Verify tool execution with schema-compliant inputs
   */
  it('tools accept inputs matching their schemas', async () => {
    const server = await getServer();
    const toolList = await server.listTools();
    
    for (const toolInfo of toolList.tools) {
      // Test with various valid inputs
      const testCases = [
        // Empty object (if no required fields)
        ...((!toolInfo.inputSchema.required || toolInfo.inputSchema.required.length === 0) ? [{}] : []),
        
        // Object with defaults
        ...Object.entries(toolInfo.inputSchema.properties || {}).map(([key, schema]) => {
          const field = schema as any;
          return { [key]: field.default || (field.type === 'string' ? '' : 0) };
        })
      ];
      
      for (const testInput of testCases) {
        const result = await server.callTool(toolInfo.name, testInput);
        
        // Should not fail with schema-compliant input
        expect(result).toBeDefined();
        expect(result.content).toBeDefined();
      }
    }
  });
});
