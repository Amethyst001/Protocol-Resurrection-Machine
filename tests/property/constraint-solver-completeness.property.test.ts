/**
 * Property tests for constraint solver completeness
 *
 * Feature: prm-phase-2, Property 20: Constraint Solver Completeness
 * For any satisfiable set of constraints, the constraint solver should
 * find at least one valid value within 1 second.
 *
 * Validates: Requirements 14.1, 14.2, 14.3, 14.4
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import type { Constraint } from '../../src/testing/constraint-types.js';
import { allConstraintsSatisfied } from '../../src/testing/constraint-types.js';
import { solveConstraints, solveField } from '../../src/testing/backtracking-solver.js';

describe('Constraint Solver Completeness Properties', () => {
  /**
   * Property 20: Constraint Solver Completeness
   * For any satisfiable constraint set, solver should find a solution within 1 second
   */
  it('should solve simple range constraints within 1 second', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 50 }),
        fc.integer({ min: 51, max: 100 }),
        (min, max) => {
          const constraints: Constraint[] = [
            { type: 'range', field: 'value', min, max },
          ];

          const startTime = Date.now();
          const result = solveConstraints(['value'], constraints, { timeout: 1000 });
          const duration = Date.now() - startTime;

          expect(result.success).toBe(true);
          expect(duration).toBeLessThan(1000);
          expect(result.solution).toBeDefined();

          if (result.solution) {
            expect(allConstraintsSatisfied(result.solution, constraints)).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should solve length constraints within 1 second', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 10 }),
        fc.integer({ min: 11, max: 20 }),
        (min, max) => {
          const constraints: Constraint[] = [
            { type: 'length', field: 'text', min, max },
          ];

          const startTime = Date.now();
          const result = solveConstraints(['text'], constraints, { timeout: 1000 });
          const duration = Date.now() - startTime;

          expect(result.success).toBe(true);
          expect(duration).toBeLessThan(1000);
          expect(result.solution).toBeDefined();

          if (result.solution) {
            expect(allConstraintsSatisfied(result.solution, constraints)).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should solve enum constraints within 1 second', () => {
    fc.assert(
      fc.property(fc.constant(null), () => {
        const constraints: Constraint[] = [
          { type: 'enum', field: 'status', values: ['active', 'inactive', 'pending'] },
        ];

        const startTime = Date.now();
        const result = solveConstraints(['status'], constraints, { timeout: 1000 });
        const duration = Date.now() - startTime;

        expect(result.success).toBe(true);
        expect(duration).toBeLessThan(1000);
        expect(result.solution).toBeDefined();

        if (result.solution) {
          expect(allConstraintsSatisfied(result.solution, constraints)).toBe(true);
          expect(['active', 'inactive', 'pending']).toContain(result.solution.status);
        }
      }),
      { numRuns: 100 }
    );
  });

  it('should solve multi-field constraints within 1 second', () => {
    fc.assert(
      fc.property(fc.constant(null), () => {
        const constraints: Constraint[] = [
          { type: 'range', field: 'age', min: 18, max: 65 },
          { type: 'length', field: 'name', min: 2, max: 50 },
          { type: 'enum', field: 'role', values: ['admin', 'user', 'guest'] },
        ];

        const fields = ['age', 'name', 'role'];
        const startTime = Date.now();
        const result = solveConstraints(fields, constraints, { timeout: 1000 });
        const duration = Date.now() - startTime;

        expect(result.success).toBe(true);
        expect(duration).toBeLessThan(1000);
        expect(result.solution).toBeDefined();

        if (result.solution) {
          expect(allConstraintsSatisfied(result.solution, constraints)).toBe(true);
        }
      }),
      { numRuns: 100 }
    );
  });

  it('should solve pattern constraints within 1 second', () => {
    fc.assert(
      fc.property(fc.constant(null), () => {
        const constraints: Constraint[] = [
          { type: 'pattern', field: 'code', pattern: '^[a-z]+$' },
        ];

        const startTime = Date.now();
        const result = solveConstraints(['code'], constraints, { timeout: 1000 });
        const duration = Date.now() - startTime;

        expect(result.success).toBe(true);
        expect(duration).toBeLessThan(1000);
        expect(result.solution).toBeDefined();

        if (result.solution) {
          expect(allConstraintsSatisfied(result.solution, constraints)).toBe(true);
        }
      }),
      { numRuns: 100 }
    );
  });

  it('should solve custom constraints within 1 second', () => {
    fc.assert(
      fc.property(fc.constant(null), () => {
        const constraints: Constraint[] = [
          { type: 'range', field: 'number', min: 0, max: 100 },
          {
            type: 'custom',
            field: 'number',
            validate: (v: number) => v % 2 === 0, // Must be even
          },
        ];

        const startTime = Date.now();
        const result = solveConstraints(['number'], constraints, { timeout: 1000 });
        const duration = Date.now() - startTime;

        expect(result.success).toBe(true);
        expect(duration).toBeLessThan(1000);
        expect(result.solution).toBeDefined();

        if (result.solution) {
          expect(allConstraintsSatisfied(result.solution, constraints)).toBe(true);
          expect(result.solution.number % 2).toBe(0);
        }
      }),
      { numRuns: 100 }
    );
  });

  it('should solve single field constraints efficiently', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 10, max: 50 }),
        fc.integer({ min: 51, max: 100 }),
        (min, max) => {
          const constraints: Constraint[] = [
            { type: 'range', field: 'value', min, max },
          ];

          const startTime = Date.now();
          const value = solveField('value', constraints, { timeout: 1000 });
          const duration = Date.now() - startTime;

          expect(value).not.toBeNull();
          expect(duration).toBeLessThan(1000);

          if (value !== null) {
            expect(value).toBeGreaterThanOrEqual(min);
            expect(value).toBeLessThanOrEqual(max);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle various constraint combinations', () => {
    fc.assert(
      fc.property(fc.constant(null), () => {
        const constraints: Constraint[] = [
          { type: 'length', field: 'username', min: 5, max: 15 },
          { type: 'pattern', field: 'username', pattern: '^[a-z0-9]+$' },
          { type: 'range', field: 'score', min: 0, max: 100 },
        ];

        const fields = ['username', 'score'];
        const startTime = Date.now();
        const result = solveConstraints(fields, constraints, { timeout: 1000 });
        const duration = Date.now() - startTime;

        expect(result.success).toBe(true);
        expect(duration).toBeLessThan(1000);

        if (result.solution) {
          expect(allConstraintsSatisfied(result.solution, constraints)).toBe(true);
        }
      }),
      { numRuns: 100 }
    );
  });

  it('should report failure for unsatisfiable constraints', () => {
    fc.assert(
      fc.property(fc.constant(null), () => {
        // Create unsatisfiable constraints
        const constraints: Constraint[] = [
          { type: 'range', field: 'value', min: 50, max: 60 },
          { type: 'range', field: 'value', min: 70, max: 80 },
        ];

        const result = solveConstraints(['value'], constraints, { timeout: 1000 });

        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
      }),
      { numRuns: 100 }
    );
  });

  it('should find solutions for overlapping range constraints', () => {
    fc.assert(
      fc.property(fc.constant(null), () => {
        // Create overlapping ranges that are guaranteed to overlap
        const constraints: Constraint[] = [
          { type: 'range', field: 'value', min: 20, max: 60 },
          { type: 'range', field: 'value', min: 40, max: 80 },
        ];

        const startTime = Date.now();
        const result = solveConstraints(['value'], constraints, { timeout: 1000 });
        const duration = Date.now() - startTime;

        // Should find a solution in the overlapping range [40, 60]
        expect(result.success).toBe(true);
        expect(duration).toBeLessThan(1000);

        if (result.solution) {
          expect(allConstraintsSatisfied(result.solution, constraints)).toBe(true);
          expect(result.solution.value).toBeGreaterThanOrEqual(40);
          expect(result.solution.value).toBeLessThanOrEqual(60);
        }
      }),
      { numRuns: 100 }
    );
  });
});
