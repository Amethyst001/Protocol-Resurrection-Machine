import { describe, it, expect } from 'vitest';
import { DocumentationGenerator } from '../../src/documentation/documentation-generator.js';
import type { ProtocolSpec } from '../../src/types/protocol-spec.js';

describe('DocumentationGenerator Fallbacks', () => {
  const generator = new DocumentationGenerator();

  describe('Port Fallback', () => {
    it('should use spec port when defined', () => {
      const spec: ProtocolSpec = {
        protocol: {
          name: 'TestProtocol',
          port: 8080
        },
        connection: {
          type: 'TCP'
        },
        messageTypes: []
      } as ProtocolSpec;

      const doc = generator.generate(spec);
      expect(doc.readme).toContain('**Default Port**: 8080');
    });

    it('should infer Gopher port when not defined', () => {
      const spec: ProtocolSpec = {
        protocol: {
          name: 'Gopher'
        },
        connection: {
          type: 'TCP'
        },
        messageTypes: []
      } as ProtocolSpec;

      const doc = generator.generate(spec);
      expect(doc.readme).toContain('**Default Port**: 70');
    });

    it('should infer Finger port when not defined', () => {
      const spec: ProtocolSpec = {
        protocol: {
          name: 'Finger'
        },
        connection: {
          type: 'TCP'
        },
        messageTypes: []
      } as ProtocolSpec;

      const doc = generator.generate(spec);
      expect(doc.readme).toContain('**Default Port**: 79');
    });

    it('should default to N/A for unknown protocols', () => {
      const spec: ProtocolSpec = {
        protocol: {
          name: 'UnknownProtocol'
        },
        connection: {
          type: 'TCP'
        },
        messageTypes: []
      } as ProtocolSpec;

      const doc = generator.generate(spec);
      expect(doc.readme).toContain('**Default Port**: N/A');
    });
  });

  describe('Transport Fallback', () => {
    it('should use spec transport when defined', () => {
      const spec: ProtocolSpec = {
        protocol: {
          name: 'TestProtocol',
          port: 8080
        },
        connection: {
          type: 'UDP'
        },
        messageTypes: []
      } as ProtocolSpec;

      const doc = generator.generate(spec);
      expect(doc.readme).toContain('**Transport**: UDP');
    });

    it('should default to TCP when not defined', () => {
      const spec: ProtocolSpec = {
        protocol: {
          name: 'TestProtocol',
          port: 8080
        },
        connection: {},
        messageTypes: []
      } as ProtocolSpec;

      const doc = generator.generate(spec);
      expect(doc.readme).toContain('**Transport**: TCP');
    });
  });

  describe('Description Fallback', () => {
    it('should use spec description when defined', () => {
      const spec: ProtocolSpec = {
        protocol: {
          name: 'TestProtocol',
          port: 8080,
          description: 'A custom test protocol'
        },
        connection: {
          type: 'TCP'
        },
        messageTypes: []
      } as ProtocolSpec;

      const doc = generator.generate(spec);
      expect(doc.readme).toContain('A custom test protocol');
    });

    it('should generate description from protocol name when not defined', () => {
      const spec: ProtocolSpec = {
        protocol: {
          name: 'TestProtocol',
          port: 8080
        },
        connection: {
          type: 'TCP'
        },
        messageTypes: []
      } as ProtocolSpec;

      const doc = generator.generate(spec);
      expect(doc.readme).toContain('A generated SDK for the TestProtocol protocol.');
    });
  });

  describe('Package Name Sanitization', () => {
    it('should sanitize protocol names with spaces', () => {
      const spec: ProtocolSpec = {
        protocol: {
          name: 'Archie Help',
          port: 8080
        },
        connection: {
          type: 'TCP'
        },
        messageTypes: []
      } as ProtocolSpec;

      const doc = generator.generate(spec);
      expect(doc.readme).toContain('npm install @prm/generated-archie-help');
      expect(doc.readme).toContain('pip install prm-archie-help');
      expect(doc.readme).toContain('go get github.com/prm/generated/archie-help');
      expect(doc.readme).toContain('cargo add prm-archie-help');
    });

    it('should sanitize protocol names with special characters', () => {
      const spec: ProtocolSpec = {
        protocol: {
          name: 'WAIS-Search',
          port: 8080
        },
        connection: {
          type: 'TCP'
        },
        messageTypes: []
      } as ProtocolSpec;

      const doc = generator.generate(spec);
      expect(doc.readme).toContain('npm install @prm/generated-wais-search');
      expect(doc.readme).toContain('pip install prm-wais-search');
    });

    it('should not contain undefined in output', () => {
      const spec: ProtocolSpec = {
        protocol: {
          name: 'TestProtocol'
        },
        connection: {},
        messageTypes: []
      } as ProtocolSpec;

      const doc = generator.generate(spec);
      expect(doc.readme).not.toContain('undefined');
      expect(doc.apiReference).not.toContain('undefined');
    });
  });
});
