#!/usr/bin/env node
/**
 * Validate MCP Server Implementation
 * 
 * Comprehensive validation of MCP server implementation
 * Validates Requirements: 3.1-3.4, 4.1-4.5, 26.1-26.3
 */

import { getServer } from '../generated/unified-mcp-server.js';
import { server as gopherServer } from '../generated/gopher/mcp-server.js';
import { server as fingerServer } from '../generated/finger/mcp-server.js';

interface ValidationResult {
  passed: boolean;
  message: string;
  details?: string;
}

async function validateRequirement(
  name: string,
  test: () => Promise<boolean>,
  details?: string
): Promise<ValidationResult> {
  try {
    const passed = await test();
    return {
      passed,
      message: name,
      details: passed ? '✓ PASS' : '✗ FAIL'
    };
  } catch (error) {
    return {
      passed: false,
      message: name,
      details: `✗ ERROR: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

async function main() {
  console.log('='.repeat(70));
  console.log('MCP Server Implementation Validation');
  console.log('='.repeat(70));
  console.log();

  const results: ValidationResult[] = [];

  // Requirement 3.1: MCP server generation
  console.log('Testing Requirement 3.1: MCP Server Generation...');
  results.push(await validateRequirement(
    '3.1.1: Gopher MCP server exists',
    async () => {
      const tools = await gopherServer.listTools();
      return tools.tools.length > 0;
    }
  ));
  
  results.push(await validateRequirement(
    '3.1.2: Finger MCP server exists',
    async () => {
      const tools = await fingerServer.listTools();
      return tools.tools.length > 0;
    }
  ));
  
  results.push(await validateRequirement(
    '3.1.3: Unified MCP server exists',
    async () => {
      const server = await getServer();
      const tools = await server.listTools();
      return tools.tools.length > 0;
    }
  ));

  // Requirement 3.2: Tool registration
  console.log('Testing Requirement 3.2: Tool Registration...');
  results.push(await validateRequirement(
    '3.2.1: Gopher tools follow naming convention',
    async () => {
      const tools = await gopherServer.listTools();
      return tools.tools.every(t => t.name.match(/^gopher_[a-z_]+$/));
    }
  ));
  
  results.push(await validateRequirement(
    '3.2.2: Finger tools follow naming convention',
    async () => {
      const tools = await fingerServer.listTools();
      return tools.tools.every(t => t.name.match(/^finger_[a-z_]+$/));
    }
  ));
  
  results.push(await validateRequirement(
    '3.2.3: Unified server registers all tools',
    async () => {
      const server = await getServer();
      const tools = await server.listTools();
      const hasGopher = tools.tools.some(t => t.name.startsWith('gopher_'));
      const hasFinger = tools.tools.some(t => t.name.startsWith('finger_'));
      return hasGopher && hasFinger;
    }
  ));

  // Requirement 3.3: Tool execution
  console.log('Testing Requirement 3.3: Tool Execution...');
  results.push(await validateRequirement(
    '3.3.1: Gopher tool executes successfully',
    async () => {
      const result = await gopherServer.callTool('gopher_request', { selector: '/test' });
      return result.content.length > 0 && !result.isError;
    }
  ));
  
  results.push(await validateRequirement(
    '3.3.2: Finger tool executes successfully',
    async () => {
      const result = await fingerServer.callTool('finger_request', { username: 'test' });
      return result.content.length > 0 && !result.isError;
    }
  ));
  
  results.push(await validateRequirement(
    '3.3.3: Unified server routes tools correctly',
    async () => {
      const server = await getServer();
      const gopherResult = await server.callTool('gopher_request', { selector: '/test' });
      const fingerResult = await server.callTool('finger_request', { username: 'test' });
      return !gopherResult.isError && !fingerResult.isError;
    }
  ));

  // Requirement 3.4: Error handling
  console.log('Testing Requirement 3.4: Error Handling...');
  results.push(await validateRequirement(
    '3.4.1: Invalid tool returns error',
    async () => {
      const server = await getServer();
      const result = await server.callTool('invalid_tool', {});
      return result.isError === true && result.content[0].text.includes('Error:');
    }
  ));
  
  results.push(await validateRequirement(
    '3.4.2: Missing required field returns error',
    async () => {
      const result = await gopherServer.callTool('gopher_request', {});
      return result.isError === true && result.content[0].text.includes('Error:');
    }
  ));
  
  results.push(await validateRequirement(
    '3.4.3: Wrong type returns error',
    async () => {
      const result = await gopherServer.callTool('gopher_request', { selector: 12345 });
      return result.isError === true && result.content[0].text.includes('Error:');
    }
  ));

  // Requirement 4.1: JSON schema generation
  console.log('Testing Requirement 4.1: JSON Schema Generation...');
  results.push(await validateRequirement(
    '4.1.1: All tools have input schemas',
    async () => {
      const server = await getServer();
      const tools = await server.listTools();
      return tools.tools.every(t => t.inputSchema && t.inputSchema.type === 'object');
    }
  ));
  
  results.push(await validateRequirement(
    '4.1.2: Schemas describe all fields',
    async () => {
      const server = await getServer();
      const tools = await server.listTools();
      return tools.tools.every(t => t.inputSchema.properties !== undefined);
    }
  ));

  // Requirement 4.2: Required fields
  console.log('Testing Requirement 4.2: Required Fields...');
  results.push(await validateRequirement(
    '4.2.1: Required fields are marked in schema',
    async () => {
      const tools = await gopherServer.listTools();
      const gopherTool = tools.tools[0];
      return gopherTool.inputSchema.required?.includes('selector') === true;
    }
  ));

  // Requirement 4.3: Field constraints
  console.log('Testing Requirement 4.3: Field Constraints...');
  results.push(await validateRequirement(
    '4.3.1: Schemas include validation rules',
    async () => {
      const tools = await gopherServer.listTools();
      const gopherTool = tools.tools[0];
      const selectorSchema = gopherTool.inputSchema.properties?.selector as any;
      return selectorSchema?.maxLength === 255;
    }
  ));

  // Requirement 26.1-26.3: Multi-protocol server
  console.log('Testing Requirements 26.1-26.3: Multi-Protocol Server...');
  results.push(await validateRequirement(
    '26.1: Single server contains all protocols',
    async () => {
      const server = await getServer();
      const tools = await server.listTools();
      return tools.tools.length >= 2;
    }
  ));
  
  results.push(await validateRequirement(
    '26.2: Tools have protocol prefixes',
    async () => {
      const server = await getServer();
      const tools = await server.listTools();
      return tools.tools.every(t => 
        t.name.startsWith('gopher_') || t.name.startsWith('finger_')
      );
    }
  ));
  
  results.push(await validateRequirement(
    '26.3: Server routes to correct protocol',
    async () => {
      const server = await getServer();
      const gopherResult = await server.callTool('gopher_request', { selector: '/' });
      const fingerResult = await server.callTool('finger_request', { username: '' });
      return !gopherResult.isError && !fingerResult.isError;
    }
  ));

  // Print results
  console.log();
  console.log('='.repeat(70));
  console.log('Validation Results');
  console.log('='.repeat(70));
  console.log();

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;

  for (const result of results) {
    const status = result.passed ? '✓' : '✗';
    const color = result.passed ? '\x1b[32m' : '\x1b[31m';
    const reset = '\x1b[0m';
    console.log(`${color}${status}${reset} ${result.message}`);
    if (result.details && !result.passed) {
      console.log(`  ${result.details}`);
    }
  }

  console.log();
  console.log('='.repeat(70));
  console.log(`Total: ${results.length} tests`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log('='.repeat(70));

  if (failed > 0) {
    console.log();
    console.log('❌ Validation FAILED');
    process.exit(1);
  } else {
    console.log();
    console.log('✅ All validations PASSED');
    console.log();
    console.log('MCP server implementation is complete and correct!');
  }
}

main().catch(error => {
  console.error('Validation error:', error);
  process.exit(1);
});
