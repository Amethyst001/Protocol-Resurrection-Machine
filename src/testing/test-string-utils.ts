import { toPascalCase, toSnakeCase, toKebabCase } from '../utils/string-utils.js';

const testStr = "Demo Chat";
console.log(`Original: "${testStr}"`);
console.log(`Pascal:   "${toPascalCase(testStr)}"`);
console.log(`Snake:    "${toSnakeCase(testStr)}"`);

const testStrNBSP = "Demo\u00A0Chat";
console.log(`Original NBSP: "${testStrNBSP}"`);
console.log(`Pascal NBSP:   "${toPascalCase(testStrNBSP)}"`);
console.log(`Snake NBSP:    "${toSnakeCase(testStrNBSP)}"`);
