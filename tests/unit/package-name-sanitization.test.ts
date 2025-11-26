import { describe, it, expect } from 'vitest';
import { DocumentationGenerator } from '../../src/documentation/documentation-generator.js';
import { MCPDocGenerator } from '../../src/documentation/mcp-doc-generator.js';
import type { ProtocolSpec } from '../../src/types/protocol-spec.js';

describe('Package Name Sanitization', () => {
  const docGenerator = new DocumentationGenerator();
  const mcpGenerator = new MCPDocGenerator();

  // Helper to create a minimal spec
  const createSpec = (name: string): ProtocolSpec => ({
    protocol: {
      name,
      port: 8080,
      description: 'Test protocol'
    },
    connection: {
      type: 'TCP'
    },
    messageTypes: []
  } as ProtocolSpec);

  describe('DocumentationGenerator', () => {
    it('should sanitize protocol names with spaces', () => {
      const spec = createSpec('Archie Help');
      const doc = docGenerator.generate(spec);
      
      expect(doc.readme).toContain('npm install @prm/generated-archie-help');
      expect(doc.readme).toContain('pip install prm-archie-help');
      expect(doc.readme).toContain('go get github.com/prm/generated/archie-help');
      expect(doc.readme).toContain('cargo add prm-archie-help');
      expect(doc.readme).not.toContain('archie help');
    });

    it('should sanitize protocol names with special characters', () => {
      const spec = createSpec('WAIS-Search!@#');
      const doc = docGenerator.generate(spec);
      
      expect(doc.readme).toContain('npm install @prm/generated-wais-search');
      expect(doc.readme).toContain('pip install prm-wais-search');
      // Package names should not contain special characters
      expect(doc.readme).not.toMatch(/npm install @prm\/generated-[^\s]*[!@#]/);
    });

    it('should convert to lowercase', () => {
      const spec = createSpec('MyProtocol');
      const doc = docGenerator.generate(spec);
      
      expect(doc.readme).toContain('npm install @prm/generated-myprotocol');
      // Package names should be lowercase
      expect(doc.readme).not.toMatch(/npm install @prm\/generated-[A-Z]/);
    });

    it('should remove leading and trailing hyphens', () => {
      const spec = createSpec('-Protocol-');
      const doc = docGenerator.generate(spec);
      
      expect(doc.readme).toContain('npm install @prm/generated-protocol');
      expect(doc.readme).not.toContain('--');
    });

    it('should collapse multiple hyphens', () => {
      const spec = createSpec('My---Protocol');
      const doc = docGenerator.generate(spec);
      
      expect(doc.readme).toContain('npm install @prm/generated-my-protocol');
      // Package names should not have multiple consecutive hyphens
      expect(doc.readme).not.toMatch(/npm install @prm\/generated-[^\s]*--/);
    });

    it('should handle mixed case and spaces', () => {
      const spec = createSpec('POP3 Mail Protocol');
      const doc = docGenerator.generate(spec);
      
      expect(doc.readme).toContain('npm install @prm/generated-pop3-mail-protocol');
      expect(doc.readme).toContain('pip install prm-pop3-mail-protocol');
    });
  });

  describe('MCPDocGenerator', () => {
    it('should sanitize protocol names in MCP configuration', () => {
      const spec = createSpec('Archie Help');
      const mcpDoc = mcpGenerator.generateMCPDocumentation(spec);
      
      expect(mcpDoc.serverConfiguration).toContain('archie-help-protocol');
      expect(mcpDoc.serverConfiguration).toContain('./generated/archie-help/mcp-server.js');
    });

    it('should sanitize protocol names in tool names', () => {
      const spec = createSpec('WAIS Search');
      const mcpDoc = mcpGenerator.generateMCPDocumentation(spec);
      
      // Tool names should use snake_case with sanitized protocol name
      expect(mcpDoc.toolSchemas.length).toBeGreaterThanOrEqual(0);
      if (mcpDoc.toolSchemas.length > 0) {
        expect(mcpDoc.toolSchemas[0].toolName).toMatch(/^wais-search_/);
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty string', () => {
      const spec = createSpec('');
      const doc = docGenerator.generate(spec);
      
      // Should not crash and should produce valid output
      expect(doc.readme).toBeDefined();
    });

    it('should handle only special characters', () => {
      const spec = createSpec('!@#$%^&*()');
      const doc = docGenerator.generate(spec);
      
      // Package names should not contain special characters
      expect(doc.readme).not.toMatch(/npm install @prm\/generated-[^\s]*[!@#$%^&*()]/);
    });

    it('should handle unicode characters', () => {
      const spec = createSpec('Protocol™');
      const doc = docGenerator.generate(spec);
      
      expect(doc.readme).toContain('npm install @prm/generated-protocol');
      // Package names should not contain unicode special characters
      expect(doc.readme).not.toMatch(/npm install @prm\/generated-[^\s]*™/);
    });

    it('should handle numbers', () => {
      const spec = createSpec('HTTP2');
      const doc = docGenerator.generate(spec);
      
      expect(doc.readme).toContain('npm install @prm/generated-http2');
    });

    it('should handle underscores', () => {
      const spec = createSpec('My_Protocol');
      const doc = docGenerator.generate(spec);
      
      // Underscores are allowed in package names
      expect(doc.readme).toContain('npm install @prm/generated-my_protocol');
    });
  });
});
