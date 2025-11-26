/**
 * Generated Serializer for Demo Chat Protocol
 * RFC: demo-chat
 * Port: 8080
 *
 * This file is auto-generated. Do not edit manually.
 * Regenerate using: protocol-resurrection-machine generate demo-chat.yaml
 */

/**
 * Result of a serialize operation
 */
export interface SerializeResult {
  /** Whether serialization succeeded */
  success: boolean;
  /** Serialized data (if successful) */
  data?: Buffer;
  /** Serialize error (if failed) */
  error?: SerializeError;
}

/**
 * Serialize error with detailed information
 */
export interface SerializeError {
  /** Error message */
  message: string;
  /** Field name that caused error */
  field: string;
  /** Reason for error */
  reason: string;
  /** Expected value or format */
  expected?: string;
  /** Actual value provided */
  actual?: string;
}

/**
 * Validation result for pre-serialization checks
 */
export interface ValidationResult {
  /** Whether validation succeeded */
  valid: boolean;
  /** Validation errors if any */
  errors: ValidationError[];
}

/**
 * Validation error
 */
export interface ValidationError {
  /** Field name */
  field: string;
  /** Error message */
  message: string;
  /** Expected value or constraint */
  expected?: string;
  /** Actual value */
  actual?: string;
}

/**
 * Login message
 * Direction: request
 * Format: LOGIN {username}

 */
export interface Login {
  /** username field */
  username: string;
}

/**
 * Message message
 * Direction: bidirectional
 * Format: MSG {content}

 */
export interface Message {
  /** content field */
  content: string;
}

/**
 * Serializer for Login messages
 */
export class LoginSerializer {
  /**
   * Serialize a Login message to a Buffer
   * @param message - Message object to serialize
   * @returns Serialize result with data or error
   */
  serialize(message: Login): SerializeResult {
    try {
      // Validate message before serialization
      const validation = this.validate(message);
      if (!validation.valid) {
        return {
          success: false,
          error: {
            message: validation.errors.map(e => e.message).join('; '),
            field: validation.errors[0]?.field || 'unknown',
            reason: 'validation_failed',
            expected: validation.errors[0]?.expected,
            actual: validation.errors[0]?.actual,
          },
        };
      }

      // Perform serialization
      const result = this.serializeInternal(message);
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: {
          message: errorMessage,
          field: 'unknown',
          reason: 'serialization_error',
        },
      };
    }
  }

  /**
   * Validate a message before serialization
   * @param message - Message object to validate
   * @returns Validation result
   */
  validate(message: Login): ValidationResult {
    const errors: ValidationError[] = [];

    // Validate required field: username
    if (message.username === undefined || message.username === null) {
      errors.push({
        field: 'username',
        message: 'Required field "username" is missing',
        expected: 'non-null value',
        actual: 'undefined',
      });
    }

    // Validate field type: username
    if (message.username !== undefined && message.username !== null) {
      if (typeof message.username !== 'string') {
        errors.push({
          field: 'username',
          message: 'Field "username" must be a string',
          expected: 'string',
          actual: typeof message.username,
        });
      }
    }


    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Internal serialization implementation
   * @param message - Message object to serialize
   * @returns Serialize result
   */
  private serializeInternal(message: Login): SerializeResult {
    let result = '';

    result += "LOGIN ";
    // Add field: username
    result += message.username || '';
    result += "\n";
    result += "\n";

    const data = Buffer.from(result, 'utf-8');

    return {
      success: true,
      data,
    };
  }

  /**
   * Extension point: Custom pre-serialization hook
   * Override this method to add custom processing before serialization
   * @param message - Message to process
   * @returns Processed message
   */
  protected preSerialization(message: Login): Login {
    // Extension point - can be overridden
    return message;
  }
}

/**
 * Serializer for Message messages
 */
export class MessageSerializer {
  /**
   * Serialize a Message message to a Buffer
   * @param message - Message object to serialize
   * @returns Serialize result with data or error
   */
  serialize(message: Message): SerializeResult {
    try {
      // Validate message before serialization
      const validation = this.validate(message);
      if (!validation.valid) {
        return {
          success: false,
          error: {
            message: validation.errors.map(e => e.message).join('; '),
            field: validation.errors[0]?.field || 'unknown',
            reason: 'validation_failed',
            expected: validation.errors[0]?.expected,
            actual: validation.errors[0]?.actual,
          },
        };
      }

      // Perform serialization
      const result = this.serializeInternal(message);
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: {
          message: errorMessage,
          field: 'unknown',
          reason: 'serialization_error',
        },
      };
    }
  }

  /**
   * Validate a message before serialization
   * @param message - Message object to validate
   * @returns Validation result
   */
  validate(message: Message): ValidationResult {
    const errors: ValidationError[] = [];

    // Validate required field: content
    if (message.content === undefined || message.content === null) {
      errors.push({
        field: 'content',
        message: 'Required field "content" is missing',
        expected: 'non-null value',
        actual: 'undefined',
      });
    }

    // Validate field type: content
    if (message.content !== undefined && message.content !== null) {
      if (typeof message.content !== 'string') {
        errors.push({
          field: 'content',
          message: 'Field "content" must be a string',
          expected: 'string',
          actual: typeof message.content,
        });
      }
    }


    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Internal serialization implementation
   * @param message - Message object to serialize
   * @returns Serialize result
   */
  private serializeInternal(message: Message): SerializeResult {
    let result = '';

    result += "MSG ";
    // Add field: content
    result += message.content || '';
    result += "\n";
    result += "\n";

    const data = Buffer.from(result, 'utf-8');

    return {
      success: true,
      data,
    };
  }

  /**
   * Extension point: Custom pre-serialization hook
   * Override this method to add custom processing before serialization
   * @param message - Message to process
   * @returns Processed message
   */
  protected preSerialization(message: Message): Message {
    // Extension point - can be overridden
    return message;
  }
}

/**
 * Main serializer for Demo Chat protocol
 * Provides access to all message type serializers
 */
export class DemoChatSerializer {
  /** Serializer for Login messages */
  public login: LoginSerializer;
  /** Serializer for Message messages */
  public message: MessageSerializer;

  constructor() {
    this.login = new LoginSerializer();
    this.message = new MessageSerializer();
  }
}
