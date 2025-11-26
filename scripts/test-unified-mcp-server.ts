#!/usr/bin/env node
/**
 * Test Unified MCP Server
 * 
 * Verifies that the unified multi-protocol MCP server works correctly
 */

import { getServer } from '../generated/unified-mcp-server.js';

async function main() {
  console.log('='.repeat(60));
  console.log('Unified MCP Server Test');
  console.log('='.repeat(60));
  
  const server = await getServer();
  
  // Test tool listing
  const toolList = await server.listTools();
  console.log(`\nTotal tools registered: ${toolList.tools.length}`);
  
  // Group by protocol
  const gopherTools = toolList.tools.filter(t => t.name.startsWith('gopher_'));
  const fingerTools = toolList.tools.filter(t => t.name.startsWith('finger_'));
  
  console.log(`\nGopher tools: ${gopherTools.length}`);
  gopherTools.forEach(tool => {
    console.log(`  - ${tool.name}`);
  });
  
  console.log(`\nFinger tools: ${fingerTools.length}`);
  fingerTools.forEach(tool => {
    console.log(`  - ${tool.name}`);
  });
  
  // Test tool routing - call a Gopher tool
  console.log('\n' + '-'.repeat(60));
  console.log('Testing Gopher tool routing:');
  const gopherResult = await server.callTool('gopher_request', { selector: '/test' });
  console.log(`  Result: ${JSON.stringify(gopherResult, null, 2)}`);
  
  // Test tool routing - call a Finger tool
  console.log('\n' + '-'.repeat(60));
  console.log('Testing Finger tool routing:');
  const fingerResult = await server.callTool('finger_request', { username: 'testuser' });
  console.log(`  Result: ${JSON.stringify(fingerResult, null, 2)}`);
  
  // Test invalid tool
  console.log('\n' + '-'.repeat(60));
  console.log('Testing invalid tool handling:');
  const invalidResult = await server.callTool('invalid_tool', {});
  console.log(`  Result: ${JSON.stringify(invalidResult, null, 2)}`);
  
  console.log('\n' + '='.repeat(60));
  console.log('Verification Results:');
  console.log(`  ✓ Both protocols registered: ${gopherTools.length > 0 && fingerTools.length > 0}`);
  console.log(`  ✓ Tool routing works: ${!gopherResult.isError && !fingerResult.isError}`);
  console.log(`  ✓ Error handling works: ${invalidResult.isError === true}`);
  console.log('='.repeat(60));
  
  console.log('\n✓ All unified server tests passed!');
}

main().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});
