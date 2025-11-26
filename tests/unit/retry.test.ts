/**
 * Tests for Retry Utilities
 */

import { describe, it, expect, vi } from 'vitest';
import { withRetry, isNetworkError, retryNetworkOperation } from '../../src/utils/retry.js';
import { NetworkError } from '../../src/types/errors.js';

describe('Retry Utilities', () => {
  describe('withRetry', () => {
    it('should succeed on first attempt', async () => {
      const operation = vi.fn().mockResolvedValue('success');

      const result = await withRetry(operation);

      expect(result.success).toBe(true);
      expect(result.data).toBe('success');
      expect(result.attempts).toBe(1);
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure and eventually succeed', async () => {
      const operation = vi
        .fn()
        .mockRejectedValueOnce(new Error('Attempt 1 failed'))
        .mockRejectedValueOnce(new Error('Attempt 2 failed'))
        .mockResolvedValue('success');

      const result = await withRetry(operation, {
        maxAttempts: 3,
        initialDelay: 10,
      });

      expect(result.success).toBe(true);
      expect(result.data).toBe('success');
      expect(result.attempts).toBe(3);
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('should fail after max attempts', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('Always fails'));

      const result = await withRetry(operation, {
        maxAttempts: 3,
        initialDelay: 10,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error?.message).toBe('Always fails');
      expect(result.attempts).toBe(3);
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('should not retry if error is not retryable', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('Not retryable'));

      const result = await withRetry(operation, {
        maxAttempts: 3,
        initialDelay: 10,
        isRetryable: () => false,
      });

      expect(result.success).toBe(false);
      expect(result.attempts).toBe(1);
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should call onRetry callback', async () => {
      const operation = vi
        .fn()
        .mockRejectedValueOnce(new Error('Attempt 1 failed'))
        .mockResolvedValue('success');

      const onRetry = vi.fn();

      await withRetry(operation, {
        maxAttempts: 3,
        initialDelay: 10,
        onRetry,
      });

      expect(onRetry).toHaveBeenCalledTimes(1);
      expect(onRetry).toHaveBeenCalledWith(
        1,
        expect.any(Error),
        10
      );
    });

    it('should use exponential backoff', async () => {
      const operation = vi
        .fn()
        .mockRejectedValueOnce(new Error('Attempt 1'))
        .mockRejectedValueOnce(new Error('Attempt 2'))
        .mockResolvedValue('success');

      const onRetry = vi.fn();

      await withRetry(operation, {
        maxAttempts: 3,
        initialDelay: 100,
        backoffMultiplier: 2,
        onRetry,
      });

      expect(onRetry).toHaveBeenCalledTimes(2);
      expect(onRetry).toHaveBeenNthCalledWith(1, 1, expect.any(Error), 100);
      expect(onRetry).toHaveBeenNthCalledWith(2, 2, expect.any(Error), 200);
    });

    it('should respect max delay', async () => {
      const operation = vi
        .fn()
        .mockRejectedValueOnce(new Error('Attempt 1'))
        .mockRejectedValueOnce(new Error('Attempt 2'))
        .mockResolvedValue('success');

      const onRetry = vi.fn();

      await withRetry(operation, {
        maxAttempts: 3,
        initialDelay: 1000,
        backoffMultiplier: 10,
        maxDelay: 1500,
        onRetry,
      });

      expect(onRetry).toHaveBeenCalledTimes(2);
      expect(onRetry).toHaveBeenNthCalledWith(1, 1, expect.any(Error), 1000);
      expect(onRetry).toHaveBeenNthCalledWith(2, 2, expect.any(Error), 1500); // Capped at maxDelay
    });
  });

  describe('isNetworkError', () => {
    it('should identify NetworkError instances', () => {
      const error = new NetworkError('Connection failed', 'connect', 'disconnected');
      expect(isNetworkError(error)).toBe(true);
    });

    it('should identify errors with network error codes', () => {
      const codes = ['ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', 'ENETUNREACH', 'EHOSTUNREACH'];

      codes.forEach((code) => {
        const error = new Error('Network error') as Error & { code: string };
        error.code = code;
        expect(isNetworkError(error)).toBe(true);
      });
    });

    it('should identify errors with network-related messages', () => {
      const messages = [
        'network error occurred',
        'connection refused',
        'connection timeout',
        'connection reset',
      ];

      messages.forEach((message) => {
        const error = new Error(message);
        expect(isNetworkError(error)).toBe(true);
      });
    });

    it('should not identify non-network errors', () => {
      const error = new Error('Something else went wrong');
      expect(isNetworkError(error)).toBe(false);
    });
  });

  describe('retryNetworkOperation', () => {
    it('should retry network errors', async () => {
      const operation = vi
        .fn()
        .mockRejectedValueOnce(new NetworkError('Connection failed', 'connect', 'disconnected'))
        .mockResolvedValue('success');

      const result = await retryNetworkOperation(operation, {
        maxAttempts: 3,
        initialDelay: 10,
      });

      expect(result.success).toBe(true);
      expect(result.data).toBe('success');
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should not retry non-network errors', async () => {
      // Create an error that won't be identified as a network error
      const error = new Error('Validation error');
      const operation = vi.fn().mockRejectedValue(error);

      const result = await retryNetworkOperation(operation, {
        maxAttempts: 3,
        initialDelay: 10,
      });

      expect(result.success).toBe(false);
      expect(result.attempts).toBe(1);
      expect(operation).toHaveBeenCalledTimes(1);
    });
  });
});
