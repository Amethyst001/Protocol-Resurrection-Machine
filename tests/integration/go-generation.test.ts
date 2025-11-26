/**
 * Integration Tests for Go Code Generation
 * 
 * Tests Go code generation with real protocol specifications
 */

import { describe, it, expect } from 'vitest';
import { GoGenerator } from '../../src/generation/multi-language/go-generator.js';
import { createLanguageProfile } from '../../src/types/language-target.js';
import type { ProtocolSpec } from '../../src/types/protocol-spec.js';

describe('Go Code Generation - Integration Tests', () => {
  const generator = new GoGenerator();
  const profile = createLanguageProfile('go');
  
  it('should generate Go code for Gopher protocol', async () => {
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
    
    // Generate Go code
    const artifacts = await generator.generate(gopherSpec, profile);
    
    // Verify artifacts
    expect(artifacts.language).toBe('go');
    expect(artifacts.parser).toBeTruthy();
    expect(artifacts.serializer).toBeTruthy();
    expect(artifacts.client).toBeTruthy();
    expect(artifacts.tests).toBeTruthy();
    
    // Verify parser contains expected structs and functions
    expect(artifacts.parser).toContain('package gopher');
    expect(artifacts.parser).toContain('type Query struct');
    expect(artifacts.parser).toContain('type DirectoryItem struct');
    expect(artifacts.parser).toContain('type GopherParser struct');
    expect(artifacts.parser).toContain('func (p *GopherParser) ParseQuery');
    expect(artifacts.parser).toContain('func (p *GopherParser) ParseDirectoryItem');
    
    // Verify serializer
    expect(artifacts.serializer).toContain('package gopher');
    expect(artifacts.serializer).toContain('type GopherSerializer struct');
    expect(artifacts.serializer).toContain('func (s *GopherSerializer) SerializeQuery');
    expect(artifacts.serializer).toContain('func (s *GopherSerializer) SerializeDirectoryItem');
    
    // Verify client
    expect(artifacts.client).toContain('package gopher');
    expect(artifacts.client).toContain('type GopherClient struct');
    expect(artifacts.client).toContain('func (c *GopherClient) Query');
    expect(artifacts.client).toContain('context.Context');
    
    // Verify tests
    expect(artifacts.tests).toContain('package gopher_test');
    expect(artifacts.tests).toContain('func Test');
    expect(artifacts.tests).toContain('github.com/stretchr/testify');
    
    // Verify Go conventions
    expect(artifacts.parser).toContain('// ');  // godoc comments
    expect(artifacts.parser).toContain('[]byte');  // byte slices
    expect(artifacts.parser).not.toContain('export');  // No TypeScript
    expect(artifacts.parser).not.toContain('class');  // No Python
  });
  
  it('should generate Go code for Finger protocol', async () => {
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
    
    // Generate Go code
    const artifacts = await generator.generate(fingerSpec, profile);
    
    // Verify artifacts
    expect(artifacts.language).toBe('go');
    expect(artifacts.parser).toContain('package finger');
    expect(artifacts.parser).toContain('type Request struct');
    expect(artifacts.parser).toContain('type FingerParser struct');
    expect(artifacts.serializer).toContain('type FingerSerializer struct');
    expect(artifacts.client).toContain('type FingerClient struct');
    
    // Verify PascalCase for exported names
    expect(artifacts.parser).toContain('func (p *FingerParser) ParseRequest');
    expect(artifacts.serializer).toContain('func (s *FingerSerializer) SerializeRequest');
  });
  
  it('should use []byte type for data', async () => {
    const simpleSpec: ProtocolSpec = {
      protocol: {
        name: 'Simple',
        port: 8080,
        description: 'Simple protocol'
      },
      connection: {
        type: 'tcp',
        terminator: '\\n'
      },
      messageTypes: [
        {
          name: 'Message',
          direction: 'both',
          format: '{data}\\n',
          description: 'Simple message',
          fields: [
            {
              name: 'data',
              type: 'string',
              optional: false,
              delimiter: '\\n'
            }
          ]
        }
      ]
    };
    
    const artifacts = await generator.generate(simpleSpec, profile);
    
    // Verify []byte is used for data
    expect(artifacts.parser).toContain('[]byte');
    expect(artifacts.parser).toContain('func (p *SimpleParser) ParseMessage(data []byte)');
  });
  
  it('should include godoc comments', async () => {
    const simpleSpec: ProtocolSpec = {
      protocol: {
        name: 'Test',
        port: 9000,
        description: 'Test protocol'
      },
      connection: {
        type: 'tcp',
        terminator: '\\n'
      },
      messageTypes: [
        {
          name: 'TestMessage',
          direction: 'request',
          format: '{field}\\n',
          description: 'Test message',
          fields: [
            {
              name: 'field',
              type: 'string',
              optional: false,
              delimiter: '\\n'
            }
          ]
        }
      ]
    };
    
    const artifacts = await generator.generate(simpleSpec, profile);
    
    // Verify godoc comments
    expect(artifacts.parser).toMatch(/\/\/ Package test provides/);
    expect(artifacts.parser).toMatch(/\/\/ TestMessage represents/);
    expect(artifacts.parser).toMatch(/\/\/ ParseTestMessage parses/);
  });
  
  it('should apply PascalCase for exports and camelCase for private', async () => {
    const spec: ProtocolSpec = {
      protocol: {
        name: 'Example',
        port: 5000,
        description: 'Example protocol'
      },
      connection: {
        type: 'tcp',
        terminator: '\\n'
      },
      messageTypes: [
        {
          name: 'ExampleMessage',
          direction: 'request',
          format: '{myField}\\n',
          description: 'Example message',
          fields: [
            {
              name: 'myField',
              type: 'string',
              optional: false,
              delimiter: '\\n'
            }
          ]
        }
      ]
    };
    
    const artifacts = await generator.generate(spec, profile);
    
    // Verify PascalCase for exported types
    expect(artifacts.parser).toContain('type ExampleMessage struct');
    expect(artifacts.parser).toContain('type ExampleParser struct');
    
    // Verify PascalCase for exported fields
    expect(artifacts.parser).toContain('MyField string');
    
    // Verify exported functions start with capital letter
    expect(artifacts.parser).toContain('func NewExampleParser()');
    expect(artifacts.parser).toContain('func (p *ExampleParser) ParseExampleMessage');
  });
});
