/**
 * Network Client Utilities
 * Provides enhanced network operations with retry logic and error recovery
 */

import * as net from 'net';
import { NetworkError } from '../types/errors.js';
import { retryNetworkOperation, type RetryOptions } from './retry.js';

/**
 * Connection options
 */
export interface ConnectionOptions {
  /** Server hostname */
  host: string;
  /** Server port */
  port: number;
  /** Connection timeout in milliseconds (default: 10000) */
  timeout?: number;
  /** Whether to enable retry logic (default: true) */
  enableRetry?: boolean;
  /** Retry options */
  retryOptions?: RetryOptions;
}

/**
 * Connection result
 */
export interface ConnectionResult {
  /** Whether connection succeeded */
  success: boolean;
  /** Socket if successful */
  socket?: net.Socket;
  /** Error if failed */
  error?: NetworkError;
}

/**
 * Send and receive result
 */
export interface SendReceiveResult {
  /** Whether operation succeeded */
  success: boolean;
  /** Response data if successful */
  data?: Buffer;
  /** Error if failed */
  error?: NetworkError;
}

/**
 * Connection pool entry
 */
interface PooledConnection {
  /** Socket */
  socket: net.Socket;
  /** Host */
  host: string;
  /** Port */
  port: number;
  /** Last used timestamp */
  lastUsed: number;
  /** Whether connection is currently in use */
  inUse: boolean;
}

/**
 * Enhanced network client with retry logic, error recovery, and connection pooling
 */
export class NetworkClient {
  /** Connection pool */
  private static connectionPool: Map<string, PooledConnection[]> = new Map();
  
  /** Maximum connections per host:port */
  private static maxConnectionsPerHost = 5;
  
  /** Connection idle timeout in milliseconds */
  private static idleTimeout = 60000; // 1 minute
  
  /** Cleanup interval handle */
  private static cleanupInterval: NodeJS.Timeout | null = null;
  /**
   * Connect to a server with retry logic
   * @param options - Connection options
   * @returns Connection result
   */
  static async connect(options: ConnectionOptions): Promise<ConnectionResult> {
    const { host, port, timeout = 10000, enableRetry = true, retryOptions = {} } = options;

    const connectOperation = async (): Promise<net.Socket> => {
      return new Promise((resolve, reject) => {
        const socket = net.createConnection({ host, port, timeout });

        socket.on('connect', () => {
          resolve(socket);
        });

        socket.on('error', (err) => {
          reject(
            new NetworkError(
              `Failed to connect to ${host}:${port}: ${err.message}`,
              'connect',
              'disconnected',
              { host, port, originalError: err }
            )
          );
        });

        socket.on('timeout', () => {
          socket.destroy();
          reject(
            new NetworkError(
              `Connection timeout to ${host}:${port}`,
              'connect',
              'timeout',
              { host, port, timeout }
            )
          );
        });
      });
    };

    if (enableRetry) {
      const result = await retryNetworkOperation(connectOperation, {
        maxAttempts: 3,
        initialDelay: 1000,
        ...retryOptions,
        onRetry: (attempt, error, delay) => {
          console.warn(`Connection attempt ${attempt} failed, retrying in ${delay}ms...`);
          if (retryOptions.onRetry) {
            retryOptions.onRetry(attempt, error, delay);
          }
        },
      });

      if (result.success && result.data) {
        return {
          success: true,
          socket: result.data,
        };
      } else {
        return {
          success: false,
          error: result.error as NetworkError,
        };
      }
    } else {
      try {
        const socket = await connectOperation();
        return {
          success: true,
          socket,
        };
      } catch (error) {
        return {
          success: false,
          error: error as NetworkError,
        };
      }
    }
  }

  /**
   * Send data and receive response with error recovery
   * @param socket - Connected socket
   * @param data - Data to send
   * @param options - Options
   * @returns Send/receive result
   */
  static async sendAndReceive(
    socket: net.Socket,
    data: Buffer,
    options: {
      /** Timeout for receiving response in milliseconds (default: 30000) */
      receiveTimeout?: number;
      /** Whether to close socket after receiving (default: true) */
      closeAfter?: boolean;
    } = {}
  ): Promise<SendReceiveResult> {
    const { receiveTimeout = 30000, closeAfter = true } = options;

    return new Promise((resolve) => {
      let responseData = Buffer.alloc(0);
      let timeoutHandle: NodeJS.Timeout | undefined;
      let resolved = false;

      const cleanup = () => {
        if (timeoutHandle) {
          clearTimeout(timeoutHandle);
        }
        if (closeAfter && !socket.destroyed) {
          socket.destroy();
        }
      };

      const resolveOnce = (result: SendReceiveResult) => {
        if (!resolved) {
          resolved = true;
          cleanup();
          resolve(result);
        }
      };

      // Set up timeout
      timeoutHandle = setTimeout(() => {
        resolveOnce({
          success: false,
          error: new NetworkError(
            'Receive timeout',
            'receive',
            'timeout',
            { timeout: receiveTimeout }
          ),
        });
      }, receiveTimeout);

      // Handle incoming data
      socket.on('data', (chunk) => {
        responseData = Buffer.concat([responseData, chunk]);
      });

      // Handle connection end
      socket.on('end', () => {
        resolveOnce({
          success: true,
          data: responseData,
        });
      });

      // Handle errors
      socket.on('error', (err) => {
        resolveOnce({
          success: false,
          error: new NetworkError(
            `Socket error: ${err.message}`,
            'receive',
            'error',
            { originalError: err }
          ),
        });
      });

      // Send data
      try {
        socket.write(data, (err) => {
          if (err) {
            resolveOnce({
              success: false,
              error: new NetworkError(
                `Failed to send data: ${err.message}`,
                'send',
                'error',
                { originalError: err }
              ),
            });
          }
        });
      } catch (err) {
        resolveOnce({
          success: false,
          error: new NetworkError(
            `Failed to send data: ${err instanceof Error ? err.message : String(err)}`,
            'send',
            'error',
            { originalError: err }
          ),
        });
      }
    });
  }

  /**
   * Connect, send, and receive in one operation with full error recovery
   * @param options - Connection options
   * @param data - Data to send
   * @param receiveOptions - Receive options
   * @returns Send/receive result
   */
  static async connectSendReceive(
    options: ConnectionOptions,
    data: Buffer,
    receiveOptions?: Parameters<typeof NetworkClient.sendAndReceive>[2]
  ): Promise<SendReceiveResult> {
    // Connect with retry
    const connectionResult = await NetworkClient.connect(options);

    if (!connectionResult.success || !connectionResult.socket) {
      return {
        success: false,
        error: connectionResult.error,
      };
    }

    // Send and receive
    const result = await NetworkClient.sendAndReceive(
      connectionResult.socket,
      data,
      receiveOptions
    );

    return result;
  }

  /**
   * Gracefully close a socket
   * @param socket - Socket to close
   * @param timeout - Timeout for graceful close in milliseconds (default: 5000)
   */
  static async close(socket: net.Socket, timeout: number = 5000): Promise<void> {
    return new Promise((resolve) => {
      if (socket.destroyed) {
        resolve();
        return;
      }

      const timeoutHandle = setTimeout(() => {
        if (!socket.destroyed) {
          socket.destroy();
        }
        resolve();
      }, timeout);

      socket.end(() => {
        clearTimeout(timeoutHandle);
        resolve();
      });
    });
  }

  /**
   * Get a connection key for pooling
   * @param host - Host
   * @param port - Port
   * @returns Connection key
   */
  private static getConnectionKey(host: string, port: number): string {
    return `${host}:${port}`;
  }

  /**
   * Get a pooled connection if available
   * @param host - Host
   * @param port - Port
   * @returns Pooled connection or null
   */
  static getPooledConnection(host: string, port: number): net.Socket | null {
    const key = this.getConnectionKey(host, port);
    const connections = this.connectionPool.get(key);

    if (!connections || connections.length === 0) {
      return null;
    }

    // Find an available connection
    const now = Date.now();
    for (const conn of connections) {
      if (!conn.inUse && !conn.socket.destroyed) {
        // Check if connection is still alive
        if (now - conn.lastUsed < this.idleTimeout) {
          conn.inUse = true;
          conn.lastUsed = now;
          return conn.socket;
        } else {
          // Connection is too old, remove it
          conn.socket.destroy();
          connections.splice(connections.indexOf(conn), 1);
        }
      }
    }

    return null;
  }

  /**
   * Return a connection to the pool
   * @param socket - Socket to return
   * @param host - Host
   * @param port - Port
   */
  static returnConnectionToPool(socket: net.Socket, host: string, port: number): void {
    if (socket.destroyed) {
      return;
    }

    const key = this.getConnectionKey(host, port);
    let connections = this.connectionPool.get(key);

    if (!connections) {
      connections = [];
      this.connectionPool.set(key, connections);
    }

    // Find existing connection entry
    const existing = connections.find((c) => c.socket === socket);
    if (existing) {
      existing.inUse = false;
      existing.lastUsed = Date.now();
    } else {
      // Add new connection to pool if under limit
      if (connections.length < this.maxConnectionsPerHost) {
        connections.push({
          socket,
          host,
          port,
          lastUsed: Date.now(),
          inUse: false,
        });
      } else {
        // Pool is full, close the connection
        socket.destroy();
      }
    }

    // Start cleanup interval if not already running
    if (!this.cleanupInterval) {
      this.startCleanupInterval();
    }
  }

  /**
   * Connect with connection pooling support
   * @param options - Connection options
   * @param usePool - Whether to use connection pooling (default: true)
   * @returns Connection result
   */
  static async connectWithPool(
    options: ConnectionOptions,
    usePool: boolean = true
  ): Promise<ConnectionResult> {
    const { host, port } = options;

    // Try to get a pooled connection
    if (usePool) {
      const pooledSocket = this.getPooledConnection(host, port);
      if (pooledSocket) {
        return {
          success: true,
          socket: pooledSocket,
        };
      }
    }

    // No pooled connection available, create new one
    return this.connect(options);
  }

  /**
   * Send and receive with connection pooling support
   * @param socket - Connected socket
   * @param data - Data to send
   * @param host - Host (for returning to pool)
   * @param port - Port (for returning to pool)
   * @param options - Options
   * @returns Send/receive result
   */
  static async sendAndReceiveWithPool(
    socket: net.Socket,
    data: Buffer,
    host: string,
    port: number,
    options: {
      /** Timeout for receiving response in milliseconds (default: 30000) */
      receiveTimeout?: number;
      /** Whether to return connection to pool after receiving (default: true) */
      returnToPool?: boolean;
    } = {}
  ): Promise<SendReceiveResult> {
    const { receiveTimeout = 30000, returnToPool = true } = options;

    const result = await this.sendAndReceive(socket, data, {
      receiveTimeout,
      closeAfter: false, // Don't close, we'll handle it
    });

    // Return to pool or close
    if (returnToPool && result.success && !socket.destroyed) {
      this.returnConnectionToPool(socket, host, port);
    } else {
      if (!socket.destroyed) {
        socket.destroy();
      }
    }

    return result;
  }

  /**
   * Connect, send, and receive with connection pooling
   * @param options - Connection options
   * @param data - Data to send
   * @param receiveOptions - Receive options
   * @param usePool - Whether to use connection pooling (default: true)
   * @returns Send/receive result
   */
  static async connectSendReceiveWithPool(
    options: ConnectionOptions,
    data: Buffer,
    receiveOptions?: {
      receiveTimeout?: number;
      returnToPool?: boolean;
    },
    usePool: boolean = true
  ): Promise<SendReceiveResult> {
    const { host, port } = options;

    // Connect with pooling
    const connectionResult = await this.connectWithPool(options, usePool);

    if (!connectionResult.success || !connectionResult.socket) {
      return {
        success: false,
        error: connectionResult.error,
      };
    }

    // Send and receive with pooling
    const result = await this.sendAndReceiveWithPool(
      connectionResult.socket,
      data,
      host,
      port,
      receiveOptions
    );

    return result;
  }

  /**
   * Start cleanup interval to remove idle connections
   */
  private static startCleanupInterval(): void {
    if (this.cleanupInterval) {
      return;
    }

    this.cleanupInterval = setInterval(() => {
      this.cleanupIdleConnections();
    }, 30000); // Run every 30 seconds

    // Don't keep process alive for cleanup
    if (this.cleanupInterval.unref) {
      this.cleanupInterval.unref();
    }
  }

  /**
   * Clean up idle connections
   */
  private static cleanupIdleConnections(): void {
    const now = Date.now();

    for (const [key, connections] of this.connectionPool.entries()) {
      // Remove idle connections
      const toRemove: number[] = [];
      for (let i = 0; i < connections.length; i++) {
        const conn = connections[i];
        if (!conn.inUse && (conn.socket.destroyed || now - conn.lastUsed > this.idleTimeout)) {
          if (!conn.socket.destroyed) {
            conn.socket.destroy();
          }
          toRemove.push(i);
        }
      }

      // Remove in reverse order to maintain indices
      for (let i = toRemove.length - 1; i >= 0; i--) {
        connections.splice(toRemove[i], 1);
      }

      // Remove empty pools
      if (connections.length === 0) {
        this.connectionPool.delete(key);
      }
    }

    // Stop cleanup if no connections left
    if (this.connectionPool.size === 0 && this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Clear all pooled connections
   */
  static clearConnectionPool(): void {
    for (const connections of this.connectionPool.values()) {
      for (const conn of connections) {
        if (!conn.socket.destroyed) {
          conn.socket.destroy();
        }
      }
    }
    this.connectionPool.clear();

    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Get connection pool statistics
   * @returns Pool statistics
   */
  static getPoolStats(): {
    totalConnections: number;
    activeConnections: number;
    idleConnections: number;
    hosts: number;
  } {
    let total = 0;
    let active = 0;
    let idle = 0;

    for (const connections of this.connectionPool.values()) {
      for (const conn of connections) {
        if (!conn.socket.destroyed) {
          total++;
          if (conn.inUse) {
            active++;
          } else {
            idle++;
          }
        }
      }
    }

    return {
      totalConnections: total,
      activeConnections: active,
      idleConnections: idle,
      hosts: this.connectionPool.size,
    };
  }
}
