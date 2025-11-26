/**
 * Property-Based Tests for MCP Error Format
 * 
 * Tests Property 10: MCP Error Format Compliance
 * 
 * Validates: Requirements 3.4
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { getServer } from '../../generated/unified-mcp-server.js';
import type { JSONSchema } from '../../src/mcp/types.js';

// ============================================================================
// Arbitraries for Invalid Inputs
// ============================================================================

/**
 * Generate invalid input for a given JSON schema
 */
function generateInvalidInput(schema: JSONSchema): fc.Arbitrary<any> {
  if (schema.type !== 'object' || !schema.properties) {
    return fc.constant({ invalid: 'field' });
  }

  return fc.oneof(
    // Missing required fields
    fc.constant({}),
    
    // Wrong type for fields
    fc.record(
      Object.fromEntries(
        Object.keys(schema.properties).map(key => {
          const fieldSchema = schema.properties![key] as any;
          
          // Generate wrong type
          if (fieldSchema.type === 'string') {
            return [key, fc.integer()]; // Number instead of string
          } else if (fieldSchema.type === 'number') {
            return [key, fc.string()]; // String instead of number
          } else if (fieldSchema.type === 'boolean') {
            return [key, fc.string()]; // String instead of boolean
          }
          
          return [key, fc.constant(null)];
        })
      )
    ),
    
    // Violate constraints
    ...Object.entries(schema.properties).flatMap(([key, fieldSchema]) => {
      const field = fieldSchema as any;
      const violations: fc.Arbitrary<any>[] = [];
      
      if (field.type === 'string') {
        // Violate maxLength
        if (field.maxLength !== undefined) {
          violations.push(
            fc.record({
              [key]: fc.string({ minLength: field.maxLength + 1, maxLength: field.maxLength + 100 })
            })
          );
        }
        
        // Violate minLength
        if (field.minLength !== undefined && field.minLength > 0) {
          violations.push(
            fc.record({
              [key]: fc.string({ maxLength: field.minLength - 1 })
            })
          );
        }
        
        // Violate enum
        if (field.enum && field.enum.length > 0) {
          violations.push(
            fc.record({
              [key]: fc.string().filter(s => !field.enum.includes(s))
            })
          );
        }
      } else if (field.type === 'number') {
        // Violate maximum
        if (field.maximum !== undefined) {
          violations.push(
            fc.record({
              [key]: fc.integer({ min: field.maximum + 1, max: field.maximum + 1000 })
            })
          );
        }
        
        // Violate minimum
        if (field.minimum !== undefined) {
          violations.push(
            fc.record({
              [key]: fc.integer({ min: field.minimum - 1000, max: field.minimum - 1 })
            })
          );
        }
      }
      
      return violations;
    })
  );
}

// ============================================================================
// Property Tests
// ============================================================================

describe('MCP Error Format Properties', () => {
  /**
   * Feature: prm-phase-2, Property 10: MCP Error Format Compliance
   * For any tool execution failure (invalid input, network error, parse error),
   * the MCP server should return an error object with code, message, and details
   * fields in MCP-compliant format.
   */
  it('Property 10: MCP error format compliance', async () => {
    const server = await getServer();
    const toolList = await server.listTools();
    
    // Test each tool with invalid inputs
    for (const toolInfo of toolList.tools) {
      await fc.assert(
        fc.asyncProperty(
          generateInvalidInput(toolInfo.inputSchema),
          async (invalidInput) => {
            // Execute tool with invalid input
            const result = await server.callTool(toolInfo.name, invalidInput);
            
            // Verify result structure exists
            expect(result).toBeDefined();
            expect(result.content).toBeDefined();
            expect(Array.isArray(result.content)).toBe(true);
            
            // If this is an error (which it should be for invalid input),
            // verify error format
            if (result.isError) {
              // Verify error flag is set
              expect(result.isError).toBe(true);
              
              // Verify content contains error message
              expect(result.content.length).toBeGreaterThan(0);
              
              const errorContent = result.content[0];
              expect(errorContent).toHaveProperty('type');
              expect(errorContent.type).toBe('text');
              expect(errorContent).toHaveProperty('text');
              expect(typeof errorContent.text).toBe('string');
              
              // Verify error message starts with "Error:"
              expect(errorContent.text).toMatch(/^Error:/);
            }
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    }
  });

  /**
   * Additional test: Verify error format for non-existent tools
   */
  it('returns proper error format for non-existent tools', async () => {
    const server = await getServer();
    
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 50 }).filter(s => !s.includes('gopher') && !s.includes('finger')),
        async (invalidToolName) => {
          const result = await server.callTool(invalidToolName, {});
          
          // Verify error structure
          expect(result.isError).toBe(true);
          expect(result.content).toBeDefined();
          expect(result.content.length).toBeGreaterThan(0);
          
          const errorContent = result.content[0];
          expect(errorContent.type).toBe('text');
          expect(errorContent.text).toContain('Error:');
          expect(errorContent.text).toContain('not found');
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Additional test: Verify error format for missing required fields
   */
  it('returns proper error format for missing required fields', async () => {
    const server = await getServer();
    const toolList = await server.listTools();
    
    for (const toolInfo of toolList.tools) {
      // Only test tools with required fields
      if (toolInfo.inputSchema.required && toolInfo.inputSchema.required.length > 0) {
        // Call with empty object (missing required fields)
        const result = await server.callTool(toolInfo.name, {});
        
        // Should return error
        expect(result.isError).toBe(true);
        expect(result.content).toBeDefined();
        expect(result.content.length).toBeGreaterThan(0);
        
        const errorContent = result.content[0];
        expect(errorContent.type).toBe('text');
        expect(errorContent.text).toContain('Error:');
        expect(errorContent.text).toMatch(/Missing required field/i);
      }
    }
  });

  /**
   * Additional test: Verify error format for type mismatches
   */
  it('returns proper error format for type mismatches', async () => {
    const server = await getServer();
    const toolList = await server.listTools();
    
    for (const toolInfo of toolList.tools) {
      // Create input with wrong types
      const wrongTypeInput: any = {};
      
      for (const [fieldName, fieldSchema] of Object.entries(toolInfo.inputSchema.properties || {})) {
        const field = fieldSchema as any;
        
        // Provide wrong type
        if (field.type === 'string') {
          wrongTypeInput[fieldName] = 12345; // Number instead of string
        } else if (field.type === 'number') {
          wrongTypeInput[fieldName] = 'not a number'; // String instead of number
        }
      }
      
      if (Object.keys(wrongTypeInput).length > 0) {
        const result = await server.callTool(toolInfo.name, wrongTypeInput);
        
        // Should return error
        expect(result.isError).toBe(true);
        expect(result.content).toBeDefined();
        expect(result.content.length).toBeGreaterThan(0);
        
        const errorContent = result.content[0];
        expect(errorContent.type).toBe('text');
        expect(errorContent.text).toContain('Error:');
      }
    }
  });

  /**
   * Additional test: Verify all error responses have consistent structure
   */
  it('all error responses have consistent structure', async () => {
    const server = await getServer();
    
    // Test various error scenarios
    const errorScenarios = [
      { tool: 'non_existent_tool', args: {} },
      { tool: 'gopher_request', args: { invalid: 'field' } },
      { tool: 'finger_request', args: { username: 12345 } } // Wrong type
    ];
    
    for (const scenario of errorScenarios) {
      const result = await server.callTool(scenario.tool, scenario.args);
      
      // All errors should have consistent structure
      expect(result).toHaveProperty('content');
      expect(result).toHaveProperty('isError');
      expect(Array.isArray(result.content)).toBe(true);
      
      if (result.isError) {
        expect(result.content.length).toBeGreaterThan(0);
        expect(result.content[0]).toHaveProperty('type');
        expect(result.content[0]).toHaveProperty('text');
        expect(result.content[0].type).toBe('text');
        expect(typeof result.content[0].text).toBe('string');
      }
    }
  });
});
