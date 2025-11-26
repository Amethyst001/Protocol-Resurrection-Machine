import yaml from 'js-yaml';
import { SmartYAMLConverter } from './smart-yaml-converter.js';

export class SpecFixer {
    private converter = new SmartYAMLConverter();

    /**
     * Attempt to fix a malformed or invalid protocol specification
     */
    fix(content: string): string {
        // 1. Try to fix syntax first using SmartYAMLConverter
        // This handles cases where it's not even valid YAML, or is TypeScript code
        let fixed = this.converter.convert(content);

        // 2. Parse and fix semantics
        // Now that we (hopefully) have valid YAML, let's check for missing required fields
        try {
            const doc = yaml.load(fixed) as any;

            // If it's not an object (e.g. null or string), return the syntax-fixed version
            if (!doc || typeof doc !== 'object') return fixed;

            let modified = false;

            // Fix Protocol Section
            if (!doc.protocol) {
                doc.protocol = {
                    name: 'MyProtocol',
                    port: 8000,
                    description: 'Auto-generated protocol'
                };
                modified = true;
            } else if (typeof doc.protocol === 'string') {
                // Handle flat protocol definition: "protocol: Gopher"
                doc.protocol = {
                    name: doc.protocol,
                    port: 8000,
                    description: `${doc.protocol} protocol`
                };
                modified = true;
            } else if (typeof doc.protocol === 'object') {
                // Handle nested protocol definition
                if (!doc.protocol.name) {
                    doc.protocol.name = 'MyProtocol';
                    modified = true;
                }
                if (!doc.protocol.port) {
                    doc.protocol.port = 8000;
                    modified = true;
                }
                if (!doc.protocol.description) {
                    doc.protocol.description = `${doc.protocol.name} protocol`;
                    modified = true;
                }
            }

            // Fix Connection Section
            if (!doc.connection) {
                doc.connection = {
                    type: 'TCP',
                    port: doc.protocol.port || 8000,
                    terminator: '\\r\\n'
                };
                modified = true;
            }

            // Fix Messages
            // Handle both 'messageTypes' and 'messages' keys
            if (!doc.messageTypes && !doc.messages) {
                doc.messageTypes = [
                    {
                        name: 'Ping',
                        direction: 'request',
                        format: 'PING',
                        fields: []
                    }
                ];
                modified = true;
            } else {
                // Ensure existing messages have required fields
                const messages = doc.messageTypes || doc.messages;
                if (Array.isArray(messages)) {
                    for (const msg of messages) {
                        if (!msg.name) {
                            msg.name = 'UnknownMessage';
                            modified = true;
                        }
                        if (!msg.direction) {
                            msg.direction = 'bidirectional';
                            modified = true;
                        }
                        if (!msg.fields) {
                            msg.fields = [];
                            modified = true;
                        }
                    }
                }
            }

            if (modified) {
                // Dump back to YAML
                // indent: 2 is standard
                return yaml.dump(doc, { indent: 2, lineWidth: -1 });
            }
        } catch (e) {
            // If parsing fails even after smart convert, return the smart converted version
            // This might happen if SmartYAMLConverter produced something that js-yaml still hates
            return fixed;
        }

        return fixed;
    }
}
