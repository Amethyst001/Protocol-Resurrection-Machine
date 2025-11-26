/**
 * MCP Server Template
 *
 * Base template for generating MCP servers from protocol specifications
 */
import { ToolRegistry } from './tool-registry.js';
export class MCPServer {
    registry;
    config;
    constructor(config) {
        this.config = config;
        this.registry = new ToolRegistry();
        this.registry.registerAll(config.tools);
    }
    /**
     * Handle tool list request
     */
    async listTools() {
        const tools = this.registry.list();
        return {
            tools: tools.map(tool => ({
                name: tool.name,
                description: tool.description,
                inputSchema: tool.inputSchema
            }))
        };
    }
    /**
     * Handle tool call request
     */
    async callTool(name, args) {
        try {
            // Validate tool exists
            const tool = this.registry.get(name);
            if (!tool) {
                return this.createErrorResponse('TOOL_NOT_FOUND', `Tool ${name} not found`);
            }
            // Validate input against schema
            const validationError = this.validateInput(args, tool.inputSchema);
            if (validationError) {
                return this.createErrorResponse('INVALID_INPUT', validationError);
            }
            // Execute tool handler
            return await tool.handler(args);
        }
        catch (error) {
            return this.createErrorResponse('EXECUTION_ERROR', error instanceof Error ? error.message : 'Unknown error occurred', error);
        }
    }
    /**
     * Validate input against JSON schema
     */
    validateInput(input, schema) {
        // Check required fields
        if (schema.required) {
            for (const field of schema.required) {
                if (!(field in input)) {
                    return `Missing required field: ${field}`;
                }
            }
        }
        // Check field types
        if (schema.properties) {
            for (const [field, fieldSchema] of Object.entries(schema.properties)) {
                if (field in input) {
                    const value = input[field];
                    const error = this.validateFieldType(value, fieldSchema, field);
                    if (error)
                        return error;
                }
            }
        }
        return null;
    }
    /**
     * Validate field type
     */
    validateFieldType(value, schema, fieldName) {
        const actualType = Array.isArray(value) ? 'array' : typeof value;
        if (schema.type && actualType !== schema.type) {
            return `Field ${fieldName} must be of type ${schema.type}, got ${actualType}`;
        }
        // Validate string constraints
        if (schema.type === 'string' && typeof value === 'string') {
            if (schema.minLength !== undefined && value.length < schema.minLength) {
                return `Field ${fieldName} must be at least ${schema.minLength} characters`;
            }
            if (schema.maxLength !== undefined && value.length > schema.maxLength) {
                return `Field ${fieldName} must be at most ${schema.maxLength} characters`;
            }
            if (schema.pattern && !new RegExp(schema.pattern).test(value)) {
                return `Field ${fieldName} must match pattern ${schema.pattern}`;
            }
            if (schema.enum && !schema.enum.includes(value)) {
                return `Field ${fieldName} must be one of: ${schema.enum.join(', ')}`;
            }
        }
        // Validate number constraints
        if (schema.type === 'number' && typeof value === 'number') {
            if (schema.minimum !== undefined && value < schema.minimum) {
                return `Field ${fieldName} must be at least ${schema.minimum}`;
            }
            if (schema.maximum !== undefined && value > schema.maximum) {
                return `Field ${fieldName} must be at most ${schema.maximum}`;
            }
        }
        return null;
    }
    /**
     * Create error response in MCP format
     */
    createErrorResponse(code, message, details) {
        return {
            content: [
                {
                    type: 'text',
                    text: `Error: ${message}`
                }
            ],
            isError: true
        };
    }
    /**
     * Get server configuration
     */
    getConfig() {
        return this.config;
    }
    /**
     * Get tool registry
     */
    getRegistry() {
        return this.registry;
    }
}
