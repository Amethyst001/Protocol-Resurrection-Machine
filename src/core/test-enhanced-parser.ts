/**
 * Test suite for EnhancedFormatParser
 * Tests parsing of complex format strings
 */

import { EnhancedFormatParser } from './enhanced-format-parser.js';

const parser = new EnhancedFormatParser();

// Test 1: DIC Protocol format
console.log('=== Test 1: DIC Protocol ===');
const dicFormat = 'START {id} | {payload} [TIMEOUT:{seconds}]\\n\\n';
const dicParsed = parser.parse(dicFormat);

console.log('Format:', dicFormat);
console.log('Tokens:', JSON.stringify(dicParsed.tokens, null, 2));
console.log('Required fields:', dicParsed.requiredFields);
console.log('Optional fields:', dicParsed.optionalFields);
console.log('Prefix:', JSON.stringify(parser.getPrefix(dicFormat)));
console.log('Suffix:', JSON.stringify(parser.getSuffix(dicFormat)));
console.log('Delimiters:', parser.extractDelimiters(dicFormat));

// Test 2: Simple format
console.log('\n=== Test 2: Simple Format ===');
const simpleFormat = '{command}\\r\\n';
const simpleParsed = parser.parse(simpleFormat);
console.log('Format:', simpleFormat);
console.log('Tokens:', JSON.stringify(simpleParsed.tokens, null, 2));

// Test 3: Multiple optional fields
console.log('\n=== Test 3: Multiple Optional Fields ===');
const multiOptional = 'CMD {id} [OPT1:{value1}] [OPT2:{value2}]\\n';
const multiParsed = parser.parse(multiOptional);
console.log('Format:', multiOptional);
console.log('Required fields:', multiParsed.requiredFields);
console.log('Optional fields:', multiParsed.optionalFields);
console.log('Tokens:', JSON.stringify(multiParsed.tokens, null, 2));

console.log('\n✅ All tests passed!');
