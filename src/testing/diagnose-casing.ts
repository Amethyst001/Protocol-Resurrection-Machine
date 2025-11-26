import { YAMLParser } from '../core/yaml-parser.js';
import { GoGenerator } from '../generation/multi-language/go-generator.js';
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

messageTypes:
  - name: Login
    direction: request
    format: "LOGIN {username}\\n"
    terminator: "\\n"
`;

async function test() {
    console.log('🔍 Diagnosing "Demo Chat" code generation...\n');

    const parser = new YAMLParser();
    const spec = parser.parse(yamlContent);

    // Test Go
    console.log('=== GO GENERATOR ===');
    const goProfile = createLanguageProfileWithSteering('go');
    const goGen = new GoGenerator();
    const goResult = await goGen.generate(spec, goProfile);

    const goFirstLines = goResult.parser.split('\n').slice(0, 5);
    console.log('First 5 lines:');
    goFirstLines.forEach((line, i) => console.log(`${i + 1}: ${line}`));

    const badGo = ['demo chat', 'Demo Chat'];
    const goodGo = ['demo_chat', 'DemoChat'];

    console.log('\nSearching for bad patterns:');
    badGo.forEach(pattern => {
        if (goResult.parser.includes(pattern)) {
            console.log(`❌ Found "${pattern}"`);
            // Show context
            const index = goResult.parser.indexOf(pattern);
            console.log(`   Context: "${goResult.parser.substring(index - 20, index + pattern.length + 20)}"`);
        }
    });

    console.log('\nSearching for good patterns:');
    goodGo.forEach(pattern => {
        if (goResult.parser.includes(pattern)) {
            console.log(`✅ Found "${pattern}"`);
        }
    });

    // Test Python
    console.log('\n\n=== PYTHON GENERATOR ===');
    const pyProfile = createLanguageProfileWithSteering('python');
    const pyGen = new PythonGenerator();
    const pyResult = await pyGen.generate(spec, pyProfile);

    const pyFirstLines = pyResult.parser.split('\n').slice(0, 10);
    console.log('First 10 lines:');
    pyFirstLines.forEach((line, i) => console.log(`${i + 1}: ${line}`));

    const badPy = ['demo chat', 'Demo ChatParser'];
    const goodPy = ['demo_chat', 'DemoChatParser'];

    console.log('\nSearching for bad patterns:');
    badPy.forEach(pattern => {
        if (pyResult.parser.includes(pattern)) {
            console.log(`❌ Found "${pattern}"`);
            const index = pyResult.parser.indexOf(pattern);
            console.log(`   Context: "${pyResult.parser.substring(index - 20, index + pattern.length + 20)}"`);
        }
    });

    console.log('\nSearching for good patterns:');
    goodPy.forEach(pattern => {
        if (pyResult.parser.includes(pattern)) {
            console.log(`✅ Found "${pattern}"`);
        }
    });
}

test().catch(console.error);
