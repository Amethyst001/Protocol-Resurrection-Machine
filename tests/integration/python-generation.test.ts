/**
 * Integration Tests for Python Code Generation
 * 
 * Tests Python code generation with real protocol specifications
 */

import { describe, it, expect } from 'vitest';
import { PythonGenerator } from '../../src/generation/multi-language/python-generator.js';
import { createLanguageProfile } from '../../src/types/language-target.js';
import type { ProtocolSpec } from '../../src/types/protocol-spec.js';

describe('Python Code Generation - Integration Tests', () => {
  const generator = new PythonGenerator();
  const profile = createLanguageProfile('python');
  
  it('should generate Python code for Gopher protocol', async () => {
    const gopherSpec: ProtocolSpec = {
      protocol: {
        name: 'Gopher',
        rfc: 'RFC 1436',
        port: 70,
        description: 'The Internet Gopher Protocol'
      },
      connection: {
        type: 'tcp',
        terminator: '\\r\\n'
      },
      messageTypes: [
        {
          name: 'Query',
          direction: 'request',
          format: '{selector}\\r\\n',
          description: 'Gopher query message',
          fields: [
            {
              name: 'selector',
              type: 'string',
              optional: false,
              delimiter: '\\r\\n'
            }
          ]
        },
        {
          name: 'DirectoryItem',
          direction: 'response',
          format: '{type}{display}\\t{selector}\\t{host}\\t{port}\\r\\n',
          description: 'Gopher directory item',
          fields: [
            {
              name: 'type',
              type: 'string',
              optional: false
            },
            {
              name: 'display',
              type: 'string',
              optional: false,
              delimiter: '\\t'
            },
            {
              name: 'selector',
              type: 'string',
              optional: false,
              delimiter: '\\t'
            },
            {
              name: 'host',
              type: 'string',
              optional: false,
              delimiter: '\\t'
            },
            {
              name: 'port',
              type: 'integer',
              optional: false,
              delimiter: '\\r\\n'
            }
          ]
        }
      ]
    };
    
    // Generate Python code
    const artifacts = await generator.generate(gopherSpec, profile);
    
    // Verify artifacts
    expect(artifacts.language).toBe('python');
    expect(artifacts.parser).toBeTruthy();
    expect(artifacts.serializer).toBeTruthy();
    expect(artifacts.client).toBeTruthy();
    expect(artifacts.tests).toBeTruthy();
    
    // Verify parser contains expected classes
    expect(artifacts.parser).toContain('@dataclass');
    expect(artifacts.parser).toContain('class Query:');
    expect(artifacts.parser).toContain('class DirectoryItem:');
    expect(artifacts.parser).toContain('class GopherParser:');
    expect(artifacts.parser).toContain('def parse_query');
    expect(artifacts.parser).toContain('def parse_directory_item');
    
    // Verify serializer
    expect(artifacts.serializer).toContain('class GopherSerializer:');
    expect(artifacts.serializer).toContain('def serialize_query');
    expect(artifacts.serializer).toContain('def serialize_directory_item');
    
    // Verify client
    expect(artifacts.client).toContain('class GopherClient:');
    expect(artifacts.client).toContain('async def');
    expect(artifacts.client).toContain('asyncio');
    
    // Verify tests
    expect(artifacts.tests).toContain('from hypothesis import');
    expect(artifacts.tests).toContain('@given');
    expect(artifacts.tests).toContain('pytest');
    
    // Verify Python conventions
    expect(artifacts.parser).toContain('"""');  // Docstrings
    expect(artifacts.parser).not.toContain('interface');  // No TypeScript
    expect(artifacts.parser).not.toContain('export');  // No TypeScript
  });
  
  it('should generate Python code for Finger protocol', async () => {
    const fingerSpec: ProtocolSpec = {
      protocol: {
        name: 'Finger',
        rfc: 'RFC 1288',
        port: 79,
        description: 'The Finger User Information Protocol'
      },
      connection: {
        type: 'tcp',
        terminator: '\\r\\n'
      },
      messageTypes: [
        {
          name: 'Request',
          direction: 'request',
          format: '{username}@{host}\\r\\n',
          description: 'Finger request message',
          fields: [
            {
              name: 'username',
              type: 'string',
              optional: false,
              delimiter: '@'
            },
            {
              name: 'host',
              type: 'string',
              optional: false,
              delimiter: '\\r\\n'
            }
          ]
        }
      ]
    };
    
    // Generate Python code
    const artifacts = await generator.generate(fingerSpec, profile);
    
    // Verify artifacts
    expect(artifacts.language).toBe('python');
    expect(artifacts.parser).toContain('class Request:');
    expect(artifacts.parser).toContain('class FingerParser:');
    expect(artifacts.serializer).toContain('class FingerSerializer:');
    expect(artifacts.client).toContain('class FingerClient:');
    
    // Verify snake_case naming
    expect(artifacts.parser).toContain('def parse_request');
    expect(artifacts.serializer).toContain('def serialize_request');
  });
});
