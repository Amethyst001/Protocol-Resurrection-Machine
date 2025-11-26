/**
 * YAML Protocol Specification Validator
 * Validates protocol specifications against JSON Schema and performs semantic validation
 */

import Ajv, { type ErrorObject } from 'ajv';
import type { ProtocolSpec } from '../types/protocol-spec.js';
import type { ValidationResult, ValidationError } from '../types/results.js';
import protocolSchema from './protocol-schema.json' assert { type: 'json' };
import { FormatParser } from './format-parser.js';

/**
 * Validator for protocol specifications
 */
export class ProtocolValidator {
  private ajv: Ajv;
  private formatParser: FormatParser;

  constructor() {
    this.ajv = new Ajv({
      allErrors: true, // Collect all errors, not just the first one
      verbose: true, // Include schema and data in errors
      strict: false, // Allow unknown keywords
    });

    // Compile the schema
    this.ajv.addSchema(protocolSchema, 'protocol-spec');

    this.formatParser = new FormatParser();
  }

  /**
   * Validate a protocol specification against the JSON schema
   * @param data - Raw YAML data (parsed to JavaScript object)
   * @returns Validation result with errors
   */
  validateSchema(data: unknown): ValidationResult {
    const validate = this.ajv.getSchema('protocol-spec');

    if (!validate) {
      throw new Error('Protocol schema not found');
    }

    const valid = validate(data);
    const errors: ValidationError[] = [];

    if (!valid && validate.errors) {
      // Convert ajv errors to our ValidationError format
      for (const error of validate.errors) {
        errors.push(this.convertAjvError(error));
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Perform semantic validation on a parsed protocol specification
   * This checks for logical errors that can't be caught by JSON schema alone
   * @param spec - Parsed protocol specification
   * @returns Validation result with errors
   */
  validateSemantics(spec: ProtocolSpec): ValidationResult {
    const errors: ValidationError[] = [];

    // Validate protocol metadata
    this.validateProtocolMetadata(spec, errors);

    // Validate message types
    this.validateMessageTypes(spec, errors);

    // Validate type definitions
    if (spec.types) {
      this.validateTypeDefinitions(spec, errors);
    }

    // Validate error handling
    if (spec.errorHandling) {
      this.validateErrorHandling(spec, errors);
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Perform complete validation (schema + semantics)
   * @param data - Raw YAML data
   * @param spec - Parsed protocol specification
   * @returns Validation result with all errors
   */
  validate(data: unknown, spec: ProtocolSpec): ValidationResult {
    const schemaResult = this.validateSchema(data);
    const semanticResult = this.validateSemantics(spec);

    return {
      valid: schemaResult.valid && semanticResult.valid,
      errors: [...schemaResult.errors, ...semanticResult.errors],
    };
  }

  /**
   * Convert ajv error to our ValidationError format
   */
  private convertAjvError(error: ErrorObject): ValidationError {
    const fieldPath = error.instancePath.replace(/^\//, '').replace(/\//g, '.');
    let message = error.message || 'Validation error';
    let suggestion: string | undefined;

    // Provide more helpful error messages and suggestions
    switch (error.keyword) {
      case 'required':
        message = `Missing required field: ${error.params.missingProperty}`;
        suggestion = `Add the "${error.params.missingProperty}" field to ${fieldPath || 'the root object'}`;
        break;

      case 'type':
        message = `Invalid type for field "${fieldPath}": expected ${error.params.type}`;
        suggestion = `Change the value to a ${error.params.type}`;
        break;

      case 'enum':
        message = `Invalid value for field "${fieldPath}": must be one of ${error.params.allowedValues.join(', ')}`;
        suggestion = `Use one of the allowed values: ${error.params.allowedValues.join(', ')}`;
        break;

      case 'minimum':
        message = `Value for field "${fieldPath}" is too small: must be >= ${error.params.limit}`;
        suggestion = `Increase the value to at least ${error.params.limit}`;
        break;

      case 'maximum':
        message = `Value for field "${fieldPath}" is too large: must be <= ${error.params.limit}`;
        suggestion = `Decrease the value to at most ${error.params.limit}`;
        break;

      case 'minLength':
        message = `Value for field "${fieldPath}" is too short: must be at least ${error.params.limit} characters`;
        suggestion = `Provide a longer value (minimum ${error.params.limit} characters)`;
        break;

      case 'minItems':
        message = `Array "${fieldPath}" has too few items: must have at least ${error.params.limit}`;
        suggestion = `Add more items to the array (minimum ${error.params.limit})`;
        break;

      case 'pattern':
        message = `Value for field "${fieldPath}" does not match required pattern`;
        suggestion = `Ensure the value matches the expected format`;
        break;

      case 'additionalProperties':
        message = `Unknown field "${error.params.additionalProperty}" in ${fieldPath || 'root object'}`;
        suggestion = `Remove the "${error.params.additionalProperty}" field or check for typos`;
        break;

      default:
        message = `${fieldPath ? `Field "${fieldPath}": ` : ''}${error.message}`;
    }

    const validationError: ValidationError = {
      type: this.mapAjvKeywordToErrorType(error.keyword),
      message,
    };

    if (fieldPath) {
      validationError.fieldPath = fieldPath;
    }

    const expected = this.getExpectedValue(error);
    if (expected !== undefined) {
      validationError.expected = expected;
    }

    const actual = this.getActualValue(error);
    if (actual !== undefined) {
      validationError.actual = actual;
    }

    if (suggestion !== undefined) {
      validationError.suggestion = suggestion;
    }

    return validationError;
  }

  /**
   * Map ajv error keyword to our error type
   */
  private mapAjvKeywordToErrorType(keyword: string): ValidationError['type'] {
    switch (keyword) {
      case 'required':
        return 'missing_required_field';
      case 'type':
      case 'enum':
        return 'invalid_type';
      case 'minimum':
      case 'maximum':
      case 'minLength':
      case 'maxLength':
      case 'minItems':
        return 'invalid_constraint';
      case 'pattern':
        return 'invalid_format';
      case 'additionalProperties':
        return 'schema_violation';
      default:
        return 'schema_violation';
    }
  }

  /**
   * Get expected value from ajv error
   */
  private getExpectedValue(error: ErrorObject): string | undefined {
    switch (error.keyword) {
      case 'type':
        return error.params.type;
      case 'enum':
        return error.params.allowedValues.join(', ');
      case 'minimum':
      case 'maximum':
        return `${error.keyword === 'minimum' ? '>=' : '<='} ${error.params.limit}`;
      case 'minLength':
      case 'maxLength':
        return `${error.keyword === 'minLength' ? 'at least' : 'at most'} ${error.params.limit} characters`;
      case 'pattern':
        return error.params.pattern;
      default:
        return undefined;
    }
  }

  /**
   * Get actual value from ajv error
   */
  private getActualValue(error: ErrorObject): string | undefined {
    if (error.data !== undefined) {
      if (typeof error.data === 'object') {
        return JSON.stringify(error.data);
      }
      return String(error.data);
    }
    return undefined;
  }

  /**
   * Validate protocol metadata
   */
  private validateProtocolMetadata(spec: ProtocolSpec, errors: ValidationError[]): void {
    // Check port range (should be caught by schema, but double-check)
    if (spec.protocol.port < 1 || spec.protocol.port > 65535) {
      errors.push({
        type: 'invalid_constraint',
        message: 'Port must be between 1 and 65535',
        fieldPath: 'protocol.port',
        expected: '1-65535',
        actual: String(spec.protocol.port),
        suggestion: 'Use a valid port number between 1 and 65535',
      });
    }

    // Check for empty strings (should be caught by schema, but double-check)
    if (spec.protocol.name && !spec.protocol.name.trim()) {
      errors.push({
        type: 'missing_required_field',
        message: 'Protocol name cannot be empty',
        fieldPath: 'protocol.name',
        suggestion: 'Provide a non-empty protocol name',
      });
    }

    if (spec.protocol.description && !spec.protocol.description.trim()) {
      errors.push({
        type: 'missing_required_field',
        message: 'Protocol description cannot be empty',
        fieldPath: 'protocol.description',
        suggestion: 'Provide a non-empty protocol description',
      });
    }
  }

  /**
   * Validate message types
   */
  private validateMessageTypes(spec: ProtocolSpec, errors: ValidationError[]): void {
    if (spec.messageTypes.length === 0) {
      errors.push({
        type: 'missing_required_field',
        message: 'At least one message type is required',
        fieldPath: 'messageTypes',
        suggestion: 'Add at least one message type definition',
      });
      return;
    }

    // Track message type names to check for duplicates
    const messageTypeNames = new Set<string>();

    spec.messageTypes.forEach((msgType, index) => {
      const basePath = `messageTypes[${index}]`;

      // Check for duplicate message type names
      if (messageTypeNames.has(msgType.name)) {
        errors.push({
          type: 'schema_violation',
          message: `Duplicate message type name: "${msgType.name}"`,
          fieldPath: `${basePath}.name`,
          suggestion: `Use a unique name for each message type`,
        });
      }
      messageTypeNames.add(msgType.name);

      // Validate format string
      if (!msgType.format.trim()) {
        errors.push({
          type: 'missing_required_field',
          message: `Message type "${msgType.name}" has empty format string`,
          fieldPath: `${basePath}.format`,
          suggestion: 'Provide a non-empty format string',
        });
      }

      // Validate format string placeholders match fields
      try {
        this.formatParser.validatePlaceholders(msgType.format, msgType.fields, msgType.name);
      } catch (error) {
        errors.push({
          type: 'invalid_placeholder',
          message: error instanceof Error ? error.message : String(error),
          fieldPath: `${basePath}.format`,
          suggestion: 'Ensure all placeholders in the format string reference defined fields',
        });
      }

      // Validate fields
      this.validateFields(msgType.fields, `${basePath}.fields`, msgType.name, spec, errors);
    });
  }

  /**
   * Validate field definitions
   */
  private validateFields(
    fields: ProtocolSpec['messageTypes'][0]['fields'],
    basePath: string,
    messageName: string,
    spec: ProtocolSpec,
    errors: ValidationError[]
  ): void {
    // Track field names to check for duplicates
    const fieldNames = new Set<string>();

    fields.forEach((field, index) => {
      const fieldPath = `${basePath}[${index}]`;

      // Check for duplicate field names
      if (fieldNames.has(field.name)) {
        errors.push({
          type: 'schema_violation',
          message: `Duplicate field name "${field.name}" in message type "${messageName}"`,
          fieldPath: `${fieldPath}.name`,
          suggestion: `Use unique field names within each message type`,
        });
      }
      fieldNames.add(field.name);

      // Validate field type constraints
      if (field.type.kind === 'string' && field.type.maxLength !== undefined) {
        if (field.type.maxLength < 0) {
          errors.push({
            type: 'invalid_constraint',
            message: `Field "${field.name}" has invalid maxLength: must be >= 0`,
            fieldPath: `${fieldPath}.type.maxLength`,
            suggestion: 'Use a non-negative value for maxLength',
          });
        }
      }

      if (field.type.kind === 'number') {
        if (
          field.type.min !== undefined &&
          field.type.max !== undefined &&
          field.type.min > field.type.max
        ) {
          errors.push({
            type: 'invalid_constraint',
            message: `Field "${field.name}" has invalid range: min (${field.type.min}) > max (${field.type.max})`,
            fieldPath: `${fieldPath}.type`,
            suggestion: 'Ensure min is less than or equal to max',
          });
        }
      }

      if (field.type.kind === 'enum') {
        if (field.type.values.length === 0) {
          errors.push({
            type: 'invalid_constraint',
            message: `Enum field "${field.name}" has no values`,
            fieldPath: `${fieldPath}.type.values`,
            suggestion: 'Provide at least one enum value',
          });
        }

        // Check for duplicate enum values
        const enumValues = new Set<string>();
        field.type.values.forEach((value) => {
          if (enumValues.has(value)) {
            errors.push({
              type: 'schema_violation',
              message: `Duplicate enum value "${value}" in field "${field.name}"`,
              fieldPath: `${fieldPath}.type.values`,
              suggestion: 'Use unique values for enum fields',
            });
          }
          enumValues.add(value);
        });

        // Check if enum values reference a defined type
        this.validateEnumValueReferences(field, spec, fieldPath, errors);
      }

      // Validate validation rules
      if (field.validation) {
        this.validateValidationRule(field.validation, field.name, fieldPath, errors);
      }
    });
  }

  /**
   * Validate enum value references against defined types
   */
  private validateEnumValueReferences(
    field: ProtocolSpec['messageTypes'][0]['fields'][0],
    spec: ProtocolSpec,
    fieldPath: string,
    errors: ValidationError[]
  ): void {
    if (field.type.kind !== 'enum' || !spec.types) {
      return;
    }

    // Find if there's a matching enum type definition
    const matchingEnumType = spec.types.find((typeDef) => {
      if (typeDef.kind !== 'enum' || !typeDef.values) {
        return false;
      }

      // Check if all field enum values are in the type definition
      const typeValues = new Set(typeDef.values.map((v) => String(v.value)));
      return field.type.kind === 'enum' && field.type.values.every((v) => typeValues.has(v));
    });

    // If there's a matching type, check if all values are valid
    if (matchingEnumType && matchingEnumType.values) {
      const validValues = new Set(matchingEnumType.values.map((v) => String(v.value)));
      
      if (field.type.kind === 'enum') {
        field.type.values.forEach((value, valueIndex) => {
          if (!validValues.has(value)) {
            errors.push({
              type: 'undefined_reference',
              message: `Enum value "${value}" in field "${field.name}" is not defined in type "${matchingEnumType.name}"`,
              fieldPath: `${fieldPath}.type.values[${valueIndex}]`,
              suggestion: `Use one of the defined values: ${Array.from(validValues).join(', ')}`,
            });
          }
        });
      }
    }
  }

  /**
   * Validate validation rules
   */
  private validateValidationRule(
    rule: NonNullable<ProtocolSpec['messageTypes'][0]['fields'][0]['validation']>,
    fieldName: string,
    fieldPath: string,
    errors: ValidationError[]
  ): void {
    // Validate regex pattern
    if (rule.pattern) {
      try {
        new RegExp(rule.pattern);
      } catch (error) {
        errors.push({
          type: 'invalid_format',
          message: `Field "${fieldName}" has invalid regex pattern: ${error instanceof Error ? error.message : String(error)}`,
          fieldPath: `${fieldPath}.validation.pattern`,
          suggestion: 'Provide a valid regular expression pattern',
        });
      }
    }

    // Validate length constraints
    if (
      rule.minLength !== undefined &&
      rule.maxLength !== undefined &&
      rule.minLength > rule.maxLength
    ) {
      errors.push({
        type: 'invalid_constraint',
        message: `Field "${fieldName}" has invalid length range: minLength (${rule.minLength}) > maxLength (${rule.maxLength})`,
        fieldPath: `${fieldPath}.validation`,
        suggestion: 'Ensure minLength is less than or equal to maxLength',
      });
    }

    // Validate numeric constraints
    if (rule.min !== undefined && rule.max !== undefined && rule.min > rule.max) {
      errors.push({
        type: 'invalid_constraint',
        message: `Field "${fieldName}" has invalid value range: min (${rule.min}) > max (${rule.max})`,
        fieldPath: `${fieldPath}.validation`,
        suggestion: 'Ensure min is less than or equal to max',
      });
    }
  }

  /**
   * Validate type definitions
   */
  private validateTypeDefinitions(spec: ProtocolSpec, errors: ValidationError[]): void {
    if (!spec.types || spec.types.length === 0) {
      return;
    }

    // Track type names to check for duplicates
    const typeNames = new Set<string>();

    spec.types.forEach((typeDef, index) => {
      const basePath = `types[${index}]`;

      // Check for duplicate type names
      if (typeNames.has(typeDef.name)) {
        errors.push({
          type: 'schema_violation',
          message: `Duplicate type name: "${typeDef.name}"`,
          fieldPath: `${basePath}.name`,
          suggestion: 'Use unique names for each type definition',
        });
      }
      typeNames.add(typeDef.name);

      // Validate enum types
      if (typeDef.kind === 'enum') {
        if (!typeDef.values || typeDef.values.length === 0) {
          errors.push({
            type: 'invalid_constraint',
            message: `Enum type "${typeDef.name}" has no values`,
            fieldPath: `${basePath}.values`,
            suggestion: 'Provide at least one enum value',
          });
        } else {
          // Check for duplicate enum values
          const enumValues = new Set<string | number>();
          typeDef.values.forEach((enumValue, enumIndex) => {
            if (enumValues.has(enumValue.value)) {
              errors.push({
                type: 'schema_violation',
                message: `Duplicate enum value "${enumValue.value}" in type "${typeDef.name}"`,
                fieldPath: `${basePath}.values[${enumIndex}]`,
                suggestion: 'Use unique values for enum types',
              });
            }
            enumValues.add(enumValue.value);
          });
        }
      }

      // Validate struct types
      if (typeDef.kind === 'struct') {
        if (!typeDef.fields || typeDef.fields.length === 0) {
          errors.push({
            type: 'invalid_constraint',
            message: `Struct type "${typeDef.name}" has no fields`,
            fieldPath: `${basePath}.fields`,
            suggestion: 'Provide at least one field for struct types',
          });
        } else {
          this.validateFields(typeDef.fields, `${basePath}.fields`, typeDef.name, spec, errors);
        }
      }
    });

    // Check for circular dependencies in struct types
    this.validateCircularDependencies(spec, errors);
  }

  /**
   * Validate for circular dependencies in type definitions
   */
  private validateCircularDependencies(spec: ProtocolSpec, errors: ValidationError[]): void {
    if (!spec.types) {
      return;
    }

    // Build a dependency graph
    const dependencies = new Map<string, Set<string>>();

    spec.types.forEach((typeDef) => {
      if (typeDef.kind === 'struct' && typeDef.fields) {
        const deps = new Set<string>();
        typeDef.fields.forEach((field) => {
          // Check if field type references another custom type
          // This is a simplified check - in a real implementation,
          // we'd need to handle more complex type references
          if (field.type.kind === 'enum') {
            // Check if this enum is a defined type
            const enumType = spec.types?.find(
              (t) => t.kind === 'enum' && t.values?.some((v) => field.type.kind === 'enum' && field.type.values.includes(String(v.value)))
            );
            if (enumType) {
              deps.add(enumType.name);
            }
          }
        });
        dependencies.set(typeDef.name, deps);
      }
    });

    // Check for cycles using DFS
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const hasCycle = (typeName: string, path: string[]): boolean => {
      visited.add(typeName);
      recursionStack.add(typeName);

      const deps = dependencies.get(typeName);
      if (deps) {
        for (const dep of deps) {
          if (!visited.has(dep)) {
            if (hasCycle(dep, [...path, dep])) {
              return true;
            }
          } else if (recursionStack.has(dep)) {
            errors.push({
              type: 'schema_violation',
              message: `Circular dependency detected: ${[...path, dep].join(' -> ')}`,
              fieldPath: `types`,
              suggestion: 'Remove circular dependencies between type definitions',
            });
            return true;
          }
        }
      }

      recursionStack.delete(typeName);
      return false;
    };

    dependencies.forEach((_, typeName) => {
      if (!visited.has(typeName)) {
        hasCycle(typeName, [typeName]);
      }
    });
  }

  /**
   * Validate error handling specification
   */
  private validateErrorHandling(spec: ProtocolSpec, errors: ValidationError[]): void {
    if (!spec.errorHandling) {
      return;
    }

    const basePath = 'errorHandling';

    // Validate retry configuration
    if (spec.errorHandling.onNetworkError === 'retry') {
      if (
        spec.errorHandling.retryAttempts === undefined ||
        spec.errorHandling.retryAttempts < 1
      ) {
        errors.push({
          type: 'invalid_constraint',
          message: 'When onNetworkError is "retry", retryAttempts must be specified and >= 1',
          fieldPath: `${basePath}.retryAttempts`,
          suggestion: 'Set retryAttempts to a positive number (e.g., 3)',
        });
      }

      if (spec.errorHandling.retryDelay === undefined || spec.errorHandling.retryDelay < 0) {
        errors.push({
          type: 'invalid_constraint',
          message: 'When onNetworkError is "retry", retryDelay must be specified and >= 0',
          fieldPath: `${basePath}.retryDelay`,
          suggestion: 'Set retryDelay to a non-negative number in milliseconds (e.g., 1000)',
        });
      }
    }
  }
}
