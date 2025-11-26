/**
 * Example usage of core types to verify they work correctly
 * This file demonstrates that all required types are properly defined
 */

import type {
  ProtocolSpec,
  MessageType,
  TypeDefinition,
} from './protocol-spec.js';

// Example: Gopher Protocol Specification
export const gopherProtocolSpec: ProtocolSpec = {
  protocol: {
    name: 'Gopher',
    rfc: '1436',
    port: 70,
    description: 'The Gopher protocol for distributed document search and retrieval',
    version: '1.0',
  },
  connection: {
    type: 'TCP',
    timeout: 30000,
    keepAlive: false,
  },
  messageTypes: [
    {
      name: 'Request',
      direction: 'request',
      format: '{selector}\\r\\n',
      fields: [
        {
          name: 'selector',
          type: { kind: 'string', maxLength: 255 },
          required: true,
        },
      ],
      terminator: '\\r\\n',
    },
    {
      name: 'DirectoryItem',
      direction: 'response',
      format: '{type}{display}\\t{selector}\\t{host}\\t{port}\\r\\n',
      fields: [
        {
          name: 'type',
          type: { kind: 'enum', values: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'g', 'I', 'h'] },
          required: true,
        },
        {
          name: 'display',
          type: { kind: 'string' },
          required: true,
        },
        {
          name: 'selector',
          type: { kind: 'string' },
          required: true,
        },
        {
          name: 'host',
          type: { kind: 'string' },
          required: true,
        },
        {
          name: 'port',
          type: { kind: 'number', min: 1, max: 65535 },
          required: true,
        },
      ],
      delimiter: '\\t',
      terminator: '\\r\\n',
    },
  ],
  types: [
    {
      name: 'GopherItemType',
      kind: 'enum',
      values: [
        { name: 'TextFile', value: '0', description: 'Text file' },
        { name: 'Directory', value: '1', description: 'Directory' },
        { name: 'CSO', value: '2', description: 'CSO phone-book server' },
        { name: 'Error', value: '3', description: 'Error' },
        { name: 'BinHex', value: '4', description: 'BinHexed Macintosh file' },
        { name: 'DOSArchive', value: '5', description: 'DOS binary archive' },
        { name: 'UUEncoded', value: '6', description: 'UNIX uuencoded file' },
        { name: 'Search', value: '7', description: 'Index-Search server' },
        { name: 'Telnet', value: '8', description: 'Telnet session' },
        { name: 'Binary', value: '9', description: 'Binary file' },
        { name: 'GIF', value: 'g', description: 'GIF format graphics file' },
        { name: 'Image', value: 'I', description: 'Image file' },
        { name: 'HTML', value: 'h', description: 'HTML file' },
      ],
    },
  ],
  errorHandling: {
    onParseError: 'return',
    onNetworkError: 'retry',
    retryAttempts: 3,
    retryDelay: 1000,
  },
};

// Example: Finger Protocol Specification
export const fingerProtocolSpec: ProtocolSpec = {
  protocol: {
    name: 'Finger',
    rfc: '1288',
    port: 79,
    description: 'The Finger user information protocol',
  },
  connection: {
    type: 'TCP',
    timeout: 10000,
  },
  messageTypes: [
    {
      name: 'Request',
      direction: 'request',
      format: '{username}\\r\\n',
      fields: [
        {
          name: 'username',
          type: { kind: 'string', maxLength: 64 },
          required: false,
          defaultValue: '',
        },
      ],
      terminator: '\\r\\n',
    },
    {
      name: 'Response',
      direction: 'response',
      format: '{text}',
      fields: [
        {
          name: 'text',
          type: { kind: 'string' },
          required: true,
        },
      ],
    },
  ],
};

// Example: Demonstrating all field types
export const allFieldTypesExample: MessageType = {
  name: 'ExampleMessage',
  direction: 'bidirectional',
  format: '{stringField}|{numberField}|{boolField}|{enumField}|{bytesField}',
  fields: [
    {
      name: 'stringField',
      type: { kind: 'string', maxLength: 100 },
      required: true,
      validation: {
        pattern: '^[a-zA-Z0-9]+$',
        minLength: 1,
        maxLength: 100,
      },
    },
    {
      name: 'numberField',
      type: { kind: 'number', min: 0, max: 999 },
      required: true,
      validation: {
        min: 0,
        max: 999,
      },
    },
    {
      name: 'boolField',
      type: { kind: 'boolean' },
      required: true,
    },
    {
      name: 'enumField',
      type: { kind: 'enum', values: ['option1', 'option2', 'option3'] },
      required: true,
    },
    {
      name: 'bytesField',
      type: { kind: 'bytes', length: 16 },
      required: false,
      defaultValue: new Uint8Array(16),
    },
  ],
  delimiter: '|',
};

// Example: Struct type definition
export const structExample: TypeDefinition = {
  name: 'Address',
  kind: 'struct',
  fields: [
    {
      name: 'street',
      type: { kind: 'string' },
      required: true,
    },
    {
      name: 'city',
      type: { kind: 'string' },
      required: true,
    },
    {
      name: 'zipCode',
      type: { kind: 'string', maxLength: 10 },
      required: true,
      validation: {
        pattern: '^\\d{5}(-\\d{4})?$',
      },
    },
  ],
};
