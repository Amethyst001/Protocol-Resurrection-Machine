/**
 * Error types for Protocol Resurrection Machine
 */

/**
 * Base error class for PRM errors
 */
export class PRMError extends Error {
  constructor(
    message: string,
    public readonly type: string,
    public readonly context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'PRMError';
    Object.setPrototypeOf(this, PRMError.prototype);
  }
}

/**
 * YAML parsing error
 */
export class YAMLParseError extends PRMError {
  constructor(
    message: string,
    public readonly line?: number,
    public readonly column?: number,
    context?: Record<string, unknown>
  ) {
    super(message, 'YAMLParseError', { ...context, line, column });
    this.name = 'YAMLParseError';
    Object.setPrototypeOf(this, YAMLParseError.prototype);
  }
}

/**
 * Validation error
 */
export class ValidationError extends PRMError {
  constructor(
    message: string,
    public readonly fieldPath?: string,
    context?: Record<string, unknown>
  ) {
    super(message, 'ValidationError', { ...context, fieldPath });
    this.name = 'ValidationError';
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

/**
 * Code generation error
 */
export class GenerationError extends PRMError {
  constructor(
    message: string,
    public readonly phase?: string,
    public readonly artifact?: string,
    context?: Record<string, unknown>
  ) {
    super(message, 'GenerationError', { ...context, phase, artifact });
    this.name = 'GenerationError';
    Object.setPrototypeOf(this, GenerationError.prototype);
  }
}

/**
 * Protocol parse error (for generated parsers)
 */
export class ProtocolParseError extends PRMError {
  constructor(
    message: string,
    public readonly offset: number,
    public readonly expected: string,
    public readonly actual: string,
    context?: Record<string, unknown>
  ) {
    super(message, 'ProtocolParseError', {
      ...context,
      offset,
      expected,
      actual,
    });
    this.name = 'ProtocolParseError';
    Object.setPrototypeOf(this, ProtocolParseError.prototype);
  }
}

/**
 * Protocol serialize error (for generated serializers)
 */
export class ProtocolSerializeError extends PRMError {
  constructor(
    message: string,
    public readonly fieldName?: string,
    context?: Record<string, unknown>
  ) {
    super(message, 'ProtocolSerializeError', { ...context, fieldName });
    this.name = 'ProtocolSerializeError';
    Object.setPrototypeOf(this, ProtocolSerializeError.prototype);
  }
}

/**
 * Network error (for generated clients)
 */
export class NetworkError extends PRMError {
  constructor(
    message: string,
    public readonly operation?: string,
    public readonly connectionState?: string,
    context?: Record<string, unknown>
  ) {
    super(message, 'NetworkError', {
      ...context,
      operation,
      connectionState,
    });
    this.name = 'NetworkError';
    Object.setPrototypeOf(this, NetworkError.prototype);
  }
}
