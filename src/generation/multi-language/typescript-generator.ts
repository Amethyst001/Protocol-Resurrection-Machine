/**
 * TypeScript Code Generator
 * 
 * Generates idiomatic TypeScript code for protocol implementations.
 * Applies TypeScript-specific patterns, naming conventions, and error handling.
 */

import type { ProtocolSpec } from '../../types/protocol-spec.js';
import type { LanguageProfile } from '../../types/language-target.js';
import type { LanguageArtifacts } from './language-coordinator.js';
import type { LanguageGenerator } from './language-coordinator.js';
import { ParserGenerator } from '../parser-generator.js';
import { SerializerGenerator } from '../serializer-generator.js';
import { TestGenerator } from '../test-generator.js';
import { applyIdioms } from '../../steering/idiom-applier.js';
import { formatCode } from '../../utils/code-formatter.js';
import { toPascalCase, toKebabCase } from '../../utils/string-utils.js';

/**
 * TypeScript Parser Generator
 * 
 * Generates TypeScript parser code with:
 * - State machine approach for robust parsing
 * - Buffer operations for performance
 * - TypeScript interfaces for message types
 * - JSDoc comments for documentation
 * - camelCase naming convention
 */
export class TypeScriptParserGenerator {
  private parserGenerator: ParserGenerator;

  constructor() {
    this.parserGenerator = new ParserGenerator();
  }

  /**
   * Generate TypeScript parser code
   * 
   * @param spec - Protocol specification
   * @param profile - Language profile with TypeScript idioms
   * @returns Generated parser code
   */
  generate(spec: ProtocolSpec, profile: LanguageProfile): string {
    // Generate base parser code
    let code = this.parserGenerator.generate(spec);

    // Apply TypeScript-specific idioms
    if (profile.idioms.length > 0) {
      const result = applyIdioms(code, profile.idioms, {
        language: 'typescript',
        protocolName: spec.protocol.name
      });
      code = result.code;
    }

    // Ensure camelCase naming
    code = this.applyCamelCaseNaming(code);

    // Add JSDoc comments if missing
    code = this.enhanceJSDocComments(code, spec);

    // Add Validation Functions
    code += this.generateValidationFunctions(spec);

    // Add Builder Pattern
    code += this.generateBuilders(spec);

    // CRITICAL: Format code to remove non-breaking spaces and ensure proper formatting
    code = formatCode(code, { language: 'typescript', indentSize: 4 });

    // EXTRA SAFETY: Explicitly remove \r characters here to ensure no corruption
    code = code.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    return code;
  }

  /**
   * Generate runtime validation functions
   */
  private generateValidationFunctions(spec: ProtocolSpec): string {
    const lines: string[] = ['', '/**', ' * Runtime Validation Functions', ' */'];

    for (const messageType of spec.messageTypes) {
      const typeName = messageType.name;
      lines.push(`export function validate${typeName}(message: ${typeName}): string[] {`);
      lines.push('  const errors: string[] = [];');

      for (const field of messageType.fields) {
        const fieldName = field.name;
        const isOptional = !field.required;
        const access = `message.${fieldName}`;

        // Required check
        if (!isOptional) {
          lines.push(`  if (${access} === undefined || ${access} === null) {`);
          lines.push(`    errors.push("Field '${fieldName}' is required");`);
          lines.push('  }');
        }

        // Type-specific validation
        if (field.type.kind === 'string') {
          if (field.validation?.minLength !== undefined) {
            lines.push(`  if (${access} && ${access}.length < ${field.validation.minLength}) {`);
            lines.push(`    errors.push("Field '${fieldName}' must be at least ${field.validation.minLength} characters");`);
            lines.push('  }');
          }
          if (field.validation?.maxLength !== undefined) {
            lines.push(`  if (${access} && ${access}.length > ${field.validation.maxLength}) {`);
            lines.push(`    errors.push("Field '${fieldName}' must be at most ${field.validation.maxLength} characters");`);
            lines.push('  }');
          }
          if (field.validation?.pattern) {
            lines.push(`  if (${access} && !/${field.validation.pattern}/.test(${access})) {`);
            lines.push(`    errors.push("Field '${fieldName}' must match pattern ${field.validation.pattern}");`);
            lines.push('  }');
          }
        } else if (field.type.kind === 'number') {
          if (field.type.min !== undefined) {
            lines.push(`  if (${access} !== undefined && ${access} < ${field.type.min}) {`);
            lines.push(`    errors.push("Field '${fieldName}' must be at least ${field.type.min}");`);
            lines.push('  }');
          }
          if (field.type.max !== undefined) {
            lines.push(`  if (${access} !== undefined && ${access} > ${field.type.max}) {`);
            lines.push(`    errors.push("Field '${fieldName}' must be at most ${field.type.max}");`);
            lines.push('  }');
          }
        }
      }

      lines.push('  return errors;');
      lines.push('}');
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Generate Builder pattern classes
   */
  private generateBuilders(spec: ProtocolSpec): string {
    const lines: string[] = ['', '/**', ' * Builders', ' */'];

    for (const messageType of spec.messageTypes) {
      const typeName = messageType.name;
      const builderName = `${typeName}Builder`;

      lines.push(`export class ${builderName} {`);
      lines.push(`  private message: Partial<${typeName}> = {};`);
      lines.push('');

      for (const field of messageType.fields) {
        const fieldName = field.name;
        // Fix type mapping
        let tsType = 'any';
        if (field.type.kind === 'string') tsType = 'string';
        else if (field.type.kind === 'number') tsType = 'number';
        else if (field.type.kind === 'boolean') tsType = 'boolean';
        else if (field.type.kind === 'bytes') tsType = 'Buffer';

        lines.push(`  public with${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)}(value: ${tsType}): ${builderName} {`);
        lines.push(`    this.message.${fieldName} = value;`);
        lines.push('    return this;');
        lines.push('  }');
        lines.push('');
      }

      lines.push(`  public build(): ${typeName} {`);
      lines.push('    // Validate required fields');
      lines.push(`    const errors = validate${typeName}(this.message as ${typeName});`);
      lines.push('    if (errors.length > 0) {');
      lines.push('      throw new Error(`Validation failed: ${errors.join(", ")}`);');
      lines.push('    }');
      lines.push(`    return this.message as ${typeName};`);
      lines.push('  }');
      lines.push('}');
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Apply camelCase naming convention to identifiers
   */
  private applyCamelCaseNaming(code: string): string {
    // This is a placeholder - in practice, we'd use AST transformation
    // For now, the generators already use camelCase
    return code;
  }

  /**
   * Enhance JSDoc comments for better documentation
   */
  private enhanceJSDocComments(code: string, spec: ProtocolSpec): string {
    // Add protocol-level JSDoc if missing
    if (!code.includes('@protocol')) {
      const protocolDoc = `/**
 * @protocol ${spec.protocol.name}
 * @rfc ${spec.protocol.rfc || 'N/A'}
 * @port ${spec.protocol.port}
 * @description ${spec.protocol.description || 'No description provided'}
 * 
 * @example
 * \`\`\`typescript
 * import { ${spec.protocol.name}Client } from './client';
 * 
 * const client = new ${spec.protocol.name}Client();
 * await client.connect('localhost');
 * \`\`\`
 */\n`;
      code = protocolDoc + code;
    }

    return code;
  }
}

/**
 * TypeScript Serializer Generator
 * 
 * Generates TypeScript serializer code with:
 * - Validation before serialization
 * - Buffer.concat for byte sequences
 * - Type-safe interfaces
 * - camelCase naming convention
 */
export class TypeScriptSerializerGenerator {
  private serializerGenerator: SerializerGenerator;

  constructor() {
    this.serializerGenerator = new SerializerGenerator();
  }

  /**
   * Generate TypeScript serializer code
   * 
   * @param spec - Protocol specification
   * @param profile - Language profile with TypeScript idioms
   * @returns Generated serializer code
   */
  generate(spec: ProtocolSpec, profile: LanguageProfile): string {
    // Generate base serializer code
    let code = this.serializerGenerator.generate(spec);

    // Apply TypeScript-specific idioms
    if (profile.idioms.length > 0) {
      const result = applyIdioms(code, profile.idioms, {
        language: 'typescript',
        protocolName: spec.protocol.name
      });
      code = result.code;
    }

    // CRITICAL: Format code to remove non-breaking spaces and ensure proper formatting
    code = formatCode(code, { language: 'typescript', indentSize: 4 });

    // EXTRA SAFETY: Explicitly remove \r characters here to ensure no corruption
    code = code.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    return code;
  }
}

/**
 * TypeScript Client Generator
 * 
 * Generates TypeScript client code with:
 * - Promise-based async operations
 * - Connection pooling
 * - Error subclasses for typed errors
 * - camelCase naming convention
 */
export class TypeScriptClientGenerator {
  /**
   * Generate TypeScript client code
   * 
   * @param spec - Protocol specification
   * @param profile - Language profile with TypeScript idioms
   * @returns Generated client code
   */
  generate(spec: ProtocolSpec, profile: LanguageProfile): string {
    const lines: string[] = [];

    // Generate imports
    lines.push(`/**
 * Generated Client for ${spec.protocol.name} Protocol
 * RFC: ${spec.protocol.rfc || 'N/A'}
 * Port: ${spec.protocol.port}
 * 
 * This file is auto-generated. Do not edit manually.
 * Regenerate using: protocol-resurrection-machine generate ${toKebabCase(spec.protocol.name)}.yaml
 */

import { Socket } from 'net';
import { EventEmitter } from 'events';
import { ${toPascalCase(spec.protocol.name)}Parser } from './${toKebabCase(spec.protocol.name)}-parser.js';
import { ${toPascalCase(spec.protocol.name)}Serializer } from './${toKebabCase(spec.protocol.name)}-serializer.js';
`);

    // Generate error classes
    lines.push(this.generateErrorClasses(spec));

    // Generate connection pool
    lines.push(this.generateConnectionPool(spec));

    // Generate client class
    lines.push(this.generateClientClass(spec));

    let code = lines.join('\n\n');

    // Apply TypeScript-specific idioms
    if (profile.idioms.length > 0) {
      const result = applyIdioms(code, profile.idioms, {
        language: 'typescript',
        protocolName: spec.protocol.name
      });
      code = result.code;
    }

    // CRITICAL: Format code to remove non-breaking spaces and ensure proper formatting
    code = formatCode(code, { language: 'typescript', indentSize: 4 });

    // EXTRA SAFETY: Explicitly remove \r characters here to ensure no corruption
    code = code.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    return code;
  }

  /**
   * Generate Error subclasses for typed error handling
   */
  private generateErrorClasses(spec: ProtocolSpec): string {
    const name = toPascalCase(spec.protocol.name);
    return `/**
 * Base error class for ${spec.protocol.name} protocol errors
 */
export class ${name}Error extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: any
  ) {
    super(message);
    this.name = '${name}Error';
  }
}

/**
 * Connection error
 */
export class ${name}ConnectionError extends ${name}Error {
  constructor(message: string, details?: any) {
    super(message, 'CONNECTION_ERROR', details);
    this.name = '${name}ConnectionError';
  }
}

/**
 * Timeout error
 */
export class ${name}TimeoutError extends ${name}Error {
  constructor(message: string, details?: any) {
    super(message, 'TIMEOUT_ERROR', details);
    this.name = '${name}TimeoutError';
  }
}

/**
 * Parse error
 */
export class ${name}ParseError extends ${name}Error {
  constructor(message: string, details?: any) {
    super(message, 'PARSE_ERROR', details);
    this.name = '${name}ParseError';
  }
}

/**
 * Protocol error
 */
export class ${name}ProtocolError extends ${name}Error {
  constructor(message: string, details?: any) {
    super(message, 'PROTOCOL_ERROR', details);
    this.name = '${name}ProtocolError';
  }
}`;
  }

  /**
   * Generate connection pool for managing connections
   */
  private generateConnectionPool(spec: ProtocolSpec): string {
    const name = toPascalCase(spec.protocol.name);
    return `/**
 * Connection pool for managing ${spec.protocol.name} connections
 */
export class ${name}ConnectionPool {
  private connections: Map<string, Socket> = new Map();
  private maxConnections: number = 10;
  
  /**
   * Get or create a connection to a host
   * 
   * @param host - Server hostname
   * @param port - Server port (default: ${spec.protocol.port})
   * @returns Socket connection
   */
  async getConnection(host: string, port: number = ${spec.protocol.port}): Promise<Socket> {
    const key = \`\${host}:\${port}\`;
    
    // Check if we have an existing connection
    const existing = this.connections.get(key);
    if (existing && !existing.destroyed) {
      return existing;
    }
    
    // Create new connection
    const socket = new Socket();
    
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        socket.destroy();
        reject(new ${name}TimeoutError(\`Connection timeout to \${host}:\${port}\`));
      }, 30000);
      
      socket.connect(port, host, () => {
        clearTimeout(timeout);
        this.connections.set(key, socket);
        resolve(socket);
      });
      
      socket.on('error', (error) => {
        clearTimeout(timeout);
        reject(new ${name}ConnectionError(\`Connection failed: \${error.message}\`, { error }));
      });
    });
  }
  
  /**
   * Close a connection
   * 
   * @param host - Server hostname
   * @param port - Server port
   */
  closeConnection(host: string, port: number = ${spec.protocol.port}): void {
    const key = \`\${host}:\${port}\`;
    const socket = this.connections.get(key);
    
    if (socket) {
      socket.destroy();
      this.connections.delete(key);
    }
  }
  
  /**
   * Close all connections
   */
  closeAll(): void {
    for (const socket of this.connections.values()) {
      socket.destroy();
    }
    this.connections.clear();
  }
}`;
  }

  /**
   * Generate main client class
   */
  private generateClientClass(spec: ProtocolSpec): string {
    const name = toPascalCase(spec.protocol.name);
    const lines: string[] = [];

    lines.push(`/**
 * Client for ${spec.protocol.name} protocol
 * 
 * Provides Promise-based async methods for protocol operations
 */
export class ${name}Client extends EventEmitter {
  private parser: ${name}Parser;
  private serializer: ${name}Serializer;
  private pool: ${name}ConnectionPool;
  private defaultTimeout: number = 30000;
  
  constructor() {
    super();
    this.parser = new ${name}Parser();
    this.serializer = new ${name}Serializer();
    this.pool = new ${name}ConnectionPool();
  }
  
  /**
   * Set default timeout for operations
   * 
   * @param timeout - Timeout in milliseconds
   */
  setTimeout(timeout: number): void {
    this.defaultTimeout = timeout;
  }
  
  /**
   * Connect to a ${spec.protocol.name} server
   * 
   * @param host - Server hostname
   * @param port - Server port (default: ${spec.protocol.port})
   * @returns Promise that resolves when connected
   */
  async connect(host: string, port: number = ${spec.protocol.port}): Promise<void> {
    await this.pool.getConnection(host, port);
    this.emit('connected', { host, port });
  }
  
  /**
   * Disconnect from a server
   * 
   * @param host - Server hostname
   * @param port - Server port
   */
  disconnect(host: string, port: number = ${spec.protocol.port}): void {
    this.pool.closeConnection(host, port);
    this.emit('disconnected', { host, port });
  }
  
  /**
   * Close all connections
   */
  close(): void {
    this.pool.closeAll();
    this.emit('closed');
  }
`);

    // Generate methods for each message type
    for (const messageType of spec.messageTypes) {
      if (messageType.direction === 'request' || messageType.direction === 'bidirectional') {
        lines.push(this.generateClientMethod(spec, messageType));
      }
    }

    lines.push('}');

    return lines.join('\n  \n');
  }

  /**
   * Generate a client method for a message type
   */
  private generateClientMethod(spec: any, messageType: any): string {
    const methodName = this.toCamelCase(messageType.name);
    const typeName = messageType.name;
    const name = toPascalCase(spec.protocol.name);

    return `  /**
   * Send a ${typeName} message
   * 
   * @param host - Server hostname
   * @param port - Server port
   * @param message - Message to send
   * @returns Promise with response
   */
  async ${methodName}(
    host: string,
    port: number = ${spec.protocol.port},
    message: ${typeName}
  ): Promise<Buffer> {
    // Get connection
    const socket = await this.pool.getConnection(host, port);
    
    // Serialize message
    const serializeResult = this.serializer.${messageType.name.toLowerCase()}.serialize(message);
    if (!serializeResult.success || !serializeResult.data) {
      throw new ${name}ProtocolError(
        \`Failed to serialize ${typeName}: \${serializeResult.error?.message}\`,
        serializeResult.error
      );
    }
    
    // Send message and wait for response
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new ${name}TimeoutError(\`${typeName} request timeout\`));
      }, this.defaultTimeout);
      
      const chunks: Buffer[] = [];
      
      const onData = (data: Buffer) => {
        chunks.push(data);
        // For simplicity, assume response is complete
        // In practice, you'd check for message terminator
        clearTimeout(timeout);
        socket.off('data', onData);
        socket.off('error', onError);
        resolve(Buffer.concat(chunks));
      };
      
      const onError = (error: Error) => {
        clearTimeout(timeout);
        socket.off('data', onData);
        socket.off('error', onError);
        reject(new ${name}ConnectionError(\`Socket error: \${error.message}\`, { error }));
      };
      
      socket.on('data', onData);
      socket.on('error', onError);
      socket.write(serializeResult.data);
    });
  }`;
  }
  private toCamelCase(str: string): string {
    return str.charAt(0).toLowerCase() + str.slice(1);
  }
}

/**
 * TypeScript Test Generator
 * 
 * Generates TypeScript tests with:
 * - Property-based tests using fast-check
 * - Unit tests for specific examples
 * - 100+ iterations per property
 * - Property tag comments
 */
export class TypeScriptTestGenerator {
  private testGenerator: TestGenerator;

  constructor() {
    this.testGenerator = new TestGenerator();
  }

  /**
   * Generate TypeScript test code
   * 
   * @param spec - Protocol specification
   * @param profile - Language profile with TypeScript idioms
   * @returns Generated test code
   */
  generate(spec: ProtocolSpec, profile: LanguageProfile): string {
    // Generate property-based tests
    let propertyTests = this.testGenerator.generatePropertyTests(spec);

    // Generate unit tests
    const unitTests = this.testGenerator.generateUnitTests(spec);

    // Apply TypeScript-specific idioms
    if (profile.idioms.length > 0) {
      const result = applyIdioms(propertyTests, profile.idioms, {
        language: 'typescript',
        protocolName: spec.protocol.name
      });
      propertyTests = result.code;
    }

    // Combine tests
    return `${propertyTests}\n\n${unitTests}`;
  }
}

/**
 * Complete TypeScript Generator
 * 
 * Implements the LanguageGenerator interface for TypeScript
 */
export class TypeScriptGenerator implements LanguageGenerator {
  private parserGen: TypeScriptParserGenerator;
  private serializerGen: TypeScriptSerializerGenerator;
  private clientGen: TypeScriptClientGenerator;
  private testGen: TypeScriptTestGenerator;

  constructor() {
    this.parserGen = new TypeScriptParserGenerator();
    this.serializerGen = new TypeScriptSerializerGenerator();
    this.clientGen = new TypeScriptClientGenerator();
    this.testGen = new TypeScriptTestGenerator();
  }

  /**
   * Generate all TypeScript artifacts for a protocol
   * 
   * @param spec - Protocol specification
   * @param profile - Language profile with TypeScript idioms
   * @returns Generated artifacts
   */
  async generate(spec: ProtocolSpec, profile: LanguageProfile): Promise<LanguageArtifacts> {
    const startTime = Date.now();

    // Generate all artifacts
    const parser = this.parserGen.generate(spec, profile);
    const serializer = this.serializerGen.generate(spec, profile);
    const client = this.clientGen.generate(spec, profile);
    const tests = this.testGen.generate(spec, profile);

    // Types are included in parser
    const types = '// Types are defined in parser file';

    const endTime = Date.now();

    return {
      language: 'typescript',
      parser,
      serializer,
      client,
      types,
      tests,
      generationTimeMs: endTime - startTime,
      warnings: []
    };
  }
}
