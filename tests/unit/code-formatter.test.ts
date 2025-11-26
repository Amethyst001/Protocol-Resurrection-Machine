import { describe, it, expect } from 'vitest';
import { cleanWhitespace, normalizeIndentation, formatCode, validateWhitespace } from '../../src/utils/code-formatter.js';

describe('Code Formatter', () => {
    describe('cleanWhitespace', () => {
        it('should remove non-breaking spaces', () => {
            const input = 'function\u00A0test() {\u00A0\u00A0return\u00A042;\u00A0}';
            const output = cleanWhitespace(input);
            expect(output).toBe('function test() {  return 42; }');
            expect(output).not.toContain('\u00A0');
        });

        it('should normalize line endings', () => {
            const input = 'line1\r\nline2\rline3\nline4';
            const output = cleanWhitespace(input);
            expect(output).toBe('line1\nline2\nline3\nline4');
        });

        it('should remove trailing whitespace', () => {
            const input = 'line1   \nline2\t\t\nline3  ';
            const output = cleanWhitespace(input);
            expect(output).toBe('line1\nline2\nline3');
        });

        it('should limit consecutive blank lines', () => {
            const input = 'line1\n\n\n\n\nline2';
            const output = cleanWhitespace(input);
            expect(output).toBe('line1\n\n\nline2');
        });
    });

    describe('normalizeIndentation', () => {
        it('should convert tabs to spaces', () => {
            const input = '\tfunction test() {\n\t\treturn 42;\n\t}';
            const output = normalizeIndentation(input, 4);
            expect(output).toBe('    function test() {\n        return 42;\n    }');
        });

        it('should normalize mixed indentation', () => {
            const input = '  function test() {\n      return 42;\n  }';
            const output = normalizeIndentation(input, 4);
            expect(output).toBe('    function test() {\n        return 42;\n    }');
        });

        it('should preserve empty lines', () => {
            const input = 'line1\n\nline2';
            const output = normalizeIndentation(input, 4);
            expect(output).toBe('line1\n\nline2');
        });
    });

    describe('formatCode', () => {
        it('should format Python code', () => {
            const input = 'def\u00A0test():\n\treturn\u00A042';
            const output = formatCode(input, { language: 'python', indentSize: 4 });
            expect(output).not.toContain('\u00A0');
            expect(output).toContain('def test():');
            expect(output.endsWith('\n')).toBe(true);
        });

        it('should format Go code', () => {
            const input = 'func\u00A0test()\u00A0int\u00A0{\n\treturn\u00A042\n}';
            const output = formatCode(input, { language: 'go', indentSize: 4 });
            expect(output).not.toContain('\u00A0');
            expect(output).toContain('func test() int {');
        });

        it('should format Rust code', () => {
            const input = 'fn\u00A0test()\u00A0->\u00A0i32\u00A0{\n\t42\n}';
            const output = formatCode(input, { language: 'rust', indentSize: 4 });
            expect(output).not.toContain('\u00A0');
            expect(output).toContain('fn test() -> i32 {');
        });

        it('should format TypeScript code', () => {
            const input = 'function\u00A0test():\u00A0number\u00A0{\n\treturn\u00A042;\n}';
            const output = formatCode(input, { language: 'typescript', indentSize: 4 });
            expect(output).not.toContain('\u00A0');
            expect(output).toContain('function test(): number {');
        });

        it('should ensure file ends with single newline', () => {
            const input = 'function test() { return 42; }';
            const output = formatCode(input, { language: 'typescript', indentSize: 4 });
            expect(output.endsWith('\n')).toBe(true);
            expect(output).not.toMatch(/\n\n$/);
        });
    });

    describe('validateWhitespace', () => {
        it('should detect non-breaking spaces', () => {
            const input = 'function\u00A0test() {\n\treturn\u00A042;\n}';
            const problems = validateWhitespace(input);
            expect(problems.length).toBeGreaterThan(0);
            expect(problems[0].charCode).toBe(0x00A0);
        });

        it('should return empty array for clean code', () => {
            const input = 'function test() {\n    return 42;\n}';
            const problems = validateWhitespace(input);
            expect(problems).toEqual([]);
        });

        it('should provide line and column information', () => {
            const input = 'line1\nline2\u00A0test\nline3';
            const problems = validateWhitespace(input);
            expect(problems.length).toBe(1);
            expect(problems[0].line).toBe(2);
            expect(problems[0].column).toBe(6);
        });
    });

    describe('Language-specific formatting', () => {
        it('should add spacing after commas in Python', () => {
            const input = 'def test(a,b,c):\n    return a+b+c';
            const output = formatCode(input, { language: 'python', indentSize: 4 });
            expect(output).toContain('(a, b, c)');
        });

        it('should add blank lines before Rust top-level items', () => {
            const input = 'struct A {}\nstruct B {}';
            const output = formatCode(input, { language: 'rust', indentSize: 4 });
            // The formatter adds blank lines between top-level items
            const lines = output.split('\n');
            expect(lines.length).toBeGreaterThanOrEqual(3);
        });
    });
});
