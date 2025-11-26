import { describe, it, expect } from 'vitest';
import { validateWhitespace } from '../../src/utils/code-formatter.js';
import { PythonGenerator } from '../../src/generation/multi-language/python-generator.js';
import { GoGenerator } from '../../src/generation/multi-language/go-generator.js';
import { RustGenerator } from '../../src/generation/multi-language/rust-generator.js';
import { TypeScriptGenerator } from '../../src/generation/multi-language/typescript-generator.js';
import type { ProtocolSpec } from '../../src/types/protocol-spec.js';
import { LANGUAGE_PROFILES } from '../../src/types/language-target.js';

describe('Code Formatting Integration', () => {
    const testSpec: ProtocolSpec = {
        protocol: {
            name: 'TestProtocol',
            port: 8080,
            transport: 'tcp',
            rfc: 'TEST-001'
        },
        messageTypes: [
            {
                name: 'TestMessage',
                direction: 'request',
                format: '{field1}\\t{field2}\\r\\n',
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
            }
        ]
    };

    describe('Python Generator', () => {
        it('should generate code without non-breaking spaces', async () => {
            const generator = new PythonGenerator();
            const result = await generator.generate(testSpec, LANGUAGE_PROFILES.python);
            
            const problems = validateWhitespace(result.parser);
            expect(problems).toEqual([]);
            
            expect(result.parser).not.toContain('\u00A0');
            expect(result.serializer).not.toContain('\u00A0');
            expect(result.client).not.toContain('\u00A0');
        });

        it('should use 4-space indentation', async () => {
            const generator = new PythonGenerator();
            const result = await generator.generate(testSpec, LANGUAGE_PROFILES.python);
            
            const lines = result.parser.split('\n');
            const indentedLines = lines.filter(line => line.startsWith('    '));
            expect(indentedLines.length).toBeGreaterThan(0);
            
            // Should not have tabs
            expect(result.parser).not.toContain('\t');
        });
    });

    describe('Go Generator', () => {
        it('should generate code without non-breaking spaces', async () => {
            const generator = new GoGenerator();
            const result = await generator.generate(testSpec, LANGUAGE_PROFILES.go);
            
            const problems = validateWhitespace(result.parser);
            expect(problems).toEqual([]);
            
            expect(result.parser).not.toContain('\u00A0');
            expect(result.serializer).not.toContain('\u00A0');
        });

        it('should use consistent indentation', async () => {
            const generator = new GoGenerator();
            const result = await generator.generate(testSpec, LANGUAGE_PROFILES.go);
            
            const lines = result.parser.split('\n');
            const indentedLines = lines.filter(line => /^    \S/.test(line));
            expect(indentedLines.length).toBeGreaterThan(0);
        });
    });

    describe('Rust Generator', () => {
        it('should generate code without non-breaking spaces', async () => {
            const generator = new RustGenerator();
            const result = await generator.generate(testSpec, LANGUAGE_PROFILES.rust);
            
            const problems = validateWhitespace(result.parser);
            expect(problems).toEqual([]);
            
            expect(result.parser).not.toContain('\u00A0');
            expect(result.serializer).not.toContain('\u00A0');
        });

        it('should have proper vertical spacing', async () => {
            const generator = new RustGenerator();
            const result = await generator.generate(testSpec, LANGUAGE_PROFILES.rust);
            
            // Should not have excessive blank lines
            expect(result.parser).not.toMatch(/\n{4,}/);
            
            // Should end with single newline
            expect(result.parser.endsWith('\n')).toBe(true);
            expect(result.parser).not.toMatch(/\n\n$/);
        });
    });

    describe('TypeScript Generator', () => {
        it('should generate code without non-breaking spaces', async () => {
            const generator = new TypeScriptGenerator();
            const result = await generator.generate(testSpec, LANGUAGE_PROFILES.typescript);
            
            const problems = validateWhitespace(result.parser);
            expect(problems).toEqual([]);
            
            expect(result.parser).not.toContain('\u00A0');
            expect(result.serializer).not.toContain('\u00A0');
        });

        it('should have clean formatting', async () => {
            const generator = new TypeScriptGenerator();
            const result = await generator.generate(testSpec, LANGUAGE_PROFILES.typescript);
            
            // No trailing whitespace
            const lines = result.parser.split('\n');
            const trailingWhitespace = lines.filter(line => line !== line.trimEnd());
            expect(trailingWhitespace).toEqual([]);
        });
    });

    describe('All Generators', () => {
        it('should produce clean code across all languages', async () => {
            const generators = [
                { name: 'Python', gen: new PythonGenerator(), profile: LANGUAGE_PROFILES.python },
                { name: 'Go', gen: new GoGenerator(), profile: LANGUAGE_PROFILES.go },
                { name: 'Rust', gen: new RustGenerator(), profile: LANGUAGE_PROFILES.rust },
                { name: 'TypeScript', gen: new TypeScriptGenerator(), profile: LANGUAGE_PROFILES.typescript }
            ];

            for (const { name, gen, profile } of generators) {
                const result = await gen.generate(testSpec, profile);
                
                // Check parser
                const parserProblems = validateWhitespace(result.parser);
                expect(parserProblems, `${name} parser should have no whitespace problems`).toEqual([]);
                
                // Check serializer
                const serializerProblems = validateWhitespace(result.serializer);
                expect(serializerProblems, `${name} serializer should have no whitespace problems`).toEqual([]);
                
                // Verify no non-breaking spaces
                expect(result.parser, `${name} parser should not contain \\u00A0`).not.toContain('\u00A0');
                expect(result.serializer, `${name} serializer should not contain \\u00A0`).not.toContain('\u00A0');
            }
        });
    });
});
