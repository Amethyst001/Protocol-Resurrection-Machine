import { RequestParser } from '../generated/dic/dic/dic-parser.js';

const parser = new RequestParser();

// Test 1: With optional field
console.log('\n=== Test 1: With optional field ===');
const data1 = Buffer.from('START 123 | test payload [TIMEOUT:30]\n\n', 'utf-8');
const result1 = parser.parse(data1);
console.log('Success:', result1.success);
console.log('Message:', result1.message);
console.log('Error:', result1.error);

// Test 2: Without optional field
console.log('\n=== Test 2: Without optional field ===');
const data2 = Buffer.from('START 456 | another payload\n\n', 'utf-8');
const result2 = parser.parse(data2);
console.log('Success:', result2.success);
console.log('Message:', result2.message);
console.log('Error:', result2.error);

// Test 3: With special characters
console.log('\n=== Test 3: With special characters ===');
const data3 = Buffer.from('START 2 | payload with | pipes\n\n', 'utf-8');
const result3 = parser.parse(data3);
console.log('Success:', result3.success);
console.log('Message:', result3.message);
console.log('Error:', result3.error);

// Test 4: Zero timeout
console.log('\n=== Test 4: Zero timeout ===');
const data4 = Buffer.from('START 3 | payload [TIMEOUT:0]\n\n', 'utf-8');
const result4 = parser.parse(data4);
console.log('Success:', result4.success);
console.log('Message:', result4.message);
console.log('Error:', result4.error);
