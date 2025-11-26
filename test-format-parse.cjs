const { EnhancedFormatParser } = require('./dist/index.js');

const parser = new EnhancedFormatParser();
const format = 'START {id} | {payload} [TIMEOUT:{seconds}]\\n\\n';

console.log('Format:', format);
console.log('\nParsing...\n');

const result = parser.parse(format);

console.log('Tokens:');
result.tokens.forEach((token, i) => {
    console.log(`${i}: ${token.type} - "${token.value}" ${token.fieldName ? `(field: ${token.fieldName})` : ''}`);
    if (token.optionalPrefix) console.log(`   optionalPrefix: "${token.optionalPrefix}"`);
    if (token.optionalSuffix) console.log(`   optionalSuffix: "${token.optionalSuffix}"`);
});
