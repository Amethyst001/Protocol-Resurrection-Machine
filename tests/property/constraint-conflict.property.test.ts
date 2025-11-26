/**
 * Property tests for constraint conflict detection
 *
 * Feature: prm-phase-2, Property 19: Constraint Conflict Detection
 * For any set of contradictory constraints (e.g., minLength > maxLength),
 * the constraint solver should detect the conflict and report which
 * constraints are incompatible.
 *
 * Validates: Requirements 13.4, 14.5
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import type { Constraint } from '../../src/testing/constraint-types.js';
import {
  detectConflicts,
  detectDirectConflict,
  detectRangeConflict,
  detectLengthConflict,
} from '../../src/testing/conflict-detection.js';

describe('Constraint Conflict Detection Properties', () => {
  /**
   * Property 19: Constraint Conflict Detection
   * For any contradictory constraints, the solver should detect conflicts
   */
  it('should detect conflicting range constraints', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 40 }),
        fc.integer({ min: 50, max: 100 }),
        (max1, min2) => {
          // Create non-overlapping ranges: [0, max1] and [min2, 100]
          // where max1 < min2 (guaranteed by the generators)
          const constraints: Constraint[] = [
            { type: 'range', field: 'value', min: 0, max: max1 },
            { type: 'range', field: 'value', min: min2, max: 100 },
          ];

          const hasConflict = detectRangeConflict(constraints[0], constraints[1]);
          expect(hasConflict).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should detect conflicting length constraints', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 5 }),
        fc.integer({ min: 10, max: 20 }),
        (max1, min2) => {
          // Create non-overlapping length ranges
          const constraints: Constraint[] = [
            { type: 'length', field: 'text', min: 0, max: max1 },
            { type: 'length', field: 'text', min: min2, max: 30 },
          ];

          const hasConflict = detectLengthConflict(constraints[0], constraints[1]);
          expect(hasConflict).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should not detect conflict for overlapping ranges', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 10, max: 50 }),
        fc.integer({ min: 30, max: 70 }),
        (min1, max2) => {
          // Create overlapping ranges: [min1, 60] and [20, max2]
          const constraints: Constraint[] = [
            { type: 'range', field: 'value', min: min1, max: 60 },
            { type: 'range', field: 'value', min: 20, max: max2 },
          ];

          const hasConflict = detectRangeConflict(constraints[0], constraints[1]);
          // Should not have conflict if ranges overlap
          if (min1 <= max2 && 20 <= 60) {
            expect(hasConflict).toBe(false);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should detect conflicts in constraint sets', () => {
    fc.assert(
      fc.property(fc.constant(null), () => {
        // Create obviously conflicting constraints
        const constraints: Constraint[] = [
          { type: 'range', field: 'age', min: 50, max: 60 },
          { type: 'range', field: 'age', min: 70, max: 80 },
        ];

        const result = detectConflicts(constraints);
        expect(result.hasConflict).toBe(true);
        expect(result.conflicts).toBeDefined();
        expect(result.conflicts!.length).toBeGreaterThan(0);
      }),
      { numRuns: 100 }
    );
  });

  it('should report accurate conflict information', () => {
    fc.assert(
      fc.property(fc.constant(null), () => {
        const constraints: Constraint[] = [
          { type: 'length', field: 'name', min: 20, max: 30 },
          { type: 'length', field: 'name', min: 40, max: 50 },
        ];

        const result = detectConflicts(constraints);
        expect(result.hasConflict).toBe(true);
        expect(result.conflicts).toBeDefined();

        // Check that conflict description includes field name
        const conflict = result.conflicts![0];
        expect(conflict).toBeDefined();
        expect(conflict.reason).toContain('name');
        expect(conflict.type).toBe('direct');
      }),
      { numRuns: 100 }
    );
  });

  it('should not detect conflicts for compatible constraints', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 5, max: 10 }),
        fc.integer({ min: 15, max: 20 }),
        (min, max) => {
          // Create compatible constraints
          const constraints: Constraint[] = [
            { type: 'range', field: 'value', min, max },
            { type: 'enum', field: 'type', values: ['a', 'b', 'c'] },
          ];

          const result = detectConflicts(constraints);
          expect(result.hasConflict).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should detect enum-pattern conflicts', () => {
    fc.assert(
      fc.property(fc.constant(null), () => {
        // Enum values that don't match the pattern
        const constraints: Constraint[] = [
          { type: 'enum', field: 'code', values: ['ABC', 'DEF', 'GHI'] },
          { type: 'pattern', field: 'code', pattern: '^[a-z]+$' }, // lowercase only
        ];

        const result = detectConflicts(constraints);
        expect(result.hasConflict).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  it('should not detect conflict for compatible enum-pattern', () => {
    fc.assert(
      fc.property(fc.constant(null), () => {
        // Enum values that match the pattern
        const constraints: Constraint[] = [
          { type: 'enum', field: 'code', values: ['abc', 'def', 'ghi'] },
          { type: 'pattern', field: 'code', pattern: '^[a-z]+$' },
        ];

        const result = detectConflicts(constraints);
        expect(result.hasConflict).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  it('should detect conflicts between constraints on same field only', () => {
    fc.assert(
      fc.property(fc.constant(null), () => {
        // Constraints on different fields should not conflict
        const constraints: Constraint[] = [
          { type: 'range', field: 'field1', min: 50, max: 60 },
          { type: 'range', field: 'field2', min: 70, max: 80 },
        ];

        const hasDirectConflict = detectDirectConflict(constraints[0], constraints[1]);
        expect(hasDirectConflict).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  it('should handle multiple conflicting constraint pairs', () => {
    fc.assert(
      fc.property(fc.constant(null), () => {
        const constraints: Constraint[] = [
          { type: 'range', field: 'value', min: 0, max: 10 },
          { type: 'range', field: 'value', min: 20, max: 30 },
          { type: 'range', field: 'value', min: 40, max: 50 },
        ];

        const result = detectConflicts(constraints);
        expect(result.hasConflict).toBe(true);
        // Should detect multiple conflicts
        expect(result.conflicts!.length).toBeGreaterThan(0);
      }),
      { numRuns: 100 }
    );
  });
});
