/**
 * Constraint propagation for domain reduction
 * 
 * This module implements constraint propagation algorithms to reduce
 * the domain of possible values for each field based on constraints.
 */

import type { Constraint, LengthConstraint, RangeConstraint } from './constraint-types.js';
import { satisfiesConstraint } from './constraint-types.js';

/**
 * Domain of possible values for a field
 */
export interface Domain {
  field: string;
  values: Set<any>;
}

/**
 * Domain map for all fields
 */
export type DomainMap = Map<string, Set<any>>;

/**
 * Propagation result
 */
export interface PropagationResult {
  domains: DomainMap;
  changed: boolean;
  inconsistent: boolean;
}

/**
 * Initialize domains for fields based on constraints
 */
export function initializeDomains(
  fields: string[],
  constraints: Constraint[]
): DomainMap {
  const domains: DomainMap = new Map();

  for (const field of fields) {
    const fieldConstraints = constraints.filter((c) => c.field === field);
    const domain = generateInitialDomain(field, fieldConstraints);
    domains.set(field, domain);
  }

  return domains;
}

/**
 * Generate initial domain for a field based on its constraints
 */
function generateInitialDomain(field: string, constraints: Constraint[]): Set<any> {
  const domain = new Set<any>();

  if (constraints.length === 0) {
    // No constraints, use a default domain
    return new Set(['', 'test', 'value', 0, 1, 10, 100]);
  }

  // Generate domain based on constraint types
  for (const constraint of constraints) {
    switch (constraint.type) {
      case 'enum':
        // Enum values are the domain
        constraint.values.forEach((v) => domain.add(v));
        break;

      case 'range': {
        // Generate numeric values in range
        const min = constraint.min ?? 0;
        const max = constraint.max ?? 100;
        const step = Math.max(1, Math.floor((max - min) / 20));
        for (let i = min; i <= max; i += step) {
          domain.add(i);
        }
        // Always include boundaries
        domain.add(min);
        domain.add(max);
        break;
      }

      case 'length': {
        // Generate strings of various lengths
        const minLen = constraint.min ?? 0;
        const maxLen = constraint.max ?? 20;
        for (let len = minLen; len <= Math.min(maxLen, minLen + 10); len++) {
          domain.add('a'.repeat(len));
        }
        break;
      }

      case 'pattern':
        // For patterns, generate some candidate strings
        domain.add('test');
        domain.add('value');
        domain.add('abc123');
        domain.add('example');
        break;

      case 'custom':
        // For custom constraints, use common values
        domain.add('');
        domain.add('test');
        domain.add(0);
        domain.add(1);
        domain.add(true);
        domain.add(false);
        break;
    }
  }

  return domain;
}

/**
 * Reduce domain by removing values that don't satisfy a constraint
 */
function reduceDomain(domain: Set<any>, constraint: Constraint): Set<any> {
  const reduced = new Set<any>();

  for (const value of domain) {
    if (satisfiesConstraint(value, constraint)) {
      reduced.add(value);
    }
  }

  return reduced;
}

/**
 * Propagate constraints to reduce domains
 */
export function propagateConstraints(
  domains: DomainMap,
  constraints: Constraint[]
): PropagationResult {
  let changed = true;
  let iterations = 0;
  const maxIterations = 100;
  const newDomains = new Map(domains);

  while (changed && iterations < maxIterations) {
    changed = false;
    iterations++;

    for (const constraint of constraints) {
      const domain = newDomains.get(constraint.field);
      if (!domain) {
        continue;
      }

      const reducedDomain = reduceDomain(domain, constraint);

      if (reducedDomain.size < domain.size) {
        newDomains.set(constraint.field, reducedDomain);
        changed = true;
      }

      // Check for inconsistency (empty domain)
      if (reducedDomain.size === 0) {
        return {
          domains: newDomains,
          changed: true,
          inconsistent: true,
        };
      }
    }
  }

  return {
    domains: newDomains,
    changed: iterations > 1,
    inconsistent: false,
  };
}

/**
 * Arc consistency algorithm (AC-3)
 * 
 * This ensures that for every value in a domain, there exists
 * a compatible value in related domains.
 */
export function enforceArcConsistency(
  domains: DomainMap,
  constraints: Constraint[]
): PropagationResult {
  const newDomains = new Map(domains);
  const queue: [string, string][] = [];

  // Build initial queue of arcs (field pairs with constraints)
  const fieldPairs = new Set<string>();
  for (const c1 of constraints) {
    for (const c2 of constraints) {
      if (c1.field !== c2.field) {
        const pair = [c1.field, c2.field].sort().join(':');
        if (!fieldPairs.has(pair)) {
          fieldPairs.add(pair);
          queue.push([c1.field, c2.field]);
        }
      }
    }
  }

  let changed = false;

  while (queue.length > 0) {
    const arc = queue.shift();
    if (!arc) break;

    const [field1, field2] = arc;
    const domain1 = newDomains.get(field1);
    const domain2 = newDomains.get(field2);

    if (!domain1 || !domain2) {
      continue;
    }

    const revised = reviseArc(field1, domain1, field2, domain2, constraints);

    if (revised.changed) {
      changed = true;
      newDomains.set(field1, revised.domain);

      // Check for inconsistency
      if (revised.domain.size === 0) {
        return {
          domains: newDomains,
          changed: true,
          inconsistent: true,
        };
      }

      // Add related arcs back to queue
      for (const constraint of constraints) {
        if (constraint.field !== field1 && constraint.field !== field2) {
          queue.push([constraint.field, field1]);
        }
      }
    }
  }

  return {
    domains: newDomains,
    changed,
    inconsistent: false,
  };
}

/**
 * Revise an arc between two fields
 */
function reviseArc(
  field1: string,
  domain1: Set<any>,
  field2: string,
  domain2: Set<any>,
  constraints: Constraint[]
): { changed: boolean; domain: Set<any> } {
  const newDomain = new Set(domain1);
  let changed = false;

  // Get constraints that relate these fields
  const relatedConstraints = constraints.filter(
    (c) => c.field === field1 || c.field === field2
  );

  for (const value1 of domain1) {
    let hasSupport = false;

    // Check if there exists a value in domain2 that is compatible
    for (const value2 of domain2) {
      const testSolution = { [field1]: value1, [field2]: value2 };
      let compatible = true;

      for (const constraint of relatedConstraints) {
        const testValue = testSolution[constraint.field];
        if (testValue !== undefined && !satisfiesConstraint(testValue, constraint)) {
          compatible = false;
          break;
        }
      }

      if (compatible) {
        hasSupport = true;
        break;
      }
    }

    if (!hasSupport) {
      newDomain.delete(value1);
      changed = true;
    }
  }

  return { changed, domain: newDomain };
}

/**
 * Combine constraint propagation with arc consistency
 */
export function fullPropagation(
  domains: DomainMap,
  constraints: Constraint[]
): PropagationResult {
  // First, do basic constraint propagation
  let result = propagateConstraints(domains, constraints);

  if (result.inconsistent) {
    return result;
  }

  // Then, enforce arc consistency
  result = enforceArcConsistency(result.domains, constraints);

  return result;
}

/**
 * Get the most constrained field (smallest domain)
 * This is useful for variable ordering in search
 */
export function getMostConstrainedField(domains: DomainMap): string | null {
  let minSize = Infinity;
  let mostConstrained: string | null = null;

  for (const [field, domain] of domains.entries()) {
    if (domain.size > 0 && domain.size < minSize) {
      minSize = domain.size;
      mostConstrained = field;
    }
  }

  return mostConstrained;
}

/**
 * Get domain statistics
 */
export function getDomainStats(domains: DomainMap): {
  totalFields: number;
  totalValues: number;
  averageDomainSize: number;
  minDomainSize: number;
  maxDomainSize: number;
} {
  let totalValues = 0;
  let minSize = Infinity;
  let maxSize = 0;

  for (const domain of domains.values()) {
    const size = domain.size;
    totalValues += size;
    minSize = Math.min(minSize, size);
    maxSize = Math.max(maxSize, size);
  }

  return {
    totalFields: domains.size,
    totalValues,
    averageDomainSize: domains.size > 0 ? totalValues / domains.size : 0,
    minDomainSize: minSize === Infinity ? 0 : minSize,
    maxDomainSize: maxSize,
  };
}
