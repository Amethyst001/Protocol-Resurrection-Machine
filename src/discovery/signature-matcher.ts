/**
 * Signature matching for protocol identification
 * Implements pattern matching, fuzzy matching, and confidence scoring
 */

import type { Pattern, ProtocolSignature, ProtocolFingerprint } from './types.js';

/**
 * Match a signature against a pattern
 */
export function matchSignature(
  data: Buffer,
  pattern: Pattern
): { matches: boolean; confidence: number } {
  const dataStr = data.toString();
  let matches = false;

  switch (pattern.type) {
    case 'exact':
      matches = dataStr === pattern.value;
      break;

    case 'prefix':
      matches = dataStr.startsWith(pattern.value as string);
      break;

    case 'regex':
      try {
        const regex = new RegExp(pattern.value as string);
        matches = regex.test(dataStr);
      } catch {
        matches = false;
      }
      break;

    case 'length':
      matches = data.length === pattern.value;
      break;

    default:
      matches = false;
  }

  return {
    matches,
    confidence: matches ? pattern.weight : 0,
  };
}

/**
 * Fuzzy match two strings using Levenshtein distance
 */
export function fuzzyMatch(
  str1: string,
  str2: string,
  threshold: number = 0.8
): boolean {
  const similarity = levenshteinSimilarity(str1, str2);
  return similarity >= threshold;
}

/**
 * Calculate Levenshtein similarity (0-1)
 */
export function levenshteinSimilarity(str1: string, str2: string): number {
  const distance = levenshteinDistance(str1, str2);
  const maxLength = Math.max(str1.length, str2.length);

  if (maxLength === 0) {
    return 1.0;
  }

  return 1 - distance / maxLength;
}

/**
 * Calculate Levenshtein distance between two strings
 */
export function levenshteinDistance(str1: string, str2: string): number {
  const len1 = str1.length;
  const len2 = str2.length;

  // Create a 2D array for dynamic programming
  const matrix: number[][] = Array(len1 + 1)
    .fill(null)
    .map(() => Array(len2 + 1).fill(0));

  // Initialize first row and column
  for (let i = 0; i <= len1; i++) {
    const row = matrix[i];
    if (row) row[0] = i;
  }
  for (let j = 0; j <= len2; j++) {
    const firstRow = matrix[0];
    if (firstRow) firstRow[j] = j;
  }

  // Fill the matrix
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      const prevRow = matrix[i - 1];
      const currRow = matrix[i];
      const prevCell = matrix[i - 1]?.[j - 1];

      if (prevRow && currRow && prevCell !== undefined) {
        const prevJ = prevRow[j];
        const currJMinus1 = currRow[j - 1];
        if (prevJ !== undefined && currJMinus1 !== undefined) {
          currRow[j] = Math.min(
            prevJ + 1, // deletion
            currJMinus1 + 1, // insertion
            prevCell + cost // substitution
          );
        }
      }
    }
  }

  return matrix[len1]?.[len2] || 0;
}

/**
 * Match protocol signature against fingerprint with multi-signature scoring
 */
export function matchProtocol(
  signature: ProtocolSignature,
  fingerprint: ProtocolFingerprint
): number {
  let totalConfidence = 0;
  let matchedSignatures = 0;

  // Check port match
  if (signature.port === fingerprint.defaultPort) {
    totalConfidence += 0.3;
    matchedSignatures++;
  }

  // Check initial handshake
  if (fingerprint.initialHandshake && signature.initialResponse) {
    const pattern: Pattern = {
      type: 'prefix',
      value: fingerprint.initialHandshake,
      weight: 0.4,
    };

    const result = matchSignature(signature.initialResponse, pattern);
    if (result.matches) {
      totalConfidence += result.confidence;
      matchedSignatures++;
    }
  }

  // Check response patterns
  for (const pattern of fingerprint.responsePatterns) {
    let patternMatched = false;

    for (const response of signature.responseToProbes.values()) {
      const result = matchSignature(response, pattern);
      if (result.matches) {
        totalConfidence += result.confidence;
        matchedSignatures++;
        patternMatched = true;
        break; // Count each pattern only once
      }
    }

    if (!patternMatched) {
      // Try fuzzy matching for text patterns
      if (pattern.type === 'exact' || pattern.type === 'prefix') {
        for (const response of signature.responseToProbes.values()) {
          const responseStr = response.toString();
          if (fuzzyMatch(responseStr, pattern.value as string, 0.8)) {
            totalConfidence += pattern.weight * 0.7; // Reduced confidence for fuzzy match
            matchedSignatures++;
            break;
          }
        }
      }
    }
  }

  // Normalize confidence
  const maxPossibleScore =
    0.3 + // port
    (fingerprint.initialHandshake ? 0.4 : 0) + // handshake
    fingerprint.responsePatterns.reduce((sum, p) => sum + p.weight, 0); // patterns

  return maxPossibleScore > 0 ? totalConfidence / maxPossibleScore : 0;
}

/**
 * Pattern matching for exact signatures
 */
export function matchExact(data: string, pattern: string): boolean {
  return data === pattern;
}

/**
 * Pattern matching for prefix signatures
 */
export function matchPrefix(data: string, pattern: string): boolean {
  return data.startsWith(pattern);
}

/**
 * Pattern matching for regex signatures
 */
export function matchRegex(data: string, pattern: string): boolean {
  try {
    const regex = new RegExp(pattern);
    return regex.test(data);
  } catch {
    return false;
  }
}

/**
 * Pattern matching for length signatures
 */
export function matchLength(data: Buffer, length: number): boolean {
  return data.length === length;
}

/**
 * Calculate confidence score using Bayesian approach
 */
export function bayesianConfidence(
  priorProbability: number,
  evidence: Array<{ likelihood: number; weight: number }>
): number {
  let posterior = priorProbability;

  for (const e of evidence) {
    // Update posterior probability using Bayes' theorem
    const likelihood = e.likelihood * e.weight;
    posterior =
      (likelihood * posterior) /
      (likelihood * posterior + (1 - likelihood) * (1 - posterior));
  }

  return posterior;
}

/**
 * Classify detection confidence
 */
export function classifyConfidence(confidence: number): string {
  if (confidence >= 0.8) {
    return 'high';
  } else if (confidence >= 0.5) {
    return 'medium';
  } else if (confidence >= 0.3) {
    return 'low';
  } else {
    return 'unknown';
  }
}

/**
 * Get matched features from signature and fingerprint
 */
export function getMatchedFeatures(
  signature: ProtocolSignature,
  fingerprint: ProtocolFingerprint
): string[] {
  const features: string[] = [];

  // Check port
  if (signature.port === fingerprint.defaultPort) {
    features.push(`Port ${signature.port}`);
  }

  // Check handshake
  if (fingerprint.initialHandshake && signature.initialResponse) {
    const pattern: Pattern = {
      type: 'prefix',
      value: fingerprint.initialHandshake,
      weight: 0.4,
    };

    const result = matchSignature(signature.initialResponse, pattern);
    if (result.matches) {
      features.push('Initial handshake');
    }
  }

  // Check response patterns
  for (const pattern of fingerprint.responsePatterns) {
    for (const [probeName, response] of signature.responseToProbes.entries()) {
      const result = matchSignature(response, pattern);
      if (result.matches) {
        features.push(pattern.description || `Pattern: ${probeName}`);
        break;
      }
    }
  }

  return features;
}

/**
 * Score multiple signatures and return best matches
 */
export function scoreMultipleSignatures(
  signature: ProtocolSignature,
  fingerprints: ProtocolFingerprint[]
): Array<{ protocol: string; confidence: number; features: string[] }> {
  const scores = fingerprints.map((fingerprint) => ({
    protocol: fingerprint.protocol,
    confidence: matchProtocol(signature, fingerprint),
    features: getMatchedFeatures(signature, fingerprint),
  }));

  // Sort by confidence (highest first)
  scores.sort((a, b) => b.confidence - a.confidence);

  // Filter out very low confidence matches
  return scores.filter((s) => s.confidence > 0.2);
}
