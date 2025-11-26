/**
 * Protocol discovery engine
 * Connects to targets, executes probes, and identifies protocols
 */

import * as net from 'net';
import type {
  DiscoveryResult,
  Packet,
  ProtocolSignature,
  Probe,
  MatchResult,
} from './types.js';
import type { FingerprintDatabase } from './fingerprint-database.js';
import { executeProbe } from './probe-generator.js';

/**
 * Protocol discovery engine
 */
export class DiscoveryEngine {
  constructor(private fingerprintDatabase: FingerprintDatabase) {}

  /**
   * Discover protocol on a target host:port
   */
  async discover(
    host: string,
    port: number,
    _timeout: number = 10000
  ): Promise<DiscoveryResult> {
    const packets: Packet[] = [];
    const responseToProbes = new Map<string, Buffer>();
    const probeResponseTimes = new Map<string, number>();

    // Validate inputs
    this.validateTarget(host, port);

    // Step 1: Connect and record initial response
    const connectionStart = Date.now();
    let initialResponse: Buffer | undefined;

    try {
      initialResponse = await this.connectAndReceiveBanner(host, port, 2000);

      if (initialResponse && initialResponse.length > 0) {
        packets.push({
          direction: 'received',
          timestamp: new Date().toISOString(),
          length: initialResponse.length,
          hex: initialResponse.toString('hex'),
        });
      }

      // Step 2: Get probes for this port
      const fingerprints = this.fingerprintDatabase.queryByPort(port);
      const probes: Probe[] = [];

      for (const fingerprint of fingerprints) {
        probes.push(...fingerprint.probes);
      }

      // Step 3: Execute probes
      for (const probe of probes) {
        const probeStart = Date.now();

        packets.push({
          direction: 'sent',
          timestamp: new Date().toISOString(),
          length: probe.payload.length,
          hex: probe.payload.toString('hex'),
        });

        try {
          const result = await executeProbe(host, port, probe);
          const probeTime = Date.now() - probeStart;

          probeResponseTimes.set(probe.name, probeTime);

          if (result.response) {
            const responseBuffer = Buffer.from(result.response);
            responseToProbes.set(probe.name, responseBuffer);

            packets.push({
              direction: 'received',
              timestamp: new Date().toISOString(),
              length: responseBuffer.length,
              hex: responseBuffer.toString('hex'),
            });
          }
        } catch (error) {
          // Probe failed, continue with next
          packets.push({
            direction: 'received',
            timestamp: new Date().toISOString(),
            length: 0,
            hex: '',
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      // Step 4: Build signature
      const signature: ProtocolSignature = {
        port,
        responseToProbes,
        timing: {
          connectionTime: Date.now() - connectionStart,
          probeResponseTimes,
        },
      };
      
      if (initialResponse) {
        signature.initialResponse = initialResponse;
      }

      // Step 5: Match against fingerprints
      const matches = this.fingerprintDatabase.query(signature);
      const identified = matches.length > 0 ? matches[0] : undefined;
      const confidence = identified ? identified.confidence : 0;

      // Step 6: Generate suggestions
      const suggestions = this.generateSuggestions(matches, port);

      return {
        packets,
        identified: identified || null,
        confidence,
        suggestions,
      };
    } catch (error) {
      // Connection failed
      return {
        packets,
        identified: null,
        confidence: 0,
        suggestions: [
          'Connection failed. Check if the host is reachable.',
          'Verify the port number is correct.',
          'Check if a firewall is blocking the connection.',
        ],
      };
    }
  }

  /**
   * Connect to target and receive initial banner
   */
  private async connectAndReceiveBanner(
    host: string,
    port: number,
    timeout: number
  ): Promise<Buffer | undefined> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      let resolved = false;

      const socket = net.createConnection({ host, port }, () => {
        // Connected, wait for banner
      });

      socket.setTimeout(timeout);

      socket.on('data', (data) => {
        chunks.push(data);
      });

      socket.on('timeout', () => {
        if (!resolved) {
          resolved = true;
          socket.destroy();
          resolve(chunks.length > 0 ? Buffer.concat(chunks) : undefined);
        }
      });

      socket.on('error', (error) => {
        if (!resolved) {
          resolved = true;
          reject(error);
        }
      });

      socket.on('end', () => {
        if (!resolved) {
          resolved = true;
          resolve(chunks.length > 0 ? Buffer.concat(chunks) : undefined);
        }
      });

      socket.on('close', () => {
        if (!resolved) {
          resolved = true;
          resolve(chunks.length > 0 ? Buffer.concat(chunks) : undefined);
        }
      });

      // Close after timeout
      setTimeout(() => {
        if (!socket.destroyed && !resolved) {
          socket.end();
        }
      }, timeout);
    });
  }

  /**
   * Validate target host and port
   */
  private validateTarget(host: string, port: number): void {
    // Validate hostname format
    if (!/^[a-zA-Z0-9.-]+$/.test(host)) {
      throw new Error('Invalid hostname format');
    }

    // Validate port range
    if (port < 1 || port > 65535) {
      throw new Error('Port must be between 1 and 65535');
    }

    // Block private networks (security)
    if (this.isPrivateIP(host)) {
      throw new Error('Cannot probe private networks');
    }
  }

  /**
   * Check if host is a private IP
   */
  private isPrivateIP(host: string): boolean {
    // Allow localhost for testing
    if (host === 'localhost' || host === '127.0.0.1') {
      return false;
    }
    return /^(10\.|172\.(1[6-9]|2[0-9]|3[01])\.|192\.168\.)/.test(host);
  }

  /**
   * Generate suggestions for unidentified protocols
   */
  private generateSuggestions(
    matches: MatchResult[],
    port: number
  ): string[] {
    const suggestions: string[] = [];

    if (matches.length === 0) {
      suggestions.push('No matching protocol found in database.');
      suggestions.push(`Try common protocols for port ${port}.`);
      suggestions.push('Check if the service is running correctly.');
    } else if (matches[0] && matches[0].confidence < 0.7) {
      suggestions.push(
        `Low confidence match: ${matches[0].protocol} (${(matches[0].confidence * 100).toFixed(0)}%)`
      );
      suggestions.push('Consider adding more fingerprints for this protocol.');

      if (matches.length > 1) {
        suggestions.push(
          `Other possibilities: ${matches
            .slice(1, 3)
            .map((m) => m.protocol)
            .join(', ')}`
        );
      }
    }

    return suggestions;
  }

  /**
   * Calculate confidence score for a match
   */
  calculateConfidence(
    _signature: ProtocolSignature,
    matches: MatchResult[]
  ): number {
    if (matches.length === 0) {
      return 0;
    }

    return matches[0]?.confidence || 0;
  }
}

/**
 * Create a discovery engine instance
 */
export function createDiscoveryEngine(
  fingerprintDatabase: FingerprintDatabase
): DiscoveryEngine {
  return new DiscoveryEngine(fingerprintDatabase);
}

/**
 * Discover protocol with adaptive strategy
 */
export async function discoverAdaptive(
  engine: DiscoveryEngine,
  host: string,
  port: number
): Promise<DiscoveryResult> {
  // Start with passive detection
  const result = await engine.discover(host, port);

  // If confidence is low, could try additional probes here
  // For now, just return the result

  return result;
}
