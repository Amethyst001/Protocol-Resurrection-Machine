import { describe, it, expect } from 'vitest';
// UPDATE IMPORT: Use the new class name
import { StateMachineParserGenerator } from '../../src/generation/state-machine-parser-generator';
import type { MessageType } from '../../src/types/protocol-spec';

describe('ParserGenerator', () => {
  it('should analyze parsing strategy correctly', () => {
    // UPDATE INSTANTIATION
    const generator = new StateMachineParserGenerator();
    
    const messageType: MessageType = {
      name: 'Simple',
      direction: 'response',
      format: 'fixed string',
      fields: []
    };

    // Update assertions to check what the new generator actually does
    // For example, checking if it returns a string containing the class definition
    const code = generator.generateParser(messageType);
    expect(code).toContain('class SimpleParser');
    expect(code).toContain('parse(data: Buffer');
  });

  it('should generate state machine for complex formats', () => {
    // UPDATE INSTANTIATION
    const generator = new StateMachineParserGenerator();
    
    const messageType: MessageType = {
      name: 'Complex',
      direction: 'response',
      format: '{field1}\t{field2}\r\n',
      fields: [
        { name: 'field1', type: { kind: 'string' }, required: true },
        { name: 'field2', type: { kind: 'string' }, required: true }
      ]
    };

    const code = generator.generateParser(messageType);
    expect(code).toContain('EXPECT_DELIMITER');
    expect(code).toContain('EXTRACT_FIELD');
  });
});