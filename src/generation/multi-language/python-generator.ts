/**
 * Python Code Generator
 * 
 * Generates idiomatic Python code for protocol implementations.
 * Applies Python-specific patterns, naming conventions, and error handling.
 */

import type { ProtocolSpec } from '../../types/protocol-spec.js';
import type { LanguageProfile } from '../../types/language-target.js';
import type { LanguageGenerator, LanguageArtifacts } from './language-coordinator.js';
import { applyIdioms } from '../../steering/idiom-applier.js';
import { formatCode } from '../../utils/code-formatter.js';
import { EnhancedFormatParser } from '../../core/enhanced-format-parser.js';
import { toPascalCase, toSnakeCase, toKebabCase } from '../../utils/string-utils.js';

/**
 * Python Parser Generator
 * 
 * Generates Python parser code with:
 * - State machine approach for robust parsing
 * - bytes type for data
 * - dataclasses for message types
 * - Docstrings for documentation
 * - snake_case naming convention
 */
export class PythonParserGenerator {
  /**
   * Generate Python parser code
   * 
   * @param spec - Protocol specification
   * @param profile - Language profile with Python idioms
   * @returns Generated parser code
   */
  generate(spec: ProtocolSpec, profile: LanguageProfile): string {
    const lines: string[] = [];

    // Generate module docstring
    lines.push(this.generateModuleDocstring(spec));

    // Generate imports
    lines.push(this.generateImports(spec));

    // Generate dataclasses for message types
    lines.push(this.generateDataclasses(spec));

    // Generate error classes
    lines.push(this.generateErrorClasses(spec));

    // Generate parser class
    lines.push(this.generateParserClass(spec));

    let code = lines.join('\n\n');

    // Apply Python-specific idioms
    if (profile.idioms.length > 0) {
      const result = applyIdioms(code, profile.idioms, {
        language: 'python',
        protocolName: spec.protocol.name
      });
      code = result.code;
    }

    // CRITICAL: Format code to remove non-breaking spaces and ensure proper formatting
    code = formatCode(code, { language: 'python', indentSize: 4 });

    return code;
  }

  /**
   * Generate module docstring
   */
  private generateModuleDocstring(spec: ProtocolSpec): string {
    return `"""
Generated Parser for ${spec.protocol.name} Protocol

RFC: ${spec.protocol.rfc || 'N/A'}
Port: ${spec.protocol.port}

This file is auto-generated. Do not edit manually.
Regenerate using: protocol-resurrection-machine generate ${toKebabCase(spec.protocol.name)}.yaml
"""`;
  }

  /**
   * Generate imports
   */
  private generateImports(_spec: ProtocolSpec): string {
    return `from dataclasses import dataclass
from typing import Optional, Union, List
from enum import Enum
import re
import struct`;
  }

  /**
   * Generate dataclasses for message types
   */
  private generateDataclasses(spec: ProtocolSpec): string {
    const classes: string[] = [];

    for (const messageType of spec.messageTypes) {
      classes.push(this.generateDataclass(messageType));
    }

    return classes.join('\n\n');
  }

  /**
   * Generate a single dataclass
   */
  private generateDataclass(messageType: any): string {
    const className = toPascalCase(messageType.name);

    // Parse format to discover all fields
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
    const validationLogic: string[] = [];

    // Generate fields with blank lines between them
    const fieldArray = Array.from(allFieldNames);
    for (let i = 0; i < fieldArray.length; i++) {
      // Get field definition (explicit or auto-created)
      const fieldName = fieldArray[i]!;
      const field = explicitFields.get(fieldName) || {
        name: fieldName,
        type: { kind: 'string' as const },
        required: parsed.requiredFields.includes(fieldName)
      } as any;
      const pyFieldName = toSnakeCase(field.name);
      const fieldType = this.mapFieldType(field.type);
      const isOptional = !field.required;
      const optional = isOptional ? 'Optional[' + fieldType + '] = None' : fieldType;

      fields.push(`    ${pyFieldName}: ${optional}`);

      // Add blank line between fields for readability
      if (i < fieldArray.length - 1) {
        fields.push('');
      }

      // Generate validation logic
      const access = `self.${pyFieldName}`;

      if (field.required) {
        validationLogic.push(`        if ${access} is None:`);
        validationLogic.push(`            errors.append("Field '${pyFieldName}' is required")`);
      }

      if (field.type.kind === 'string') {
        if (field.validation?.minLength !== undefined) {
          validationLogic.push(`        if ${access} is not None and len(${access}) < ${field.validation.minLength}:`);
          validationLogic.push(`            errors.append(f"Field '${pyFieldName}' must be at least ${field.validation.minLength} characters")`);
        }
        if (field.validation?.maxLength !== undefined) {
          validationLogic.push(`        if ${access} is not None and len(${access}) > ${field.validation.maxLength}:`);
          validationLogic.push(`            errors.append(f"Field '${pyFieldName}' must be at most ${field.validation.maxLength} characters")`);
        }
        if (field.validation?.pattern) {
          validationLogic.push(`        if ${access} is not None and not re.match(r"${field.validation.pattern}", ${access}):`);
          validationLogic.push(`            errors.append(f"Field '${pyFieldName}' must match pattern ${field.validation.pattern}")`);
        }
      } else if (field.type.kind === 'number') {
        if (field.type.min !== undefined) {
          validationLogic.push(`        if ${access} is not None and ${access} < ${field.type.min}:`);
          validationLogic.push(`            errors.append(f"Field '${pyFieldName}' must be at least ${field.type.min}")`);
        }
        if (field.type.max !== undefined) {
          validationLogic.push(`        if ${access} is not None and ${access} > ${field.type.max}:`);
          validationLogic.push(`            errors.append(f"Field '${pyFieldName}' must be at most ${field.type.max}")`);
        }
      }
    }

    const validateMethod = validationLogic.length > 0 ? `
    def validate(self) -> List[str]:
        """Validate message fields"""
        errors = []
${validationLogic.join('\n')}
        return errors` : `
    def validate(self) -> List[str]:
        """Validate message fields"""
        return []`;

    return `@dataclass
class ${className}:
    """
    ${messageType.description || `${className} message`}
    """
${fields.join('\n')}
${validateMethod}`;
  }

  /**
   * Map protocol field type to Python type
   */
  private mapFieldType(type: any): string {
    // Handle discriminated union FieldType
    if (typeof type === 'object' && type !== null) {
      switch (type.kind) {
        case 'string':
          return 'str';
        case 'number':
          return 'float';
        case 'boolean':
          return 'bool';
        case 'bytes':
          return 'bytes';
        case 'enum':
          return 'str';  // Enums are represented as strings in Python
        default:
          return 'str';
      }
    }

    // Fallback for legacy string types
    const typeMap: Record<string, string> = {
      'string': 'str',
      'integer': 'int',
      'number': 'float',
      'boolean': 'bool',
      'bytes': 'bytes'
    };

    return typeMap[type as string] || 'str';
  }

  /**
   * Generate error classes
   */
  private generateErrorClasses(spec: ProtocolSpec): string {
    const protocolName = toPascalCase(spec.protocol.name);

    return `class ${protocolName}Error(Exception):
    """Base exception for ${protocolName} protocol errors"""
    
    def __init__(self, message: str, offset: Optional[int] = None, details: Optional[dict] = None):
        super().__init__(message)
        self.offset = offset
        self.details = details or {}


class ${protocolName}ParseError(${protocolName}Error):
    """Parse error"""
    pass


class ${protocolName}ValidationError(${protocolName}Error):
    """Validation error"""
    pass`;
  }

  /**
   * Generate parser class
   */
  private generateParserClass(spec: ProtocolSpec): string {
    const className = `${toPascalCase(spec.protocol.name)}Parser`;
    const methods: string[] = [];

    // Generate parse methods for each message type
    for (const messageType of spec.messageTypes) {
      methods.push(this.generateParseMethod(spec, messageType));
    }

    return `class ${className}:
    """
    Parser for ${spec.protocol.name} protocol messages
    
    Uses state machine approach for robust parsing
    """
    
    def __init__(self):
        """Initialize parser"""
        pass
    
${methods.join('\n\n')}`;
  }

  /**
   * Generate parse method for a message type
   */
  private generateParseMethod(spec: ProtocolSpec, messageType: any): string {
    const methodName = `parse_${toSnakeCase(messageType.name)}`;
    const className = messageType.name;

    // Parse format string to generate parsing logic
    const parseLogic = this.generateParseLogic(spec, messageType);

    return `    def ${methodName}(self, data: bytes) -> ${className}:
        """
        Parse ${className} message from bytes
        
        Args:
            data: Raw bytes to parse
            
        Returns:
            Parsed ${className} object
            
        Raises:
            ${toPascalCase(spec.protocol.name)}ParseError: If parsing fails
        """
        offset = 0
        fields = {}
        
${parseLogic}
        
        return ${className}(**fields)`;
  }

  /**
   * Generate parsing logic from format string using EnhancedFormatParser
   */
  private generateParseLogic(spec: ProtocolSpec, messageType: any): string {
    const lines: string[] = [];

    const parser = new EnhancedFormatParser();
    const parsed = parser.parse(messageType.format);

    lines.push('        # Zero-copy: work with bytes directly');
    lines.push('        try:');
    lines.push('            offset = 0');
    lines.push('');

    // Track which fields we've extracted
    const extractedFields = new Set<string>();

    // Generate parsing logic for each token
    for (let i = 0; i < parsed.tokens.length; i++) {
      const token = parsed.tokens[i];
      const nextToken = parsed.tokens[i + 1];

      if (!token) continue;

      switch (token.type) {
        case 'fixed':
          // Validate fixed string
          const escapedFixed = this.escapePythonString(token.value);
          lines.push(`            # Validate fixed string: ${JSON.stringify(token.value)}`);
          lines.push(`            expected = b"${escapedFixed}"`);  // ← Add 'b' prefix
          lines.push(`            if not data[offset:offset + len(expected)] == expected:`);  // ← Change text→data
          lines.push(`                raise ${toPascalCase(spec.protocol.name)}ParseError(`);
          lines.push(`                    f"Expected '{expected}' at position {offset}, got '{data[offset:offset+10]}...'",`);  // ← Change text→data
          lines.push(`                    offset=offset`);
          lines.push(`                )`);
          lines.push(`            offset += len(expected)`);
          lines.push('');
          break;

        case 'field':
          // Extract required field
          let field = messageType.fields.find((f: any) => f.name === token.fieldName);
          if (!field) {
            // Auto-create field with default string type if not found
            field = {
              name: token.fieldName!,
              type: { kind: 'string' },
              required: true
            };
          }

          const fieldName = toSnakeCase(token.fieldName!);
          extractedFields.add(token.fieldName!);
          const fieldType = field.type.kind || field.type;

          lines.push(`            # Extract required field: ${token.fieldName}`);

          // BINARY HANDLING
          if (['u8', 'byte', 'i8', 'u16', 'i16', 'u32', 'i32', 'f32', 'float', 'f64', 'double'].includes(fieldType)) {
            if (fieldType === 'u8' || fieldType === 'byte') {
              lines.push(`            if offset + 1 > len(data): raise ${toPascalCase(spec.protocol.name)}ParseError("Unexpected end of data", offset=offset)`);
              lines.push(`            fields['${fieldName}'] = data[offset]`);
              lines.push(`            offset += 1`);
            } else if (fieldType === 'i8') {
              lines.push(`            if offset + 1 > len(data): raise ${toPascalCase(spec.protocol.name)}ParseError("Unexpected end of data", offset=offset)`);
              lines.push(`            fields['${fieldName}'] = struct.unpack('>b', data[offset:offset+1])[0]`);
              lines.push(`            offset += 1`);
            } else if (fieldType === 'u16') {
              lines.push(`            if offset + 2 > len(data): raise ${toPascalCase(spec.protocol.name)}ParseError("Unexpected end of data", offset=offset)`);
              lines.push(`            fields['${fieldName}'] = int.from_bytes(data[offset:offset+2], 'big')`);
              lines.push(`            offset += 2`);
            } else if (fieldType === 'i16') {
              lines.push(`            if offset + 2 > len(data): raise ${toPascalCase(spec.protocol.name)}ParseError("Unexpected end of data", offset=offset)`);
              lines.push(`            fields['${fieldName}'] = int.from_bytes(data[offset:offset+2], 'big', signed=True)`);
              lines.push(`            offset += 2`);
            } else if (fieldType === 'u32') {
              lines.push(`            if offset + 4 > len(data): raise ${toPascalCase(spec.protocol.name)}ParseError("Unexpected end of data", offset=offset)`);
              lines.push(`            fields['${fieldName}'] = int.from_bytes(data[offset:offset+4], 'big')`);
              lines.push(`            offset += 4`);
            } else if (fieldType === 'i32') {
              lines.push(`            if offset + 4 > len(data): raise ${toPascalCase(spec.protocol.name)}ParseError("Unexpected end of data", offset=offset)`);
              lines.push(`            fields['${fieldName}'] = int.from_bytes(data[offset:offset+4], 'big', signed=True)`);
              lines.push(`            offset += 4`);
            } else if (fieldType === 'f32' || fieldType === 'float') {
              lines.push(`            if offset + 4 > len(data): raise ${toPascalCase(spec.protocol.name)}ParseError("Unexpected end of data", offset=offset)`);
              lines.push(`            fields['${fieldName}'] = struct.unpack('>f', data[offset:offset+4])[0]`);
              lines.push(`            offset += 4`);
            } else if (fieldType === 'f64' || fieldType === 'double') {
              lines.push(`            if offset + 8 > len(data): raise ${toPascalCase(spec.protocol.name)}ParseError("Unexpected end of data", offset=offset)`);
              lines.push(`            fields['${fieldName}'] = struct.unpack('>d', data[offset:offset+8])[0]`);
              lines.push(`            offset += 8`);
            }
            lines.push('');
            break; // Done with this field
          }

          // TEXT HANDLING (Original Logic)
          // Determine how to find the end of this field
          if (nextToken) {
            if (nextToken.type === 'fixed') {
              // Next token is fixed string - use it as delimiter
              const delimiter = this.escapePythonString(nextToken.value);
              lines.push(`            # Find delimiter: ${JSON.stringify(nextToken.value)}`);
              lines.push(`            delimiter = b"${delimiter}"`);
              lines.push(`            end = data.find(delimiter, offset)`);
              lines.push(`            if end == -1:`);
              lines.push(`                raise ${toPascalCase(spec.protocol.name)}ParseError(`);
              lines.push(`                    f"Delimiter '{delimiter}' not found for field ${token.fieldName}",`);
              lines.push(`                    offset=offset`);
              lines.push(`                )`);
              lines.push(`            field_value = data[offset:end].decode("utf-8")`);
              lines.push(`            offset = end  # Don't skip delimiter yet, next token will validate it`);
            } else if (nextToken.type === 'optional') {
              // Next token is optional - need to check if it's present
              const optPrefix = this.escapePythonString(nextToken.optionalPrefix || '');
              lines.push(`            # Field ends at optional section or end`);
              lines.push(`            opt_marker = b"${optPrefix}"`);
              lines.push(`            opt_pos = data.find(opt_marker, offset)`);
              lines.push(`            if opt_pos != -1:`);
              lines.push(`                field_value = data[offset:opt_pos].decode("utf-8").rstrip()`);
              lines.push(`                offset = opt_pos`);
              lines.push(`            else:`);
              lines.push(`                field_value = data[offset:].decode("utf-8").rstrip()`);
              lines.push(`                offset = len(data)`);
            }
          } else {
            // Last field - read to end
            lines.push(`            field_value = data[offset:].decode("utf-8").rstrip()`);
            lines.push(`            offset = len(data)`);
          }

          // Type conversion
          lines.push(`            # Convert to ${field.type.kind || field.type}`);
          lines.push(`            try:`);

          switch (fieldType) {
            case 'number':
              lines.push(`                fields['${fieldName}'] = float(field_value)`);
              break;
            case 'integer':
              lines.push(`                fields['${fieldName}'] = int(field_value)`);
              break;
            case 'boolean':
              lines.push(`                fields['${fieldName}'] = field_value.lower() in ('true', '1', 'yes')`);
              break;
            default:
              lines.push(`                fields['${fieldName}'] = field_value`);
          }

          lines.push(`            except ValueError as e:`);
          lines.push(`                raise ${toPascalCase(spec.protocol.name)}ParseError(`);
          lines.push(`                    f"Failed to convert field ${token.fieldName} to ${fieldType}: {str(e)}",`);
          lines.push(`                    offset=offset`);
          lines.push(`                )`);
          lines.push('');
          break;

        case 'optional':
          // Handle optional section
          let optField = messageType.fields.find((f: any) => f.name === token.fieldName);
          if (!optField) {
            // Auto-create field with default string type if not found
            optField = {
              name: token.fieldName!,
              type: { kind: 'string' },
              required: false
            };
          }

          const optFieldName = toSnakeCase(token.fieldName!);
          extractedFields.add(token.fieldName!);

          const optPrefix = this.escapePythonString(token.optionalPrefix || '');
          const optSuffix = this.escapePythonString(token.optionalSuffix || '');

          lines.push(`            # Optional field: ${token.fieldName}`);
          lines.push(`            if offset < len(data) and data[offset:].decode("utf-8").startswith("${optPrefix}"):`);
          lines.push(`                offset += ${token.optionalPrefix?.length || 0}  # Skip prefix`);

          // Find the end of the optional value (marked by suffix)
          if (token.optionalSuffix) {
            lines.push(`                # Find suffix: ${JSON.stringify(token.optionalSuffix)}`);
            lines.push(`                suffix = b"${optSuffix}"`);
            lines.push(`                end = data.find(suffix, offset)`);
            lines.push(`                if end == -1:`);
            lines.push(`                    raise ${toPascalCase(spec.protocol.name)}ParseError(`);
            lines.push(`                        f"Unclosed optional section for field ${token.fieldName}",`);
            lines.push(`                        offset=offset`);
            lines.push(`                    )`);
            lines.push(`                opt_value = data[offset:end].decode("utf-8")`);
            lines.push(`                offset = end + len(suffix)`);
          } else {
            // No suffix - read until next delimiter or end
            if (nextToken && nextToken.type === 'fixed') {
              const nextDelim = this.escapePythonString(nextToken.value);
              lines.push(`                delimiter = b"${nextDelim}"`);
              lines.push(`                end = data.find(delimiter, offset)`);
              lines.push(`                if end == -1:`);
              lines.push(`                    opt_value = data[offset:].decode("utf-8")`);
              lines.push(`                    offset = len(data)`);
              lines.push(`                else:`);
              lines.push(`                    opt_value = data[offset:end].decode("utf-8")`);
              lines.push(`                    offset = end`);
            } else {
              lines.push(`                opt_value = data[offset:].decode("utf-8")`);
              lines.push(`                offset = len(data)`);
            }
          }

          // Type conversion for optional field
          lines.push(`                # Convert optional field`);
          lines.push(`                try:`);

          const optFieldType = optField.type.kind || optField.type;
          switch (optFieldType) {
            case 'number':
              lines.push(`                    fields['${optFieldName}'] = float(opt_value)`);
              break;
            case 'integer':
              lines.push(`                    fields['${optFieldName}'] = int(opt_value)`);
              break;
            case 'boolean':
              lines.push(`                    fields['${optFieldName}'] = opt_value.lower() in ('true', '1', 'yes')`);
              break;
            default:
              lines.push(`                    fields['${optFieldName}'] = opt_value`);
          }

          lines.push(`                except ValueError as e:`);
          lines.push(`                    raise ${toPascalCase(spec.protocol.name)}ParseError(`);
          lines.push(`                        f"Failed to convert optional field ${token.fieldName}: {str(e)}",`);
          lines.push(`                        offset=offset`);
          lines.push(`                    )`);
          lines.push(`            else:`);
          lines.push(`                fields['${optFieldName}'] = None`);
          lines.push('');
          break;
      }
    }

    // Set any remaining fields to None if they weren't extracted
    for (const field of messageType.fields) {
      if (!extractedFields.has(field.name)) {
        const fieldName = toSnakeCase(field.name);
        lines.push(`            fields['${fieldName}'] = None  # Not in format string`);
      }
    }

    lines.push(`        except ${toPascalCase(spec.protocol.name)}ParseError:`);
    lines.push('            raise');
    lines.push('        except Exception as e:');
    lines.push(`            raise ${toPascalCase(spec.protocol.name)}ParseError(`);
    lines.push('                f"Failed to parse message: {str(e)}",');
    lines.push('                offset=offset');
    lines.push('            )');

    return lines.join('\n');
  }

  /**
   * Escape string for Python string literal
   */
  private escapePythonString(str: string): string {
    return str
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/\t/g, '\\t');
  }
}

/**
 * Python Serializer Generator
 * 
 * Generates Python serializer code with:
 * - Binary packing
 * - Validation logic
 * - snake_case naming convention
 */
export class PythonSerializerGenerator {
  /**
   * Generate Python serializer code
   * 
   * @param spec - Protocol specification
   * @param profile - Language profile with Python idioms
   * @returns Generated serializer code
   */
  generate(spec: ProtocolSpec, profile: LanguageProfile): string {
    const lines: string[] = [];

    // Generate module docstring
    lines.push(`"""
Generated Serializer for ${spec.protocol.name} Protocol

This file is auto - generated.Do not edit manually.
"""`);

    // Generate imports
    lines.push(`from typing import Optional
from dataclasses import asdict
import struct
from .${toSnakeCase(spec.protocol.name)}_parser import ${toPascalCase(spec.protocol.name)}Error, ${toPascalCase(spec.protocol.name)}ValidationError`);

    // Import message types
    const messageTypes = spec.messageTypes.map(mt => mt.name).join(', ');
    lines.push(`from .${toSnakeCase(spec.protocol.name)}_parser import ${messageTypes}`);

    // Generate serializer class
    lines.push(this.generateSerializerClass(spec));

    let code = lines.join('\n\n');

    // Apply Python-specific idioms
    if (profile.idioms.length > 0) {
      const result = applyIdioms(code, profile.idioms, {
        language: 'python',
        protocolName: spec.protocol.name
      });
      code = result.code;
    }

    // CRITICAL: Format code to remove non-breaking spaces and ensure proper formatting
    code = formatCode(code, { language: 'python', indentSize: 4 });

    return code;
  }

  /**
   * Generate serializer class
   */
  private generateSerializerClass(spec: ProtocolSpec): string {
    const className = `${toPascalCase(spec.protocol.name)}Serializer`;
    const methods: string[] = [];

    // Generate serialize methods for each message type
    for (const messageType of spec.messageTypes) {
      methods.push(this.generateSerializeMethod(spec, messageType));
    }

    return `class ${className}:
    """
    Serializer for ${spec.protocol.name} protocol messages
    """
    
    def __init__(self):
        """Initialize serializer"""
        pass
    
${methods.join('\n\n')}`;
  }

  /**
   * Generate serialize method for a message type
   */
  private generateSerializeMethod(spec: ProtocolSpec, messageType: any): string {
    const methodName = `serialize_${toSnakeCase(messageType.name)}`;
    const className = messageType.name;

    // Generate serialization logic
    const serializeLogic = this.generateSerializeLogic(spec, messageType);

    return `    def ${methodName}(self, message: ${className}) -> bytes:
        """
        Serialize ${className} message to bytes
        
        Args:
            message: ${className} object to serialize
            
        Returns:
            Serialized bytes
            
        Raises:
            ${toPascalCase(spec.protocol.name)}ValidationError: If validation fails
        """
        # Validate message
        self._validate_${toSnakeCase(messageType.name)}(message)
        
        parts = []
        
${serializeLogic}
        
        return b''.join(parts)
    
    def _validate_${toSnakeCase(messageType.name)}(self, message: ${className}) -> None:
        """Validate ${className} message"""
        errors = message.validate()
        if errors:
            raise ${toPascalCase(spec.protocol.name)}ValidationError(f"Validation failed: {', '.join(errors)}")`;
  }

  /**
   * Generate serialization logic from format string
   */
  private generateSerializeLogic(spec: ProtocolSpec, messageType: any): string {
    const lines: string[] = [];
    const parser = new EnhancedFormatParser();
    const parsed = parser.parse(messageType.format);

    lines.push('        # Build bytes parts');
    lines.push('        parts = []');

    for (const token of parsed.tokens) {
      switch (token.type) {
        case 'fixed':
          lines.push(`        parts.append(b"${this.escapePythonString(token.value)}")`);
          break;
        case 'field':
          const fieldName = toSnakeCase(token.fieldName!);
          const field = messageType.fields.find((f: any) => f.name === token.fieldName);
          const fieldType = field ? (field.type.kind || field.type) : 'string';

          lines.push(`        # Add required field: ${token.fieldName}`);

          if (['u8', 'byte', 'i8', 'u16', 'i16', 'u32', 'i32', 'f32', 'float', 'f64', 'double'].includes(fieldType)) {
            if (fieldType === 'u8' || fieldType === 'byte') {
              lines.push(`        parts.append(bytes([message.${fieldName}]))`);
            } else if (fieldType === 'i8') {
              lines.push(`        parts.append(struct.pack('>b', message.${fieldName}))`);
            } else if (fieldType === 'u16') {
              lines.push(`        parts.append(message.${fieldName}.to_bytes(2, 'big'))`);
            } else if (fieldType === 'i16') {
              lines.push(`        parts.append(message.${fieldName}.to_bytes(2, 'big', signed=True))`);
            } else if (fieldType === 'u32') {
              lines.push(`        parts.append(message.${fieldName}.to_bytes(4, 'big'))`);
            } else if (fieldType === 'i32') {
              lines.push(`        parts.append(message.${fieldName}.to_bytes(4, 'big', signed=True))`);
            } else if (fieldType === 'f32' || fieldType === 'float') {
              lines.push(`        parts.append(struct.pack('>f', message.${fieldName}))`);
            } else if (fieldType === 'f64' || fieldType === 'double') {
              lines.push(`        parts.append(struct.pack('>d', message.${fieldName}))`);
            }
          } else {
            // String/Text fallback
            lines.push(`        parts.append(str(message.${fieldName}).encode("utf-8"))`);
          }
          break;

        case 'optional':
          const optFieldName = toSnakeCase(token.fieldName!);
          const optPrefix = this.escapePythonString(token.optionalPrefix || '');
          const optSuffix = this.escapePythonString(token.optionalSuffix || '');

          lines.push(`        # Add optional field: ${token.fieldName}`);
          lines.push(`        if message.${optFieldName} is not None:`);
          lines.push(`            parts.append(b"${optPrefix}")`);
          lines.push(`            parts.append(str(message.${optFieldName}).encode("utf-8"))`);
          if (token.optionalSuffix) {
            lines.push(`            parts.append(b"${optSuffix}")`);
          }
          break;
      }
    }

    return lines.join('\n');
  }

  /**
   * Escape string for Python string literal
   */
  private escapePythonString(str: string): string {
    return str
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/\t/g, '\\t');
  }
}

/**
 * Python Client Generator
 * 
 * Generates Python client code with:
 * - async/await for async operations
 * - Connection pooling
 * - Exception subclasses for errors
 * - snake_case naming convention
 */
export class PythonClientGenerator {
  /**
   * Generate Python client code
   * 
   * @param spec - Protocol specification
   * @param profile - Language profile with Python idioms
   * @returns Generated client code
   */
  generate(spec: ProtocolSpec, profile: LanguageProfile): string {
    const lines: string[] = [];

    // Generate module docstring
    lines.push(`"""
Generated Client for ${spec.protocol.name} Protocol

This file is auto-generated. Do not edit manually.
"""`);

    // Generate imports
    lines.push(`import asyncio
from typing import Optional, Tuple
from .${toSnakeCase(spec.protocol.name)}_parser import ${toPascalCase(spec.protocol.name)}Parser, ${toPascalCase(spec.protocol.name)}Error
from .${toSnakeCase(spec.protocol.name)}_serializer import ${toPascalCase(spec.protocol.name)}Serializer`);

    // Import message types
    const messageTypes = spec.messageTypes.map(mt => mt.name).join(', ');
    lines.push(`from .${toSnakeCase(spec.protocol.name)}_parser import ${messageTypes}`);

    // Generate exception classes
    lines.push(this.generateExceptionClasses(spec));

    // Generate connection pool
    lines.push(this.generateConnectionPool(spec));

    // Generate client class
    lines.push(this.generateClientClass(spec));

    let code = lines.join('\n\n');

    // Apply Python-specific idioms
    if (profile.idioms.length > 0) {
      const result = applyIdioms(code, profile.idioms, {
        language: 'python',
        protocolName: spec.protocol.name
      });
      code = result.code;
    }

    // CRITICAL: Format code to remove non-breaking spaces and ensure proper formatting
    code = formatCode(code, { language: 'python', indentSize: 4 });

    return code;
  }

  /**
   * Generate exception classes
   */
  private generateExceptionClasses(spec: ProtocolSpec): string {
    const protocolName = toPascalCase(spec.protocol.name);

    return `class ${protocolName}ConnectionError(${protocolName}Error):
    """Connection error"""
    pass


class ${protocolName}TimeoutError(${protocolName}Error):
    """Timeout error"""
    pass`;
  }

  /**
   * Generate connection pool
   */
  private generateConnectionPool(spec: ProtocolSpec): string {
    const className = `${toPascalCase(spec.protocol.name)}ConnectionPool`;

    return `class ${className}:
    """Connection pool for managing ${spec.protocol.name} connections"""
    
    def __init__(self, max_connections: int = 10):
        """
        Initialize connection pool
        
        Args:
            max_connections: Maximum number of connections
        """
        self.max_connections = max_connections
        self.connections = {}
    
    async def get_connection(
        self,
        host: str,
        port: int = ${spec.protocol.port}
    ) -> Tuple[asyncio.StreamReader, asyncio.StreamWriter]:
        """
        Get or create a connection
        
        Args:
            host: Server hostname
            port: Server port
            
        Returns:
            Tuple of (reader, writer)
            
        Raises:
            ${toPascalCase(spec.protocol.name)}ConnectionError: If connection fails
            ${toPascalCase(spec.protocol.name)}TimeoutError: If connection times out
        """
        key = f"{host}:{port}"
        
        # Check for existing connection
        if key in self.connections:
            reader, writer = self.connections[key]
            if not writer.is_closing():
                return reader, writer
        
        # Create new connection
        try:
            reader, writer = await asyncio.wait_for(
                asyncio.open_connection(host, port),
                timeout=30.0
            )
            self.connections[key] = (reader, writer)
            return reader, writer
        except asyncio.TimeoutError:
            raise ${toPascalCase(spec.protocol.name)}TimeoutError(f"Connection timeout to {host}:{port}")
        except Exception as e:
            raise ${toPascalCase(spec.protocol.name)}ConnectionError(f"Connection failed: {str(e)}")
    
    def close_connection(self, host: str, port: int = ${spec.protocol.port}) -> None:
        """Close a connection"""
        key = f"{host}:{port}"
        if key in self.connections:
            _, writer = self.connections[key]
            writer.close()
            del self.connections[key]
    
    def close_all(self) -> None:
        """Close all connections"""
        for _, writer in self.connections.values():
            writer.close()
        self.connections.clear()`;
  }

  /**
   * Generate client class
   */
  private generateClientClass(spec: ProtocolSpec): string {
    const className = `${toPascalCase(spec.protocol.name)}Client`;
    const methods: string[] = [];

    // Generate methods for each message type
    for (const messageType of spec.messageTypes) {
      if (messageType.direction === 'request' || messageType.direction === 'bidirectional') {
        methods.push(this.generateClientMethod(spec, messageType));
      }
    }

    return `class ${className}:
    """
    Client for ${spec.protocol.name} protocol
    
    Provides async methods for protocol operations
    """
    
    def __init__(self):
        """Initialize client"""
        self.parser = ${toPascalCase(spec.protocol.name)}Parser()
        self.serializer = ${toPascalCase(spec.protocol.name)}Serializer()
        self.pool = ${toPascalCase(spec.protocol.name)}ConnectionPool()
        self.default_timeout = 30.0
    
    def set_timeout(self, timeout: float) -> None:
        """
        Set default timeout for operations
        
        Args:
            timeout: Timeout in seconds
        """
        self.default_timeout = timeout
    
    async def connect(self, host: str, port: int = ${spec.protocol.port}) -> None:
        """
        Connect to a ${spec.protocol.name} server
        
        Args:
            host: Server hostname
            port: Server port
        """
        await self.pool.get_connection(host, port)
    
    def disconnect(self, host: str, port: int = ${spec.protocol.port}) -> None:
        """Disconnect from a server"""
        self.pool.close_connection(host, port)
    
    def close(self) -> None:
        """Close all connections"""
        self.pool.close_all()
    
${methods.join('\n\n')}`;
  }

  /**
   * Generate client method for a message type
   */
  private generateClientMethod(spec: ProtocolSpec, messageType: any): string {
    const methodName = toSnakeCase(messageType.name);
    const className = messageType.name;

    return `    async def ${methodName}(
        self,
        host: str,
        message: ${className},
        port: int = ${spec.protocol.port}
    ) -> bytes:
        """
        Send a ${className} message
        
        Args:
            host: Server hostname
            port: Server port
            message: Message to send
            
        Returns:
            Response bytes
            
        Raises:
            ${toPascalCase(spec.protocol.name)}Error: If operation fails
        """
        # Get connection
        reader, writer = await self.pool.get_connection(host, port)
        
        # Serialize message
        data = self.serializer.serialize_${toSnakeCase(messageType.name)}(message)
        
        # Send message
        writer.write(data)
        await writer.drain()
        
        # Read response
        try:
            response = await asyncio.wait_for(
                reader.read(4096),
                timeout=self.default_timeout
            )
            return response
        except asyncio.TimeoutError:
            raise ${toPascalCase(spec.protocol.name)}TimeoutError(f"${className} request timeout")`;
  }
}

/**
 * Python Test Generator
 * 
 * Generates Python tests with:
 * - Property-based tests using hypothesis
 * - Unit tests with pytest
 * - 100+ iterations per property
 * - Property tag comments
 */
export class PythonTestGenerator {
  /**
   * Generate Python test code
   * 
   * @param spec - Protocol specification
   * @param profile - Language profile with Python idioms
   * @returns Generated test code
   */
  generate(spec: ProtocolSpec, profile: LanguageProfile): string {
    const lines: string[] = [];

    // Generate module docstring
    lines.push(`"""
Generated Tests for ${spec.protocol.name} Protocol

This file is auto - generated.Do not edit manually.
"""`);

    // Generate imports
    lines.push(`import pytest
from hypothesis import given, strategies as st
from .${toSnakeCase(spec.protocol.name)}_parser import ${toPascalCase(spec.protocol.name)}Parser
from .${toSnakeCase(spec.protocol.name)}_serializer import ${toPascalCase(spec.protocol.name)}Serializer`);

    // Import message types
    const messageTypes = spec.messageTypes.map(mt => mt.name).join(', ');
    lines.push(`from .${toSnakeCase(spec.protocol.name)}_parser import ${messageTypes}`);

    // Generate property-based tests
    lines.push(this.generatePropertyTests(spec));

    // Generate unit tests
    lines.push(this.generateUnitTests(spec));

    let code = lines.join('\n\n');

    // Apply Python-specific idioms
    if (profile.idioms.length > 0) {
      const result = applyIdioms(code, profile.idioms, {
        language: 'python',
        protocolName: spec.protocol.name
      });
      code = result.code;
    }

    // CRITICAL: Format code to remove non-breaking spaces and ensure proper formatting
    code = formatCode(code, { language: 'python', indentSize: 4 });

    return code;
  }

  /**
   * Generate property-based tests
   */
  private generatePropertyTests(spec: ProtocolSpec): string {
    const tests: string[] = [];

    tests.push(`# Property-Based Tests

class TestPropertyBased:
    """Property-based tests using hypothesis"""
    
    def setup_method(self):
        """Setup test fixtures"""
        self.parser = ${toPascalCase(spec.protocol.name)}Parser()
        self.serializer = ${toPascalCase(spec.protocol.name)}Serializer()`);

    // Generate round-trip test for each message type
    for (const messageType of spec.messageTypes) {
      tests.push(this.generateRoundTripTest(spec, messageType));
    }

    return tests.join('\n\n');
  }

  /**
   * Generate round-trip property test
   */
  private generateRoundTripTest(_spec: ProtocolSpec, messageType: any): string {
    const methodName = `test_${toSnakeCase(messageType.name)}_round_trip`;
    const className = messageType.name;

    // Generate hypothesis strategy
    const strategy = this.generateHypothesisStrategy(messageType);

    return `    @given(${strategy})
    def ${methodName}(self, message):
        """
        Feature: prm-phase-2, Property 13: Multi-Language Code Generation (Python)
        For any valid ${className}, serialize then parse should produce equivalent message
        """
        # Serialize
        serialized = self.serializer.serialize_${toSnakeCase(messageType.name)}(message)
        
        # Parse
        parsed = self.parser.parse_${toSnakeCase(messageType.name)}(serialized)
        
        # Verify equivalence
        assert parsed == message`;
  }

  /**
   * Generate hypothesis strategy for a message type
   */
  private generateHypothesisStrategy(messageType: any): string {
    const strategies: string[] = [];

    for (const field of messageType.fields) {
      const fieldName = toSnakeCase(field.name);
      const strategy = this.getFieldStrategy(field);
      strategies.push(`${fieldName}=${strategy}`);
    }

    return `st.builds(${messageType.name}, ${strategies.join(', ')})`;
  }

  /**
   * Get hypothesis strategy for a field
   */
  private getFieldStrategy(field: any): string {
    switch (field.type) {
      case 'string':
        return 'st.text(min_size=1, max_size=100)';
      case 'integer':
        return 'st.integers(min_value=0, max_value=65535)';
      case 'number':
        return 'st.floats(min_value=0.0, max_value=1000.0)';
      case 'boolean':
        return 'st.booleans()';
      default:
        return 'st.text()';
    }
  }

  /**
   * Generate unit tests
   */
  private generateUnitTests(spec: ProtocolSpec): string {
    const tests: string[] = [];

    tests.push(`# Unit Tests

class TestUnitTests:
    """Unit tests for specific examples"""
    
    def setup_method(self):
        """Setup test fixtures"""
        self.parser = ${toPascalCase(spec.protocol.name)}Parser()
        self.serializer = ${toPascalCase(spec.protocol.name)}Serializer()`);

    // Generate example test for each message type
    for (const messageType of spec.messageTypes) {
      tests.push(this.generateExampleTest(messageType));
    }

    return tests.join('\n\n');
  }

  /**
   * Generate example unit test
   */
  private generateExampleTest(messageType: any): string {
    const methodName = `test_${toSnakeCase(messageType.name)}_example`;
    const className = messageType.name;

    // Generate example message
    const exampleFields = messageType.fields.map((f: any) => {
      const fieldName = toSnakeCase(f.name);
      const value = this.getExampleValue(f.type);
      return `${fieldName}=${value}`;
    }).join(', ');

    return `    def ${methodName}(self):
        """Test ${className} with example data"""
        # Create example message
        message = ${className}(${exampleFields})
        
        # Serialize
        serialized = self.serializer.serialize_${toSnakeCase(messageType.name)}(message)
        
        # Parse
        parsed = self.parser.parse_${toSnakeCase(messageType.name)}(serialized)
        
        # Verify
        assert parsed == message`;
  }

  /**
   * Get example value for a field type
   */
  private getExampleValue(type: string): string {
    switch (type) {
      case 'string':
        return '"example"';
      case 'integer':
        return '42';
      case 'number':
        return '3.14';
      case 'boolean':
        return 'True';
      default:
        return '"example"';
    }
  }


}

/**
 * Complete Python Generator
 * 
 * Implements the LanguageGenerator interface for Python
 */
export class PythonGenerator implements LanguageGenerator {
  private parserGen: PythonParserGenerator;
  private serializerGen: PythonSerializerGenerator;
  private clientGen: PythonClientGenerator;
  private testGen: PythonTestGenerator;

  constructor() {
    this.parserGen = new PythonParserGenerator();
    this.serializerGen = new PythonSerializerGenerator();
    this.clientGen = new PythonClientGenerator();
    this.testGen = new PythonTestGenerator();
  }

  /**
   * Generate all Python artifacts for a protocol
   * 
   * @param spec - Protocol specification
   * @param profile - Language profile with Python idioms
   * @returns Generated artifacts
   */
  async generate(spec: ProtocolSpec, profile: LanguageProfile): Promise<LanguageArtifacts> {
    const startTime = Date.now();

    // Generate all artifacts
    const parser = this.parserGen.generate(spec, profile);
    const serializer = this.serializerGen.generate(spec, profile);
    const client = this.clientGen.generate(spec, profile);
    const tests = this.testGen.generate(spec, profile);

    // Types are included in parser (dataclasses)
    const types = '# Types are defined in parser file (dataclasses)';

    const endTime = Date.now();

    return {
      language: 'python',
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
