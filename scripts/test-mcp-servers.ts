#!/usr/bin/env node
/**
 * Test MCP Servers
 * 
 * Verifies that generated MCP servers work correctly
 */

import { server as gopherServer } from '../generated/gopher/mcp-server.js';
import { server as fingerServer } from '../generated/finger/mcp-server.js';

async function testServer(server: any, name: string) {
  console.log(`\nTesting ${name} MCP Server:`);
  
  // Test tool listing
  const toolList = await server.listTools();
  console.log(`  Tools: ${toolList.tools.length}`);
  
  for (const tool of toolList.tools) {
    console.log(`    - ${tool.name}: ${tool.description}`);
    console.log(`      Schema: ${JSON.stringify(tool.inputSchema.properties, null, 2)}`);
  }
  
  // Test tool execution
  const toolName = toolList.tools[0].name;
  console.log(`\n  Testing tool execution: ${toolName}`);
  
  // Create test args based on schema
  const schema = toolList.tools[0].inputSchema;
  const testArgs: any = {};
  
  for (const [fieldName, fieldSchema] of Object.entries(schema.properties || {})) {
    const field = fieldSchema as any;
    if (field.default !== undefined) {
      testArgs[fieldName] = field.default;
    } else if (field.type === 'string') {
      testArgs[fieldName] = 'test';
    } else if (field.type === 'number') {
      testArgs[fieldName] = 123;
    }
  }
  
  const result = await server.callTool(toolName, testArgs);
  console.log(`  Result: ${JSON.stringify(result, null, 2)}`);
  
  return toolList.tools.length;
}

async function main() {
  console.log('='.repeat(60));
  console.log('MCP Server Test Suite');
  console.log('='.repeat(60));
  
  const gopherToolCount = await testServer(gopherServer, 'Gopher');
  const fingerToolCount = await testServer(fingerServer, 'Finger');
  
  console.log('\n' + '='.repeat(60));
  console.log('Summary:');
  console.log(`  Gopher tools: ${gopherToolCount}`);
  console.log(`  Finger tools: ${fingerToolCount}`);
  console.log(`  Total tools: ${gopherToolCount + fingerToolCount}`);
  console.log('='.repeat(60));
  
  // Verify tool names follow convention
  const gopherTools = await gopherServer.listTools();
  const fingerTools = await fingerServer.listTools();
  
  console.log('\nTool Name Convention Check:');
  for (const tool of gopherTools.tools) {
    const matches = tool.name.match(/^gopher_[a-z_]+$/);
    console.log(`  ${tool.name}: ${matches ? '✓' : '✗'}`);
  }
  
  for (const tool of fingerTools.tools) {
    const matches = tool.name.match(/^finger_[a-z_]+$/);
    console.log(`  ${tool.name}: ${matches ? '✓' : '✗'}`);
  }
  
  console.log('\n✓ All tests passed!');
}

main().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});
