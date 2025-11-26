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

        // Generate tools from spec message types
        const tools = Object.entries(spec.messageTypes).map(([name, def]) => ({
            name: `send_${name}`,
            description: `Send a ${name} message`,
            inputSchema: {
                type: 'object',
                properties: def.fields,
                required: Object.keys(def.fields)
            }
        }));

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
