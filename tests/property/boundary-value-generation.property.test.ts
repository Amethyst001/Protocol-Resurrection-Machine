/**
 * Property tests for boundary value generation
 *
 * Feature: prm-phase-2, Property 21: Boundary Value Generation
 * For any numeric field with min/max constraints, the test generator
 * should include boundary values (min, min+1, max-1, max) in the
 * generated test cases.
 *
 * Validates: Requirements 15.1, 15.2, 15.3, 15.4
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import type { Constraint } from '../../src/testing/constraint-types.js';
import {
  createBoundaryValueArbitrary,
  createLengthBoundaryArbitrary,
  createBoundaryInclusiveArbitrary,
} from '../../src/testing/fast-check-integration.js';

describe('Boundary Value Generation Properties', () => {
  /**
   * Property 21: Boundary Value Generation
   * For any numeric field with min/max, test data should include boundary values
   */
  it('should generate min boundary value for range constraints', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 10, max: 50 }),
        fc.integer({ min: 51, max: 100 }),
        (min, max) => {
          const constraints: Constraint[] = [
            { type: 'range', field: 'value', min, max },
          ];

          const arbitrary = createBoundaryValueArbitrary('value', constraints);
          const samples = fc.sample(arbitrary, 100);

          // Should include the min value
          expect(samples).toContain(min);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should generate max boundary value for range constraints', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 10, max: 50 }),
        fc.integer({ min: 51, max: 100 }),
        (min, max) => {
          const constraints: Constraint[] = [
            { type: 'range', field: 'value', min, max },
          ];

          const arbitrary = createBoundaryValueArbitrary('value', constraints);
          const samples = fc.sample(arbitrary, 100);

          // Should include the max value
          expect(samples).toContain(max);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should generate min+1 boundary value for range constraints', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 10, max: 50 }),
        fc.integer({ min: 51, max: 100 }),
        (min, max) => {
          const constraints: Constraint[] = [
            { type: 'range', field: 'value', min, max },
          ];

          const arbitrary = createBoundaryValueArbitrary('value', constraints);
          const samples = fc.sample(arbitrary, 100);

          // Should include min+1
          expect(samples).toContain(min + 1);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should generate max-1 boundary value for range constraints', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 10, max: 50 }),
        fc.integer({ min: 51, max: 100 }),
        (min, max) => {
          const constraints: Constraint[] = [
            { type: 'range', field: 'value', min, max },
          ];

          const arbitrary = createBoundaryValueArbitrary('value', constraints);
          const samples = fc.sample(arbitrary, 100);

          // Should include max-1
          expect(samples).toContain(max - 1);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should generate all four boundary values (min, min+1, max-1, max)', () => {
    fc.assert(
      fc.property(fc.constant(null), () => {
        const min = 20;
        const max = 80;
        const constraints: Constraint[] = [
          { type: 'range', field: 'value', min, max },
        ];

        const arbitrary = createBoundaryValueArbitrary('value', constraints);
        const samples = fc.sample(arbitrary, 200);

        // Should include all four boundary values
        expect(samples).toContain(min);
        expect(samples).toContain(min + 1);
        expect(samples).toContain(max - 1);
        expect(samples).toContain(max);
      }),
      { numRuns: 100 }
    );
  });

  it('should generate boundary lengths for string constraints', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 3, max: 8 }),
        fc.integer({ min: 9, max: 15 }),
        (min, max) => {
          const constraints: Constraint[] = [
            { type: 'length', field: 'text', min, max },
          ];

          const arbitrary = createLengthBoundaryArbitrary('text', constraints);
          const samples = fc.sample(arbitrary, 100);

          // Check that we have strings of boundary lengths
          const lengths = samples.map((s) => s.length);
          expect(lengths).toContain(min);
          expect(lengths).toContain(max);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should generate min+1 and max-1 lengths for string constraints', () => {
    fc.assert(
      fc.property(fc.constant(null), () => {
        const min = 5;
        const max = 15;
        const constraints: Constraint[] = [
          { type: 'length', field: 'text', min, max },
        ];

        const arbitrary = createLengthBoundaryArbitrary('text', constraints);
        const samples = fc.sample(arbitrary, 200);

        // Check that we have strings of boundary lengths
        const lengths = samples.map((s) => s.length);
        expect(lengths).toContain(min);
        expect(lengths).toContain(min + 1);
        expect(lengths).toContain(max - 1);
        expect(lengths).toContain(max);
      }),
      { numRuns: 100 }
    );
  });

  it('should mix boundary values with regular values', () => {
    fc.assert(
      fc.property(fc.constant(null), () => {
        const constraints: Constraint[] = [
          { type: 'range', field: 'value', min: 10, max: 100 },
        ];

        const arbitrary = createBoundaryInclusiveArbitrary('value', constraints, 0.3);
        const samples = fc.sample(arbitrary, 200);

        // Should have boundary values
        const hasBoundaries =
          samples.includes(10) ||
          samples.includes(11) ||
          samples.includes(99) ||
          samples.includes(100);
        expect(hasBoundaries).toBe(true);

        // Should also have non-boundary values
        const hasNonBoundaries = samples.some(
          (v) => v !== 10 && v !== 11 && v !== 99 && v !== 100
        );
        expect(hasNonBoundaries).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  it('should generate boundary values for multiple range constraints', () => {
    fc.assert(
      fc.property(fc.constant(null), () => {
        // Multiple overlapping ranges
        const constraints: Constraint[] = [
          { type: 'range', field: 'value', min: 20, max: 80 },
          { type: 'range', field: 'value', min: 40, max: 100 },
        ];

        const arbitrary = createBoundaryValueArbitrary('value', constraints);
        const samples = fc.sample(arbitrary, 200);

        // Should include boundaries from both constraints
        // The effective range is [40, 80] (intersection)
        expect(samples).toContain(40); // min of intersection
        expect(samples).toContain(80); // max of intersection
      }),
      { numRuns: 100 }
    );
  });

  it('should handle edge case of min === max', () => {
    fc.assert(
      fc.property(fc.integer({ min: 10, max: 100 }), (value) => {
        const constraints: Constraint[] = [
          { type: 'range', field: 'value', min: value, max: value },
        ];

        const arbitrary = createBoundaryValueArbitrary('value', constraints);
        const samples = fc.sample(arbitrary, 50);

        // All samples should be the same value
        expect(samples.every((s) => s === value)).toBe(true);
      }),
      { numRuns: 100 }
    );
  });
});
