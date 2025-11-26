/**
 * Property tests for constraint satisfaction
 * 
 * Feature: prm-phase-2, Property 18: Multi-Constraint Satisfaction
 * For any field with multiple constraints (minLength, maxLength, pattern),
 * the test generator should produce values that satisfy all constraints
 * simultaneously, with zero constraint violations.
 * 
 * Validates: Requirements 13.1, 13.2, 13.3
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import type { Constraint } from '../../src/testing/constraint-types.js';
import {
  satisfiesConstraint,
  allConstraintsSatisfied,
} from '../../src/testing/constraint-types.js';
import {
  createConstrainedArbitrary,
  createMultiFieldArbitrary,
} from '../../src/testing/fast-check-integration.js';

describe('Multi-Constraint Satisfaction Properties', () => {
  /**
   * Property 18: Multi-Constraint Satisfaction
   * For any field with multiple constraints, generated values should satisfy all constraints
   * 
   * KNOWN LIMITATION: The constraint solver implementation is incomplete for complex
   * multi-constraint scenarios. Basic constraint satisfaction works for common cases.
   * This is an advanced feature that can be completed in Phase 2.1 if needed.
   * See FAILING-TESTS-ANALYSIS.md for details.
   */
  it('should generate values satisfying minLength + maxLength constraints', { timeout: 30000 }, () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 10 }),
        fc.integer({ min: 11, max: 20 }),
        (minLen, maxLen) => {
          const constraints: Constraint[] = [
            { type: 'length', field: 'test', min: minLen, max: maxLen },
          ];

          const arbitrary = createConstrainedArbitrary('test', constraints);

          // Generate multiple values and check they all satisfy constraints
          const samples = fc.sample(arbitrary, 10);

          for (const value of samples) {
            expect(satisfiesConstraint(value, constraints[0])).toBe(true);
            expect(value.length).toBeGreaterThanOrEqual(minLen);
            expect(value.length).toBeLessThanOrEqual(maxLen);
          }
        }
      ),
      { numRuns: 1000 }
    );
  });

  it('should generate values satisfying minLength + maxLength + pattern constraints', { timeout: 30000 }, () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 3, max: 5 }),
        fc.integer({ min: 6, max: 10 }),
        (minLen, maxLen) => {
          const constraints: Constraint[] = [
            { type: 'length', field: 'test', min: minLen, max: maxLen },
            { type: 'pattern', field: 'test', pattern: '^[a-z]+$' },
          ];

          const arbitrary = createConstrainedArbitrary('test', constraints);
          const samples = fc.sample(arbitrary, 10);

          for (const value of samples) {
            // Check all constraints are satisfied
            for (const constraint of constraints) {
              expect(satisfiesConstraint(value, constraint)).toBe(true);
            }

            // Verify specific constraints
            expect(value.length).toBeGreaterThanOrEqual(minLen);
            expect(value.length).toBeLessThanOrEqual(maxLen);
            expect(/^[a-z]+$/.test(value)).toBe(true);
          }
        }
      ),
      { numRuns: 1000 }
    );
  });

  it('should generate values satisfying min + max + custom constraints', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 10, max: 50 }),
        fc.integer({ min: 51, max: 100 }),
        (min, max) => {
          const constraints: Constraint[] = [
            { type: 'range', field: 'value', min, max },
            {
              type: 'custom',
              field: 'value',
              validate: (v: number) => v % 2 === 0, // Must be even
            },
          ];

          const arbitrary = createConstrainedArbitrary('value', constraints);
          const samples = fc.sample(arbitrary, 50);

          for (const value of samples) {
            // Check all constraints are satisfied
            for (const constraint of constraints) {
              expect(satisfiesConstraint(value, constraint)).toBe(true);
            }

            // Verify specific constraints
            expect(value).toBeGreaterThanOrEqual(min);
            expect(value).toBeLessThanOrEqual(max);
            expect(value % 2).toBe(0); // Even number
          }
        }
      ),
      { numRuns: 1000 }
    );
  });

  it('should generate multi-field values satisfying all constraints', () => {
    fc.assert(
      fc.property(fc.constant(null), () => {
        const constraints: Constraint[] = [
          { type: 'length', field: 'name', min: 3, max: 10 },
          { type: 'pattern', field: 'name', pattern: '^[a-zA-Z]+$' },
          { type: 'range', field: 'age', min: 18, max: 100 },
          { type: 'enum', field: 'role', values: ['admin', 'user', 'guest'] },
        ];

        const fields = ['name', 'age', 'role'];
        const arbitrary = createMultiFieldArbitrary(fields, constraints);
        const samples = fc.sample(arbitrary, 50);

        for (const record of samples) {
          // Check all constraints are satisfied
          expect(allConstraintsSatisfied(record, constraints)).toBe(true);

          // Verify specific constraints
          expect(record.name.length).toBeGreaterThanOrEqual(3);
          expect(record.name.length).toBeLessThanOrEqual(10);
          expect(/^[a-zA-Z]+$/.test(record.name)).toBe(true);
          expect(record.age).toBeGreaterThanOrEqual(18);
          expect(record.age).toBeLessThanOrEqual(100);
          expect(['admin', 'user', 'guest']).toContain(record.role);
        }
      }),
      { numRuns: 1000 }
    );
  });

  it('should generate values with zero constraint violations', () => {
    fc.assert(
      fc.property(fc.constant(null), () => {
        const constraints: Constraint[] = [
          { type: 'length', field: 'username', min: 5, max: 15 },
          { type: 'pattern', field: 'username', pattern: '^[a-z0-9_]+$' },
          { type: 'range', field: 'score', min: 0, max: 100 },
          {
            type: 'custom',
            field: 'score',
            validate: (v: number) => v >= 0 && v <= 100,
          },
        ];

        const fields = ['username', 'score'];
        const arbitrary = createMultiFieldArbitrary(fields, constraints);
        const samples = fc.sample(arbitrary, 100);

        let violations = 0;

        for (const record of samples) {
          for (const constraint of constraints) {
            const value = record[constraint.field];
            if (!satisfiesConstraint(value, constraint)) {
              violations++;
            }
          }
        }

        // Zero violations expected
        expect(violations).toBe(0);
      }),
      { numRuns: 1000 }
    );
  });

  it('should handle enum + pattern constraints together', () => {
    fc.assert(
      fc.property(fc.constant(null), () => {
        // Enum values that match the pattern
        const constraints: Constraint[] = [
          { type: 'enum', field: 'code', values: ['abc', 'def', 'ghi'] },
          { type: 'pattern', field: 'code', pattern: '^[a-z]{3}$' },
        ];

        const arbitrary = createConstrainedArbitrary('code', constraints);
        const samples = fc.sample(arbitrary, 50);

        for (const value of samples) {
          // Check all constraints are satisfied
          for (const constraint of constraints) {
            expect(satisfiesConstraint(value, constraint)).toBe(true);
          }

          // Verify it's one of the enum values
          expect(['abc', 'def', 'ghi']).toContain(value);
          // Verify it matches the pattern
          expect(/^[a-z]{3}$/.test(value)).toBe(true);
        }
      }),
      { numRuns: 1000 }
    );
  });

  it('should handle multiple range constraints on same field', () => {
    fc.assert(
      fc.property(fc.constant(null), () => {
        // Multiple range constraints that overlap
        const constraints: Constraint[] = [
          { type: 'range', field: 'value', min: 10, max: 100 },
          { type: 'range', field: 'value', min: 20, max: 80 },
        ];

        const arbitrary = createConstrainedArbitrary('value', constraints);
        const samples = fc.sample(arbitrary, 50);

        for (const value of samples) {
          // Check all constraints are satisfied
          for (const constraint of constraints) {
            expect(satisfiesConstraint(value, constraint)).toBe(true);
          }

          // Verify it's in the intersection of ranges [20, 80]
          expect(value).toBeGreaterThanOrEqual(20);
          expect(value).toBeLessThanOrEqual(80);
        }
      }),
      { numRuns: 1000 }
    );
  });
});
