import * as fs from 'fs';
import { exampleVariations } from './data/variations.js';
import { YAMLParser } from '../core/yaml-parser.js';
import { TypeScriptGenerator } from '../generation/multi-language/typescript-generator.js';
import { GoGenerator } from '../generation/multi-language/go-generator.js';
import { RustGenerator } from '../generation/multi-language/rust-generator.js';
import { PythonGenerator } from '../generation/multi-language/python-generator.js';
import type { LanguageProfile } from '../types/language-target.js';

// Helper to create a minimal valid profile
function createProfile(lang: 'typescript' | 'python' | 'go' | 'rust'): LanguageProfile {
    return {
        config: {
            language: lang,
            displayName: lang,
            fileExtension: 'ts', // dummy
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
    } as any; // Cast to any to avoid strict typing issues for verification
}

async function verifyVariations() {
    console.log('Starting Verification of All 50 Variations...');
    const parser = new YAMLParser();

    // Initialize generators
    const tsGen = new TypeScriptGenerator();
    const goGen = new GoGenerator();
    const rustGen = new RustGenerator();
    const pyGen = new PythonGenerator();

    let total = 0;
    let passed = 0;
    let failed = 0;
    const failures: string[] = [];

    for (const [category, variations] of Object.entries(exampleVariations)) {
        console.log(`\nChecking Category: ${category}`);

        for (let i = 0; i < variations.length; i++) {
            const yaml = variations[i];
            const testName = `${category} variation ${i + 1}`;
            total++;

            try {
                // Parse
                const spec = parser.parse(yaml);

                // Generate
                await tsGen.generate(spec, createProfile('typescript'));
                await goGen.generate(spec, createProfile('go'));
                await rustGen.generate(spec, createProfile('rust'));
                await pyGen.generate(spec, createProfile('python'));

                process.stdout.write('.');
                passed++;
            } catch (e) {
                process.stdout.write('X');
                failed++;
                const errorMsg = e instanceof Error ? e.message : String(e);
                failures.push(`${testName}: ${errorMsg}`);
            }
        }
    }

    console.log('\n\nVerification Summary:');
    console.log(`Total: ${total}`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);

    if (failures.length > 0) {
        console.error('\nFailures:');
        failures.forEach(f => console.error(`- ${f}`));
        fs.writeFileSync('failures.log', failures.join('\n'));
        process.exit(1);
    } else {
        console.log('\n✅ All 50 variations passed!');
    }
}

verifyVariations();
