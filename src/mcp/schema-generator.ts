/**
 * JSON Schema Generator
 * 
 * Generates JSON schemas from protocol message type definitions
 */

import { MessageType, FieldDefinition, FieldType } from '../types/protocol-spec.js';
import { JSONSchema, JSONSchemaProperty } from './types.js';

export class SchemaGenerator {
  /**
   * Generate JSON schema from message type
   */
  generateSchema(messageType: MessageType): JSONSchema {
    const properties: Record<string, JSONSchemaProperty> = {};
    const required: string[] = [];

    // Generate schema for each field
    for (const field of messageType.fields) {
      properties[field.name] = this.generateFieldSchema(field);
      
      if (field.required) {
        required.push(field.name);
      }
    }

    const schema: JSONSchema = {
      type: 'object',
      properties,
      additionalProperties: false
    };

    if (required.length > 0) {
      schema.required = required;
    }

    return schema;
  }

  /**
   * Generate schema for a single field
   */
  private generateFieldSchema(field: FieldDefinition): JSONSchemaProperty {
    const schema = this.generateTypeSchema(field.type);
    
    // Add description if available
    schema.description = this.generateFieldDescription(field);
    
    // Add default value if present
    if (field.defaultValue !== undefined) {
      schema.default = field.defaultValue;
    }

    // Add validation constraints
    if (field.validation) {
      this.applyValidationConstraints(schema, field.validation);
    }

    return schema;
  }

  /**
   * Generate schema for a field type
   */
  private generateTypeSchema(fieldType: FieldType): JSONSchemaProperty {
    switch (fieldType.kind) {
      case 'string':
        return {
          type: 'string',
          ...(fieldType.maxLength !== undefined && { maxLength: fieldType.maxLength })
        };

      case 'number':
        return {
          type: 'number',
          ...(fieldType.min !== undefined && { minimum: fieldType.min }),
          ...(fieldType.max !== undefined && { maximum: fieldType.max })
        };

      case 'enum':
        return {
          type: 'string',
          enum: fieldType.values
        };

      case 'bytes':
        return {
          type: 'string',
          description: 'Base64-encoded bytes',
          ...(fieldType.length !== undefined && { 
            minLength: fieldType.length,
            maxLength: fieldType.length
          })
        };

      case 'boolean':
        return {
          type: 'boolean'
        };

      default:
        // Exhaustive check
        const _exhaustive: never = fieldType;
        throw new Error(`Unknown field type: ${JSON.stringify(_exhaustive as any)}`);
    }
  }

  /**
   * Apply validation constraints to schema
   */
  private applyValidationConstraints(
    schema: JSONSchemaProperty,
    validation: NonNullable<FieldDefinition['validation']>
  ): void {
    if (validation.pattern) {
      schema.pattern = validation.pattern;
    }

    if (validation.minLength !== undefined) {
      schema.minLength = validation.minLength;
    }

    if (validation.maxLength !== undefined) {
      schema.maxLength = validation.maxLength;
    }

    if (validation.min !== undefined) {
      schema.minimum = validation.min;
    }

    if (validation.max !== undefined) {
      schema.maximum = validation.max;
    }
  }

  /**
   * Generate field description
   */
  private generateFieldDescription(field: FieldDefinition): string {
    const parts: string[] = [];

    // Add type information
    parts.push(this.getTypeDescription(field.type));

    // Add requirement status
    if (field.required) {
      parts.push('(required)');
    } else {
      parts.push('(optional)');
    }

    // Add validation info
    if (field.validation) {
      const validationDesc = this.getValidationDescription(field.validation);
      if (validationDesc) {
        parts.push(validationDesc);
      }
    }

    return parts.join(' ');
  }

  /**
   * Get type description
   */
  private getTypeDescription(fieldType: FieldType): string {
    switch (fieldType.kind) {
      case 'string':
        if (fieldType.maxLength !== undefined) {
          return `String (max ${fieldType.maxLength} chars)`;
        }
        return 'String';

      case 'number':
        const constraints: string[] = [];
        if (fieldType.min !== undefined) {
          constraints.push(`min: ${fieldType.min}`);
        }
        if (fieldType.max !== undefined) {
          constraints.push(`max: ${fieldType.max}`);
        }
        return constraints.length > 0 
          ? `Number (${constraints.join(', ')})`
          : 'Number';

      case 'enum':
        return `Enum (${fieldType.values.join(', ')})`;

      case 'bytes':
        if (fieldType.length !== undefined) {
          return `Bytes (${fieldType.length} bytes)`;
        }
        return 'Bytes';

      case 'boolean':
        return 'Boolean';

      default:
        const _exhaustive: never = fieldType;
        return 'Unknown';
    }
  }

  /**
   * Get validation description
   */
  private getValidationDescription(validation: NonNullable<FieldDefinition['validation']>): string {
    const parts: string[] = [];

    if (validation.pattern) {
      parts.push(`pattern: ${validation.pattern}`);
    }

    if (validation.minLength !== undefined) {
      parts.push(`min length: ${validation.minLength}`);
    }

    if (validation.maxLength !== undefined) {
      parts.push(`max length: ${validation.maxLength}`);
    }

    if (validation.min !== undefined) {
      parts.push(`min: ${validation.min}`);
    }

    if (validation.max !== undefined) {
      parts.push(`max: ${validation.max}`);
    }

    return parts.length > 0 ? `[${parts.join(', ')}]` : '';
  }

  /**
   * Validate a JSON schema
   */
  validateSchema(schema: JSONSchema): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check required type field
    if (!schema.type) {
      errors.push('Schema must have a type field');
    }

    // Check properties if type is object
    if (schema.type === 'object') {
      if (!schema.properties) {
        errors.push('Object schema must have properties');
      }

      // Check required fields exist in properties
      if (schema.required) {
        for (const field of schema.required) {
          if (!schema.properties || !(field in schema.properties)) {
            errors.push(`Required field "${field}" not found in properties`);
          }
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}
