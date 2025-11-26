/**
 * Property-based tests for protocol probe generation
 * Feature: prm-phase-2, Property 24: Protocol Probe Generation
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  generateActiveProbes,
  generatePassiveProbes,
  executeProbe,
} from '../../src/discovery/index.js';
import type { ProtocolSpec } from '../../src/types/protocol-spec.js';
import * as net from 'net';

/**
 * Feature: prm-phase-2, Property 24: Protocol Probe Generation
 * For any protocol spec with handshakes, probes should be generated
 * and executable
 * Validates: Requirements 18.1, 18.2, 18.3, 18.4
 */
describe('Protocol Probe Generation', () => {
  it('should generate probes from protocol specs with handshakes', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          protocolName: fc.string({ minLength: 1, maxLength: 20 }),
          hasHandshake: fc.boolean(),
          hasRequestMessage: fc.boolean(),
        }),
        async (config) => {
          const spec: ProtocolSpec = {
            protocol: {
              name: config.protocolName,
              port: 8080,
              description: 'Test protocol',
            },
            connection: {
              type: 'TCP',
              handshake: config.hasHandshake
                ? {
                    clientSends: 'HELLO',
                    serverResponds: 'WELCOME',
                    required: true,
                  }
                : undefined,
              timeout: 5000,
            },
            messageTypes: config.hasRequestMessage
              ? [
                  {
                    name: 'TestRequest',
                    direction: 'request',
                    format: 'GET {path}\r\n',
                    fields: [
                      {
                        name: 'path',
                        type: { kind: 'string' },
                        required: true,
                      },
                    ],
                    terminator: '\r\n',
                  },
                ]
              : [],
          };

          // Generate active probes
          const activeProbes = generateActiveProbes(spec);

          // Should generate probes if there are request messages or handshake
          if (config.hasRequestMessage || config.hasHandshake) {
            expect(activeProbes.length).toBeGreaterThan(0);
          }

          // Verify probe structure
          for (const probe of activeProbes) {
            expect(probe.name).toBeDefined();
            expect(probe.protocol).toBe(config.protocolName);
            expect(probe.payload).toBeInstanceOf(Buffer);
            expect(probe.timeout).toBeGreaterThan(0);
          }

          // Generate passive probes
          const passiveProbes = generatePassiveProbes(spec);

          // Should generate passive probes if there's a handshake
          if (config.hasHandshake) {
            expect(passiveProbes.length).toBeGreaterThan(0);
          }

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should generate executable probes', async () => {
    // Create a test server
    const server = net.createServer((socket) => {
      socket.write('RESPONSE\r\n');
      socket.on('data', () => {
        socket.write('OK\r\n');
        socket.end();
      });
      setTimeout(() => {
        if (!socket.destroyed) {
          socket.end();
        }
      }, 500);
    });

    await new Promise<void>((resolve) => {
      server.listen(0, () => resolve());
    });

    const address = server.address();
    if (!address || typeof address === 'string') {
      server.close();
      throw new Error('Failed to get server address');
    }

    const port = address.port;

    try {
      const spec: ProtocolSpec = {
        protocol: {
          name: 'TestProtocol',
          port,
          description: 'Test',
        },
        connection: {
          type: 'TCP',
          timeout: 5000,
        },
        messageTypes: [
          {
            name: 'TestRequest',
            direction: 'request',
            format: 'TEST\r\n',
            fields: [],
            terminator: '\r\n',
          },
        ],
      };

      const probes = generateActiveProbes(spec);
      expect(probes.length).toBeGreaterThan(0);

      // Execute the first probe
      const result = await executeProbe('localhost', port, probes[0]);

      // Verify result structure
      expect(result.probe).toBeDefined();
      expect(result.protocol).toBe('TestProtocol');
      expect(result.response).toBeDefined();
      expect(result.timestamp).toBeGreaterThan(0);
    } finally {
      server.close();
    }
  }, 20000);

  it('should generate probes with correct payload format', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          fieldValue: fc.string({ minLength: 0, maxLength: 50 }),
          terminator: fc.constantFrom('\r\n', '\n', ''),
        }),
        async (config) => {
          const spec: ProtocolSpec = {
            protocol: {
              name: 'TestProtocol',
              port: 8080,
              description: 'Test',
            },
            connection: {
              type: 'TCP',
              timeout: 5000,
            },
            messageTypes: [
              {
                name: 'TestRequest',
                direction: 'request',
                format: 'CMD {value}' + config.terminator,
                fields: [
                  {
                    name: 'value',
                    type: { kind: 'string' },
                    required: true,
                    defaultValue: config.fieldValue,
                  },
                ],
                terminator: config.terminator,
              },
            ],
          };

          const probes = generateActiveProbes(spec);

          if (probes.length > 0) {
            const probe = probes[0];
            const payloadStr = probe.payload.toString();

            // Verify payload contains the expected format
            expect(payloadStr).toContain('CMD');

            // Verify terminator is included if specified
            if (config.terminator) {
              expect(payloadStr).toContain(config.terminator);
            }
          }

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle protocols with multiple message types', async () => {
    const spec: ProtocolSpec = {
      protocol: {
        name: 'MultiMessageProtocol',
        port: 8080,
        description: 'Protocol with multiple messages',
      },
      connection: {
        type: 'TCP',
        timeout: 5000,
      },
      messageTypes: [
        {
          name: 'GetRequest',
          direction: 'request',
          format: 'GET {path}\r\n',
          fields: [
            {
              name: 'path',
              type: { kind: 'string' },
              required: true,
            },
          ],
          terminator: '\r\n',
        },
        {
          name: 'PostRequest',
          direction: 'request',
          format: 'POST {path}\r\n',
          fields: [
            {
              name: 'path',
              type: { kind: 'string' },
              required: true,
            },
          ],
          terminator: '\r\n',
        },
        {
          name: 'Response',
          direction: 'response',
          format: 'OK\r\n',
          fields: [],
          terminator: '\r\n',
        },
      ],
    };

    const probes = generateActiveProbes(spec);

    // Should generate probes for request messages
    expect(probes.length).toBeGreaterThanOrEqual(2);

    // Verify each probe has unique name
    const names = probes.map((p) => p.name);
    const uniqueNames = new Set(names);
    expect(uniqueNames.size).toBe(names.length);
  });
});
