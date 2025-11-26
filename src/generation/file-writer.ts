/**
 * File Writer
 * Handles writing generated code to the file system
 * 
 * This module implements file writing and organization:
 * 1. Create output directory structure
 * 2. Write generated files with proper naming
 * 3. Handle file system errors gracefully
 * 4. Set appropriate file permissions
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import type { ProtocolSpec } from '../types/protocol-spec.js';
import type { GeneratedArtifacts } from './code-generator.js';

/**
 * File write result
 */
export interface FileWriteResult {
  /** Path to the written file */
  path: string;
  /** Whether write was successful */
  success: boolean;
  /** Error message if write failed */
  error?: string;
  /** Whether file was skipped (already exists and overwrite is false) */
  skipped?: boolean;
}

/**
 * Directory creation result
 */
export interface DirectoryCreationResult {
  /** Path to the created directory */
  path: string;
  /** Whether creation was successful */
  success: boolean;
  /** Error message if creation failed */
  error?: string;
}

/**
 * File write options
 */
export interface FileWriteOptions {
  /** Whether to overwrite existing files */
  overwrite?: boolean;
  /** File encoding */
  encoding?: BufferEncoding;
  /** File permissions (Unix mode) */
  mode?: number;
}

/**
 * File Writer
 * Handles writing generated code to the file system
 */
export class FileWriter {
  /**
   * Write all generated artifacts to the file system
   * @param spec - Protocol specification
   * @param artifacts - Generated artifacts
   * @param outputDir - Base output directory
   * @param options - File write options
   * @returns Array of file write results
   */
  async writeArtifacts(
    spec: ProtocolSpec,
    artifacts: GeneratedArtifacts,
    outputDir: string,
    options: FileWriteOptions = {}
  ): Promise<FileWriteResult[]> {
    const results: FileWriteResult[] = [];

    // Create protocol-specific directory
    const protocolDir = this.getProtocolDirectory(spec, outputDir);
    const dirResult = await this.createDirectory(protocolDir);

    if (!dirResult.success) {
      return [
        {
          path: protocolDir,
          success: false,
          error: `Failed to create protocol directory: ${dirResult.error}`,
        },
      ];
    }

    // Write parser file
    const parserPath = path.join(protocolDir, this.getParserFileName(spec));
    results.push(await this.writeFile(parserPath, artifacts.parser, options));

    // Write serializer file
    const serializerPath = path.join(protocolDir, this.getSerializerFileName(spec));
    results.push(await this.writeFile(serializerPath, artifacts.serializer, options));

    // Write UI file
    const uiPath = path.join(protocolDir, this.getUIFileName(spec));
    results.push(await this.writeFile(uiPath, artifacts.ui, options));

    // Create tests directory
    const testsDir = path.join(protocolDir, 'tests');
    const testsDirResult = await this.createDirectory(testsDir);

    if (testsDirResult.success) {
      // Write property tests
      const propertyTestsPath = path.join(testsDir, this.getPropertyTestsFileName(spec));
      results.push(await this.writeFile(propertyTestsPath, artifacts.propertyTests, options));

      // Write unit tests
      const unitTestsPath = path.join(testsDir, this.getUnitTestsFileName(spec));
      results.push(await this.writeFile(unitTestsPath, artifacts.unitTests, options));

      // Write test data
      const testDataPath = path.join(testsDir, this.getTestDataFileName(spec));
      results.push(await this.writeFile(testDataPath, artifacts.testData, options));
    } else {
      results.push({
        path: testsDir,
        success: false,
        error: `Failed to create tests directory: ${testsDirResult.error}`,
      });
    }

    // Create extensions directory (for user customization)
    const extensionsDir = path.join(protocolDir, 'extensions');
    const extensionsDirResult = await this.createDirectory(extensionsDir);

    if (extensionsDirResult.success) {
      // Create placeholder files for extension points
      const extensionResults = await this.createExtensionPlaceholders(extensionsDir, spec, options);
      results.push(...extensionResults);
    } else {
      results.push({
        path: extensionsDir,
        success: false,
        error: `Failed to create extensions directory: ${extensionsDirResult.error}`,
      });
    }

    return results;
  }

  /**
   * Get the protocol-specific directory path
   * @param spec - Protocol specification
   * @param baseDir - Base output directory
   * @returns Protocol directory path
   */
  getProtocolDirectory(spec: ProtocolSpec, baseDir: string): string {
    const protocolName = spec.protocol.name.toLowerCase().replace(/\s+/g, '-');
    return path.join(baseDir, protocolName);
  }

  /**
   * Get parser file name
   */
  private getParserFileName(spec: ProtocolSpec): string {
    const protocolName = spec.protocol.name.toLowerCase().replace(/\s+/g, '-');
    return `${protocolName}-parser.ts`;
  }

  /**
   * Get serializer file name
   */
  private getSerializerFileName(spec: ProtocolSpec): string {
    const protocolName = spec.protocol.name.toLowerCase().replace(/\s+/g, '-');
    return `${protocolName}-serializer.ts`;
  }

  /**
   * Get UI file name
   */
  private getUIFileName(spec: ProtocolSpec): string {
    const protocolName = spec.protocol.name.toLowerCase().replace(/\s+/g, '-');
    return `${protocolName}-ui.ts`;
  }

  /**
   * Get property tests file name
   */
  private getPropertyTestsFileName(spec: ProtocolSpec): string {
    const protocolName = spec.protocol.name.toLowerCase().replace(/\s+/g, '-');
    return `${protocolName}.property.test.ts`;
  }

  /**
   * Get unit tests file name
   */
  private getUnitTestsFileName(spec: ProtocolSpec): string {
    const protocolName = spec.protocol.name.toLowerCase().replace(/\s+/g, '-');
    return `${protocolName}.unit.test.ts`;
  }

  /**
   * Get test data file name
   */
  private getTestDataFileName(spec: ProtocolSpec): string {
    const protocolName = spec.protocol.name.toLowerCase().replace(/\s+/g, '-');
    return `${protocolName}-test-data.ts`;
  }

  /**
   * Create a directory (and parent directories if needed)
   * @param dirPath - Directory path to create
   * @returns Directory creation result
   */
  async createDirectory(dirPath: string): Promise<DirectoryCreationResult> {
    try {
      await fs.mkdir(dirPath, { recursive: true });
      return {
        path: dirPath,
        success: true,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        path: dirPath,
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Write a file to the file system
   * @param filePath - File path to write
   * @param content - File content
   * @param options - File write options
   * @returns File write result
   */
  async writeFile(
    filePath: string,
    content: string,
    options: FileWriteOptions = {}
  ): Promise<FileWriteResult> {
    const {
      overwrite = true,
      encoding = 'utf-8',
      mode = 0o644, // rw-r--r--
    } = options;

    try {
      // Check if file exists
      if (!overwrite) {
        try {
          await fs.access(filePath);
          // File exists and overwrite is false - this is success (file is preserved)
          return {
            path: filePath,
            success: true,
            skipped: true,
          };
        } catch {
          // File doesn't exist, proceed with write
        }
      }

      // Write file
      await fs.writeFile(filePath, content, { encoding, mode });

      return {
        path: filePath,
        success: true,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        path: filePath,
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Create extension point placeholder files
   * @param extensionsDir - Extensions directory path
   * @param spec - Protocol specification
   * @param options - File write options
   * @returns Array of file write results
   */
  private async createExtensionPlaceholders(
    extensionsDir: string,
    spec: ProtocolSpec,
    options: FileWriteOptions
  ): Promise<FileWriteResult[]> {
    const protocolName = spec.protocol.name;

    // Custom validators placeholder
    const validatorsContent = `/**
 * Custom Validators for ${protocolName} Protocol
 * 
 * This file is an extension point for custom validation logic.
 * Add your custom field validators here.
 * 
 * This file will NOT be overwritten during regeneration.
 */

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Custom field validator
 * @param fieldName - Name of the field being validated
 * @param value - Value to validate
 * @returns Validation result
 */
export function customFieldValidator(
  fieldName: string,
  value: any
): ValidationResult {
  // Add your custom validation logic here
  return { valid: true };
}
`;

    // Custom hooks placeholder
    const hooksContent = `/**
 * Message Hooks for ${protocolName} Protocol
 * 
 * This file is an extension point for message processing hooks.
 * Add your custom pre-send and post-receive hooks here.
 * 
 * This file will NOT be overwritten during regeneration.
 */

/**
 * Pre-send hook
 * Called before a message is sent
 * @param message - Message to be sent
 * @returns Modified message
 */
export function preSendHook(message: any): any {
  // Add your custom pre-send logic here
  return message;
}

/**
 * Post-receive hook
 * Called after a message is received
 * @param message - Received message
 * @returns Processed message
 */
export function postReceiveHook(message: any): any {
  // Add your custom post-receive logic here
  return message;
}
`;

    // README for extensions
    const readmeContent = `# Extension Points

This directory contains extension points for customizing the ${protocolName} protocol implementation.

## Files

- **custom-validators.ts**: Add custom field validation logic
- **message-hooks.ts**: Add pre-send and post-receive message processing hooks

## Important

**These files will NOT be overwritten during regeneration.**

You can safely add your custom logic here without worrying about losing your changes when the protocol implementation is regenerated.

## Usage

The generated parser and serializer will automatically import and use these extension points if they are implemented.
`;

    // Write placeholder files only if they don't exist
    const validatorsPath = path.join(extensionsDir, 'custom-validators.ts');
    const hooksPath = path.join(extensionsDir, 'message-hooks.ts');
    const readmePath = path.join(extensionsDir, 'README.md');

    const results: FileWriteResult[] = [];

    results.push(await this.writeFile(validatorsPath, validatorsContent, {
      ...options,
      overwrite: false, // Never overwrite extension files
    }));

    results.push(await this.writeFile(hooksPath, hooksContent, {
      ...options,
      overwrite: false, // Never overwrite extension files
    }));

    results.push(await this.writeFile(readmePath, readmeContent, {
      ...options,
      overwrite: false, // Never overwrite README
    }));

    return results;
  }

  /**
   * Get all file paths that would be written
   * @param spec - Protocol specification
   * @param outputDir - Base output directory
   * @returns Array of file paths
   */
  getExpectedFilePaths(spec: ProtocolSpec, outputDir: string): string[] {
    const protocolDir = this.getProtocolDirectory(spec, outputDir);
    const testsDir = path.join(protocolDir, 'tests');
    const extensionsDir = path.join(protocolDir, 'extensions');

    return [
      path.join(protocolDir, this.getParserFileName(spec)),
      path.join(protocolDir, this.getSerializerFileName(spec)),
      path.join(protocolDir, this.getUIFileName(spec)),
      path.join(testsDir, this.getPropertyTestsFileName(spec)),
      path.join(testsDir, this.getUnitTestsFileName(spec)),
      path.join(testsDir, this.getTestDataFileName(spec)),
      path.join(extensionsDir, 'custom-validators.ts'),
      path.join(extensionsDir, 'message-hooks.ts'),
      path.join(extensionsDir, 'README.md'),
    ];
  }

  /**
   * Check if a file exists
   * @param filePath - File path to check
   * @returns Whether file exists
   */
  async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Delete a file
   * @param filePath - File path to delete
   * @returns Whether deletion was successful
   */
  async deleteFile(filePath: string): Promise<boolean> {
    try {
      await fs.unlink(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Delete a directory and all its contents
   * @param dirPath - Directory path to delete
   * @returns Whether deletion was successful
   */
  async deleteDirectory(dirPath: string): Promise<boolean> {
    try {
      await fs.rm(dirPath, { recursive: true, force: true });
      return true;
    } catch {
      return false;
    }
  }
}
