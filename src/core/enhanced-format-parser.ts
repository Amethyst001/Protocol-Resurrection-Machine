/**
 * Enhanced Format Parser
 * Parses complex format strings with:
 * - {field} placeholders
 * - [OPTIONAL:{field}] optional sections
 * - Fixed strings (prefixes, suffixes, delimiters)
 * - Proper tokenization for code generation
 */

import type { FieldDefinition } from '../types/protocol-spec.js';
import { YAMLParseError } from '../types/errors.js';

/**
 * Token types in a format string
 */
export type FormatTokenType =
    | 'fixed'        // Fixed string (e.g., "START ", "\n\n")
    | 'field'        // Required field placeholder (e.g., {id})
    | 'optional'     // Optional section (e.g., [TIMEOUT:{seconds}])
    | 'delimiter';   // Delimiter between fields (e.g., " | ")

/**
 * Represents a token in a parsed format string
 */
export interface FormatToken {
    /** Token type */
    type: FormatTokenType;
    /** Token value/content */
    value: string;
    /** Start position in format string */
    startPos: number;
    /** End position in format string */
    endPos: number;
    /** Field name (for field/optional tokens) */
    fieldName?: string;
    /** Whether this token is required */
    required: boolean;
    /** For optional tokens: the fixed prefix before the field */
    optionalPrefix?: string;
    /** For optional tokens: the fixed suffix after the field */
    optionalSuffix?: string;
}

/**
 * Enhanced parsed format with token-based representation
 */
export interface EnhancedParsedFormat {
    /** Original format string */
    original: string;
    /** Parsed tokens in order */
    tokens: FormatToken[];
    /** All field names referenced */
    fieldNames: string[];
    /** Required field names */
    requiredFields: string[];
    /** Optional field names */
    optionalFields: string[];
    /** Whether format has any placeholders */
    hasPlaceholders: boolean;
    /** Whether format has optional sections */
    hasOptionalSections: boolean;
}

/**
 * Enhanced Format Parser
 * Handles complex protocol format strings with optional sections
 */
export class EnhancedFormatParser {
    /**
     * Parse a complex format string into tokens
     * Format: "START {id} | {payload} [TIMEOUT:{seconds}]\n\n"
     */
    parse(format: string): EnhancedParsedFormat {
        const tokens: FormatToken[] = [];
        const fieldNames: string[] = [];
        const requiredFields: string[] = [];
        const optionalFields: string[] = [];

        let i = 0;
        let currentFixed = '';
        let hasOptionalSections = false;

        const pushFixedToken = (value: string, startPos: number, endPos: number) => {
            if (value.length > 0) {
                tokens.push({
                    type: 'fixed',
                    value,
                    startPos,
                    endPos,
                    required: true
                });
            }
        };

        while (i < format.length) {
            const char = format[i];

            // Handle escaped characters
            if (char === '\\' && i + 1 < format.length) {
                const nextChar = format[i + 1];
                if (nextChar === '{' || nextChar === '}' || nextChar === '[' || nextChar === ']' || nextChar === '\\') {
                    currentFixed += nextChar;
                    i += 2;
                    continue;
                }
            }

            // Handle required field placeholder: {fieldName}
            if (char === '{') {
                // Save any fixed string before this placeholder
                if (currentFixed.length > 0) {
                    pushFixedToken(currentFixed, i - currentFixed.length, i);
                    currentFixed = '';
                }

                const startPos = i;
                let endPos = i + 1;
                let foundClose = false;

                // Find closing brace
                while (endPos < format.length) {
                    if (format[endPos] === '\\' && endPos + 1 < format.length) {
                        endPos += 2;
                        continue;
                    }
                    if (format[endPos] === '}') {
                        foundClose = true;
                        break;
                    }
                    endPos++;
                }

                if (!foundClose) {
                    throw new YAMLParseError(
                        `Unclosed placeholder at position ${startPos} in format: "${format}"`
                    );
                }

                const content = format.substring(i + 1, endPos).trim();
                if (!content) {
                    throw new YAMLParseError(
                        `Empty placeholder at position ${startPos} in format: "${format}"`
                    );
                }

                // Handle format specifiers (e.g. {name:u16} or {name:10})
                const parts = content.split(':');
                const fieldName = parts[0];

                if (!fieldName) {
                    throw new YAMLParseError(
                        `Invalid field name at position ${startPos}`
                    );
                }

                // formatSpecifier is parsed but not currently used - reserved for future enhancement
                // const formatSpecifier = parts.length > 1 ? parts.slice(1).join(':') : undefined;

                // Validate field name
                if (!/^[a-zA-Z_][a-zA-Z0-9_-]*$/.test(fieldName)) {
                    throw new YAMLParseError(
                        `Invalid field name "${fieldName}" at position ${startPos}`
                    );
                }

                tokens.push({
                    type: 'field',
                    value: format.substring(startPos, endPos + 1),
                    startPos,
                    endPos: endPos + 1,
                    fieldName,
                    required: true
                });

                fieldNames.push(fieldName);
                requiredFields.push(fieldName);
                i = endPos + 1;
                continue;
            }

            // Handle optional section: [PREFIX:{fieldName}SUFFIX]
            if (char === '[') {
                hasOptionalSections = true;

                // Save any fixed string before this optional section
                if (currentFixed.length > 0) {
                    pushFixedToken(currentFixed, i - currentFixed.length, i);
                    currentFixed = '';
                }

                const startPos = i;
                let endPos = i + 1;
                let foundClose = false;
                let depth = 1;

                // Find matching closing bracket (handle nested brackets)
                while (endPos < format.length && depth > 0) {
                    if (format[endPos] === '\\' && endPos + 1 < format.length) {
                        endPos += 2;
                        continue;
                    }
                    if (format[endPos] === '[') depth++;
                    if (format[endPos] === ']') {
                        depth--;
                        if (depth === 0) {
                            foundClose = true;
                            break;
                        }
                    }
                    endPos++;
                }

                if (!foundClose) {
                    throw new YAMLParseError(
                        `Unclosed optional section at position ${startPos} in format: "${format}"`
                    );
                }

                // Parse the optional section content
                const optionalContent = format.substring(i + 1, endPos);
                const fieldMatch = optionalContent.match(/\{([a-zA-Z_][a-zA-Z0-9_-]*)\}/);

                if (!fieldMatch) {
                    throw new YAMLParseError(
                        `Optional section at position ${startPos} must contain a field placeholder: "${optionalContent}"`
                    );
                }

                const fieldName = fieldMatch[1];
                const fieldPlaceholder = fieldMatch[0];
                const fieldIndex = optionalContent.indexOf(fieldPlaceholder);

                if (!fieldName) {
                    throw new YAMLParseError(
                        `Invalid field name in optional section at position ${startPos}`
                    );
                }

                const optionalPrefix = optionalContent.substring(0, fieldIndex);
                const optionalSuffix = optionalContent.substring(fieldIndex + fieldPlaceholder.length);

                tokens.push({
                    type: 'optional',
                    value: format.substring(startPos, endPos + 1),
                    startPos,
                    endPos: endPos + 1,
                    fieldName,
                    required: false,
                    optionalPrefix,
                    optionalSuffix
                });

                fieldNames.push(fieldName);
                optionalFields.push(fieldName);
                i = endPos + 1;
                continue;
            }

            // Handle unmatched closing brackets
            if (char === '}' || char === ']') {
                throw new YAMLParseError(
                    `Unmatched closing ${char === '}' ? 'brace' : 'bracket'} at position ${i} in format: "${format}"`
                );
            }

            // Regular character - add to current fixed string
            currentFixed += char;
            i++;
        }

        // Add any remaining fixed string
        if (currentFixed.length > 0) {
            pushFixedToken(currentFixed, i - currentFixed.length, i);
        }

        return {
            original: format,
            tokens,
            fieldNames,
            requiredFields,
            optionalFields,
            hasPlaceholders: fieldNames.length > 0,
            hasOptionalSections
        };
    }

    /**
     * Validate that all field references exist in the field definitions
     */
    validateFields(
        format: string,
        fields: FieldDefinition[],
        messageName: string
    ): void {
        const parsed = this.parse(format);
        const fieldMap = new Map(fields.map(f => [f.name, f]));

        for (const fieldName of parsed.fieldNames) {
            const field = fieldMap.get(fieldName);
            if (!field) {
                throw new YAMLParseError(
                    `Field "${fieldName}" referenced in format for message "${messageName}" is not defined. ` +
                    `Available fields: ${fields.map(f => f.name).join(', ')}`
                );
            }

            // Check if required/optional matches field definition
            const isOptionalInFormat = parsed.optionalFields.includes(fieldName);
            const isOptionalInDef = !field.required;

            if (isOptionalInFormat && !isOptionalInDef) {
                console.warn(
                    `Warning: Field "${fieldName}" is marked as optional in format but required in definition for message "${messageName}"`
                );
            }
        }
    }

    /**
     * Extract delimiters from the format
     * Delimiters are fixed strings between field placeholders
     */
    extractDelimiters(format: string): string[] {
        const parsed = this.parse(format);
        const delimiters: string[] = [];

        for (let i = 0; i < parsed.tokens.length; i++) {
            const token = parsed.tokens[i];
            const nextToken = parsed.tokens[i + 1];

            if (!token) continue;

            // A fixed token between two field/optional tokens is likely a delimiter
            if (token.type === 'fixed' &&
                i > 0 &&
                nextToken &&
                (nextToken.type === 'field' || nextToken.type === 'optional')) {
                const prevToken = parsed.tokens[i - 1];
                if (prevToken && (prevToken.type === 'field' || prevToken.type === 'optional')) {
                    delimiters.push(token.value);
                }
            }
        }

        return delimiters;
    }

    /**
     * Get the fixed prefix (before first field)
     */
    getPrefix(format: string): string {
        const parsed = this.parse(format);
        if (parsed.tokens.length === 0) return '';

        const firstToken = parsed.tokens[0];
        if (!firstToken) return '';
        return firstToken.type === 'fixed' ? firstToken.value : '';
    }

    /**
     * Get the fixed suffix (after last field)
     */
    getSuffix(format: string): string {
        const parsed = this.parse(format);
        if (parsed.tokens.length === 0) return '';

        const lastToken = parsed.tokens[parsed.tokens.length - 1];
        if (!lastToken) return '';
        return lastToken.type === 'fixed' ? lastToken.value : '';
    }
}
