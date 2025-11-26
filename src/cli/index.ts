#!/usr/bin/env node

/**
 * Protocol Resurrection Machine CLI
 * Command-line interface for generating protocol implementations from YAML specs
 */

import { Command } from 'commander';
import * as fs from 'fs/promises';
import * as path from 'path';
import chalk from 'chalk';
import { YAMLParser } from '../core/yaml-parser.js';
import { CodeGenerator } from '../generation/code-generator.js';
import type { ProtocolSpec } from '../types/protocol-spec.js';
import { createErrorFormatter } from '../utils/error-formatter.js';

/**
 * Handle uncaught errors gracefully
 */
process.on('uncaughtException', (error: Error) => {
  const errorFormatter = createErrorFormatter({ includeStack: true });
  console.error(chalk.red('✗ Uncaught exception:'));
  console.error(errorFormatter.formatError(error));
  process.exit(1);
});

process.on('unhandledRejection', (reason: any) => {
  const errorFormatter = createErrorFormatter({ includeStack: true });
  console.error(chalk.red('✗ Unhandled promise rejection:'));
  if (reason instanceof Error) {
    console.error(errorFormatter.formatError(reason));
  } else {
    console.error(chalk.red(String(reason)));
  }
  process.exit(1);
});

/**
 * Check if a file exists
 */
async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate that a file exists and is readable
 */
async function validateFileExists(filePath: string): Promise<void> {
  const exists = await fileExists(filePath);
  if (!exists) {
    console.error(chalk.red(`✗ File not found: ${filePath}`));
    console.error(chalk.yellow('💡 Make sure the file path is correct'));
    process.exit(1);
  }

  // Check if it's a YAML file
  const ext = path.extname(filePath).toLowerCase();
  if (ext !== '.yaml' && ext !== '.yml') {
    console.warn(chalk.yellow(`⚠ Warning: File does not have .yaml or .yml extension`));
    console.warn(chalk.yellow(`  File: ${filePath}`));
    console.warn();
  }
}

const program = new Command();

/**
 * Configure CLI program
 */
program
  .name('prm')
  .description('Protocol Resurrection Machine - Generate protocol implementations from YAML specifications')
  .version('0.1.0')
  .addHelpText('after', `
Examples:
  $ prm generate protocols/gopher.yaml
  $ prm generate protocols/finger.yaml --output ./my-protocols
  $ prm generate protocols/gopher.yaml --verbose
  $ prm validate protocols/gopher.yaml

For more information, visit: https://github.com/yourusername/protocol-resurrection-machine
  `);

program
  .command('generate')
  .description('Generate protocol implementation from YAML specification')
  .argument('<yaml-file>', 'Path to YAML protocol specification file')
  .option('-o, --output <dir>', 'Output directory for generated files', './generated')
  .option('-v, --verbose', 'Enable verbose logging', false)
  .action(async (yamlFile: string, options: { output: string; verbose: boolean }) => {
    try {
      const { output, verbose } = options;

      if (verbose) {
        console.log(chalk.blue('Protocol Resurrection Machine - Generate'));
        console.log(chalk.gray(`YAML file: ${yamlFile}`));
        console.log(chalk.gray(`Output directory: ${output}`));
        console.log();
      }

      // Step 1: Validate file exists
      await validateFileExists(yamlFile);

      // Step 2: Read YAML file
      if (verbose) {
        console.log(chalk.blue('📖 Reading YAML specification...'));
      }

      let yamlContent: string;
      try {
        yamlContent = await fs.readFile(yamlFile, 'utf-8');
      } catch (error) {
        console.error(chalk.red(`✗ Failed to read YAML file: ${yamlFile}`));
        console.error(chalk.red(error instanceof Error ? error.message : String(error)));
        process.exit(1);
      }

      // Step 3: Parse and validate YAML
      if (verbose) {
        console.log(chalk.blue('🔍 Parsing and validating YAML...'));
      }

      const parser = new YAMLParser();
      let spec: ProtocolSpec;

      try {
        spec = parser.parse(yamlContent);
      } catch (error) {
        console.error(chalk.red('✗ Failed to parse YAML specification'));
        console.error(chalk.red(error instanceof Error ? error.message : String(error)));
        process.exit(1);
      }

      // Validate the parsed spec
      const validationResult = parser.validate(spec);
      if (!validationResult.valid) {
        console.error(chalk.red('✗ YAML validation failed'));
        console.error();
        
        // Use error formatter for comprehensive error display
        const errorFormatter = createErrorFormatter();
        console.error(errorFormatter.formatValidationErrors(validationResult.errors));
        
        process.exit(1);
      }

      if (verbose) {
        console.log(chalk.green(`✓ Validation passed`));
        console.log(chalk.gray(`  Protocol: ${spec.protocol.name}`));
        console.log(chalk.gray(`  Port: ${spec.protocol.port}`));
        console.log(chalk.gray(`  Message types: ${spec.messageTypes.length}`));
        console.log();
      }

      // Step 4: Generate code
      if (verbose) {
        console.log(chalk.blue('⚙️  Generating code...'));
      }

      const generator = new CodeGenerator();
      let verificationResult;

      try {
        verificationResult = await generator.generateWriteAndVerify(spec, output);
      } catch (error) {
        console.error(chalk.red('✗ Code generation failed'));
        console.error(chalk.red(error instanceof Error ? error.message : String(error)));
        process.exit(1);
      }

      // Step 5: Display results
      if (verificationResult.missing.length > 0) {
        console.error(chalk.red('✗ Some files were not generated'));
        console.error();
        verificationResult.missing.forEach((file: string) => {
          console.error(chalk.red(`  • Missing: ${file}`));
        });
        process.exit(1);
      }

      if (verificationResult.invalid.length > 0) {
        console.warn(chalk.yellow('⚠ Some generated files have syntax errors'));
        console.warn();
        verificationResult.invalid.forEach((file: string) => {
          const artifact = verificationResult.artifacts.find((a) => a.path === file);
          console.warn(chalk.yellow(`  • ${file}`));
          if (artifact?.error) {
            console.warn(chalk.yellow(`    ${artifact.error}`));
          }
        });
      }

      // Success!
      console.log(chalk.green('✓ Protocol implementation generated successfully!'));
      console.log();
      console.log(chalk.bold('Generated files:'));
      verificationResult.artifacts
        .filter((a) => a.exists)
        .forEach((artifact) => {
          console.log(chalk.gray(`  • ${artifact.path}`));
        });
      console.log();
      console.log(chalk.blue(`Output directory: ${path.resolve(output)}`));
    } catch (error) {
      console.error(chalk.red('✗ Unexpected error'));
      console.error(chalk.red(error instanceof Error ? error.message : String(error)));
      if (error instanceof Error && error.stack) {
        console.error(chalk.gray(error.stack));
      }
      process.exit(1);
    }
  });

/**
 * Validate command - Validate YAML specification without generating code
 */
program
  .command('validate')
  .description('Validate YAML protocol specification')
  .argument('<yaml-file>', 'Path to YAML protocol specification file')
  .action(async (yamlFile: string) => {
    try {
      console.log(chalk.blue('Protocol Resurrection Machine - Validate'));
      console.log(chalk.gray(`YAML file: ${yamlFile}`));
      console.log();

      // Step 1: Validate file exists
      await validateFileExists(yamlFile);

      // Step 2: Read YAML file
      console.log(chalk.blue('📖 Reading YAML specification...'));

      let yamlContent: string;
      try {
        yamlContent = await fs.readFile(yamlFile, 'utf-8');
      } catch (error) {
        console.error(chalk.red(`✗ Failed to read YAML file: ${yamlFile}`));
        console.error(chalk.red(error instanceof Error ? error.message : String(error)));
        process.exit(1);
      }

      // Step 3: Parse and validate YAML
      console.log(chalk.blue('🔍 Validating YAML specification...'));

      const parser = new YAMLParser();
      const validationResult = parser.validateComplete(yamlContent);

      if (!validationResult.valid) {
        console.error(chalk.red('✗ Validation failed'));
        console.error();
        
        // Use error formatter for comprehensive error display
        const errorFormatter = createErrorFormatter();
        console.error(errorFormatter.formatValidationErrors(validationResult.errors));
        
        process.exit(1);
      }

      // Parse to get protocol info
      let spec: ProtocolSpec;
      try {
        spec = parser.parse(yamlContent);
      } catch (error) {
        console.error(chalk.red('✗ Failed to parse YAML specification'));
        console.error(chalk.red(error instanceof Error ? error.message : String(error)));
        process.exit(1);
      }

      // Success!
      console.log(chalk.green('✓ Validation passed!'));
      console.log();
      console.log(chalk.bold('Protocol Information:'));
      console.log(chalk.gray(`  Name: ${spec.protocol.name}`));
      if (spec.protocol.rfc) {
        console.log(chalk.gray(`  RFC: ${spec.protocol.rfc}`));
      }
      console.log(chalk.gray(`  Port: ${spec.protocol.port}`));
      console.log(chalk.gray(`  Connection: ${spec.connection.type}`));
      console.log(chalk.gray(`  Message types: ${spec.messageTypes.length}`));
      
      if (spec.messageTypes.length > 0) {
        console.log();
        console.log(chalk.bold('Message Types:'));
        spec.messageTypes.forEach((msgType) => {
          console.log(chalk.gray(`  • ${msgType.name} (${msgType.direction})`));
          console.log(chalk.gray(`    Fields: ${msgType.fields.length}`));
        });
      }

      if (spec.types && spec.types.length > 0) {
        console.log();
        console.log(chalk.bold('Type Definitions:'));
        spec.types.forEach((typeDef) => {
          console.log(chalk.gray(`  • ${typeDef.name} (${typeDef.kind})`));
        });
      }

      console.log();
      console.log(chalk.green('✓ YAML specification is valid and ready for code generation'));
      
      process.exit(0);
    } catch (error) {
      console.error(chalk.red('✗ Unexpected error'));
      console.error(chalk.red(error instanceof Error ? error.message : String(error)));
      if (error instanceof Error && error.stack) {
        console.error(chalk.gray(error.stack));
      }
      process.exit(1);
    }
  });

program.parse();
