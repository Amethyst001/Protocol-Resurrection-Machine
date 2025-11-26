/**
 * Kiro Spec Generator
 * Transforms YAML protocol specifications into Kiro specification documents
 * (requirements.md, design.md, tasks.md)
 */

import type {
  ProtocolSpec,
  MessageType,
  FieldType,
  TypeDefinition,
} from '../types/protocol-spec.js';

/**
 * Generated Kiro specification set
 */
export interface KiroSpecSet {
  requirements: string;
  design: string;
  tasks: string;
}

/**
 * Kiro Spec Generator
 * Generates requirements.md, design.md, and tasks.md from protocol specifications
 */
export class KiroSpecGenerator {
  /**
   * Generate all Kiro spec documents
   */
  generateAll(spec: ProtocolSpec): KiroSpecSet {
    return {
      requirements: this.generateRequirements(spec),
      design: this.generateDesign(spec),
      tasks: this.generateTasks(spec),
    };
  }

  /**
   * Generate requirements.md document
   * Creates EARS-compliant requirements with user stories and acceptance criteria
   */
  generateRequirements(spec: ProtocolSpec): string {
    const { protocol } = spec;

    // Build glossary terms
    const glossaryTerms = this.buildGlossary(spec);

    // Generate requirements
    const requirements = this.generateRequirementsList(spec);

    return this.renderRequirementsTemplate({
      protocolName: protocol.name,
      description: protocol.description,
      rfc: protocol.rfc ?? undefined,
      port: protocol.port,
      glossaryTerms,
      requirements,
    });
  }

  /**
   * Generate design.md document
   * Creates comprehensive design with architecture, components, and correctness properties
   */
  generateDesign(spec: ProtocolSpec): string {
    const { protocol } = spec;

    return this.renderDesignTemplate({
      protocolName: protocol.name,
      description: protocol.description,
      rfc: protocol.rfc ?? undefined,
      port: protocol.port,
      connectionType: spec.connection.type,
      messageTypes: spec.messageTypes,
      types: spec.types ?? [],
      hasHandshake: !!spec.connection.handshake?.required,
      hasTermination: !!spec.connection.termination,
    });
  }

  /**
   * Generate tasks.md document
   * Creates implementation plan with numbered checkbox list
   */
  generateTasks(spec: ProtocolSpec): string {
    const { protocol } = spec;

    return this.renderTasksTemplate({
      protocolName: protocol.name,
      description: protocol.description,
      messageTypes: spec.messageTypes,
      types: spec.types ?? [],
      connectionType: spec.connection.type,
      hasHandshake: !!spec.connection.handshake?.required,
      hasTermination: !!spec.connection.termination,
    });
  }

  /**
   * Build glossary terms from protocol specification
   */
  private buildGlossary(spec: ProtocolSpec): Array<{ term: string; definition: string }> {
    const glossary: Array<{ term: string; definition: string }> = [];

    // Add protocol name
    glossary.push({
      term: spec.protocol.name,
      definition: spec.protocol.description,
    });

    // Add system name
    glossary.push({
      term: `${spec.protocol.name} System`,
      definition: `The complete implementation of the ${spec.protocol.name} protocol including parser, serializer, client, and user interface`,
    });

    // Add message types
    for (const messageType of spec.messageTypes) {
      glossary.push({
        term: `${messageType.name} Message`,
        definition: `A ${messageType.direction} message in the ${spec.protocol.name} protocol with format: ${messageType.format}`,
      });
    }

    // Add custom types (enums, structs)
    if (spec.types) {
      for (const type of spec.types) {
        if (type.kind === 'enum') {
          glossary.push({
            term: type.name,
            definition: `An enumeration type with values: ${type.values?.map(v => v.name).join(', ')}`,
          });
        } else if (type.kind === 'struct') {
          glossary.push({
            term: type.name,
            definition: `A structured type with fields: ${type.fields?.map(f => f.name).join(', ')}`,
          });
        }
      }
    }

    // Add connection type
    glossary.push({
      term: `${spec.connection.type} Connection`,
      definition: `A ${spec.connection.type} network connection used by the ${spec.protocol.name} protocol`,
    });

    return glossary;
  }

  /**
   * Generate list of requirements with user stories and acceptance criteria
   */
  private generateRequirementsList(spec: ProtocolSpec): Array<{
    number: number;
    userStory: string;
    acceptanceCriteria: string[];
  }> {
    const requirements: Array<{
      number: number;
      userStory: string;
      acceptanceCriteria: string[];
    }> = [];

    let reqNumber = 1;

    // Requirement 1: Message Parsing
    requirements.push({
      number: reqNumber++,
      userStory: `As a developer using the ${spec.protocol.name} protocol, I want to parse ${spec.protocol.name} messages from byte streams, so that I can decode server responses into structured data`,
      acceptanceCriteria: this.generateParsingCriteria(spec),
    });

    // Requirement 2: Message Serialization
    requirements.push({
      number: reqNumber++,
      userStory: `As a developer using the ${spec.protocol.name} protocol, I want to serialize message objects into ${spec.protocol.name} format, so that I can send properly formatted requests to servers`,
      acceptanceCriteria: this.generateSerializationCriteria(spec),
    });

    // Requirement 3: Client Operations
    requirements.push({
      number: reqNumber++,
      userStory: `As a user of the ${spec.protocol.name} protocol, I want a client that can connect to ${spec.protocol.name} servers, so that I can interact with the protocol without implementing network code`,
      acceptanceCriteria: this.generateClientCriteria(spec),
    });

    // Requirement 4: Error Handling
    requirements.push({
      number: reqNumber++,
      userStory: `As a developer using the ${spec.protocol.name} implementation, I want clear error messages when operations fail, so that I can identify and fix issues`,
      acceptanceCriteria: this.generateErrorHandlingCriteria(spec),
    });

    // Requirement 5: Round-Trip Correctness
    requirements.push({
      number: reqNumber++,
      userStory: `As a developer ensuring correctness, I want parsers and serializers that maintain data integrity through round-trip operations, so that I can trust the implementation handles all valid messages`,
      acceptanceCriteria: this.generateRoundTripCriteria(spec),
    });

    return requirements;
  }

  /**
   * Generate EARS-compliant acceptance criteria for parsing
   */
  private generateParsingCriteria(spec: ProtocolSpec): string[] {
    const criteria: string[] = [];
    const systemName = `${spec.protocol.name} System`;

    // General parsing criterion
    criteria.push(
      `WHEN the ${systemName} receives a byte stream THEN the ${systemName} SHALL parse the stream into structured message objects according to the protocol specification`
    );

    // Field extraction criteria for each message type
    for (const messageType of spec.messageTypes) {
      if (messageType.fields.length > 0) {
        const fieldNames = messageType.fields.map(f => f.name).join(', ');
        criteria.push(
          `WHEN parsing a ${messageType.name} Message THEN the ${systemName} SHALL extract the following fields: ${fieldNames}`
        );
      }
    }

    // Delimiter handling
    const hasDelimiters = spec.messageTypes.some(mt => mt.delimiter);
    if (hasDelimiters) {
      criteria.push(
        `WHEN a message format contains delimiters THEN the ${systemName} SHALL split fields using the specified delimiter characters`
      );
    }

    // Terminator handling
    const hasTerminators = spec.messageTypes.some(mt => mt.terminator);
    if (hasTerminators) {
      criteria.push(
        `WHEN a message format contains terminators THEN the ${systemName} SHALL recognize message boundaries using the specified terminator characters`
      );
    }

    return criteria;
  }

  /**
   * Generate EARS-compliant acceptance criteria for serialization
   */
  private generateSerializationCriteria(spec: ProtocolSpec): string[] {
    const criteria: string[] = [];
    const systemName = `${spec.protocol.name} System`;

    // General serialization criterion
    criteria.push(
      `WHEN the ${systemName} serializes a message object THEN the ${systemName} SHALL produce a byte stream conforming to the protocol format specification`
    );

    // Field formatting for each message type
    for (const messageType of spec.messageTypes) {
      if (messageType.fields.length > 0) {
        criteria.push(
          `WHEN serializing a ${messageType.name} Message THEN the ${systemName} SHALL format all fields according to the message format string`
        );
      }
    }

    // Delimiter insertion
    const hasDelimiters = spec.messageTypes.some(mt => mt.delimiter);
    if (hasDelimiters) {
      criteria.push(
        `WHEN a message format specifies delimiters THEN the ${systemName} SHALL insert delimiter characters between fields`
      );
    }

    // Terminator insertion
    const hasTerminators = spec.messageTypes.some(mt => mt.terminator);
    if (hasTerminators) {
      criteria.push(
        `WHEN a message format specifies terminators THEN the ${systemName} SHALL append terminator characters to the serialized output`
      );
    }

    return criteria;
  }

  /**
   * Generate EARS-compliant acceptance criteria for client operations
   */
  private generateClientCriteria(spec: ProtocolSpec): string[] {
    const criteria: string[] = [];
    const systemName = `${spec.protocol.name} System`;

    // Connection establishment
    criteria.push(
      `WHEN the ${systemName} connects to a server THEN the ${systemName} SHALL establish a ${spec.connection.type} connection on port ${spec.protocol.port}`
    );

    // Handshake handling
    if (spec.connection.handshake?.required) {
      criteria.push(
        `WHEN the ${systemName} establishes a connection THEN the ${systemName} SHALL perform the required handshake sequence before allowing message transmission`
      );
    }

    // Message sending
    criteria.push(
      `WHEN the ${systemName} sends a message THEN the ${systemName} SHALL use the serializer to format the message before transmission`
    );

    // Message receiving
    criteria.push(
      `WHEN the ${systemName} receives data THEN the ${systemName} SHALL use the parser to decode the data into message objects`
    );

    // Connection termination
    if (spec.connection.termination) {
      criteria.push(
        `WHEN the ${systemName} terminates a connection THEN the ${systemName} SHALL follow the protocol termination sequence`
      );
    }

    return criteria;
  }

  /**
   * Generate EARS-compliant acceptance criteria for error handling
   */
  private generateErrorHandlingCriteria(spec: ProtocolSpec): string[] {
    const criteria: string[] = [];
    const systemName = `${spec.protocol.name} System`;

    // Parse errors
    criteria.push(
      `WHEN the ${systemName} encounters malformed input during parsing THEN the ${systemName} SHALL return an error message indicating the byte offset and expected format`
    );

    // Serialization errors
    criteria.push(
      `WHEN the ${systemName} attempts to serialize an invalid message object THEN the ${systemName} SHALL return an error message identifying the invalid field and reason`
    );

    // Network errors
    criteria.push(
      `WHEN the ${systemName} encounters a network error THEN the ${systemName} SHALL return an error message indicating the connection state and failure type`
    );

    // Validation errors
    criteria.push(
      `WHEN the ${systemName} validates message fields THEN the ${systemName} SHALL report all validation failures with field names and constraint violations`
    );

    return criteria;
  }

  /**
   * Generate EARS-compliant acceptance criteria for round-trip correctness
   */
  private generateRoundTripCriteria(spec: ProtocolSpec): string[] {
    const criteria: string[] = [];
    const systemName = `${spec.protocol.name} System`;

    // General round-trip property
    criteria.push(
      `WHEN the ${systemName} serializes a valid message object and then parses the result THEN the ${systemName} SHALL produce an equivalent message object`
    );

    // Per-message-type round-trip
    for (const messageType of spec.messageTypes) {
      criteria.push(
        `WHEN the ${systemName} performs round-trip operations on ${messageType.name} Messages THEN the ${systemName} SHALL preserve all field values`
      );
    }

    return criteria;
  }

  /**
   * Render requirements.md template
   */
  private renderRequirementsTemplate(data: {
    protocolName: string;
    description: string;
    rfc?: string | undefined;
    port: number;
    glossaryTerms: Array<{ term: string; definition: string }>;
    requirements: Array<{
      number: number;
      userStory: string;
      acceptanceCriteria: string[];
    }>;
  }): string {
    const rfcText = data.rfc ? ` (RFC ${data.rfc})` : '';

    let doc = `# Requirements Document

## Introduction

This document specifies the requirements for implementing the ${data.protocolName} protocol${rfcText}. ${data.description}

The implementation will provide a complete, working client including message parser, serializer, network client, and user interface. The system will be generated automatically from the protocol specification, demonstrating the Protocol Resurrection Machine's capability to resurrect obsolete network protocols.

## Glossary

`;

    // Add glossary terms
    for (const { term, definition } of data.glossaryTerms) {
      doc += `- **${term}**: ${definition}\n`;
    }

    doc += '\n## Requirements\n\n';

    // Add requirements
    for (const req of data.requirements) {
      doc += `### Requirement ${req.number}\n\n`;
      doc += `**User Story:** ${req.userStory}\n\n`;
      doc += `#### Acceptance Criteria\n\n`;

      for (let i = 0; i < req.acceptanceCriteria.length; i++) {
        doc += `${i + 1}. ${req.acceptanceCriteria[i]}\n`;
      }

      doc += '\n';
    }

    return doc;
  }

  /**
   * Generate correctness properties section
   */
  private generateCorrectnessProperties(data: {
    protocolName: string;
    messageTypes: MessageType[];
    connectionType: 'TCP' | 'UDP';
    hasHandshake: boolean;
  }): string {
    let doc = `## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

`;

    let propertyNumber = 1;

    // Property 1: Round-trip property for each message type
    for (const messageType of data.messageTypes) {
      doc += `**Property ${propertyNumber}: ${messageType.name} Round-Trip Correctness**\n`;
      doc += `*For any* valid ${messageType.name} message object, serializing then parsing should produce an equivalent message object (parse(serialize(message)) == message).\n`;
      doc += `**Validates: Requirements 1, 2, 5**\n\n`;
      propertyNumber++;
    }

    // Property: Parser field extraction
    doc += `**Property ${propertyNumber}: Parser Field Extraction Completeness**\n`;
    doc += `*For any* valid ${data.protocolName} message, parsing should extract all fields defined in the message format specification.\n`;
    doc += `**Validates: Requirements 1**\n\n`;
    propertyNumber++;

    // Property: Serializer format compliance
    doc += `**Property ${propertyNumber}: Serializer Format Compliance**\n`;
    doc += `*For any* valid message object, the serialized output should conform to the protocol format specification including correct delimiters and terminators.\n`;
    doc += `**Validates: Requirements 2**\n\n`;
    propertyNumber++;

    // Property: Parser error reporting
    doc += `**Property ${propertyNumber}: Parser Error Reporting**\n`;
    doc += `*For any* malformed protocol message, parsing should fail with an error that includes the byte offset of the failure, the expected format, and the actual data encountered.\n`;
    doc += `**Validates: Requirements 4**\n\n`;
    propertyNumber++;

    // Property: Serializer validation
    doc += `**Property ${propertyNumber}: Serializer Validation**\n`;
    doc += `*For any* invalid message object (missing required fields, invalid field types, constraint violations), serialization should fail with an error that identifies the invalid field and the reason for invalidity.\n`;
    doc += `**Validates: Requirements 4**\n\n`;
    propertyNumber++;

    // Property: Client connection type
    doc += `**Property ${propertyNumber}: Client Connection Type Correctness**\n`;
    doc += `*For any* connection attempt, the client should establish a ${data.connectionType} connection as specified in the protocol.\n`;
    doc += `**Validates: Requirements 3**\n\n`;
    propertyNumber++;

    // Property: Client serializer integration
    doc += `**Property ${propertyNumber}: Client Serializer Integration**\n`;
    doc += `*For any* message sent by the client, the bytes transmitted should be identical to the output of the serializer for that message.\n`;
    doc += `**Validates: Requirements 3**\n\n`;
    propertyNumber++;

    // Property: Client parser integration
    doc += `**Property ${propertyNumber}: Client Parser Integration**\n`;
    doc += `*For any* message received by the client, the parsed message object should be identical to the output of the parser for those bytes.\n`;
    doc += `**Validates: Requirements 3**\n\n`;
    propertyNumber++;

    // Property: JSON conversion round-trip
    doc += `**Property ${propertyNumber}: JSON Conversion Round-Trip**\n`;
    doc += `*For any* valid message object, converting to JSON then back to a message object should produce an equivalent message (fromJSON(toJSON(message)) == message).\n`;
    doc += `**Validates: Requirements 1, 2**\n\n`;
    propertyNumber++;

    // Property: Handshake execution (if applicable)
    if (data.hasHandshake) {
      doc += `**Property ${propertyNumber}: Handshake Execution**\n`;
      doc += `*For any* connection attempt, the client should execute the handshake sequence before allowing message transmission.\n`;
      doc += `**Validates: Requirements 3**\n\n`;
      propertyNumber++;
    }

    // Property: Field validation
    for (const messageType of data.messageTypes) {
      const requiredFields = messageType.fields.filter(f => f.required);
      if (requiredFields.length > 0) {
        doc += `**Property ${propertyNumber}: ${messageType.name} Required Field Validation**\n`;
        doc += `*For any* ${messageType.name} message object missing required fields (${requiredFields.map(f => f.name).join(', ')}), serialization should fail with a validation error.\n`;
        doc += `**Validates: Requirements 2, 4**\n\n`;
        propertyNumber++;
      }
    }

    // Property: Delimiter handling (if applicable)
    const hasDelimiters = data.messageTypes.some(mt => mt.delimiter);
    if (hasDelimiters) {
      doc += `**Property ${propertyNumber}: Delimiter Handling Correctness**\n`;
      doc += `*For any* message with delimited fields, parsing should correctly split fields using the specified delimiter, and serialization should correctly insert delimiters between fields.\n`;
      doc += `**Validates: Requirements 1, 2**\n\n`;
      propertyNumber++;
    }

    // Property: Terminator handling (if applicable)
    const hasTerminators = data.messageTypes.some(mt => mt.terminator);
    if (hasTerminators) {
      doc += `**Property ${propertyNumber}: Terminator Handling Correctness**\n`;
      doc += `*For any* message with a terminator, parsing should recognize message boundaries using the terminator, and serialization should append the terminator to the output.\n`;
      doc += `**Validates: Requirements 1, 2**\n\n`;
      propertyNumber++;
    }

    return doc;
  }

  /**
   * Render design.md template
   */
  private renderDesignTemplate(data: {
    protocolName: string;
    description: string;
    rfc?: string | undefined;
    port: number;
    connectionType: 'TCP' | 'UDP';
    messageTypes: MessageType[];
    types: TypeDefinition[];
    hasHandshake: boolean;
    hasTermination: boolean;
  }): string {
    const rfcText = data.rfc ? ` (RFC ${data.rfc})` : '';

    let doc = `# Design Document

## Overview

This document describes the design for implementing the ${data.protocolName} protocol${rfcText}. ${data.description}

The implementation follows a layered architecture with clear separation between parsing, serialization, network communication, and user interface concerns. The system is designed to be generated automatically from the protocol specification, demonstrating correctness through property-based testing.

The implementation will be in TypeScript/Node.js, leveraging type safety and modern async/await patterns for network operations.

## Architecture

### System Layers

\`\`\`
┌─────────────────────────────────────────────────────────┐
│                    User Interface Layer                  │
│              (CLI for protocol interaction)              │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│                   Protocol Client Layer                  │
│         (Connection management, message routing)         │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│              Parser/Serializer Layer                     │
│         (Message encoding/decoding)                      │
└─────────────────────────────────────────────────────────┐
                           ↓
┌─────────────────────────────────────────────────────────┐
│                   Network Layer                          │
│              (${data.connectionType} socket operations)                    │
└─────────────────────────────────────────────────────────┘
\`\`\`

### Data Flow

\`\`\`
User Input
    ↓
[UI Layer]
    ↓
Message Object
    ↓
[Serializer]
    ↓
Byte Stream
    ↓
[Client - Send]
    ↓
Network (${data.connectionType})
    ↓
[Client - Receive]
    ↓
Byte Stream
    ↓
[Parser]
    ↓
Message Object
    ↓
[UI Layer]
    ↓
Display to User
\`\`\`

## Components and Interfaces

### 1. Protocol Parser

**Purpose**: Parse ${data.protocolName} messages from byte streams into structured objects.

**Interface**:
\`\`\`typescript
interface ${data.protocolName}Parser {
  parse(data: Buffer): ParseResult;
}

interface ParseResult {
  success: boolean;
  message?: ${data.protocolName}Message;
  error?: ParseError;
  bytesConsumed: number;
}

interface ParseError {
  message: string;
  offset: number;
  expected: string;
  actual: string;
}
\`\`\`

**Responsibilities**:
- Decode byte streams according to ${data.protocolName} message formats
- Handle delimiters and terminators
- Extract and type-convert fields
- Provide detailed error messages with byte offsets on parse failures

### 2. Protocol Serializer

**Purpose**: Serialize ${data.protocolName} message objects into protocol byte streams.

**Interface**:
\`\`\`typescript
interface ${data.protocolName}Serializer {
  serialize(message: ${data.protocolName}Message): SerializeResult;
  validate(message: ${data.protocolName}Message): ValidationResult;
}

interface SerializeResult {
  success: boolean;
  data?: Buffer;
  error?: SerializeError;
}

interface SerializeError {
  message: string;
  field: string;
  reason: string;
}
\`\`\`

**Responsibilities**:
- Encode message objects to byte streams
- Insert delimiters and terminators
- Format fields according to specification
- Validate message objects before serialization

### 3. Protocol Client

**Purpose**: Establish connections and communicate using the ${data.protocolName} protocol.

**Interface**:
\`\`\`typescript
interface ${data.protocolName}Client {
  connect(host: string, port?: number): Promise<void>;
  disconnect(): Promise<void>;
  send(message: ${data.protocolName}Message): Promise<void>;
  receive(): Promise<${data.protocolName}Message>;
}
\`\`\`

**Responsibilities**:
- Manage ${data.connectionType} connections on port ${data.port}${data.hasHandshake ? '\n- Perform protocol handshake' : ''}${data.hasTermination ? '\n- Handle protocol termination sequence' : ''}
- Send serialized messages
- Receive and parse responses
- Handle connection errors gracefully

### 4. JSON Converter

**Purpose**: Convert ${data.protocolName} messages to/from JSON format for interoperability.

**Interface**:
\`\`\`typescript
interface ${data.protocolName}Converter {
  toJSON(message: ${data.protocolName}Message): object;
  fromJSON(json: object): ConversionResult;
}

interface ConversionResult {
  success: boolean;
  message?: ${data.protocolName}Message;
  error?: ConversionError;
}
\`\`\`

**Responsibilities**:
- Transform protocol messages to JSON objects
- Transform JSON objects to protocol messages
- Preserve all message data through conversion
- Validate JSON structure

## Data Models

`;

    // Add message type definitions
    doc += '### Message Types\n\n';
    for (const messageType of data.messageTypes) {
      doc += `**${messageType.name} Message** (${messageType.direction}):\n`;
      doc += `- Format: \`${messageType.format}\`\n`;
      if (messageType.delimiter) {
        doc += `- Delimiter: \`${this.escapeString(messageType.delimiter)}\`\n`;
      }
      if (messageType.terminator) {
        doc += `- Terminator: \`${this.escapeString(messageType.terminator)}\`\n`;
      }
      doc += '- Fields:\n';
      for (const field of messageType.fields) {
        const fieldTypeStr = this.formatFieldType(field.type);
        const requiredStr = field.required ? 'required' : 'optional';
        doc += `  - \`${field.name}\`: ${fieldTypeStr} (${requiredStr})\n`;
      }
      doc += '\n';
    }

    // Add custom types if any
    if (data.types.length > 0) {
      doc += '### Custom Types\n\n';
      for (const type of data.types) {
        if (type.kind === 'enum') {
          doc += `**${type.name}** (enum):\n`;
          if (type.values) {
            for (const value of type.values) {
              const desc = value.description ? ` - ${value.description}` : '';
              doc += `- \`${value.name}\` = \`${value.value}\`${desc}\n`;
            }
          }
          doc += '\n';
        } else if (type.kind === 'struct') {
          doc += `**${type.name}** (struct):\n`;
          if (type.fields) {
            for (const field of type.fields) {
              const fieldTypeStr = this.formatFieldType(field.type);
              doc += `- \`${field.name}\`: ${fieldTypeStr}\n`;
            }
          }
          doc += '\n';
        }
      }
    }

    // Add TypeScript interface examples
    doc += '### TypeScript Interfaces\n\n';
    doc += '\`\`\`typescript\n';
    for (const messageType of data.messageTypes) {
      doc += `interface ${messageType.name}Message {\n`;
      for (const field of messageType.fields) {
        const tsType = this.fieldTypeToTypeScript(field.type);
        const optional = field.required ? '' : '?';
        doc += `  ${field.name}${optional}: ${tsType};\n`;
      }
      doc += '}\n\n';
    }
    doc += '\`\`\`\n\n';

    // Generate Correctness Properties
    doc += this.generateCorrectnessProperties(data);


    // Add Error Handling section
    doc += `## Error Handling

### Error Categories

**1. Parse Errors**
- Malformed message format
- Invalid field values
- Missing required fields
- Unexpected delimiters or terminators

**Error Handling Strategy**:
- Return structured ParseError with byte offset
- Include expected format and actual data
- Provide actionable error messages

**2. Serialization Errors**
- Missing required fields
- Invalid field types
- Constraint violations

**Error Handling Strategy**:
- Validate before serialization
- Return structured SerializeError with field name
- Identify specific validation failures

**3. Network Errors**
- Connection failures
- Timeouts
- Connection resets
- Protocol violations

**Error Handling Strategy**:
- Return structured error with connection state
- Include operation that failed
- Support retry with exponential backoff

**4. Validation Errors**
- Invalid message objects
- Type mismatches
- Constraint violations

**Error Handling Strategy**:
- Validate all inputs before processing
- Return detailed validation results
- List all validation failures

### Error Message Format

All error messages follow this format:
\`\`\`
[ERROR_TYPE] Error in [COMPONENT]: [DESCRIPTION]
Context: [RELEVANT_CONTEXT]
Expected: [EXPECTED_FORMAT]
Actual: [ACTUAL_VALUE]
\`\`\`

## Testing Strategy

### Dual Testing Approach

The ${data.protocolName} implementation requires both unit testing and property-based testing:

**Unit Tests** verify:
- Specific examples of ${data.protocolName} messages
- Known protocol interactions
- Error handling for specific invalid inputs
- Integration between components
- Edge cases (empty messages, maximum sizes)

**Property-Based Tests** verify:
- Universal properties across all inputs
- Round-trip correctness for all message types
- Parser/serializer correctness across random inputs
- JSON conversion correctness
- Error handling across invalid inputs

### Property-Based Testing Framework

**Library**: fast-check (TypeScript property-based testing library)

**Configuration**:
- Minimum 100 iterations per property test
- Seed-based reproducibility for failed tests
- Shrinking to find minimal counterexamples
- Verbose output on failures

### Property Test Tagging

Each property-based test MUST be tagged with a comment referencing the correctness property:

\`\`\`typescript
/**
 * Feature: ${data.protocolName.toLowerCase()}-protocol, Property N: [Property Name]
 * [Property description]
 */
test('property description', () => {
  fc.assert(
    fc.property(messageArbitrary, (message) => {
      // Test implementation
    }),
    { numRuns: 100 }
  );
});
\`\`\`

### Test Coverage Goals

- 100% coverage of parser/serializer code paths
- 100% coverage of validation logic
- 100% coverage of error handling paths
- Property tests for all correctness properties
- Example tests for known ${data.protocolName} messages

### Test Organization

\`\`\`
tests/
  unit/
    ${data.protocolName.toLowerCase()}-parser.test.ts
    ${data.protocolName.toLowerCase()}-serializer.test.ts
    ${data.protocolName.toLowerCase()}-client.test.ts
  property/
    ${data.protocolName.toLowerCase()}-round-trip.property.test.ts
    ${data.protocolName.toLowerCase()}-validation.property.test.ts
  integration/
    ${data.protocolName.toLowerCase()}-e2e.test.ts
\`\`\`

## Implementation Technology Stack

### Core Implementation
- **Language**: TypeScript 5.x
- **Runtime**: Node.js 20.x LTS
- **Build Tool**: tsup or esbuild
- **Package Manager**: pnpm

### Testing
- **Test Framework**: Vitest
- **Property Testing**: fast-check
- **Coverage**: Vitest coverage (c8)

### Network
- **${data.connectionType}**: Node.js ${data.connectionType === 'TCP' ? 'net' : 'dgram'} module
- **Async**: Native Promises and async/await

### UI
- **CLI**: inquirer, commander, chalk

## Performance Considerations

### Parser Performance
- Use Buffer operations instead of string concatenation
- Implement streaming for large messages
- Pre-compile format strings when possible
- Ensure O(n) time complexity

### Client Performance
- Reuse connections when protocol allows
- Implement timeout handling (default 30 seconds)
- Use exponential backoff for retries
- Clean up connections properly

### Test Performance
- Run property tests in parallel when possible
- Cache generated test data appropriately
- Ensure tests complete in under 10 seconds

## Security Considerations

### Input Validation
- Validate all network inputs before parsing
- Limit message sizes to prevent DoS
- Sanitize field values
- Handle malformed input gracefully

### Network Security
- Validate hostnames and ports
- Implement connection timeouts
- Rate limit connection attempts
- Handle connection errors securely

## Extension Points

The implementation provides hooks for customization:

### Message Hooks
\`\`\`typescript
export function preSendHook(message: ${data.protocolName}Message): ${data.protocolName}Message {
  // Modify message before sending
  return message;
}

export function postReceiveHook(message: ${data.protocolName}Message): ${data.protocolName}Message {
  // Process message after receiving
  return message;
}
\`\`\`

### Custom Validators
\`\`\`typescript
export function customFieldValidator(
  fieldName: string,
  value: any
): ValidationResult {
  // Custom validation logic
  return { valid: true };
}
\`\`\`

### Custom Renderers
\`\`\`typescript
export function customMessageRenderer(
  message: ${data.protocolName}Message
): string {
  // Custom rendering logic
  return formatMessage(message);
}
\`\`\`
`;

    return doc;
  }

  /**
   * Escape special characters in strings for display
   */
  private escapeString(str: string): string {
    return str
      .replace(/\r/g, '\\r')
      .replace(/\n/g, '\\n')
      .replace(/\t/g, '\\t');
  }

  /**
   * Format field type for display
   */
  private formatFieldType(type: FieldType): string {
    switch (type.kind) {
      case 'string':
        return type.maxLength ? `string (max ${type.maxLength})` : 'string';
      case 'number':
        if (type.min !== undefined && type.max !== undefined) {
          return `number (${type.min}-${type.max})`;
        } else if (type.min !== undefined) {
          return `number (min ${type.min})`;
        } else if (type.max !== undefined) {
          return `number (max ${type.max})`;
        }
        return 'number';
      case 'enum':
        return `enum (${type.values.join(', ')})`;
      case 'bytes':
        return type.length ? `bytes (${type.length})` : 'bytes';
      case 'boolean':
        return 'boolean';
    }
  }

  /**
   * Convert field type to TypeScript type
   */
  private fieldTypeToTypeScript(type: FieldType): string {
    switch (type.kind) {
      case 'string':
        return 'string';
      case 'number':
        return 'number';
      case 'enum':
        return type.values.map(v => `'${v}'`).join(' | ');
      case 'bytes':
        return 'Buffer';
      case 'boolean':
        return 'boolean';
    }
  }

  /**
   * Render tasks.md template
   * Generates implementation plan with numbered checkbox list
   */
  private renderTasksTemplate(data: {
    protocolName: string;
    description: string;
    messageTypes: MessageType[];
    types: TypeDefinition[];
    connectionType: 'TCP' | 'UDP';
    hasHandshake: boolean;
    hasTermination: boolean;
  }): string {
    let doc = `# Implementation Plan

`;

    let taskNumber = 1;

    // Task 1: Project Setup
    doc += `- [ ] ${taskNumber}. Set up project structure and dependencies\n`;
    doc += `  - Initialize TypeScript project with proper configuration\n`;
    doc += `  - Install dependencies (Vitest, fast-check, etc.)\n`;
    doc += `  - Create directory structure (src/, tests/, generated/)\n`;
    doc += `  - Set up build and test scripts\n`;
    doc += `  - _Requirements: All (foundation)_\n\n`;
    taskNumber++;

    // Task 2: Core Type Definitions
    doc += `- [ ] ${taskNumber}. Define core type definitions and interfaces\n`;
    doc += `  - Define message type interfaces\n`;
    doc += `  - Define result types (ParseResult, SerializeResult)\n`;
    doc += `  - Define error types\n`;
    doc += `  - Create type guards\n`;
    doc += `  - _Requirements: 1, 2_\n\n`;
    taskNumber++;

    // Task 3: Parser Implementation
    doc += `- [ ] ${taskNumber}. Implement ${data.protocolName} message parser\n`;
    const parserSubtask = taskNumber;
    taskNumber++;
    
    doc += `- [ ] ${parserSubtask}.1 Create parser class with parse() method\n`;
    doc += `  - Parse byte streams into message objects\n`;
    doc += `  - Handle delimiters and terminators\n`;
    doc += `  - Extract and type-convert fields\n`;
    doc += `  - _Requirements: 1_\n\n`;

    // Add parsing tasks for each message type
    let subtaskNumber = 2;
    for (const messageType of data.messageTypes) {
      doc += `- [ ] ${parserSubtask}.${subtaskNumber} Implement ${messageType.name} message parsing\n`;
      doc += `  - Parse format: \`${messageType.format}\`\n`;
      doc += `  - Extract fields: ${messageType.fields.map(f => f.name).join(', ')}\n`;
      if (messageType.delimiter) {
        doc += `  - Handle delimiter: \`${this.escapeString(messageType.delimiter)}\`\n`;
      }
      if (messageType.terminator) {
        doc += `  - Handle terminator: \`${this.escapeString(messageType.terminator)}\`\n`;
      }
      doc += `  - _Requirements: 1_\n\n`;
      subtaskNumber++;
    }

    doc += `- [ ]* ${parserSubtask}.${subtaskNumber} Write property test for parser round-trip\n`;
    doc += `  - **Property: Parser-Serializer Round-Trip**\n`;
    doc += `  - **Validates: Requirements 1, 2, 5**\n\n`;
    subtaskNumber++;

    doc += `- [ ]* ${parserSubtask}.${subtaskNumber} Write unit tests for parser error handling\n`;
    doc += `  - Test malformed input handling\n`;
    doc += `  - Test error messages include byte offset\n`;
    doc += `  - _Requirements: 4_\n\n`;

    // Task 4: Serializer Implementation
    doc += `- [ ] ${taskNumber}. Implement ${data.protocolName} message serializer\n`;
    const serializerSubtask = taskNumber;
    taskNumber++;

    doc += `- [ ] ${serializerSubtask}.1 Create serializer class with serialize() method\n`;
    doc += `  - Serialize message objects to byte streams\n`;
    doc += `  - Insert delimiters and terminators\n`;
    doc += `  - Format fields according to specification\n`;
    doc += `  - _Requirements: 2_\n\n`;

    subtaskNumber = 2;
    for (const messageType of data.messageTypes) {
      doc += `- [ ] ${serializerSubtask}.${subtaskNumber} Implement ${messageType.name} message serialization\n`;
      doc += `  - Format: \`${messageType.format}\`\n`;
      doc += `  - Format fields: ${messageType.fields.map(f => f.name).join(', ')}\n`;
      doc += `  - _Requirements: 2_\n\n`;
      subtaskNumber++;
    }

    doc += `- [ ] ${serializerSubtask}.${subtaskNumber} Implement validation before serialization\n`;
    doc += `  - Validate required fields are present\n`;
    doc += `  - Validate field types\n`;
    doc += `  - Return descriptive errors for invalid fields\n`;
    doc += `  - _Requirements: 2, 4_\n\n`;
    subtaskNumber++;

    doc += `- [ ]* ${serializerSubtask}.${subtaskNumber} Write property test for serializer validation\n`;
    doc += `  - **Property: Serializer Validation**\n`;
    doc += `  - **Validates: Requirements 2, 4**\n\n`;

    // Task 5: Client Implementation
    doc += `- [ ] ${taskNumber}. Implement ${data.protocolName} network client\n`;
    const clientSubtask = taskNumber;
    taskNumber++;

    doc += `- [ ] ${clientSubtask}.1 Create client class with connection management\n`;
    doc += `  - Establish ${data.connectionType} connections\n`;
    doc += `  - Handle connection errors\n`;
    doc += `  - Implement timeout handling\n`;
    doc += `  - _Requirements: 3_\n\n`;

    subtaskNumber = 2;
    if (data.hasHandshake) {
      doc += `- [ ] ${clientSubtask}.${subtaskNumber} Implement handshake sequence\n`;
      doc += `  - Perform handshake before message transmission\n`;
      doc += `  - _Requirements: 3_\n\n`;
      subtaskNumber++;
    }

    doc += `- [ ] ${clientSubtask}.${subtaskNumber} Implement send() method\n`;
    doc += `  - Integrate with serializer\n`;
    doc += `  - Send serialized messages over ${data.connectionType}\n`;
    doc += `  - _Requirements: 3_\n\n`;
    subtaskNumber++;

    doc += `- [ ] ${clientSubtask}.${subtaskNumber} Implement receive() method\n`;
    doc += `  - Receive data from ${data.connectionType} connection\n`;
    doc += `  - Integrate with parser\n`;
    doc += `  - Return parsed message objects\n`;
    doc += `  - _Requirements: 3_\n\n`;
    subtaskNumber++;

    if (data.hasTermination) {
      doc += `- [ ] ${clientSubtask}.${subtaskNumber} Implement connection termination\n`;
      doc += `  - Follow protocol termination sequence\n`;
      doc += `  - Clean up resources\n`;
      doc += `  - _Requirements: 3_\n\n`;
      subtaskNumber++;
    }

    doc += `- [ ]* ${clientSubtask}.${subtaskNumber} Write property test for client integration\n`;
    doc += `  - **Property: Client Serializer/Parser Integration**\n`;
    doc += `  - **Validates: Requirements 3**\n\n`;
    subtaskNumber++;

    doc += `- [ ]* ${clientSubtask}.${subtaskNumber} Write unit tests for client error handling\n`;
    doc += `  - Test connection failures\n`;
    doc += `  - Test timeout handling\n`;
    doc += `  - Test error message format\n`;
    doc += `  - _Requirements: 4_\n\n`;

    // Task 6: JSON Converter Implementation
    doc += `- [ ] ${taskNumber}. Implement JSON converter\n`;
    const converterSubtask = taskNumber;
    taskNumber++;

    doc += `- [ ] ${converterSubtask}.1 Create converter class with toJSON() method\n`;
    doc += `  - Convert message objects to JSON\n`;
    doc += `  - Map field names to JSON keys\n`;
    doc += `  - Handle protocol-specific types\n`;
    doc += `  - _Requirements: 1, 2_\n\n`;

    doc += `- [ ] ${converterSubtask}.2 Implement fromJSON() method\n`;
    doc += `  - Convert JSON to message objects\n`;
    doc += `  - Validate required fields\n`;
    doc += `  - Return descriptive errors for invalid JSON\n`;
    doc += `  - _Requirements: 1, 2, 4_\n\n`;

    doc += `- [ ]* ${converterSubtask}.3 Write property test for JSON round-trip\n`;
    doc += `  - **Property: JSON Conversion Round-Trip**\n`;
    doc += `  - **Validates: Requirements 1, 2**\n\n`;

    // Task 7: Test Data Generators
    doc += `- [ ] ${taskNumber}. Implement test data generators\n`;
    const generatorSubtask = taskNumber;
    taskNumber++;

    doc += `- [ ] ${generatorSubtask}.1 Create fast-check arbitraries for message types\n`;
    doc += `  - Generate random valid messages\n`;
    doc += `  - Respect field constraints\n`;
    doc += `  - Handle enums and custom types\n`;
    doc += `  - _Requirements: 5_\n\n`;

    for (let i = 0; i < data.messageTypes.length; i++) {
      const messageType = data.messageTypes[i];
      if (messageType) {
        doc += `- [ ] ${generatorSubtask}.${i + 2} Create arbitrary for ${messageType.name} messages\n`;
        doc += `  - Generate valid ${messageType.fields.map(f => f.name).join(', ')} values\n`;
        doc += `  - _Requirements: 5_\n\n`;
      }
    }

    // Task 8: CLI User Interface
    doc += `- [ ] ${taskNumber}. Implement CLI user interface\n`;
    const uiSubtask = taskNumber;
    taskNumber++;

    doc += `- [ ] ${uiSubtask}.1 Create CLI with input prompts\n`;
    doc += `  - Prompt for connection parameters (host, port)\n`;
    doc += `  - Prompt for message parameters\n`;
    doc += `  - Validate inputs\n`;
    doc += `  - _Requirements: 3_\n\n`;

    doc += `- [ ] ${uiSubtask}.2 Implement response display\n`;
    doc += `  - Format responses in human-readable form\n`;
    doc += `  - Provide JSON view option\n`;
    doc += `  - Display errors clearly\n`;
    doc += `  - _Requirements: 3, 4_\n\n`;

    doc += `- [ ]* ${uiSubtask}.3 Write unit tests for UI components\n`;
    doc += `  - Test input validation\n`;
    doc += `  - Test response formatting\n`;
    doc += `  - _Requirements: 3_\n\n`;

    // Task 9: Integration and Documentation
    doc += `- [ ] ${taskNumber}. Integration and documentation\n`;
    const integrationSubtask = taskNumber;
    taskNumber++;

    doc += `- [ ] ${integrationSubtask}.1 Create README with usage examples\n`;
    doc += `  - Document protocol description\n`;
    doc += `  - Provide usage examples\n`;
    doc += `  - Document API reference\n`;
    doc += `  - Include testing instructions\n`;
    doc += `  - _Requirements: All_\n\n`;

    doc += `- [ ]* ${integrationSubtask}.2 Write end-to-end integration tests\n`;
    doc += `  - Test full workflow: connect → send → receive → disconnect\n`;
    doc += `  - Test with real ${data.protocolName} servers if available\n`;
    doc += `  - _Requirements: All_\n\n`;

    doc += `- [ ] ${integrationSubtask}.3 Verify all tests pass\n`;
    doc += `  - Run all unit tests\n`;
    doc += `  - Run all property-based tests (100+ iterations)\n`;
    doc += `  - Ensure no failing tests\n`;
    doc += `  - _Requirements: All_\n\n`;

    return doc;
  }
}
