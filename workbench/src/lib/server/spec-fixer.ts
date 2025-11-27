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

            // Apply Fixes in Strict Order
            this.applyIdentityNormalization(doc, fixes);
            this.applyStructureRecovery(doc, fixes);

            // NEW: Run the Splitter here
            this.applyAmbiguityResolution(doc, fixes);

            this.applyFormatRepair(doc, fixes);
            this.applyTypeInference(doc, fixes);
            this.applyKeywordSafety(doc, fixes);

            // Dump back to YAML
            fixedYaml = yaml.dump(doc, { indent: 2, lineWidth: -1 });
            wasConverted = true;

        } catch (e) {
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

    private applyIdentityNormalization(doc: any, fixes: string[]) {
        if (!doc.protocol) {
            doc.protocol = { name: 'GeneratedProtocol', port: 8080 };
            fixes.push('Added missing protocol definition');
        } else if (typeof doc.protocol !== 'object') {
            const oldVal = doc.protocol;
            doc.protocol = {
                name: String(oldVal),
                port: 8080,
                description: 'Auto-generated from string definition'
            };
            fixes.push(`Converted string protocol definition '${oldVal}' to object structure`);
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
    }

    private applyStructureRecovery(doc: any, fixes: string[]) {
        const messages = doc.messages || doc.messageTypes || [];
        const messageList = Array.isArray(messages) ? messages : Object.values(messages);

        if (!Array.isArray(messages) && doc.messages) {
            doc.messages = messageList;
            fixes.push('Converted messages object to array format');
        }

        if (!doc.messages && !doc.messageTypes) {
            doc.messages = [];
            fixes.push('Initialized empty messages list');
        }
    }

    // PASS 5: Ambiguity Resolution (The "Splitter")
    // Fixes: "{user}{pass}" -> "{user} {pass}"
    private applyAmbiguityResolution(doc: any, logs: string[]) {
        const messages = doc.messages || doc.messageTypes || [];
        // Handle both array and object (though StructureRecovery should have fixed it to array)
        const messageList = Array.isArray(messages) ? messages : Object.values(messages);

        for (const msg of messageList) {
            if (typeof msg.format === 'string') {
                // Check for adjacent variables like }{
                // We inject a SPACE as the safest default delimiter.
                if (/\}\{/.test(msg.format)) {
                    const oldFormat = msg.format;
                    // Insert space between closing and opening braces
                    msg.format = msg.format.replace(/\}\{/g, '} {');

                    if (msg.format !== oldFormat) {
                        logs.push(`Fixed ambiguous adjacent variables in '${msg.name || 'Unknown'}' (inserted space delimiter)`);
                    }
                }
            }
        }
    }

    private applyFormatRepair(doc: any, fixes: string[]) {
        const activeMessages = doc.messages || doc.messageTypes || [];

        for (const msg of activeMessages) {
            // Sanitize Message Name
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

            // Ensure Format Exists
            if (!msg.format && !msg.parts) {
                msg.format = 'PING\\n';
                fixes.push(`Added default format to '${msg.name}'`);
            }

            // Terminator Injection
            const isBinary = doc.connection?.encoding === 'binary' || doc.protocol?.encoding === 'binary';
            if (!isBinary && typeof msg.format === 'string') {
                const hasTerminator = msg.format.endsWith('\\n') || msg.format.endsWith('\\r') || msg.format.endsWith('\n');
                if (!hasTerminator) {
                    msg.format += '\\n';
                    fixes.push(`Added newline terminator to '${msg.name}'`);
                }
            }
        }
    }

    private applyKeywordSafety(doc: any, fixes: string[]) {
        const activeMessages = doc.messages || doc.messageTypes || [];
        const reservedKeywords = ['type', 'class', 'func', 'let', 'const', 'var', 'struct', 'interface', 'enum'];

        for (const msg of activeMessages) {
            if (!msg.fields) continue;

            for (const field of msg.fields) {
                if (reservedKeywords.includes(field.name)) {
                    const newName = `${field.name}_val`;
                    const oldName = field.name;
                    field.name = newName;
                    if (typeof msg.format === 'string') {
                        msg.format = msg.format.replace(new RegExp(`\\{${oldName}\\}`, 'g'), `{${newName}}`);
                    }
                    fixes.push(`Renamed reserved keyword field '${oldName}' to '${newName}'`);
                }

                const cleanFieldName = this.toSnakeCase(field.name);
                if (field.name !== cleanFieldName) {
                    if (typeof msg.format === 'string') {
                        msg.format = msg.format.replace(new RegExp(`\\{${field.name}\\}`, 'g'), `{${cleanFieldName}}`);
                    }
                    field.name = cleanFieldName;
                    fixes.push(`Sanitized field name '${field.name}' to '${cleanFieldName}'`);
                }
            }
        }
    }

    private applyTypeInference(doc: any, logs: string[]) {
        // Handle both array and object formats for messages
        const messages = doc.messages || doc.messageTypes || [];
        const messageList = Array.isArray(messages) ? messages : Object.values(messages);

        for (const msg of messageList) {
            if (typeof msg.format === 'string') {
                // 1. Ensure fields array exists
                if (!msg.fields) {
                    msg.fields = [];
                    // Don't log this yet, wait to see if we actually add anything
                }

                // 2. Extract ALL variables from format string
                // Regex matches {varName} or {varName:type}
                const regex = /\{([a-zA-Z0-9_]+)(?::[a-z0-9]+)?\}/g;
                let match;
                const foundVars = new Set<string>();

                while ((match = regex.exec(msg.format)) !== null) {
                    const rawVar = match[1]; // "user"
                    foundVars.add(rawVar);
                }

                // 3. Reconcile with Fields List
                foundVars.forEach(varName => {
                    // Check if field already exists (case insensitive)
                    const exists = msg.fields.find((f: any) => f.name.toLowerCase() === varName.toLowerCase());

                    if (!exists) {
                        // HEURISTIC: Guess type based on name
                        let inferredKind = 'string';
                        if (varName.includes('port') || varName.includes('count') || varName.includes('id')) {
                            inferredKind = 'number';
                        }

                        // INJECT THE FIELD
                        msg.fields.push({
                            name: varName,
                            type: { kind: inferredKind }
                        });

                        logs.push(`Inferred missing field definition: '${varName}' (${inferredKind})`);
                    }
                });
            }
        }
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
