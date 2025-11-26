const fs = require('fs');

// Read the file as lines
const lines = fs.readFileSync('src/generation/state-machine-parser-generator.ts', 'utf8').split('\n');

// The code to insert (as individual lines)
const fixLines = [
    '',
    '\t\tlines.push(` \t \t if (nextState.type === \'OPTIONAL_FIELD\' && nextState.metadata?.optionalPrefix) {`);',
    '\t\tlines.push(` \t \t \t // Find the optional section marker (e.g., "[TIMEOUT:")`);',
    '\t\tlines.push(` \t \t \t const optPrefix = \'[\' + nextState.metadata.optionalPrefix;`);',
    '\t\tlines.push(` \t \t \t const optBuf = Buffer.from(optPrefix, \'utf-8\');`);',
    '\t\tlines.push(` \t \t \t const index = context.data.indexOf(optBuf, context.offset);`);',
    '\t\tlines.push(` \t \t \t if (index !== -1) return index;`);',
    '\t\tlines.push(` \t \t \t // If not found, continue to fallback scanning`);',
    '\t\tlines.push(` \t \t }`);',
    '\t\tlines.push(``);'
];

// Find the line with "// FIX: ADDED FALLBACK SCANNING" (first occurrence)
let insertIndex = -1;
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('// FIX: ADDED FALLBACK SCANNING')) {
        insertIndex = i;
        break;
    }
}

if (insertIndex !== -1) {
    // Insert the fix lines before the FALLBACK comment
    const result = [
        ...lines.slice(0, insertIndex),
        ...fixLines,
        ...lines.slice(insertIndex)
    ];
    
    fs.writeFileSync('src/generation/state-machine-parser-generator.ts', result.join('\n'), 'utf8');
    console.log('✓ Fix applied successfully at line', insertIndex);
} else {
    console.log('✗ Could not find insertion point');
}
