import type { ProtocolSpec } from '../types/protocol-spec.js';
import type { CrossLanguageExample } from './example-generator.js';

export interface InteractiveExample {
  id: string;
  title: string;
  description: string;
  language: 'typescript' | 'python' | 'go' | 'rust';
  code: string;
  runnable: boolean;
  expectedOutput?: string;
  errorHandling?: string;
}

export interface InteractiveDocumentation {
  protocol: string;
  examples: InteractiveExample[];
  playground: PlaygroundConfig;
}

export interface PlaygroundConfig {
  enabled: boolean;
  languages: ('typescript' | 'python' | 'go' | 'rust')[];
  defaultLanguage: 'typescript' | 'python' | 'go' | 'rust';
  executionTimeout: number;
}

export class InteractiveDocGenerator {
  /**
   * Generate interactive documentation with runnable examples
   */
  generateInteractiveDoc(
    spec: ProtocolSpec,
    examples: CrossLanguageExample[]
  ): InteractiveDocumentation {
    const interactiveExamples: InteractiveExample[] = [];

    // Convert cross-language examples to interactive examples
    examples.forEach((example, index) => {
      // TypeScript example
      interactiveExamples.push({
        id: `example-${index}-ts`,
        title: `${example.title} (TypeScript)`,
        description: example.description,
        language: 'typescript',
        code: example.typescript,
        runnable: true,
        expectedOutput: this.generateExpectedOutput(spec, example.title),
        errorHandling: this.generateErrorHandling('typescript')
      });

      // Python example
      interactiveExamples.push({
        id: `example-${index}-py`,
        title: `${example.title} (Python)`,
        description: example.description,
        language: 'python',
        code: example.python,
        runnable: true,
        expectedOutput: this.generateExpectedOutput(spec, example.title),
        errorHandling: this.generateErrorHandling('python')
      });

      // Go example
      interactiveExamples.push({
        id: `example-${index}-go`,
        title: `${example.title} (Go)`,
        description: example.description,
        language: 'go',
        code: example.go,
        runnable: true,
        expectedOutput: this.generateExpectedOutput(spec, example.title),
        errorHandling: this.generateErrorHandling('go')
      });

      // Rust example
      interactiveExamples.push({
        id: `example-${index}-rust`,
        title: `${example.title} (Rust)`,
        description: example.description,
        language: 'rust',
        code: example.rust,
        runnable: true,
        expectedOutput: this.generateExpectedOutput(spec, example.title),
        errorHandling: this.generateErrorHandling('rust')
      });
    });

    return {
      protocol: spec.protocol.name,
      examples: interactiveExamples,
      playground: {
        enabled: true,
        languages: ['typescript', 'python', 'go', 'rust'],
        defaultLanguage: 'typescript',
        executionTimeout: 30000 // 30 seconds
      }
    };
  }

  /**
   * Generate HTML for interactive documentation
   */
  generateHTML(interactiveDoc: InteractiveDocumentation): string {
    const html: string[] = [];

    html.push('<!DOCTYPE html>');
    html.push('<html lang="en">');
    html.push('<head>');
    html.push('  <meta charset="UTF-8">');
    html.push('  <meta name="viewport" content="width=device-width, initial-scale=1.0">');
    html.push(`  <title>${interactiveDoc.protocol} Protocol - Interactive Documentation</title>`);
    html.push('  <style>');
    html.push(this.generateCSS());
    html.push('  </style>');
    html.push('</head>');
    html.push('<body>');
    html.push(`  <h1>${interactiveDoc.protocol} Protocol - Interactive Examples</h1>`);
    html.push('  <div class="container">');

    // Generate example sections
    interactiveDoc.examples.forEach(example => {
      html.push('    <div class="example-section">');
      html.push(`      <h2>${example.title}</h2>`);
      html.push(`      <p>${example.description}</p>`);
      html.push('      <div class="code-container">');
      html.push(`        <pre><code class="language-${example.language}">${this.escapeHTML(example.code)}</code></pre>`);
      html.push('      </div>');
      
      if (example.runnable) {
        html.push(`      <button class="run-button" onclick="runExample('${example.id}')">Run Example</button>`);
        html.push(`      <div id="output-${example.id}" class="output-container" style="display: none;"></div>`);
      }

      if (example.expectedOutput) {
        html.push('      <div class="expected-output">');
        html.push('        <h4>Expected Output:</h4>');
        html.push(`        <pre>${this.escapeHTML(example.expectedOutput)}</pre>`);
        html.push('      </div>');
      }

      if (example.errorHandling) {
        html.push('      <div class="error-handling">');
        html.push('        <h4>Error Handling:</h4>');
        html.push(`        <p>${example.errorHandling}</p>`);
        html.push('      </div>');
      }

      html.push('    </div>');
    });

    html.push('  </div>');
    html.push('  <script>');
    html.push(this.generateJavaScript(interactiveDoc));
    html.push('  </script>');
    html.push('</body>');
    html.push('</html>');

    return html.join('\n');
  }

  /**
   * Generate CSS for interactive documentation
   */
  private generateCSS(): string {
    return `
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
        line-height: 1.6;
        color: #333;
        max-width: 1200px;
        margin: 0 auto;
        padding: 20px;
        background-color: #f5f5f5;
      }
      
      h1 {
        color: #2c3e50;
        border-bottom: 3px solid #3498db;
        padding-bottom: 10px;
      }
      
      h2 {
        color: #34495e;
        margin-top: 30px;
      }
      
      .container {
        background-color: white;
        padding: 30px;
        border-radius: 8px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      }
      
      .example-section {
        margin-bottom: 40px;
        padding-bottom: 40px;
        border-bottom: 1px solid #e0e0e0;
      }
      
      .example-section:last-child {
        border-bottom: none;
      }
      
      .code-container {
        background-color: #f8f9fa;
        border: 1px solid #dee2e6;
        border-radius: 4px;
        padding: 15px;
        margin: 15px 0;
        overflow-x: auto;
      }
      
      pre {
        margin: 0;
        font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
        font-size: 14px;
      }
      
      code {
        color: #e83e8c;
      }
      
      .run-button {
        background-color: #3498db;
        color: white;
        border: none;
        padding: 10px 20px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 16px;
        transition: background-color 0.3s;
      }
      
      .run-button:hover {
        background-color: #2980b9;
      }
      
      .run-button:disabled {
        background-color: #95a5a6;
        cursor: not-allowed;
      }
      
      .output-container {
        background-color: #2c3e50;
        color: #ecf0f1;
        border-radius: 4px;
        padding: 15px;
        margin-top: 15px;
        font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
        font-size: 14px;
        white-space: pre-wrap;
      }
      
      .output-container.error {
        background-color: #e74c3c;
      }
      
      .output-container.success {
        background-color: #27ae60;
      }
      
      .expected-output, .error-handling {
        background-color: #f0f8ff;
        border-left: 4px solid #3498db;
        padding: 15px;
        margin-top: 15px;
      }
      
      .expected-output h4, .error-handling h4 {
        margin-top: 0;
        color: #2980b9;
      }
      
      .loading {
        display: inline-block;
        width: 20px;
        height: 20px;
        border: 3px solid rgba(255,255,255,.3);
        border-radius: 50%;
        border-top-color: #fff;
        animation: spin 1s ease-in-out infinite;
      }
      
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
    `;
  }

  /**
   * Generate JavaScript for interactive documentation
   */
  private generateJavaScript(interactiveDoc: InteractiveDocumentation): string {
    return `
      async function runExample(exampleId) {
        const outputDiv = document.getElementById('output-' + exampleId);
        const button = event.target;
        
        // Show output container
        outputDiv.style.display = 'block';
        outputDiv.className = 'output-container';
        outputDiv.innerHTML = '<div class="loading"></div> Running example...';
        
        // Disable button
        button.disabled = true;
        
        try {
          // In a real implementation, this would call an API endpoint
          // to execute the code in a sandboxed environment
          const response = await fetch('/api/execute', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              exampleId: exampleId,
              protocol: '${interactiveDoc.protocol}'
            })
          });
          
          const result = await response.json();
          
          if (result.success) {
            outputDiv.className = 'output-container success';
            outputDiv.textContent = result.output;
          } else {
            outputDiv.className = 'output-container error';
            outputDiv.textContent = 'Error: ' + result.error;
          }
        } catch (error) {
          outputDiv.className = 'output-container error';
          outputDiv.textContent = 'Execution failed: ' + error.message + '\\n\\nNote: This is a demo. In a real implementation, examples would be executed in a sandboxed environment.';
        } finally {
          // Re-enable button
          button.disabled = false;
        }
      }
      
      // Syntax highlighting (basic)
      document.addEventListener('DOMContentLoaded', function() {
        const codeBlocks = document.querySelectorAll('code');
        codeBlocks.forEach(block => {
          // Basic syntax highlighting could be added here
          // For production, use a library like Prism.js or Highlight.js
        });
      });
    `;
  }

  /**
   * Generate expected output for an example
   */
  private generateExpectedOutput(spec: ProtocolSpec, exampleTitle: string): string {
    if (exampleTitle.includes('Connecting')) {
      return 'Connected successfully';
    } else if (exampleTitle.includes('Request')) {
      return `Response: { /* ${spec.protocol.name} response data */ }`;
    } else if (exampleTitle.includes('Parsing')) {
      return `Parsed message: { type: "...", /* fields */ }
Message type: ...`;
    } else if (exampleTitle.includes('Serializing')) {
      return `Serialized data: <Buffer ...>
Length: ... bytes`;
    }
    return 'Example output';
  }

  /**
   * Generate error handling description
   */
  private generateErrorHandling(language: string): string {
    switch (language) {
      case 'typescript':
        return 'Errors are thrown as Error objects. Use try/catch blocks to handle them.';
      case 'python':
        return 'Errors are raised as Exception objects. Use try/except blocks to handle them.';
      case 'go':
        return 'Errors are returned as error values. Always check if err != nil.';
      case 'rust':
        return 'Errors are returned as Result<T, E>. Use ? operator or match to handle them.';
      default:
        return 'Handle errors according to language conventions.';
    }
  }

  /**
   * Escape HTML special characters
   */
  private escapeHTML(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
