import type { ProtocolSpec, MessageType, FieldType } from '../types/protocol-spec.js';
import * as fs from 'fs';
import * as path from 'path';

export interface KiroSpecSet {
  requirements?: string;
  design?: string;
  tasks?: string;
}

export interface Documentation {
  readme: string;
  apiReference: string;
  examples: Example[];
  changelog: string;
  version: string;
}

export interface Example {
  language: 'typescript' | 'python' | 'go' | 'rust';
  title: string;
  description: string;
  code: string;
  runnable: boolean;
}

export class DocumentationGenerator {
  /**
   * Sanitize package name for use in package managers
   * Converts to lowercase, replaces spaces with hyphens, removes invalid characters
   */
  private sanitizePackageName(protocolName: string): string {
    return protocolName
      .toLowerCase()                    // Convert to lowercase
      .replace(/\s+/g, '-')            // Replace spaces with hyphens
      .replace(/[^a-z0-9-_]/g, '')     // Remove invalid characters
      .replace(/^-+|-+$/g, '')         // Remove leading/trailing hyphens
      .replace(/-+/g, '-');            // Collapse multiple hyphens
  }

  /**
   * Get port with fallback logic
   * Returns spec.protocol.port if defined, infers from protocol name, or defaults to 'N/A'
   */
  private getPortWithFallback(spec: ProtocolSpec): string {
    // Return port if defined
    if (spec.protocol.port !== undefined && spec.protocol.port !== null) {
      return spec.protocol.port.toString();
    }

    // Infer from protocol name
    const name = spec.protocol.name.toLowerCase();
    if (name.includes('gopher')) return '70';
    if (name.includes('finger')) return '79';
    if (name.includes('http') && !name.includes('https')) return '80';
    if (name.includes('https')) return '443';
    if (name.includes('smtp')) return '25';
    if (name.includes('pop3')) return '110';
    if (name.includes('imap')) return '143';
    if (name.includes('ftp')) return '21';
    if (name.includes('ssh')) return '22';
    if (name.includes('telnet')) return '23';
    if (name.includes('whois')) return '43';
    if (name.includes('dns')) return '53';

    // Default to 'N/A' if unknown
    return 'N/A';
  }

  /**
   * Get transport with fallback logic
   * Returns spec.connection.type if defined, defaults to 'TCP'
   */
  private getTransportWithFallback(spec: ProtocolSpec): string {
    // Return transport if defined
    if (spec.connection?.type) {
      return spec.connection.type;
    }

    // Default to TCP (99% of protocols use TCP)
    return 'TCP';
  }

  /**
   * Get description with fallback logic
   * Returns spec.protocol.description if defined, generates from protocol name otherwise
   */
  private getDescriptionWithFallback(spec: ProtocolSpec): string {
    // Return description if defined
    if (spec.protocol.description) {
      return spec.protocol.description;
    }

    // Generate from protocol name
    return `A generated SDK for the ${spec.protocol.name} protocol.`;
  }

  /**
   * Generate complete documentation for a protocol
   */
  generate(
    spec: ProtocolSpec,
    kiroSpecs?: KiroSpecSet,
    generatedCodePath?: string
  ): Documentation {
    const readme = this.generateReadme(spec, kiroSpecs);
    const apiReference = this.generateAPIReference(spec, generatedCodePath);
    const examples = this.generateExamples(spec);

    // Validate documentation before returning
    const validation = this.validateDocumentation(readme, spec);
    if (!validation.valid) {
      console.warn('Documentation validation warnings:');
      validation.warnings.forEach(warning => console.warn(`  - ${warning}`));
    }

    return {
      readme,
      apiReference,
      examples,
      changelog: '', // Will be populated by changelog generator
      version: '1.0.0' // Will be managed by version manager
    };
  }

  /**
   * Validate generated documentation for common issues
   */
  validateDocumentation(readme: string, spec: ProtocolSpec): {
    valid: boolean;
    warnings: string[];
  } {
    const warnings: string[] = [];

    // Check for undefined values
    if (readme.includes('undefined')) {
      warnings.push('README contains undefined values');
    }

    // Check for invalid package names (spaces)
    const installCommands = readme.match(/(?:npm|pip|go|cargo)\s+(?:install|get|add)\s+([^\n]+)/g);
    if (installCommands) {
      installCommands.forEach(cmd => {
        const packageName = cmd.split(/\s+/).pop()!;
        if (packageName.includes(' ')) {
          warnings.push(`Invalid package name with spaces: ${packageName}`);
        }
      });
    }

    // Check for broken internal links
    const links = readme.match(/\[([^\]]+)\]\(#([^)]+)\)/g);
    if (links) {
      links.forEach(link => {
        const anchorMatch = link.match(/#([^)]+)/);
        if (anchorMatch && anchorMatch[1]) {
          const anchor = anchorMatch[1];
          // Convert anchor to heading format (replace hyphens with spaces, capitalize)
          const headingText = anchor.replace(/-/g, ' ');
          // Check if heading exists (case-insensitive)
          const headingRegex = new RegExp(`^## ${headingText}`, 'im');
          if (!headingRegex.test(readme)) {
            warnings.push(`Broken internal link: ${link} - heading not found`);
          }
        }
      });
    }

    // Check for empty sections
    const sections = readme.match(/^## .+$/gm);
    if (sections) {
      sections.forEach(section => {
        const sectionName = section.replace('## ', '');
        const sectionIndex = readme.indexOf(section);
        const nextSectionIndex = readme.indexOf('\n## ', sectionIndex + 1);
        const sectionContent = readme.slice(
          sectionIndex + section.length,
          nextSectionIndex === -1 ? undefined : nextSectionIndex
        ).trim();

        if (!sectionContent) {
          warnings.push(`Empty section: ${sectionName}`);
        }
      });
    }

    return {
      valid: warnings.length === 0,
      warnings
    };
  }

  /**
   * Generate README.md with protocol metadata
   */
  private generateReadme(spec: ProtocolSpec, kiroSpecs?: KiroSpecSet): string {
    const sections: string[] = [];

    // Title and description
    sections.push(`# ${spec.protocol.name} Protocol`);
    sections.push('');
    sections.push(this.getDescriptionWithFallback(spec));
    sections.push('');

    // Protocol metadata
    sections.push('## Protocol Information');
    sections.push('');
    sections.push(`- **Default Port**: ${this.getPortWithFallback(spec)}`);
    sections.push(`- **Transport**: ${this.getTransportWithFallback(spec)}`);

    // Terminator is not globally defined in ConnectionSpec anymore, checking MessageTypes or TerminationSpec
    // For now, omitting global terminator display unless we find a common one or it's added to spec

    sections.push('');

    // Extract user stories from requirements if available
    if (kiroSpecs?.requirements) {
      const userStories = this.extractUserStories(kiroSpecs.requirements);
      if (userStories.length > 0) {
        sections.push('## User Stories');
        sections.push('');
        userStories.forEach(story => {
          sections.push(`- ${story}`);
        });
        sections.push('');
      }
    }

    // Message types
    sections.push('## Message Types');
    sections.push('');
    spec.messageTypes.forEach(messageType => {
      sections.push(`### ${messageType.name}`);
      sections.push('');
      // Description is not currently in MessageType
      // if (messageType.description) {
      //   sections.push(messageType.description);
      //   sections.push('');
      // }
      sections.push(`**Direction**: ${messageType.direction}`);
      sections.push('');
      sections.push(`**Format**: \`${messageType.format}\``);
      sections.push('');

      // Fields
      if (messageType.fields.length > 0) {
        sections.push('**Fields**:');
        sections.push('');
        messageType.fields.forEach(field => {
          const required = field.required ? ' (required)' : ' (optional)';
          // Description is not currently in FieldDefinition
          // const description = field.description ? ` - ${field.description}` : '';
          const description = '';

          const fieldTypeStr = this.getFieldTypeDisplay(field.type);
          sections.push(`- \`${field.name}\` (${fieldTypeStr})${required}${description}`);

          // Add validation constraints if present
          if (field.validation) {
            const constraints: string[] = [];
            if (field.validation.minLength !== undefined) {
              constraints.push(`minLength: ${field.validation.minLength}`);
            }
            if (field.validation.maxLength !== undefined) {
              constraints.push(`maxLength: ${field.validation.maxLength}`);
            }
            if (field.validation.pattern) {
              constraints.push(`pattern: ${field.validation.pattern}`);
            }
            // Enum values are in FieldType, not ValidationRule
            if (field.type.kind === 'enum') {
              constraints.push(`enum: [${field.type.values.join(', ')}]`);
            }

            if (constraints.length > 0) {
              sections.push(`  - Constraints: ${constraints.join(', ')}`);
            }
          }
        });
        sections.push('');
      }
    });

    // Extract architecture from design if available
    if (kiroSpecs?.design) {
      const architecture = this.extractArchitecture(kiroSpecs.design);
      if (architecture) {
        sections.push('## Architecture');
        sections.push('');
        sections.push(architecture);
        sections.push('');
      }
    }

    // Installation
    const sanitizedName = this.sanitizePackageName(spec.protocol.name);
    sections.push('## Installation');
    sections.push('');
    sections.push('### TypeScript/JavaScript');
    sections.push('```bash');
    sections.push('npm install @prm/generated-' + sanitizedName);
    sections.push('```');
    sections.push('');
    sections.push('### Python');
    sections.push('```bash');
    sections.push('pip install prm-' + sanitizedName);
    sections.push('```');
    sections.push('');
    sections.push('### Go');
    sections.push('```bash');
    sections.push('go get github.com/prm/generated/' + sanitizedName);
    sections.push('```');
    sections.push('');
    sections.push('### Rust');
    sections.push('```bash');
    sections.push('cargo add prm-' + sanitizedName);
    sections.push('```');
    sections.push('');

    // Quick start
    sections.push('## Quick Start');
    sections.push('');
    sections.push('See the [API Reference](#api-reference) and [Examples](#examples) sections below.');
    sections.push('');

    // API Reference section (referenced above, must exist)
    sections.push('## API Reference');
    sections.push('');
    sections.push(this.generateAPIReferenceSection(spec));
    sections.push('');

    // Examples section (referenced above, must exist)
    sections.push('## Examples');
    sections.push('');
    sections.push(this.generateExamplesSection(spec));
    sections.push('');

    // Extract implementation status from tasks if available
    if (kiroSpecs?.tasks) {
      const status = this.extractImplementationStatus(kiroSpecs.tasks);
      if (status) {
        sections.push('## Implementation Status');
        sections.push('');
        sections.push(status);
        sections.push('');
      }
    }

    return sections.join('\n');
  }

  /**
   * Generate API Reference section for README
   */
  private generateAPIReferenceSection(spec: ProtocolSpec): string {
    const sections: string[] = [];
    const sanitizedName = this.sanitizePackageName(spec.protocol.name);

    sections.push('For detailed API documentation, see the generated code.');
    sections.push('');
    sections.push('### Basic Usage');
    sections.push('');
    sections.push('```typescript');
    sections.push(`import { ${this.toPascalCase(spec.protocol.name)}Client } from '@prm/generated-${sanitizedName}';`);
    sections.push('');
    sections.push(`const client = new ${this.toPascalCase(spec.protocol.name)}Client();`);
    sections.push(`await client.connect('host', ${this.getPortWithFallback(spec)});`);
    sections.push('// Use client methods...');
    sections.push('await client.disconnect();');
    sections.push('```');

    return sections.join('\n');
  }

  /**
   * Generate Examples section for README with all 4 languages
   */
  private generateExamplesSection(spec: ProtocolSpec): string {
    const sections: string[] = [];

    // TypeScript example
    sections.push('### TypeScript');
    sections.push('');
    sections.push('```typescript');
    sections.push(this.generateTypeScriptExample(spec));
    sections.push('```');
    sections.push('');

    // Python example
    sections.push('### Python');
    sections.push('');
    sections.push('```python');
    sections.push(this.generatePythonExample(spec));
    sections.push('```');
    sections.push('');

    // Go example
    sections.push('### Go');
    sections.push('');
    sections.push('```go');
    sections.push(this.generateGoExample(spec));
    sections.push('```');
    sections.push('');

    // Rust example
    sections.push('### Rust');
    sections.push('');
    sections.push('```rust');
    sections.push(this.generateRustExample(spec));
    sections.push('```');

    return sections.join('\n');
  }

  /**
   * Generate API reference from generated code AST
   */
  private generateAPIReference(spec: ProtocolSpec, generatedCodePath?: string): string {
    const sections: string[] = [];
    const sanitizedName = this.sanitizePackageName(spec.protocol.name);
    const port = this.getPortWithFallback(spec);

    sections.push('# API Reference');
    sections.push('');

    // Parser API
    sections.push('## Parser');
    sections.push('');
    sections.push('### TypeScript');
    sections.push('```typescript');
    sections.push(`import { ${this.toPascalCase(spec.protocol.name)}Parser } from '@prm/generated-${sanitizedName}';`);
    sections.push('');
    sections.push(`const parser = new ${this.toPascalCase(spec.protocol.name)}Parser();`);
    sections.push('const result = parser.parse(buffer);');
    sections.push('if (result.success) {');
    sections.push('  console.log(result.message);');
    sections.push('} else {');
    sections.push('  console.error(result.error);');
    sections.push('}');
    sections.push('```');
    sections.push('');

    // Serializer API
    sections.push('## Serializer');
    sections.push('');
    sections.push('### TypeScript');
    sections.push('```typescript');
    sections.push(`import { ${this.toPascalCase(spec.protocol.name)}Serializer } from '@prm/generated-${sanitizedName}';`);
    sections.push('');
    sections.push(`const serializer = new ${this.toPascalCase(spec.protocol.name)}Serializer();`);
    sections.push('const result = serializer.serialize(message);');
    sections.push('if (result.success) {');
    sections.push('  console.log(result.data);');
    sections.push('} else {');
    sections.push('  console.error(result.error);');
    sections.push('}');
    sections.push('```');
    sections.push('');

    // Client API
    sections.push('## Client');
    sections.push('');
    sections.push('### TypeScript');
    sections.push('```typescript');
    sections.push(`import { ${this.toPascalCase(spec.protocol.name)}Client } from '@prm/generated-${sanitizedName}';`);
    sections.push('');
    sections.push(`const client = new ${this.toPascalCase(spec.protocol.name)}Client();`);
    sections.push(`await client.connect('${sanitizedName}.example.com', ${port});`);
    sections.push('');
    sections.push('// Send request');
    spec.messageTypes
      .filter(mt => mt.direction === 'request')
      .slice(0, 1)
      .forEach(mt => {
        sections.push(`const response = await client.${this.toCamelCase(mt.name)}({`);
        mt.fields.filter(f => f.required).forEach((f, i, arr) => {
          const comma = i < arr.length - 1 ? ',' : '';
          sections.push(`  ${f.name}: 'value'${comma}`);
        });
        sections.push('});');
      });
    sections.push('');
    sections.push('await client.disconnect();');
    sections.push('```');
    sections.push('');

    // Message types
    sections.push('## Message Types');
    sections.push('');
    spec.messageTypes.forEach(messageType => {
      sections.push(`### ${messageType.name}`);
      sections.push('');
      sections.push('```typescript');
      sections.push(`interface ${messageType.name} {`);
      messageType.fields.forEach(field => {
        const optional = field.required ? '' : '?';
        sections.push(`  ${field.name}${optional}: ${this.mapTypeToTS(field.type)};`);
      });
      sections.push('}');
      sections.push('```');
      sections.push('');
    });

    return sections.join('\n');
  }

  /**
   * Generate usage examples for all languages
   */
  private generateExamples(spec: ProtocolSpec): Example[] {
    const examples: Example[] = [];

    // TypeScript example
    examples.push({
      language: 'typescript',
      title: `${spec.protocol.name} Client Example`,
      description: `Connect to a ${spec.protocol.name} server and send a request`,
      code: this.generateTypeScriptExample(spec),
      runnable: true
    });

    // Python example
    examples.push({
      language: 'python',
      title: `${spec.protocol.name} Client Example`,
      description: `Connect to a ${spec.protocol.name} server and send a request`,
      code: this.generatePythonExample(spec),
      runnable: true
    });

    // Go example
    examples.push({
      language: 'go',
      title: `${spec.protocol.name} Client Example`,
      description: `Connect to a ${spec.protocol.name} server and send a request`,
      code: this.generateGoExample(spec),
      runnable: true
    });

    // Rust example
    examples.push({
      language: 'rust',
      title: `${spec.protocol.name} Client Example`,
      description: `Connect to a ${spec.protocol.name} server and send a request`,
      code: this.generateRustExample(spec),
      runnable: true
    });

    return examples;
  }

  /**
   * Generate TypeScript example
   */
  private generateTypeScriptExample(spec: ProtocolSpec): string {
    const lines: string[] = [];
    const protocolName = this.toPascalCase(spec.protocol.name);
    const sanitizedName = this.sanitizePackageName(spec.protocol.name);
    const port = this.getPortWithFallback(spec);

    lines.push(`import { ${protocolName}Client } from '@prm/generated-${sanitizedName}';`);
    lines.push('');
    lines.push('async function main() {');
    lines.push(`  const client = new ${protocolName}Client();`);
    lines.push('');
    lines.push('  try {');
    lines.push(`    await client.connect('${sanitizedName}.example.com', ${port});`);
    lines.push('');

    // Add example request
    const requestMessage = spec.messageTypes.find(mt => mt.direction === 'request');
    if (requestMessage) {
      lines.push(`    const response = await client.${this.toCamelCase(requestMessage.name)}({`);
      requestMessage.fields.filter(f => f.required).forEach((f, i, arr) => {
        const comma = i < arr.length - 1 ? ',' : '';
        lines.push(`      ${f.name}: 'example'${comma}`);
      });
      lines.push('    });');
      lines.push('');
      lines.push('    console.log(response);');
    }

    lines.push('  } finally {');
    lines.push('    await client.disconnect();');
    lines.push('  }');
    lines.push('}');
    lines.push('');
    lines.push('main().catch(console.error);');

    return lines.join('\n');
  }

  /**
   * Generate Python example
   */
  private generatePythonExample(spec: ProtocolSpec): string {
    const lines: string[] = [];
    const protocolName = this.toPascalCase(spec.protocol.name);
    const sanitizedName = this.sanitizePackageName(spec.protocol.name);
    const port = this.getPortWithFallback(spec);

    lines.push(`from prm_${sanitizedName.replace(/-/g, '_')} import ${protocolName}Client`);
    lines.push('import asyncio');
    lines.push('');
    lines.push('async def main():');
    lines.push(`    client = ${protocolName}Client()`);
    lines.push('');
    lines.push('    try:');
    lines.push(`        await client.connect('${sanitizedName}.example.com', ${port})`);
    lines.push('');

    // Add example request
    const requestMessage = spec.messageTypes.find(mt => mt.direction === 'request');
    if (requestMessage) {
      const methodName = this.toSnakeCase(requestMessage.name);
      lines.push(`        response = await client.${methodName}(`);
      requestMessage.fields.filter(f => f.required).forEach((f, i, arr) => {
        const comma = i < arr.length - 1 ? ',' : '';
        lines.push(`            ${f.name}='example'${comma}`);
      });
      lines.push('        )');
      lines.push('');
      lines.push('        print(response)');
    }

    lines.push('    finally:');
    lines.push('        await client.disconnect()');
    lines.push('');
    lines.push("if __name__ == '__main__':");
    lines.push('    asyncio.run(main())');

    return lines.join('\n');
  }

  /**
   * Generate Go example
   */
  private generateGoExample(spec: ProtocolSpec): string {
    const lines: string[] = [];
    const protocolName = this.toPascalCase(spec.protocol.name);
    const sanitizedName = this.sanitizePackageName(spec.protocol.name);
    const port = this.getPortWithFallback(spec);

    lines.push('package main');
    lines.push('');
    lines.push('import (');
    lines.push('    "fmt"');
    lines.push('    "log"');
    lines.push(`    "${sanitizedName}" "github.com/prm/generated/${sanitizedName}"`);
    lines.push(')');
    lines.push('');
    lines.push('func main() {');
    lines.push(`    client := ${sanitizedName}.New${protocolName}Client()`);
    lines.push('');
    lines.push(`    err := client.Connect("${sanitizedName}.example.com", ${port})`);
    lines.push('    if err != nil {');
    lines.push('        log.Fatal(err)');
    lines.push('    }');
    lines.push('    defer client.Disconnect()');
    lines.push('');

    // Add example request
    const requestMessage = spec.messageTypes.find(mt => mt.direction === 'request');
    if (requestMessage) {
      lines.push(`    response, err := client.${requestMessage.name}(`);
      requestMessage.fields.filter(f => f.required).forEach((f, i, arr) => {
        const comma = i < arr.length - 1 ? ',' : '';
        lines.push(`        ${this.toPascalCase(f.name)}: "example"${comma}`);
      });
      lines.push('    )');
      lines.push('    if err != nil {');
      lines.push('        log.Fatal(err)');
      lines.push('    }');
      lines.push('');
      lines.push('    fmt.Println(response)');
    }

    lines.push('}');

    return lines.join('\n');
  }

  /**
   * Generate Rust example
   */
  private generateRustExample(spec: ProtocolSpec): string {
    const lines: string[] = [];
    const protocolName = this.toPascalCase(spec.protocol.name);
    const sanitizedName = this.sanitizePackageName(spec.protocol.name);
    const port = this.getPortWithFallback(spec);

    lines.push(`use prm_${sanitizedName.replace(/-/g, '_')}::${protocolName}Client;`);
    lines.push('');
    lines.push('#[tokio::main]');
    lines.push('async fn main() -> Result<(), Box<dyn std::error::Error>> {');
    lines.push(`    let mut client = ${protocolName}Client::new();`);
    lines.push('');
    lines.push(`    client.connect("${sanitizedName}.example.com", ${port}).await?;`);
    lines.push('');

    // Add example request
    const requestMessage = spec.messageTypes.find(mt => mt.direction === 'request');
    if (requestMessage) {
      const methodName = this.toSnakeCase(requestMessage.name);
      lines.push(`    let response = client.${methodName}(`);
      requestMessage.fields.filter(f => f.required).forEach((f, i, arr) => {
        const comma = i < arr.length - 1 ? ',' : '';
        lines.push(`        "${f.name}".to_string()${comma}`);
      });
      lines.push('    ).await?;');
      lines.push('');
      lines.push('    println!("{:?}", response);');
    }

    lines.push('');
    lines.push('    client.disconnect().await?;');
    lines.push('    Ok(())');
    lines.push('}');

    return lines.join('\n');
  }

  // Helper methods

  private extractUserStories(requirements: string): string[] {
    const stories: string[] = [];
    const lines = requirements.split('\n');

    for (const line of lines) {
      if (line.includes('**User Story:**')) {
        const story = line.replace('**User Story:**', '').trim();
        if (story) {
          stories.push(story);
        }
      }
    }

    return stories;
  }

  private extractArchitecture(design: string): string | null {
    const lines = design.split('\n');
    let inArchitecture = false;
    const architectureLines: string[] = [];

    for (const line of lines) {
      if (line.startsWith('## Architecture')) {
        inArchitecture = true;
        continue;
      }
      if (inArchitecture && line.startsWith('##')) {
        break;
      }
      if (inArchitecture) {
        architectureLines.push(line);
      }
    }

    return architectureLines.length > 0 ? architectureLines.join('\n').trim() : null;
  }

  private extractImplementationStatus(tasks: string): string {
    const lines = tasks.split('\n');
    let completed = 0;
    let total = 0;

    for (const line of lines) {
      if (line.match(/^\s*-\s*\[.\]\s+\d+\./)) {
        total++;
        if (line.includes('[x]')) {
          completed++;
        }
      }
    }

    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    return `${completed}/${total} tasks completed (${percentage}%)`;
  }

  private toCamelCase(str: string): string {
    return str
      .replace(/[-_\s]+(.)?/g, (_, c) => (c ? c.toUpperCase() : ''))
      .replace(/^(.)/, (c) => c.toLowerCase());
  }

  private toSnakeCase(str: string): string {
    return str
      .replace(/([A-Z])/g, '_$1')
      .toLowerCase()
      .replace(/^_/, '');
  }

  private toPascalCase(str: string): string {
    return str
      .replace(/[-_\s]+(.)?/g, (_, c) => (c ? c.toUpperCase() : ''))
      .replace(/^(.)/, (c) => c.toUpperCase());
  }

  private getFieldTypeDisplay(type: FieldType): string {
    if (type.kind === 'string') return `string${type.maxLength ? ` (max ${type.maxLength})` : ''}`;
    if (type.kind === 'number') return `number${type.min !== undefined ? ` (min ${type.min})` : ''}`;
    if (type.kind === 'boolean') return 'boolean';
    if (type.kind === 'enum') return `enum (${type.values.join('|')})`;
    if (type.kind === 'bytes') return `bytes${type.length ? ` (${type.length})` : ''}`;
    return 'unknown';
  }

  private mapTypeToTS(type: FieldType): string {
    switch (type.kind) {
      case 'string': return 'string';
      case 'number': return 'number';
      case 'boolean': return 'boolean';
      case 'bytes': return 'Uint8Array';
      case 'enum': return type.values.map(v => `'${v}'`).join(' | ');
      default: return 'any';
    }
  }
}
