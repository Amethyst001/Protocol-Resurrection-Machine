import { YAMLParser } from '../core/yaml-parser.js';
import { PythonGenerator } from '../generation/multi-language/python-generator.js';
import { createLanguageProfileWithSteering } from '../steering/steering-loader.js';

const yamlContent = `
protocol:
  name: Demo Chat
  port: 8080
  description: A simple chat protocol
  rfc: "demo-chat"

connection:
  type: TCP
  timeout: 60000
  keepAlive: true

messageTypes:
  - name: Login
    direction: request
    format: "LOGIN {username}\\n"
    terminator: "\\n"
`;

async function test() {
    console.log('🧪 Testing Python Generator with "Demo Chat" protocol...\n');

    const parser = new YAMLParser();
    const spec = parser.parse(yamlContent);

    const profile = createLanguageProfileWithSteering('python');
    const generator = new PythonGenerator();

    const result = await generator.generate(spec, profile);

    // Check client code for the critical test case
    console.log('📝 Checking for spaces in class names...\n');

    const badPatterns = [
        'Demo ChatParser',
        'Demo ChatSerializer',
        'Demo ChatClient',
        'demo chat_parser',
    ];

    const goodPatterns = [
        'DemoChatParser',
        'DemoChatSerializer',
        'DemoChatClient',
        'demo_chat_parser',
    ];

    let allGood = true;

    for (const pattern of badPatterns) {
        if (result.client.includes(pattern)) {
            console.log(`❌ FAIL: Found bad pattern "${pattern}"`);
            allGood = false;
        }
    }

    for (const pattern of goodPatterns) {
        if (result.client.includes(pattern)) {
            console.log(`✅ PASS: Found correct pattern "${pattern}"`);
        } else {
            console.log(`⚠️  WARN: Did not find expected pattern "${pattern}"`);
        }
    }

    if (allGood) {
        console.log(`\n✅ SUCCESS: Python generator correctly handles spaces in protocol names!`);
    } else {
        console.log(`\n❌ FAILURE: Python generator still has issues with spaces`);
        console.log(`\nFirst 500 chars of client code:\n`);
        console.log(result.client.substring(0, 500));
    }
}

test().catch(console.error);
