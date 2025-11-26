/**
 * Format String Parser
 * Parses format strings with {placeholder} syntax for protocol message formats
 */

import type { FieldDefinition } from '../types/protocol-spec.js';
import { YAMLParseError } from '../types/errors.js';

/**
 * Represents a parsed placeholder in a format string
 */
export interface FormatPlaceholder {
  /** Field name referenced by the placeholder */
  fieldName: string;
  /** Start position in the format string */
  startPos: number;
  /** End position in the format string */
  endPos: number;
  /** Original placeholder text including braces */
  originalText: string;
}

/**
 * Represents a parsed format string
 */
export interface ParsedFormat {
  /** Original format string */
  original: string;
  /** Placeholders found in the format string */
  placeholders: FormatPlaceholder[];
  /** Fixed string parts (text between placeholders) */
  fixedParts: string[];
  /** Whether the format has any placeholders */
  hasPlaceholders: boolean;
}

/**
 * Format string parser for protocol message formats
 */
export class FormatParser {
  /**
   * Parse a format string and extract placeholders
   * @param format - Format string with {placeholder} syntax
   * @returns Parsed format information
   */
  parse(format: string): ParsedFormat {
    const placeholders: FormatPlaceholder[] = [];
    const fixedParts: string[] = [];

    let currentFixed = '';
    let i = 0;

    while (i < format.length) {
      const char = format[i];

      // Check for escaped braces
      if (char === '\\' && i + 1 < format.length) {
        const nextChar = format[i + 1];
        if (nextChar === '{' || nextChar === '}' || nextChar === '\\') {
          // Escaped character - add the escaped character to fixed part
          currentFixed += nextChar;
          i += 2;
          continue;
        }
      }

      // Check for placeholder start
      if (char === '{') {
        // Save the fixed part before this placeholder
        fixedParts.push(currentFixed);
        currentFixed = '';

        // Find the closing brace
        const startPos = i;
        let endPos = i + 1;
        let foundClose = false;

        while (endPos < format.length) {
          if (format[endPos] === '\\' && endPos + 1 < format.length) {
            // Skip escaped character
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
            `Unclosed placeholder at position ${startPos} in format string: "${format}"`
          );
        }

        // Extract field name
        const content = format.substring(i + 1, endPos).trim();

        if (!content) {
          throw new YAMLParseError(
            `Empty placeholder at position ${startPos} in format string: "${format}"`
          );
        }

        // Handle format specifiers (e.g. {name:u16} or {name:10})
        const parts = content.split(':');
        const fieldName = parts[0] || '';

        // Validate field name (alphanumeric, underscore, hyphen)
        if (!/^[a-zA-Z_][a-zA-Z0-9_-]*$/.test(fieldName)) {
          throw new YAMLParseError(
            `Invalid field name "${fieldName}" in placeholder at position ${startPos}. ` +
            `Field names must start with a letter or underscore and contain only letters, numbers, underscores, and hyphens.`
          );
        }

        placeholders.push({
          fieldName,
          startPos,
          endPos: endPos + 1,
          originalText: format.substring(startPos, endPos + 1),
        });

        i = endPos + 1;
      } else if (char === '}') {
        // Unmatched closing brace
        throw new YAMLParseError(
          `Unmatched closing brace at position ${i} in format string: "${format}"`
        );
      } else {
        currentFixed += char;
        i++;
      }
    }

    // Add the final fixed part
    fixedParts.push(currentFixed);

    return {
      original: format,
      placeholders,
      fixedParts,
      hasPlaceholders: placeholders.length > 0,
    };
  }

  /**
   * Validate that all placeholders reference actual fields
   * @param format - Format string to validate
   * @param fields - Field definitions to validate against
   * @param messageName - Name of the message (for error messages)
   * @throws YAMLParseError if validation fails
   */
  validatePlaceholders(
    format: string,
    fields: FieldDefinition[],
    messageName: string
  ): void {
    const parsed = this.parse(format);
    const fieldNames = new Set(fields.map(f => f.name));

    for (const placeholder of parsed.placeholders) {
      if (!fieldNames.has(placeholder.fieldName)) {
        throw new YAMLParseError(
          `Placeholder "{${placeholder.fieldName}}" in message "${messageName}" ` +
          `references undefined field. Available fields: ${Array.from(fieldNames).join(', ')}`
        );
      }
    }
  }

  /**
   * Extract field names from a format string
   * @param format - Format string to extract from
   * @returns Array of field names in order of appearance
   */
  extractFieldNames(format: string): string[] {
    const parsed = this.parse(format);
    return parsed.placeholders.map(p => p.fieldName);
  }

  /**
   * Get the positions of all placeholders in a format string
   * @param format - Format string to analyze
   * @returns Array of placeholder positions
   */
  getPlaceholderPositions(format: string): Array<{ fieldName: string; position: number }> {
    const parsed = this.parse(format);
    return parsed.placeholders.map(p => ({
      fieldName: p.fieldName,
      position: p.startPos,
    }));
  }

  /**
   * Check if a format string contains a specific field
   * @param format - Format string to check
   * @param fieldName - Field name to look for
   * @returns True if the field is referenced in the format
   */
  containsField(format: string, fieldName: string): boolean {
    const parsed = this.parse(format);
    return parsed.placeholders.some(p => p.fieldName === fieldName);
  }

  /**
   * Replace placeholders in a format string with values
   * @param format - Format string with placeholders
   * @param values - Object mapping field names to values
   * @returns Format string with placeholders replaced
   */
  replacePlaceholders(format: string, values: Record<string, any>): string {
    const parsed = this.parse(format);
    let result = '';
    let lastPos = 0;

    for (const placeholder of parsed.placeholders) {
      // Add the fixed part before this placeholder
      result += format.substring(lastPos, placeholder.startPos);

      // Add the value for this placeholder
      // Use Object.prototype.hasOwnProperty.call to safely check for properties
      // This avoids prototype pollution issues with __proto__, constructor, etc.
      if (!Object.prototype.hasOwnProperty.call(values, placeholder.fieldName)) {
        throw new Error(
          `Missing value for field "${placeholder.fieldName}" in format string`
        );
      }
      // Use Object.getOwnPropertyDescriptor to safely get the value
      // This ensures we get the actual property value, not inherited properties
      const descriptor = Object.getOwnPropertyDescriptor(values, placeholder.fieldName);
      const value = descriptor ? descriptor.value : values[placeholder.fieldName];
      result += String(value);

      lastPos = placeholder.endPos;
    }

    // Add the remaining fixed part
    result += format.substring(lastPos);

    return result;
  }

  /**
   * Unescape escaped characters in a string
   * @param str - String with escaped characters
   * @returns Unescaped string
   */
  unescape(str: string): string {
    return str.replace(/\\([{}\\])/g, '$1');
  }

  /**
   * Escape special characters in a string
   * @param str - String to escape
   * @returns Escaped string
   */
  escape(str: string): string {
    return str.replace(/([{}\\])/g, '\\$1');
  }
}
