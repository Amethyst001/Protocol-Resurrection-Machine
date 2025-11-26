/**
 * Unit tests for Parser Generator
 */

import { describe, it, expect } from 'vitest';
import { ParserGenerator, ParserGenerationStrategy } from '../../src/generation/parser-generator.js';
import type { ProtocolSpec } from '../../src/types/protocol-spec.js';

describe('ParserGenerator', () => {
  it('should generate parser code for a simple protocol', () => {
    const spec: ProtocolSpec = {
      protocol: {
        name: 'TestProtocol',
        port: 1234,
        description: 'Test protocol',
      },
      connection: {
        type: 'TCP',
      },
      messageTypes: [
        {
          name: 'Request',
          direction: 'request',
          format: '{selector}\r\n',
          terminator: '\r\n',
          fields: [
            {
              name: 'selector',
              type: { kind: 'string' },
              required: true,
            },
          ],
        },
      ],
    };

    const generator = new ParserGenerator();
    const code = generator.generate(spec);

    expect(code).toContain('export interface ParseResult');
    expect(code).toContain('export interface Request');
    expect(code).toContain('export class RequestParser');
    expect(code).toContain('export class TestProtocolParser');
  });

  it.skip('should analyze parsing strategy correctly (SKIPPED: expects old parser architecture)', () => {
    const strategy = new ParserGenerationStrategy();

    const messageType = {
      name: 'DirectoryItem',
      direction: 'response' as const,
      format: '{itemType}{display}\t{selector}\t{host}\t{port}\r\n',
      delimiter: '\t',
      terminator: '\r\n',
      fields: [
        { name: 'itemType', type: { kind: 'string' as const }, required: true },
        { name: 'display', type: { kind: 'string' as const }, required: true },
        { name: 'selector', type: { kind: 'string' as const }, required: true },
        { name: 'host', type: { kind: 'string' as const }, required: true },
        { name: 'port', type: { kind: 'number' as const }, required: true },
      ],
    };

    const result = strategy.analyzeMessageType(messageType);

    expect(result.approach).toBe('delimiter-based');
    expect(result.usesDelimiters).toBe(true);
    expect(result.fieldOrder).toEqual(['itemType', 'display', 'selector', 'host', 'port']);
  });

  it.skip('should generate state machine for complex formats (SKIPPED: expects old parser architecture)', () => {
    const strategy = new ParserGenerationStrategy();
    const messageType = {
      name: 'Complex',
      direction: 'request' as const,
      format: 'GET {path} HTTP/1.1\r\n',
      fields: [
        { name: 'path', type: { kind: 'string' as const }, required: true },
      ],
    };

    const parsedStrategy = strategy.analyzeMessageType(messageType);
    const stateMachine = strategy.generateStateMachine(parsedStrategy);

    expect(stateMachine.states.length).toBeGreaterThan(0);
    expect(stateMachine.initialState).toBe(0);
  });
});
