import type { ProtocolSpec, MessageType } from '../types/protocol-spec.js';

export interface MCPDocumentation {
  protocol: string;
  serverConfiguration: string;
  toolSchemas: ToolSchemaDoc[];
  exampleCalls: ExampleCall[];
  troubleshooting: TroubleshootingGuide;
}

export interface ToolSchemaDoc {
  toolName: string;
  description: string;
  inputSchema: any;
  outputSchema: any;
  exampleInput: any;
  exampleOutput: any;
}

export interface ExampleCall {
  toolName: string;
  description: string;
  request: string;
  response: string;
}

export interface TroubleshootingGuide {
  commonIssues: CommonIssue[];
  debugging: string[];
  support: string;
}

export interface CommonIssue {
  problem: string;
  solution: string;
  example?: string;
}

export class MCPDocGenerator {
  /**
   * Sanitize package name for use in package managers
   * Converts to lowercase, replaces spaces with hyphens, removes invalid characters
   */
  private sanitizePackageName(protocolName: string): string {
    return protocolName
      .toLowerCase()                    // Convert to lowercase
      .replace(/\s+/g, '-')            // Replace spaces with hyphens
      .replace(/[^a-z0-9-_]/g, '')     // Remove invalid characters
      .replace(/^-+|-+$/g, '')         // Remove leading/trailing hyphens
      .replace(/-+/g, '-');            // Collapse multiple hyphens
  }

  /**
   * Get port with fallback logic
   * Returns spec.protocol.port if defined, infers from protocol name, or defaults to 'N/A'
   */
  private getPortWithFallback(spec: ProtocolSpec): string {
    // Return port if defined
    if (spec.protocol.port !== undefined && spec.protocol.port !== null) {
      return spec.protocol.port.toString();
    }

    // Infer from protocol name
    const name = spec.protocol.name.toLowerCase();
    if (name.includes('gopher')) return '70';
    if (name.includes('finger')) return '79';
    if (name.includes('http') && !name.includes('https')) return '80';
    if (name.includes('https')) return '443';
    if (name.includes('smtp')) return '25';
    if (name.includes('pop3')) return '110';
    if (name.includes('imap')) return '143';
    if (name.includes('ftp')) return '21';
    if (name.includes('ssh')) return '22';
    if (name.includes('telnet')) return '23';
    if (name.includes('whois')) return '43';
    if (name.includes('dns')) return '53';

    // Default to 'N/A' if unknown
    return 'N/A';
  }

  /**
   * Generate MCP server documentation
   */
  generateMCPDocumentation(spec: ProtocolSpec): MCPDocumentation {
    return {
      protocol: spec.protocol.name,
      serverConfiguration: this.generateServerConfiguration(spec),
      toolSchemas: this.generateToolSchemas(spec),
      exampleCalls: this.generateExampleCalls(spec),
      troubleshooting: this.generateTroubleshootingGuide(spec)
    };
  }

  /**
   * Generate complete MCP documentation as markdown
   */
  generateMarkdown(mcpDoc: MCPDocumentation): string {
    const sections: string[] = [];

    sections.push(`# ${mcpDoc.protocol} MCP Server Documentation`);
    sections.push('');
    sections.push(`This document describes how to use the ${mcpDoc.protocol} protocol through the Model Context Protocol (MCP) server.`);
    sections.push('');

    // Server Configuration
    sections.push('## Server Configuration');
    sections.push('');
    sections.push('Add the following configuration to your MCP settings:');
    sections.push('');
    sections.push('```json');
    sections.push(mcpDoc.serverConfiguration);
    sections.push('```');
    sections.push('');

    // Tool Schemas
    sections.push('## Available Tools');
    sections.push('');
    mcpDoc.toolSchemas.forEach(tool => {
      sections.push(`### ${tool.toolName}`);
      sections.push('');
      sections.push(tool.description);
      sections.push('');
      
      sections.push('**Input Schema:**');
      sections.push('```json');
      sections.push(JSON.stringify(tool.inputSchema, null, 2));
      sections.push('```');
      sections.push('');
      
      sections.push('**Example Input:**');
      sections.push('```json');
      sections.push(JSON.stringify(tool.exampleInput, null, 2));
      sections.push('```');
      sections.push('');
      
      sections.push('**Example Output:**');
      sections.push('```json');
      sections.push(JSON.stringify(tool.exampleOutput, null, 2));
      sections.push('```');
      sections.push('');
    });

    // Example Calls
    sections.push('## Example Tool Calls');
    sections.push('');
    mcpDoc.exampleCalls.forEach(example => {
      sections.push(`### ${example.description}`);
      sections.push('');
      sections.push('**Request:**');
      sections.push('```json');
      sections.push(example.request);
      sections.push('```');
      sections.push('');
      sections.push('**Response:**');
      sections.push('```json');
      sections.push(example.response);
      sections.push('```');
      sections.push('');
    });

    // Troubleshooting
    sections.push('## Troubleshooting');
    sections.push('');
    sections.push('### Common Issues');
    sections.push('');
    mcpDoc.troubleshooting.commonIssues.forEach(issue => {
      sections.push(`#### ${issue.problem}`);
      sections.push('');
      sections.push(`**Solution:** ${issue.solution}`);
      sections.push('');
      if (issue.example) {
        sections.push('**Example:**');
        sections.push('```');
        sections.push(issue.example);
        sections.push('```');
        sections.push('');
      }
    });

    sections.push('### Debugging');
    sections.push('');
    mcpDoc.troubleshooting.debugging.forEach(tip => {
      sections.push(`- ${tip}`);
    });
    sections.push('');

    sections.push('### Support');
    sections.push('');
    sections.push(mcpDoc.troubleshooting.support);
    sections.push('');

    return sections.join('\n');
  }

  /**
   * Generate server configuration example
   */
  private generateServerConfiguration(spec: ProtocolSpec): string {
    const sanitizedName = this.sanitizePackageName(spec.protocol.name);
    const port = this.getPortWithFallback(spec);
    
    const config = {
      mcpServers: {
        [`${sanitizedName}-protocol`]: {
          command: 'node',
          args: [`./generated/${sanitizedName}/mcp-server.js`],
          env: {
            LOG_LEVEL: 'info',
            PROTOCOL_NAME: spec.protocol.name,
            DEFAULT_PORT: port
          },
          disabled: false,
          autoApprove: []
        }
      }
    };

    return JSON.stringify(config, null, 2);
  }

  /**
   * Generate tool schema documentation
   */
  private generateToolSchemas(spec: ProtocolSpec): ToolSchemaDoc[] {
    const tools: ToolSchemaDoc[] = [];
    const sanitizedName = this.sanitizePackageName(spec.protocol.name);

    spec.messageTypes.forEach(messageType => {
      const toolName = `${sanitizedName}_${this.toSnakeCase(messageType.name)}`;
      
      // Generate input schema
      const inputSchema = this.generateInputSchema(messageType);
      
      // Generate example input
      const exampleInput = this.generateExampleInput(messageType);
      
      // Generate example output
      const exampleOutput = this.generateExampleOutput(spec, messageType);

      tools.push({
        toolName,
        description: `${messageType.name} operation for ${spec.protocol.name} protocol`,
        inputSchema,
        outputSchema: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: { type: 'object' },
            error: { type: 'string' }
          }
        },
        exampleInput,
        exampleOutput
      });
    });

    return tools;
  }

  /**
   * Generate input schema for a message type
   */
  private generateInputSchema(messageType: MessageType): any {
    const properties: any = {};
    const required: string[] = [];

    messageType.fields.forEach(field => {
      const fieldType = typeof field.type === 'string' ? field.type : field.type.kind;
      properties[field.name] = {
        type: this.mapTypeToJSONSchema(fieldType),
        description: `${field.name} field`
      };

      // Add validation constraints
      if (field.validation) {
        if (field.validation.minLength !== undefined) {
          properties[field.name].minLength = field.validation.minLength;
        }
        if (field.validation.maxLength !== undefined) {
          properties[field.name].maxLength = field.validation.maxLength;
        }
        if (field.validation.pattern) {
          properties[field.name].pattern = field.validation.pattern;
        }
      }

      // Add enum values if field type is enum
      if (typeof field.type !== 'string' && field.type.kind === 'enum') {
        properties[field.name].enum = field.type.values;
      }

      if (field.required) {
        required.push(field.name);
      }
    });

    return {
      type: 'object',
      properties,
      required: required.length > 0 ? required : undefined
    };
  }

  /**
   * Generate example input for a message type
   */
  private generateExampleInput(messageType: MessageType): any {
    const example: any = {};

    messageType.fields.forEach(field => {
      if (field.required || Math.random() > 0.5) {
        example[field.name] = this.generateExampleValue(field);
      }
    });

    return example;
  }

  /**
   * Generate example value for a field
   */
  private generateExampleValue(field: any): any {
    const fieldType = typeof field.type === 'string' ? field.type : field.type.kind;
    
    // Check for enum type
    if (typeof field.type !== 'string' && field.type.kind === 'enum') {
      return field.type.values[0];
    }

    switch (fieldType) {
      case 'string':
        return 'example';
      case 'number':
        return 42;
      case 'boolean':
        return true;
      case 'bytes':
        return 'data';
      default:
        return 'value';
    }
  }

  /**
   * Generate example output
   */
  private generateExampleOutput(spec: ProtocolSpec, messageType: MessageType): any {
    return {
      success: true,
      data: {
        message: `${messageType.name} executed successfully`,
        protocol: spec.protocol.name,
        timestamp: new Date().toISOString()
      }
    };
  }

  /**
   * Generate example tool calls
   */
  private generateExampleCalls(spec: ProtocolSpec): ExampleCall[] {
    const examples: ExampleCall[] = [];
    const sanitizedName = this.sanitizePackageName(spec.protocol.name);

    spec.messageTypes.slice(0, 2).forEach(messageType => {
      const toolName = `${sanitizedName}_${this.toSnakeCase(messageType.name)}`;
      
      const request = {
        method: 'tools/call',
        params: {
          name: toolName,
          arguments: this.generateExampleInput(messageType)
        }
      };

      const response = {
        content: [
          {
            type: 'text',
            text: JSON.stringify(this.generateExampleOutput(spec, messageType), null, 2)
          }
        ]
      };

      examples.push({
        toolName,
        description: `Call ${toolName} tool`,
        request: JSON.stringify(request, null, 2),
        response: JSON.stringify(response, null, 2)
      });
    });

    return examples;
  }

  /**
   * Generate troubleshooting guide
   */
  private generateTroubleshootingGuide(spec: ProtocolSpec): TroubleshootingGuide {
    const sanitizedName = this.sanitizePackageName(spec.protocol.name);
    const port = this.getPortWithFallback(spec);

    return {
      commonIssues: [
        {
          problem: 'Server fails to start',
          solution: 'Check that Node.js is installed and the server file path is correct in the configuration.',
          example: 'node --version\nls -la ./generated/' + sanitizedName + '/mcp-server.js'
        },
        {
          problem: 'Tool not found',
          solution: 'Verify the tool name follows the pattern: ' + sanitizedName + '_<operation>. Use the tools/list method to see available tools.',
          example: '{\n  "method": "tools/list"\n}'
        },
        {
          problem: 'Connection timeout',
          solution: `Ensure the ${spec.protocol.name} server is running and accessible on port ${port}. Check firewall settings.`
        },
        {
          problem: 'Invalid input parameters',
          solution: 'Verify that all required fields are provided and match the input schema. Check field types and constraints.'
        },
        {
          problem: 'Parse error',
          solution: 'The protocol response may be malformed. Check the server logs for details about the parsing failure.'
        }
      ],
      debugging: [
        'Set LOG_LEVEL=debug in the server configuration to see detailed logs',
        'Use the MCP inspector tool to test tool calls interactively',
        'Check the server process logs for error messages',
        'Verify network connectivity to the protocol server',
        'Test the protocol directly (without MCP) to isolate issues'
      ],
      support: `For additional support:
- Check the ${spec.protocol.name} protocol specification
- Review the generated code documentation
- Open an issue on the project repository
- Contact the protocol maintainers`
    };
  }

  // Helper methods

  private toSnakeCase(str: string): string {
    return str
      .replace(/([A-Z])/g, '_$1')
      .toLowerCase()
      .replace(/^_/, '');
  }

  private mapTypeToJSONSchema(type: string): string {
    const typeMap: Record<string, string> = {
      'string': 'string',
      'integer': 'integer',
      'number': 'number',
      'boolean': 'boolean',
      'char': 'string'
    };
    return typeMap[type] || 'string';
  }
}
