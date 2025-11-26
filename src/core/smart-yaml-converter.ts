/**
 * Smart YAML Converter
 * Intelligently converts various input formats into valid protocol YAML
 */

export class SmartYAMLConverter {
    /**
     * Main entry point - tries to convert any input into valid YAML
     */
    convert(input: string): string {
        // Try to detect what kind of input this is
        const trimmed = input.trim();

        // Already valid YAML with protocol key
        if (trimmed.includes('protocol:') && trimmed.includes('name:')) {
            return this.fixYAML(input);
        }

        // TypeScript/JavaScript code
        if (this.isTypeScriptCode(trimmed)) {
            return this.extractFromTypeScript(trimmed);
        }

        // Partial YAML or broken YAML
        if (trimmed.includes(':') || trimmed.includes('-')) {
            return this.fixYAML(trimmed);
        }

        // Plain text - create a basic protocol
        return this.createBasicProtocol(trimmed);
    }

    /**
     * Detect if input is TypeScript/JavaScript code
     */
    private isTypeScriptCode(input: string): boolean {
        const tsIndicators = [
            'interface ',
            'export ',
            'class ',
            'function ',
            'const ',
            'import ',
            '//',
            '/**',
        ];

        return tsIndicators.some(indicator => input.includes(indicator));
    }

    /**
     * Extract protocol information from TypeScript code
     */
    private extractFromTypeScript(code: string): string {
        const info: any = {
            name: 'extracted',
            rfc: 'N/A',
            port: 8000,
            description: 'Extracted from TypeScript code',
        };

        // Extract protocol name from comments or class names
        const nameMatch = code.match(/Protocol[:\s]+(\w+)/i) ||
            code.match(/RFC[:\s]+(\d+)/i) ||
            code.match(/class\s+(\w+)Protocol/);
        if (nameMatch) {
            info.name = nameMatch[1].toLowerCase();
        }

        // Extract RFC number
        const rfcMatch = code.match(/RFC[:\s]+(\d+)/i) || code.match(/rfc[:\s]+(\d+)/i);
        if (rfcMatch) {
            info.rfc = rfcMatch[1];
        }

        // Extract port
        const portMatch = code.match(/port[:\s]+(\d+)/i) || code.match(/Port[:\s]+(\d+)/);
        if (portMatch) {
            info.port = parseInt(portMatch[1]);
        }

        // Extract message interfaces
        const messages: any[] = [];
        const interfaceRegex = /interface\s+(\w+)\s*\{([^}]+)\}/g;
        let match;

        while ((match = interfaceRegex.exec(code)) !== null) {
            const messageName = match[1];
            const body = match[2];

            // Extract fields from interface
            const fields: any[] = [];
            const fieldRegex = /(\w+)[\?]?:\s*(string|number|boolean)/g;
            let fieldMatch;

            while ((fieldMatch = fieldRegex.exec(body)) !== null) {
                const fieldName = fieldMatch[1];
                const fieldType = fieldMatch[2];
                const isOptional = body.includes(`${fieldName}?:`);

                fields.push({
                    name: fieldName,
                    type: fieldType,
                    required: !isOptional,
                    description: this.extractFieldDescription(body, fieldName),
                });
            }

            if (fields.length > 0) {
                messages.push({
                    name: messageName,
                    description: `${messageName} message`,
                    direction: messageName.toLowerCase().includes('request') ? 'request' : 'response',
                    fields: fields,
                });
            }
        }

        // Build YAML
        return this.buildYAML(info, messages);
    }

    /**
     * Extract field description from comments
     */
    private extractFieldDescription(body: string, fieldName: string): string {
        const lines = body.split('\n');
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].includes(fieldName)) {
                // Check previous line for comment
                if (i > 0 && lines[i - 1].includes('//')) {
                    return lines[i - 1].replace(/\/\/\s*/, '').trim();
                }
                // Check same line for comment
                const commentMatch = lines[i].match(/\/\/\s*(.+)$/);
                if (commentMatch) {
                    return commentMatch[1].trim();
                }
            }
        }
        return `The ${fieldName} field`;
    }

    /**
     * Fix broken or incomplete YAML
     */
    private fixYAML(yaml: string): string {
        let fixed = yaml;

        // Ensure protocol section exists
        if (!fixed.includes('protocol:')) {
            fixed = 'protocol:\n  name: custom\n  port: 8000\n\n' + fixed;
        }

        // Ensure connection section exists
        if (!fixed.includes('connection:')) {
            const portMatch = fixed.match(/port:\s*(\d+)/);
            const port = portMatch ? portMatch[1] : '8000';
            fixed += '\n\nconnection:\n  type: TCP\n  port: ' + port + '\n  timeout: 10000\n';
        }

        // Ensure messages section exists if there are message-like structures
        if (!fixed.includes('messages:') && !fixed.includes('messageTypes:')) {
            if (fixed.includes('fields:') || fixed.includes('format:')) {
                fixed += '\n\nmessages:\n  - name: CustomMessage\n    direction: request\n    fields: []\n';
            }
        }

        return fixed;
    }

    /**
     * Create a basic protocol from plain text
     */
    private createBasicProtocol(text: string): string {
        const name = text.split(/\s+/)[0].toLowerCase().replace(/[^a-z0-9]/g, '') || 'custom';

        return `protocol:
  name: ${name}
  rfc: N/A
  port: 8000
  description: Custom protocol

connection:
  type: TCP
  port: 8000
  timeout: 10000

messages:
  - name: Request
    description: Basic request message
    direction: request
    format: "{command}\\r\\n"
    fields:
      - name: command
        type: string
        required: true
        description: Command to execute
`;
    }

    /**
     * Build YAML from extracted info
     */
    private buildYAML(info: any, messages: any[]): string {
        let yaml = `protocol:
  name: ${info.name}
  rfc: ${info.rfc}
  port: ${info.port}
  description: ${info.description}

connection:
  type: TCP
  port: ${info.port}
  timeout: 10000
`;

        if (messages.length > 0) {
            yaml += '\nmessages:\n';
            for (const msg of messages) {
                yaml += `  - name: ${msg.name}\n`;
                yaml += `    description: ${msg.description}\n`;
                yaml += `    direction: ${msg.direction}\n`;

                if (msg.fields && msg.fields.length > 0) {
                    yaml += '    fields:\n';
                    for (const field of msg.fields) {
                        yaml += `      - name: ${field.name}\n`;
                        yaml += `        type: ${field.type}\n`;
                        yaml += `        required: ${field.required}\n`;
                        yaml += `        description: ${field.description}\n`;
                    }
                }
            }
        }

        return yaml;
    }
}
