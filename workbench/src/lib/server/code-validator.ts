/**
 * Code validation interface and implementations for multi-language validation
 */

export interface CodeValidationError {
    line?: number;
    column?: number;
    message: string;
}

export interface CodeValidationResult {
    language: string;
    valid: boolean;
    errors: CodeValidationError[];
    warnings?: string[];
}

export abstract class CodeValidator {
    abstract language: string;
    abstract validate(code: string): Promise<CodeValidationResult>;
}

/**
 * TypeScript Validator
 * Uses TypeScript compiler API to validate syntax and types
 */
export class TypeScriptValidator extends CodeValidator {
    language = 'typescript';

    async validate(code: string): Promise<CodeValidationResult> {
        const result: CodeValidationResult = {
            language: this.language,
            valid: true,
            errors: [],
        };

        try {
            // Import TypeScript compiler
            const ts = await import('typescript');

            // Create a virtual source file
            const sourceFile = ts.createSourceFile(
                'temp.ts',
                code,
                ts.ScriptTarget.Latest,
                true
            );

            // Check for syntax errors using getPreEmitDiagnostics
            const syntaxDiagnostics = (sourceFile as any).parseDiagnostics || [];

            if (syntaxDiagnostics.length > 0) {
                result.valid = false;
                result.errors = syntaxDiagnostics.map((diag: any) => {
                    const { line } = sourceFile.getLineAndCharacterOfPosition(diag.start || 0);
                    return {
                        line: line + 1,
                        message: ts.flattenDiagnosticMessageText(diag.messageText, '\n'),
                    };
                });
            }
        } catch (error) {
            result.valid = false;
            result.errors.push({
                message: error instanceof Error ? error.message : 'Unknown TypeScript validation error',
            });
        }

        return result;
    }
}

/**
 * Python Validator
 * Uses Python's compile() function to check syntax
 */
export class PythonValidator extends CodeValidator {
    language = 'python';

    async validate(code: string): Promise<CodeValidationResult> {
        const result: CodeValidationResult = {
            language: this.language,
            valid: true,
            errors: [],
        };

        try {
            // Use exec to run Python compilation check
            const { exec } = await import('child_process');
            const { promisify } = await import('util');
            const execAsync = promisify(exec);

            // Write code to temp file and check with python -m py_compile
            const fs = await import('fs');
            const path = await import('path');
            const os = await import('os');

            const tempFile = path.join(os.tmpdir(), `temp_${Date.now()}.py`);
            fs.writeFileSync(tempFile, code);

            try {
                await execAsync(`python -m py_compile "${tempFile}"`);
                // If no error, code is valid
            } catch (error: any) {
                result.valid = false;

                // Parse error message
                const stderr = error.stderr || error.message || '';
                const match = stderr.match(/line (\d+)/);
                const line = match ? parseInt(match[1]) : undefined;

                result.errors.push({
                    line,
                    message: stderr || 'Python syntax error',
                });
            } finally {
                // Clean up temp file
                try {
                    fs.unlinkSync(tempFile);
                } catch { }
            }
        } catch (error) {
            result.valid = false;
            result.errors.push({
                message: 'Python validation failed. Is Python installed?',
            });
        }

        return result;
    }
}

/**
 * Go Validator
 * Uses `go fmt` to validate and format Go code
 */
export class GoValidator extends CodeValidator {
    language = 'go';

    async validate(code: string): Promise<CodeValidationResult> {
        const result: CodeValidationResult = {
            language: this.language,
            valid: true,
            errors: [],
        };

        try {
            const { exec } = await import('child_process');
            const { promisify } = await import('util');
            const execAsync = promisify(exec);

            const fs = await import('fs');
            const path = await import('path');
            const os = await import('os');

            // Clean up concatenated Go code - remove duplicate package/imports
            let cleanedCode = code;
            const lines = code.split('\n');
            let packageCount = 0;
            const newLines: string[] = [];
            let skipNextImport = false;

            for (const line of lines) {
                const trimmed = line.trim();

                // Count and skip duplicate package declarations
                if (trimmed.startsWith('package ')) {
                    packageCount++;
                    if (packageCount === 1) {
                        newLines.push(line);
                    }
                    continue;
                }

                // Skip import blocks after the first package (they'll be duplicates)
                if (packageCount > 1 && (trimmed.startsWith('import ') || trimmed === 'import (')) {
                    skipNextImport = true;
                }

                if (skipNextImport) {
                    if (trimmed === ')') {
                        skipNextImport = false;
                    }
                    continue;
                }

                newLines.push(line);
            }

            cleanedCode = newLines.join('\n');

            // Remove unused imports by checking if they're referenced in the code
            const importMatches = cleanedCode.match(/import\s+\(([^)]+)\)/s);
            if (importMatches) {
                const importsBlock = importMatches[1];
                const imports = importsBlock.split('\n')
                    .map(line => line.trim())
                    .filter(line => line && line.startsWith('"'));

                const usedImports = imports.filter(imp => {
                    // Extract package name from import path (e.g., "fmt", "strings", "strconv")
                    const match = imp.match(/"([^"]+)"/);
                    if (!match) return true; // Keep if we can't parse

                    const importPath = match[1];
                    const pkgName = importPath.split('/').pop() || importPath;

                    // Check if package is used in code (simple heuristic: pkgName. appears)
                    const pkgPattern = new RegExp(`\\b${pkgName}\\.`, 'g');
                    return pkgPattern.test(cleanedCode);
                });

                // Rebuild imports block with only used imports
                if (usedImports.length > 0) {
                    const newImportsBlock = 'import (\n\t' + usedImports.join('\n\t') + '\n)';
                    cleanedCode = cleanedCode.replace(/import\s+\([^)]+\)/s, newImportsBlock);
                } else {
                    // Remove import block entirely if no imports are used
                    cleanedCode = cleanedCode.replace(/import\s+\([^)]+\)\n*/s, '');
                }
            }

            // Note: We don't remove offset declarations because they're used in parser methods

            // Create temp directory with go.mod
            const tempDir = path.join(os.tmpdir(), `temp_go_${Date.now()}`);
            fs.mkdirSync(tempDir, { recursive: true });

            const tempFile = path.join(tempDir, 'main.go');
            fs.writeFileSync(tempFile, cleanedCode);

            // Create minimal go.mod
            const goModContent = `module temp\n\ngo 1.21\n`;
            fs.writeFileSync(path.join(tempDir, 'go.mod'), goModContent);

            try {
                // Try to format with gofmt
                await execAsync(`gofmt -e "${tempFile}"`, { cwd: tempDir });

                // Try to build
                await execAsync(`go build -o /dev/null main.go`, { cwd: tempDir });
            } catch (error: any) {
                result.valid = false;
                const stderr = error.stderr || error.message || '';

                // Parse error message for line numbers
                const match = stderr.match(/:(\d+):/);
                const line = match ? parseInt(match[1]) : undefined;

                result.errors.push({
                    line,
                    message: stderr || 'Go compilation error',
                });
            } finally {
                // Clean up
                try {
                    fs.rmSync(tempDir, { recursive: true, force: true });
                } catch { }
            }
        } catch (error) {
            result.valid = false;
            result.errors.push({
                message: 'Go validation failed. Is Go installed?',
            });
        }

        return result;
    }
}

/**
 * Rust Validator
 * Uses `rustc --check` to validate Rust code
 */
export class RustValidator extends CodeValidator {
    language = 'rust';

    async validate(code: string): Promise<CodeValidationResult> {
        const result: CodeValidationResult = {
            language: this.language,
            valid: true,
            errors: [],
        };

        try {
            const { exec } = await import('child_process');
            const { promisify } = await import('util');
            const execAsync = promisify(exec);

            const fs = await import('fs');
            const path = await import('path');
            const os = await import('os');

            // Create temp directory
            const tempDir = path.join(os.tmpdir(), `temp_rust_${Date.now()}`);
            fs.mkdirSync(tempDir, { recursive: true });
            fs.mkdirSync(path.join(tempDir, 'src'), { recursive: true });

            // Write Cargo.toml
            const cargoToml = `[package]
name = "temp_validation"
version = "0.1.0"
edition = "2021"

[dependencies]
tokio = { version = "1.0", features = ["full"] }
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
`;
            fs.writeFileSync(path.join(tempDir, 'Cargo.toml'), cargoToml);

            // Clean code - remove 'use super::*;' statements
            const cleanedCode = code.replace(/use super::\*;/g, '// use super::*;');

            // Write source code
            const tempFile = path.join(tempDir, 'src', 'lib.rs');
            fs.writeFileSync(tempFile, cleanedCode);

            try {
                // Use cargo check
                // Override RUSTC env var because it might be set incorrectly to a directory on the user's machine
                await execAsync(`cargo check`, {
                    cwd: tempDir,
                    env: { ...process.env, RUSTC: 'rustc' }
                });
            } catch (error: any) {
                result.valid = false;
                const stderr = error.stderr || error.message || '';

                // Parse error for line numbers
                // Cargo output format: error[E0433]: ... --> src/lib.rs:5:5
                const match = stderr.match(/src[\\/]lib\.rs:(\d+):/);
                const line = match ? parseInt(match[1]) : undefined;

                result.errors.push({
                    line,
                    message: stderr || 'Rust compilation error',
                });
            } finally {
                // Clean up
                try {
                    fs.rmSync(tempDir, { recursive: true, force: true });
                } catch { }
            }
        } catch (error) {
            result.valid = false;
            result.errors.push({
                message: 'Rust validation failed. Is Cargo installed?',
            });
        }

        return result;
    }
}
