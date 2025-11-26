/**
 * Retry Utilities
 * Provides retry logic with exponential backoff for network operations
 */

import { NetworkError } from '../types/errors.js';

/**
 * Retry options
 */
export interface RetryOptions {
  /** Maximum number of retry attempts (default: 3) */
  maxAttempts?: number;
  /** Initial delay in milliseconds (default: 1000) */
  initialDelay?: number;
  /** Maximum delay in milliseconds (default: 30000) */
  maxDelay?: number;
  /** Backoff multiplier (default: 2) */
  backoffMultiplier?: number;
  /** Function to determine if error is retryable (default: all errors are retryable) */
  isRetryable?: (error: Error) => boolean;
  /** Callback called before each retry */
  onRetry?: (attempt: number, error: Error, delay: number) => void;
}

/**
 * Retry result
 */
export interface RetryResult<T> {
  /** Whether the operation succeeded */
  success: boolean;
  /** Result data if successful */
  data?: T;
  /** Final error if all retries failed */
  error?: Error;
  /** Number of attempts made */
  attempts: number;
}

/**
 * Default retry options
 */
const DEFAULT_RETRY_OPTIONS: Required<Omit<RetryOptions, 'onRetry'>> = {
  maxAttempts: 3,
  initialDelay: 1000,
  maxDelay: 30000,
  backoffMultiplier: 2,
  isRetryable: () => true,
};

/**
 * Execute an async operation with retry logic and exponential backoff
 * @param operation - Async operation to execute
 * @param options - Retry options
 * @returns Retry result with success status and data or error
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<RetryResult<T>> {
  const opts = { ...DEFAULT_RETRY_OPTIONS, ...options };
  let lastError: Error | undefined;
  let delay = opts.initialDelay;

  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      const data = await operation();
      return {
        success: true,
        data,
        attempts: attempt,
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Check if error is retryable
      if (!opts.isRetryable(lastError)) {
        return {
          success: false,
          error: lastError,
          attempts: attempt,
        };
      }

      // If this was the last attempt, don't retry
      if (attempt >= opts.maxAttempts) {
        break;
      }

      // Call onRetry callback if provided
      if (options.onRetry) {
        options.onRetry(attempt, lastError, delay);
      }

      // Wait before retrying
      await sleep(delay);

      // Calculate next delay with exponential backoff
      delay = Math.min(delay * opts.backoffMultiplier, opts.maxDelay);
    }
  }

  return {
    success: false,
    error: lastError,
    attempts: opts.maxAttempts,
  };
}

/**
 * Check if an error is a network error that should be retried
 */
export function isNetworkError(error: Error): boolean {
  // Check for common network error codes
  const networkErrorCodes = [
    'ECONNREFUSED',
    'ECONNRESET',
    'ETIMEDOUT',
    'ENOTFOUND',
    'ENETUNREACH',
    'EHOSTUNREACH',
  ];

  // Check if it's a NetworkError instance
  if (error instanceof NetworkError) {
    return true;
  }

  // Check error code
  if ('code' in error && typeof error.code === 'string') {
    return networkErrorCodes.includes(error.code);
  }

  // Check error message for network-related keywords
  const message = error.message.toLowerCase();
  return (
    message.includes('network') ||
    message.includes('connection') ||
    message.includes('timeout') ||
    message.includes('refused') ||
    message.includes('reset')
  );
}

/**
 * Sleep for a specified duration
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry a network operation with default network error handling
 */
export async function retryNetworkOperation<T>(
  operation: () => Promise<T>,
  options: Omit<RetryOptions, 'isRetryable'> = {}
): Promise<RetryResult<T>> {
  return withRetry(operation, {
    ...options,
    isRetryable: isNetworkError,
  });
}
