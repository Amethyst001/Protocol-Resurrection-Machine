/**
 * In-memory fingerprint database for protocol identification
 */

import type {
  ProtocolFingerprint,
  ProtocolSignature,
  MatchResult,
  Pattern,
} from './types.js';

/**
 * Fingerprint database for storing and querying protocol fingerprints
 */
export class FingerprintDatabase {
  private fingerprints: Map<string, ProtocolFingerprint> = new Map();

  /**
   * Add a fingerprint to the database
   */
  add(fingerprint: ProtocolFingerprint): void {
    this.fingerprints.set(fingerprint.protocol, fingerprint);
  }

  /**
   * Add multiple fingerprints to the database
   */
  addMany(fingerprints: ProtocolFingerprint[]): void {
    for (const fingerprint of fingerprints) {
      this.add(fingerprint);
    }
  }

  /**
   * Get a fingerprint by protocol name
   */
  get(protocol: string): ProtocolFingerprint | undefined {
    return this.fingerprints.get(protocol);
  }

  /**
   * Get all fingerprints
   */
  getAll(): ProtocolFingerprint[] {
    return Array.from(this.fingerprints.values());
  }

  /**
   * Query fingerprints by port number
   */
  queryByPort(port: number): ProtocolFingerprint[] {
    return Array.from(this.fingerprints.values()).filter(
      (fp) => fp.defaultPort === port
    );
  }

  /**
   * Query fingerprints matching a signature
   */
  query(signature: ProtocolSignature): MatchResult[] {
    const results: MatchResult[] = [];

    console.log(`[Fingerprint] Querying ${this.fingerprints.size} fingerprints for port ${signature.port}`);
    console.log(`[Fingerprint] Initial response:`, signature.initialResponse ? `${signature.initialResponse.length} bytes` : 'none');
    console.log(`[Fingerprint] Probe responses:`, signature.responseToProbes.size);

    for (const fingerprint of this.fingerprints.values()) {
      const confidence = this.calculateConfidence(signature, fingerprint);

      console.log(`[Fingerprint] ${fingerprint.protocol}: confidence = ${confidence.toFixed(3)}`);

      if (confidence > 0.2) {
        // Lowered threshold from 0.3 to 0.2 (Option 2)
        const matchedFeatures = this.getMatchedFeatures(signature, fingerprint);

        console.log(`[Fingerprint] ${fingerprint.protocol} matched! Features:`, matchedFeatures);

        results.push({
          protocol: fingerprint.protocol,
          confidence,
          matchedFeatures,
          specPath: `protocols/${fingerprint.protocol.toLowerCase()}.yaml`,
        });
      }
    }

    // Sort by confidence (highest first)
    results.sort((a, b) => b.confidence - a.confidence);

    console.log(`[Fingerprint] Found ${results.length} matches`);
    if (results.length > 0 && results[0]) {
      console.log(`[Fingerprint] Best match: ${results[0].protocol} (${(results[0].confidence * 100).toFixed(1)}%)`);
    }

    return results;
  }

  /**
   * Update an existing fingerprint
   */
  update(protocol: string, fingerprint: ProtocolFingerprint): void {
    if (!this.fingerprints.has(protocol)) {
      throw new Error(`Fingerprint for protocol "${protocol}" not found`);
    }
    this.fingerprints.set(protocol, fingerprint);
  }

  /**
   * Remove a fingerprint from the database
   */
  remove(protocol: string): boolean {
    return this.fingerprints.delete(protocol);
  }

  /**
   * Clear all fingerprints
   */
  clear(): void {
    this.fingerprints.clear();
  }

  /**
   * Get the number of fingerprints in the database
   */
  size(): number {
    return this.fingerprints.size;
  }

  /**
   * Calculate confidence score for a signature against a fingerprint
   */
  private calculateConfidence(
    signature: ProtocolSignature,
    fingerprint: ProtocolFingerprint
  ): number {
    let score = 0.0;
    let maxScore = 0.0;

    // Port match (weight: 0.3)
    maxScore += 0.3;
    if (signature.port === fingerprint.defaultPort) {
      score += 0.3;
      console.log(`[Fingerprint] ${fingerprint.protocol}: Port match (+0.3)`);
    }

    // Initial handshake match (weight: 0.4)
    if (fingerprint.initialHandshake && signature.initialResponse) {
      maxScore += 0.4;
      const matches = this.matchesPattern(signature.initialResponse, {
        type: 'prefix',
        value: fingerprint.initialHandshake,
        weight: 0.4,
      });
      if (matches) {
        score += 0.4;
        console.log(`[Fingerprint] ${fingerprint.protocol}: Initial handshake match (+0.4)`);
      }
    }

    // Response pattern matches (weight: 0.3)
    if (fingerprint.responsePatterns.length > 0) {
      maxScore += 0.3;
      let patternScore = 0;

      console.log(`[Fingerprint] ${fingerprint.protocol}: Testing ${fingerprint.responsePatterns.length} patterns against ${signature.responseToProbes.size} responses`);

      for (const pattern of fingerprint.responsePatterns) {
        for (const [probeName, response] of signature.responseToProbes.entries()) {
          const matches = this.matchesPattern(response, pattern);
          console.log(`[Fingerprint] ${fingerprint.protocol}: Pattern "${pattern.description}" (${pattern.type}:${pattern.value}) vs probe "${probeName}" = ${matches}`);
          if (matches) {
            patternScore += pattern.weight;
            console.log(`[Fingerprint] ${fingerprint.protocol}: Pattern matched! (+${pattern.weight})`);
            break; // Count each pattern only once
          }
        }
      }

      // Normalize pattern score
      const maxPatternWeight = fingerprint.responsePatterns.reduce(
        (sum, p) => sum + p.weight,
        0
      );
      if (maxPatternWeight > 0) {
        const normalizedScore = (patternScore / maxPatternWeight) * 0.3;
        score += normalizedScore;
        console.log(`[Fingerprint] ${fingerprint.protocol}: Pattern score: ${patternScore}/${maxPatternWeight} = +${normalizedScore.toFixed(3)}`);
      }
    }

    const finalConfidence = maxScore > 0 ? score / maxScore : 0;
    console.log(`[Fingerprint] ${fingerprint.protocol}: Final = ${score.toFixed(3)}/${maxScore.toFixed(3)} = ${finalConfidence.toFixed(3)}`);
    return finalConfidence;
  }

  /**
   * Check if data matches a pattern
   */
  private matchesPattern(data: Buffer, pattern: Pattern): boolean {
    const dataStr = data.toString();

    switch (pattern.type) {
      case 'exact':
        return dataStr === pattern.value;

      case 'prefix':
        return dataStr.startsWith(pattern.value as string);

      case 'regex':
        try {
          const regex = new RegExp(pattern.value as string);
          const result = regex.test(dataStr);
          if (!result) {
            // Log first 100 chars of data for debugging
            console.log(`[Fingerprint] Regex "${pattern.value}" failed on: "${dataStr.substring(0, 100)}..."`);
          }
          return result;
        } catch (error) {
          console.log(`[Fingerprint] Regex error:`, error);
          return false;
        }

      case 'length':
        return data.length === pattern.value;

      default:
        return false;
    }
  }

  /**
   * Get list of matched features for a signature
   */
  private getMatchedFeatures(
    signature: ProtocolSignature,
    fingerprint: ProtocolFingerprint
  ): string[] {
    const features: string[] = [];

    // Check port match
    if (signature.port === fingerprint.defaultPort) {
      features.push(`Port ${signature.port}`);
    }

    // Check initial handshake
    if (fingerprint.initialHandshake && signature.initialResponse) {
      if (this.matchesPattern(signature.initialResponse, {
        type: 'prefix',
        value: fingerprint.initialHandshake,
        weight: 0.4,
      })) {
        features.push('Initial handshake');
      }
    }

    // Check response patterns
    for (const pattern of fingerprint.responsePatterns) {
      for (const [probeName, response] of signature.responseToProbes.entries()) {
        if (this.matchesPattern(response, pattern)) {
          features.push(pattern.description || `Pattern match: ${probeName}`);
          break;
        }
      }
    }

    return features;
  }

  /**
   * Export fingerprints to JSON
   */
  toJSON(): string {
    const data = Array.from(this.fingerprints.values()).map((fp) => ({
      ...fp,
      probes: fp.probes.map((p) => ({
        ...p,
        payload: p.payload.toString('base64'),
      })),
    }));
    return JSON.stringify(data, null, 2);
  }

  /**
   * Import fingerprints from JSON
   */
  fromJSON(json: string): void {
    const data = JSON.parse(json);
    this.clear();

    for (const item of data) {
      const fingerprint: ProtocolFingerprint = {
        ...item,
        probes: item.probes.map((p: any) => ({
          ...p,
          payload: Buffer.from(p.payload, 'base64'),
        })),
      };
      this.add(fingerprint);
    }
  }
}

/**
 * Create a fingerprint database instance
 */
export function createFingerprintDatabase(): FingerprintDatabase {
  return new FingerprintDatabase();
}
