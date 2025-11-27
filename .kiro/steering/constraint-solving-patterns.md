# Constraint Solving Patterns

This document defines patterns for implementing constraint solvers for property-based test generation.

## Constraint Types

### Length Constraints
```typescript
interface LengthConstraint {
  type: 'length';
  field: string;
  min?: number;
  max?: number;
}

function satisfyLength(value: string, constraint: LengthConstraint): boolean {
  if (constraint.min !== undefined && value.length < constraint.min) {
    return false;
  }
  if (constraint.max !== undefined && value.length > constraint.max) {
    return false;
  }
  return true;
}
```

### Range Constraints
```typescript
interface RangeConstraint {
  type: 'range';
  field: string;
  min?: number;
  max?: number;
}

function satisfyRange(value: number, constraint: RangeConstraint): boolean {
  if (constraint.min !== undefined && value < constraint.min) {
    return false;
  }
  if (constraint.max !== undefined && value > constraint.max) {
    return false;
  }
  return true;
}
```

### Pattern Constraints
```typescript
interface PatternConstraint {
  type: 'pattern';
  field: string;
  pattern: string;
}

function satisfyPattern(value: string, constraint: PatternConstraint): boolean {
  const regex = new RegExp(constraint.pattern);
  return regex.test(value);
}
```

### Enum Constraints
```typescript
interface EnumConstraint {
  type: 'enum';
  field: string;
  values: string[];
}

function satisfyEnum(value: string, constraint: EnumConstraint): boolean {
  return constraint.values.includes(value);
}
```

## Conflict Detection

### Direct Conflicts
```typescript
function detectDirectConflict(
  c1: RangeConstraint,
  c2: RangeConstraint
): boolean {
  // Check if ranges don't overlap
  if (c1.field === c2.field) {
    const min1 = c1.min ?? -Infinity;
    const max1 = c1.max ?? Infinity;
    const min2 = c2.min ?? -Infinity;
    const max2 = c2.max ?? Infinity;
    
    return max1 < min2 || max2 < min1;
  }
  return false;
}
```

### Transitive Conflicts
```typescript
function detectTransitiveConflict(
  constraints: Constraint[]
): boolean {
  // Build dependency graph
  const graph = buildDependencyGraph(constraints);
  
  // Check for cycles or impossible combinations
  return hasCycle(graph) || hasImpossiblePath(graph);
}
```

## Multi-Constraint Satisfaction

### Backtracking Solver
```typescript
function solveConstraints(
  fields: string[],
  constraints: Constraint[]
): Record<string, any> | null {
  const solution: Record<string, any> = {};
  
  function backtrack(fieldIndex: number): boolean {
    if (fieldIndex === fields.length) {
      return true; // All fields assigned
    }
    
    const field = fields[fieldIndex];
    const fieldConstraints = constraints.filter(c => c.field === field);
    
    // Generate candidate values
    const candidates = generateCandidates(field, fieldConstraints);
    
    for (const value of candidates) {
      solution[field] = value;
      
      // Check if this assignment satisfies all constraints
      if (satisfiesAll(solution, constraints)) {
        if (backtrack(fieldIndex + 1)) {
          return true;
        }
      }
      
      delete solution[field];
    }
    
    return false;
  }
  
  return backtrack(0) ? solution : null;
}
```

### Constraint Propagation
```typescript
function propagateConstraints(
  domains: Map<string, Set<any>>,
  constraints: Constraint[]
): Map<string, Set<any>> {
  let changed = true;
  
  while (changed) {
    changed = false;
    
    for (const constraint of constraints) {
      const domain = domains.get(constraint.field);
      if (!domain) continue;
      
      const newDomain = new Set(
        Array.from(domain).filter(value =>
          satisfiesConstraint(value, constraint)
        )
      );
      
      if (newDomain.size < domain.size) {
        domains.set(constraint.field, newDomain);
        changed = true;
      }
    }
  }
  
  return domains;
}
```

## Performance Optimization

### Constraint Ordering
```typescript
function orderConstraints(constraints: Constraint[]): Constraint[] {
  // Order by specificity (most restrictive first)
  return constraints.sort((a, b) => {
    const specificityA = getSpecificity(a);
    const specificityB = getSpecificity(b);
    return specificityB - specificityA;
  });
}

function getSpecificity(constraint: Constraint): number {
  switch (constraint.type) {
    case 'enum':
      return constraint.values.length;
    case 'pattern':
      return 10; // Patterns are moderately specific
    case 'range':
      const range = (constraint.max ?? Infinity) - (constraint.min ?? -Infinity);
      return 1 / range;
    case 'length':
      const lengthRange = (constraint.max ?? Infinity) - (constraint.min ?? 0);
      return 1 / lengthRange;
    default:
      return 0;
  }
}
```

### Caching
```typescript
class ConstraintSolver {
  private cache = new Map<string, any>();
  
  solve(constraints: Constraint[]): any | null {
    const key = this.getCacheKey(constraints);
    
    if (this.cache.has(key)) {
      return this.cache.get(key);
    }
    
    const solution = this.solveInternal(constraints);
    this.cache.set(key, solution);
    
    return solution;
  }
  
  private getCacheKey(constraints: Constraint[]): string {
    return JSON.stringify(constraints.sort((a, b) =>
      JSON.stringify(a).localeCompare(JSON.stringify(b))
    ));
  }
}
```

## Fallback Strategies

### Relaxation
```typescript
function solveWithRelaxation(
  constraints: Constraint[]
): any | null {
  // Try to solve with all constraints
  let solution = solve(constraints);
  if (solution) return solution;
  
  // Relax constraints one by one
  const relaxable = constraints.filter(c => c.priority !== 'required');
  
  for (let i = 0; i < relaxable.length; i++) {
    const relaxed = constraints.filter(c => c !== relaxable[i]);
    solution = solve(relaxed);
    if (solution) {
      console.warn(`Relaxed constraint: ${relaxable[i].field}`);
      return solution;
    }
  }
  
  return null;
}
```

### Partial Solutions
```typescript
function findPartialSolution(
  constraints: Constraint[]
): Partial<Record<string, any>> {
  const solution: Partial<Record<string, any>> = {};
  
  // Group constraints by field
  const byField = groupBy(constraints, c => c.field);
  
  // Solve each field independently
  for (const [field, fieldConstraints] of byField) {
    const value = solveField(field, fieldConstraints);
    if (value !== null) {
      solution[field] = value;
    }
  }
  
  return solution;
}
```

## Integration with fast-check

### Custom Arbitraries
```typescript
import * as fc from 'fast-check';

function createConstrainedArbitrary(
  baseArbitrary: fc.Arbitrary<any>,
  constraints: Constraint[]
): fc.Arbitrary<any> {
  return baseArbitrary.filter(value =>
    constraints.every(c => satisfiesConstraint(value, c))
  );
}

// Example usage
const constrainedString = createConstrainedArbitrary(
  fc.string(),
  [
    { type: 'length', field: 'name', min: 1, max: 50 },
    { type: 'pattern', field: 'name', pattern: '^[a-zA-Z0-9]+$' }
  ]
);
```

### Constraint-Based Generators
```typescript
function generateFromConstraints(
  constraints: Constraint[]
): fc.Arbitrary<any> {
  const solution = solveConstraints(
    constraints.map(c => c.field),
    constraints
  );
  
  if (!solution) {
    throw new Error('No solution found for constraints');
  }
  
  // Build arbitrary from solution
  return fc.record(
    Object.fromEntries(
      Object.entries(solution).map(([field, value]) => [
        field,
        fc.constant(value)
      ])
    )
  );
}
```

## Testing Constraint Solvers

### Property Tests
```typescript
describe('Constraint Solver', () => {
  it('should satisfy all constraints', () => {
    fc.assert(
      fc.property(
        fc.array(constraintArbitrary),
        (constraints) => {
          const solution = solve(constraints);
          if (solution) {
            return constraints.every(c =>
              satisfiesConstraint(solution[c.field], c)
            );
          }
          return true; // No solution is acceptable
        }
      )
    );
  });
  
  it('should detect conflicts', () => {
    const conflicting: Constraint[] = [
      { type: 'range', field: 'port', min: 1000, max: 2000 },
      { type: 'range', field: 'port', min: 3000, max: 4000 }
    ];
    
    expect(detectConflict(conflicting)).toBe(true);
  });
});
```

