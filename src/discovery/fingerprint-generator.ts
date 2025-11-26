/**
 * Fingerprint generation from protocol specifications
 * Extracts signatures for protocol identification
 */

import type { ProtocolSpec } from '../types/protocol-spec.js';
import type {
  ProtocolFingerprint,
  Pattern,
  Probe,
  BehaviorSignature,
} from './types.js';

/**
 * Generate a fingerprint from a protocol specification
 */
export function generateFingerprint(
  spec: ProtocolSpec
): ProtocolFingerprint {
  const signatures: Pattern[] = [];
  const probes: Probe[] = [];
  const behaviorSignatures: BehaviorSignature[] = [];

  // Extract banner signatures from connection spec
  if (spec.connection.handshake?.serverResponds) {
    signatures.push({
      type: 'exact',
      value: spec.connection.handshake.serverResponds,
      weight: 0.8,
      description: 'Server banner/handshake response',
    });
  }

  // Extract response signatures from message formats
  for (const message of spec.messageTypes) {
    if (message.direction === 'response' || message.direction === 'bidirectional') {
      // For protocols with enum fields (like Gopher item types), create regex patterns
      const enumFields = message.fields.filter(f => typeof f.type === 'object' && f.type.kind === 'enum');
      if (enumFields.length > 0) {
        const enumField = enumFields[0];
        if (enumField && typeof enumField.type === 'object' && enumField.type.kind === 'enum') {
          const enumValues = enumField.type.values.join('');
          // Create regex pattern that matches lines starting with enum values
          signatures.push({
            type: 'regex',
            value: `^[${enumValues}]`,
            weight: 0.7,
            description: `${message.name} format with ${enumField.name}`,
          });
        }
      }

      // Extract fixed strings from format
      const fixedStrings = extractFixedStrings(message.format);
      for (const fixed of fixedStrings) {
        if (fixed.length > 2) {
          // Only include meaningful fixed strings
          signatures.push({
            type: 'prefix',
            value: fixed,
            weight: 0.6,
            description: `Fixed string in ${message.name} response`,
          });
        }
      }

      // For tab-delimited formats, add tab pattern
      if (message.delimiter === '\t') {
        signatures.push({
          type: 'regex',
          value: '\\t',
          weight: 0.5,
          description: `Tab-delimited ${message.name}`,
        });
      }

      // For CRLF-terminated formats, add CRLF pattern
      if (message.terminator === '\r\n') {
        signatures.push({
          type: 'regex',
          value: '\\r\\n',
          weight: 0.4,
          description: `CRLF-terminated ${message.name}`,
        });
      }
    }
  }

  // Generate probes from request messages
  for (const message of spec.messageTypes) {
    if (message.direction === 'request' || message.direction === 'bidirectional') {
      const probe = generateProbe(spec, message);
      if (probe) {
        probes.push(probe);
      }
    }
  }

  // Generate behavioral signatures
  if (spec.connection.handshake?.required) {
    behaviorSignatures.push({
      type: 'behavior',
      description: 'Requires handshake before accepting commands',
      weight: 0.7,
    });
  }

  if (spec.connection.keepAlive) {
    behaviorSignatures.push({
      type: 'behavior',
      description: 'Supports persistent connections',
      weight: 0.5,
    });
  }

  const fingerprint: ProtocolFingerprint = {
    protocol: spec.protocol.name,
    defaultPort: spec.protocol.port,
    responsePatterns: signatures,
    probes,
  };

  if (spec.connection.handshake?.clientSends) {
    fingerprint.initialHandshake = spec.connection.handshake.clientSends;
  }

  if (behaviorSignatures.length > 0) {
    fingerprint.behaviorSignatures = behaviorSignatures;
  }

  return fingerprint;
}

/**
 * Extract fixed strings from a format string
 */
function extractFixedStrings(format: string): string[] {
  const fixed: string[] = [];
  let current = '';
  let inPlaceholder = false;

  for (let i = 0; i < format.length; i++) {
    const char = format[i];

    if (char === '{') {
      if (current.length > 0) {
        fixed.push(current);
        current = '';
      }
      inPlaceholder = true;
    } else if (char === '}') {
      inPlaceholder = false;
    } else if (!inPlaceholder) {
      current += char;
    }
  }

  if (current.length > 0) {
    fixed.push(current);
  }

  return fixed;
}

/**
 * Generate a probe from a request message type
 */
function generateProbe(
  spec: ProtocolSpec,
  message: any
): Probe | null {
  // Create a minimal valid message for probing
  const payload = createMinimalMessage(message);

  if (!payload) {
    return null;
  }

  // Find corresponding response message
  const responseMessage = spec.messageTypes.find(
    (m) =>
      (m.direction === 'response' || m.direction === 'bidirectional') &&
      m.name.toLowerCase().includes(message.name.toLowerCase().replace('request', ''))
  );

  const probe: Probe = {
    name: `${spec.protocol.name.toLowerCase()}-${message.name.toLowerCase()}`,
    protocol: spec.protocol.name,
    payload: Buffer.from(payload),
    timeout: spec.connection.timeout || 5000,
  };

  if (responseMessage) {
    const fixedStrings = extractFixedStrings(responseMessage.format);
    if (fixedStrings.length > 0 && fixedStrings[0]) {
      probe.expectedResponse = {
        type: 'prefix',
        value: fixedStrings[0],
        weight: 0.7,
        description: `Expected response from ${message.name}`,
      };
    }
  }

  return probe;
}

/**
 * Create a minimal valid message for a message type
 */
function createMinimalMessage(message: any): string | null {
  let result = message.format;

  // Replace placeholders with minimal valid values
  for (const field of message.fields) {
    const placeholder = `{${field.name}}`;
    let value: string | number = '';

    // Use field type directly if it's a string, otherwise check kind
    const fieldType = typeof field.type === 'string' ? field.type : field.type.kind;

    switch (fieldType) {
      case 'string':
        value = field.defaultValue !== undefined ? String(field.defaultValue) : '';
        break;
      case 'number':
        const numType = typeof field.type === 'object' ? field.type : {};
        value = String(field.defaultValue !== undefined ? field.defaultValue : (numType.min || 0));
        break;
      case 'enum':
        const enumType = typeof field.type === 'object' ? field.type : {};
        value = (enumType.values && enumType.values[0]) || '';
        break;
      case 'boolean':
        value = field.defaultValue ? '1' : '0';
        break;
      case 'bytes':
        value = '';
        break;
      default:
        value = field.defaultValue !== undefined ? String(field.defaultValue) : '';
    }

    result = result.replace(placeholder, String(value));
  }

  // Don't add terminator here - it's already in the format string for most protocols
  // Only add if it's not already present
  if (message.terminator && !result.endsWith(message.terminator)) {
    result += message.terminator;
  }

  return result;
}

/**
 * Generate banner signature from connection spec
 */
export function generateBannerSignature(spec: ProtocolSpec): Pattern | null {
  if (spec.connection.handshake?.serverResponds) {
    return {
      type: 'exact',
      value: spec.connection.handshake.serverResponds,
      weight: 0.9,
      description: 'Server banner',
    };
  }
  return null;
}

/**
 * Generate response pattern signatures from message types
 */
export function generateResponsePatterns(spec: ProtocolSpec): Pattern[] {
  const patterns: Pattern[] = [];

  for (const message of spec.messageTypes) {
    if (message.direction === 'response' || message.direction === 'bidirectional') {
      const fixedStrings = extractFixedStrings(message.format);

      for (const fixed of fixedStrings) {
        if (fixed.length > 2) {
          patterns.push({
            type: 'prefix',
            value: fixed,
            weight: 0.6,
            description: `Pattern from ${message.name}`,
          });
        }
      }
    }
  }

  return patterns;
}

/**
 * Generate behavioral signatures from protocol spec
 */
export function generateBehavioralSignatures(
  spec: ProtocolSpec
): BehaviorSignature[] {
  const signatures: BehaviorSignature[] = [];

  if (spec.connection.handshake?.required) {
    signatures.push({
      type: 'behavior',
      description: 'Requires handshake',
      weight: 0.7,
    });
  }

  if (spec.connection.keepAlive) {
    signatures.push({
      type: 'behavior',
      description: 'Persistent connection',
      weight: 0.5,
    });
  }

  if (spec.connection.type === 'UDP') {
    signatures.push({
      type: 'behavior',
      description: 'Uses UDP protocol',
      weight: 0.8,
    });
  }

  return signatures;
}
