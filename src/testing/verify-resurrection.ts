import * as fs from 'fs';
import * as path from 'path';
import { YAMLParser } from '../core/yaml-parser.js';
import { TypeScriptGenerator } from '../generation/multi-language/typescript-generator.js';
import { GoGenerator } from '../generation/multi-language/go-generator.js';
import { RustGenerator } from '../generation/multi-language/rust-generator.js';
import { PythonGenerator } from '../generation/multi-language/python-generator.js';
import { SpecFixer } from '../core/spec-fixer.js';

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
    } as any;
}

async function verifyResurrection() {
    console.log('Starting Protocol Resurrection Verification...');
    const parser = new YAMLParser();

    // Initialize all generators
    const tsGen = new TypeScriptGenerator();
    const goGen = new GoGenerator();
    const rustGen = new RustGenerator();
    const pyGen = new PythonGenerator();

    const fixer = new SpecFixer();

    // 1. Verify All Protocols
    const protocols = ['gopher', 'finger', 'wais', 'archie'];
    let allPassed = true;

    for (const p of protocols) {
        const filePath = path.join(process.cwd(), 'protocols', `${p}.yaml`);
        if (fs.existsSync(filePath)) {
            console.log(`\nChecking Protocol: ${p}`);
            try {
                const content = fs.readFileSync(filePath, 'utf-8');
                const spec = parser.parse(content);
                console.log(`  ✅ Parsed successfully`);

                // Generate Code for all languages
                const tsArtifacts = await tsGen.generate(spec, createProfile('typescript'));
                const goArtifacts = await goGen.generate(spec, createProfile('go'));
                const rustArtifacts = await rustGen.generate(spec, createProfile('rust'));
                const pyArtifacts = await pyGen.generate(spec, createProfile('python'));

                // Verify TypeScript
                if (tsArtifacts.parser && tsArtifacts.parser.length > 0) {
                    console.log(`  ✅ TypeScript generation successful`);
                } else {
                    console.error(`  ❌ TypeScript generation failed`);
                    allPassed = false;
                }

                // Verify Go
                if (goArtifacts.parser && goArtifacts.parser.length > 0) {
                    console.log(`  ✅ Go generation successful`);
                } else {
                    console.error(`  ❌ Go generation failed`);
                    allPassed = false;
                }

                // Verify Rust
                if (rustArtifacts.parser && rustArtifacts.parser.length > 0) {
                    console.log(`  ✅ Rust generation successful`);
                } else {
                    console.error(`  ❌ Rust generation failed`);
                    allPassed = false;
                }

                // Verify Python
                if (pyArtifacts.parser && pyArtifacts.parser.length > 0) {
                    console.log(`  ✅ Python generation successful`);
                } else {
                    console.error(`  ❌ Python generation failed`);
                    allPassed = false;
                }

                // Check for Spooky Headers
                const allCode = [
                    tsArtifacts.parser,
                    goArtifacts.parser,
                    rustArtifacts.parser,
                    pyArtifacts.parser
                ].join('\n');

                if (allCode.includes('Resurrecting Dead Tech')) {
                    console.error(`  ❌ Spooky header found (Should be removed!)`);
                    allPassed = false;
                } else {
                    console.log(`  ✅ No spooky headers found`);
                }

            } catch (e) {
                console.error(`  ❌ Failed to process ${p}:`, e);
                allPassed = false;
            }
        } else {
            console.error(`❌ Protocol ${p}.yaml missing`);
            allPassed = false;
        }
    }

    // 2. Verify SpecFixer
    console.log('\nVerifying SpecFixer...');
    const brokenYaml = `
protocol:
  name: Broken
  # Missing port
  description: I am broken

# Missing connection

messages:
  - name: Test
    # Missing fields
`;
    const fixed = fixer.fix(brokenYaml);

    if (fixed.includes('port: 8000') && fixed.includes('connection:') && fixed.includes('fields: []')) {
        console.log('✅ SpecFixer successfully repaired broken YAML');
    } else {
        console.error('❌ SpecFixer failed to repair YAML');
        allPassed = false;
    }

    console.log('\nVerification Complete.');
    if (!allPassed) {
        console.error('SOME CHECKS FAILED');
        process.exit(1);
    }
}

verifyResurrection();
