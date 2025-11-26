/**
 * Property-based tests for protocol discovery connection
 * Feature: prm-phase-2, Property 22: Protocol Discovery Connection Success
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  createDiscoveryEngine,
  createFingerprintDatabase,
} from '../../src/discovery/index.js';
import * as net from 'net';

/**
 * Feature: prm-phase-2, Property 22: Protocol Discovery Connection Success
 * For any reachable host:port, discovery should connect successfully,
 * send probes, and record responses
 * Validates: Requirements 16.1, 16.2, 16.3
 */
describe('Protocol Discovery Connection', () => {
  it('should connect to reachable hosts and record responses', async () => {
    // Create a simple test server
    const server = net.createServer((socket) => {
      socket.write('TEST BANNER\r\n');
      socket.on('data', (data) => {
        socket.write(`ECHO: ${data.toString()}`);
        socket.end();
      });
      // Auto-close after 500ms if no data
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
      const db = createFingerprintDatabase();
      const engine = createDiscoveryEngine(db);

      // Test with our local test server
      const result = await engine.discover('localhost', port, 2000);

      // Verify packets were recorded
      expect(result.packets.length).toBeGreaterThan(0);

      // Verify we received the banner
      const receivedPackets = result.packets.filter(
        (p) => p.direction === 'received'
      );
      expect(receivedPackets.length).toBeGreaterThan(0);
    } finally {
      server.close();
    }
  }, 20000);

  it('should handle connection failures gracefully', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          host: fc.constant('localhost'),
          port: fc.integer({ min: 50000, max: 60000 }), // Likely unused ports
        }),
        async (target) => {
          const db = createFingerprintDatabase();
          const engine = createDiscoveryEngine(db);

          const result = await engine.discover(target.host, target.port, 1000);

          // Should return a result even on failure
          expect(result).toBeDefined();
          expect(result.packets).toBeDefined();
          expect(result.confidence).toBe(0);
          expect(result.identified).toBeNull();
          expect(result.suggestions.length).toBeGreaterThan(0);

          return true;
        }
      ),
      { numRuns: 10 }
    );
  });

  it('should record probe execution', async () => {
    // Create a test server that responds to probes
    const server = net.createServer((socket) => {
      socket.write('INITIAL\r\n');
      socket.on('data', (data) => {
        if (data.toString().includes('PROBE')) {
          socket.write('PROBE_RESPONSE\r\n');
        }
        socket.end();
      });
      // Auto-close after 500ms
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
      const db = createFingerprintDatabase();
      const engine = createDiscoveryEngine(db);

      const result = await engine.discover('localhost', port, 2000);

      // Verify packets were recorded
      expect(result.packets.length).toBeGreaterThan(0);

      // Each packet should have required fields
      for (const packet of result.packets) {
        expect(packet.direction).toMatch(/^(sent|received)$/);
        expect(packet.timestamp).toBeDefined();
        expect(packet.length).toBeGreaterThanOrEqual(0);
        expect(packet.hex).toBeDefined();
      }
    } finally {
      server.close();
    }
  }, 20000);
});
