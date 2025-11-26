/**
 * Idiom Application Engine
 * 
 * Applies language-specific idioms and patterns to generated code.
 * Transforms code to follow language conventions and best practices.
 */

import type { LanguageIdiom, TargetLanguage } from '../types/language-target.js';

/**
 * Context for idiom application
 */
export interface IdiomContext {
  /** The target language */
  language: TargetLanguage;
  
  /** The code being transformed */
  code: string;
  
  /** Additional context variables */
  variables?: Record<string, string>;
  
  /** Whether to apply all idioms or only high-priority ones */
  applyAll?: boolean;
}

/**
 * Result of idiom application
 */
export interface IdiomApplicationResult {
  /** The transformed code */
  code: string;
  
  /** Number of idioms applied */
  appliedCount: number;
  
  /** List of applied idiom names */
  appliedIdioms: string[];
  
  /** Any warnings or issues */
  warnings: string[];
}

/**
 * Apply a single idiom to code
 * 
 * @param code - The code to transform
 * @param idiom - The idiom to apply
 * @param context - Additional context
 * @returns Transformed code and whether the idiom was applied
 */
export function applyIdiom(
  code: string,
  idiom: LanguageIdiom,
  context?: Record<string, string>
): { code: string; applied: boolean } {
  // Check if condition is met (if specified)
  if (idiom.condition && !evaluateCondition(idiom.condition, context)) {
    return { code, applied: false };
  }
  
  try {
    // Try to apply as regex pattern
    const regex = new RegExp(idiom.pattern, 'g');
    const newCode = code.replace(regex, idiom.replacement);
    
    // Check if any replacements were made
    const applied = newCode !== code;
    
    return { code: newCode, applied };
  } catch (error) {
    // If regex fails, try simple string replacement
    const newCode = code.split(idiom.pattern).join(idiom.replacement);
    const applied = newCode !== code;
    
    return { code: newCode, applied };
  }
}

/**
 * Apply multiple idioms to code
 * 
 * @param code - The code to transform
 * @param idioms - Array of idioms to apply
 * @param context - Additional context
 * @returns Application result with transformed code
 */
export function applyIdioms(
  code: string,
  idioms: LanguageIdiom[],
  context?: Record<string, string>
): IdiomApplicationResult {
  let currentCode = code;
  const appliedIdioms: string[] = [];
  const warnings: string[] = [];
  
  // Sort idioms by priority (higher priority first)
  const sortedIdioms = [...idioms].sort((a, b) => {
    const priorityA = a.priority ?? 0;
    const priorityB = b.priority ?? 0;
    return priorityB - priorityA;
  });
  
  // Apply each idiom
  for (const idiom of sortedIdioms) {
    try {
      const result = applyIdiom(currentCode, idiom, context);
      
      if (result.applied) {
        currentCode = result.code;
        appliedIdioms.push(idiom.name);
      }
    } catch (error) {
      warnings.push(`Failed to apply idiom "${idiom.name}": ${error}`);
    }
  }
  
  return {
    code: currentCode,
    appliedCount: appliedIdioms.length,
    appliedIdioms,
    warnings
  };
}

/**
 * Apply idioms with full context
 * 
 * @param context - Idiom application context
 * @param idioms - Array of idioms to apply
 * @returns Application result
 */
export function applyIdiomsWithContext(
  context: IdiomContext,
  idioms: LanguageIdiom[]
): IdiomApplicationResult {
  // Filter idioms if not applying all
  const idiomsToApply = context.applyAll 
    ? idioms 
    : idioms.filter(i => (i.priority ?? 0) > 5);
  
  return applyIdioms(context.code, idiomsToApply, context.variables);
}

/**
 * Evaluate a condition string
 * 
 * Simple condition evaluation for idiom application
 * Supports basic comparisons and variable checks
 * 
 * @param condition - Condition string to evaluate
 * @param context - Context variables
 * @returns True if condition is met
 */
function evaluateCondition(
  condition: string,
  context?: Record<string, string>
): boolean {
  if (!context) {
    return true;
  }
  
  // Simple variable existence check
  if (condition.startsWith('has:')) {
    const variable = condition.substring(4).trim();
    return variable in context;
  }
  
  // Simple equality check
  if (condition.includes('==')) {
    const parts = condition.split('==').map(s => s.trim());
    const left = parts[0] || '';
    const right = parts[1] || '';
    const leftValue = context[left] || left;
    const rightValue = context[right] || right;
    return leftValue === rightValue;
  }
  
  // Simple inequality check
  if (condition.includes('!=')) {
    const parts = condition.split('!=').map(s => s.trim());
    const left = parts[0] || '';
    const right = parts[1] || '';
    const leftValue = context[left] || left;
    const rightValue = context[right] || right;
    return leftValue !== rightValue;
  }
  
  // Default: assume true
  return true;
}

/**
 * Create a batch idiom applier for multiple code files
 * 
 * @param idioms - Array of idioms to apply
 * @returns Function that applies idioms to code
 */
export function createIdiomApplier(
  idioms: LanguageIdiom[]
): (code: string, context?: Record<string, string>) => string {
  return (code: string, context?: Record<string, string>) => {
    const result = applyIdioms(code, idioms, context);
    return result.code;
  };
}

/**
 * Validate idiom patterns
 * 
 * Checks if idiom patterns are valid regex patterns
 * 
 * @param idioms - Array of idioms to validate
 * @returns Array of validation errors (empty if all valid)
 */
export function validateIdioms(idioms: LanguageIdiom[]): string[] {
  const errors: string[] = [];
  
  for (const idiom of idioms) {
    try {
      new RegExp(idiom.pattern);
    } catch (error) {
      errors.push(`Invalid pattern in idiom "${idiom.name}": ${error}`);
    }
  }
  
  return errors;
}

/**
 * Get idiom statistics
 * 
 * @param idioms - Array of idioms
 * @returns Statistics about the idioms
 */
export function getIdiomStats(idioms: LanguageIdiom[]): {
  total: number;
  highPriority: number;
  withConditions: number;
} {
  return {
    total: idioms.length,
    highPriority: idioms.filter(i => (i.priority ?? 0) > 5).length,
    withConditions: idioms.filter(i => i.condition).length
  };
}
