import { YAMLParser } from '../core/yaml-parser.js';
import { TypeScriptGenerator } from '../generation/multi-language/typescript-generator.js';
import { exampleVariations } from './data/variations.js';
import type { LanguageProfile } from '../types/language-target.js';
import * as fs from 'fs';

// Helper to create a minimal valid profile
function createProfile(): LanguageProfile {
    return {
        config: {
            language: 'typescript',
            displayName: 'TypeScript',
            fileExtension: 'ts',
            namingConvention: 'camelCase',
            errorHandling: 'exceptions',
            asyncPattern: 'async_await',
            typeSystem: 'structural',
            requiresTypeAnnotations: true,
            supportsNull: true
        },
        naming: {
            types: 'PascalCase',
            functions: 'camelCase',
            variables: 'camelCase',
            constants: 'UPPER_SNAKE_CASE',
            private: 'camelCase',
            files: 'kebab-case'
        },
        errorHandling: {
            throwError: 'throw',
            catchError: 'try/catch',
            defineErrorType: 'class',
            addErrorContext: 'new Error',
            useResultTypes: false
        },
        idioms: []
    } as any;
}

async function debugGenerator() {
    const parser = new YAMLParser();
    const tsGen = new TypeScriptGenerator();

    // Get the first example (Demo Chat)
    const yaml = exampleVariations.demo[0];
    const spec = parser.parse(yaml);

    console.log('--- Generating TypeScript Code for Demo Chat ---');
    const artifacts = await tsGen.generate(spec, createProfile());

    // Write the artifacts to files
    fs.writeFileSync('debug-output.ts', artifacts.client || '');
    fs.writeFileSync('debug-parser.ts', artifacts.parser || '');
    fs.writeFileSync('debug-serializer.ts', artifacts.serializer || '');
    console.log('--- Code written to debug-output.ts, debug-parser.ts, debug-serializer.ts ---');
}

debugGenerator().catch(console.error);
