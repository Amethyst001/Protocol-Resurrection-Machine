/**
 * Result types for validation, parsing, and serialization operations
 */

/**
 * Generic result type for operations that can succeed or fail
 */
export type Result<T, E = Error> = Success<T> | Failure<E>;

/**
 * Successful operation result
 */
export interface Success<T> {
  success: true;
  data: T;
}

/**
 * Failed operation result
 */
export interface Failure<E = Error> {
  success: false;
  error: E;
}

/**
 * YAML validation result
 */
export interface ValidationResult {
  /** Whether validation succeeded */
  valid: boolean;
  /** Validation errors if any */
  errors: ValidationError[];
  /** Validation warnings */
  warnings?: ValidationWarning[];
}

/**
 * Validation error
 */
export interface ValidationError {
  /** Error type */
  type: ValidationErrorType;
  /** Error message */
  message: string;
  /** File path if applicable */
  path?: string;
  /** Line number in file */
  line?: number;
  /** Column number in file */
  column?: number;
  /** Field path in YAML (e.g., "messages.request.format") */
  fieldPath?: string;
  /** Expected value or format */
  expected?: string;
  /** Actual value found */
  actual?: string;
  /** Suggested fix */
  suggestion?: string;
}

/**
 * Validation error types
 */
export type ValidationErrorType =
  | 'missing_required_field'
  | 'invalid_type'
  | 'invalid_format'
  | 'invalid_placeholder'
  | 'undefined_reference'
  | 'invalid_constraint'
  | 'schema_violation';

/**
 * Validation warning
 */
export interface ValidationWarning {
  /** Warning message */
  message: string;
  /** Field path in YAML */
  fieldPath?: string;
  /** Suggestion */
  suggestion?: string;
}

/**
 * Parse result for protocol messages
 */
export interface ParseResult<T = unknown> {
  /** Whether parsing succeeded */
  success: boolean;
  /** Parsed message if successful */
  message?: T;
  /** Parse error if failed */
  error?: ParseError;
  /** Bytes consumed */
  bytesConsumed?: number;
}

/**
 * Parse error
 */
export interface ParseError {
  /** Error message */
  message: string;
  /** Byte offset where error occurred */
  offset: number;
  /** Expected format or value */
  expected: string;
  /** Actual value found */
  actual: string;
  /** Context around error location */
  context?: string;
}

/**
 * Serialize result for protocol messages
 */
export interface SerializeResult {
  /** Whether serialization succeeded */
  success: boolean;
  /** Serialized bytes if successful */
  data?: Uint8Array;
  /** Serialize error if failed */
  error?: SerializeError;
}

/**
 * Serialize error
 */
export interface SerializeError {
  /** Error message */
  message: string;
  /** Field name that caused error */
  fieldName?: string;
  /** Expected field type or format */
  expected?: string;
  /** Actual value provided */
  actual?: unknown;
  /** Validation constraint violated */
  constraint?: string;
}
