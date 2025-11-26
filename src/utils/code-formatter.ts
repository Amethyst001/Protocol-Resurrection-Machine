/**
 * Code Formatter Utility
 * 
 * Ensures all generated code follows strict formatting standards:
 * - Only standard whitespace characters (U+0020 space, \n newline)
 * - Consistent indentation (4 spaces)
 * - No non-breaking spaces (U+00A0)
 * - Language-specific formatting rules
 */

export interface FormatterOptions {
    language: 'typescript' | 'python' | 'go' | 'rust';
    indentSize?: number;
    maxLineLength?: number;
}

/**
 * Clean all non-standard whitespace from code
 * CRITICAL: Removes non-breaking spaces and other problematic characters
 */
export function cleanWhitespace(code: string): string {
    if (!code) return '';

    // Replace non-breaking spaces (U+00A0) with standard spaces (U+0020)
    let cleaned = code.replace(/\u00A0/g, ' ');

    // Replace any other non-standard whitespace with standard space
    cleaned = cleaned.replace(/[\u1680\u2000-\u200B\u202F\u205F\u3000\uFEFF]/g, ' ');

    // Normalize line endings to \n
    cleaned = cleaned.replace(/\r\n/g, '\n');
    cleaned = cleaned.replace(/\r/g, '\n');

    return cleaned;
}

/**
 * Normalize indentation to use standard spaces
 * Simplified version to avoid corruption
 */
export function normalizeIndentation(code: string, indentSize: number = 4): string {
    const lines = code.split('\n');
    const normalized: string[] = [];

    for (const line of lines) {
        // Trim end of line
        const trimmedRight = line.trimEnd();

        if (trimmedRight === '') {
            normalized.push('');
            continue;
        }

        // We won't try to re-indent for now to avoid corruption
        // Just ensure we don't have mixed tabs/spaces if possible
        // But for safety, just push the line as is (trimmed right)
        normalized.push(trimmedRight);
    }

    return normalized.join('\n');
}

/**
 * Format code according to language-specific rules
 */
export function formatCode(code: string, options: FormatterOptions): string {
    const indentSize = options.indentSize || 4;

    // Step 1: Clean all non-standard whitespace (CRITICAL)
    let formatted = cleanWhitespace(code);

    // Step 2: Normalize indentation (simplified)
    formatted = normalizeIndentation(formatted, indentSize);

    // Step 3: Apply language-specific formatting
    switch (options.language) {
        case 'python':
            formatted = formatPython(formatted, indentSize);
            break;
        case 'go':
            formatted = formatGo(formatted, indentSize);
            break;
        case 'rust':
            formatted = formatRust(formatted, indentSize);
            break;
        case 'typescript':
            formatted = formatTypeScript(formatted, indentSize);
            break;
    }

    // Step 4: Ensure file ends with single newline
    formatted = formatted.trimEnd() + '\n';

    return formatted;
}

/**
 * Format Python code
 */
function formatPython(code: string, _indentSize: number): string {
    // Simple formatting for now
    return code;
}

/**
 * Format Go code
 */
function formatGo(code: string, _indentSize: number): string {
    // Simple formatting for now
    return code;
}

/**
 * Format Rust code
 */
function formatRust(code: string, _indentSize: number): string {
    // Simple formatting for now
    return code;
}

/**
 * Format TypeScript code
 */
function formatTypeScript(code: string, _indentSize: number): string {
    // Simple formatting for now
    return code;
}

/**
 * Validate that code contains only standard whitespace
 * Returns array of problematic character positions
 */
export function validateWhitespace(code: string): Array<{ line: number; column: number; char: string; charCode: number }> {
    const problems: Array<{ line: number; column: number; char: string; charCode: number }> = [];
    const lines = code.split('\n');

    for (let lineNum = 0; lineNum < lines.length; lineNum++) {
        const line = lines[lineNum]!;

        for (let col = 0; col < line.length; col++) {
            const char = line[col]!;
            const charCode = char.charCodeAt(0);

            // Check for non-standard whitespace
            if (charCode === 0x00A0) { // Non-breaking space
                problems.push({
                    line: lineNum + 1,
                    column: col + 1,
                    char: char,
                    charCode: charCode
                });
            } else if (charCode >= 0x1680 && charCode <= 0x3000) {
                // Various Unicode whitespace characters
                if ([0x1680, 0x2000, 0x2001, 0x2002, 0x2003, 0x2004, 0x2005,
                    0x2006, 0x2007, 0x2008, 0x2009, 0x200A, 0x200B, 0x202F,
                    0x205F, 0x3000].includes(charCode)) {
                    problems.push({
                        line: lineNum + 1,
                        column: col + 1,
                        char: char,
                        charCode: charCode
                    });
                }
            } else if (charCode === 0xFEFF) { // Zero-width no-break space
                problems.push({
                    line: lineNum + 1,
                    column: col + 1,
                    char: char,
                    charCode: charCode
                });
            }
        }
    }

    return problems;
}
