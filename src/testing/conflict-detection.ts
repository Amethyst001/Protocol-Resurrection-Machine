/**
 * Constraint conflict detection
 * 
 * This module detects conflicts between constraints that make them
 * impossible to satisfy simultaneously.
 */

import type {
  Constraint,
  LengthConstraint,
  RangeConstraint,
  EnumConstraint,
  PatternConstraint,
} from './constraint-types.js';

/**
 * Conflict detection result
 */
export interface ConflictResult {
  hasConflict: boolean;
  conflicts: ConflictDescription[] | undefined;
}

/**
 * Description of a constraint conflict
 */
export interface ConflictDescription {
  type: 'direct' | 'transitive';
  constraints: Constraint[];
  reason: string;
}

/**
 * Constraint dependency graph node
 */
interface GraphNode {
  constraint: Constraint;
  dependencies: Set<string>;
}

/**
 * Constraint dependency graph
 */
export class ConstraintGraph {
  private nodes: Map<string, GraphNode> = new Map();

  /**
   * Add a constraint to the graph
   */
  addConstraint(constraint: Constraint): void {
    const key = this.getConstraintKey(constraint);
    if (!this.nodes.has(key)) {
      this.nodes.set(key, {
        constraint,
        dependencies: new Set(),
      });
    }
  }

  /**
   * Add a dependency between constraints
   */
  addDependency(from: Constraint, to: Constraint): void {
    const fromKey = this.getConstraintKey(from);
    const toKey = this.getConstraintKey(to);

    this.addConstraint(from);
    this.addConstraint(to);

    const node = this.nodes.get(fromKey);
    if (node) {
      node.dependencies.add(toKey);
    }
  }

  /**
   * Check if the graph has cycles
   */
  hasCycle(): boolean {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    for (const key of this.nodes.keys()) {
      if (this.hasCycleUtil(key, visited, recursionStack)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Utility function for cycle detection
   */
  private hasCycleUtil(
    key: string,
    visited: Set<string>,
    recursionStack: Set<string>
  ): boolean {
    if (recursionStack.has(key)) {
      return true;
    }

    if (visited.has(key)) {
      return false;
    }

    visited.add(key);
    recursionStack.add(key);

    const node = this.nodes.get(key);
    if (node) {
      for (const dep of node.dependencies) {
        if (this.hasCycleUtil(dep, visited, recursionStack)) {
          return true;
        }
      }
    }

    recursionStack.delete(key);
    return false;
  }

  /**
   * Get a unique key for a constraint
   */
  private getConstraintKey(constraint: Constraint): string {
    return `${constraint.field}:${constraint.type}`;
  }
}

/**
 * Detect direct conflicts between two range constraints
 */
export function detectRangeConflict(
  c1: RangeConstraint,
  c2: RangeConstraint
): boolean {
  if (c1.field !== c2.field) {
    return false;
  }

  const min1 = c1.min ?? -Infinity;
  const max1 = c1.max ?? Infinity;
  const min2 = c2.min ?? -Infinity;
  const max2 = c2.max ?? Infinity;

  // Check if ranges don't overlap
  return max1 < min2 || max2 < min1;
}

/**
 * Detect direct conflicts between two length constraints
 */
export function detectLengthConflict(
  c1: LengthConstraint,
  c2: LengthConstraint
): boolean {
  if (c1.field !== c2.field) {
    return false;
  }

  const min1 = c1.min ?? 0;
  const max1 = c1.max ?? Infinity;
  const min2 = c2.min ?? 0;
  const max2 = c2.max ?? Infinity;

  // Check if ranges don't overlap
  return max1 < min2 || max2 < min1;
}

/**
 * Detect conflicts between enum and pattern constraints
 */
export function detectEnumPatternConflict(
  enumConstraint: EnumConstraint,
  patternConstraint: PatternConstraint
): boolean {
  if (enumConstraint.field !== patternConstraint.field) {
    return false;
  }

  const regex =
    typeof patternConstraint.pattern === 'string'
      ? new RegExp(patternConstraint.pattern)
      : patternConstraint.pattern;

  // Check if any enum value matches the pattern
  return !enumConstraint.values.some((value) => regex.test(value));
}

/**
 * Detect direct conflicts between two constraints
 */
export function detectDirectConflict(c1: Constraint, c2: Constraint): boolean {
  // Same field check
  if (c1.field !== c2.field) {
    return false;
  }

  // Range conflicts
  if (c1.type === 'range' && c2.type === 'range') {
    return detectRangeConflict(c1, c2);
  }

  // Length conflicts
  if (c1.type === 'length' && c2.type === 'length') {
    return detectLengthConflict(c1, c2);
  }

  // Enum-Pattern conflicts
  if (c1.type === 'enum' && c2.type === 'pattern') {
    return detectEnumPatternConflict(c1, c2);
  }
  if (c1.type === 'pattern' && c2.type === 'enum') {
    return detectEnumPatternConflict(c2, c1);
  }

  return false;
}

/**
 * Detect all direct conflicts in a set of constraints
 */
export function detectDirectConflicts(
  constraints: Constraint[]
): ConflictDescription[] {
  const conflicts: ConflictDescription[] = [];

  for (let i = 0; i < constraints.length; i++) {
    for (let j = i + 1; j < constraints.length; j++) {
      const c1 = constraints[i];
      const c2 = constraints[j];
      if (c1 && c2 && detectDirectConflict(c1, c2)) {
        conflicts.push({
          type: 'direct',
          constraints: [c1, c2],
          reason: `Constraints on field '${c1.field}' are incompatible`,
        });
      }
    }
  }

  return conflicts;
}

/**
 * Build a constraint dependency graph
 */
export function buildDependencyGraph(constraints: Constraint[]): ConstraintGraph {
  const graph = new ConstraintGraph();

  // Add all constraints
  for (const constraint of constraints) {
    graph.addConstraint(constraint);
  }

  // Add dependencies based on field relationships
  // Only add dependencies between constraints on DIFFERENT fields
  // Constraints on the same field don't create circular dependencies
  const fieldGroups = new Map<string, Constraint[]>();
  for (const constraint of constraints) {
    if (!fieldGroups.has(constraint.field)) {
      fieldGroups.set(constraint.field, []);
    }
    fieldGroups.get(constraint.field)!.push(constraint);
  }

  // Add dependencies between different fields
  // (In this simple implementation, we don't have cross-field dependencies)
  // So we don't add any dependencies

  return graph;
}

/**
 * Detect transitive conflicts using dependency graph
 */
export function detectTransitiveConflicts(
  constraints: Constraint[]
): ConflictDescription[] {
  const conflicts: ConflictDescription[] = [];
  const graph = buildDependencyGraph(constraints);

  // Check for cycles in the dependency graph
  if (graph.hasCycle()) {
    conflicts.push({
      type: 'transitive',
      constraints,
      reason: 'Circular dependency detected in constraints',
    });
  }

  return conflicts;
}

/**
 * Detect all conflicts (direct and transitive) in a set of constraints
 */
export function detectConflicts(constraints: Constraint[]): ConflictResult {
  const directConflicts = detectDirectConflicts(constraints);
  const transitiveConflicts = detectTransitiveConflicts(constraints);

  const allConflicts = [...directConflicts, ...transitiveConflicts];

  return {
    hasConflict: allConflicts.length > 0,
    conflicts: allConflicts.length > 0 ? allConflicts : undefined,
  };
}

/**
 * Format conflict descriptions for display
 */
export function formatConflicts(conflicts: ConflictDescription[]): string {
  return conflicts
    .map((conflict, index) => {
      const constraintDesc = conflict.constraints
        .map((c) => `${c.type} on ${c.field}`)
        .join(' and ');
      return `${index + 1}. ${conflict.type} conflict: ${constraintDesc}\n   Reason: ${conflict.reason}`;
    })
    .join('\n');
}
