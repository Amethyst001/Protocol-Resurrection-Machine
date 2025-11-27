import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { YAMLParser } from '$lib/server/yaml-parser';

export const POST: RequestHandler = async ({ request }) => {
    try {
        const { yaml } = await request.json();

        if (!yaml || typeof yaml !== 'string') {
            return json(
                { error: 'Invalid request: yaml field is required' },
                { status: 400 }
            );
        }

        const parser = new YAMLParser();
        const spec = parser.parse(yaml);

        // Map protocol types to JSON Schema types
        function mapTypeToJsonSchema(fieldType: any): string {
            let typeStr = 'string';

            if (typeof fieldType === 'string') {
                typeStr = fieldType;
            } else if (typeof fieldType === 'object' && fieldType !== null) {
                typeStr = fieldType.kind || 'string';
            }

            const type = (typeStr || 'string').toLowerCase();
            if (type === 'integer' || type === 'int' || type === 'number' || type === 'port' ||
                type === 'u8' || type === 'u16' || type === 'u32' || type === 'i8' || type === 'i16' || type === 'i32' ||
                type === 'f32' || type === 'f64' || type === 'float' || type === 'double') {
                return 'number';
            }
            if (type === 'boolean' || type === 'bool') {
                return 'boolean';
            }
            if (type === 'array' || type === 'list') {
                return 'array';
            }
            return 'string';
        }

        // Generate tools from spec message types (messageTypes is an array)
        const tools = spec.messageTypes.map((msg) => {
            // Convert fields array to properties object for JSON schema
            const properties: Record<string, any> = {};
            const required: string[] = [];

            if (Array.isArray(msg.fields)) {
                for (const field of msg.fields) {
                    const jsonType = mapTypeToJsonSchema(field.type);
                    properties[field.name] = {
                        type: jsonType,
                        description: field.description || `The ${field.name} field`
                    };
                    // Add constraints if present
                    if (field.minLength !== undefined) {
                        properties[field.name].minLength = field.minLength;
                    }
                    if (field.maxLength !== undefined) {
                        properties[field.name].maxLength = field.maxLength;
                    }
                    if (field.minimum !== undefined) {
                        properties[field.name].minimum = field.minimum;
                    }
                    if (field.maximum !== undefined) {
                        properties[field.name].maximum = field.maximum;
                    }
                    if (field.enum) {
                        properties[field.name].enum = field.enum;
                    }
                    // Handle required fields (default to required unless explicitly optional)
                    if (!field.optional && field.required !== false) {
                        required.push(field.name);
                    }
                }
            }

            return {
                name: `send_${msg.name}`,
                description: msg.description || `Send a ${msg.name} message`,
                inputSchema: {
                    type: 'object',
                    properties,
                    required: required.length > 0 ? required : undefined
                }
            };
        });

        // Generate server code
        const code = `
import { MCPServer } from '@kiroween/mcp';
import { createClient } from './client';

const client = createClient({
  host: process.env.PROTOCOL_HOST || 'localhost',
  port: parseInt(process.env.PROTOCOL_PORT || '${spec.connection.port}')
});

const server = new MCPServer({
  name: '${spec.protocol.name}',
  version: '1.0.0',
  tools: [
${tools.map(t => `    {
      name: '${t.name}',
      description: '${t.description}',
      inputSchema: ${JSON.stringify(t.inputSchema, null, 6)},
      handler: async (args) => {
        const response = await client.send('${t.name.replace('send_', '')}', args);
        return {
          content: [{ type: 'text', text: JSON.stringify(response, null, 2) }]
        };
      }
    }`).join(',\n')}
  ]
});

server.start();
`;

        return json({
            code,
            tools
        });

    } catch (error) {
        return json(
            { error: error instanceof Error ? error.message : 'Failed to generate MCP server' },
            { status: 500 }
        );
    }
};
