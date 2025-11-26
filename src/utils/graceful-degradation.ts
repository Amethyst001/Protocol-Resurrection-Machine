/**
 * Graceful Degradation Utilities
 * Provides utilities for handling partial failures and returning partial results
 */

import type { ParseResult, ParseError } from '../types/results.js';

/**
 * Partial parse result with both successful and failed items
 */
export interface PartialParseResult<T> {
  /** Successfully parsed items */
  success: T[];
  /** Failed items with their errors */
  failures: Array<{
    /** Raw data that failed to parse */
    data: string | Buffer;
    /** Parse error */
    error: ParseError;
    /** Index in the original input */
    index: number;
  }>;
  /** Total number of items attempted */
  totalAttempted: number;
  /** Whether any items were successfully parsed */
  hasSuccess: boolean;
  /** Whether any items failed to parse */
  hasFailures: boolean;
}

/**
 * Parse multiple items with graceful degradation
 * Returns partial results even if some items fail to parse
 * @param items - Array of items to parse
 * @param parser - Parser function that returns ParseResult
 * @returns Partial parse result with successes and failures
 */
export function parseWithGracefulDegradation<T>(
  items: Array<string | Buffer>,
  parser: (item: string | Buffer) => ParseResult<T>
): PartialParseResult<T> {
  const success: T[] = [];
  const failures: PartialParseResult<T>['failures'] = [];

  items.forEach((item, index) => {
    const result = parser(item);
    if (result.success && result.message) {
      success.push(result.message);
    } else if (result.error) {
      failures.push({
        data: item,
        error: result.error,
        index,
      });
    }
  });

  return {
    success,
    failures,
    totalAttempted: items.length,
    hasSuccess: success.length > 0,
    hasFailures: failures.length > 0,
  };
}

/**
 * Parse a stream of items with graceful degradation
 * Continues parsing even if individual items fail
 * @param items - Async iterable of items to parse
 * @param parser - Parser function that returns ParseResult
 * @returns Async generator yielding parse results
 */
export async function* parseStreamWithGracefulDegradation<T>(
  items: AsyncIterable<string | Buffer>,
  parser: (item: string | Buffer) => ParseResult<T>
): AsyncGenerator<ParseResult<T>> {
  for await (const item of items) {
    try {
      const result = parser(item);
      yield result;
    } catch (error) {
      // If parser throws, convert to ParseResult with error
      yield {
        success: false,
        error: {
          message: error instanceof Error ? error.message : String(error),
          offset: 0,
          expected: 'valid input',
          actual: String(item).substring(0, 50),
        },
      };
    }
  }
}

/**
 * Options for partial result handling
 */
export interface PartialResultOptions {
  /** Minimum success rate required (0-1). If below this, treat as complete failure */
  minSuccessRate?: number;
  /** Maximum number of failures to tolerate. If exceeded, treat as complete failure */
  maxFailures?: number;
  /** Whether to include partial results in error cases */
  includePartialOnError?: boolean;
}

/**
 * Evaluate whether a partial result should be considered acceptable
 * @param result - Partial parse result
 * @param options - Options for evaluation
 * @returns Whether the partial result is acceptable
 */
export function isPartialResultAcceptable<T>(
  result: PartialParseResult<T>,
  options: PartialResultOptions = {}
): boolean {
  const {
    minSuccessRate = 0,
    maxFailures = Infinity,
    includePartialOnError = true,
  } = options;

  // If no items were attempted, not acceptable
  if (result.totalAttempted === 0) {
    return false;
  }

  // Check if we have any successes when partial results are required
  if (!includePartialOnError && result.failures.length > 0) {
    return false;
  }

  // Check success rate
  const successRate = result.success.length / result.totalAttempted;
  if (successRate < minSuccessRate) {
    return false;
  }

  // Check failure count
  if (result.failures.length > maxFailures) {
    return false;
  }

  return true;
}

/**
 * Create a summary of a partial parse result
 * @param result - Partial parse result
 * @returns Human-readable summary
 */
export function summarizePartialResult<T>(result: PartialParseResult<T>): string {
  const lines: string[] = [];

  lines.push(
    `Parsed ${result.success.length} of ${result.totalAttempted} items successfully`
  );

  if (result.hasFailures) {
    lines.push(`${result.failures.length} items failed to parse:`);
    result.failures.forEach((failure, index) => {
      if (index < 5) {
        // Show first 5 failures
        lines.push(`  - Item ${failure.index}: ${failure.error.message}`);
      }
    });
    if (result.failures.length > 5) {
      lines.push(`  ... and ${result.failures.length - 5} more`);
    }
  }

  return lines.join('\n');
}

/**
 * Attempt to recover from a parse error by trying alternative parsing strategies
 * @param data - Data that failed to parse
 * @param error - Original parse error
 * @param alternatives - Alternative parser functions to try
 * @returns Parse result from successful alternative, or original error
 */
export function attemptParseRecovery<T>(
  data: string | Buffer,
  error: ParseError,
  alternatives: Array<(data: string | Buffer) => ParseResult<T>>
): ParseResult<T> {
  // Try each alternative parser
  for (const alternative of alternatives) {
    try {
      const result = alternative(data);
      if (result.success) {
        return result;
      }
    } catch {
      // Continue to next alternative
      continue;
    }
  }

  // All alternatives failed, return original error
  return {
    success: false,
    error,
  };
}

/**
 * Split data into chunks and parse with graceful degradation
 * Useful for parsing multi-line or delimited data where some lines may be malformed
 * @param data - Data to parse
 * @param delimiter - Delimiter to split on (default: newline)
 * @param parser - Parser function for each chunk
 * @returns Partial parse result
 */
export function parseChunksWithGracefulDegradation<T>(
  data: string | Buffer,
  delimiter: string | RegExp,
  parser: (chunk: string) => ParseResult<T>
): PartialParseResult<T> {
  const dataStr = typeof data === 'string' ? data : data.toString('utf-8');
  const chunks = dataStr.split(delimiter).filter((chunk) => chunk.trim().length > 0);

  return parseWithGracefulDegradation(chunks, parser);
}
