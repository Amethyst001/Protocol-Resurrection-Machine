/**
 * Simple test of enhanced format parser with DIC format
 */

import { EnhancedFormatParser } from './core/enhanced-format-parser.js';

const parser = new EnhancedFormatParser();

// Test DIC format
const dicFormat = 'START {id} | {payload} [TIMEOUT:{seconds}]\\n\\n';
console.log('Testing format:', dicFormat);
console.log('');

try {
    const parsed = parser.parse(dicFormat);

    console.log('✅ Parsing successful!');
    console.log('');
    console.log('Required fields:', parsed.requiredFields);
    console.log('Optional fields:', parsed.optionalFields);
    console.log('');
    console.log('Tokens:');
    for (const token of parsed.tokens) {
        console.log(`  - ${token.type}: ${JSON.stringify(token.value)}`);
        if (token.type === 'field' || token.type === 'optional') {
            console.log(`    Field: ${token.fieldName}`);
        }
    }
} catch (error) {
    console.error('❌ Parsing failed:', error);
}
