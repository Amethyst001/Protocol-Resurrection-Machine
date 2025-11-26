/**
 * Test the enhanced Python generator with DIC protocol
 */

import { readFileSync } from 'fs';
import yaml from 'js-yaml';
import { PythonParserGenerator, PythonSerializerGenerator } from './generation/multi-language/python-generator.js';

// Read DIC protocol YAML
const yamlContent = readFileSync('protocols/dic.yaml', 'utf-8');

// Parse YAML directly
const rawSpec = yaml.load(yamlContent) as any;

// Transform to ProtocolSpec format (simplified for test)
const spec = {
    protocol: {
        name: rawSpec.protocol.name,
        rfc: rawSpec.protocol.rfc,
        port: rawSpec.protocol.port,
        description: rawSpec.protocol.description
    },
    connection: rawSpec.connection,
    messageTypes: rawSpec.messages.map((msg: any) => ({
        name: msg.name,
        direction: msg.direction,
        format: msg.format,
        fields: msg.fields,
        description: msg.description
    }))
};

console.log('=== Parsed Spec ===');
console.log(JSON.stringify(spec, null, 2));
console.log('\n');

// Generate Python parser
const parserGen = new PythonParserGenerator();
const parserCode = parserGen.generate(spec, { idioms: [], conventions: {} } as any);

console.log('=== Generated Python Parser ===');
console.log(parserCode);
console.log('\n');

// Generate Python serializer
const serializerGen = new PythonSerializerGenerator();
const serializerCode = serializerGen.generate(spec, { idioms: [], conventions: {} } as any);

console.log('=== Generated Python Serializer ===');
console.log(serializerCode);
