/**
 * Go Code Generator
 * 
 * Generates idiomatic Go code for protocol implementations.
 * Applies Go-specific patterns, naming conventions, and error handling.
 */

import type { ProtocolSpec } from '../../types/protocol-spec.js';
import type { LanguageProfile } from '../../types/language-target.js';
import type { LanguageGenerator, LanguageArtifacts } from './language-coordinator.js';
import { applyIdioms } from '../../steering/idiom-applier.js';
import { formatCode } from '../../utils/code-formatter.js';
import { EnhancedFormatParser } from '../../core/enhanced-format-parser.js';
import { toPascalCase, toSnakeCase } from '../../utils/string-utils.js';

/**
 * Escape delimiter for Go string literal
 */
function escapeDelimiter(delimiter: string): string {
  return delimiter
    .replace(/\r/g, '\\r')
    .replace(/\n/g, '\\n')
    .replace(/\t/g, '\\t')
    .replace(/"/g, '\\"');
}

/**
 * Go Parser Generator
 * 
 * Generates Go parser code with:
 * - State machine approach for robust parsing
 * - []byte type for data
 * - structs for message types
 * - godoc comments for documentation
 * - PascalCase for exports, camelCase for private
 */
export class GoParserGenerator {
  /**
   * Generate Go parser code
   * 
   * @param spec - Protocol specification
   * @param profile - Language profile with Go idioms
   * @returns Generated parser code
   */
  generate(spec: ProtocolSpec, profile: LanguageProfile): string {
    const lines: string[] = [];

    // Generate package declaration
    lines.push(this.generatePackageDeclaration(spec));

    // Generate package documentation
    lines.push(this.generatePackageDocumentation(spec));

    // Generate imports
    lines.push(this.generateImports(spec));

    // Generate structs for message types
    lines.push(this.generateStructs(spec));

    // Generate error types
    lines.push(this.generateErrorTypes(spec));

    // Generate parser struct
    lines.push(this.generateParserStruct(spec));

    let code = lines.join('\n\n');

    // Apply Go-specific idioms
    if (profile.idioms.length > 0) {
      const result = applyIdioms(code, profile.idioms, {
        language: 'go',
        protocolName: spec.protocol.name
      });
      code = result.code;
    }

    // CRITICAL: Format code to remove non-breaking spaces and ensure proper formatting
    code = formatCode(code, { language: 'go', indentSize: 4 });

    return code;
  }

  /**
   * Generate package declaration
   */
  private generatePackageDeclaration(spec: ProtocolSpec): string {
    const packageName = toSnakeCase(spec.protocol.name);
    return `package ${packageName}`;
  }

  /**
   * Generate package documentation
   */
  private generatePackageDocumentation(spec: ProtocolSpec): string {
    return `// Package ${toSnakeCase(spec.protocol.name)} provides a parser for the ${spec.protocol.name} protocol.
//
// RFC: ${spec.protocol.rfc || 'N/A'}
// Port: ${spec.protocol.port}
//
// This file is auto-generated. Do not edit manually.
// Regenerate using: protocol-resurrection-machine generate ${toSnakeCase(spec.protocol.name)}.yaml`;
  }

  /**
   * Generate imports
   */
  private generateImports(_spec: ProtocolSpec): string {
    return `import (
\t"bytes"
\t"errors"
\t"fmt"
\t"strconv"
\t"strings"
)`;
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

      const goFieldName = toPascalCase(field.name);
      const fieldType = this.mapFieldType(field.type, field.optional);
      const jsonTag = toSnakeCase(field.name);

      // Add godoc comment for field
      const comment = field.description || `${goFieldName} field`;
      fields.push(`\t// ${comment}`);
      fields.push(`\t${goFieldName} ${fieldType} \`json:"${jsonTag}" yaml:"${jsonTag}"\``);

      // Add blank line between fields for readability
      if (i < fieldArray.length - 1) {
        fields.push('');
      }
    }

    return `// ${structName} represents a ${messageType.description || structName + ' message'}
type ${structName} struct {
${fields.join('\n')}
}`;
  }

  /**
   * Map protocol field type to Go type
   */
  private mapFieldType(type: any, optional: boolean = false): string {
    let goType: string;

    // Handle discriminated union FieldType
    if (typeof type === 'object' && type !== null) {
      switch (type.kind) {
        case 'string':
          goType = 'string';
          break;
        case 'number':
          goType = 'float64';
          break;
        case 'boolean':
          goType = 'bool';
          break;
        case 'bytes':
          goType = '[]byte';
          break;
        case 'enum':
          goType = 'string';  // Enums are represented as strings in Go
          break;
        default:
          goType = 'string';
      }
    } else {
      // Fallback for legacy string types
      const typeMap: Record<string, string> = {
        'string': 'string',
        'integer': 'int',
        'number': 'float64',
        'boolean': 'bool',
        'bytes': '[]byte'
      };

      goType = typeMap[type as string] || 'string';
    }

    // In Go, we use pointers for optional fields
    return optional ? `*${goType}` : goType;
  }

  /**
   * Generate error types
   */
  private generateErrorTypes(spec: ProtocolSpec): string {
    const protocolName = toPascalCase(spec.protocol.name);

    return `// Standard errors
var (
\tErrInvalidFormat = errors.New("invalid format")
\tErrUnexpectedEOF = errors.New("unexpected EOF")
)

// ${protocolName}Error represents an error in ${protocolName} protocol operations
type ${protocolName}Error struct {
\tMessage string
\tOffset  int
\tDetails map[string]interface{}
}

// Error implements the error interface
func (e *${protocolName}Error) Error() string {
\tif e.Offset >= 0 {
\t\treturn fmt.Sprintf("%s at offset %d", e.Message, e.Offset)
\t}
\treturn e.Message
}

// NewError creates a new ${protocolName}Error
func newError(message string, offset int) error {
\treturn &${protocolName}Error{
\t\tMessage: message,
\t\tOffset:  offset,
\t\tDetails: make(map[string]interface{}),
\t}
}

// ParseError represents a parsing error
type ParseError struct {
\t*${protocolName}Error
}

// ValidationError represents a validation error
type ValidationError struct {
\t*${protocolName}Error
}`;
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

    return `// ${structName} parses ${spec.protocol.name} protocol messages
type ${structName} struct{}

// New${structName} creates a new parser instance
func New${structName}() *${structName} {
\treturn &${structName}{}
}

${methods.join('\n\n')}`;
  }

  /**
   * Generate parse method for a message type
   */
  private generateParseMethod(spec: ProtocolSpec, messageType: any): string {
    const methodName = `Parse${messageType.name}`;
    const structName = messageType.name;

    // Generate parsing logic
    const parseLogic = this.generateParseLogic(spec, messageType);

    return `// ${methodName} parses a ${structName} message from bytes
//
// Returns the parsed message and any error encountered.
// If parsing fails, the error will include the byte offset where parsing failed.
func (p *${toPascalCase(spec.protocol.name)}Parser) ${methodName}(data []byte) (*${structName}, error) {
\toffset := 0
\tmsg := &${structName}{}
\t
${parseLogic}
\t
\treturn msg, nil
}`;
  }

  /**
   * Generate parsing logic from format string
   */
  private generateParseLogic(_spec: ProtocolSpec, messageType: any): string {
    const lines: string[] = [];

    // Parse format using EnhancedFormatParser
    const parser = new EnhancedFormatParser();
    const parsed = parser.parse(messageType.format);

    // Track consumed delimiters to avoid double-validation
    const consumedIndices = new Set<number>();

    // Generate parsing logic for each token
    for (let i = 0; i < parsed.tokens.length; i++) {
      const token = parsed.tokens[i];
      const nextToken = parsed.tokens[i + 1];

      if (!token || consumedIndices.has(i)) continue;

      switch (token.type) {
        case 'fixed': {
          // Validate fixed string using bytes.HasPrefix
          const escapedValue = escapeDelimiter(token.value);
          lines.push(`\t{`); // Start scope
          lines.push(`\t\t// Validate fixed string: ${JSON.stringify(token.value)}`);
          lines.push(`\t\texpected := []byte("${escapedValue}")`);
          lines.push(`\t\tif !bytes.HasPrefix(data[offset:], expected) {`);
          lines.push(`\t\t\treturn nil, newError(fmt.Sprintf("expected '%s' at offset %d", expected, offset), offset)`);
          lines.push(`\t\t}`);
          lines.push(`\t\toffset += len(expected)`);
          lines.push(`\t}`); // End scope
          lines.push('');
          break;
        }

        case 'field': {
          const fieldName = toPascalCase(token.fieldName!);
          lines.push(`\t{`); // Start scope
          lines.push(`\t\t// Extract field: ${token.fieldName}`);

          if (nextToken && nextToken.type === 'fixed') {
            // Extract until next delimiter
            const escapedDelim = escapeDelimiter(nextToken.value);
            lines.push(`\t\tdelimiter := []byte("${escapedDelim}")`);
            lines.push(`\t\tidx := bytes.Index(data[offset:], delimiter)`);
            lines.push(`\t\tif idx == -1 {`);
            lines.push(`\t\t\treturn nil, newError("delimiter not found for field ${token.fieldName}", offset)`);
            lines.push(`\t\t}`);
            lines.push(`\t\tmsg.${fieldName} = string(data[offset:offset+idx])`);
            lines.push(`\t\toffset += idx + len(delimiter)`);
            consumedIndices.add(i + 1); // Mark next token (delimiter) as consumed
          } else {
            // Last field or no delimiter - consume rest
            lines.push(`\t\tmsg.${fieldName} = string(bytes.TrimSpace(data[offset:]))`);
            lines.push(`\t\toffset = len(data)`);
          }
          lines.push(`\t}`); // End scope
          lines.push('');
          break;
        }

        case 'optional': {
          const fieldName = toPascalCase(token.fieldName!);
          lines.push(`\t{`); // Start scope
          lines.push(`\t\t// Extract optional field: ${token.fieldName}`);

          // Check for optional prefix
          if (token.optionalPrefix) {
            const escapedPrefix = escapeDelimiter(token.optionalPrefix);
            lines.push(`\t\toptPrefix := []byte("${escapedPrefix}")`);
            lines.push(`\t\tif bytes.HasPrefix(data[offset:], optPrefix) {`);
            lines.push(`\t\t\toffset += len(optPrefix)`);

            if (token.optionalSuffix) {
              const escapedSuffix = escapeDelimiter(token.optionalSuffix);
              lines.push(`\t\t\toptSuffix := []byte("${escapedSuffix}")`);
              lines.push(`\t\t\tidx := bytes.Index(data[offset:], optSuffix)`);
              lines.push(`\t\t\tif idx >= 0 {`);
              lines.push(`\t\t\t\tval := string(data[offset:offset+idx])`);
              lines.push(`\t\t\t\t msg.${fieldName} = &val`);
              lines.push(`\t\t\t\toffset += idx + len(optSuffix)`);
              lines.push(`\t\t\t}`);
            } else {
              lines.push(`\t\t\tval := string(bytes.TrimSpace(data[offset:]))`);
              lines.push(`\t\t\tmsg.${fieldName} = &val`);
            }
            lines.push(`\t\t}`);
          }
          lines.push(`\t}`); // End scope
          lines.push('');
          break;
        }
      }
    }

    return lines.join('\n');
  }






}


/**
 * Go Serializer Generator
 * 
 * Generates Go serializer code with:
 * - Validation before serialization
 * - Byte slice operations
 * - Structs with validation methods
 * - Go naming conventions
 */
export class GoSerializerGenerator {
  /**
   * Generate Go serializer code
   * 
   * @param spec - Protocol specification
   * @param profile - Language profile with Go idioms
   * @returns Generated serializer code
   */
  generate(spec: ProtocolSpec, profile: LanguageProfile): string {
    const lines: string[] = [];

    // Generate package declaration
    lines.push(`package ${toSnakeCase(spec.protocol.name)}`);

    // Generate package documentation
    lines.push(`// Serializer for ${spec.protocol.name} protocol messages
//
// This file is auto-generated. Do not edit manually.`);

    // Generate imports
    lines.push(`import (
\t"bytes"
\t"fmt"
\t"strconv"
)`);

    // Generate serializer struct
    lines.push(this.generateSerializerStruct(spec));

    let code = lines.join('\n\n');

    // Apply Go-specific idioms
    if (profile.idioms.length > 0) {
      const result = applyIdioms(code, profile.idioms, {
        language: 'go',
        protocolName: spec.protocol.name
      });
      code = result.code;
    }

    // CRITICAL: Format code to remove non-breaking spaces and ensure proper formatting
    code = formatCode(code, { language: 'go', indentSize: 4 });

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

    return `// ${structName} serializes ${spec.protocol.name} protocol messages
type ${structName} struct{}

// New${structName} creates a new serializer instance
func New${structName}() *${structName} {
\treturn &${structName}{}
}

${methods.join('\n\n')}`;
  }

  /**
   * Generate serialize method for a message type
   */
  private generateSerializeMethod(spec: ProtocolSpec, messageType: any): string {
    const methodName = `Serialize${messageType.name}`;
    const structName = messageType.name;

    // Generate serialization logic
    const serializeLogic = this.generateSerializeLogic(messageType);

    return `// ${methodName} serializes a ${structName} message to bytes
//
// Returns the serialized bytes and any error encountered.
// The message is validated before serialization.
func (s *${toPascalCase(spec.protocol.name)}Serializer) ${methodName}(msg *${structName}) ([]byte, error) {
\t// Validate message
\tif err := s.validate${structName}(msg); err != nil {
\t\treturn nil, err
\t}
\t
\t// Serialize
\tvar buf bytes.Buffer
${serializeLogic}
\t
\treturn buf.Bytes(), nil
}`;
  }

  /**
   * Generate serialization logic
   */
  private generateSerializeLogic(messageType: any): string {
    const lines: string[] = [];
    const parser = new EnhancedFormatParser();
    const parsed = parser.parse(messageType.format);

    // Create map of explicit field definitions for type lookup
    const explicitFields = new Map(messageType.fields.map((f: any) => [f.name, f]));

    for (const token of parsed.tokens) {
      if (token.type === 'fixed') {
        // Write fixed string
        const escapedValue = escapeDelimiter(token.value);
        lines.push(`\tbuf.WriteString("${escapedValue}")`);
      } else if (token.type === 'field') {
        // Write variable field
        const fieldName = toPascalCase(token.fieldName!);
        const field = explicitFields.get(token.fieldName!) || { type: 'string' };
        const fieldType = typeof field.type === 'object' ? field.type.kind : field.type;

        lines.push(`\t// Write field: ${token.fieldName}`);
        switch (fieldType) {
          case 'string':
          case 'enum':
            lines.push(`\tbuf.WriteString(msg.${fieldName})`);
            break;
          case 'integer':
          case 'int':
            lines.push(`\tbuf.WriteString(strconv.Itoa(msg.${fieldName}))`);
            break;
          case 'number':
          case 'float':
            lines.push(`\tbuf.WriteString(strconv.FormatFloat(msg.${fieldName}, 'f', -1, 64))`);
            break;
          case 'boolean':
          case 'bool':
            lines.push(`\tbuf.WriteString(strconv.FormatBool(msg.${fieldName}))`);
            break;
          case 'bytes':
            lines.push(`\tbuf.Write(msg.${fieldName})`);
            break;
          default:
            lines.push(`\tbuf.WriteString(fmt.Sprintf("%v", msg.${fieldName}))`);
        }
      } else if (token.type === 'optional') {
        // Write optional field if present
        const fieldName = toPascalCase(token.fieldName!);
        const field = explicitFields.get(token.fieldName!) || { type: 'string' };
        const fieldType = typeof field.type === 'object' ? field.type.kind : field.type;

        lines.push(`\tif msg.${fieldName} != nil {`);
        if (token.optionalPrefix) {
          const escapedPrefix = escapeDelimiter(token.optionalPrefix);
          lines.push(`\t\tbuf.WriteString("${escapedPrefix}")`);
        }

        // Handle value serialization based on type (dereferenced)
        switch (fieldType) {
          case 'string':
          case 'enum':
            lines.push(`\t\tbuf.WriteString(*msg.${fieldName})`);
            break;
          case 'integer':
          case 'int':
            lines.push(`\t\tbuf.WriteString(strconv.Itoa(*msg.${fieldName}))`);
            break;
          case 'number':
          case 'float':
            lines.push(`\t\tbuf.WriteString(strconv.FormatFloat(*msg.${fieldName}, 'f', -1, 64))`);
            break;
          case 'boolean':
          case 'bool':
            lines.push(`\t\tbuf.WriteString(strconv.FormatBool(*msg.${fieldName}))`);
            break;
          case 'bytes':
            lines.push(`\t\tbuf.Write(*msg.${fieldName})`);
            break;
          default:
            lines.push(`\t\tbuf.WriteString(fmt.Sprintf("%v", *msg.${fieldName}))`);
        }

        if (token.optionalSuffix) {
          const escapedSuffix = escapeDelimiter(token.optionalSuffix);
          lines.push(`\t\tbuf.WriteString("${escapedSuffix}")`);
        }
        lines.push(`\t}`);
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
      if (!field.optional) {
        const fieldName = toPascalCase(field.name);

        if (field.type === 'string') {
          validations.push(`\tif msg.${fieldName} == "" {`);
          validations.push(`\t\treturn newError("field ${fieldName} is required", -1)`);
          validations.push(`\t}`);
        }
      }
    }

    const validationLogic = validations.length > 0
      ? validations.join('\n')
      : '\t// No validation required';

    return `// validate${structName} validates a ${structName} message
func (s *${toPascalCase(spec.protocol.name)}Serializer) validate${structName}(msg *${structName}) error {
${validationLogic}
\treturn nil
}`;
  }




}

/**
 * Go Client Generator
 * 
 * Generates Go client code with:
 * - Goroutines for async operations
 * - Connection pooling
 * - Error return values
 * - defer for cleanup
 */
export class GoClientGenerator {
  /**
   * Generate Go client code
   * 
   * @param spec - Protocol specification
   * @param profile - Language profile with Go idioms
   * @returns Generated client code
   */
  generate(spec: ProtocolSpec, profile: LanguageProfile): string {
    const lines: string[] = [];

    // Generate package declaration
    lines.push(`package ${toSnakeCase(spec.protocol.name)}`);

    // Generate package documentation
    lines.push(`// Client for ${spec.protocol.name} protocol
//
// This file is auto-generated. Do not edit manually.`);

    // Generate imports
    lines.push(`import (
\t"context"
\t"fmt"
\t"net"
\t"sync"
\t"time"
)`);

    // Generate error types
    lines.push(this.generateClientErrorTypes(spec));

    // Generate connection pool
    lines.push(this.generateConnectionPool(spec));

    // Generate client struct
    lines.push(this.generateClientStruct(spec));

    let code = lines.join('\n\n');

    // Apply Go-specific idioms
    if (profile.idioms.length > 0) {
      const result = applyIdioms(code, profile.idioms, {
        language: 'go',
        protocolName: spec.protocol.name
      });
      code = result.code;
    }

    // CRITICAL: Format code to remove non-breaking spaces and ensure proper formatting
    code = formatCode(code, { language: 'go', indentSize: 4 });

    return code;
  }

  /**
   * Generate client-specific error types
   */
  private generateClientErrorTypes(spec: ProtocolSpec): string {
    const protocolName = toPascalCase(spec.protocol.name);

    return `// ConnectionError represents a connection error
type ConnectionError struct {
\t*${protocolName}Error
}

// TimeoutError represents a timeout error
type TimeoutError struct {
\t*${protocolName}Error
}

// newConnectionError creates a new connection error
func newConnectionError(message string) error {
\treturn &ConnectionError{
\t\t${protocolName}Error: &${protocolName}Error{
\t\t\tMessage: message,
\t\t\tOffset:  -1,
\t\t\tDetails: make(map[string]interface{}),
\t\t},
\t}
}

// newTimeoutError creates a new timeout error
func newTimeoutError(message string) error {
\treturn &TimeoutError{
\t\t${protocolName}Error: &${protocolName}Error{
\t\t\tMessage: message,
\t\t\tOffset:  -1,
\t\t\tDetails: make(map[string]interface{}),
\t\t},
\t}
}`;
  }

  /**
   * Generate connection pool
   */
  private generateConnectionPool(spec: ProtocolSpec): string {
    const className = `${toPascalCase(spec.protocol.name)}ConnectionPool`;

    return `// ${className} manages connections to ${spec.protocol.name} servers
type ${className} struct {
\tmu          sync.RWMutex
\tconnections map[string]net.Conn
\tmaxConns    int
}

// newConnectionPool creates a new connection pool
func newConnectionPool(maxConns int) *${className} {
\treturn &${className}{
\t\tconnections: make(map[string]net.Conn),
\t\tmaxConns:    maxConns,
\t}
}

// GetConnection gets or creates a connection to a host
func (p *${className}) GetConnection(host string, port int) (net.Conn, error) {
\tkey := fmt.Sprintf("%s:%d", host, port)
\t
\tp.mu.RLock()
\tconn, exists := p.connections[key]
\tp.mu.RUnlock()
\t
\t// Check if existing connection is still valid
\tif exists {
\t\t// Simple check - try to read with zero timeout
\t\tconn.SetReadDeadline(time.Now())
\t\tbuf := make([]byte, 1)
\t\t_, err := conn.Read(buf)
\t\tconn.SetReadDeadline(time.Time{})
\t\t
\t\tif err == nil || err.Error() == "i/o timeout" {
\t\t\treturn conn, nil
\t\t}
\t\t
\t\t// Connection is dead, remove it
\t\tp.mu.Lock()
\t\tdelete(p.connections, key)
\t\tp.mu.Unlock()
\t}
\t
\t// Create new connection
\tdialer := net.Dialer{
\t\tTimeout: 30 * time.Second,
\t}
\t
\tconn, err := dialer.Dial("tcp", key)
\tif err != nil {
\t\treturn nil, newConnectionError(fmt.Sprintf("failed to connect to %s: %v", key, err))
\t}
\t
\tp.mu.Lock()
\tp.connections[key] = conn
\tp.mu.Unlock()
\t
\treturn conn, nil
}

// CloseConnection closes a connection
func (p *${className}) CloseConnection(host string, port int) {
\tkey := fmt.Sprintf("%s:%d", host, port)
\t
\tp.mu.Lock()
\tdefer p.mu.Unlock()
\t
\tif conn, exists := p.connections[key]; exists {
\t\tconn.Close()
\t\tdelete(p.connections, key)
\t}
}

// CloseAll closes all connections
func (p *${className}) CloseAll() {
\tp.mu.Lock()
\tdefer p.mu.Unlock()
\t
\tfor _, conn := range p.connections {
\t\tconn.Close()
\t}
\tp.connections = make(map[string]net.Conn)
}`;
  }

  /**
   * Generate client struct
   */
  private generateClientStruct(spec: ProtocolSpec): string {
    const structName = `${toPascalCase(spec.protocol.name)}Client`;
    const methods: string[] = [];

    // Generate methods for each message type
    for (const messageType of spec.messageTypes) {
      if (messageType.direction === 'request' || messageType.direction === 'bidirectional') {
        methods.push(this.generateClientMethod(spec, messageType));
      }
    }

    return `// ${structName} is a client for ${spec.protocol.name} protocol
type ${structName} struct {
\tparser         *${toPascalCase(spec.protocol.name)}Parser
\tserializer     *${toPascalCase(spec.protocol.name)}Serializer
\tpool           *${toPascalCase(spec.protocol.name)}ConnectionPool
\tdefaultTimeout time.Duration
}

// New${structName} creates a new ${spec.protocol.name} client
func New${structName}() *${structName} {
\treturn &${structName}{
\t\tparser:         New${toPascalCase(spec.protocol.name)}Parser(),
\t\tserializer:     New${toPascalCase(spec.protocol.name)}Serializer(),
\t\tpool:           newConnectionPool(10),
\t\tdefaultTimeout: 30 * time.Second,
\t}
}

// SetTimeout sets the default timeout for operations
func (c *${structName}) SetTimeout(timeout time.Duration) {
\tc.defaultTimeout = timeout
}

// Connect connects to a ${spec.protocol.name} server
func (c *${structName}) Connect(host string, port int) error {
\t_, err := c.pool.GetConnection(host, port)
\treturn err
}

// Disconnect disconnects from a server
func (c *${structName}) Disconnect(host string, port int) {
\tc.pool.CloseConnection(host, port)
}

// Close closes all connections
func (c *${structName}) Close() {
\tc.pool.CloseAll()
}

${methods.join('\n\n')}`;
  }

  /**
   * Generate client method for a message type
   */
  private generateClientMethod(spec: ProtocolSpec, messageType: any): string {
    const methodName = messageType.name;
    const structName = messageType.name;

    return `// ${methodName} sends a ${structName} message
//
// Returns the response bytes and any error encountered.
func (c *${toPascalCase(spec.protocol.name)}Client) ${methodName}(ctx context.Context, host string, port int, msg *${structName}) ([]byte, error) {
\t// Get connection
\tconn, err := c.pool.GetConnection(host, port)
\tif err != nil {
\t\treturn nil, err
\t}
\t
\t// Serialize message
\tdata, err := c.serializer.Serialize${structName}(msg)
\tif err != nil {
\t\treturn nil, fmt.Errorf("failed to serialize message: %w", err)
\t}
\t
\t// Set write deadline
\tif err := conn.SetWriteDeadline(time.Now().Add(c.defaultTimeout)); err != nil {
\t\treturn nil, newTimeoutError(fmt.Sprintf("failed to set write deadline: %v", err))
\t}
\t
\t// Send message
\tif _, err := conn.Write(data); err != nil {
\t\treturn nil, newConnectionError(fmt.Sprintf("failed to write message: %v", err))
\t}
\t
\t// Set read deadline
\tif err := conn.SetReadDeadline(time.Now().Add(c.defaultTimeout)); err != nil {
\t\treturn nil, newTimeoutError(fmt.Sprintf("failed to set read deadline: %v", err))
\t}
\t
\t// Read response
\tbuf := make([]byte, 4096)
\tn, err := conn.Read(buf)
\tif err != nil {
\t\tif netErr, ok := err.(net.Error); ok && netErr.Timeout() {
\t\t\treturn nil, newTimeoutError("read timeout")
\t\t}
\t\treturn nil, newConnectionError(fmt.Sprintf("failed to read response: %v", err))
\t}
\t
\t// Reset deadlines
\tconn.SetDeadline(time.Time{})
\t
\treturn buf[:n], nil
}`;
  }


}


/**
 * Go Test Generator
 * 
 * Generates Go tests with:
 * - Table-driven tests
 * - testify for assertions
 * - Test iterations
 * - Property tag comments
 */
export class GoTestGenerator {
  /**
   * Generate Go test code
   * 
   * @param spec - Protocol specification
   * @param profile - Language profile with Go idioms
   * @returns Generated test code
   */
  generate(spec: ProtocolSpec, profile: LanguageProfile): string {
    const lines: string[] = [];

    // Generate package declaration
    lines.push(`package ${toSnakeCase(spec.protocol.name)}_test`);

    // Generate package documentation
    lines.push(`// Tests for ${spec.protocol.name} protocol
//
// This file is auto-generated. Do not edit manually.`);

    // Generate imports
    lines.push(this.generateImports(spec));

    // Generate table-driven tests
    lines.push(this.generateTableDrivenTests(spec));

    // Generate round-trip tests
    lines.push(this.generateRoundTripTests(spec));

    let code = lines.join('\n\n');

    // Apply Go-specific idioms
    if (profile.idioms.length > 0) {
      const result = applyIdioms(code, profile.idioms, {
        language: 'go',
        protocolName: spec.protocol.name
      });
      code = result.code;
    }

    // CRITICAL: Format code to remove non-breaking spaces and ensure proper formatting
    code = formatCode(code, { language: 'go', indentSize: 4 });

    return code;
  }

  /**
   * Generate imports
   */
  private generateImports(spec: ProtocolSpec): string {
    const packageName = toSnakeCase(spec.protocol.name);

    return `import (
\t"testing"
\t
\t"github.com/stretchr/testify/assert"
\t"github.com/stretchr/testify/require"
\t
\t"${packageName}"
)`;
  }

  /**
   * Generate table-driven tests
   */
  private generateTableDrivenTests(spec: ProtocolSpec): string {
    const tests: string[] = [];

    for (const messageType of spec.messageTypes) {
      tests.push(this.generateTableDrivenTest(spec, messageType));
    }

    return tests.join('\n\n');
  }

  /**
   * Generate a table-driven test for a message type
   */
  private generateTableDrivenTest(spec: ProtocolSpec, messageType: any): string {
    const testName = `Test${messageType.name}Parse`;
    const structName = messageType.name;

    // Generate test cases
    const testCases = this.generateTestCases(messageType);

    return `// ${testName} tests parsing of ${structName} messages
func ${testName}(t *testing.T) {
\ttests := []struct {
\t\tname    string
\t\tinput   []byte
\t\twant    *${toSnakeCase(spec.protocol.name)}.${structName}
\t\twantErr bool
\t}{
${testCases}
\t}
\t
\tparser := ${toSnakeCase(spec.protocol.name)}.New${toPascalCase(spec.protocol.name)}Parser()
\tfor _, tt := range tests {
\t\tt.Run(tt.name, func(t *testing.T) {
\t\t\tgot, err := parser.Parse${structName}(tt.input)
\t\t\t
\t\t\tif tt.wantErr {
\t\t\t\trequire.Error(t, err)
\t\t\t\treturn
\t\t\t}
\t\t\t
\t\t\trequire.NoError(t, err)
\t\t\tassert.Equal(t, tt.want, got)
\t\t})
\t}
}`;
  }

  /**
   * Generate test cases for table-driven test
   */
  private generateTestCases(messageType: any): string {
    const cases: string[] = [];

    // Generate a valid test case
    const validCase = this.generateValidTestCase(messageType);
    cases.push(validCase);

    // Generate an invalid test case
    const invalidCase = `\t\t{
\t\t\tname:    "invalid input",
\t\t\tinput:   []byte("invalid"),
\t\t\twant:    nil,
\t\t\twantErr: true,
\t\t}`;
    cases.push(invalidCase);

    return cases.join(',\n');
  }

  /**
   * Generate a valid test case
   */
  private generateValidTestCase(messageType: any): string {
    const fields: string[] = [];
    const inputParts: string[] = [];

    for (const field of messageType.fields) {
      const fieldName = toPascalCase(field.name);
      const value = this.getExampleValue(field.type);

      fields.push(`\t\t\t\t${fieldName}: ${value}`);

      if (field.type === 'string') {
        inputParts.push(`"example"`);
      } else {
        inputParts.push(`"${value}"`);
      }

      if (field.delimiter) {
        inputParts.push(`"${escapeDelimiter(field.delimiter)}"`);
      }
    }

    const input = inputParts.join(' + ');

    return `\t\t{
\t\t\tname:  "valid message",
\t\t\tinput: []byte(${input}),
\t\t\twant: &${messageType.name}{
${fields.join(',\n')}
\t\t\t},
\t\t\twantErr: false,
\t\t}`;
  }

  /**
   * Generate round-trip tests
   */
  private generateRoundTripTests(spec: ProtocolSpec): string {
    const tests: string[] = [];

    for (const messageType of spec.messageTypes) {
      tests.push(this.generateRoundTripTest(spec, messageType));
    }

    return tests.join('\n\n');
  }

  /**
   * Generate a round-trip test for a message type
   */
  private generateRoundTripTest(spec: ProtocolSpec, messageType: any): string {
    const testName = `Test${messageType.name}RoundTrip`;
    const structName = messageType.name;

    // Generate example message
    const exampleFields = this.generateExampleFields(messageType);

    return `// ${testName} tests round-trip serialization and parsing
//
// Feature: prm-phase-2, Property 13: Multi-Language Code Generation (Go)
// For any valid ${structName}, serialize then parse should produce equivalent message
func ${testName}(t *testing.T) {
\tparser := ${toSnakeCase(spec.protocol.name)}.New${spec.protocol.name}Parser()
\tserializer := ${toSnakeCase(spec.protocol.name)}.New${spec.protocol.name}Serializer()
\t
\t// Create example message
\toriginal := &${toSnakeCase(spec.protocol.name)}.${structName}{
${exampleFields}
\t}
\t
\t// Serialize
\tserialized, err := serializer.Serialize${structName}(original)
\trequire.NoError(t, err)
    \t
    \t// Parse
    \tparsed, err := parser.Parse${structName} (serialized)
    \trequire.NoError(t, err)
    \t
    \t// Verify equivalence
    \tassert.Equal(t, original, parsed)
  }`;
  }

  /**
   * Generate example fields for a message
   */
  private generateExampleFields(messageType: any): string {
    const fields: string[] = [];

    for (const field of messageType.fields) {
      const fieldName = toPascalCase(field.name);
      const value = this.getExampleValue(field.type);

      fields.push(`\t\t${fieldName}: ${value} `);
    }

    return fields.join(',\n');
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
        return 'true';
      default:
        return '"example"';
    }
  }




}

/**
 * Complete Go Generator
 * 
 * Implements the LanguageGenerator interface for Go
 */
export class GoGenerator implements LanguageGenerator {
  private parserGen: GoParserGenerator;
  private serializerGen: GoSerializerGenerator;
  private clientGen: GoClientGenerator;
  private testGen: GoTestGenerator;

  constructor() {
    this.parserGen = new GoParserGenerator();
    this.serializerGen = new GoSerializerGenerator();
    this.clientGen = new GoClientGenerator();
    this.testGen = new GoTestGenerator();
  }

  /**
   * Generate all Go artifacts for a protocol
   * 
   * @param spec - Protocol specification
   * @param profile - Language profile with Go idioms
   * @returns Generated artifacts
   */
  async generate(spec: ProtocolSpec, profile: LanguageProfile): Promise<LanguageArtifacts> {
    const startTime = Date.now();

    // Generate all artifacts
    const parser = this.parserGen.generate(spec, profile);
    const serializer = this.serializerGen.generate(spec, profile);
    const client = this.clientGen.generate(spec, profile);
    const tests = this.testGen.generate(spec, profile);

    // Types are included in parser (structs)
    const types = '// Types are defined in parser file (structs)';

    const endTime = Date.now();

    return {
      language: 'go',
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
