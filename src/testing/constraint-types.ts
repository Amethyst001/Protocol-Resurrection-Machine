/**
 * Constraint types for property-based test generation
 * 
 * This module defines the constraint types used by the constraint solver
 * to generate test data that satisfies multiple orthogonal constraints.
 */

/**
 * Base constraint interface
 */
export interface BaseConstraint {
  field: string;
  priority?: 'required' | 'optional';
}

/**
 * Length constraint for strings and arrays
 */
export interface LengthConstraint extends BaseConstraint {
  type: 'length';
  min?: number;
  max?: number;
}

/**
 * Range constraint for numeric values
 */
export interface RangeConstraint extends BaseConstraint {
  type: 'range';
  min?: number;
  max?: number;
}

/**
 * Pattern constraint for string matching
 */
export interface PatternConstraint extends BaseConstraint {
  type: 'pattern';
  pattern: string | RegExp;
}

/**
 * Enum constraint for allowed values
 */
export interface EnumConstraint extends BaseConstraint {
  type: 'enum';
  values: string[];
}

/**
 * Custom constraint with validation function
 */
export interface CustomConstraint extends BaseConstraint {
  type: 'custom';
  validate: (value: any) => boolean;
  description?: string;
}

/**
 * Union type of all constraint types
 */
export type Constraint =
  | LengthConstraint
  | RangeConstraint
  | PatternConstraint
  | EnumConstraint
  | CustomConstraint;

/**
 * Validation result for a constraint
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[] | undefined;
}

/**
 * Constraint satisfaction result
 */
export interface ConstraintSatisfactionResult {
  satisfied: boolean;
  value?: any;
  error?: string;
}

/**
 * Check if a value satisfies a length constraint
 */
export function satisfiesLength(
  value: string | any[],
  constraint: LengthConstraint
): boolean {
  const length = typeof value === 'string' ? value.length : value.length;

  if (constraint.min !== undefined && length < constraint.min) {
    return false;
  }

  if (constraint.max !== undefined && length > constraint.max) {
    return false;
  }

  return true;
}

/**
 * Check if a value satisfies a range constraint
 */
export function satisfiesRange(
  value: number,
  constraint: RangeConstraint
): boolean {
  if (constraint.min !== undefined && value < constraint.min) {
    return false;
  }

  if (constraint.max !== undefined && value > constraint.max) {
    return false;
  }

  return true;
}

/**
 * Check if a value satisfies a pattern constraint
 */
export function satisfiesPattern(
  value: string,
  constraint: PatternConstraint
): boolean {
  const regex =
    typeof constraint.pattern === 'string'
      ? new RegExp(constraint.pattern)
      : constraint.pattern;

  return regex.test(value);
}

/**
 * Check if a value satisfies an enum constraint
 */
export function satisfiesEnum(
  value: string,
  constraint: EnumConstraint
): boolean {
  return constraint.values.includes(value);
}

/**
 * Check if a value satisfies a custom constraint
 */
export function satisfiesCustom(
  value: any,
  constraint: CustomConstraint
): boolean {
  return constraint.validate(value);
}

/**
 * Check if a value satisfies a constraint
 */
export function satisfiesConstraint(value: any, constraint: Constraint): boolean {
  switch (constraint.type) {
    case 'length':
      return satisfiesLength(value, constraint);
    case 'range':
      return satisfiesRange(value, constraint);
    case 'pattern':
      return satisfiesPattern(value, constraint);
    case 'enum':
      return satisfiesEnum(value, constraint);
    case 'custom':
      return satisfiesCustom(value, constraint);
    default:
      return false;
  }
}

/**
 * Validate a value against multiple constraints
 */
export function validateConstraints(
  value: any,
  constraints: Constraint[]
): ValidationResult {
  const errors: string[] = [];

  for (const constraint of constraints) {
    if (!satisfiesConstraint(value, constraint)) {
      errors.push(
        `Value does not satisfy ${constraint.type} constraint for field ${constraint.field}`
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined,
  };
}

/**
 * Get all constraints for a specific field
 */
export function getFieldConstraints(
  field: string,
  constraints: Constraint[]
): Constraint[] {
  return constraints.filter((c) => c.field === field);
}

/**
 * Check if all constraints are satisfied
 */
export function allConstraintsSatisfied(
  values: Record<string, any>,
  constraints: Constraint[]
): boolean {
  for (const constraint of constraints) {
    const value = values[constraint.field];
    if (value === undefined) {
      // Skip if value not provided (might be optional)
      continue;
    }
    if (!satisfiesConstraint(value, constraint)) {
      return false;
    }
  }
  return true;
}
