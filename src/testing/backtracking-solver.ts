/**
 * Backtracking constraint solver
 * 
 * This module implements a backtracking algorithm to find values
 * that satisfy multiple constraints simultaneously.
 */

import type { Constraint } from './constraint-types.js';
import { satisfiesConstraint, getFieldConstraints } from './constraint-types.js';
import { detectConflicts } from './conflict-detection.js';

/**
 * Solver result
 */
export interface SolverResult {
  success: boolean;
  solution?: Record<string, any>;
  error?: string;
}

/**
 * Solver options
 */
export interface SolverOptions {
  timeout?: number; // Timeout in milliseconds (default: 1000)
  maxAttempts?: number; // Maximum attempts per field (default: 100)
}

/**
 * Generate candidate values for a field based on its constraints
 */
export function generateCandidates(
  field: string,
  constraints: Constraint[],
  maxCandidates: number = 10
): any[] {
  const candidates: any[] = [];
  const fieldConstraints = constraints.filter((c) => c.field === field);

  if (fieldConstraints.length === 0) {
    // No constraints, generate some default values
    return ['', 'test', 'value', 0, 1, 100];
  }

  // Generate candidates based on constraint types
  for (const constraint of fieldConstraints) {
    switch (constraint.type) {
      case 'enum':
        // Use enum values as candidates
        candidates.push(...constraint.values);
        break;

      case 'range':
        // Generate values at boundaries and middle
        const min = constraint.min ?? 0;
        const max = constraint.max ?? 100;
        candidates.push(min, min + 1, Math.floor((min + max) / 2), max - 1, max);
        break;

      case 'length':
        // Generate strings of various lengths
        const minLen = constraint.min ?? 0;
        const maxLen = constraint.max ?? 10;
        for (let len = minLen; len <= Math.min(maxLen, minLen + 5); len++) {
          candidates.push('a'.repeat(len));
        }
        break;

      case 'pattern':
        // For patterns, generate some common strings
        // This is simplified - a real implementation would use regex generation
        candidates.push('test', 'value', 'abc123', 'example');
        break;

      case 'custom':
        // For custom constraints, try some common values
        candidates.push('', 'test', 0, 1, true, false);
        break;
    }
  }

  // Remove duplicates and limit candidates
  const uniqueCandidates = Array.from(new Set(candidates));
  return uniqueCandidates.slice(0, maxCandidates);
}

/**
 * Check if a partial solution satisfies all relevant constraints
 */
function satisfiesPartialSolution(
  solution: Record<string, any>,
  constraints: Constraint[]
): boolean {
  for (const constraint of constraints) {
    const value = solution[constraint.field];
    if (value !== undefined && !satisfiesConstraint(value, constraint)) {
      return false;
    }
  }
  return true;
}

/**
 * Backtracking solver implementation
 */
export function solveConstraints(
  fields: string[],
  constraints: Constraint[],
  options: SolverOptions = {}
): SolverResult {
  const timeout = options.timeout ?? 1000;
  const maxAttempts = options.maxAttempts ?? 100;
  const startTime = Date.now();

  // Check for conflicts first
  const conflictResult = detectConflicts(constraints);
  if (conflictResult.hasConflict) {
    return {
      success: false,
      error: `Conflicting constraints detected: ${conflictResult.conflicts?.map((c) => c.reason).join(', ')}`,
    };
  }

  const solution: Record<string, any> = {};

  /**
   * Recursive backtracking function
   */
  function backtrack(fieldIndex: number): boolean {
    // Check timeout
    if (Date.now() - startTime > timeout) {
      return false;
    }

    // Base case: all fields assigned
    if (fieldIndex === fields.length) {
      return true;
    }

    const field = fields[fieldIndex];
    if (!field) {
      return false;
    }

    const fieldConstraints = getFieldConstraints(field, constraints);
    const candidates = generateCandidates(field, fieldConstraints, maxAttempts);

    // Try each candidate value
    for (const value of candidates) {
      solution[field] = value;

      // Check if this assignment satisfies all constraints so far
      if (satisfiesPartialSolution(solution, constraints)) {
        // Recursively try to assign remaining fields
        if (backtrack(fieldIndex + 1)) {
          return true;
        }
      }

      // Backtrack: remove this assignment
      delete solution[field];
    }

    return false;
  }

  // Start backtracking
  const success = backtrack(0);

  if (success) {
    return {
      success: true,
      solution,
    };
  } else {
    return {
      success: false,
      error: Date.now() - startTime > timeout ? 'Solver timeout' : 'No solution found',
    };
  }
}

/**
 * Solve constraints for a single field
 */
export function solveField(
  field: string,
  constraints: Constraint[],
  options: SolverOptions = {}
): any | null {
  const result = solveConstraints([field], constraints, options);
  return result.success && result.solution ? result.solution[field] : null;
}

/**
 * Find all solutions (up to a maximum) for a set of constraints
 */
export function findAllSolutions(
  fields: string[],
  constraints: Constraint[],
  maxSolutions: number = 10,
  options: SolverOptions = {}
): Record<string, any>[] {
  const solutions: Record<string, any>[] = [];
  const timeout = options.timeout ?? 1000;
  const maxAttempts = options.maxAttempts ?? 100;
  const startTime = Date.now();

  // Check for conflicts first
  const conflictResult = detectConflicts(constraints);
  if (conflictResult.hasConflict) {
    return [];
  }

  const solution: Record<string, any> = {};

  function backtrack(fieldIndex: number): void {
    // Check timeout or max solutions
    if (Date.now() - startTime > timeout || solutions.length >= maxSolutions) {
      return;
    }

    // Base case: all fields assigned
    if (fieldIndex === fields.length) {
      solutions.push({ ...solution });
      return;
    }

    const field = fields[fieldIndex];
    if (!field) {
      return;
    }

    const fieldConstraints = getFieldConstraints(field, constraints);
    const candidates = generateCandidates(field, fieldConstraints, maxAttempts);

    // Try each candidate value
    for (const value of candidates) {
      if (solutions.length >= maxSolutions) {
        break;
      }

      solution[field] = value;

      // Check if this assignment satisfies all constraints so far
      if (satisfiesPartialSolution(solution, constraints)) {
        backtrack(fieldIndex + 1);
      }

      // Backtrack: remove this assignment
      delete solution[field];
    }
  }

  backtrack(0);
  return solutions;
}
