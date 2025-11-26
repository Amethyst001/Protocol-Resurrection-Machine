import yaml from 'js-yaml';
import { SmartYAMLConverter } from './smart-yaml-converter';
import { YAMLParser } from './yaml-parser';

export interface FixerResult {
    fixedYaml: string;
    fixesApplied: string[];
    wasConverted: boolean;
    valid: boolean;
    diagnostics?: any[];
}

export class SpecFixer {
    private converter = new SmartYAMLConverter();
    private parser = new YAMLParser();

    /**
     * Attempt to fix a malformed or invalid protocol specification
     */
    fix(content: string): FixerResult {
        const fixes: string[] = [];
        let fixedYaml = content;
        let wasConverted = false;

        // 1. Try to fix syntax first using SmartYAMLConverter
        try {
            const converted = this.converter.convert(content);
            if (converted !== content) {
                fixedYaml = converted;
                wasConverted = true;
                fixes.push('Fixed YAML syntax errors');
            }
        } catch (e) {
            // If conversion fails, continue with original content
        }

        // 2. Parse and fix semantics (The 4-Pass Surgeon)
        try {
            let doc: any;
            try {
                doc = yaml.load(fixedYaml);
            } catch (e) {
                // If we still can't parse, we can't do semantic fixes
                return {
                    fixedYaml,
                    fixesApplied: fixes,
                    wasConverted,
                    valid: false
                };
            }

            // If it's not an object (e.g. null or string), create a fresh object
            if (!doc || typeof doc !== 'object') {
                doc = {
                    protocol: {
                        name: typeof doc === 'string' && doc.trim().length > 0 ? this.toPascalCase(doc.trim()) : 'MyProtocol',
                        port: 8000,
                        description: 'Auto-generated protocol'
                    }
                };
                fixes.push('Scaffolded basic protocol structure');
            }

            // PASS 1: The Scrubber (Structure & Naming)
            if (!doc.protocol) {
                doc.protocol = { name: 'GeneratedProtocol', port: 8080 };
                fixes.push('Added missing protocol definition');
            }

            if (doc.protocol.name) {
                const cleanName = this.toPascalCase(doc.protocol.name);
                if (doc.protocol.name !== cleanName) {
                    doc.protocol.name = cleanName;
                    fixes.push(`Sanitized protocol name to '${cleanName}'`);
                }
            }

            if (!doc.protocol.port) {
                doc.protocol.port = 8080;
                fixes.push('Added default port 8080');
            }

            // PASS 2: Message Iteration (Scrub, Infer, Terminate, Split)
            const messages = doc.messages || doc.messageTypes || [];
            const messageList = Array.isArray(messages) ? messages : Object.values(messages);

            // Normalize to array format if it was an object
            if (!Array.isArray(messages) && doc.messages) {
                doc.messages = messageList;
                fixes.push('Converted messages object to array format');
            }

            // Ensure messages array exists
            if (!doc.messages && !doc.messageTypes) {
                doc.messages = [];
                fixes.push('Initialized empty messages list');
            }

            const activeMessages = doc.messages || doc.messageTypes;
            const reservedKeywords = ['type', 'class', 'func', 'let', 'const', 'var', 'struct', 'interface', 'enum'];

            for (const msg of activeMessages) {
                // 2.1 Sanitize Message Name
                if (msg.name) {
                    const cleanMsgName = this.toPascalCase(msg.name);
                    if (msg.name !== cleanMsgName) {
                        fixes.push(`Renamed message '${msg.name}' to '${cleanMsgName}'`);
                        msg.name = cleanMsgName;
                    }
                } else {
                    msg.name = 'UnknownMessage';
                    fixes.push('Added missing message name');
                }

                // 2.2 Ensure Format Exists
                if (!msg.format && !msg.parts) {
                    msg.format = 'PING\\n';
                    fixes.push(`Added default format to '${msg.name}'`);
                }

                // 2.3 Terminator Injection (The Terminator)
                const isBinary = doc.connection?.encoding === 'binary' || doc.protocol?.encoding === 'binary';
                if (!isBinary && typeof msg.format === 'string') {
                    const hasTerminator = msg.format.endsWith('\\n') || msg.format.endsWith('\\r') || msg.format.endsWith('\n');
                    if (!hasTerminator) {
                        msg.format += '\\n';
                        fixes.push(`Added newline terminator to '${msg.name}'`);
                    }
                }

                // 2.4 Ambiguity Splitter (The Splitter)
                if (typeof msg.format === 'string' && /\}\s*\{/.test(msg.format)) {
                    const oldFormat = msg.format;
                    msg.format = msg.format.replace(/\}\s*\{/g, '} {');
                    if (msg.format !== oldFormat) {
                        fixes.push(`Inserted delimiter in ambiguous format in '${msg.name}'`);
                    }
                }

                // 2.5 Variable & Field Inference (The Inferencer)
                if (typeof msg.format === 'string') {
                    const regex = /\{([a-zA-Z0-9_ ]+)\}/g;
                    let match;
                    const formatVars = new Set<string>();

                    // Normalize variables in format string
                    let newFormat = msg.format;
                    while ((match = regex.exec(msg.format)) !== null) {
                        const originalVar = match[1];
                        const cleanVar = this.toSnakeCase(originalVar);
                        formatVars.add(cleanVar);

                        if (originalVar !== cleanVar) {
                            newFormat = newFormat.replace(`{${originalVar}}`, `{${cleanVar}}`);
                            fixes.push(`Sanitized variable '${originalVar}' to '${cleanVar}'`);
                        }
                    }
                    msg.format = newFormat;

                    // Sync with Fields List
                    if (!msg.fields) msg.fields = [];

                    // Add missing fields
                    formatVars.forEach(vName => {
                        const exists = msg.fields.find((f: any) => f.name === vName);
                        if (!exists) {
                            // Infer type
                            let type = 'string';
                            if (vName.includes('port') || vName.includes('id') || vName.includes('count') || vName.includes('size')) type = 'integer';

                            msg.fields.push({ name: vName, type: type });
                            fixes.push(`Inferred missing field: '${vName}' (${type})`);
                        }
                    });

                    // 2.6 Keyword Safety (The Silent Killer)
                    for (const field of msg.fields) {
                        if (reservedKeywords.includes(field.name)) {
                            const newName = `${field.name}_val`;
                            const oldName = field.name;
                            // Update field name
                            field.name = newName;
                            // Update format string
                            msg.format = msg.format.replace(`{${oldName}}`, `{${newName}}`);
                            fixes.push(`Renamed reserved keyword field '${oldName}' to '${newName}'`);
                        }

                        // Also sanitize field names
                        const cleanFieldName = this.toSnakeCase(field.name);
                        if (field.name !== cleanFieldName) {
                            msg.format = msg.format.replace(`{${field.name}}`, `{${cleanFieldName}}`);
                            field.name = cleanFieldName;
                            fixes.push(`Sanitized field name '${field.name}' to '${cleanFieldName}'`);
                        }
                    }
                }
            }

            // Dump back to YAML
            fixedYaml = yaml.dump(doc, { indent: 2, lineWidth: -1 });
            wasConverted = true;

        } catch (e) {
            // If semantic fixing fails, return what we have (likely just syntax fixed)
            console.error("Semantic fix failed:", e);
        }

        // Final Validation Check
        const validation = this.parser.validateComplete(fixedYaml);

        return {
            fixedYaml,
            fixesApplied: fixes,
            wasConverted,
            valid: validation.valid,
            diagnostics: validation.errors
        };
    }

    private toPascalCase(str: string): string {
        return str.replace(/(?:^\w|[A-Z]|\b\w)/g, (w) => w.toUpperCase()).replace(/\s+/g, '');
    }

    private toSnakeCase(str: string): string {
        return str.match(/[A-Z]{2,}(?=[A-Z][a-z]+[0-9]*|\b)|[A-Z]?[a-z]+[0-9]*|[A-Z]|[0-9]+/g)
            ?.map(x => x.toLowerCase())
            .join('_') || str;
    }
}
