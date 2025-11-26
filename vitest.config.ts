import { defineConfig } from 'vitest/config';

export default defineConfig({
  cacheDir: 'node_modules/.vite',
  test: {
    globals: true,
    environment: 'node',
    // Performance optimizations
    pool: 'threads', // Use worker threads for parallel execution
    poolOptions: {
      threads: {
        singleThread: false, // Enable multi-threading
        isolate: false, // Share context between tests for better performance
      },
    },
    // Run property tests in parallel
    sequence: {
      concurrent: true, // Run tests concurrently when possible
    },
    // Optimize test file discovery
    include: ['tests/**/*.test.ts', 'generated/**/tests/**/*.test.ts'],
    exclude: ['node_modules/', 'dist/'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'dist/', 'tests/'],
    },
    // Set reasonable timeouts
    testTimeout: 10000, // 10 seconds default
    hookTimeout: 10000,
  },
});
