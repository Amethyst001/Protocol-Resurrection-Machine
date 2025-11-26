import { formatCode } from '../utils/code-formatter.js';

const input = `
export class DemoChatClient extends EventEmitter {
  private parser: DemoChatParser;
  
  constructor() {
    super();
    this.parser = new DemoChatParser();
  }
}`;

console.log('--- Original ---');
console.log(input);

const formatted = formatCode(input, { language: 'typescript', indentSize: 4 });

console.log('--- Formatted ---');
console.log(formatted);
