import { SpecFixer } from '../src/core/spec-fixer.js';

const testYaml = `protocol: Gopher
rfc: 1436
port: 70
definitions:
  request:
    structure: state_machine
    fields:
      - name: selector
        type: string
        transition: { on: "\\t", to: "search" }
      - name: search
        type: string
        transition: { on: "\\r\\n", to: "END" }`;

const fixer = new SpecFixer();
const fixed = fixer.fix(testYaml);

console.log('=== FIXED YAML ===');
console.log(fixed);
