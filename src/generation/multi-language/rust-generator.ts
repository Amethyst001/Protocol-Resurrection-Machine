/**
 * Rust Code Generator
 * 
 * Generates idiomatic Rust code for protocol implementations.
 * Applies Rust-specific patterns, naming conventions, and error handling.
 */

import type { ProtocolSpec } from '../../types/protocol-spec.js';
import type { LanguageProfile } from '../../types/language-target.js';
import type { LanguageGenerator, LanguageArtifacts } from './language-coordinator.js';
import { applyIdioms } from '../../steering/idiom-applier.js';
import { formatCode } from '../../utils/code-formatter.js';
import { EnhancedFormatParser } from '../../core/enhanced-format-parser.js';
import { toPascalCase, toSnakeCase, toKebabCase } from '../../utils/string-utils.js';



/**
 * Escape delimiter for Rust string literal
 */
function escapeDelimiter(delimiter: string): string {
  return delimiter
    .replace(/\\/g, '\\\\')
    .replace(/\r/g, '\\r')
    .replace(/\n/g, '\\n')
    .replace(/\t/g, '\\t')
    .replace(/"/g, '\\"');
}

/**
 * Rust Parser Generator
 * 
 * Generates Rust parser code with:
 * - State machine approach for robust parsing
 * - &[u8] for data
 * - structs and enums for message types
 * - rustdoc comments for documentation
 * - snake_case naming convention
 */
export class RustParserGenerator {
  /**
   * Generate Rust parser code
   * 
   * @param spec - Protocol specification
   * @param profile - Language profile with Rust idioms
   * @returns Generated parser code
   */
  generate(spec: ProtocolSpec, profile: LanguageProfile): string {
    const lines: string[] = [];

    // Generate module documentation
    lines.push(this.generateModuleDocumentation(spec));

    // Generate imports
    lines.push(this.generateImports(spec));

    // Generate structs for message types
    lines.push(this.generateStructs(spec));

    // Generate builders
    lines.push(this.generateBuilders(spec));

    // Generate error types
    lines.push(this.generateErrorTypes(spec));

    // Generate parser struct
    lines.push(this.generateParserStruct(spec));

    let code = lines.join('\n\n');

    // Apply Rust-specific idioms
    if (profile.idioms.length > 0) {
      const result = applyIdioms(code, profile.idioms, {
        language: 'rust',
        protocolName: spec.protocol.name
      });
      code = result.code;
    }

    // CRITICAL: Format code to remove non-breaking spaces and ensure proper formatting
    code = formatCode(code, { language: 'rust', indentSize: 4 });

    return code;
  }

  /**
   * Generate module documentation
   */
  private generateModuleDocumentation(spec: ProtocolSpec): string {
    return `// Generated Parser for ${spec.protocol.name} Protocol
//
// RFC: ${spec.protocol.rfc || 'N/A'}
// Port: ${spec.protocol.port}
//
// This file is auto-generated. Do not edit manually.
// Regenerate using: protocol-resurrection-machine generate ${spec.protocol.name.toLowerCase()}.yaml`;
  }

  /**
   * Generate imports
   */
  private generateImports(_spec: ProtocolSpec): string {
    return `use std::fmt;
use std::str;
use serde::{Serialize, Deserialize};`;
  }

  /**
   * Generate structs for message types
   */
  private generateStructs(spec: ProtocolSpec): string {
    const structs: string[] = [];

    for (const messageType of spec.messageTypes) {
      structs.push(this.generateStruct(messageType));
    }

    return structs.join('\n\n');
  }

  /**
   * Generate a single struct
   */
  private generateStruct(messageType: any): string {
    const structName = messageType.name;

    // Use EnhancedFormatParser to discover fields
    const parser = new EnhancedFormatParser();
    const parsed = parser.parse(messageType.format);

    // Create map of explicit field definitions
    const explicitFields = new Map(messageType.fields.map((f: any) => [f.name, f]));

    // Collect all field names from format (explicit + auto-discovered)
    const allFieldNames = new Set<string>();
    for (const token of parsed.tokens) {
      if (token.type === 'field' || token.type === 'optional') {
        allFieldNames.add(token.fieldName!);
      }
    }

    // Also add any explicit fields not in format
    for (const field of messageType.fields) {
      allFieldNames.add(field.name);
    }

    const fields: string[] = [];

    // Generate fields with blank lines between them
    const fieldArray = Array.from(allFieldNames);
    for (let i = 0; i < fieldArray.length; i++) {
      const fieldName = fieldArray[i]!;
      const field = explicitFields.get(fieldName) || {
        name: fieldName,
        type: { kind: 'string' as const },
        required: parsed.requiredFields.includes(fieldName),
        optional: !parsed.requiredFields.includes(fieldName)
      } as any;

      const rustFieldName = toSnakeCase(field.name);
      const fieldType = this.mapFieldType(field.type, field.optional);

      // Add rustdoc comment for field (escape special characters)
      const comment = (field.description || `${rustFieldName} field`).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
      fields.push(`    /// ${comment}`);
      fields.push(`    pub ${rustFieldName}: ${fieldType},`);

      // Add blank line between fields for readability
      if (i < fieldArray.length - 1) {
        fields.push('');
      }
    }

    // Escape description
    const description = (messageType.description || structName + ' message').replace(/\\/g, '\\\\').replace(/"/g, '\\"');

    return `/// ${description}
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ${structName} {
${fields.join('\n')}
}`;
  }

  /**
   * Map protocol field type to Rust type
   */
  private mapFieldType(type: any, optional: boolean = false): string {
    // Handle object types (like enum)
    if (typeof type === 'object' && type !== null) {
      if (type.kind === 'enum') {
        // For enums, use String for now
        const rustType = 'String';
        return optional ? `Option<${rustType}>` : rustType;
      }
      // Use the kind property if available
      type = type.kind || 'string';
    }

    const typeMap: Record<string, string> = {
      'string': 'String',
      'integer': 'i32',
      'number': 'f64',
      'boolean': 'bool',
      'bytes': 'Vec<u8>'
    };

    const rustType = typeMap[type as string] || 'String';

    // In Rust, we use Option for optional fields
    return optional ? `Option<${rustType}>` : rustType;
  }

  /**
   * Generate builders for message types
   */
  private generateBuilders(spec: ProtocolSpec): string {
    const builders: string[] = [];

    for (const messageType of spec.messageTypes) {
      const structName = messageType.name;
      const builderName = `${structName}Builder`;
      const fields: string[] = [];
      const setters: string[] = [];
      const buildFields: string[] = [];

      for (const field of messageType.fields) {
        const fieldName = toSnakeCase(field.name);

        // Builder struct field (all optional initially)
        fields.push(`    ${fieldName}: Option<${this.mapFieldType(field.type, false)}>,`);

        // Setter method
        setters.push(`    pub fn ${fieldName}(mut self, value: impl Into<${this.mapFieldType(field.type, false)}>) -> Self {`);
        setters.push(`        self.${fieldName} = Some(value.into());`);
        setters.push(`        self`);
        setters.push(`    }`);

        // Build logic
        if (field.required) {
          buildFields.push(`            ${fieldName}: self.${fieldName}.ok_or("${fieldName} is required")?,`);
        } else {
          buildFields.push(`            ${fieldName}: self.${fieldName},`);
        }
      }

      builders.push(`/// Builder for ${structName}
pub struct ${builderName} {
${fields.join('\n')}
}

impl ${builderName} {
    pub fn new() -> Self {
        Self {
${messageType.fields.map((f: any) => `            ${toSnakeCase(f.name)}: None,`).join('\n')}
        }
    }

${setters.join('\n\n')}

    pub fn build(self) -> Result<${structName}, String> {
        Ok(${structName} {
${buildFields.join('\n')}
        })
    }
}

impl ${structName} {
    pub fn builder() -> ${builderName} {
        ${builderName}::new()
    }
}`);
    }

    return builders.join('\n\n');
  }

  /**
   * Generate error types
   */
  private generateErrorTypes(spec: ProtocolSpec): string {
    const protocolName = toPascalCase(spec.protocol.name);

    return `/// Error type for ${spec.protocol.name} protocol operations
#[derive(Debug, Clone)]
pub struct ${protocolName}Error {
    pub message: String,
    pub offset: Option<usize>,
    pub details: Option<String>,
}

impl fmt::Display for ${protocolName}Error {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        if let Some(offset) = self.offset {
            write!(f, "{} at offset {}", self.message, offset)
        } else {
            write!(f, "{}", self.message)
        }
    }
}

impl std::error::Error for ${protocolName}Error {}

impl ${protocolName}Error {
    /// Create a new error
    pub fn new(message: impl Into<String>, offset: Option<usize>) -> Self {
        Self {
            message: message.into(),
            offset,
            details: None,
        }
    }
    
    /// Create a new error with details
    pub fn with_details(message: impl Into<String>, offset: Option<usize>, details: impl Into<String>) -> Self {
        Self {
            message: message.into(),
            offset,
            details: Some(details.into()),
        }
    }
}

/// Parse error
pub type ParseError = ${protocolName}Error;

/// Validation error
pub type ValidationError = ${protocolName}Error;`;
  }

  /**
   * Generate parser struct
   */
  private generateParserStruct(spec: ProtocolSpec): string {
    const structName = `${toPascalCase(spec.protocol.name)}Parser`;
    const methods: string[] = [];

    // Generate parse methods for each message type
    for (const messageType of spec.messageTypes) {
      methods.push(this.generateParseMethod(spec, messageType));
    }

    return `/// Parser for ${spec.protocol.name} protocol messages
pub struct ${structName} {}

impl ${structName} {
    /// Create a new parser instance
    pub fn new() -> Self {
        Self {}
    }
    
${methods.join('\n    \n')}
}

impl Default for ${structName} {
    fn default() -> Self {
        Self::new()
    }
}`;
  }

  /**
   * Generate parse method for a message type
   */
  private generateParseMethod(spec: ProtocolSpec, messageType: any): string {
    const methodName = `parse_${toSnakeCase(messageType.name)}`;
    const structName = messageType.name;

    // Generate parsing logic
    const parseLogic = this.generateParseLogic(spec, messageType);

    return `    /// Parse a ${structName} message from bytes
    ///
    /// # Arguments
    ///
    /// * \`data\` - The raw bytes to parse
    ///
    /// # Returns
    ///
    /// Returns \`Ok(${structName})\` if parsing succeeds, or \`Err(${toPascalCase(spec.protocol.name)}Error)\` if parsing fails.
    ///
    /// # Errors
    ///
    /// Returns an error if the data is malformed or doesn't match the expected format.
    pub fn ${methodName}(&self, data: &[u8]) -> Result<${structName}, ${toPascalCase(spec.protocol.name)}Error> {
        let mut offset = 0;
        
${parseLogic}
        
        Ok(${structName} {
${this.generateStructConstruction(messageType)}
        })
    }`;
  }

  /**
   * Generate parsing logic from format string
   */
  private generateParseLogic(spec: ProtocolSpec, messageType: any): string {
    const lines: string[] = [];

    // Use EnhancedFormatParser for token iteration
    const parser = new EnhancedFormatParser();
    const parsed = parser.parse(messageType.format);

    // Track consumed delimiters to avoid double-validation
    const consumedIndices = new Set<number>();

    // Iterate through all tokens (fixed strings and fields)
    for (let i = 0; i < parsed.tokens.length; i++) {
      const token = parsed.tokens[i];
      const nextToken = parsed.tokens[i + 1];

      if (!token || consumedIndices.has(i)) continue;

      switch (token.type) {
        case 'fixed': {
          // Validate fixed string using starts_with
          const escapedValue = escapeDelimiter(token.value);
          lines.push(`        // Validate fixed string: ${JSON.stringify(token.value)}`);
          lines.push(`        let expected = b"${escapedValue}";`);
          lines.push(`        if !data[offset..].starts_with(expected) {`);
          lines.push(`            return Err(${toPascalCase(spec.protocol.name)}Error::new(`);
          lines.push(`                format!("Expected '{}' at offset {}", `);
          lines.push(`                    String::from_utf8_lossy(expected), offset),`);
          lines.push(`                Some(offset)`);
          lines.push(`            ));`);
          lines.push(`        }`);
          lines.push(`        offset += expected.len();`);
          lines.push('');
          break;
        }

        case 'field': {
          const fieldName = toSnakeCase(token.fieldName!);
          const varName = `${fieldName}_value`;

          lines.push(`        // Extract field: ${token.fieldName}`);

          if (nextToken && nextToken.type === 'fixed') {
            // Extract until next delimiter
            const escapedDelim = escapeDelimiter(nextToken.value);
            lines.push(`        let delimiter = b"${escapedDelim}";`);
            lines.push(`        let end = data[offset..]`);
            lines.push(`            .windows(delimiter.len())`);
            lines.push(`            .position(|window| window == delimiter)`);
            lines.push(`            .ok_or_else(|| ${toPascalCase(spec.protocol.name)}Error::new(`);
            lines.push(`                format!("Delimiter not found for field ${token.fieldName}"),`);
            lines.push(`                Some(offset)`);
            lines.push(`            ))?;`);
            lines.push(`        `);
            lines.push(`        let ${varName} = str::from_utf8(&data[offset..offset + end])`);
            lines.push(`            .map_err(|e| ${toPascalCase(spec.protocol.name)}Error::with_details(`);
            lines.push(`                format!("Invalid UTF-8 in field ${token.fieldName}"),`);
            lines.push(`                Some(offset),`);
            lines.push(`                e.to_string()`);
            lines.push(`            ))?`);
            lines.push(`            .to_string();`);
            lines.push(`        `);
            lines.push(`        offset += end + delimiter.len();`);
            consumedIndices.add(i + 1); // Mark delimiter as consumed
          } else {
            // Last field - consume remaining
            lines.push(`        let ${varName} = str::from_utf8(&data[offset..])`);
            lines.push(`            .map_err(|e| ${toPascalCase(spec.protocol.name)}Error::with_details(`);
            lines.push(`                format!("Invalid UTF-8 in field ${token.fieldName}"),`);
            lines.push(`                Some(offset),`);
            lines.push(`                e.to_string()`);
            lines.push(`            ))?`);
            lines.push(`            .trim()`);
            lines.push(`            .to_string();`);
            lines.push(`        offset = data.len();`);
          }
          lines.push('');
          break;
        }

        case 'optional': {
          const fieldName = toSnakeCase(token.fieldName!);
          const varName = `${fieldName}_value`;

          lines.push(`        // Extract optional field: ${token.fieldName}`);
          lines.push(`        let mut ${varName} = None;`);

          if (token.optionalPrefix) {
            const escapedPrefix = escapeDelimiter(token.optionalPrefix);
            lines.push(`        let opt_prefix = b"${escapedPrefix}";`);
            lines.push(`        if data[offset..].starts_with(opt_prefix) {`);
            lines.push(`            offset += opt_prefix.len();`);

            if (token.optionalSuffix) {
              const escapedSuffix = escapeDelimiter(token.optionalSuffix);
              lines.push(`            let opt_suffix = b"${escapedSuffix}";`);
              lines.push(`            if let Some(end) = data[offset..]`);
              lines.push(`                .windows(opt_suffix.len())`);
              lines.push(`                .position(|window| window == opt_suffix) {`);
              lines.push(`                ${varName} = Some(str::from_utf8(&data[offset..offset + end])`);
              lines.push(`                    .map_err(|e| ${toPascalCase(spec.protocol.name)}Error::with_details(`);
              lines.push(`                        format!("Invalid UTF-8 in optional field ${token.fieldName}"),`);
              lines.push(`                        Some(offset),`);
              lines.push(`                        e.to_string()`);
              lines.push(`                    ))?`);
              lines.push(`                    .to_string());`);
              lines.push(`                offset += end + opt_suffix.len();`);
              lines.push(`            }`);
            } else {
              lines.push(`            ${varName} = Some(str::from_utf8(&data[offset..])`);
              lines.push(`                .map_err(|e| ${toPascalCase(spec.protocol.name)}Error::with_details(`);
              lines.push(`                    format!("Invalid UTF-8 in optional field ${token.fieldName}"),`);
              lines.push(`                    Some(offset),`);
              lines.push(`                    e.to_string()`);
              lines.push(`                ))?`);
              lines.push(`                .trim()`);
              lines.push(`                .to_string());`);
            }

            lines.push(`        }`);
          }
          lines.push('');
          break;
        }
      }
    }

    // Initialize fields that are not in the format string
    const handledFields = new Set(parsed.tokens
      .filter(t => t.type === 'field' || t.type === 'optional')
      .map(t => t.fieldName));

    for (const field of messageType.fields) {
      if (!handledFields.has(field.name)) {
        const fieldName = toSnakeCase(field.name);
        const varName = `${fieldName}_value`;
        lines.push(`        // Field ${field.name} not in format, initializing to default`);
        lines.push(`        let ${varName} = Default::default();`);
      }
    }

    return lines.join('\n');
  }

  /**
   * Generate struct construction from parsed fields
   */
  private generateStructConstruction(messageType: any): string {
    const fields: string[] = [];

    // Iterate over explicit fields to ensure we include all of them
    for (const field of messageType.fields) {
      const snakeName = toSnakeCase(field.name);
      const varName = `${snakeName}_value`;
      fields.push(`            ${snakeName}: ${varName},`);
    }

    return fields.join('\n');
  }
}


/**
 * Rust Serializer Generator
 * 
 * Generates Rust serializer code with:
 * - Validation before serialization
 * - Vec<u8> for output
 * - structs with validation methods
 * - snake_case naming convention
 */
export class RustSerializerGenerator {
  /**
   * Generate Rust serializer code
   * 
   * @param spec - Protocol specification
   * @param profile - Language profile with Rust idioms
   * @returns Generated serializer code
   */
  generate(spec: ProtocolSpec, profile: LanguageProfile): string {
    const lines: string[] = [];

    // Generate module documentation
    lines.push(`// Generated Serializer for ${spec.protocol.name} Protocol
//
// This file is auto-generated. Do not edit manually.`);

    // Generate imports
    lines.push(`use super::*;`);

    // Generate serializer struct
    lines.push(this.generateSerializerStruct(spec));

    let code = lines.join('\n\n');

    // Apply Rust-specific idioms
    if (profile.idioms.length > 0) {
      const result = applyIdioms(code, profile.idioms, {
        language: 'rust',
        protocolName: spec.protocol.name
      });
      code = result.code;
    }

    // CRITICAL: Format code to remove non-breaking spaces and ensure proper formatting
    code = formatCode(code, { language: 'rust', indentSize: 4 });

    return code;
  }

  /**
   * Generate serializer struct
   */
  private generateSerializerStruct(spec: ProtocolSpec): string {
    const structName = `${toPascalCase(spec.protocol.name)}Serializer`;
    const methods: string[] = [];

    // Generate serialize methods for each message type
    for (const messageType of spec.messageTypes) {
      methods.push(this.generateSerializeMethod(spec, messageType));
      methods.push(this.generateValidateMethod(spec, messageType));
    }

    return `/// Serializer for ${spec.protocol.name} protocol messages
pub struct ${structName} {}

impl ${structName} {
    /// Create a new serializer instance
    pub fn new() -> Self {
        Self {}
    }
    
${methods.join('\n    \n')}
}

impl Default for ${structName} {
    fn default() -> Self {
        Self::new()
    }
}`;
  }

  /**
   * Generate serialize method for a message type
   */
  private generateSerializeMethod(spec: ProtocolSpec, messageType: any): string {
    const methodName = `serialize_${toSnakeCase(messageType.name)}`;
    const structName = messageType.name;

    // Generate serialization logic
    const serializeLogic = this.generateSerializeLogic(messageType);

    return `    /// Serialize a ${structName} message to bytes
    ///
    /// # Arguments
    ///
    /// * \`msg\` - The message to serialize
    ///
    /// # Returns
    ///
    /// Returns \`Ok(Vec<u8>)\` with the serialized bytes, or \`Err(${toPascalCase(spec.protocol.name)}Error)\` if validation fails.
    ///
    /// # Errors
    ///
    /// Returns an error if the message fails validation.
    pub fn ${methodName}(&self, msg: &${structName}) -> Result<Vec<u8>, ${toPascalCase(spec.protocol.name)}Error> {
        // Validate message
        self.validate_${toSnakeCase(messageType.name)}(msg)?;
        
        // Serialize
        let mut result = Vec::new();
${serializeLogic}
        
        Ok(result)
    }`;
  }

  /**
   * Generate serialization logic
   */
  private generateSerializeLogic(messageType: any): string {
    const lines: string[] = [];

    // Use EnhancedFormatParser to get correct token sequence
    const parser = new EnhancedFormatParser();
    const parsed = parser.parse(messageType.format);

    // Iterate through tokens in correct order
    for (const token of parsed.tokens) {
      if (!token) continue;

      switch (token.type) {
        case 'fixed':
          const escapedValue = escapeDelimiter(token.value);
          lines.push(`        result.extend_from_slice(b"${escapedValue}");`);
          break;

        case 'field':
          const field = messageType.fields.find((f: any) => f.name === token.fieldName);
          if (field) {
            const fieldName = toSnakeCase(field.name);
            const fieldType = field.type?.kind || field.type;

            if (fieldType === 'integer' || fieldType === 'number') {
              lines.push(`        result.extend_from_slice(msg.${fieldName}.to_string().as_bytes());`);
            } else if (fieldType === 'boolean') {
              lines.push(`        result.extend_from_slice(if msg.${fieldName} { b"true" } else { b"false" });`);
            } else if (fieldType === 'bytes') {
              lines.push(`        result.extend_from_slice(&msg.${fieldName});`);
            } else {
              lines.push(`        result.extend_from_slice(msg.${fieldName}.as_bytes());`);
            }
          }
          break;

        case 'optional':
          const optField = messageType.fields.find((f: any) => f.name === token.fieldName);
          if (optField) {
            const fieldName = toSnakeCase(optField.name);
            const fieldType = optField.type?.kind || optField.type;

            lines.push(`        if let Some(ref val) = msg.${fieldName} {`);
            if (token.optionalPrefix) {
              const escapedPrefix = escapeDelimiter(token.optionalPrefix);
              lines.push(`            result.extend_from_slice(b"${escapedPrefix}");`);
            }

            if (fieldType === 'integer' || fieldType === 'number') {
              lines.push(`            result.extend_from_slice(val.to_string().as_bytes());`);
            } else if (fieldType === 'boolean') {
              lines.push(`            result.extend_from_slice(if *val { b"true" } else { b"false" });`);
            } else if (fieldType === 'bytes') {
              lines.push(`            result.extend_from_slice(val);`);
            } else {
              lines.push(`            result.extend_from_slice(val.as_bytes());`);
            }

            if (token.optionalSuffix) {
              const escapedSuffix = escapeDelimiter(token.optionalSuffix);
              lines.push(`            result.extend_from_slice(b"${escapedSuffix}");`);
            }
            lines.push(`        }`);
          }
          break;
      }
    }

    return lines.join('\n');
  }

  /**
   * Generate validate method for a message type
   */
  private generateValidateMethod(spec: ProtocolSpec, messageType: any): string {
    const structName = messageType.name;
    const validations: string[] = [];

    // Generate validations for required fields
    for (const field of messageType.fields) {
      if (!field.optional && field.type === 'string') {
        const fieldName = toSnakeCase(field.name);

        validations.push(`        if msg.${fieldName}.is_empty() {`);
        validations.push(`            return Err(${toPascalCase(spec.protocol.name)}Error::new(`);
        validations.push(`                format!("Field ${fieldName} is required"),`);
        validations.push(`                None`);
        validations.push(`            ));`);
        validations.push(`        }`);
      }
    }

    const validationLogic = validations.length > 0
      ? validations.join('\n')
      : '        // No validation required';

    return `    /// Validate a ${structName} message
    fn validate_${toSnakeCase(messageType.name)}(&self, msg: &${structName}) -> Result<(), ${toPascalCase(spec.protocol.name)}Error> {
${validationLogic}
        Ok(())
    }`;
  }
}

/**
 * Rust Client Generator
 * 
 * Generates Rust client code with:
 * - async/await with tokio
 * - Connection pooling
 * - Result<T, E> for errors
 * - Ownership patterns
 */
export class RustClientGenerator {
  /**
   * Generate Rust client code
   * 
   * @param spec - Protocol specification
   * @param profile - Language profile with Rust idioms
   * @returns Generated client code
   */
  generate(spec: ProtocolSpec, profile: LanguageProfile): string {
    const lines: string[] = [];

    // Generate module documentation
    lines.push(`// Generated Client for ${spec.protocol.name} Protocol
//
// This file is auto-generated. Do not edit manually.`);

    // Generate imports
    lines.push(this.generateImports(spec));

    // Generate error types
    lines.push(this.generateClientErrorTypes(spec));

    // Generate connection pool
    lines.push(this.generateConnectionPool(spec));

    // Generate client struct
    lines.push(this.generateClientStruct(spec));

    let code = lines.join('\n\n');

    // Apply Rust-specific idioms
    if (profile.idioms.length > 0) {
      const result = applyIdioms(code, profile.idioms, {
        language: 'rust',
        protocolName: spec.protocol.name
      });
      code = result.code;
    }

    // CRITICAL: Format code to remove non-breaking spaces and ensure proper formatting
    code = formatCode(code, { language: 'rust', indentSize: 4 });

    return code;
  }

  /**
   * Generate imports
   */
  private generateImports(_spec: ProtocolSpec): string {
    return `use super::*;
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use std::time::Duration;
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::TcpStream;
use tokio::time::timeout;`;
  }

  /**
   * Generate client-specific error types
   */
  private generateClientErrorTypes(_spec: ProtocolSpec): string {

    return `/// Connection error
#[derive(Debug, Clone)]
pub struct ConnectionError {
    pub message: String,
}

impl fmt::Display for ConnectionError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "Connection error: {}", self.message)
    }
}

impl std::error::Error for ConnectionError {}

/// Timeout error
#[derive(Debug, Clone)]
pub struct TimeoutError {
    pub message: String,
}

impl fmt::Display for TimeoutError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "Timeout error: {}", self.message)
    }
}

impl std::error::Error for TimeoutError {}`;
  }

  /**
   * Generate connection pool
   */
  private generateConnectionPool(spec: ProtocolSpec): string {
    const className = `${toPascalCase(spec.protocol.name)}ConnectionPool`;

    return `/// Connection pool for managing ${spec.protocol.name} connections
pub struct ${className} {
    connections: Arc<Mutex<HashMap<String, TcpStream>>>,
    max_connections: usize,
}

impl ${className} {
    /// Create a new connection pool
    pub fn new(max_connections: usize) -> Self {
        Self {
            connections: Arc::new(Mutex::new(HashMap::new())),
            max_connections,
        }
    }
    
    /// Get or create a connection to a host
    pub async fn get_connection(&self, host: &str, port: u16) -> Result<TcpStream, ConnectionError> {
        let key = format!("{}:{}", host, port);
        
        // Try to get existing connection
        {
            let mut conns = self.connections.lock().unwrap();
            if let Some(_conn) = conns.get(&key) {
                // For simplicity, we'll create a new connection each time
                // In production, you'd want to check if the connection is still alive
            }
        }
        
        // Create new connection
        let stream = TcpStream::connect(&key)
            .await
            .map_err(|e| ConnectionError {
                message: format!("Failed to connect to {}: {}", key, e),
            })?;
        
        // Store connection
        {
            let mut conns = self.connections.lock().unwrap();
            // Note: In a real implementation, you'd want to handle the old connection properly
            // For now, we just replace it
        }
        
        Ok(stream)
    }
    
    /// Close a connection
    pub fn close_connection(&self, host: &str, port: u16) {
        let key = format!("{}:{}", host, port);
        let mut conns = self.connections.lock().unwrap();
        conns.remove(&key);
    }
    
    /// Close all connections
    pub fn close_all(&self) {
        let mut conns = self.connections.lock().unwrap();
        conns.clear();
    }
}`;
  }

  /**
   * Generate client struct
   */
  private generateClientStruct(spec: ProtocolSpec): string {
    const structName = `${toPascalCase(spec.protocol.name)}Client`;
    const protocolName = toPascalCase(spec.protocol.name);
    const methods: string[] = [];

    // Generate methods for each message type
    for (const messageType of spec.messageTypes) {
      if (messageType.direction === 'request' || messageType.direction === 'bidirectional') {
        methods.push(this.generateClientMethod(spec, messageType));
      }
    }

    return `/// Client for ${spec.protocol.name} protocol
pub struct ${structName} {
    parser: ${protocolName}Parser,
    serializer: ${protocolName}Serializer,
    pool: ${protocolName}ConnectionPool,
    default_timeout: Duration,
}

impl ${structName} {
    /// Create a new ${spec.protocol.name} client
    pub fn new() -> Self {
        Self {
            parser: ${protocolName}Parser::new(),
            serializer: ${protocolName}Serializer::new(),
            pool: ${protocolName}ConnectionPool::new(10),
            default_timeout: Duration::from_secs(30),
        }
    }
    
    /// Set the default timeout for operations
    pub fn set_timeout(&mut self, timeout: Duration) {
        self.default_timeout = timeout;
    }
    
    /// Connect to a ${spec.protocol.name} server
    pub async fn connect(&self, host: &str, port: u16) -> Result<(), ConnectionError> {
        self.pool.get_connection(host, port).await?;
        Ok(())
    }
    
    /// Disconnect from a server
    pub fn disconnect(&self, host: &str, port: u16) {
        self.pool.close_connection(host, port);
    }
    
    /// Close all connections
    pub fn close(&self) {
        self.pool.close_all();
    }
    
${methods.join('\n    \n')}
}

impl Default for ${structName} {
    fn default() -> Self {
        Self::new()
    }
}`;
  }

  /**
   * Generate client method for a message type
   */
  private generateClientMethod(_spec: ProtocolSpec, messageType: any): string {
    const methodName = toSnakeCase(messageType.name);
    const structName = messageType.name;

    return `    /// Send a ${structName} message
    ///
    /// # Arguments
    ///
    /// * \`host\` - Server hostname
    /// * \`port\` - Server port
    /// * \`msg\` - Message to send
    ///
    /// # Returns
    ///
    /// Returns \`Ok(Vec<u8>)\` with the response bytes, or an error if the operation fails.
    pub async fn ${methodName}(
        &self,
        host: &str,
        port: u16,
        msg: &${structName},
    ) -> Result<Vec<u8>, Box<dyn std::error::Error>> {
        // Get connection
        let mut stream = self.pool.get_connection(host, port).await?;
        
        // Serialize message
        let data = self.serializer.serialize_${toSnakeCase(messageType.name)}(msg)?;
        
        // Send message with timeout
        timeout(self.default_timeout, stream.write_all(&data))
            .await
            .map_err(|_| TimeoutError {
                message: "Write timeout".to_string(),
            })??;
        
        // Read response with timeout
        let mut response = Vec::new();
        let mut buf = [0u8; 4096];
        
        let n = timeout(self.default_timeout, stream.read(&mut buf))
            .await
            .map_err(|_| TimeoutError {
                message: "Read timeout".to_string(),
            })??;
        
        response.extend_from_slice(&buf[..n]);
        
        Ok(response)
    }`;
  }
}


/**
 * Rust Test Generator
 * 
 * Generates Rust tests with:
 * - Property-based tests using proptest
 * - Unit tests
 * - Test iterations
 * - Property tag comments
 */
export class RustTestGenerator {
  /**
   * Generate Rust test code
   * 
   * @param spec - Protocol specification
   * @param profile - Language profile with Rust idioms
   * @returns Generated test code
   */
  generate(spec: ProtocolSpec, profile: LanguageProfile): string {
    const lines: string[] = [];

    // Generate module documentation
    lines.push(`//! Generated Tests for ${spec.protocol.name} Protocol
//!
//! This file is auto-generated. Do not edit manually.`);

    // Generate test module
    lines.push(`#[cfg(test)]
mod tests {
    use super::*;
    
${this.generateUnitTests(spec)}
    
${this.generatePropertyTests(spec)}
}`);

    let code = lines.join('\n\n');

    // Apply Rust-specific idioms
    if (profile.idioms.length > 0) {
      const result = applyIdioms(code, profile.idioms, {
        language: 'rust',
        protocolName: spec.protocol.name
      });
      code = result.code;
    }

    // CRITICAL: Format code to remove non-breaking spaces and ensure proper formatting
    code = formatCode(code, { language: 'rust', indentSize: 4 });

    return code;
  }

  /**
   * Generate unit tests
   */
  private generateUnitTests(spec: ProtocolSpec): string {
    const tests: string[] = [];

    for (const messageType of spec.messageTypes) {
      tests.push(this.generateUnitTest(spec, messageType));
    }

    return tests.join('\n    \n');
  }

  /**
   * Generate a unit test for a message type
   */
  private generateUnitTest(spec: ProtocolSpec, messageType: any): string {
    const testName = `test_${toSnakeCase(messageType.name)}_example`;
    const structName = messageType.name;

    // Generate example message
    const exampleFields = this.generateExampleFields(messageType);

    return `    #[test]
    fn ${testName}() {
        let parser = ${spec.protocol.name}Parser::new();
        let serializer = ${spec.protocol.name}Serializer::new();
        
        // Create example message
        let message = ${structName} {
${exampleFields}
        };
        
        // Serialize
        let serialized = serializer.serialize_${toSnakeCase(messageType.name)}(&message)
            .expect("Serialization should succeed");
        
        // Parse
        let parsed = parser.parse_${toSnakeCase(messageType.name)}(&serialized)
            .expect("Parsing should succeed");
        
        // Verify equivalence
        assert_eq!(message, parsed);
    }`;
  }

  /**
   * Generate example fields for a message
   */
  private generateExampleFields(messageType: any): string {
    const fields: string[] = [];

    for (const field of messageType.fields) {
      const fieldName = toSnakeCase(field.name);
      const value = this.getExampleValue(field.type);

      fields.push(`            ${fieldName}: ${value},`);
    }

    return fields.join('\n');
  }

  /**
   * Get example value for a field type
   */
  private getExampleValue(type: string): string {
    switch (type) {
      case 'string':
        return '"example".to_string()';
      case 'integer':
        return '42';
      case 'number':
        return '3.14';
      case 'boolean':
        return 'true';
      default:
        return '"example".to_string()';
    }
  }

  /**
   * Generate property-based tests
   */
  private generatePropertyTests(spec: ProtocolSpec): string {
    const tests: string[] = [];

    // Add proptest import comment
    tests.push(`    // Property-based tests using proptest
    // Uncomment and add proptest dependency to Cargo.toml to enable
    /*
    use proptest::prelude::*;
    `);

    for (const messageType of spec.messageTypes) {
      tests.push(this.generatePropertyTest(spec, messageType));
    }

    tests.push(`    */`);

    return tests.join('\n    \n');
  }

  /**
   * Generate a property-based test for a message type
   */
  private generatePropertyTest(spec: ProtocolSpec, messageType: any): string {
    const testName = `test_${toSnakeCase(messageType.name)}_round_trip`;
    const structName = messageType.name;

    // Generate proptest strategy
    const strategy = this.generatePropTestStrategy(messageType);

    return `    proptest! {
        /// Feature: prm-phase-2, Property 13: Multi-Language Code Generation (Rust)
        /// For any valid ${structName}, serialize then parse should produce equivalent message
        #[test]
        fn ${testName}(${strategy}) {
            let parser = ${spec.protocol.name}Parser::new();
            let serializer = ${spec.protocol.name}Serializer::new();
            
            let message = ${structName} {
${this.generateStrategyFields(messageType)}
            };
            
            // Serialize
            let serialized = serializer.serialize_${toSnakeCase(messageType.name)}(&message)?;
            
            // Parse
            let parsed = parser.parse_${toSnakeCase(messageType.name)}(&serialized)?;
            
            // Verify equivalence
            prop_assert_eq!(message, parsed);
        }
    }`;
  }

  /**
   * Generate proptest strategy for a message type
   */
  private generatePropTestStrategy(messageType: any): string {
    const strategies: string[] = [];

    for (const field of messageType.fields) {
      const fieldName = toSnakeCase(field.name);
      const strategy = this.getFieldStrategy(field);
      strategies.push(`${fieldName} in ${strategy}`);
    }

    return strategies.join(', ');
  }

  /**
   * Get proptest strategy for a field
   */
  private getFieldStrategy(field: any): string {
    switch (field.type) {
      case 'string':
        return '"[a-zA-Z0-9]{1,100}"';
      case 'integer':
        return '0i32..65535i32';
      case 'number':
        return '0.0f64..1000.0f64';
      case 'boolean':
        return 'any::<bool>()';
      default:
        return '"[a-zA-Z0-9]{1,100}"';
    }
  }

  /**
   * Generate strategy fields for struct construction
   */
  private generateStrategyFields(messageType: any): string {
    const fields: string[] = [];

    for (const field of messageType.fields) {
      const fieldName = toSnakeCase(field.name);

      if (field.type === 'string') {
        fields.push(`                ${fieldName}: ${fieldName}.to_string(),`);
      } else {
        fields.push(`                ${fieldName},`);
      }
    }

    return fields.join('\n');
  }
}

/**
 * Complete Rust Generator
 * 
 * Implements the LanguageGenerator interface for Rust
 */
export class RustGenerator implements LanguageGenerator {
  private parserGen: RustParserGenerator;
  private serializerGen: RustSerializerGenerator;
  private clientGen: RustClientGenerator;
  private testGen: RustTestGenerator;

  constructor() {
    this.parserGen = new RustParserGenerator();
    this.serializerGen = new RustSerializerGenerator();
    this.clientGen = new RustClientGenerator();
    this.testGen = new RustTestGenerator();
  }

  /**
   * Generate all Rust artifacts for a protocol
   * 
   * @param spec - Protocol specification
   * @param profile - Language profile with Rust idioms
   * @returns Generated artifacts
   */
  async generate(spec: ProtocolSpec, profile: LanguageProfile): Promise<LanguageArtifacts> {
    const startTime = Date.now();

    // Generate all artifacts
    const parser = this.parserGen.generate(spec, profile);
    const serializer = this.serializerGen.generate(spec, profile);
    const client = this.clientGen.generate(spec, profile);
    const tests = this.testGen.generate(spec, profile);

    // Types are included in parser (structs and enums)
    const types = '// Types are defined in parser file (structs and enums)';

    const endTime = Date.now();

    return {
      language: 'rust',
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
