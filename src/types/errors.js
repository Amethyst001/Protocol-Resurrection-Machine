/**
 * Error types for Protocol Resurrection Machine
 */
/**
 * Base error class for PRM errors
 */
export class PRMError extends Error {
    type;
    context;
    constructor(message, type, context) {
        super(message);
        this.type = type;
        this.context = context;
        this.name = 'PRMError';
        Object.setPrototypeOf(this, PRMError.prototype);
    }
}
/**
 * YAML parsing error
 */
export class YAMLParseError extends PRMError {
    line;
    column;
    constructor(message, line, column, context) {
        super(message, 'YAMLParseError', { ...context, line, column });
        this.line = line;
        this.column = column;
        this.name = 'YAMLParseError';
        Object.setPrototypeOf(this, YAMLParseError.prototype);
    }
}
/**
 * Validation error
 */
export class ValidationError extends PRMError {
    fieldPath;
    constructor(message, fieldPath, context) {
        super(message, 'ValidationError', { ...context, fieldPath });
        this.fieldPath = fieldPath;
        this.name = 'ValidationError';
        Object.setPrototypeOf(this, ValidationError.prototype);
    }
}
/**
 * Code generation error
 */
export class GenerationError extends PRMError {
    phase;
    artifact;
    constructor(message, phase, artifact, context) {
        super(message, 'GenerationError', { ...context, phase, artifact });
        this.phase = phase;
        this.artifact = artifact;
        this.name = 'GenerationError';
        Object.setPrototypeOf(this, GenerationError.prototype);
    }
}
/**
 * Protocol parse error (for generated parsers)
 */
export class ProtocolParseError extends PRMError {
    offset;
    expected;
    actual;
    constructor(message, offset, expected, actual, context) {
        super(message, 'ProtocolParseError', {
            ...context,
            offset,
            expected,
            actual,
        });
        this.offset = offset;
        this.expected = expected;
        this.actual = actual;
        this.name = 'ProtocolParseError';
        Object.setPrototypeOf(this, ProtocolParseError.prototype);
    }
}
/**
 * Protocol serialize error (for generated serializers)
 */
export class ProtocolSerializeError extends PRMError {
    fieldName;
    constructor(message, fieldName, context) {
        super(message, 'ProtocolSerializeError', { ...context, fieldName });
        this.fieldName = fieldName;
        this.name = 'ProtocolSerializeError';
        Object.setPrototypeOf(this, ProtocolSerializeError.prototype);
    }
}
/**
 * Network error (for generated clients)
 */
export class NetworkError extends PRMError {
    operation;
    connectionState;
    constructor(message, operation, connectionState, context) {
        super(message, 'NetworkError', {
            ...context,
            operation,
            connectionState,
        });
        this.operation = operation;
        this.connectionState = connectionState;
        this.name = 'NetworkError';
        Object.setPrototypeOf(this, NetworkError.prototype);
    }
}
