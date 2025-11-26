// Server-side wrapper for YAML parser
import yaml from 'js-yaml';

export interface ProtocolSpec {
    protocol: {
        name: string;
        rfc?: string;
        port: number; // Always required, never undefined
        description: string; // Always a string, never undefined (defaults to empty string)
    };
    connection: {
        type: 'TCP' | 'UDP';
        timeout: number;
        port: number;
        handshake?: any;
    };
    messageTypes: Array<{
        name: string;
        direction: 'request' | 'response' | 'bidirectional';
        format: string;
        fields: any[];
        delimiter?: string;
        terminator?: string;
        description?: string;
    }>;
}

export interface ValidationError {
    line?: number;
    column?: number;
    message: string;
    suggestion?: string;
    severity: 'CRITICAL' | 'WARNING' | 'NOTICE';
}

export interface ValidationResult {
    valid: boolean;
    errors: ValidationError[];
    score: number;
}

export class YAMLParser {
    parse(yamlContent: string): ProtocolSpec {
        try {
            const parsed = yaml.load(yamlContent) as any;

            // Validate basic structure
            if (!parsed.protocol || !parsed.protocol.name) {
                throw new Error('Invalid protocol specification: missing protocol.name');
            }

            // Get port from either connection.port or protocol.port
            const port = parsed.connection?.port || parsed.protocol?.port || 8000; // Default to 8000

            // If connection section is missing, create it with defaults
            if (!parsed.connection) {
                parsed.connection = {
                    type: 'TCP',
                    port: port,
                    timeout: 10000
                };
            } else if (!parsed.connection.port) {
                // Connection exists but no port - use protocol.port
                parsed.connection.port = port;
            }

            // Transform message types to expected format

            // Handle both 'messageTypes' (old format) and 'messages' (new format)
            const messagesArray = parsed.messages || parsed.messageTypes;
            const messageTypesArray: any[] = [];

            if (messagesArray && Array.isArray(messagesArray)) {
                for (const msg of messagesArray) {
                    if (msg.name) {
                        // Convert fields to array format if needed
                        let fieldsArray: any[] = [];

                        if (Array.isArray(msg.fields)) {
                            // Fields is already an array - use as is
                            fieldsArray = msg.fields.map((field: any) => ({
                                name: field.name,
                                type: field.type || 'string',
                                required: field.required !== false,
                                validation: field.validation,
                                defaultValue: field.defaultValue,
                                description: field.description
                            }));
                        } else if (msg.fields && typeof msg.fields === 'object') {
                            // Fields is an object - convert to array
                            fieldsArray = Object.entries(msg.fields).map(([name, field]: [string, any]) => ({
                                name,
                                type: field.type || 'string',
                                required: field.required !== false,
                                validation: field.validation,
                                defaultValue: field.defaultValue,
                                description: field.description
                            }));
                        }

                        messageTypesArray.push({
                            name: msg.name,
                            direction: (msg.direction || 'bidirectional') as 'request' | 'response' | 'bidirectional',
                            format: msg.format || '',
                            fields: fieldsArray,
                            delimiter: msg.delimiter,
                            terminator: msg.terminator,
                            description: msg.description
                        });
                    }
                }
            }

            // Require at least one message type
            if (messageTypesArray.length === 0) {
                throw new Error('Invalid protocol specification: at least one message type is required');
            }

            // Build spec object - ensure port is always a number
            return {
                protocol: {
                    name: parsed.protocol.name,
                    rfc: parsed.protocol.rfc || 'N/A',
                    port: port, // Always a number, never undefined
                    description: parsed.protocol.description || ''
                },
                connection: {
                    type: (parsed.connection.type === 'UDP' ? 'UDP' : 'TCP') as 'TCP' | 'UDP',
                    timeout: parsed.connection.timeout || 10000,
                    port: port, // Always a number, never undefined
                    handshake: parsed.connection.handshake
                },
                messageTypes: messageTypesArray
            };
        } catch (error) {
            throw new Error(`Failed to parse YAML: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Validate YAML and return structured errors with severity and score
     */
    validateComplete(yamlContent: string): ValidationResult {
        const errors: ValidationError[] = [];
        let score = 100;

        try {
            // 1. Basic Parse Check
            let parsed: any;
            try {
                parsed = yaml.load(yamlContent);
            } catch (e: any) {
                return {
                    valid: false,
                    score: 0,
                    errors: [{
                        line: e.mark?.line ? e.mark.line + 1 : 1,
                        column: e.mark?.column ? e.mark.column + 1 : 1,
                        message: e.message || 'Invalid YAML syntax',
                        severity: 'CRITICAL',
                        suggestion: 'Fix YAML syntax errors'
                    }]
                };
            }

            if (!parsed || typeof parsed !== 'object') {
                return {
                    valid: false,
                    score: 0,
                    errors: [{
                        message: 'Root must be an object',
                        severity: 'CRITICAL',
                        suggestion: 'Ensure YAML starts with protocol definition'
                    }]
                };
            }

            // 2. Protocol Identity Checks
            if (!parsed.protocol) {
                errors.push({ severity: 'CRITICAL', message: "Protocol definition is missing." });
                score -= 50;
            } else if (!parsed.protocol.name) {
                errors.push({ severity: 'CRITICAL', message: "Protocol name is missing." });
                score -= 50;
            }

            const port = parsed.connection?.port || parsed.protocol?.port;
            if (!port || isNaN(port)) {
                errors.push({ severity: 'CRITICAL', message: "Port must be a valid number." });
                score -= 50;
            }

            // 3. Message Integrity Checks
            const messages = parsed.messages || parsed.messageTypes || {};
            if (Object.keys(messages).length === 0) {
                errors.push({ severity: 'WARNING', message: "No messages defined. Generated code will be empty." });
                score -= 10;
            }

            const messagesList = Array.isArray(messages) ? messages : Object.values(messages);
            const reservedKeywords = ['type', 'class', 'func', 'let', 'const', 'var', 'struct', 'interface', 'enum'];

            for (const msg of messagesList as any[]) {
                const msgName = msg.name || 'Unknown';

                // Check A: Format String Existence
                if (!msg.format && !msg.parts) {
                    errors.push({ severity: 'CRITICAL', message: `Message '${msgName}' has no 'format' or 'parts' definition.` });
                    score -= 50;
                    continue;
                }

                // Check B: Variable Consistency (The "Ghost Field" Check)
                if (msg.format && typeof msg.format === 'string') {
                    const regex = /\{([a-zA-Z0-9_ ]+)\}/g;
                    let match;
                    const formatVars = new Set<string>();
                    while ((match = regex.exec(msg.format)) !== null) {
                        formatVars.add(match[1]);
                    }

                    const definedFields = new Set((msg.fields || []).map((f: any) => f.name));

                    formatVars.forEach(v => {
                        if (!definedFields.has(v)) {
                            errors.push({
                                severity: 'WARNING',
                                message: `Variable '{${v}}' used in format of '${msgName}' but not defined in fields list.`,
                                suggestion: `Add '${v}' to fields list`
                            });
                            score -= 10;
                        }
                    });

                    // Check C: Terminator Safety (The "Hang" Check)
                    const isBinary = parsed.protocol?.format === 'binary' || parsed.connection?.encoding === 'binary';
                    if (!isBinary) {
                        if (!msg.format.endsWith('\n') && !msg.format.endsWith('\r')) {
                            errors.push({
                                severity: 'WARNING',
                                message: `Message '${msgName}' has no newline terminator. Client might hang.`,
                                suggestion: 'Add \\n to the end of format string'
                            });
                            score -= 10;
                        }
                    }

                    // Check D: Variable Adjacency (The "Ambiguity" Check)
                    // Only check for STRICT adjacency (no delimiter) and only for text protocols without width specifiers
                    if (!isBinary && /\}\{/.test(msg.format)) {
                        // Check if variables have width specifiers (e.g. {var:10})
                        const hasWidthSpecifiers = /\{[^}:]+:\d+\}/.test(msg.format);

                        if (!hasWidthSpecifiers) {
                            errors.push({
                                severity: 'CRITICAL',
                                message: `Message '${msgName}' has adjacent variables without a delimiter. Parsing is impossible.`,
                                suggestion: 'Add a delimiter (space, comma, etc.) between variables'
                            });
                            score -= 50;
                        }
                    }
                }

                // Check E: Keyword Safety (The "Silent Killer")
                if (msg.fields && Array.isArray(msg.fields)) {
                    for (const field of msg.fields) {
                        if (reservedKeywords.includes(field.name)) {
                            errors.push({
                                severity: 'CRITICAL',
                                message: `Field name '${field.name}' is a reserved keyword in some languages.`,
                                suggestion: `Rename to '${field.name}_val' or similar`
                            });
                            score -= 50;
                        }
                        if (field.name.includes(' ')) {
                            errors.push({
                                severity: 'NOTICE',
                                message: `Field name '${field.name}' contains spaces.`,
                                suggestion: 'Use snake_case or camelCase'
                            });
                            score -= 2;
                        }
                    }
                }
            }

            return {
                valid: errors.filter(e => e.severity === 'CRITICAL').length === 0,
                errors,
                score: Math.max(0, score)
            };

        } catch (error) {
            const err = error as any;
            return {
                valid: false,
                score: 0,
                errors: [{
                    line: err.line || 1,
                    column: err.column || 1,
                    message: err.message || 'Validation failed',
                    severity: 'CRITICAL',
                    suggestion: 'Check YAML syntax'
                }]
            };
        }
    }
}
