/**
 * Fast-check integration for constraint-based test generation
 * 
 * This module integrates the constraint solver with fast-check
 * to generate arbitraries that satisfy multiple constraints.
 */

import * as fc from 'fast-check';
import type { Constraint } from './constraint-types.js';
import { satisfiesConstraint, allConstraintsSatisfied } from './constraint-types.js';
import { solveConstraints, generateCandidates } from './backtracking-solver.js';
import { detectConflicts } from './conflict-detection.js';

/**
 * Create a constrained arbitrary for a single field
 */
export function createConstrainedArbitrary(
  field: string,
  constraints: Constraint[]
): fc.Arbitrary<any> {
  const fieldConstraints = constraints.filter((c) => c.field === field);

  if (fieldConstraints.length === 0) {
    // No constraints, return a generic arbitrary
    return fc.oneof(fc.string(), fc.integer(), fc.boolean());
  }

  // Check for conflicts
  const conflictResult = detectConflicts(fieldConstraints);
  if (conflictResult.hasConflict) {
    throw new Error(
      `Cannot create arbitrary for field '${field}': ${conflictResult.conflicts?.map((c) => c.reason).join(', ')}`
    );
  }

  // Generate candidates and create arbitrary from them
  const candidates = generateCandidates(field, fieldConstraints, 100);

  // Filter candidates to only those that satisfy all constraints
  const validCandidates = candidates.filter((value) =>
    fieldConstraints.every((c) => satisfiesConstraint(value, c))
  );

  if (validCandidates.length === 0) {
    throw new Error(`No valid values found for field '${field}' with given constraints`);
  }

  // Create arbitrary that generates from valid candidates
  return fc.constantFrom(...validCandidates);
}

/**
 * Create a constrained arbitrary for multiple fields
 */
export function createMultiFieldArbitrary(
  fields: string[],
  constraints: Constraint[]
): fc.Arbitrary<Record<string, any>> {
  // Check for conflicts
  const conflictResult = detectConflicts(constraints);
  if (conflictResult.hasConflict) {
    throw new Error(
      `Cannot create arbitrary: ${conflictResult.conflicts?.map((c) => c.reason).join(', ')}`
    );
  }

  // Try to solve constraints to get valid solutions
  const solution = solveConstraints(fields, constraints, { timeout: 2000 });

  if (!solution.success || !solution.solution) {
    throw new Error(`Cannot find valid solution for constraints: ${solution.error}`);
  }

  // Create arbitraries for each field
  const fieldArbitraries: Record<string, fc.Arbitrary<any>> = {};

  for (const field of fields) {
    try {
      fieldArbitraries[field] = createConstrainedArbitrary(field, constraints);
    } catch (error) {
      // If we can't create an arbitrary, use the solved value as a constant
      const value = solution.solution[field];
      fieldArbitraries[field] = fc.constant(value);
    }
  }

  // Combine field arbitraries into a record arbitrary
  return fc.record(fieldArbitraries).filter((record) =>
    allConstraintsSatisfied(record, constraints)
  );
}

/**
 * Create boundary value arbitrary for numeric constraints
 */
export function createBoundaryValueArbitrary(
  field: string,
  constraints: Constraint[]
): fc.Arbitrary<number> {
  const rangeConstraints = constraints.filter(
    (c) => c.field === field && c.type === 'range'
  );

  if (rangeConstraints.length === 0) {
    return fc.integer();
  }

  const boundaryValues: number[] = [];

  for (const constraint of rangeConstraints) {
    if (constraint.type === 'range') {
      const min = constraint.min ?? 0;
      const max = constraint.max ?? 100;

      // Add boundary values
      boundaryValues.push(min, min + 1, max - 1, max);

      // Add middle value
      boundaryValues.push(Math.floor((min + max) / 2));
    }
  }

  // Remove duplicates and filter to satisfy all constraints
  const uniqueValues = Array.from(new Set(boundaryValues)).filter((value) =>
    constraints.every((c) => satisfiesConstraint(value, c))
  );

  if (uniqueValues.length === 0) {
    throw new Error(`No valid boundary values for field '${field}'`);
  }

  return fc.constantFrom(...uniqueValues);
}

/**
 * Create length boundary arbitrary for string/array constraints
 */
export function createLengthBoundaryArbitrary(
  field: string,
  constraints: Constraint[]
): fc.Arbitrary<string> {
  const lengthConstraints = constraints.filter(
    (c) => c.field === field && c.type === 'length'
  );

  if (lengthConstraints.length === 0) {
    return fc.string();
  }

  const boundaryLengths: number[] = [];

  for (const constraint of lengthConstraints) {
    if (constraint.type === 'length') {
      const min = constraint.min ?? 0;
      const max = constraint.max ?? 20;

      // Add boundary lengths
      boundaryLengths.push(min, min + 1, max - 1, max);
    }
  }

  // Remove duplicates and create strings of those lengths
  const uniqueLengths = Array.from(new Set(boundaryLengths)).filter(
    (len) => len >= 0
  );

  const strings = uniqueLengths.map((len) => 'a'.repeat(len));

  // Filter to satisfy all constraints
  const validStrings = strings.filter((str) =>
    constraints.every((c) => satisfiesConstraint(str, c))
  );

  if (validStrings.length === 0) {
    throw new Error(`No valid boundary strings for field '${field}'`);
  }

  return fc.constantFrom(...validStrings);
}

/**
 * Create an arbitrary that includes boundary values
 */
export function createBoundaryInclusiveArbitrary(
  field: string,
  constraints: Constraint[],
  boundaryWeight: number = 0.3
): fc.Arbitrary<any> {
  const fieldConstraints = constraints.filter((c) => c.field === field);

  // Check if we have numeric or length constraints
  const hasRange = fieldConstraints.some((c) => c.type === 'range');
  const hasLength = fieldConstraints.some((c) => c.type === 'length');

  if (hasRange) {
    const boundaryArb = createBoundaryValueArbitrary(field, constraints);
    const regularArb = createConstrainedArbitrary(field, constraints);

    // Mix boundary values with regular values using oneof with weighted selection
    // Approximate weighting by repeating arbitraries
    const boundaryCount = Math.max(1, Math.floor(boundaryWeight * 10));
    const regularCount = Math.max(1, Math.floor((1 - boundaryWeight) * 10));
    
    const arbitraries = [
      ...Array(boundaryCount).fill(boundaryArb),
      ...Array(regularCount).fill(regularArb),
    ];
    
    return fc.oneof(...arbitraries);
  }

  if (hasLength) {
    const boundaryArb = createLengthBoundaryArbitrary(field, constraints);
    const regularArb = createConstrainedArbitrary(field, constraints);

    // Mix boundary values with regular values using oneof with weighted selection
    const boundaryCount = Math.max(1, Math.floor(boundaryWeight * 10));
    const regularCount = Math.max(1, Math.floor((1 - boundaryWeight) * 10));
    
    const arbitraries = [
      ...Array(boundaryCount).fill(boundaryArb),
      ...Array(regularCount).fill(regularArb),
    ];
    
    return fc.oneof(...arbitraries);
  }

  // No boundary values, just return regular arbitrary
  return createConstrainedArbitrary(field, constraints);
}

/**
 * Create a test data generator that satisfies all constraints
 */
export function createConstraintSatisfyingGenerator(
  fields: string[],
  constraints: Constraint[],
  options: {
    includeBoundaries?: boolean;
    boundaryWeight?: number;
  } = {}
): fc.Arbitrary<Record<string, any>> {
  const includeBoundaries = options.includeBoundaries ?? true;
  const boundaryWeight = options.boundaryWeight ?? 0.3;

  // Check for conflicts
  const conflictResult = detectConflicts(constraints);
  if (conflictResult.hasConflict) {
    throw new Error(
      `Cannot create generator: ${conflictResult.conflicts?.map((c) => c.reason).join(', ')}`
    );
  }

  // Create arbitraries for each field
  const fieldArbitraries: Record<string, fc.Arbitrary<any>> = {};

  for (const field of fields) {
    if (includeBoundaries) {
      fieldArbitraries[field] = createBoundaryInclusiveArbitrary(
        field,
        constraints,
        boundaryWeight
      );
    } else {
      fieldArbitraries[field] = createConstrainedArbitrary(field, constraints);
    }
  }

  // Combine field arbitraries into a record arbitrary
  return fc.record(fieldArbitraries).filter((record) =>
    allConstraintsSatisfied(record, constraints)
  );
}

/**
 * Helper to create an arbitrary from a constraint specification
 */
export function arbitraryFromConstraints(
  fields: string[],
  constraints: Constraint[]
): fc.Arbitrary<Record<string, any>> {
  return createConstraintSatisfyingGenerator(fields, constraints, {
    includeBoundaries: true,
    boundaryWeight: 0.3,
  });
}
