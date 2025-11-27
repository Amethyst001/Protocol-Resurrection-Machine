# Documentation Generation Guidelines

This document defines best practices for generating high-quality README and API documentation for protocol implementations.

## Core Principles

1. **Never output undefined** - Always use fallback values
2. **Valid package names** - Sanitize protocol names for package managers
3. **Complete sections** - All referenced sections must exist
4. **Working examples** - All code examples must be syntactically valid
5. **Multi-language support** - Include examples for all target languages

## Fallback Value Strategy

### Protocol Metadata

When generating protocol information, always provide sensible defaults:

```typescript
// ❌ Bad: Outputs undefined
const port = spec.protocol.port;
const transport = spec.connection.type;

// ✅ Good: Uses fallbacks
const port = spec.protocol.port || 'N/A';
const transport = spec.connection.type || 'TCP';
const description = spec.protocol.description || `A generated SDK for the ${spec.protocol.name} protocol.`;
```

### Default Values by Protocol Type

Use intelligent defaults based on protocol characteristics:

```typescript
function getDefaultPort(spec: ProtocolSpec): string {
  if (spec.protocol.port) return spec.protocol.port.toString();
  
  // Infer from protocol name or type
  const name = spec.protocol.name.toLowerCase();
  if (name.includes('http')) return '80';
  if (name.includes('gopher')) return '70';
  if (name.includes('finger')) return '79';
  if (name.includes('smtp')) return '25';
  if (name.includes('pop3')) return '110';
  
  return 'N/A';
}

function getDefaultTransport(spec: ProtocolSpec): string {
  if (spec.connection.type) return spec.connection.type;
  
  // 99% of protocols use TCP
  return 'TCP';
}
```

## Package Name Sanitization

### The Problem

Protocol names often contain spaces, special characters, or mixed case that are invalid in package names:

- "Archie Help" → Invalid: `npm install @prm/generated-archie help`
- "WAIS-Search" → Invalid: `pip install prm-WAIS-Search`

### The Solution

Always sanitize protocol names before using them in package identifiers:

```typescript
function sanitizePackageName(protocolName: string): string {
  return protocolName
    .toLowerCase()                    // Convert to lowercase
    .replace(/\s+/g, '-')            // Replace spaces with hyphens
    .replace(/[^a-z0-9-_]/g, '')     // Remove invalid characters
    .replace(/^-+|-+$/g, '')         // Remove leading/trailing hyphens
    .replace(/-+/g, '-');            // Collapse multiple hyphens
}

// Examples:
// "Archie Help" → "archie-help"
// "WAIS-Search" → "wais-search"
// "POP3 Mail" → "pop3-mail"
```

### Language-Specific Sanitization

Different package managers have different rules:

```typescript
function sanitizeForNpm(protocolName: string): string {
  // npm: lowercase, hyphens, no spaces
  return sanitizePackageName(protocolName);
}

function sanitizeForPip(protocolName: string): string {
  // pip: lowercase, hyphens or underscores, no spaces
  return sanitizePackageName(protocolName).replace(/_/g, '-');
}

function sanitizeForGo(protocolName: string): string {
  // Go: lowercase, no special characters
  return protocolName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function sanitizeForCargo(protocolName: string): string {
  // Cargo: lowercase, hyphens or underscores
  return sanitizePackageName(protocolName);
}
```

## Installation Commands

### Template Pattern

Always use sanitized names in installation commands:

```typescript
function generateInstallationSection(spec: ProtocolSpec): string {
  const sanitized = sanitizePackageName(spec.protocol.name);
  
  return `
## Installation

### TypeScript/JavaScript
\`\`\`bash
npm install @prm/generated-${sanitized}
\`\`\`

### Python
\`\`\`bash
pip install prm-${sanitized}
\`\`\`

### Go
\`\`\`bash
go get github.com/prm/generated/${sanitized}
\`\`\`

### Rust
\`\`\`bash
cargo add prm-${sanitized}
\`\`\`
`;
}
```

### Validation

Always validate generated commands:

```typescript
function validateInstallCommand(command: string): boolean {
  // Check for spaces in package names
  if (/install\s+[^\s]+\s+[^\s]+/.test(command)) {
    console.error('Invalid package name: contains spaces');
    return false;
  }
  
  // Check for invalid characters
  if (/[^a-z0-9@/\-_.]/.test(command.split(' ').pop()!)) {
    console.error('Invalid package name: contains special characters');
    return false;
  }
  
  return true;
}
```

## Complete Section References

### The Problem

README files often reference sections that don't exist:

```markdown
See the [API Reference](#api-reference) and [Examples](#examples) sections below.

<!-- File ends here - no API Reference or Examples! -->
```

### The Solution

Always generate referenced sections, even if minimal:

```typescript
function generateReadme(spec: ProtocolSpec): string {
  const sections: string[] = [];
  
  // ... other sections ...
  
  // Quick start with references
  sections.push('## Quick Start');
  sections.push('');
  sections.push('See the [API Reference](#api-reference) and [Examples](#examples) sections below.');
  sections.push('');
  
  // MUST generate these sections since we referenced them
  sections.push('## API Reference');
  sections.push('');
  sections.push(generateAPIReference(spec));
  sections.push('');
  
  sections.push('## Examples');
  sections.push('');
  sections.push(generateExamples(spec));
  sections.push('');
  
  return sections.join('\n');
}
```

### Placeholder Pattern

If a section isn't ready, use a placeholder:

```typescript
function generateAPIReference(spec: ProtocolSpec): string {
  if (!hasGeneratedCode(spec)) {
    return `API reference will be available after code generation.

Run \`npm run generate\` to generate the implementation.`;
  }
  
  return generateFullAPIReference(spec);
}
```

## Multi-Language Code Examples

### Complete Examples

Every README should include working examples for all supported languages:

```typescript
function generateExamplesSection(spec: ProtocolSpec): string {
  const sections: string[] = [];
  
  sections.push('## Examples');
  sections.push('');
  
  // TypeScript
  sections.push('### TypeScript');
  sections.push('```typescript');
  sections.push(generateTypeScriptExample(spec));
  sections.push('```');
  sections.push('');
  
  // Python
  sections.push('### Python');
  sections.push('```python');
  sections.push(generatePythonExample(spec));
  sections.push('```');
  sections.push('');
  
  // Go
  sections.push('### Go');
  sections.push('```go');
  sections.push(generateGoExample(spec));
  sections.push('```');
  sections.push('');
  
  // Rust
  sections.push('### Rust');
  sections.push('```rust');
  sections.push(generateRustExample(spec));
  sections.push('```');
  sections.push('');
  
  return sections.join('\n');
}
```

### Example Quality

Ensure all examples:

1. Use correct import syntax for the language
2. Include proper error handling
3. Show realistic usage patterns
4. Are syntactically valid
5. Use sanitized package names

```typescript
function generateTypeScriptExample(spec: ProtocolSpec): string {
  const sanitized = sanitizePackageName(spec.protocol.name);
  const className = toPascalCase(spec.protocol.name);
  
  return `import { ${className}Client } from '@prm/generated-${sanitized}';

async function main() {
  const client = new ${className}Client();
  
  try {
    await client.connect('localhost', ${spec.protocol.port || 8080});
    const response = await client.sendRequest({ /* ... */ });
    console.log(response);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.disconnect();
  }
}

main();`;
}
```

## Documentation Validation

### Automated Checks

Always validate generated documentation before writing:

```typescript
interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

function validateDocumentation(readme: string, spec: ProtocolSpec): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Check for undefined values
  if (readme.includes('undefined')) {
    errors.push('README contains undefined values');
  }
  
  // Check for invalid package names (spaces)
  const installCommands = readme.match(/(?:npm|pip|go|cargo)\s+(?:install|get|add)\s+([^\n]+)/g);
  if (installCommands) {
    installCommands.forEach(cmd => {
      const packageName = cmd.split(/\s+/).pop()!;
      if (packageName.includes(' ')) {
        errors.push(`Invalid package name with spaces: ${packageName}`);
      }
    });
  }
  
  // Check for broken internal links
  const links = readme.match(/\[([^\]]+)\]\(#([^)]+)\)/g);
  if (links) {
    links.forEach(link => {
      const anchor = link.match(/#([^)]+)/)?.[1];
      if (anchor && !readme.includes(`## ${anchor.replace(/-/g, ' ')}`)) {
        warnings.push(`Broken internal link: ${link}`);
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
    valid: errors.length === 0,
    errors,
    warnings
  };
}
```

### Pre-Write Validation

Never write documentation without validation:

```typescript
function writeDocumentation(spec: ProtocolSpec, outputPath: string): void {
  const readme = generateReadme(spec);
  
  // Validate before writing
  const validation = validateDocumentation(readme, spec);
  
  if (!validation.valid) {
    console.error('Documentation validation failed:');
    validation.errors.forEach(err => console.error(`  - ${err}`));
    throw new Error('Cannot write invalid documentation');
  }
  
  if (validation.warnings.length > 0) {
    console.warn('Documentation warnings:');
    validation.warnings.forEach(warn => console.warn(`  - ${warn}`));
  }
  
  fs.writeFileSync(outputPath, readme);
}
```

## Template Best Practices

### Use Template Functions

Don't use raw template strings with undefined values:

```typescript
// ❌ Bad: Can output undefined
const readme = `
# ${spec.protocol.name} Protocol

- **Port**: ${spec.protocol.port}
- **Transport**: ${spec.connection.type}
`;

// ✅ Good: Uses helper functions with fallbacks
const readme = `
# ${spec.protocol.name} Protocol

- **Port**: ${getPortWithFallback(spec)}
- **Transport**: ${getTransportWithFallback(spec)}
`;
```

### Defensive Programming

Always check for existence before accessing nested properties:

```typescript
// ❌ Bad: Can throw if connection is undefined
const transport = spec.connection.type;

// ✅ Good: Safe access with fallback
const transport = spec.connection?.type || 'TCP';
```

## Error Messages

When validation fails, provide actionable error messages:

```typescript
function validateAndReport(spec: ProtocolSpec): void {
  const errors: string[] = [];
  
  if (!spec.protocol.port) {
    errors.push(
      'Missing protocol port. Add "port: 70" to your YAML spec or a default will be used.'
    );
  }
  
  if (!spec.connection?.type) {
    errors.push(
      'Missing connection type. Add "type: TCP" to connection section or TCP will be assumed.'
    );
  }
  
  if (errors.length > 0) {
    console.warn('Specification warnings:');
    errors.forEach(err => console.warn(`  - ${err}`));
    console.warn('Documentation will use fallback values.');
  }
}
```

## Summary

**Key Rules:**

1. ✅ Always use fallback values (never output undefined)
2. ✅ Always sanitize package names (no spaces)
3. ✅ Always generate referenced sections
4. ✅ Always validate before writing
5. ✅ Always include multi-language examples

**Expected Quality:**

- Zero undefined values in output
- 100% valid package installation commands
- All internal links resolve
- All code examples are syntactically valid
- Professional, complete documentation

**Validation Checklist:**

- [ ] No "undefined" strings in output
- [ ] All package names are valid identifiers
- [ ] All internal links resolve to sections
- [ ] All code examples have valid syntax
- [ ] All referenced sections exist
- [ ] Multi-language examples included
- [ ] Installation commands are copy-pasteable
