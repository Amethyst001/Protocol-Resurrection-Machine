/**
 * String manipulation utilities
 */

/**
 * Convert a string to PascalCase
 * Removes spaces and capitalizes the first letter of each word
 */
export function toPascalCase(str: string): string {
    return str
        .replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) => {
            return word.toUpperCase();
        })
        .replace(/\s+/g, '');
}

/**
 * Convert a string to kebab-case
 * Converts camelCase to kebab-case and replaces spaces/underscores with hyphens
 */
export function toKebabCase(str: string): string {
    return str
        .replace(/([a-z])([A-Z])/g, '$1-$2')
        .replace(/[\s_]+/g, '-')
        .toLowerCase();
}

/**
 * Convert a string to camelCase
 */
export function toCamelCase(str: string): string {
    return str
        .replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) => {
            return index === 0 ? word.toLowerCase() : word.toUpperCase();
        })
        .replace(/\s+/g, '');
}

/**
 * Convert a string to snake_case
 * Converts camelCase to snake_case and replaces spaces/hyphens with underscores
 */
export function toSnakeCase(str: string): string {
    return str
        .replace(/([a-z])([A-Z])/g, '$1_$2')
        .replace(/[\s-]+/g, '_')
        .toLowerCase();
}
