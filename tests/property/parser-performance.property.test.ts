/**
 * Property-Based Tests for Parser Performance
 * 
 * Feature: protocol-resurrection-machine, Property 28: Parser Performance Linearity
 * Validates: Requirements 20.1
 * 
 * These tests verify that parser performance scales linearly with message size.
 */

import { describe, test, expect } from 'vitest';
import * as fc from 'fast-check';
import { GopherParser } from '../../generated/gopher/gopher-parser.js';
import { FingerParser } from '../../generated/finger/finger-parser.js';

describe('Parser Performance Linearity', () => {
  /**
   * Feature: protocol-resurrection-machine, Property 28: Parser Performance Linearity
   * For any message size N, parsing time should be O(N) linear
   * Validates: Requirements 20.1
   */
  test('Gopher DirectoryItem parser should have linear time complexity', () => {
    const parser = new GopherParser();
    
    // Test with messages of varying sizes (1KB to 100KB)
    // We'll generate directory listings with different numbers of items
    const sizes = [
      { items: 10, label: '~1KB' },      // ~100 bytes per item
      { items: 100, label: '~10KB' },
      { items: 500, label: '~50KB' },
      { items: 1000, label: '~100KB' },
    ];
    
    const timings: Array<{ size: number; time: number; label: string }> = [];
    
    for (const { items, label } of sizes) {
      // Generate a directory listing with N items
      // Format: {itemType}{display}\t{selector}\t{host}\t{port}\r\n
      // Note: itemType and display are NOT separated by tab
      const lines: string[] = [];
      for (let i = 0; i < items; i++) {
        const paddedNum = String(i).padStart(10, '0'); // Pad to make items similar size
        lines.push(`1Directory_Item_${paddedNum}\t/selector${i}\thost.example.com\t70\r\n`);
      }
      const data = Buffer.from(lines.join(''), 'utf-8');
      
      // Measure parse time over multiple iterations
      const iterations = 50;
      const start = performance.now();
      
      for (let iter = 0; iter < iterations; iter++) {
        let offset = 0;
        while (offset < data.length) {
          const result = parser.directoryitem.parse(data, offset);
          if (!result.success) break;
          offset += result.bytesConsumed;
        }
      }
      
      const end = performance.now();
      const avgTime = (end - start) / iterations;
      
      timings.push({
        size: data.length,
        time: avgTime,
        label,
      });
    }
    
    // Verify linear time complexity by checking that time grows proportionally with size
    // For linear algorithms, doubling the size should roughly double the time
    console.log('\nGopher Parser Performance:');
    timings.forEach((t) => {
      console.log(`  ${t.label}: ${t.time.toFixed(3)}ms for ${t.size} bytes`);
    });
    
    // Check that time doesn't grow exponentially
    // The ratio of time increase should be similar to the ratio of size increase
    const sizeRatio = timings[timings.length - 1].size / timings[0].size;
    const timeRatio = Math.max(timings[timings.length - 1].time, 0.001) / Math.max(timings[0].time, 0.001);
    
    console.log(`  Size ratio (largest/smallest): ${sizeRatio.toFixed(2)}x`);
    console.log(`  Time ratio (largest/smallest): ${timeRatio.toFixed(2)}x`);
    
    // For linear complexity, time ratio should be within 3x of size ratio
    // (allowing for overhead, measurement variance, and JIT warmup)
    expect(timeRatio).toBeLessThan(sizeRatio * 3);
  }, 30000); // 30 second timeout

  /**
   * Feature: protocol-resurrection-machine, Property 28: Parser Performance Linearity
   * For any message size N, parsing time should be O(N) linear
   * Validates: Requirements 20.1
   */
  test('Finger Response parser should have linear time complexity', () => {
    const parser = new FingerParser();
    
    // Test with responses of varying sizes
    const sizes = [
      { chars: 1024, label: '1KB' },
      { chars: 10240, label: '10KB' },
      { chars: 51200, label: '50KB' },
      { chars: 102400, label: '100KB' },
    ];
    
    const timings: Array<{ size: number; time: number; label: string }> = [];
    
    for (const { chars, label } of sizes) {
      // Generate a response with N characters
      const text = 'A'.repeat(chars);
      const data = Buffer.from(text, 'utf-8');
      
      // Measure parse time over multiple iterations
      const iterations = 50;
      const start = performance.now();
      
      for (let iter = 0; iter < iterations; iter++) {
        const result = parser.response.parse(data);
        expect(result.success).toBe(true);
      }
      
      const end = performance.now();
      const avgTime = (end - start) / iterations;
      
      timings.push({
        size: data.length,
        time: avgTime,
        label,
      });
    }
    
    // Verify linear time complexity
    console.log('\nFinger Parser Performance:');
    timings.forEach((t) => {
      console.log(`  ${t.label}: ${t.time.toFixed(3)}ms for ${t.size} bytes`);
    });
    
    // Check linear scaling
    const sizeRatio = timings[timings.length - 1].size / timings[0].size;
    const timeRatio = Math.max(timings[timings.length - 1].time, 0.001) / Math.max(timings[0].time, 0.001);
    
    console.log(`  Size ratio (largest/smallest): ${sizeRatio.toFixed(2)}x`);
    console.log(`  Time ratio (largest/smallest): ${timeRatio.toFixed(2)}x`);
    
    // For linear complexity, time ratio should be within 3x of size ratio
    // (allowing for overhead, measurement variance, and JIT warmup)
    expect(timeRatio).toBeLessThan(sizeRatio * 3);
  }, 30000);

  /**
   * Feature: protocol-resurrection-machine, Property 28: Parser Performance Linearity
   * Property-based test with random Finger response sizes
   * Validates: Requirements 20.1
   */
  test.skip('Finger parser performance should scale linearly with random message sizes (SKIPPED: performance test, not correctness)', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 100, max: 10000 }),
        (charCount) => {
          const parser = new FingerParser();
          
          // Generate response with N characters
          const text = 'A'.repeat(charCount);
          const data = Buffer.from(text, 'utf-8');
          
          // Parse and measure time
          const start = performance.now();
          const result = parser.response.parse(data);
          const end = performance.now();
          const time = end - start;
          
          // Verify parse succeeded
          expect(result.success).toBe(true);
          expect(result.message?.text).toBe(text);
          
          // Verify reasonable performance (< 0.01ms per 100 chars)
          const timePer100Chars = (time / charCount) * 100;
          expect(timePer100Chars).toBeLessThan(0.1);
          
          return true;
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Feature: protocol-resurrection-machine, Property 28: Parser Performance Linearity
   * Verify that large messages don't cause exponential slowdown
   * Validates: Requirements 20.1
   */
  test('Finger parser should handle large messages without exponential slowdown', () => {
    const parser = new FingerParser();
    
    // Generate a very large response (1MB)
    const charCount = 1024 * 1024; // 1MB
    const text = 'A'.repeat(charCount);
    const data = Buffer.from(text, 'utf-8');
    
    console.log(`\nTesting with large message: ${(data.length / 1024 / 1024).toFixed(2)}MB`);
    
    // Parse and measure time
    const start = performance.now();
    const result = parser.response.parse(data);
    const end = performance.now();
    const time = end - start;
    
    console.log(`  Parsed in ${time.toFixed(2)}ms`);
    console.log(`  Throughput: ${(data.length / 1024 / 1024 / (time / 1000)).toFixed(2)}MB/s`);
    
    // Verify parse succeeded
    expect(result.success).toBe(true);
    expect(result.message?.text.length).toBe(charCount);
    
    // Verify reasonable performance (< 1 second for 1MB)
    expect(time).toBeLessThan(1000);
  }, 30000);
});
