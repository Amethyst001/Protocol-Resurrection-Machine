/**
 * Artifact Verifier
 * Verifies that generated artifacts are valid and complete
 * 
 * This module implements artifact verification:
 * 1. Verify all expected files were created
 * 2. Verify generated TypeScript has valid syntax
 * 3. Report any missing or invalid artifacts
 */

import * as fs from 'fs/promises';
import type { ProtocolSpec } from '../types/protocol-spec.js';
import type { FileWriteResult } from './file-writer.js';

/**
 * Verification result for a single artifact
 */
export interface ArtifactVerificationResult {
  /** Path to the artifact */
  path: string;
  /** Whether artifact exists */
  exists: boolean;
  /** Whether artifact has valid syntax */
  validSyntax: boolean;
  /** Whether artifact is readable */
  readable: boolean;
  /** File size in bytes */
  size?: number;
  /** Error message if verification failed */
  error?: string;
}

/**
 * Overall verification result
 */
export interface VerificationResult {
  /** Whether all artifacts are valid */
  success: boolean;
  /** Individual artifact verification results */
  artifacts: ArtifactVerificationResult[];
  /** Missing artifacts */
  missing: string[];
  /** Invalid artifacts */
  invalid: string[];
  /** Summary message */
  summary: string;
}

/**
 * Artifact Verifier
 * Verifies that generated artifacts are valid and complete
 */
export class ArtifactVerifier {
  /**
   * Verify all generated artifacts
   * @param spec - Protocol specification
   * @param writeResults - File write results from generation
   * @param expectedPaths - Expected file paths
   * @returns Verification result
   */
  async verifyArtifacts(
    spec: ProtocolSpec,
    writeResults: FileWriteResult[],
    expectedPaths: string[]
  ): Promise<VerificationResult> {
    const artifactResults: ArtifactVerificationResult[] = [];
    const missing: string[] = [];
    const invalid: string[] = [];

    // Verify each expected file
    for (const expectedPath of expectedPaths) {
      const writeResult = writeResults.find((r) => r.path === expectedPath);

      if (!writeResult || !writeResult.success) {
        // File was not written successfully
        missing.push(expectedPath);
        artifactResults.push({
          path: expectedPath,
          exists: false,
          validSyntax: false,
          readable: false,
          error: writeResult?.error || 'File was not written',
        });
        continue;
      }

      // Verify the file
      const verificationResult = await this.verifyArtifact(expectedPath);
      artifactResults.push(verificationResult);

      if (!verificationResult.exists) {
        missing.push(expectedPath);
      } else if (!verificationResult.validSyntax || !verificationResult.readable) {
        invalid.push(expectedPath);
      }
    }

    // Determine overall success
    const success = missing.length === 0 && invalid.length === 0;

    // Generate summary
    const summary = this.generateSummary(spec, artifactResults, missing, invalid);

    return {
      success,
      artifacts: artifactResults,
      missing,
      invalid,
      summary,
    };
  }

  /**
   * Verify a single artifact
   * @param filePath - Path to the artifact
   * @returns Verification result for the artifact
   */
  async verifyArtifact(filePath: string): Promise<ArtifactVerificationResult> {
    try {
      // Check if file exists
      const stats = await fs.stat(filePath);

      if (!stats.isFile()) {
        return {
          path: filePath,
          exists: false,
          validSyntax: false,
          readable: false,
          error: 'Path exists but is not a file',
        };
      }

      // Try to read the file
      let content: string;
      try {
        content = await fs.readFile(filePath, 'utf-8');
      } catch (error) {
        return {
          path: filePath,
          exists: true,
          validSyntax: false,
          readable: false,
          size: stats.size,
          error: `File is not readable: ${error instanceof Error ? error.message : String(error)}`,
        };
      }

      // Verify syntax for TypeScript files
      let validSyntax = true;
      if (filePath.endsWith('.ts')) {
        validSyntax = this.validateTypeScriptSyntax(content);
      }

      const result: ArtifactVerificationResult = {
        path: filePath,
        exists: true,
        validSyntax,
        readable: true,
        size: stats.size,
      };

      if (!validSyntax) {
        result.error = 'Invalid TypeScript syntax';
      }

      return result;
    } catch (error) {
      return {
        path: filePath,
        exists: false,
        validSyntax: false,
        readable: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Validate TypeScript syntax
   * This is a basic check - more thorough validation would use TypeScript compiler
   * @param code - TypeScript code to validate
   * @returns Whether code appears to be valid TypeScript
   */
  private validateTypeScriptSyntax(code: string): boolean {
    // Basic syntax checks
    const hasBalancedBraces = this.checkBalanced(code, '{', '}');
    const hasBalancedParens = this.checkBalanced(code, '(', ')');
    const hasBalancedBrackets = this.checkBalanced(code, '[', ']');

    // Check for common syntax errors
    const hasUnclosedStrings = this.checkUnclosedStrings(code);
    const hasUnclosedComments = this.checkUnclosedComments(code);

    return (
      hasBalancedBraces &&
      hasBalancedParens &&
      hasBalancedBrackets &&
      !hasUnclosedStrings &&
      !hasUnclosedComments
    );
  }

  /**
   * Check if opening and closing characters are balanced
   */
  private checkBalanced(code: string, open: string, close: string): boolean {
    let count = 0;
    let inString = false;
    let inComment = false;
    let inMultiLineComment = false;
    let stringChar = '';

    for (let i = 0; i < code.length; i++) {
      const char = code[i];
      const nextChar = code[i + 1];
      const prevChar = code[i - 1];

      // Handle string literals
      if ((char === '"' || char === "'" || char === '`') && prevChar !== '\\') {
        if (!inComment && !inMultiLineComment) {
          if (!inString) {
            inString = true;
            stringChar = char;
          } else if (char === stringChar) {
            inString = false;
            stringChar = '';
          }
        }
      }

      // Handle comments
      if (!inString) {
        if (char === '/' && nextChar === '/') {
          inComment = true;
        } else if (char === '\n') {
          inComment = false;
        } else if (char === '/' && nextChar === '*') {
          inMultiLineComment = true;
        } else if (char === '*' && nextChar === '/') {
          inMultiLineComment = false;
        }
      }

      // Count brackets outside strings and comments
      if (!inString && !inComment && !inMultiLineComment) {
        if (char === open) {
          count++;
        } else if (char === close) {
          count--;
          if (count < 0) {
            return false; // More closing than opening
          }
        }
      }
    }

    return count === 0;
  }

  /**
   * Check for unclosed strings
   */
  private checkUnclosedStrings(code: string): boolean {
    let inString = false;
    let stringChar = '';
    let inComment = false;
    let inMultiLineComment = false;

    for (let i = 0; i < code.length; i++) {
      const char = code[i];
      const nextChar = code[i + 1];
      const prevChar = code[i - 1];

      // Handle comments
      if (!inString) {
        if (char === '/' && nextChar === '/') {
          inComment = true;
        } else if (char === '\n') {
          inComment = false;
        } else if (char === '/' && nextChar === '*') {
          inMultiLineComment = true;
        } else if (char === '*' && nextChar === '/') {
          inMultiLineComment = false;
        }
      }

      // Handle string literals
      if (!inComment && !inMultiLineComment) {
        if ((char === '"' || char === "'" || char === '`') && prevChar !== '\\') {
          if (!inString) {
            inString = true;
            stringChar = char;
          } else if (char === stringChar) {
            inString = false;
            stringChar = '';
          }
        }
      }
    }

    return inString; // True if string is still open at end
  }

  /**
   * Check for unclosed comments
   */
  private checkUnclosedComments(code: string): boolean {
    let inMultiLineComment = false;

    for (let i = 0; i < code.length; i++) {
      const char = code[i];
      const nextChar = code[i + 1];

      if (char === '/' && nextChar === '*') {
        inMultiLineComment = true;
      } else if (char === '*' && nextChar === '/') {
        inMultiLineComment = false;
      }
    }

    return inMultiLineComment; // True if comment is still open at end
  }

  /**
   * Generate verification summary
   */
  private generateSummary(
    spec: ProtocolSpec,
    artifacts: ArtifactVerificationResult[],
    missing: string[],
    invalid: string[]
  ): string {
    const protocolName = spec.protocol.name;
    const totalArtifacts = artifacts.length;
    const successfulArtifacts = artifacts.filter(
      (a) => a.exists && a.validSyntax && a.readable
    ).length;

    const lines: string[] = [];

    lines.push(`Verification Summary for ${protocolName} Protocol`);
    lines.push(`${'='.repeat(60)}`);
    lines.push(`Total artifacts: ${totalArtifacts}`);
    lines.push(`Successful: ${successfulArtifacts}`);
    lines.push(`Missing: ${missing.length}`);
    lines.push(`Invalid: ${invalid.length}`);
    lines.push('');

    if (missing.length > 0) {
      lines.push('Missing Artifacts:');
      for (const path of missing) {
        lines.push(`  - ${path}`);
      }
      lines.push('');
    }

    if (invalid.length > 0) {
      lines.push('Invalid Artifacts:');
      for (const path of invalid) {
        const artifact = artifacts.find((a) => a.path === path);
        lines.push(`  - ${path}`);
        if (artifact?.error) {
          lines.push(`    Error: ${artifact.error}`);
        }
      }
      lines.push('');
    }

    if (missing.length === 0 && invalid.length === 0) {
      lines.push('✓ All artifacts generated successfully!');
    } else {
      lines.push('✗ Some artifacts are missing or invalid.');
    }

    return lines.join('\n');
  }

  /**
   * Verify that generated code compiles (using TypeScript compiler)
   * This is a more thorough check than syntax validation
   * @param filePath - Path to TypeScript file
   * @returns Whether file compiles without errors
   */
  async verifyCompilation(filePath: string): Promise<boolean> {
    // This would require running the TypeScript compiler
    // For now, we'll just do syntax validation
    // In a full implementation, we would use ts.createProgram() and check for diagnostics
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return this.validateTypeScriptSyntax(content);
    } catch {
      return false;
    }
  }

  /**
   * Get file size in human-readable format
   * @param bytes - File size in bytes
   * @returns Human-readable file size
   */
  private formatFileSize(bytes: number): string {
    if (bytes < 1024) {
      return `${bytes} B`;
    } else if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(2)} KB`;
    } else {
      return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    }
  }

  /**
   * Generate detailed verification report
   * @param result - Verification result
   * @returns Detailed report string
   */
  generateDetailedReport(result: VerificationResult): string {
    const lines: string[] = [];

    lines.push(result.summary);
    lines.push('');
    lines.push('Detailed Artifact Report:');
    lines.push(`${'='.repeat(60)}`);

    for (const artifact of result.artifacts) {
      lines.push('');
      lines.push(`File: ${artifact.path}`);
      lines.push(`  Exists: ${artifact.exists ? '✓' : '✗'}`);
      lines.push(`  Readable: ${artifact.readable ? '✓' : '✗'}`);
      lines.push(`  Valid Syntax: ${artifact.validSyntax ? '✓' : '✗'}`);

      if (artifact.size !== undefined) {
        lines.push(`  Size: ${this.formatFileSize(artifact.size)}`);
      }

      if (artifact.error) {
        lines.push(`  Error: ${artifact.error}`);
      }
    }

    return lines.join('\n');
  }
}
