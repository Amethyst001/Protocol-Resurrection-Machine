/**
 * Probe generation for protocol discovery
 * Creates active and passive probes from protocol specifications
 */

import type { ProtocolSpec } from '../types/protocol-spec.js';
import type { Probe, Pattern, ProbeResult } from './types.js';
import * as net from 'net';

/**
 * Generate active probes from a protocol specification
 */
export function generateActiveProbes(spec: ProtocolSpec): Probe[] {
  const probes: Probe[] = [];

  // Generate probes from request messages
  for (const message of spec.messageTypes) {
    if (message.direction === 'request' || message.direction === 'bidirectional') {
      const probe = createProbeFromMessage(spec, message);
      if (probe) {
        probes.push(probe);
      }
    }
  }

  // Add empty probe (useful for banner detection)
  if (spec.connection.handshake?.serverResponds) {
    probes.push({
      name: `${spec.protocol.name.toLowerCase()}-empty`,
      protocol: spec.protocol.name,
      payload: Buffer.from(''),
      timeout: spec.connection.timeout || 3000,
    });
  }

  // Add CRLF probe (common for text protocols)
  if (isTextProtocol(spec)) {
    probes.push({
      name: `${spec.protocol.name.toLowerCase()}-crlf`,
      protocol: spec.protocol.name,
      payload: Buffer.from('\r\n'),
      timeout: spec.connection.timeout || 3000,
    });
  }

  return probes;
}

/**
 * Generate passive probes for banner detection
 */
export function generatePassiveProbes(spec: ProtocolSpec): Probe[] {
  const probes: Probe[] = [];

  // Passive probe: just connect and wait for banner
  if (spec.connection.handshake?.serverResponds) {
    const expectedPattern: Pattern = {
      type: 'prefix',
      value: spec.connection.handshake.serverResponds,
      weight: 0.9,
    };

    probes.push({
      name: `${spec.protocol.name.toLowerCase()}-banner`,
      protocol: spec.protocol.name,
      payload: Buffer.from(''), // Empty payload for passive detection
      expectedResponse: expectedPattern,
      timeout: 2000, // Shorter timeout for passive detection
    });
  }

  return probes;
}

/**
 * Create a probe from a message type
 */
function createProbeFromMessage(
  spec: ProtocolSpec,
  message: any
): Probe | null {
  const payload = buildMessagePayload(message);

  if (!payload) {
    return null;
  }

  // Find corresponding response message
  const responseMessage = findResponseMessage(spec, message);
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
      };
    }
  }

  return probe;
}

/**
 * Build a message payload from a message type
 */
function buildMessagePayload(message: any): string | null {
  let result = message.format;

  // Replace placeholders with minimal valid values
  for (const field of message.fields) {
    const placeholder = `{${field.name}}`;
    let value = getMinimalFieldValue(field);

    result = result.replace(placeholder, value);
  }

  // Add terminator if specified
  if (message.terminator) {
    result += message.terminator;
  }

  return result;
}

/**
 * Get minimal valid value for a field
 */
function getMinimalFieldValue(field: any): string {
  if (field.defaultValue !== undefined) {
    return String(field.defaultValue);
  }

  switch (field.type.kind) {
    case 'string':
      return '';
    case 'number':
      return String(field.type.min || 0);
    case 'enum':
      return field.type.values[0] || '';
    case 'boolean':
      return '0';
    case 'bytes':
      return '';
    default:
      return '';
  }
}

/**
 * Find the response message for a request message
 */
function findResponseMessage(spec: ProtocolSpec, requestMessage: any): any {
  const requestName = requestMessage.name.toLowerCase().replace('request', '');

  return spec.messageTypes.find(
    (m) =>
      (m.direction === 'response' || m.direction === 'bidirectional') &&
      (m.name.toLowerCase().includes(requestName) ||
        m.name.toLowerCase().replace('response', '') === requestName)
  );
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
 * Check if a protocol is text-based
 */
function isTextProtocol(spec: ProtocolSpec): boolean {
  // Check if messages use text terminators
  return spec.messageTypes.some(
    (m) => m.terminator === '\r\n' || m.terminator === '\n'
  );
}

/**
 * Execute a probe against a target
 */
export async function executeProbe(
  host: string,
  port: number,
  probe: Probe
): Promise<ProbeResult> {
  return new Promise((resolve) => {
    const startTime = Date.now();
    let responseData = '';

    const socket = net.createConnection({ host, port }, () => {
      // Connection established, send probe
      socket.write(probe.payload);
    });

    socket.setTimeout(probe.timeout);

    socket.on('data', (data) => {
      responseData += data.toString();
    });

    socket.on('timeout', () => {
      socket.destroy();
      resolve({
        probe: probe.name,
        protocol: probe.protocol,
        matches: false,
        response: responseData,
        timestamp: Date.now() - startTime,
      });
    });

    socket.on('error', () => {
      resolve({
        probe: probe.name,
        protocol: probe.protocol,
        matches: false,
        response: responseData,
        timestamp: Date.now() - startTime,
      });
    });

    socket.on('end', () => {
      const matches = probe.expectedResponse
        ? matchesPattern(responseData, probe.expectedResponse)
        : responseData.length > 0;

      resolve({
        probe: probe.name,
        protocol: probe.protocol,
        matches,
        response: responseData,
        timestamp: Date.now() - startTime,
      });
    });

    // Close connection after a short delay to allow response
    setTimeout(() => {
      if (!socket.destroyed) {
        socket.end();
      }
    }, Math.min(probe.timeout, 1000));
  });
}

/**
 * Check if response matches a pattern
 */
function matchesPattern(response: string, pattern: Pattern): boolean {
  switch (pattern.type) {
    case 'exact':
      return response === pattern.value;

    case 'prefix':
      return response.startsWith(pattern.value as string);

    case 'regex':
      try {
        const regex = new RegExp(pattern.value as string);
        return regex.test(response);
      } catch {
        return false;
      }

    case 'length':
      return response.length === pattern.value;

    default:
      return false;
  }
}

/**
 * Execute multiple probes in parallel
 */
export async function executeProbesParallel(
  host: string,
  port: number,
  probes: Probe[]
): Promise<ProbeResult[]> {
  const promises = probes.map((probe) => executeProbe(host, port, probe));
  return Promise.all(promises);
}

/**
 * Execute multiple probes sequentially
 */
export async function executeProbesSequential(
  host: string,
  port: number,
  probes: Probe[]
): Promise<ProbeResult[]> {
  const results: ProbeResult[] = [];

  for (const probe of probes) {
    const result = await executeProbe(host, port, probe);
    results.push(result);

    // Stop if we got a match
    if (result.matches) {
      break;
    }
  }

  return results;
}
