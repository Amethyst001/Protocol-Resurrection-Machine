import { YAMLParser } from '../core/yaml-parser.js';
import { ParserGenerator } from '../generation/parser-generator.js';
import { SerializerGenerator } from '../generation/serializer-generator.js';
import { PythonGenerator } from '../generation/multi-language/python-generator.js';
import { GoGenerator } from '../generation/multi-language/go-generator.js';
import { RustGenerator } from '../generation/multi-language/rust-generator.js';
import { exampleVariations } from './data/variations.js';

// Helper to format code according to Universal Formatting Rules (copied from +server.ts)
const formatCode = (code: string): string => {
    // CRITICAL: Remove non-breaking spaces and other non-standard whitespace
    let formatted = code
        .replace(/\u00A0/g, ' ') // Replace non-breaking spaces with standard spaces
        .replace(/[\u2000-\u200B\u202F\u205F\u3000]/g, ' ') // Replace other unicode spaces
        .split('\n')
        .map(line => {
            // Convert tabs to 4 spaces (universal standard)
            const withSpaces = line.replace(/\t/g, '    ');
            // Trim trailing whitespace
            return withSpaces.trimEnd();
        })
        .join('\n')
        .trim();

    // Remove excessive blank lines (max 2 consecutive)
    formatted = formatted.replace(/\n{3,}/g, '\n\n');

    // Add single blank line before major sections
    // Before doc comments
    formatted = formatted.replace(/\n(\/\*\*|\/\/\/|\/\/!|""")/g, '\n\n$1');
    // Before class/struct/function definitions
    formatted = formatted.replace(/\n(export class |export interface |export function |class |def |func |type |pub fn |pub struct |impl )/g, '\n\n$1');
    // After closing braces at top level
    formatted = formatted.replace(/\n}\n\n(export |class |def |func |type |pub |impl |\/\/|\/\*)/g, '\n}\n\n$1');

    // Clean up any excessive spacing created
    formatted = formatted.replace(/\n{3,}/g, '\n\n');

    return formatted;
};

// Create minimal language profiles (copied from +server.ts)
const createProfile = (lang: 'python' | 'go' | 'rust') => ({
    config: {
        language: lang,
        displayName: lang.charAt(0).toUpperCase() + lang.slice(1),
        fileExtension: lang === 'python' ? '.py' : lang === 'go' ? '.go' : '.rs',
        namingConvention: lang === 'go' || lang === 'rust' ? 'snake_case' as const : 'snake_case' as const,
        errorHandling: lang === 'rust' ? 'result_types' as const : lang === 'go' ? 'error_returns' as const : 'exceptions' as const,
        asyncPattern: lang === 'python' ? 'async_await' as const : lang === 'go' ? 'goroutines' as const : 'async_await' as const,
        typeSystem: lang === 'python' ? 'duck' as const : 'nominal' as const,
        requiresTypeAnnotations: lang !== 'python',
        supportsNull: true
    },
    naming: {
        types: 'PascalCase' as const,
        functions: 'snake_case' as const,
        variables: 'snake_case' as const,
        constants: 'UPPER_SNAKE_CASE' as const,
        private: 'snake_case' as const,
        files: 'snake_case' as const
    },
    errorHandling: {
        throwError: lang === 'python' ? 'raise' : 'return Err',
        catchError: lang === 'python' ? 'except' : 'if err != nil',
        defineErrorType: 'class',
        addErrorContext: 'wrap',
        useResultTypes: lang === 'rust'
    },
    idioms: []
} as any);

async function reproduceError() {
    console.log('Starting Workbench Reproduction Test (Full)...');
    const parser = new YAMLParser();
    const parserGen = new ParserGenerator();
    const serializerGen = new SerializerGenerator();
    const pythonGen = new PythonGenerator();
    const goGen = new GoGenerator();
    const rustGen = new RustGenerator();

    let total = 0;
    let failed = 0;

    for (const [category, variations] of Object.entries(exampleVariations)) {
        console.log(`\nChecking Category: ${category}`);

        for (let i = 0; i < variations.length; i++) {
            const yaml = variations[i];
            const testName = `${category} variation ${i + 1}`;
            total++;

            try {
                const spec = parser.parse(yaml);

                // TypeScript
                const parserCode = parserGen.generate(spec);
                const serializerCode = serializerGen.generate(spec);
                formatCode(`${parserCode}\n\n${serializerCode}`);

                // Python
                const pyArtifacts = await pythonGen.generate(spec, createProfile('python'));
                formatCode(`${pyArtifacts.parser}\n\n${pyArtifacts.serializer}`);

                // Go
                const goArtifacts = await goGen.generate(spec, createProfile('go'));
                formatCode(`${goArtifacts.parser}\n\n${goArtifacts.serializer}`);

                // Rust
                const rustArtifacts = await rustGen.generate(spec, createProfile('rust'));
                formatCode(`${rustArtifacts.parser}\n\n${rustArtifacts.serializer}`);

                process.stdout.write('.');
            } catch (e) {
                process.stdout.write('X');
                failed++;
                console.error(`\nFAILED: ${testName}`);
                console.error(e);
            }
        }
    }

    console.log('\n\nSummary:');
    console.log(`Total: ${total}`);
    console.log(`Failed: ${failed}`);

    if (failed > 0) {
        process.exit(1);
    }
}

reproduceError();
