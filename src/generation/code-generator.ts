/**
 * Code Generator Orchestration
 * Coordinates all code generators to produce complete protocol implementations
 * 
 * This module implements the code generation orchestration:
 * 1. Integrate ParserGenerator, SerializerGenerator, TestGenerator
 * 2. Generate all artifacts for a protocol
 * 3. Format generated code with Prettier
 * 4. Provide unified interface for code generation
 */

import type { ProtocolSpec } from '../types/protocol-spec.js';
import { ParserGenerator } from './parser-generator.js';
import { SerializerGenerator } from './serializer-generator.js';
import { TestGenerator } from './test-generator.js';
import { UIGenerator } from './ui-generator.js';
import { FileWriter, type FileWriteResult } from './file-writer.js';
import { ArtifactVerifier, type VerificationResult } from './artifact-verifier.js';
import * as prettier from 'prettier';

/**
 * Generated artifacts for a protocol
 */
export interface GeneratedArtifacts {
  /** Generated parser code */
  parser: string;
  /** Generated serializer code */
  serializer: string;
  /** Generated property-based tests */
  propertyTests: string;
  /** Generated unit tests */
  unitTests: string;
  /** Generated test data (arbitraries) */
  testData: string;
  /** Generated UI code */
  ui: string;
}

/**
 * Code generation options
 */
export interface CodeGenerationOptions {
  /** Whether to format generated code with Prettier */
  format?: boolean;
  /** Prettier configuration */
  prettierConfig?: prettier.Options;
  /** Whether to include inline comments */
  includeComments?: boolean;
}

/**
 * Code Generator
 * Orchestrates all code generators to produce complete protocol implementations
 */
export class CodeGenerator {
  private parserGenerator: ParserGenerator;
  private serializerGenerator: SerializerGenerator;
  private testGenerator: TestGenerator;
  private uiGenerator: UIGenerator;
  private fileWriter: FileWriter;
  private artifactVerifier: ArtifactVerifier;

  constructor() {
    this.parserGenerator = new ParserGenerator();
    this.serializerGenerator = new SerializerGenerator();
    this.testGenerator = new TestGenerator();
    this.uiGenerator = new UIGenerator();
    this.fileWriter = new FileWriter();
    this.artifactVerifier = new ArtifactVerifier();
  }

  /**
   * Generate all artifacts for a protocol specification
   * @param spec - Protocol specification
   * @param options - Code generation options
   * @returns Generated artifacts
   */
  async generateAll(
    spec: ProtocolSpec,
    options: CodeGenerationOptions = {}
  ): Promise<GeneratedArtifacts> {
    const {
      format = true,
      prettierConfig = this.getDefaultPrettierConfig(),
    } = options;

    // Generate parser code
    const parserCode = this.parserGenerator.generate(spec);

    // Generate serializer code
    const serializerCode = this.serializerGenerator.generate(spec);

    // Generate test code
    const propertyTestsCode = this.testGenerator.generatePropertyTests(spec);
    const unitTestsCode = this.testGenerator.generateUnitTests(spec);
    const testDataCode = this.testGenerator.generateTestData(spec);

    // Generate UI code
    const uiCode = this.uiGenerator.generate(spec);

    // Format code if requested
    const artifacts: GeneratedArtifacts = {
      parser: format ? await this.formatCode(parserCode, prettierConfig) : parserCode,
      serializer: format ? await this.formatCode(serializerCode, prettierConfig) : serializerCode,
      propertyTests: format ? await this.formatCode(propertyTestsCode, prettierConfig) : propertyTestsCode,
      unitTests: format ? await this.formatCode(unitTestsCode, prettierConfig) : unitTestsCode,
      testData: format ? await this.formatCode(testDataCode, prettierConfig) : testDataCode,
      ui: format ? await this.formatCode(uiCode, prettierConfig) : uiCode,
    };

    return artifacts;
  }

  /**
   * Generate parser code only
   * @param spec - Protocol specification
   * @param options - Code generation options
   * @returns Generated parser code
   */
  async generateParser(
    spec: ProtocolSpec,
    options: CodeGenerationOptions = {}
  ): Promise<string> {
    const {
      format = true,
      prettierConfig = this.getDefaultPrettierConfig(),
    } = options;

    const code = this.parserGenerator.generate(spec);
    return format ? await this.formatCode(code, prettierConfig) : code;
  }

  /**
   * Generate serializer code only
   * @param spec - Protocol specification
   * @param options - Code generation options
   * @returns Generated serializer code
   */
  async generateSerializer(
    spec: ProtocolSpec,
    options: CodeGenerationOptions = {}
  ): Promise<string> {
    const {
      format = true,
      prettierConfig = this.getDefaultPrettierConfig(),
    } = options;

    const code = this.serializerGenerator.generate(spec);
    return format ? await this.formatCode(code, prettierConfig) : code;
  }

  /**
   * Generate test code only
   * @param spec - Protocol specification
   * @param options - Code generation options
   * @returns Generated test code
   */
  async generateTests(
    spec: ProtocolSpec,
    options: CodeGenerationOptions = {}
  ): Promise<{
    propertyTests: string;
    unitTests: string;
    testData: string;
  }> {
    const {
      format = true,
      prettierConfig = this.getDefaultPrettierConfig(),
    } = options;

    const propertyTestsCode = this.testGenerator.generatePropertyTests(spec);
    const unitTestsCode = this.testGenerator.generateUnitTests(spec);
    const testDataCode = this.testGenerator.generateTestData(spec);

    return {
      propertyTests: format ? await this.formatCode(propertyTestsCode, prettierConfig) : propertyTestsCode,
      unitTests: format ? await this.formatCode(unitTestsCode, prettierConfig) : unitTestsCode,
      testData: format ? await this.formatCode(testDataCode, prettierConfig) : testDataCode,
    };
  }

  /**
   * Format TypeScript code with Prettier
   * @param code - Code to format
   * @param config - Prettier configuration
   * @returns Formatted code
   */
  private async formatCode(
    code: string,
    config: prettier.Options
  ): Promise<string> {
    try {
      return await prettier.format(code, config);
    } catch (error) {
      // If formatting fails, return unformatted code
      // This ensures generation doesn't fail due to formatting issues
      console.warn('Warning: Code formatting failed, returning unformatted code');
      console.warn(error);
      return code;
    }
  }

  /**
   * Get default Prettier configuration
   * @returns Default Prettier options
   */
  private getDefaultPrettierConfig(): prettier.Options {
    return {
      parser: 'typescript',
      semi: true,
      singleQuote: true,
      trailingComma: 'es5',
      printWidth: 100,
      tabWidth: 2,
      useTabs: false,
      arrowParens: 'always',
      endOfLine: 'lf',
    };
  }

  /**
   * Generate all artifacts and write them to disk
   * @param spec - Protocol specification
   * @param outputDir - Base output directory
   * @param options - Code generation options
   * @returns Array of file write results
   */
  async generateAndWrite(
    spec: ProtocolSpec,
    outputDir: string,
    options: CodeGenerationOptions = {}
  ): Promise<FileWriteResult[]> {
    // Generate all artifacts
    const artifacts = await this.generateAll(spec, options);

    // Write artifacts to disk
    const results = await this.fileWriter.writeArtifacts(spec, artifacts, outputDir);

    return results;
  }

  /**
   * Generate, write, and verify all artifacts
   * @param spec - Protocol specification
   * @param outputDir - Base output directory
   * @param options - Code generation options
   * @returns Verification result
   */
  async generateWriteAndVerify(
    spec: ProtocolSpec,
    outputDir: string,
    options: CodeGenerationOptions = {}
  ): Promise<VerificationResult> {
    // Generate and write artifacts
    const writeResults = await this.generateAndWrite(spec, outputDir, options);

    // Get expected file paths
    const expectedPaths = this.getExpectedFilePaths(spec, outputDir);

    // Verify artifacts
    const verificationResult = await this.artifactVerifier.verifyArtifacts(
      spec,
      writeResults,
      expectedPaths
    );

    return verificationResult;
  }

  /**
   * Verify existing artifacts without regenerating
   * @param spec - Protocol specification
   * @param outputDir - Base output directory
   * @returns Verification result
   */
  async verifyArtifacts(
    spec: ProtocolSpec,
    outputDir: string
  ): Promise<VerificationResult> {
    const expectedPaths = this.getExpectedFilePaths(spec, outputDir);

    // Create mock write results for verification
    const writeResults: FileWriteResult[] = expectedPaths.map((path) => ({
      path,
      success: true,
    }));

    const verificationResult = await this.artifactVerifier.verifyArtifacts(
      spec,
      writeResults,
      expectedPaths
    );

    return verificationResult;
  }

  /**
   * Get the output directory for a protocol
   * @param spec - Protocol specification
   * @param baseDir - Base output directory
   * @returns Protocol output directory
   */
  getProtocolDirectory(spec: ProtocolSpec, baseDir: string): string {
    return this.fileWriter.getProtocolDirectory(spec, baseDir);
  }

  /**
   * Get all expected file paths for a protocol
   * @param spec - Protocol specification
   * @param outputDir - Base output directory
   * @returns Array of expected file paths
   */
  getExpectedFilePaths(spec: ProtocolSpec, outputDir: string): string[] {
    return this.fileWriter.getExpectedFilePaths(spec, outputDir);
  }

  /**
   * Validate generated code syntax
   * This is a basic check - more thorough validation would use TypeScript compiler
   * @param code - Code to validate
   * @returns Whether code appears to be valid TypeScript
   */
  validateCodeSyntax(code: string): boolean {
    // Basic syntax checks
    const hasBalancedBraces = this.checkBalancedBraces(code);
    const hasBalancedParens = this.checkBalancedParens(code);
    const hasBalancedBrackets = this.checkBalancedBrackets(code);

    return hasBalancedBraces && hasBalancedParens && hasBalancedBrackets;
  }

  /**
   * Check if braces are balanced
   */
  private checkBalancedBraces(code: string): boolean {
    return this.checkBalanced(code, '{', '}');
  }

  /**
   * Check if parentheses are balanced
   */
  private checkBalancedParens(code: string): boolean {
    return this.checkBalanced(code, '(', ')');
  }

  /**
   * Check if brackets are balanced
   */
  private checkBalancedBrackets(code: string): boolean {
    return this.checkBalanced(code, '[', ']');
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
}
