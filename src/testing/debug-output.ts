/**
 * Generated Client for Demo Chat Protocol
 * RFC: demo-chat
 * Port: 8080
 *
 * This file is auto-generated. Do not edit manually.
 * Regenerate using: protocol-resurrection-machine generate demo-chat.yaml
 */

import { Socket } from 'net';
import { EventEmitter } from 'events';
import { DemoChatParser } from './demo-chat-parser.js';
import { DemoChatSerializer } from './demo-chat-serializer.js';


/**
 * Base error class for Demo Chat protocol errors
 */
export class DemoChatError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: any
  ) {
    super(message);
    this.name = 'DemoChatError';
  }
}

/**
 * Connection error
 */
export class DemoChatConnectionError extends DemoChatError {
  constructor(message: string, details?: any) {
    super(message, 'CONNECTION_ERROR', details);
    this.name = 'DemoChatConnectionError';
  }
}

/**
 * Timeout error
 */
export class DemoChatTimeoutError extends DemoChatError {
  constructor(message: string, details?: any) {
    super(message, 'TIMEOUT_ERROR', details);
    this.name = 'DemoChatTimeoutError';
  }
}

/**
 * Parse error
 */
export class DemoChatParseError extends DemoChatError {
  constructor(message: string, details?: any) {
    super(message, 'PARSE_ERROR', details);
    this.name = 'DemoChatParseError';
  }
}

/**
 * Protocol error
 */
export class DemoChatProtocolError extends DemoChatError {
  constructor(message: string, details?: any) {
    super(message, 'PROTOCOL_ERROR', details);
    this.name = 'DemoChatProtocolError';
  }
}

/**
 * Connection pool for managing Demo Chat connections
 */
export class DemoChatConnectionPool {
  private connections: Map<string, Socket> = new Map();
  private maxConnections: number = 10;

  /**
   * Get or create a connection to a host
   *
   * @param host - Server hostname
   * @param port - Server port (default: 8080)
   * @returns Socket connection
   */
  async getConnection(host: string, port: number = 8080): Promise<Socket> {
    const key = `${host}:${port}`;

    // Check if we have an existing connection
    const existing = this.connections.get(key);
    if (existing && !existing.destroyed) {
      return existing;
    }

    // Create new connection
    const socket = new Socket();

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        socket.destroy();
        reject(new DemoChatTimeoutError(`Connection timeout to ${host}:${port}`));
      }, 30000);

      socket.connect(port, host, () => {
        clearTimeout(timeout);
        this.connections.set(key, socket);
        resolve(socket);
      });

      socket.on('error', (error) => {
        clearTimeout(timeout);
        reject(new DemoChatConnectionError(`Connection failed: ${error.message}`, { error }));
      });
    });
  }

  /**
   * Close a connection
   *
   * @param host - Server hostname
   * @param port - Server port
   */
  closeConnection(host: string, port: number = 8080): void {
    const key = `${host}:${port}`;
    const socket = this.connections.get(key);

    if (socket) {
      socket.destroy();
      this.connections.delete(key);
    }
  }

  /**
   * Close all connections
   */
  closeAll(): void {
    for (const socket of this.connections.values()) {
      socket.destroy();
    }
    this.connections.clear();
  }
}

/**
 * Client for Demo Chat protocol
 *
 * Provides Promise-based async methods for protocol operations
 */
export class DemoChatClient extends EventEmitter {
  private parser: DemoChatParser;
  private serializer: DemoChatSerializer;
  private pool: DemoChatConnectionPool;
  private defaultTimeout: number = 30000;

  constructor() {
    super();
    this.parser = new DemoChatParser();
    this.serializer = new DemoChatSerializer();
    this.pool = new DemoChatConnectionPool();
  }

  /**
   * Set default timeout for operations
   *
   * @param timeout - Timeout in milliseconds
   */
  setTimeout(timeout: number): void {
    this.defaultTimeout = timeout;
  }

  /**
   * Connect to a Demo Chat server
   *
   * @param host - Server hostname
   * @param port - Server port (default: 8080)
   * @returns Promise that resolves when connected
   */
  async connect(host: string, port: number = 8080): Promise<void> {
    await this.pool.getConnection(host, port);
    this.emit('connected', { host, port });
  }

  /**
   * Disconnect from a server
   *
   * @param host - Server hostname
   * @param port - Server port
   */
  disconnect(host: string, port: number = 8080): void {
    this.pool.closeConnection(host, port);
    this.emit('disconnected', { host, port });
  }

  /**
   * Close all connections
   */
  close(): void {
    this.pool.closeAll();
    this.emit('closed');
  }


  /**
   * Send a Login message
   *
   * @param host - Server hostname
   * @param port - Server port
   * @param message - Message to send
   * @returns Promise with response
   */
  async login(
    host: string,
    port: number = 8080,
    message: Login
  ): Promise<Buffer> {
    // Get connection
    const socket = await this.pool.getConnection(host, port);

    // Serialize message
    const serializeResult = this.serializer.login.serialize(message);
    if (!serializeResult.success || !serializeResult.data) {
      throw new DemoChatProtocolError(
        `Failed to serialize Login: ${serializeResult.error?.message}`,
        serializeResult.error
      );
    }

    // Send message and wait for response
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new DemoChatTimeoutError(`Login request timeout`));
      }, this.defaultTimeout);

      const chunks: Buffer[] = [];

      const onData = (data: Buffer) => {
        chunks.push(data);
        // For simplicity, assume response is complete
        // In practice, you'd check for message terminator
        clearTimeout(timeout);
        socket.off('data', onData);
        socket.off('error', onError);
        resolve(Buffer.concat(chunks));
      };

      const onError = (error: Error) => {
        clearTimeout(timeout);
        socket.off('data', onData);
        socket.off('error', onError);
        reject(new DemoChatConnectionError(`Socket error: ${error.message}`, { error }));
      };

      socket.on('data', onData);
      socket.on('error', onError);
      socket.write(serializeResult.data);
    });
  }

  /**
   * Send a Message message
   *
   * @param host - Server hostname
   * @param port - Server port
   * @param message - Message to send
   * @returns Promise with response
   */
  async message(
    host: string,
    port: number = 8080,
    message: Message
  ): Promise<Buffer> {
    // Get connection
    const socket = await this.pool.getConnection(host, port);

    // Serialize message
    const serializeResult = this.serializer.message.serialize(message);
    if (!serializeResult.success || !serializeResult.data) {
      throw new DemoChatProtocolError(
        `Failed to serialize Message: ${serializeResult.error?.message}`,
        serializeResult.error
      );
    }

    // Send message and wait for response
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new DemoChatTimeoutError(`Message request timeout`));
      }, this.defaultTimeout);

      const chunks: Buffer[] = [];

      const onData = (data: Buffer) => {
        chunks.push(data);
        // For simplicity, assume response is complete
        // In practice, you'd check for message terminator
        clearTimeout(timeout);
        socket.off('data', onData);
        socket.off('error', onError);
        resolve(Buffer.concat(chunks));
      };

      const onError = (error: Error) => {
        clearTimeout(timeout);
        socket.off('data', onData);
        socket.off('error', onError);
        reject(new DemoChatConnectionError(`Socket error: ${error.message}`, { error }));
      };

      socket.on('data', onData);
      socket.on('error', onError);
      socket.write(serializeResult.data);
    });
  }

}
