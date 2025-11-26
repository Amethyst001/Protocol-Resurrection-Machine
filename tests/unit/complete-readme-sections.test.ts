import { describe, it, expect } from 'vitest';
import { DocumentationGenerator } from '../../src/documentation/documentation-generator.js';
import type { ProtocolSpec } from '../../src/types/protocol-spec.js';

describe('Complete README Sections', () => {
  const generator = new DocumentationGenerator();

  const createTestSpec = (overrides?: Partial<ProtocolSpec>): ProtocolSpec => ({
    protocol: {
      name: 'Test Protocol',
      port: 8080,
      description: 'A test protocol'
    },
    connection: {
      type: 'TCP'
    },
    messageTypes: [
      {
        name: 'TestRequest',
        direction: 'request',
        format: '{field1}\t{field2}\r\n',
        fields: [
          {
            name: 'field1',
            type: { kind: 'string' },
            required: true
          },
          {
            name: 'field2',
            type: { kind: 'number' },
            required: true
          }
        ]
      },
      {
        name: 'TestResponse',
        direction: 'response',
        format: '{status}\t{data}\r\n',
        fields: [
          {
            name: 'status',
            type: { kind: 'string' },
            required: true
          },
          {
            name: 'data',
            type: { kind: 'string' },
            required: false
          }
        ]
      }
    ],
    ...overrides
  });

  describe('API Reference Section', () => {
    it('should include API Reference section when referenced', () => {
      const spec = createTestSpec();
      const doc = generator.generate(spec);

      expect(doc.readme).toContain('## API Reference');
      expect(doc.readme).toContain('[API Reference](#api-reference)');
    });

    it('should include basic usage example in API Reference', () => {
      const spec = createTestSpec();
      const doc = generator.generate(spec);

      expect(doc.readme).toContain('### Basic Usage');
      expect(doc.readme).toContain('```typescript');
      expect(doc.readme).toContain('import {');
      expect(doc.readme).toContain('Client');
    });

    it('should use placeholder when code not ready', () => {
      const spec = createTestSpec();
      const doc = generator.generate(spec);

      // Should have content, not just empty
      const apiRefMatch = doc.readme.match(/## API Reference\n\n([\s\S]*?)\n\n##/);
      expect(apiRefMatch).toBeTruthy();
      expect(apiRefMatch![1].trim().length).toBeGreaterThan(0);
    });
  });

  describe('Examples Section', () => {
    it('should include Examples section when referenced', () => {
      const spec = createTestSpec();
      const doc = generator.generate(spec);

      expect(doc.readme).toContain('## Examples');
      expect(doc.readme).toContain('[Examples](#examples)');
    });

    it('should include TypeScript example with proper imports', () => {
      const spec = createTestSpec();
      const doc = generator.generate(spec);

      expect(doc.readme).toContain('### TypeScript');
      expect(doc.readme).toContain('```typescript');
      expect(doc.readme).toContain('import {');
      expect(doc.readme).toContain('from \'@prm/generated-test-protocol\'');
      expect(doc.readme).toContain('async function');
      expect(doc.readme).toContain('.catch(console.error)');
    });

    it('should include Python example with proper imports', () => {
      const spec = createTestSpec();
      const doc = generator.generate(spec);

      expect(doc.readme).toContain('### Python');
      expect(doc.readme).toContain('```python');
      expect(doc.readme).toContain('from prm_test_protocol import');
      expect(doc.readme).toContain('import asyncio');
      expect(doc.readme).toContain('async def');
      expect(doc.readme).toContain('asyncio.run(');
    });

    it('should include Go example with proper imports', () => {
      const spec = createTestSpec();
      const doc = generator.generate(spec);

      expect(doc.readme).toContain('### Go');
      expect(doc.readme).toContain('```go');
      expect(doc.readme).toContain('package main');
      expect(doc.readme).toContain('import (');
      expect(doc.readme).toContain('github.com/prm/generated/test-protocol');
      expect(doc.readme).toContain('func main()');
      expect(doc.readme).toContain('if err != nil');
    });

    it('should include Rust example with proper use statements', () => {
      const spec = createTestSpec();
      const doc = generator.generate(spec);

      expect(doc.readme).toContain('### Rust');
      expect(doc.readme).toContain('```rust');
      expect(doc.readme).toContain('use prm_test_protocol::');
      expect(doc.readme).toContain('#[tokio::main]');
      expect(doc.readme).toContain('async fn main() -> Result<');
      expect(doc.readme).toContain('Ok(())');
    });

    it('should include all 4 language examples', () => {
      const spec = createTestSpec();
      const doc = generator.generate(spec);

      // Check that all language sections exist in the README
      expect(doc.readme).toContain('## Examples');
      expect(doc.readme).toContain('### TypeScript');
      expect(doc.readme).toContain('### Python');
      expect(doc.readme).toContain('### Go');
      expect(doc.readme).toContain('### Rust');
      
      // Verify they're in the Examples section
      const examplesIndex = doc.readme.indexOf('## Examples');
      const nextSectionIndex = doc.readme.indexOf('\n## ', examplesIndex + 1);
      const examplesContent = nextSectionIndex > 0 
        ? doc.readme.slice(examplesIndex, nextSectionIndex)
        : doc.readme.slice(examplesIndex);
      
      expect(examplesContent).toContain('### TypeScript');
      expect(examplesContent).toContain('### Python');
      expect(examplesContent).toContain('### Go');
      expect(examplesContent).toContain('### Rust');
    });
  });

  describe('Internal Links Validation', () => {
    it('should have valid internal links', () => {
      const spec = createTestSpec();
      const doc = generator.generate(spec);

      // Extract all internal links
      const links = doc.readme.match(/\[([^\]]+)\]\(#([^)]+)\)/g) || [];

      links.forEach(link => {
        const anchorMatch = link.match(/#([^)]+)/);
        if (anchorMatch) {
          const anchor = anchorMatch[1];
          const headingText = anchor.replace(/-/g, ' ');
          const headingRegex = new RegExp(`^## ${headingText}`, 'im');
          
          expect(headingRegex.test(doc.readme)).toBe(true);
        }
      });
    });

    it('should not have broken links to API Reference', () => {
      const spec = createTestSpec();
      const doc = generator.generate(spec);

      if (doc.readme.includes('[API Reference](#api-reference)')) {
        expect(doc.readme).toMatch(/^## API Reference/im);
      }
    });

    it('should not have broken links to Examples', () => {
      const spec = createTestSpec();
      const doc = generator.generate(spec);

      if (doc.readme.includes('[Examples](#examples)')) {
        expect(doc.readme).toMatch(/^## Examples/im);
      }
    });
  });

  describe('Empty Sections', () => {
    it('should not have empty API Reference section', () => {
      const spec = createTestSpec();
      const doc = generator.generate(spec);

      const apiRefMatch = doc.readme.match(/## API Reference\n\n([\s\S]*?)\n\n##/);
      if (apiRefMatch) {
        const content = apiRefMatch[1].trim();
        expect(content.length).toBeGreaterThan(0);
        expect(content).not.toBe('Coming soon');
      }
    });

    it('should not have empty Examples section', () => {
      const spec = createTestSpec();
      const doc = generator.generate(spec);

      const examplesMatch = doc.readme.match(/## Examples\n\n([\s\S]*?)(?:\n\n##|$)/);
      if (examplesMatch) {
        const content = examplesMatch[1].trim();
        expect(content.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Code Example Syntax', () => {
    it('should have syntactically valid TypeScript examples', () => {
      const spec = createTestSpec();
      const doc = generator.generate(spec);

      const tsExamples = doc.readme.match(/```typescript\n([\s\S]*?)```/g) || [];
      
      tsExamples.forEach(example => {
        const code = example.replace(/```typescript\n/, '').replace(/```$/, '');
        
        // Basic syntax checks
        expect(code).toContain('import');
        expect(code).toContain('from');
        
        // Should have balanced braces
        const openBraces = (code.match(/{/g) || []).length;
        const closeBraces = (code.match(/}/g) || []).length;
        expect(openBraces).toBe(closeBraces);
        
        // Should have balanced parentheses
        const openParens = (code.match(/\(/g) || []).length;
        const closeParens = (code.match(/\)/g) || []).length;
        expect(openParens).toBe(closeParens);
      });
    });

    it('should have syntactically valid Python examples', () => {
      const spec = createTestSpec();
      const doc = generator.generate(spec);

      const pyExamples = doc.readme.match(/```python\n([\s\S]*?)```/g) || [];
      
      pyExamples.forEach(example => {
        const code = example.replace(/```python\n/, '').replace(/```$/, '');
        
        // Basic syntax checks
        expect(code).toContain('import');
        expect(code).toContain('def ');
        expect(code).toContain('async ');
      });
    });

    it('should have syntactically valid Go examples', () => {
      const spec = createTestSpec();
      const doc = generator.generate(spec);

      const goExamples = doc.readme.match(/```go\n([\s\S]*?)```/g) || [];
      
      goExamples.forEach(example => {
        const code = example.replace(/```go\n/, '').replace(/```$/, '');
        
        // Basic syntax checks
        expect(code).toContain('package main');
        expect(code).toContain('import');
        expect(code).toContain('func main()');
      });
    });

    it('should have syntactically valid Rust examples', () => {
      const spec = createTestSpec();
      const doc = generator.generate(spec);

      const rustExamples = doc.readme.match(/```rust\n([\s\S]*?)```/g) || [];
      
      rustExamples.forEach(example => {
        const code = example.replace(/```rust\n/, '').replace(/```$/, '');
        
        // Basic syntax checks
        expect(code).toContain('use ');
        expect(code).toContain('fn main()');
        expect(code).toContain('Result<');
      });
    });
  });

  describe('Documentation Validation', () => {
    it('should not contain undefined values', () => {
      const spec = createTestSpec();
      const doc = generator.generate(spec);

      expect(doc.readme).not.toContain('undefined');
    });

    it('should not contain undefined even with missing optional fields', () => {
      const spec = createTestSpec({
        protocol: {
          name: 'Test Protocol'
          // port and description intentionally missing
        }
      });
      const doc = generator.generate(spec);

      expect(doc.readme).not.toContain('undefined');
    });

    it('should have valid package names in installation commands', () => {
      const spec = createTestSpec({
        protocol: {
          name: 'Test Protocol With Spaces'
        }
      });
      const doc = generator.generate(spec);

      // Check npm command
      const npmMatch = doc.readme.match(/npm install ([^\n]+)/);
      expect(npmMatch).toBeTruthy();
      expect(npmMatch![1]).not.toContain(' ');
      expect(npmMatch![1]).toMatch(/^@prm\/generated-[a-z0-9-]+$/);

      // Check pip command
      const pipMatch = doc.readme.match(/pip install ([^\n]+)/);
      expect(pipMatch).toBeTruthy();
      expect(pipMatch![1]).not.toContain(' ');
      expect(pipMatch![1]).toMatch(/^prm-[a-z0-9-]+$/);

      // Check go command
      const goMatch = doc.readme.match(/go get ([^\n]+)/);
      expect(goMatch).toBeTruthy();
      expect(goMatch![1]).not.toContain(' ');

      // Check cargo command
      const cargoMatch = doc.readme.match(/cargo add ([^\n]+)/);
      expect(cargoMatch).toBeTruthy();
      expect(cargoMatch![1]).not.toContain(' ');
      expect(cargoMatch![1]).toMatch(/^prm-[a-z0-9-]+$/);
    });
  });
});
