/**
 * Property-Based Tests for Connection Reuse
 * 
 * Feature: protocol-resurrection-machine, Property 29: Connection Reuse
 * Validates: Requirements 20.2
 * 
 * These tests verify that connections are reused for multiple requests
 * when the protocol allows persistent connections.
 */

import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { NetworkClient } from '../../src/utils/network-client.js';

describe('Connection Reuse', () => {
  beforeEach(() => {
    // Clear connection pool before each test
    NetworkClient.clearConnectionPool();
  });

  afterEach(() => {
    // Clean up after each test
    NetworkClient.clearConnectionPool();
  });

  /**
   * Feature: protocol-resurrection-machine, Property 29: Connection Reuse
   * For any protocol that allows persistent connections, the same connection
   * should be reused for multiple sequential requests
   * Validates: Requirements 20.2
   */
  test('Connection pool should reuse connections for same host:port', () => {
    const host = 'example.com';
    const port = 80;

    // Simulate getting a connection with proper mock
    const socket1 = { destroyed: false, destroy: () => {} } as any;
    NetworkClient.returnConnectionToPool(socket1, host, port);

    // Get the connection back
    const reusedSocket = NetworkClient.getPooledConnection(host, port);

    expect(reusedSocket).toBe(socket1);
    expect(reusedSocket).not.toBeNull();
  });

  /**
   * Verify connection pool isolates different hosts
   * Validates: Requirements 20.2
   */
  test('Connection pool should isolate different hosts', () => {
    const host1 = 'example.com';
    const host2 = 'different.com';
    const port = 80;

    // Add connections for different hosts
    const socket1 = { destroyed: false, destroy: () => {} } as any;
    const socket2 = { destroyed: false, destroy: () => {} } as any;

    NetworkClient.returnConnectionToPool(socket1, host1, port);
    NetworkClient.returnConnectionToPool(socket2, host2, port);

    // Get connections back
    const reused1 = NetworkClient.getPooledConnection(host1, port);
    const reused2 = NetworkClient.getPooledConnection(host2, port);

    expect(reused1).toBe(socket1);
    expect(reused2).toBe(socket2);
    expect(reused1).not.toBe(reused2);
  });

  /**
   * Verify connection pool isolates different ports
   * Validates: Requirements 20.2
   */
  test('Connection pool should isolate different ports', () => {
    const host = 'example.com';
    const port1 = 80;
    const port2 = 443;

    // Add connections for different ports
    const socket1 = { destroyed: false, destroy: () => {} } as any;
    const socket2 = { destroyed: false, destroy: () => {} } as any;

    NetworkClient.returnConnectionToPool(socket1, host, port1);
    NetworkClient.returnConnectionToPool(socket2, host, port2);

    // Get connections back
    const reused1 = NetworkClient.getPooledConnection(host, port1);
    const reused2 = NetworkClient.getPooledConnection(host, port2);

    expect(reused1).toBe(socket1);
    expect(reused2).toBe(socket2);
    expect(reused1).not.toBe(reused2);
  });

  /**
   * Verify destroyed connections are not reused
   * Validates: Requirements 20.2
   */
  test('Connection pool should not reuse destroyed connections', () => {
    const host = 'example.com';
    const port = 80;

    // Add a destroyed connection
    const socket = { destroyed: true, destroy: () => {} } as any;
    NetworkClient.returnConnectionToPool(socket, host, port);

    // Try to get it back
    const reused = NetworkClient.getPooledConnection(host, port);

    expect(reused).toBeNull();
  });

  /**
   * Verify connection pool statistics are accurate
   * Validates: Requirements 20.2
   */
  test('Connection pool statistics should be accurate', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 10 }),
        (connectionCount) => {
          // Clear pool
          NetworkClient.clearConnectionPool();

          // Add connections
          for (let i = 0; i < connectionCount; i++) {
            const socket = { destroyed: false, destroy: () => {} } as any;
            NetworkClient.returnConnectionToPool(socket, `host${i}.com`, 80);
          }

          // Check stats
          const stats = NetworkClient.getPoolStats();
          expect(stats.totalConnections).toBe(connectionCount);
          expect(stats.idleConnections).toBe(connectionCount);
          expect(stats.activeConnections).toBe(0);
          expect(stats.hosts).toBe(connectionCount);

          return true;
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Verify connection pool handles multiple connections per host
   * Validates: Requirements 20.2
   */
  test('Connection pool should handle multiple connections per host', () => {
    const host = 'example.com';
    const port = 80;

    // Add multiple connections for same host
    const socket1 = { destroyed: false, destroy: () => {} } as any;
    const socket2 = { destroyed: false, destroy: () => {} } as any;
    const socket3 = { destroyed: false, destroy: () => {} } as any;

    NetworkClient.returnConnectionToPool(socket1, host, port);
    NetworkClient.returnConnectionToPool(socket2, host, port);
    NetworkClient.returnConnectionToPool(socket3, host, port);

    // Get connections back
    const reused1 = NetworkClient.getPooledConnection(host, port);
    const reused2 = NetworkClient.getPooledConnection(host, port);
    const reused3 = NetworkClient.getPooledConnection(host, port);

    // All should be returned (order may vary)
    expect([reused1, reused2, reused3]).toContain(socket1);
    expect([reused1, reused2, reused3]).toContain(socket2);
    expect([reused1, reused2, reused3]).toContain(socket3);
  });

  /**
   * Verify connection pool clears all connections
   * Validates: Requirements 20.2
   */
  test('Connection pool should clear all connections', () => {
    // Add some connections
    for (let i = 0; i < 5; i++) {
      const socket = { destroyed: false, destroy: () => {} } as any;
      NetworkClient.returnConnectionToPool(socket, `host${i}.com`, 80);
    }

    // Verify connections exist
    let stats = NetworkClient.getPoolStats();
    expect(stats.totalConnections).toBeGreaterThan(0);

    // Clear pool
    NetworkClient.clearConnectionPool();

    // Verify all cleared
    stats = NetworkClient.getPoolStats();
    expect(stats.totalConnections).toBe(0);
    expect(stats.hosts).toBe(0);
  });

  /**
   * Property-based test: Connection reuse with random hosts and ports
   * Validates: Requirements 20.2
   */
  test('Connection pool should handle random host:port combinations', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            host: fc.domain(),
            port: fc.integer({ min: 1, max: 65535 }),
          }),
          { minLength: 1, maxLength: 20 }
        ),
        (connections) => {
          // Clear pool
          NetworkClient.clearConnectionPool();

          // Add all connections
          const sockets = new Map<string, any>();
          for (const conn of connections) {
            const key = `${conn.host}:${conn.port}`;
            if (!sockets.has(key)) {
              const socket = { destroyed: false, destroy: () => {}, key } as any;
              sockets.set(key, socket);
              NetworkClient.returnConnectionToPool(socket, conn.host, conn.port);
            }
          }

          // Verify we can get them back
          for (const conn of connections) {
            const key = `${conn.host}:${conn.port}`;
            const reused = NetworkClient.getPooledConnection(conn.host, conn.port);
            if (sockets.has(key)) {
              expect(reused).not.toBeNull();
            }
          }

          return true;
        }
      ),
      { numRuns: 50 }
    );
  });
});
