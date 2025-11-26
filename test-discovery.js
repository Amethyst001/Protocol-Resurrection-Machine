// Quick test of discovery fingerprint generation
import { YAMLParser, generateFingerprint, FingerprintDatabase } from './dist/index.js';
import fs from 'fs';

console.log('Testing Gopher fingerprint generation...\n');

// Load and parse Gopher spec
const yaml = fs.readFileSync('protocols/gopher.yaml', 'utf-8');
const parser = new YAMLParser();
const spec = parser.parse(yaml);

console.log('Protocol:', spec.protocol.name);
console.log('Port:', spec.protocol.port);
console.log('Message Types:', spec.messageTypes.map(m => m.name).join(', '));
console.log();

// Generate fingerprint
const fingerprint = generateFingerprint(spec);

console.log('Generated Fingerprint:');
console.log('- Protocol:', fingerprint.protocol);
console.log('- Default Port:', fingerprint.defaultPort);
console.log('- Initial Handshake:', fingerprint.initialHandshake || 'none');
console.log('- Response Patterns:', fingerprint.responsePatterns.length);
console.log('- Probes:', fingerprint.probes.length);
console.log();

console.log('Response Patterns:');
fingerprint.responsePatterns.forEach((pattern, i) => {
  console.log(`  ${i + 1}. Type: ${pattern.type}, Value: ${JSON.stringify(pattern.value)}, Weight: ${pattern.weight}`);
  if (pattern.description) console.log(`     Description: ${pattern.description}`);
});
console.log();

console.log('Probes:');
fingerprint.probes.forEach((probe, i) => {
  console.log(`  ${i + 1}. Name: ${probe.name}`);
  console.log(`     Payload: ${probe.payload.toString('hex')} (${probe.payload.toString()})`);
  console.log(`     Timeout: ${probe.timeout}ms`);
});
console.log();

// Test database
const db = new FingerprintDatabase();
db.add(fingerprint);

console.log('Fingerprint added to database');
console.log('Database size:', db.size());
console.log('Query by port 70:', db.queryByPort(70).map(f => f.protocol).join(', '));
